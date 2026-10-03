// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { IHederaScheduleService } from "./interfaces/IHederaScheduleService.sol";
import { SwapHelper } from "./SwapHelper.sol";

/// Recurring HBAR to token swaps (dollar-cost averaging) that the Hedera network runs by itself.
///
/// Each plan swaps `amountPerRun` HBAR through `SwapHelper` every `interval` seconds. There is no keeper:
/// creating a plan schedules the first run with the Hedera Schedule Service (HSS), and every run schedules the
/// next one before it ends.
///
/// Money. A plan is prepaid: `amountPerRun * runs` for the swaps plus `automationFeePerRun * runs` for the gas the
/// network charges this contract to run each scheduled call. The contract must hold the gas limit times the gas
/// price when a run executes, which is why the fee is collected up front. Swap budget is escrowed per plan and
/// is only ever spent on that plan's swaps or refunded to its owner. Fees stay here, and the owner can withdraw
/// whatever is left over after all escrowed budgets.
///
/// Failure. A swap that reverts (for example the price moved past `minOutPerRun`) returns that run's HBAR to
/// the plan and the plan carries on. If HSS refuses to schedule the next run the plan pauses, and its owner can
/// `resume` it.
contract ScheduledSwap is Ownable, ReentrancyGuard {
    IHederaScheduleService public constant HSS = IHederaScheduleService(0x000000000000000000000000000000000000016B);
    int64 private constant SUCCESS = 22;
    uint256 private constant ADDRESS_SIZE = 20;
    uint256 private constant MIN_PATH_SIZE = 43;
    uint256 private constant SWAP_DEADLINE = 10 minutes;

    SwapHelper public immutable swapHelper;

    /// Gas for a run that has to schedule the next one. Scheduling alone used about 1.4M gas on testnet.
    uint256 public tickGas;
    /// Gas for the final run, which only swaps.
    uint256 public lastTickGas;
    /// HBAR (tinybar) kept per run to pay the network for running it.
    uint256 public automationFeePerRun;
    /// Sum of every plan's escrowed swap budget.
    uint256 public totalBudget;
    uint256 public nextPlanId;

    struct Plan {
        address owner;
        address recipient;
        bytes path;
        uint256 amountPerRun;
        uint256 minOutPerRun;
        uint256 interval;
        uint256 runsLeft;
        uint256 runsDone;
        uint256 budget;
        address schedule;
        bool active;
    }

    mapping(uint256 => Plan) private plans;

    event PlanCreated(
        uint256 indexed id,
        address indexed owner,
        address indexed recipient,
        uint256 amountPerRun,
        uint256 interval,
        uint256 runs
    );
    event RunScheduled(uint256 indexed id, address indexed schedule, uint256 at);
    event RunExecuted(uint256 indexed id, uint256 run, uint256 amountIn, uint256 amountOut);
    event RunFailed(uint256 indexed id, uint256 run);
    event PlanPaused(uint256 indexed id, int64 responseCode);
    event PlanResumed(uint256 indexed id);
    event PlanCompleted(uint256 indexed id, uint256 budgetLeft);
    event PlanCancelled(uint256 indexed id, uint256 refund);
    event SettingsUpdated(uint256 tickGas, uint256 lastTickGas, uint256 automationFeePerRun);

    error InvalidPlan();
    error PathMustStartWithWhbar();
    error WrongPayment(uint256 expected);
    error ScheduleFailed(int64 responseCode);
    error OnlyScheduled();
    error NotPlanOwner();
    error NotPaused();
    error ExceedsSurplus(uint256 surplus);
    error TransferFailed();

    constructor(
        address swapHelper_,
        address initialOwner,
        uint256 tickGas_,
        uint256 lastTickGas_,
        uint256 automationFeePerRun_
    ) Ownable(initialOwner) {
        swapHelper = SwapHelper(payable(swapHelper_));
        _setSettings(tickGas_, lastTickGas_, automationFeePerRun_);
    }

    receive() external payable {}

    /// Creates a plan and schedules its first run. Send exactly `amountPerRun * runs` plus the automation fee.
    /// `path` is a SaucerSwap path that starts with the WHBAR token (see `SwapHelper.encodePath`).
    /// `minOutPerRun` is the least each run may receive; a run that would get less is skipped.
    function create(
        bytes calldata path,
        address recipient,
        uint256 amountPerRun,
        uint256 minOutPerRun,
        uint256 interval,
        uint256 runs
    ) external payable nonReentrant returns (uint256 id) {
        if (recipient == address(0) || amountPerRun == 0 || interval == 0 || runs == 0) revert InvalidPlan();
        if (path.length < MIN_PATH_SIZE || address(bytes20(path[:ADDRESS_SIZE])) != swapHelper.whbar()) {
            revert PathMustStartWithWhbar();
        }
        uint256 budget = amountPerRun * runs;
        uint256 expected = budget + automationFeePerRun * runs;
        if (msg.value != expected) revert WrongPayment(expected);

        id = nextPlanId++;
        Plan storage plan = plans[id];
        plan.owner = msg.sender;
        plan.recipient = recipient;
        plan.path = path;
        plan.amountPerRun = amountPerRun;
        plan.minOutPerRun = minOutPerRun;
        plan.interval = interval;
        plan.runsLeft = runs;
        plan.budget = budget;
        plan.active = true;
        totalBudget += budget;

        (bool ok, int64 code) = _scheduleNext(id);
        if (!ok) revert ScheduleFailed(code);
        emit PlanCreated(id, msg.sender, recipient, amountPerRun, interval, runs);
    }

    /// One scheduled run. Only the Schedule Service can call it, and it does so as this contract.
    function execute(uint256 id) external nonReentrant {
        if (msg.sender != address(this)) revert OnlyScheduled();
        Plan storage plan = plans[id];
        if (!plan.active || plan.runsLeft == 0) return;

        plan.runsLeft--;
        plan.runsDone++;
        plan.schedule = address(0);

        try
            swapHelper.swapExactHbarForTokens{ value: plan.amountPerRun }(
                plan.path,
                plan.recipient,
                plan.minOutPerRun,
                block.timestamp + SWAP_DEADLINE
            )
        returns (uint256 amountOut) {
            plan.budget -= plan.amountPerRun;
            totalBudget -= plan.amountPerRun;
            emit RunExecuted(id, plan.runsDone, plan.amountPerRun, amountOut);
        } catch {
            emit RunFailed(id, plan.runsDone);
        }

        if (plan.runsLeft == 0) {
            plan.active = false;
            emit PlanCompleted(id, plan.budget);
            return;
        }
        (bool ok, int64 code) = _scheduleNext(id);
        if (!ok) {
            plan.active = false;
            emit PlanPaused(id, code);
        }
    }

    /// Schedules the next run of a paused plan.
    function resume(uint256 id) external nonReentrant {
        Plan storage plan = plans[id];
        if (msg.sender != plan.owner) revert NotPlanOwner();
        if (plan.active || plan.runsLeft == 0) revert NotPaused();
        plan.active = true;
        (bool ok, int64 code) = _scheduleNext(id);
        if (!ok) revert ScheduleFailed(code);
        emit PlanResumed(id);
    }

    /// Stops a plan and refunds its unspent swap budget. The automation fee is not refunded.
    function cancel(uint256 id) external nonReentrant {
        Plan storage plan = plans[id];
        if (msg.sender != plan.owner) revert NotPlanOwner();

        if (plan.schedule != address(0)) HSS.deleteSchedule(plan.schedule);
        uint256 refund = plan.budget;
        plan.budget = 0;
        plan.runsLeft = 0;
        plan.active = false;
        plan.schedule = address(0);
        totalBudget -= refund;

        _send(msg.sender, refund);
        emit PlanCancelled(id, refund);
    }

    function getPlan(uint256 id) external view returns (Plan memory) {
        return plans[id];
    }

    /// Fees held by this contract that no plan has a claim on.
    function surplus() public view returns (uint256) {
        uint256 balance = address(this).balance;
        return balance > totalBudget ? balance - totalBudget : 0;
    }

    function withdrawSurplus(address to, uint256 amount) external onlyOwner {
        uint256 available = surplus();
        if (amount > available) revert ExceedsSurplus(available);
        _send(to, amount);
    }

    function setSettings(uint256 tickGas_, uint256 lastTickGas_, uint256 automationFeePerRun_) external onlyOwner {
        _setSettings(tickGas_, lastTickGas_, automationFeePerRun_);
    }

    function _setSettings(uint256 tickGas_, uint256 lastTickGas_, uint256 automationFeePerRun_) private {
        tickGas = tickGas_;
        lastTickGas = lastTickGas_;
        automationFeePerRun = automationFeePerRun_;
        emit SettingsUpdated(tickGas_, lastTickGas_, automationFeePerRun_);
    }

    /// The last run only swaps, so it needs far less gas, and so far less balance, than one that reschedules.
    function _scheduleNext(uint256 id) private returns (bool ok, int64 code) {
        Plan storage plan = plans[id];
        uint256 at = block.timestamp + plan.interval;
        uint256 gas = plan.runsLeft == 1 ? lastTickGas : tickGas;

        if (!HSS.hasScheduleCapacity(at, gas)) return (false, -1);
        address schedule;
        (code, schedule) = HSS.scheduleCall(address(this), at, gas, 0, abi.encodeCall(this.execute, (id)));
        if (code != SUCCESS) return (false, code);

        plan.schedule = schedule;
        emit RunScheduled(id, schedule, at);
        return (true, code);
    }

    function _send(address to, uint256 amount) private {
        (bool sent, ) = to.call{ value: amount }("");
        if (!sent) revert TransferFailed();
    }
}
