// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { IHederaTokenService } from "./interfaces/IHederaTokenService.sol";
import { ISaucerSwapRouter } from "./interfaces/ISaucerSwapRouter.sol";

/// Swap entry point for a SaucerSwap V2 router on Hedera.
///
/// It hides the two Hedera-specific details that trip up EVM developers:
///  - Native HBAR is never wrapped by hand. HBAR in is sent as msg.value and the router wraps it;
///    HBAR out is unwrapped by the router (`unwrapWHBAR`), never by calling WHBAR directly.
///  - A contract must be associated with an HTS token before it can hold it. `associate` does that.
///
/// A swap `path` is SaucerSwap's packed encoding: token (20 bytes), fee (3 bytes), token, ...
/// Build one with `encodePath`. For native HBAR use the WHBAR token address at the matching end.
contract SwapHelper is ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public constant HTS = 0x0000000000000000000000000000000000000167;
    int64 private constant SUCCESS = 22;
    int64 private constant TOKEN_ALREADY_ASSOCIATED = 194;

    uint256 private constant ADDRESS_SIZE = 20;
    uint256 private constant FEE_SIZE = 3;
    uint256 private constant HOP_SIZE = ADDRESS_SIZE + FEE_SIZE;
    uint256 private constant MIN_PATH_SIZE = ADDRESS_SIZE + HOP_SIZE;

    ISaucerSwapRouter public immutable router;
    address public immutable whbar;

    event Swapped(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );
    event Associated(address indexed token);

    error InvalidPath();
    error PathMustStartWithWhbar();
    error PathMustEndWithWhbar();
    error NoValueSent();
    error AssociationFailed(int64 responseCode);
    error HbarTransferFailed();

    constructor(address router_, address whbar_) {
        router = ISaucerSwapRouter(router_);
        whbar = whbar_;
    }

    receive() external payable {}

    /// Swaps msg.value of native HBAR for the token at the end of `path`.
    function swapExactHbarForTokens(
        bytes calldata path,
        uint256 amountOutMinimum,
        uint256 deadline
    ) external payable nonReentrant returns (uint256 amountOut) {
        if (msg.value == 0) revert NoValueSent();
        (address tokenIn, address tokenOut) = _endpoints(path);
        if (tokenIn != whbar) revert PathMustStartWithWhbar();

        amountOut = router.exactInput{ value: msg.value }(
            ISaucerSwapRouter.ExactInputParams(path, msg.sender, deadline, msg.value, amountOutMinimum)
        );
        emit Swapped(msg.sender, address(0), tokenOut, msg.value, amountOut);
    }

    /// Swaps `amountIn` of the first token in `path` for the last token in `path`.
    /// The caller must approve this contract for `amountIn`, and this contract must be associated
    /// with the input token (see `associate`).
    function swapExactTokensForTokens(
        bytes calldata path,
        uint256 amountIn,
        uint256 amountOutMinimum,
        uint256 deadline
    ) external nonReentrant returns (uint256 amountOut) {
        (address tokenIn, address tokenOut) = _endpoints(path);
        _pullAndApprove(tokenIn, amountIn);

        amountOut = router.exactInput(
            ISaucerSwapRouter.ExactInputParams(path, msg.sender, deadline, amountIn, amountOutMinimum)
        );
        emit Swapped(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
    }

    /// Swaps `amountIn` of the first token in `path` for native HBAR (the path must end in WHBAR).
    /// The router sends WHBAR to itself, unwraps it to this contract, and the HBAR is forwarded to the caller.
    function swapExactTokensForHbar(
        bytes calldata path,
        uint256 amountIn,
        uint256 amountOutMinimum,
        uint256 deadline
    ) external nonReentrant returns (uint256 amountOut) {
        (address tokenIn, address tokenOut) = _endpoints(path);
        if (tokenOut != whbar) revert PathMustEndWithWhbar();
        _pullAndApprove(tokenIn, amountIn);

        bytes[] memory calls = new bytes[](2);
        calls[0] = abi.encodeCall(
            ISaucerSwapRouter.exactInput,
            (ISaucerSwapRouter.ExactInputParams(path, address(router), deadline, amountIn, amountOutMinimum))
        );
        calls[1] = abi.encodeCall(ISaucerSwapRouter.unwrapWHBAR, (amountOutMinimum, address(this)));

        uint256 balanceBefore = address(this).balance;
        router.multicall(calls);
        amountOut = address(this).balance - balanceBefore;

        (bool sent, ) = msg.sender.call{ value: amountOut }("");
        if (!sent) revert HbarTransferFailed();
        emit Swapped(msg.sender, tokenIn, address(0), amountIn, amountOut);
    }

    /// Associates this contract with an HTS token. Anyone can call it; already associated is a no-op.
    function associate(address token) external {
        (bool ok, bytes memory result) = HTS.call(
            abi.encodeCall(IHederaTokenService.associateToken, (address(this), token))
        );
        int64 code = ok ? abi.decode(result, (int64)) : int64(-1);
        if (code != SUCCESS && code != TOKEN_ALREADY_ASSOCIATED) revert AssociationFailed(code);
        emit Associated(token);
    }

    /// Packs tokens and pool fees into a SaucerSwap path. `fees.length` must be `tokens.length - 1`.
    /// Fees are in hundredths of a bip: 500 = 0.05%, 3000 = 0.30%, 10000 = 1%.
    function encodePath(address[] calldata tokens, uint24[] calldata fees) external pure returns (bytes memory path) {
        if (tokens.length < 2 || fees.length != tokens.length - 1) revert InvalidPath();
        path = abi.encodePacked(tokens[0]);
        for (uint256 i = 0; i < fees.length; i++) {
            path = abi.encodePacked(path, fees[i], tokens[i + 1]);
        }
    }

    function _pullAndApprove(address token, uint256 amount) private {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(token).forceApprove(address(router), amount);
    }

    function _endpoints(bytes calldata path) private pure returns (address first, address last) {
        if (path.length < MIN_PATH_SIZE || (path.length - ADDRESS_SIZE) % HOP_SIZE != 0) revert InvalidPath();
        first = address(bytes20(path[:ADDRESS_SIZE]));
        last = address(bytes20(path[path.length - ADDRESS_SIZE:]));
    }
}
