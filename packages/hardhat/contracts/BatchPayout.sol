// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { SwapHelper } from "./SwapHelper.sol";

/// Pays many recipients in one transaction, each in the token they want.
///
/// The sender funds the batch with HBAR. Each payment is either a swap through `SwapHelper` into the recipient's
/// token (a SaucerSwap path that starts with WHBAR), or, when the path is empty, a plain HBAR transfer.
///
/// A payment that fails does not sink the batch. A recipient that is not associated with the token, a price that
/// moved past `minOut`, or an account that rejects HBAR all make that one payment fail: its HBAR is refunded to the
/// sender when the batch ends, and an event says which one failed. Apps can tag a run with a `batchId`
/// (for example "2026-10 payroll") that is indexed on every event.
contract BatchPayout is ReentrancyGuard {
    SwapHelper public immutable swapHelper;

    uint256 public constant MAX_PAYMENTS = 50;
    uint256 private constant ADDRESS_SIZE = 20;

    struct Payment {
        address recipient;
        /// HBAR (tinybar) spent on this payment.
        uint256 amountIn;
        /// Least the recipient must receive, in the output token. Ignored for plain HBAR payments.
        uint256 minOut;
        /// SaucerSwap path starting with WHBAR, or empty to send HBAR directly.
        bytes path;
    }

    /// `tokenOut` is address(0) for a plain HBAR payment.
    event PayoutSent(
        address indexed sender,
        bytes32 indexed batchId,
        address indexed recipient,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );
    event PayoutFailed(
        address indexed sender,
        bytes32 indexed batchId,
        address indexed recipient,
        uint256 index,
        uint256 amountIn
    );
    event BatchCompleted(
        address indexed sender,
        bytes32 indexed batchId,
        uint256 sent,
        uint256 failed,
        uint256 refunded
    );

    error NoPayments();
    error TooManyPayments(uint256 count);
    error WrongTotal(uint256 expected);
    error ZeroRecipient();
    error TransferFailed();

    constructor(address swapHelper_) {
        swapHelper = SwapHelper(payable(swapHelper_));
    }

    /// Send exactly the sum of every `amountIn` as the transaction value.
    function payout(
        Payment[] calldata payments,
        bytes32 batchId,
        uint256 deadline
    ) external payable nonReentrant returns (uint256 sent, uint256 failed) {
        uint256 count = payments.length;
        if (count == 0) revert NoPayments();
        if (count > MAX_PAYMENTS) revert TooManyPayments(count);

        uint256 total;
        for (uint256 i = 0; i < count; i++) total += payments[i].amountIn;
        if (msg.value != total) revert WrongTotal(total);

        uint256 refund;
        for (uint256 i = 0; i < count; i++) {
            Payment calldata payment = payments[i];
            if (payment.recipient == address(0)) revert ZeroRecipient();

            if (_pay(payment, batchId, deadline)) {
                sent++;
            } else {
                failed++;
                refund += payment.amountIn;
                emit PayoutFailed(msg.sender, batchId, payment.recipient, i, payment.amountIn);
            }
        }

        if (refund > 0) {
            (bool ok, ) = msg.sender.call{ value: refund }("");
            if (!ok) revert TransferFailed();
        }
        emit BatchCompleted(msg.sender, batchId, sent, failed, refund);
    }

    function _pay(Payment calldata payment, bytes32 batchId, uint256 deadline) private returns (bool) {
        if (payment.path.length == 0) {
            (bool ok, ) = payment.recipient.call{ value: payment.amountIn }("");
            if (ok) {
                emit PayoutSent(msg.sender, batchId, payment.recipient, address(0), payment.amountIn, payment.amountIn);
            }
            return ok;
        }

        try
            swapHelper.swapExactHbarForTokens{ value: payment.amountIn }(
                payment.path,
                payment.recipient,
                payment.minOut,
                deadline
            )
        returns (uint256 amountOut) {
            address tokenOut = address(bytes20(payment.path[payment.path.length - ADDRESS_SIZE:]));
            emit PayoutSent(msg.sender, batchId, payment.recipient, tokenOut, payment.amountIn, amountOut);
            return true;
        } catch {
            return false;
        }
    }
}
