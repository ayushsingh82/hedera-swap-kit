// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IHederaScheduleService } from "../interfaces/IHederaScheduleService.sol";

/// Throwaway spike: proves a contract can schedule a call to itself through HSS and keep rescheduling
/// until its runs are used up, with no keeper. Not part of the template.
contract HssSpike {
    IHederaScheduleService private constant HSS = IHederaScheduleService(0x000000000000000000000000000000000000016B);
    int64 private constant SUCCESS = 22;
    /// Gas for each scheduled run. It must cover tick() and the HSS call that schedules the next run (about 1.4M).
    uint256 public immutable tickGas;

    uint256 public interval;
    uint256 public runsLeft;
    uint256 public ticks;

    event Scheduled(address indexed schedule, uint256 at);
    event Tick(uint256 indexed n, uint256 at, address caller);

    error OnlyScheduled();
    error NoCapacity();
    error ScheduleFailed(int64 responseCode);

    constructor(uint256 tickGas_) payable {
        tickGas = tickGas_;
    }

    receive() external payable {}

    function start(uint256 interval_, uint256 runs) external {
        interval = interval_;
        runsLeft = runs;
        _schedule();
    }

    /// Only the Schedule Service calls this, as the contract itself.
    function tick() external {
        if (msg.sender != address(this)) revert OnlyScheduled();
        ticks++;
        runsLeft--;
        emit Tick(ticks, block.timestamp, msg.sender);
        if (runsLeft > 0) _schedule();
    }

    function _schedule() private {
        uint256 at = block.timestamp + interval;
        if (!HSS.hasScheduleCapacity(at, tickGas)) revert NoCapacity();
        (int64 rc, address schedule) = HSS.scheduleCall(address(this), at, tickGas, 0, abi.encodeCall(this.tick, ()));
        if (rc != SUCCESS) revert ScheduleFailed(rc);
        emit Scheduled(schedule, at);
    }
}
