// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// Test double for the Hedera Schedule Service at 0x16b. It records scheduled calls so a test can run them by
/// hand, and it can be told to fail the way the real service does: with a response code instead of a revert.
contract MockScheduleService {
    struct ScheduledCall {
        address to;
        uint256 expirySecond;
        uint256 gasLimit;
        uint64 value;
        bytes callData;
        bool deleted;
    }

    ScheduledCall[] public calls;
    /// Zero means success. Anything else is returned from `scheduleCall` as the response code.
    int64 public failCode;

    /// The mock lives at a fixed address, so tests reset it instead of redeploying.
    function reset() external {
        delete calls;
        failCode = 0;
    }

    function setFailCode(int64 code) external {
        failCode = code;
    }

    function callCount() external view returns (uint256) {
        return calls.length;
    }

    function hasScheduleCapacity(uint256, uint256) external pure returns (bool) {
        return true;
    }

    function scheduleCall(
        address to,
        uint256 expirySecond,
        uint256 gasLimit,
        uint64 value,
        bytes memory callData
    ) external returns (int64, address) {
        if (failCode != 0) return (failCode, address(0));
        calls.push(ScheduledCall(to, expirySecond, gasLimit, value, callData, false));
        return (22, address(uint160(calls.length)));
    }

    function deleteSchedule(address scheduleAddress) external returns (int64) {
        calls[uint160(scheduleAddress) - 1].deleted = true;
        return 22;
    }
}
