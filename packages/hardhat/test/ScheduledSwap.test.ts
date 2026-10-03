import { expect } from "chai";
import { ethers, network } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const HSS_ADDRESS = "0x000000000000000000000000000000000000016B";

describe("ScheduledSwap", function () {
  const RATE = 2n;
  const POOL_FEE = 3000;
  const AMOUNT = ethers.parseEther("1");
  const FEE_PER_RUN = ethers.parseEther("0.2");
  const INTERVAL = 3600;
  const RUNS = 3;
  const TICK_GAS = 2_000_000n;
  const LAST_TICK_GAS = 800_000n;

  async function deployFixture() {
    const [user, other, owner, recipient] = await ethers.getSigners();

    // Put the mock Schedule Service where the real one lives.
    const mockHss = await (await ethers.getContractFactory("MockScheduleService")).deploy();
    await network.provider.send("hardhat_setCode", [HSS_ADDRESS, await ethers.provider.getCode(mockHss.target)]);
    const hss = await ethers.getContractAt("MockScheduleService", HSS_ADDRESS);
    await hss.reset();

    const router = await (
      await ethers.getContractFactory("MockSwapRouter")
    ).deploy(RATE, { value: ethers.parseEther("100") });
    const Token = await ethers.getContractFactory("MockToken");
    const whbar = await Token.deploy("Wrapped HBAR", "WHBAR");
    const sauce = await Token.deploy("SaucerSwap", "SAUCE");
    const helper = await (
      await ethers.getContractFactory("SwapHelper")
    ).deploy(router.target, whbar.target, owner.address);
    const dca = await (
      await ethers.getContractFactory("ScheduledSwap")
    ).deploy(helper.target, owner.address, TICK_GAS, LAST_TICK_GAS, FEE_PER_RUN);

    const path = await helper.encodePath([whbar.target, sauce.target], [POOL_FEE]);
    const payment = (runs = RUNS) => (AMOUNT + FEE_PER_RUN) * BigInt(runs);
    const create = (overrides: { minOut?: bigint; runs?: number; value?: bigint } = {}) =>
      dca
        .connect(user)
        .create(path, recipient.address, AMOUNT, overrides.minOut ?? 0, INTERVAL, overrides.runs ?? RUNS, {
          value: overrides.value ?? payment(overrides.runs ?? RUNS),
        });

    // The network runs a scheduled call as the contract itself, so the tests do the same.
    const runScheduled = async (id: number) => {
      await time.increase(INTERVAL);
      await network.provider.send("hardhat_setNextBlockBaseFeePerGas", ["0x0"]);
      const self = await ethers.getImpersonatedSigner(await dca.getAddress());
      return dca.connect(self).execute(id, { gasPrice: 0 });
    };

    return {
      user,
      other,
      owner,
      recipient,
      hss,
      router,
      whbar,
      sauce,
      helper,
      dca,
      path,
      payment,
      create,
      runScheduled,
    };
  }

  describe("create", function () {
    it("stores the plan, takes payment and schedules the first run", async function () {
      const { dca, hss, user, recipient, create, payment, path } = await deployFixture();
      await expect(create())
        .to.emit(dca, "PlanCreated")
        .withArgs(0, user.address, recipient.address, AMOUNT, INTERVAL, RUNS);

      const plan = await dca.getPlan(0);
      expect(plan.owner).to.equal(user.address);
      expect(plan.path).to.equal(path);
      expect(plan.runsLeft).to.equal(RUNS);
      expect(plan.budget).to.equal(AMOUNT * BigInt(RUNS));
      expect(plan.active).to.equal(true);
      expect(await dca.totalBudget()).to.equal(AMOUNT * BigInt(RUNS));
      expect(await ethers.provider.getBalance(dca.target)).to.equal(payment());

      const call = await hss.calls(0);
      expect(call.to).to.equal(dca.target);
      expect(call.gasLimit).to.equal(TICK_GAS);
      expect(call.value).to.equal(0);
      expect(call.callData).to.equal(dca.interface.encodeFunctionData("execute", [0]));
      expect(call.expirySecond).to.equal(BigInt(await time.latest()) + BigInt(INTERVAL));
    });

    it("schedules a single-run plan with the small final-run gas", async function () {
      const { hss, create } = await deployFixture();
      await create({ runs: 1 });
      expect((await hss.calls(0)).gasLimit).to.equal(LAST_TICK_GAS);
    });

    it("rejects the wrong payment", async function () {
      const { dca, create, payment } = await deployFixture();
      await expect(create({ value: payment() - 1n }))
        .to.be.revertedWithCustomError(dca, "WrongPayment")
        .withArgs(payment());
    });

    it("rejects an empty plan and a zero recipient", async function () {
      const { dca, user, path } = await deployFixture();
      await expect(dca.connect(user).create(path, user.address, AMOUNT, 0, INTERVAL, 0)).to.be.revertedWithCustomError(
        dca,
        "InvalidPlan",
      );
      await expect(
        dca.connect(user).create(path, ethers.ZeroAddress, AMOUNT, 0, INTERVAL, 1),
      ).to.be.revertedWithCustomError(dca, "InvalidPlan");
    });

    it("rejects a path that does not start with WHBAR", async function () {
      const { dca, helper, user, sauce, whbar, payment } = await deployFixture();
      const reversed = await helper.encodePath([sauce.target, whbar.target], [POOL_FEE]);
      await expect(
        dca.connect(user).create(reversed, user.address, AMOUNT, 0, INTERVAL, RUNS, { value: payment() }),
      ).to.be.revertedWithCustomError(dca, "PathMustStartWithWhbar");
    });

    it("reverts when the Schedule Service refuses", async function () {
      const { dca, hss, create } = await deployFixture();
      await hss.setFailCode(366);
      await expect(create()).to.be.revertedWithCustomError(dca, "ScheduleFailed").withArgs(366);
    });
  });

  describe("execute", function () {
    it("can only be called by the contract itself", async function () {
      const { dca, user, create } = await deployFixture();
      await create();
      await expect(dca.connect(user).execute(0)).to.be.revertedWithCustomError(dca, "OnlyScheduled");
    });

    it("swaps for the recipient and schedules the next run", async function () {
      const { dca, hss, sauce, recipient, create, runScheduled } = await deployFixture();
      await create();

      await expect(runScheduled(0))
        .to.emit(dca, "RunExecuted")
        .withArgs(0, 1, AMOUNT, AMOUNT * RATE);

      expect(await sauce.balanceOf(recipient.address)).to.equal(AMOUNT * RATE);
      const plan = await dca.getPlan(0);
      expect(plan.runsLeft).to.equal(RUNS - 1);
      expect(plan.budget).to.equal(AMOUNT * BigInt(RUNS - 1));
      expect(await dca.totalBudget()).to.equal(AMOUNT * BigInt(RUNS - 1));
      expect(await hss.callCount()).to.equal(2);
      expect((await hss.calls(1)).gasLimit).to.equal(TICK_GAS);
    });

    it("gives the final run the small gas limit and completes the plan", async function () {
      const { dca, hss, create, runScheduled } = await deployFixture();
      await create({ runs: 2 });

      await runScheduled(0);
      expect((await hss.calls(1)).gasLimit).to.equal(LAST_TICK_GAS);

      await expect(runScheduled(0)).to.emit(dca, "PlanCompleted").withArgs(0, 0);
      expect(await hss.callCount()).to.equal(2);
      const plan = await dca.getPlan(0);
      expect(plan.active).to.equal(false);
      expect(plan.runsLeft).to.equal(0);
      expect(await dca.totalBudget()).to.equal(0);
    });

    it("keeps the budget and carries on when a swap fails", async function () {
      const { dca, hss, sauce, recipient, create, runScheduled } = await deployFixture();
      await create({ minOut: AMOUNT * RATE + 1n });

      await expect(runScheduled(0)).to.emit(dca, "RunFailed").withArgs(0, 1);

      expect(await sauce.balanceOf(recipient.address)).to.equal(0);
      const plan = await dca.getPlan(0);
      expect(plan.budget).to.equal(AMOUNT * BigInt(RUNS));
      expect(plan.runsLeft).to.equal(RUNS - 1);
      expect(plan.active).to.equal(true);
      expect(await hss.callCount()).to.equal(2);
    });

    it("pauses the plan when the next run cannot be scheduled, and resumes it", async function () {
      const { dca, hss, user, create, runScheduled } = await deployFixture();
      await create();

      await hss.setFailCode(366);
      await expect(runScheduled(0)).to.emit(dca, "PlanPaused").withArgs(0, 366);
      expect((await dca.getPlan(0)).active).to.equal(false);

      await expect(dca.connect(user).resume(0)).to.be.revertedWithCustomError(dca, "ScheduleFailed");
      await hss.setFailCode(0);
      await expect(dca.connect(user).resume(0)).to.emit(dca, "PlanResumed").withArgs(0);
      expect((await dca.getPlan(0)).active).to.equal(true);
      expect(await hss.callCount()).to.equal(2);
    });

    it("only lets the owner resume, and only a paused plan", async function () {
      const { dca, user, other, create } = await deployFixture();
      await create();
      await expect(dca.connect(other).resume(0)).to.be.revertedWithCustomError(dca, "NotPlanOwner");
      await expect(dca.connect(user).resume(0)).to.be.revertedWithCustomError(dca, "NotPaused");
    });
  });

  describe("cancel", function () {
    it("refunds the unspent budget and deletes the pending schedule", async function () {
      const { dca, hss, user, create, runScheduled } = await deployFixture();
      await create();
      await runScheduled(0);

      const before = await ethers.provider.getBalance(user.address);
      const tx = await dca.connect(user).cancel(0);
      const receipt = await tx.wait();
      const gas = receipt!.gasUsed * receipt!.gasPrice;
      const refund = AMOUNT * BigInt(RUNS - 1);

      await expect(tx).to.emit(dca, "PlanCancelled").withArgs(0, refund);
      expect((await ethers.provider.getBalance(user.address)) - before + gas).to.equal(refund);
      expect((await hss.calls(1)).deleted).to.equal(true);
      expect((await dca.getPlan(0)).active).to.equal(false);
      expect(await dca.totalBudget()).to.equal(0);
    });

    it("is only for the plan owner", async function () {
      const { dca, other, create } = await deployFixture();
      await create();
      await expect(dca.connect(other).cancel(0)).to.be.revertedWithCustomError(dca, "NotPlanOwner");
    });

    it("makes a later scheduled run do nothing", async function () {
      const { dca, user, sauce, recipient, create, runScheduled } = await deployFixture();
      await create();
      await dca.connect(user).cancel(0);
      await runScheduled(0);
      expect(await sauce.balanceOf(recipient.address)).to.equal(0);
    });
  });

  describe("fees", function () {
    it("never lets the owner withdraw escrowed budget", async function () {
      const { dca, owner, create } = await deployFixture();
      await create();
      const fees = FEE_PER_RUN * BigInt(RUNS);
      expect(await dca.surplus()).to.equal(fees);

      await expect(dca.connect(owner).withdrawSurplus(owner.address, fees + 1n))
        .to.be.revertedWithCustomError(dca, "ExceedsSurplus")
        .withArgs(fees);
      await expect(dca.connect(owner).withdrawSurplus(owner.address, fees)).to.changeEtherBalance(owner, fees);
      expect(await dca.surplus()).to.equal(0);
    });

    it("lets only the owner withdraw and change settings", async function () {
      const { dca, other, owner } = await deployFixture();
      await expect(dca.connect(other).withdrawSurplus(other.address, 0)).to.be.revertedWithCustomError(
        dca,
        "OwnableUnauthorizedAccount",
      );
      await expect(dca.connect(other).setSettings(1, 1, 1)).to.be.revertedWithCustomError(
        dca,
        "OwnableUnauthorizedAccount",
      );
      await expect(dca.connect(owner).setSettings(3_000_000, 900_000, 5))
        .to.emit(dca, "SettingsUpdated")
        .withArgs(3_000_000, 900_000, 5);
    });
  });
});
