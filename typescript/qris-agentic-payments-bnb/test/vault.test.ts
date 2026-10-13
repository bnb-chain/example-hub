import { expect } from "chai";
import { ethers } from "hardhat";

describe("QrisPaymentVault", function () {
  let vault: any;
  let token: any;
  let owner: any;
  let payer: any;
  let merchant: any;
  let other: any;

  beforeEach(async function () {
    [owner, payer, merchant, other] = await ethers.getSigners();

    // Deploy MockBUSD — constructor takes initialSupply, mints to deployer
    const MockBUSD = await ethers.getContractFactory("MockBUSD");
    token = await MockBUSD.deploy(ethers.parseUnits("100000", 18));
    await token.waitForDeployment();

    // Transfer tokens from deployer to payer
    await token.transfer(payer.address, ethers.parseUnits("1000", 18));

    // Deploy Vault
    const Vault = await ethers.getContractFactory("QrisPaymentVault");
    vault = await Vault.deploy(await token.getAddress());
    await vault.waitForDeployment();
  });

  describe("settle()", function () {
    it("transfers tokens from payer to vault and credits merchant", async function () {
      const amount = ethers.parseUnits("10", 18);
      const qrisRef = "QRIS_WARUNG_DANU";

      // Payer approves vault
      await token.connect(payer).approve(await vault.getAddress(), amount);

      // Settle
      const tx = await vault
        .connect(payer)
        .settle(merchant.address, amount, qrisRef);

      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (l: any) => l.fragment?.name === "PaymentSettled"
      );

      expect(event).to.not.be.undefined;
      expect(event.args.payer).to.equal(payer.address);
      expect(event.args.merchant).to.equal(merchant.address);
      expect(event.args.amount).to.equal(amount);
      expect(event.args.qrisRef).to.equal(qrisRef);

      // Merchant balance credited
      expect(await vault.merchantBalance(merchant.address)).to.equal(amount);

      // Vault holds the tokens
      expect(await token.balanceOf(await vault.getAddress())).to.equal(amount);
    });

    it("rejects zero merchant address", async function () {
      const amount = ethers.parseUnits("10", 18);
      await token.connect(payer).approve(await vault.getAddress(), amount);
      await expect(
        vault.connect(payer).settle(ethers.ZeroAddress, amount, "ref")
      ).to.be.revertedWith("Invalid merchant");
    });

    it("rejects zero amount", async function () {
      await expect(
        vault.connect(payer).settle(merchant.address, 0, "ref")
      ).to.be.revertedWith("Amount must be > 0");
    });

    it("requires token approval", async function () {
      const amount = ethers.parseUnits("10", 18);
      await expect(vault.connect(payer).settle(merchant.address, amount, "ref"))
        .to.be.reverted;
    });

    it("accumulates multiple payments to same merchant", async function () {
      const amt1 = ethers.parseUnits("5", 18);
      const amt2 = ethers.parseUnits("3", 18);

      await token.connect(payer).approve(await vault.getAddress(), amt1 + amt2);

      await vault.connect(payer).settle(merchant.address, amt1, "ref1");
      await vault.connect(payer).settle(merchant.address, amt2, "ref2");

      expect(await vault.merchantBalance(merchant.address)).to.equal(
        amt1 + amt2
      );
      expect(await vault.totalSettled()).to.equal(amt1 + amt2);
      expect(await vault.receiptCount()).to.equal(2);
    });

    it("generates unique receipt IDs across payments", async function () {
      const amount = ethers.parseUnits("1", 18);
      await token.connect(payer).approve(await vault.getAddress(), amount * 3n);

      const tx1 = await vault
        .connect(payer)
        .settle(merchant.address, amount, "ref1");
      const r1 = await tx1.wait();
      const event1 = r1.logs.find(
        (l: any) => l.fragment?.name === "PaymentSettled"
      );
      const id1 = event1.args.receiptId;

      // Advance block to ensure different block.number
      await ethers.provider.send("evm_mine", []);

      const tx2 = await vault
        .connect(payer)
        .settle(merchant.address, amount, "ref2");
      const r2 = await tx2.wait();
      const event2 = r2.logs.find(
        (l: any) => l.fragment?.name === "PaymentSettled"
      );
      const id2 = event2.args.receiptId;

      expect(id1).to.not.equal(id2);
    });
  });

  describe("withdraw()", function () {
    it("lets merchant withdraw their balance", async function () {
      const amount = ethers.parseUnits("10", 18);
      await token.connect(payer).approve(await vault.getAddress(), amount);
      await vault.connect(payer).settle(merchant.address, amount, "ref");

      // Withdraw
      await expect(vault.connect(merchant).withdraw())
        .to.emit(vault, "Withdrawal")
        .withArgs(merchant.address, amount);

      expect(await vault.merchantBalance(merchant.address)).to.equal(0);
      expect(await token.balanceOf(merchant.address)).to.equal(amount);
    });

    it("rejects withdrawal with zero balance", async function () {
      await expect(vault.connect(other).withdraw()).to.be.revertedWith(
        "No balance to withdraw"
      );
    });
  });

  describe("balanceOf()", function () {
    it("returns the correct balance for a merchant", async function () {
      const amount = ethers.parseUnits("42", 18);
      await token.connect(payer).approve(await vault.getAddress(), amount);
      await vault.connect(payer).settle(merchant.address, amount, "ref");

      expect(await vault.balanceOf(merchant.address)).to.equal(amount);
    });

    it("returns zero for unknown merchants", async function () {
      expect(await vault.balanceOf(other.address)).to.equal(0);
    });
  });
});
