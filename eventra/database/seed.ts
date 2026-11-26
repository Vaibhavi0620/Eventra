import "dotenv/config";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { prisma } from "../backend/src/lib/prisma";
import { signTicketQrReference } from "../backend/src/lib/qr";

export async function runDatabaseSeed() {
  console.log("Seeding EVENTRA PostgreSQL database...");

  await prisma.qRVerificationLog.deleteMany();
  await prisma.fraudAlert.deleteMany();
  await prisma.resaleListing.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.event.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.user.deleteMany();
  await prisma.benchmarkResult.deleteMany();

  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed development demo accounts when NODE_ENV=production.");
  }
  const demoPassword = process.env.DEMO_ACCOUNT_PASSWORD;
  if (!demoPassword || demoPassword.length < 8) {
    throw new Error(
      "DEMO_ACCOUNT_PASSWORD must be set (min 8 chars) in backend/.env before seeding. See backend/docs/DEMO_ACCOUNTS.md."
    );
  }
  const passwordHash = await bcrypt.hash(demoPassword, 10);

  const adminUser = await prisma.user.create({
    data: {
      name: "Dr. Kavita Rao",
      email: "admin@eventra.edu",
      passwordHash,
      role: "ADMIN",
      wallets: {
        create: {
          blockchain: "SUI_TESTNET",
          walletAddress: "0x00a11ce0000000000000000000000000000000000000000000000000000ad910",
        },
      },
    },
  });

  const organizerUser = await prisma.user.create({
    data: {
      name: "Vikramaditya Soundworks",
      email: "organizer@eventra.edu",
      passwordHash,
      role: "ORGANIZER",
      wallets: {
        create: {
          blockchain: "SUI_TESTNET",
          walletAddress: "0x00bb220000000000000000000000000000000000000000000000000000009a11",
        },
      },
    },
  });

  const fanUser1 = await prisma.user.create({
    data: {
      name: "Arjun Mehta",
      email: "arjun@eventra.edu",
      passwordHash,
      role: "USER",
      wallets: {
        create: {
          blockchain: "SUI_TESTNET",
          walletAddress: "0x00cc3300000000000000000000000000000000000000000000000000000f4a01",
        },
      },
    },
  });

  const fanUser2 = await prisma.user.create({
    data: {
      name: "Meera Nair",
      email: "meera@eventra.edu",
      passwordHash,
      role: "USER",
      wallets: {
        create: {
          blockchain: "SUI_TESTNET",
          walletAddress: "0x00dd4400000000000000000000000000000000000000000000000000000f4a02",
        },
      },
    },
  });

  const event1 = await prisma.event.create({
    data: {
      organizerId: organizerUser.id,
      name: "SONIC HORIZONS // Analog Modular Synthesis Night",
      description:
        "An intimate late-night live modular synthesizer and spatial-audio showcase featuring quadraphonic sound projection. Tickets are issued with a strict 20% maximum resale cap (1,000 units original -> 1,200 units cap) enforced by the EVENTRA smart contract.",
      category: "ELECTRONIC",
      venue: "Bikaner House Acoustic Pavilion, New Delhi",
      imageUrl: "/images/sonic-horizons.svg",
      startDate: new Date("2026-11-14T19:30:00.000Z"),
      endDate: new Date("2026-11-14T23:45:00.000Z"),
      totalTickets: 120,
      ticketsAvailable: 116,
      originalPrice: 1000,
      resaleCap: 1200,
      status: "UPCOMING",
    },
  });

  const event2 = await prisma.event.create({
    data: {
      organizerId: organizerUser.id,
      name: "MONSOON ECHOES // Indie & Post-Rock Amphitheatre Sessions",
      description:
        "Open-air twilight performances by four independent post-rock ensembles. Every admission pass uses cryptographic HMAC QR verification and one-time state mutation to eliminate duplicate PDF ticket fraud.",
      category: "INDIE_ROCK",
      venue: "Jayamahal Palace Courtyard, Bengaluru",
      imageUrl: "/images/monsoon-echoes.svg",
      startDate: new Date("2026-11-28T17:00:00.000Z"),
      endDate: new Date("2026-11-28T22:30:00.000Z"),
      totalTickets: 250,
      ticketsAvailable: 248,
      originalPrice: 1500,
      resaleCap: 1800,
      status: "UPCOMING",
    },
  });

  const event3 = await prisma.event.create({
    data: {
      organizerId: organizerUser.id,
      name: "NOCTURNE IN CHARCOAL // Contemporary String Quartet & Tape Loops",
      description:
        "Acoustic string quartet interwoven with reel-to-reel magnetic tape loops. Strictly capped secondary transfers ensure fair conservatory student access.",
      category: "CLASSICAL",
      venue: "NCPA Experimental Theatre, Mumbai",
      imageUrl: "/images/nocturne-strings.svg",
      startDate: new Date("2026-12-05T18:30:00.000Z"),
      endDate: new Date("2026-12-05T21:30:00.000Z"),
      totalTickets: 80,
      ticketsAvailable: 79,
      originalPrice: 1200,
      resaleCap: 1380,
      status: "UPCOMING",
    },
  });

  const event4 = await prisma.event.create({
    data: {
      organizerId: organizerUser.id,
      name: "SUBBASS ARCHITECTURE // Warehouse Drum & Bass Summit",
      description:
        "High-energy underground bass summit with hardware live sets. Monitored in real time by EVENTRA's Random Forest behavioural anomaly detector to flag automated bot accumulation.",
      category: "FESTIVAL",
      venue: "Mehboob Studio Stage 3, Mumbai",
      imageUrl: "/images/subbass-summit.svg",
      startDate: new Date("2026-12-19T20:00:00.000Z"),
      endDate: new Date("2026-12-20T02:00:00.000Z"),
      totalTickets: 300,
      ticketsAvailable: 299,
      originalPrice: 2000,
      resaleCap: 2400,
      status: "UPCOMING",
    },
  });

  const t1Id = "11111111-2222-4333-8444-555555550001";
  const ticket1 = await prisma.ticket.create({
    data: {
      id: t1Id,
      eventId: event1.id,
      currentOwnerId: fanUser1.id,
      blockchain: "SIMULATED_LOCAL",
      nftObjectId: null,
      seatNumber: "MOD-001",
      tierName: "Quadraphonic Floor",
      originalPrice: event1.originalPrice,
      maximumResalePrice: event1.resaleCap,
      currentStatus: "ACTIVE",
      transferCount: 0,
      resaleCount: 0,
      qrSignature: signTicketQrReference(t1Id, event1.id),
    },
  });

  const t2Id = "11111111-2222-4333-8444-555555550002";
  const ticket2 = await prisma.ticket.create({
    data: {
      id: t2Id,
      eventId: event1.id,
      currentOwnerId: fanUser1.id,
      blockchain: "SIMULATED_LOCAL",
      nftObjectId: null,
      seatNumber: "MOD-002",
      tierName: "Quadraphonic Floor",
      originalPrice: event1.originalPrice,
      maximumResalePrice: event1.resaleCap,
      currentStatus: "LISTED_FOR_RESALE",
      transferCount: 0,
      resaleCount: 0,
      qrSignature: signTicketQrReference(t2Id, event1.id),
    },
  });

  const t3Id = "11111111-2222-4333-8444-555555550003";
  const ticket3 = await prisma.ticket.create({
    data: {
      id: t3Id,
      eventId: event1.id,
      currentOwnerId: fanUser2.id,
      blockchain: "SIMULATED_LOCAL",
      nftObjectId: null,
      seatNumber: "MOD-003",
      tierName: "Quadraphonic Floor",
      originalPrice: event1.originalPrice,
      maximumResalePrice: event1.resaleCap,
      currentStatus: "USED",
      transferCount: 1,
      resaleCount: 1,
      usedAt: new Date(Date.now() - 1800 * 1000),
      qrSignature: signTicketQrReference(t3Id, event1.id),
    },
  });

  const t4Id = "11111111-2222-4333-8444-555555550004";
  const ticket4 = await prisma.ticket.create({
    data: {
      id: t4Id,
      eventId: event2.id,
      currentOwnerId: fanUser2.id,
      blockchain: "SIMULATED_LOCAL",
      nftObjectId: null,
      seatNumber: "AMP-001",
      tierName: "Courtyard Tier",
      originalPrice: event2.originalPrice,
      maximumResalePrice: event2.resaleCap,
      currentStatus: "LISTED_FOR_RESALE",
      transferCount: 3,
      resaleCount: 2,
      qrSignature: signTicketQrReference(t4Id, event2.id),
    },
  });

  await prisma.resaleListing.create({
    data: {
      ticketId: ticket2.id,
      sellerId: fanUser1.id,
      askingPrice: 1120,
      status: "ACTIVE",
    },
  });

  await prisma.resaleListing.create({
    data: {
      ticketId: ticket4.id,
      sellerId: fanUser2.id,
      askingPrice: 1750,
      status: "ACTIVE",
    },
  });

  const tx1 = await prisma.transaction.create({
    data: {
      ticketId: ticket1.id,
      sellerId: null,
      buyerId: fanUser1.id,
      transactionType: "PRIMARY_MINT",
      amount: 1000,
      blockchain: "SIMULATED_LOCAL",
      transactionDigest: null,
      isSimulated: true,
      status: "SIMULATED_LOCAL",
    },
  });

  const tx2 = await prisma.transaction.create({
    data: {
      ticketId: ticket3.id,
      sellerId: fanUser1.id,
      buyerId: fanUser2.id,
      transactionType: "RESALE_PURCHASE",
      amount: 1180,
      blockchain: "SIMULATED_LOCAL",
      transactionDigest: null,
      isSimulated: true,
      status: "SIMULATED_LOCAL",
    },
  });

  const tx3 = await prisma.transaction.create({
    data: {
      ticketId: ticket4.id,
      sellerId: fanUser1.id,
      buyerId: fanUser2.id,
      transactionType: "RESALE_PURCHASE",
      amount: 1790,
      blockchain: "SIMULATED_LOCAL",
      transactionDigest: null,
      isSimulated: true,
      status: "SIMULATED_LOCAL",
    },
  });

  await prisma.fraudAlert.create({
    data: {
      transactionId: tx1.id,
      walletAddress: "0x00cc3300000000000000000000000000000000000000000000000000000f4a01",
      riskScore: 0.084,
      predictedLabel: "NORMAL",
      reasons: ["Purchasing, timing, and pricing behavior within normal fan baseline"],
      ticketsBoughtFeature: 2,
      transfersFeature: 0,
      resalesFeature: 0,
      timeDiffSeconds: 3600,
      priceRatio: 1.0,
      txFrequencyPerHour: 1.0,
      reviewStatus: "ACKNOWLEDGED",
    },
  });

  await prisma.fraudAlert.create({
    data: {
      transactionId: tx2.id,
      walletAddress: "0x00cc3300000000000000000000000000000000000000000000000000000f4a01",
      riskScore: 0.291,
      predictedLabel: "NORMAL",
      reasons: ["Resale markup near or pushing price cap (1.18x original face value)"],
      ticketsBoughtFeature: 2,
      transfersFeature: 1,
      resalesFeature: 1,
      timeDiffSeconds: 1950,
      priceRatio: 1.18,
      txFrequencyPerHour: 1.5,
      reviewStatus: "ACKNOWLEDGED",
    },
  });

  await prisma.fraudAlert.create({
    data: {
      transactionId: tx3.id,
      walletAddress: "0x00dd4400000000000000000000000000000000000000000000000000000f4a02",
      riskScore: 0.892,
      predictedLabel: "SUSPICIOUS",
      reasons: [
        "Unusually high ticket accumulation (6 tickets acquired)",
        "Repeated secondary resale activity (3 resales recorded)",
        "Elevated peer-to-peer transfer velocity (4 transfers)",
        "Unusually short interval between acquisition and action (48s elapsed)",
        "High transaction frequency (8.5 tx/hour suggests automated script)",
      ],
      ticketsBoughtFeature: 6,
      transfersFeature: 4,
      resalesFeature: 3,
      timeDiffSeconds: 48,
      priceRatio: 1.1933,
      txFrequencyPerHour: 8.5,
      reviewStatus: "PENDING_REVIEW",
    },
  });

  await prisma.qRVerificationLog.create({
    data: {
      ticketId: ticket3.id,
      eventId: event1.id,
      verificationResult: "VALID_ADMITTED",
      verifierId: organizerUser.id,
      notes: "Seeded gate entry record (Simulated Local Mode)",
    },
  });

  const ethBenchFile = path.resolve(__dirname, "../blockchain/ethereum/benchmark_output.json");
  if (fs.existsSync(ethBenchFile)) {
    const raw = JSON.parse(fs.readFileSync(ethBenchFile, "utf-8"));
    if (Array.isArray(raw.measurements)) {
      for (const m of raw.measurements) {
        await prisma.benchmarkResult.create({
          data: {
            blockchain: m.blockchain,
            operationType: m.operationType,
            transactionCost: m.transactionCost,
            gasNumeric: m.gasNumeric,
            confirmationTimeMs: m.confirmationTimeMs,
            success: Boolean(m.success),
            network: m.network,
            transactionDigest: m.transactionDigest,
            notes: m.notes,
            measuredAt: m.measuredAt ? new Date(m.measuredAt) : new Date(),
          },
        });
      }
      console.log(`Imported ${raw.measurements.length} real Ethereum benchmark records.`);
    }
  }

  console.log("Database seed completed successfully.");
  await prisma.$disconnect();
}

if (require.main === module) {
  runDatabaseSeed().catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  });
}
