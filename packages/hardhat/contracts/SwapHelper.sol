// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
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
///
/// Apps that build on this contract can charge an integrator fee. The owner sets `feeBps` (at most 1%),
/// it is taken from the input amount, and it stays in this contract until the owner withdraws it.
/// This contract never holds user funds between transactions, so its whole balance is accrued fees.
contract SwapHelper is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public constant HTS = 0x0000000000000000000000000000000000000167;
    int64 private constant SUCCESS = 22;
    int64 private constant TOKEN_ALREADY_ASSOCIATED = 194;

    uint256 private constant ADDRESS_SIZE = 20;
    uint256 private constant FEE_SIZE = 3;
    uint256 private constant HOP_SIZE = ADDRESS_SIZE + FEE_SIZE;
    uint256 private constant MIN_PATH_SIZE = ADDRESS_SIZE + HOP_SIZE;

    uint16 public constant MAX_FEE_BPS = 100;
    uint256 private constant BPS = 10_000;

    ISaucerSwapRouter public immutable router;
    address public immutable whbar;

    /// Integrator fee in basis points of the input amount. Zero by default.
    uint16 public feeBps;

    /// `tokenIn` is address(0) for native HBAR in and `tokenOut` is address(0) for native HBAR out.
    /// `amountIn` is the gross amount the caller paid, `fee` is the part of it kept as integrator fee.
    event Swapped(
        address indexed user,
        address indexed recipient,
        address indexed tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 fee
    );
    event Associated(address indexed token);
    event FeeUpdated(uint16 feeBps);
    event FeesWithdrawn(address indexed token, address indexed to, uint256 amount);

    error InvalidPath();
    error PathMustStartWithWhbar();
    error PathMustEndWithWhbar();
    error NoValueSent();
    error ZeroRecipient();
    error FeeTooHigh(uint16 feeBps);
    error AssociationFailed(int64 responseCode);
    error HbarTransferFailed();

    constructor(address router_, address whbar_, address initialOwner) Ownable(initialOwner) {
        router = ISaucerSwapRouter(router_);
        whbar = whbar_;
    }

    receive() external payable {}

    /// Swaps msg.value of native HBAR for the token at the end of `path`, paid out to `recipient`.
    function swapExactHbarForTokens(
        bytes calldata path,
        address recipient,
        uint256 amountOutMinimum,
        uint256 deadline
    ) external payable nonReentrant returns (uint256 amountOut) {
        if (msg.value == 0) revert NoValueSent();
        if (recipient == address(0)) revert ZeroRecipient();
        (address tokenIn, address tokenOut) = _endpoints(path);
        if (tokenIn != whbar) revert PathMustStartWithWhbar();

        (uint256 net, uint256 fee) = _splitFee(msg.value);
        amountOut = router.exactInput{ value: net }(
            ISaucerSwapRouter.ExactInputParams(path, recipient, deadline, net, amountOutMinimum)
        );
        emit Swapped(msg.sender, recipient, address(0), tokenOut, msg.value, amountOut, fee);
    }

    /// Swaps `amountIn` of the first token in `path` for the last token in `path`, paid out to `recipient`.
    /// The caller must approve this contract for `amountIn`, and this contract must be associated
    /// with the input token (see `associate`). The recipient must be associated with the output token.
    function swapExactTokensForTokens(
        bytes calldata path,
        address recipient,
        uint256 amountIn,
        uint256 amountOutMinimum,
        uint256 deadline
    ) external nonReentrant returns (uint256 amountOut) {
        if (recipient == address(0)) revert ZeroRecipient();
        (address tokenIn, address tokenOut) = _endpoints(path);

        (uint256 net, uint256 fee) = _splitFee(amountIn);
        _pullAndApprove(tokenIn, amountIn, net);

        amountOut = router.exactInput(
            ISaucerSwapRouter.ExactInputParams(path, recipient, deadline, net, amountOutMinimum)
        );
        emit Swapped(msg.sender, recipient, tokenIn, tokenOut, amountIn, amountOut, fee);
    }

    /// Swaps `amountIn` of the first token in `path` for native HBAR (the path must end in WHBAR), paid out to
    /// `recipient`. The router sends WHBAR to itself, unwraps it to this contract, and the HBAR is forwarded.
    function swapExactTokensForHbar(
        bytes calldata path,
        address recipient,
        uint256 amountIn,
        uint256 amountOutMinimum,
        uint256 deadline
    ) external nonReentrant returns (uint256 amountOut) {
        if (recipient == address(0)) revert ZeroRecipient();
        (address tokenIn, address tokenOut) = _endpoints(path);
        if (tokenOut != whbar) revert PathMustEndWithWhbar();

        (uint256 net, uint256 fee) = _splitFee(amountIn);
        _pullAndApprove(tokenIn, amountIn, net);

        bytes[] memory calls = new bytes[](2);
        calls[0] = abi.encodeCall(
            ISaucerSwapRouter.exactInput,
            (ISaucerSwapRouter.ExactInputParams(path, address(router), deadline, net, amountOutMinimum))
        );
        calls[1] = abi.encodeCall(ISaucerSwapRouter.unwrapWHBAR, (amountOutMinimum, address(this)));

        uint256 balanceBefore = address(this).balance;
        router.multicall(calls);
        amountOut = address(this).balance - balanceBefore;

        _sendHbar(recipient, amountOut);
        emit Swapped(msg.sender, recipient, tokenIn, address(0), amountIn, amountOut, fee);
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

    /// Sets the integrator fee in basis points of the input amount (100 = 1%, the maximum).
    function setFee(uint16 newFeeBps) external onlyOwner {
        if (newFeeBps > MAX_FEE_BPS) revert FeeTooHigh(newFeeBps);
        feeBps = newFeeBps;
        emit FeeUpdated(newFeeBps);
    }

    /// Withdraws accrued token fees. The recipient must be associated with the token.
    function withdrawTokenFees(address token, address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroRecipient();
        IERC20(token).safeTransfer(to, amount);
        emit FeesWithdrawn(token, to, amount);
    }

    /// Withdraws accrued HBAR fees.
    function withdrawHbarFees(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroRecipient();
        _sendHbar(to, amount);
        emit FeesWithdrawn(address(0), to, amount);
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

    function _splitFee(uint256 amount) private view returns (uint256 net, uint256 fee) {
        fee = (amount * feeBps) / BPS;
        net = amount - fee;
    }

    /// Pulls `gross` from the caller and approves the router for `net`. The difference stays here as fee.
    function _pullAndApprove(address token, uint256 gross, uint256 net) private {
        IERC20(token).safeTransferFrom(msg.sender, address(this), gross);
        IERC20(token).forceApprove(address(router), net);
    }

    function _sendHbar(address to, uint256 amount) private {
        (bool sent, ) = to.call{ value: amount }("");
        if (!sent) revert HbarTransferFailed();
    }

    function _endpoints(bytes calldata path) private pure returns (address first, address last) {
        if (path.length < MIN_PATH_SIZE || (path.length - ADDRESS_SIZE) % HOP_SIZE != 0) revert InvalidPath();
        first = address(bytes20(path[:ADDRESS_SIZE]));
        last = address(bytes20(path[path.length - ADDRESS_SIZE:]));
    }
}
