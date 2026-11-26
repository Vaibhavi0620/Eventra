import { expect } from "chai";
import { ethers } from "hardhat";

describe("EventraTicket (Ethereum Anti-Scalping & QR Verification Suite)", function () {
  async function deployFixture() {
    const [organizer, buyer1, buyer2, attacker, otherOrganizer] = await ethers.getSigners();
    const EventraTicket = await ethers.getContractFactory("EventraTicket");
    const contract = await EventraTicket.deploy();
    await contract.waitForDeployment();

    // Create event: originalPrice = 1000 wei/units, maxResalePrice = 1200 wei/units, supply = 100
    await contract.connect(organizer).createEvent("EVENTRA Sonic Horizons", 1000n, 1200n, 100n);
    return { contract, organizer, buyer1, buyer2, attacker, otherOrganizer };
  }

  it("1 & 2. Mints ticket and records correct initial ownership and price cap", async function () {
    const { contract, organizer, buyer1 } = await deployFixture();
    await contract.connect(organizer).mintTicket(1n, buyer1.address, "VIP-01");

    const state = await contract.getTicketState(1n);
    expect(state.currentOwner).to.equal(buyer1.address);
    expect(state.originalPrice).to.equal(1000n);
    expect(state.maxResalePrice).to.equal(1200n);
    expect(state.isUsed).to.equal(false);
  });

  it("3. Allows valid peer-to-peer transfer by owner", async function () {
    const { contract, organizer, buyer1, buyer2 } = await deployFixture();
    await contract.connect(organizer).mintTicket(1n, buyer1.address, "GA-01");

    await contract.connect(buyer1).transferTicket(1n, buyer2.address);
    const state = await contract.getTicketState(1n);
    expect(state.currentOwner).to.equal(buyer2.address);
    expect(state.transferCount).to.equal(1n);
  });

  it("4. Rejects unauthorized transfer by non-owner", async function () {
    const { contract, organizer, buyer1, attacker } = await deployFixture();
    await contract.connect(organizer).mintTicket(1n, buyer1.address, "GA-02");

    await expect(
      contract.connect(attacker).transferTicket(1n, attacker.address)
    ).to.be.revertedWithCustomError(contract, "NotTicketOwner");
  });

  it("5. Allows resale below the cap (1,100 <= 1,200)", async function () {
    const { contract, organizer, buyer1, buyer2 } = await deployFixture();
    await contract.connect(organizer).mintTicket(1n, buyer1.address, "GA-03");

    await contract.connect(buyer1).listForResale(1n, 1100n);
    await contract.connect(buyer2).buyListedTicket(1n, { value: 1100n });

    const state = await contract.getTicketState(1n);
    expect(state.currentOwner).to.equal(buyer2.address);
    expect(state.resaleCount).to.equal(1n);
  });

  it("6. Allows resale exactly at the cap (1,200 <= 1,200)", async function () {
    const { contract, organizer, buyer1, buyer2 } = await deployFixture();
    await contract.connect(organizer).mintTicket(1n, buyer1.address, "GA-04");

    await contract.connect(buyer1).listForResale(1n, 1200n);
    await contract.connect(buyer2).buyListedTicket(1n, { value: 1200n });

    const state = await contract.getTicketState(1n);
    expect(state.currentOwner).to.equal(buyer2.address);
    expect(state.resaleCount).to.equal(1n);
  });

  it("7. Rejects resale above the cap (1,500 > 1,200)", async function () {
    const { contract, organizer, buyer1, buyer2 } = await deployFixture();
    await contract.connect(organizer).mintTicket(1n, buyer1.address, "GA-05");

    await expect(
      contract.connect(buyer1).listForResale(1n, 1500n)
    ).to.be.revertedWithCustomError(contract, "ResalePriceExceedsCap");

    await expect(
      contract.connect(buyer2).executeResale(1n, 1500n, buyer2.address, { value: 1500n })
    ).to.be.revertedWithCustomError(contract, "ResalePriceExceedsCap");
  });

  it("8. Rejects verification when ticket belongs to a different event", async function () {
    const { contract, organizer, buyer1 } = await deployFixture();
    // Create second event (#2) by same organizer
    await contract.connect(organizer).createEvent("Second Event", 500n, 600n, 50n);
    await contract.connect(organizer).mintTicket(1n, buyer1.address, "GA-06");

    await expect(
      contract.connect(organizer).verifyAndMarkUsed(1n, 2n)
    ).to.be.revertedWithCustomError(contract, "InvalidEventAssociation");
  });

  it("9 & 10. Marks ticket used on first valid entry and rejects repeated entry", async function () {
    const { contract, organizer, buyer1 } = await deployFixture();
    await contract.connect(organizer).mintTicket(1n, buyer1.address, "GA-07");

    await contract.connect(organizer).verifyAndMarkUsed(1n, 1n);
    const state = await contract.getTicketState(1n);
    expect(state.isUsed).to.equal(true);

    // Second entry attempt must fail
    await expect(
      contract.connect(organizer).verifyAndMarkUsed(1n, 1n)
    ).to.be.revertedWithCustomError(contract, "TicketAlreadyUsed");
  });

  it("11. Rejects entry verification from unauthorized account", async function () {
    const { contract, organizer, buyer1, attacker } = await deployFixture();
    await contract.connect(organizer).mintTicket(1n, buyer1.address, "GA-08");

    await expect(
      contract.connect(attacker).verifyAndMarkUsed(1n, 1n)
    ).to.be.revertedWithCustomError(contract, "UnauthorizedVerifier");
  });
});
