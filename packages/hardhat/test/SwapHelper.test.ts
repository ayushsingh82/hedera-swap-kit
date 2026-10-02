import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("SwapHelper", function () {
  const RATE = 2n;
  const FEE = 3000;
  const AMOUNT_IN = 1_000_000n;
  const ROUTER_HBAR_RESERVE = ethers.parseEther("10");

  async function deployFixture() {
    const [user] = await ethers.getSigners();

    const router = await (
      await ethers.getContractFactory("MockSwapRouter")
    ).deploy(RATE, { value: ROUTER_HBAR_RESERVE });
    const Token = await ethers.getContractFactory("MockToken");
    const whbar = await Token.deploy("Wrapped HBAR", "WHBAR");
    const usdc = await Token.deploy("USD Coin", "USDC");
    const sauce = await Token.deploy("SaucerSwap", "SAUCE");

    const helper = await (await ethers.getContractFactory("SwapHelper")).deploy(router.target, whbar.target);

    await usdc.mint(user.address, AMOUNT_IN * 10n);
    const deadline = (await time.latest()) + 600;
    const encode = (tokens: string[]) => helper.encodePath(tokens, Array(tokens.length - 1).fill(FEE));

    return { user, router, whbar, usdc, sauce, helper, deadline, encode };
  }

  describe("encodePath", function () {
    it("packs tokens and fees as 20-byte and 3-byte segments", async function () {
      const { helper, usdc, sauce, whbar } = await deployFixture();
      const path = await helper.encodePath([usdc.target, whbar.target, sauce.target], [500, 3000]);
      const expected = ethers.solidityPacked(
        ["address", "uint24", "address", "uint24", "address"],
        [usdc.target, 500, whbar.target, 3000, sauce.target],
      );
      expect(path).to.equal(expected);
    });

    it("rejects a mismatched fee count", async function () {
      const { helper, usdc, sauce } = await deployFixture();
      await expect(helper.encodePath([usdc.target, sauce.target], [500, 3000])).to.be.revertedWithCustomError(
        helper,
        "InvalidPath",
      );
    });

    it("rejects a single token", async function () {
      const { helper, usdc } = await deployFixture();
      await expect(helper.encodePath([usdc.target], [])).to.be.revertedWithCustomError(helper, "InvalidPath");
    });
  });

  describe("swapExactHbarForTokens", function () {
    it("sends HBAR to the router and the output tokens to the caller", async function () {
      const { helper, user, whbar, usdc, deadline, encode } = await deployFixture();
      const path = await encode([whbar.target as string, usdc.target as string]);
      const value = ethers.parseEther("1");
      const before = await usdc.balanceOf(user.address);

      await expect(helper.swapExactHbarForTokens(path, 0, deadline, { value }))
        .to.emit(helper, "Swapped")
        .withArgs(user.address, ethers.ZeroAddress, usdc.target, value, value * RATE);

      expect((await usdc.balanceOf(user.address)) - before).to.equal(value * RATE);
    });

    it("reverts when the path does not start with WHBAR", async function () {
      const { helper, usdc, sauce, deadline, encode } = await deployFixture();
      const path = await encode([usdc.target as string, sauce.target as string]);
      await expect(helper.swapExactHbarForTokens(path, 0, deadline, { value: 1n })).to.be.revertedWithCustomError(
        helper,
        "PathMustStartWithWhbar",
      );
    });

    it("reverts when no HBAR is sent", async function () {
      const { helper, whbar, usdc, deadline, encode } = await deployFixture();
      const path = await encode([whbar.target as string, usdc.target as string]);
      await expect(helper.swapExactHbarForTokens(path, 0, deadline)).to.be.revertedWithCustomError(
        helper,
        "NoValueSent",
      );
    });

    it("reverts when the minimum output is not met", async function () {
      const { helper, whbar, usdc, deadline, encode } = await deployFixture();
      const path = await encode([whbar.target as string, usdc.target as string]);
      await expect(helper.swapExactHbarForTokens(path, 1000n, deadline, { value: 100n })).to.be.revertedWith(
        "Too little received",
      );
    });

    it("reverts after the deadline", async function () {
      const { helper, whbar, usdc, encode } = await deployFixture();
      const path = await encode([whbar.target as string, usdc.target as string]);
      const stale = (await time.latest()) - 1;
      await expect(helper.swapExactHbarForTokens(path, 0, stale, { value: 100n })).to.be.revertedWith(
        "Transaction too old",
      );
    });
  });

  describe("swapExactTokensForTokens", function () {
    it("pulls the input from the caller and pays the output to the caller", async function () {
      const { helper, user, usdc, sauce, deadline, encode } = await deployFixture();
      const path = await encode([usdc.target as string, sauce.target as string]);
      await usdc.approve(helper.target, AMOUNT_IN);

      await expect(helper.swapExactTokensForTokens(path, AMOUNT_IN, 0, deadline))
        .to.emit(helper, "Swapped")
        .withArgs(user.address, usdc.target, sauce.target, AMOUNT_IN, AMOUNT_IN * RATE);

      expect(await sauce.balanceOf(user.address)).to.equal(AMOUNT_IN * RATE);
      expect(await usdc.balanceOf(helper.target)).to.equal(0n);
    });

    it("reverts without an allowance", async function () {
      const { helper, usdc, sauce, deadline, encode } = await deployFixture();
      const path = await encode([usdc.target as string, sauce.target as string]);
      await expect(helper.swapExactTokensForTokens(path, AMOUNT_IN, 0, deadline)).to.be.reverted;
    });

    it("rejects a malformed path", async function () {
      const { helper, deadline } = await deployFixture();
      await expect(helper.swapExactTokensForTokens("0x1234", AMOUNT_IN, 0, deadline)).to.be.revertedWithCustomError(
        helper,
        "InvalidPath",
      );
    });
  });

  describe("swapExactTokensForHbar", function () {
    it("unwraps through the router and forwards the HBAR to the caller", async function () {
      const { helper, user, usdc, whbar, deadline, encode } = await deployFixture();
      const path = await encode([usdc.target as string, whbar.target as string]);
      await usdc.approve(helper.target, AMOUNT_IN);

      await expect(helper.swapExactTokensForHbar(path, AMOUNT_IN, 0, deadline))
        .to.emit(helper, "Swapped")
        .withArgs(user.address, usdc.target, ethers.ZeroAddress, AMOUNT_IN, AMOUNT_IN * RATE);

      expect(await ethers.provider.getBalance(helper.target)).to.equal(0n);
    });

    it("pays the caller the swapped HBAR", async function () {
      const { helper, user, usdc, whbar, deadline, encode } = await deployFixture();
      const path = await encode([usdc.target as string, whbar.target as string]);
      await usdc.approve(helper.target, AMOUNT_IN);

      const before = await ethers.provider.getBalance(user.address);
      const tx = await helper.swapExactTokensForHbar(path, AMOUNT_IN, 0, deadline);
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * receipt!.gasPrice;

      expect((await ethers.provider.getBalance(user.address)) - before + gasCost).to.equal(AMOUNT_IN * RATE);
    });

    it("reverts when the path does not end with WHBAR", async function () {
      const { helper, usdc, sauce, deadline, encode } = await deployFixture();
      const path = await encode([usdc.target as string, sauce.target as string]);
      await expect(helper.swapExactTokensForHbar(path, AMOUNT_IN, 0, deadline)).to.be.revertedWithCustomError(
        helper,
        "PathMustEndWithWhbar",
      );
    });
  });
});
