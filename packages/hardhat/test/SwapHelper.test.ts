import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("SwapHelper", function () {
  const RATE = 2n;
  const POOL_FEE = 3000;
  const AMOUNT_IN = 1_000_000n;
  const ROUTER_HBAR_RESERVE = ethers.parseEther("10");

  async function deployFixture() {
    const [user, other, owner] = await ethers.getSigners();

    const router = await (
      await ethers.getContractFactory("MockSwapRouter")
    ).deploy(RATE, { value: ROUTER_HBAR_RESERVE });
    const Token = await ethers.getContractFactory("MockToken");
    const whbar = await Token.deploy("Wrapped HBAR", "WHBAR");
    const usdc = await Token.deploy("USD Coin", "USDC");
    const sauce = await Token.deploy("SaucerSwap", "SAUCE");

    const helper = await (
      await ethers.getContractFactory("SwapHelper")
    ).deploy(router.target, whbar.target, owner.address);

    await usdc.mint(user.address, AMOUNT_IN * 10n);
    const deadline = (await time.latest()) + 600;
    const encode = (tokens: string[]) => helper.encodePath(tokens, Array(tokens.length - 1).fill(POOL_FEE));

    return { user, other, owner, router, whbar, usdc, sauce, helper, deadline, encode };
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
    it("sends HBAR to the router and the output tokens to the recipient", async function () {
      const { helper, user, whbar, usdc, deadline, encode } = await deployFixture();
      const path = await encode([whbar.target as string, usdc.target as string]);
      const value = ethers.parseEther("1");
      const before = await usdc.balanceOf(user.address);

      await expect(helper.swapExactHbarForTokens(path, user.address, 0, deadline, { value }))
        .to.emit(helper, "Swapped")
        .withArgs(user.address, user.address, ethers.ZeroAddress, usdc.target, value, value * RATE, 0);

      expect((await usdc.balanceOf(user.address)) - before).to.equal(value * RATE);
    });

    it("pays a recipient other than the caller", async function () {
      const { helper, other, whbar, usdc, deadline, encode } = await deployFixture();
      const path = await encode([whbar.target as string, usdc.target as string]);

      await helper.swapExactHbarForTokens(path, other.address, 0, deadline, { value: 500n });

      expect(await usdc.balanceOf(other.address)).to.equal(500n * RATE);
    });

    it("reverts when the path does not start with WHBAR", async function () {
      const { helper, user, usdc, sauce, deadline, encode } = await deployFixture();
      const path = await encode([usdc.target as string, sauce.target as string]);
      await expect(
        helper.swapExactHbarForTokens(path, user.address, 0, deadline, { value: 1n }),
      ).to.be.revertedWithCustomError(helper, "PathMustStartWithWhbar");
    });

    it("reverts when no HBAR is sent", async function () {
      const { helper, user, whbar, usdc, deadline, encode } = await deployFixture();
      const path = await encode([whbar.target as string, usdc.target as string]);
      await expect(helper.swapExactHbarForTokens(path, user.address, 0, deadline)).to.be.revertedWithCustomError(
        helper,
        "NoValueSent",
      );
    });

    it("reverts for the zero address recipient", async function () {
      const { helper, whbar, usdc, deadline, encode } = await deployFixture();
      const path = await encode([whbar.target as string, usdc.target as string]);
      await expect(
        helper.swapExactHbarForTokens(path, ethers.ZeroAddress, 0, deadline, { value: 1n }),
      ).to.be.revertedWithCustomError(helper, "ZeroRecipient");
    });

    it("reverts when the minimum output is not met", async function () {
      const { helper, user, whbar, usdc, deadline, encode } = await deployFixture();
      const path = await encode([whbar.target as string, usdc.target as string]);
      await expect(
        helper.swapExactHbarForTokens(path, user.address, 1000n, deadline, { value: 100n }),
      ).to.be.revertedWith("Too little received");
    });

    it("reverts after the deadline", async function () {
      const { helper, user, whbar, usdc, encode } = await deployFixture();
      const path = await encode([whbar.target as string, usdc.target as string]);
      const stale = (await time.latest()) - 1;
      await expect(helper.swapExactHbarForTokens(path, user.address, 0, stale, { value: 100n })).to.be.revertedWith(
        "Transaction too old",
      );
    });
  });

  describe("swapExactTokensForTokens", function () {
    it("pulls the input from the caller and pays the output to the recipient", async function () {
      const { helper, user, usdc, sauce, deadline, encode } = await deployFixture();
      const path = await encode([usdc.target as string, sauce.target as string]);
      await usdc.approve(helper.target, AMOUNT_IN);

      await expect(helper.swapExactTokensForTokens(path, user.address, AMOUNT_IN, 0, deadline))
        .to.emit(helper, "Swapped")
        .withArgs(user.address, user.address, usdc.target, sauce.target, AMOUNT_IN, AMOUNT_IN * RATE, 0);

      expect(await sauce.balanceOf(user.address)).to.equal(AMOUNT_IN * RATE);
      expect(await usdc.balanceOf(helper.target)).to.equal(0n);
    });

    it("pays a recipient other than the caller", async function () {
      const { helper, other, usdc, sauce, deadline, encode } = await deployFixture();
      const path = await encode([usdc.target as string, sauce.target as string]);
      await usdc.approve(helper.target, AMOUNT_IN);

      await helper.swapExactTokensForTokens(path, other.address, AMOUNT_IN, 0, deadline);

      expect(await sauce.balanceOf(other.address)).to.equal(AMOUNT_IN * RATE);
    });

    it("reverts without an allowance", async function () {
      const { helper, user, usdc, sauce, deadline, encode } = await deployFixture();
      const path = await encode([usdc.target as string, sauce.target as string]);
      await expect(helper.swapExactTokensForTokens(path, user.address, AMOUNT_IN, 0, deadline)).to.be.reverted;
    });

    it("rejects a malformed path", async function () {
      const { helper, user, deadline } = await deployFixture();
      await expect(
        helper.swapExactTokensForTokens("0x1234", user.address, AMOUNT_IN, 0, deadline),
      ).to.be.revertedWithCustomError(helper, "InvalidPath");
    });
  });

  describe("swapExactTokensForHbar", function () {
    it("unwraps through the router and forwards the HBAR to the recipient", async function () {
      const { helper, user, usdc, whbar, deadline, encode } = await deployFixture();
      const path = await encode([usdc.target as string, whbar.target as string]);
      await usdc.approve(helper.target, AMOUNT_IN);

      await expect(helper.swapExactTokensForHbar(path, user.address, AMOUNT_IN, 0, deadline))
        .to.emit(helper, "Swapped")
        .withArgs(user.address, user.address, usdc.target, ethers.ZeroAddress, AMOUNT_IN, AMOUNT_IN * RATE, 0);

      expect(await ethers.provider.getBalance(helper.target)).to.equal(0n);
    });

    it("pays the recipient the swapped HBAR", async function () {
      const { helper, other, usdc, whbar, deadline, encode } = await deployFixture();
      const path = await encode([usdc.target as string, whbar.target as string]);
      await usdc.approve(helper.target, AMOUNT_IN);

      const before = await ethers.provider.getBalance(other.address);
      await helper.swapExactTokensForHbar(path, other.address, AMOUNT_IN, 0, deadline);

      expect((await ethers.provider.getBalance(other.address)) - before).to.equal(AMOUNT_IN * RATE);
    });

    it("reverts when the path does not end with WHBAR", async function () {
      const { helper, user, usdc, sauce, deadline, encode } = await deployFixture();
      const path = await encode([usdc.target as string, sauce.target as string]);
      await expect(
        helper.swapExactTokensForHbar(path, user.address, AMOUNT_IN, 0, deadline),
      ).to.be.revertedWithCustomError(helper, "PathMustEndWithWhbar");
    });
  });

  describe("integrator fee", function () {
    const FEE_BPS = 100n; // 1%
    const fee = (amount: bigint) => (amount * FEE_BPS) / 10_000n;

    it("defaults to zero", async function () {
      const { helper } = await deployFixture();
      expect(await helper.feeBps()).to.equal(0);
    });

    it("lets only the owner set the fee", async function () {
      const { helper, user, owner } = await deployFixture();
      await expect(helper.connect(user).setFee(50)).to.be.revertedWithCustomError(helper, "OwnableUnauthorizedAccount");
      await expect(helper.connect(owner).setFee(50)).to.emit(helper, "FeeUpdated").withArgs(50);
      expect(await helper.feeBps()).to.equal(50);
    });

    it("caps the fee at 1%", async function () {
      const { helper, owner } = await deployFixture();
      await helper.connect(owner).setFee(100);
      await expect(helper.connect(owner).setFee(101)).to.be.revertedWithCustomError(helper, "FeeTooHigh");
    });

    it("keeps the fee from a token swap and swaps the rest", async function () {
      const { helper, user, owner, usdc, sauce, deadline, encode } = await deployFixture();
      await helper.connect(owner).setFee(FEE_BPS);
      const path = await encode([usdc.target as string, sauce.target as string]);
      await usdc.approve(helper.target, AMOUNT_IN);

      const net = AMOUNT_IN - fee(AMOUNT_IN);
      await expect(helper.swapExactTokensForTokens(path, user.address, AMOUNT_IN, 0, deadline))
        .to.emit(helper, "Swapped")
        .withArgs(user.address, user.address, usdc.target, sauce.target, AMOUNT_IN, net * RATE, fee(AMOUNT_IN));

      expect(await sauce.balanceOf(user.address)).to.equal(net * RATE);
      expect(await usdc.balanceOf(helper.target)).to.equal(fee(AMOUNT_IN));
    });

    it("keeps the fee from an HBAR swap and swaps the rest", async function () {
      const { helper, user, owner, whbar, usdc, deadline, encode } = await deployFixture();
      await helper.connect(owner).setFee(FEE_BPS);
      const path = await encode([whbar.target as string, usdc.target as string]);
      const value = ethers.parseEther("1");

      await helper.swapExactHbarForTokens(path, user.address, 0, deadline, { value });

      expect(await usdc.balanceOf(user.address)).to.equal((value - fee(value)) * RATE + AMOUNT_IN * 10n);
      expect(await ethers.provider.getBalance(helper.target)).to.equal(fee(value));
    });

    it("keeps the token fee when swapping to HBAR", async function () {
      const { helper, user, owner, usdc, whbar, deadline, encode } = await deployFixture();
      await helper.connect(owner).setFee(FEE_BPS);
      const path = await encode([usdc.target as string, whbar.target as string]);
      await usdc.approve(helper.target, AMOUNT_IN);

      const net = AMOUNT_IN - fee(AMOUNT_IN);
      await expect(helper.swapExactTokensForHbar(path, user.address, AMOUNT_IN, 0, deadline))
        .to.emit(helper, "Swapped")
        .withArgs(user.address, user.address, usdc.target, ethers.ZeroAddress, AMOUNT_IN, net * RATE, fee(AMOUNT_IN));

      expect(await usdc.balanceOf(helper.target)).to.equal(fee(AMOUNT_IN));
      expect(await ethers.provider.getBalance(helper.target)).to.equal(0n);
    });

    it("lets the owner withdraw accrued token fees", async function () {
      const { helper, user, owner, other, usdc, sauce, deadline, encode } = await deployFixture();
      await helper.connect(owner).setFee(FEE_BPS);
      const path = await encode([usdc.target as string, sauce.target as string]);
      await usdc.approve(helper.target, AMOUNT_IN);
      await helper.swapExactTokensForTokens(path, user.address, AMOUNT_IN, 0, deadline);

      await expect(helper.connect(user).withdrawTokenFees(usdc.target, user.address, 1)).to.be.revertedWithCustomError(
        helper,
        "OwnableUnauthorizedAccount",
      );
      await expect(helper.connect(owner).withdrawTokenFees(usdc.target, other.address, fee(AMOUNT_IN)))
        .to.emit(helper, "FeesWithdrawn")
        .withArgs(usdc.target, other.address, fee(AMOUNT_IN));

      expect(await usdc.balanceOf(other.address)).to.equal(fee(AMOUNT_IN));
      expect(await usdc.balanceOf(helper.target)).to.equal(0n);
    });

    it("lets the owner withdraw accrued HBAR fees", async function () {
      const { helper, user, owner, other, whbar, usdc, deadline, encode } = await deployFixture();
      await helper.connect(owner).setFee(FEE_BPS);
      const path = await encode([whbar.target as string, usdc.target as string]);
      const value = ethers.parseEther("1");
      await helper.swapExactHbarForTokens(path, user.address, 0, deadline, { value });

      const before = await ethers.provider.getBalance(other.address);
      await helper.connect(owner).withdrawHbarFees(other.address, fee(value));

      expect((await ethers.provider.getBalance(other.address)) - before).to.equal(fee(value));
      await expect(helper.connect(user).withdrawHbarFees(user.address, 1)).to.be.revertedWithCustomError(
        helper,
        "OwnableUnauthorizedAccount",
      );
    });

    it("rejects withdrawals to the zero address", async function () {
      const { helper, owner, usdc } = await deployFixture();
      await expect(
        helper.connect(owner).withdrawTokenFees(usdc.target, ethers.ZeroAddress, 1),
      ).to.be.revertedWithCustomError(helper, "ZeroRecipient");
      await expect(helper.connect(owner).withdrawHbarFees(ethers.ZeroAddress, 1)).to.be.revertedWithCustomError(
        helper,
        "ZeroRecipient",
      );
    });
  });
});
