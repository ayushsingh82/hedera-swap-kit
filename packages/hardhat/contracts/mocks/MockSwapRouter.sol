// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { ISaucerSwapRouter } from "../interfaces/ISaucerSwapRouter.sol";
import { MockToken } from "./MockToken.sol";

/// Test double for the SaucerSwap V2 router. Every swap pays out `amountIn * rate`, mints the
/// output token, and enforces the same deadline and minimum-output checks as the real router.
/// Output sent to the router itself is held as an HBAR credit until `unwrapWHBAR` pays it out.
contract MockSwapRouter {
    uint256 public rate;
    uint256 public hbarCredit;

    constructor(uint256 rate_) payable {
        rate = rate_;
    }

    receive() external payable {}

    function exactInput(
        ISaucerSwapRouter.ExactInputParams calldata params
    ) external payable returns (uint256 amountOut) {
        require(block.timestamp <= params.deadline, "Transaction too old");
        bytes calldata path = params.path;
        address tokenIn = address(bytes20(path[:20]));
        address tokenOut = address(bytes20(path[path.length - 20:]));

        if (msg.value == 0) IERC20(tokenIn).transferFrom(msg.sender, address(this), params.amountIn);

        amountOut = params.amountIn * rate;
        require(amountOut >= params.amountOutMinimum, "Too little received");

        if (params.recipient == address(this)) hbarCredit += amountOut;
        else MockToken(tokenOut).mint(params.recipient, amountOut);
    }

    function unwrapWHBAR(uint256 amountMinimum, address recipient) external {
        require(hbarCredit >= amountMinimum, "Insufficient WHBAR");
        uint256 amount = hbarCredit;
        hbarCredit = 0;
        (bool sent, ) = recipient.call{ value: amount }("");
        require(sent, "HBAR transfer failed");
    }

    function multicall(bytes[] calldata data) external payable {
        for (uint256 i = 0; i < data.length; i++) {
            (bool ok, bytes memory result) = address(this).delegatecall(data[i]);
            if (!ok) {
                assembly {
                    revert(add(result, 32), mload(result))
                }
            }
        }
    }
}
