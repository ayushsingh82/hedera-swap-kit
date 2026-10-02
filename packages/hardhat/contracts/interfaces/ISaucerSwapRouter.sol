// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// The slice of the SaucerSwap V2 SwapRouter this template uses.
/// https://docs.saucerswap.finance/developers/v2/swap
interface ISaucerSwapRouter {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);

    /// Unwraps WHBAR held by the router and sends native HBAR to `recipient`.
    function unwrapWHBAR(uint256 amountMinimum, address recipient) external;

    function multicall(bytes[] calldata data) external payable;
}
