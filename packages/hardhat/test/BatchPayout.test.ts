import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("BatchPayout", function () {
  const RATE = 2n;
  const POOL_FEE = 3000;
  const AMOUNT = ethers.parseEther("1");
  const REFERENCE = ethers.encodeBytes32String("2026-10 payroll");

  async function deployFixture() {
    const [sender, alice, bob, carol, owner] = await ethers.getSigners();

    const router = await (
      await ethers.getContractFactory("MockSwapRouter")
    ).deploy(RATE, { value: ethers.parseEther("100") });
    const Token = await ethers.getContractFactory("MockToken");
    const whbar = await Token.deploy("Wrapped HBAR", "WHBAR");
    const sauce = await Token.deploy("SaucerSwap", "SAUCE");
    const usdc = await Token.deploy("USD Coin", "USDC");
    const helper = await (
      await ethers.getContractFactory("SwapHelper")
    ).deploy(router.target, whbar.target, owner.address);
    const batch = await (await ethers.getContractFactory("BatchPayout")).deploy(helper.target);

    const pathTo = (token: { target: unknown }) =>
      helper.encodePath([whbar.target, token.target as string], [POOL_FEE]);
    const deadline = (await time.latest()) + 600;
    const payment = (recipient: string, path: string, amountIn = AMOUNT, minOut = 0n) => ({
      recipient,
      amountIn,
      minOut,
      path,
    });
    const send = (payments: ReturnType<typeof payment>[], value?: bigint) =>
      batch.payout(payments, REFERENCE, deadline, {
        value: value ?? payments.reduce((sum, p) => sum + p.amountIn, 0n),
      });

    return { sender, alice, bob, carol, router, whbar, sauce, usdc, helper, batch, pathTo, payment, send, deadline };
  }

  it("pays each recipient in the token they chose", async function () {
    const { batch, sender, alice, bob, sauce, usdc, pathTo, payment, send } = await deployFixture();
    const sauceOut = (await send([
      payment(alice.address, await pathTo(sauce)),
      payment(bob.address, await pathTo(usdc), AMOUNT * 2n),
    ])) as unknown;

    await expect(sauceOut)
      .to.emit(batch, "PayoutSent")
      .withArgs(sender.address, REFERENCE, alice.address, sauce.target, AMOUNT, AMOUNT * RATE)
      .and.to.emit(batch, "PayoutSent")
      .withArgs(sender.address, REFERENCE, bob.address, usdc.target, AMOUNT * 2n, AMOUNT * 2n * RATE)
      .and.to.emit(batch, "BatchCompleted")
      .withArgs(sender.address, REFERENCE, 2, 0, 0);

    expect(await sauce.balanceOf(alice.address)).to.equal(AMOUNT * RATE);
    expect(await usdc.balanceOf(bob.address)).to.equal(AMOUNT * 2n * RATE);
  });

  it("sends plain HBAR when the path is empty", async function () {
    const { batch, sender, carol, payment, send } = await deployFixture();
    const tx = send([payment(carol.address, "0x")]);
    await expect(tx).to.changeEtherBalance(carol, AMOUNT);
    await expect(tx)
      .to.emit(batch, "PayoutSent")
      .withArgs(sender.address, REFERENCE, carol.address, ethers.ZeroAddress, AMOUNT, AMOUNT);
  });

  it("refunds a failed payment and still pays the rest", async function () {
    const { batch, sender, alice, bob, sauce, pathTo, payment, send } = await deployFixture();
    const tooHigh = AMOUNT * RATE + 1n;
    const tx = send([
      payment(alice.address, await pathTo(sauce), AMOUNT, tooHigh),
      payment(bob.address, await pathTo(sauce)),
    ]);

    await expect(tx).to.emit(batch, "PayoutFailed").withArgs(sender.address, REFERENCE, alice.address, 0, AMOUNT);
    await expect(tx).to.emit(batch, "BatchCompleted").withArgs(sender.address, REFERENCE, 1, 1, AMOUNT);
    expect(await sauce.balanceOf(alice.address)).to.equal(0);
    expect(await sauce.balanceOf(bob.address)).to.equal(AMOUNT * RATE);
  });

  it("returns the refund to the sender", async function () {
    const { sender, alice, sauce, pathTo, payment, send } = await deployFixture();
    const before = await ethers.provider.getBalance(sender.address);
    const tx = await send([payment(alice.address, await pathTo(sauce), AMOUNT, AMOUNT * RATE + 1n)]);
    const receipt = await tx.wait();
    const after = await ethers.provider.getBalance(sender.address);
    // The only payment failed, so the sender is out gas and nothing else.
    expect(before - after).to.equal(receipt!.gasUsed * receipt!.gasPrice);
  });

  it("refunds a plain HBAR payment that the recipient rejects", async function () {
    const { batch, sender, usdc, payment, send } = await deployFixture();
    // A token contract has no receive function, so it rejects HBAR.
    await expect(send([payment(usdc.target as string, "0x")]))
      .to.emit(batch, "PayoutFailed")
      .withArgs(sender.address, REFERENCE, usdc.target, 0, AMOUNT);
  });

  it("fails a payment whose path does not start with WHBAR", async function () {
    const { batch, alice, helper, whbar, sauce, payment, send } = await deployFixture();
    const reversed = await helper.encodePath([sauce.target, whbar.target], [POOL_FEE]);
    await expect(send([payment(alice.address, reversed)])).to.emit(batch, "PayoutFailed");
  });

  it("rejects a total that does not match the value sent", async function () {
    const { batch, alice, sauce, pathTo, payment, send } = await deployFixture();
    await expect(send([payment(alice.address, await pathTo(sauce))], AMOUNT - 1n))
      .to.be.revertedWithCustomError(batch, "WrongTotal")
      .withArgs(AMOUNT);
  });

  it("rejects an empty batch, too many payments and a zero recipient", async function () {
    const { batch, alice, payment, send } = await deployFixture();
    await expect(send([])).to.be.revertedWithCustomError(batch, "NoPayments");
    const many = Array.from({ length: 51 }, () => payment(alice.address, "0x", 1n));
    await expect(send(many)).to.be.revertedWithCustomError(batch, "TooManyPayments").withArgs(51);
    await expect(send([payment(ethers.ZeroAddress, "0x")])).to.be.revertedWithCustomError(batch, "ZeroRecipient");
  });

  it("holds no HBAR after a batch", async function () {
    const { batch, alice, bob, sauce, pathTo, payment, send } = await deployFixture();
    await send([payment(alice.address, await pathTo(sauce)), payment(bob.address, "0x")]);
    expect(await ethers.provider.getBalance(batch.target)).to.equal(0);
  });
});
