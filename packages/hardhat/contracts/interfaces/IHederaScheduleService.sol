// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// Hedera Schedule Service system contract at 0x16b (HIP-755, HIP-1215).
/// Failures return a response code instead of reverting; 22 is SUCCESS.
interface IHederaScheduleService {
    /// Schedules `callData` to run on `to` at `expirySecond`. The calling contract pays.
    /// `value` is in tinybar.
    function scheduleCall(
        address to,
        uint256 expirySecond,
        uint256 gasLimit,
        uint64 value,
        bytes memory callData
    ) external returns (int64 responseCode, address scheduleAddress);

    function deleteSchedule(address scheduleAddress) external returns (int64 responseCode);

    function hasScheduleCapacity(uint256 expirySecond, uint256 gasLimit) external view returns (bool hasCapacity);
}
