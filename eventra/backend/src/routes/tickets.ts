import { Router } from "express";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { signTicketQrReference, buildOpaqueQrPayload } from "../lib/qr";
import { verifySuiTransactionOnChain } from "../lib/sui";
import { analyzeTransactionWithAi } from "../lib/aiClient";

export const ticketsRouter = Router();

const purchaseTicketSchema = z.object({
  eventId: z.string().min(1),
  quantity: z.number().int().min(1).max(10).default(1),
  tierName: z.string().optional().default("General Admission"),
  mode: z.enum(["LOCAL_DEMO", "SUI_TESTNET"]).optional(),
  suiTransactionDigest: z.string().optional(),
  nftObjectIds: z.array(z.string()).optional(),
});

const transferTicketSchema = z.object({
  recipientEmail: z.string().email(),
  mode: z.enum(["LOCAL_DEMO", "SUI_TESTNET"]).optional(),
  suiTransactionDigest: z.string().optional(),
});

ticketsRouter.post("/purchase", authenticate, async (req, res, next) => {
  try {
    const body = purchaseTicketSchema.parse(req.body);
    const activeMode = body.mode || (process.env.EXECUTION_MODE as any) || "LOCAL_DEMO";

    // NEVER silently fall back from a failed or missing real transaction to a fake success!
    let verifiedDigest: string | null = null;
    let verifiedObjectIds: string[] = [];

    if (activeMode === "SUI_TESTNET") {
      if (!body.suiTransactionDigest) {
        throw new AppError(
          "SUI_TESTNET mode selected, but no signed Sui transaction digest was provided. Connect a Sui Testnet wallet with deployed contract configuration or switch explicitly to LOCAL_DEMO mode.",
          400,
          "SUI_DIGEST_REQUIRED"
        );
      }

      const verification = await verifySuiTransactionOnChain(body.suiTransactionDigest);
      if (!verification.verified) {
        throw new AppError(
          `On-chain Sui Testnet verification failed: ${verification.error}. Transaction was NOT recorded as confirmed.`,
          400,
          "SUI_ONCHAIN_VERIFICATION_FAILED"
        );
      }
      verifiedDigest = body.suiTransactionDigest;
      if (body.nftObjectIds && body.nftObjectIds.length > 0) {
        verifiedObjectIds = body.nftObjectIds;
      } else if (verification.createdObjectId) {
        verifiedObjectIds = [verification.createdObjectId];
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { wallets: true },
    });
    if (!user) {
      throw new AppError("Authenticated user not found.", 404);
    }

    // Atomic database transaction to validate availability, decrement ticketsAvailable, mint Ticket rows, and record Transaction
    const result = await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({ where: { id: body.eventId } });
      if (!event) {
        throw new AppError("Event not found.", 404);
      }
      if (event.status === "CANCELLED" || event.status === "COMPLETED") {
        throw new AppError(`Cannot purchase tickets for a ${event.status} event.`, 400);
      }
      if (event.ticketsAvailable < body.quantity) {
        throw new AppError(
          `Insufficient ticket supply. Requested ${body.quantity}, but only ${event.ticketsAvailable} available.`,
          400,
          "INSUFFICIENT_TICKETS"
        );
      }

      const issuedSoFar = event.totalTickets - event.ticketsAvailable;
      await tx.event.update({
        where: { id: event.id },
        data: {
          ticketsAvailable: { decrement: body.quantity },
        },
      });

      const createdTickets = [];
      const createdTransactions = [];

      for (let i = 0; i < body.quantity; i++) {
        const ticketId = crypto.randomUUID();
        const seatNum = `${body.tierName.slice(0, 3).toUpperCase()}-${String(
          issuedSoFar + i + 1
        ).padStart(3, "0")}`;
        const qrSignature = signTicketQrReference(ticketId, event.id);

        const isSimulated = activeMode !== "SUI_TESTNET";
        const nftObjId = !isSimulated ? verifiedObjectIds[i] || null : null;

        const ticket = await tx.ticket.create({
          data: {
            id: ticketId,
            eventId: event.id,
            currentOwnerId: user.id,
            blockchain: isSimulated ? "SIMULATED_LOCAL" : "SUI_TESTNET",
            nftObjectId: nftObjId,
            seatNumber: seatNum,
            tierName: body.tierName,
            originalPrice: event.originalPrice,
            maximumResalePrice: event.resaleCap,
            currentStatus: "ACTIVE",
            qrSignature,
          },
          include: {
            event: true,
          },
        });

        const txRecord = await tx.transaction.create({
          data: {
            ticketId: ticket.id,
            sellerId: null,
            buyerId: user.id,
            transactionType: "PRIMARY_MINT",
            amount: event.originalPrice,
            blockchain: isSimulated ? "SIMULATED_LOCAL" : "SUI_TESTNET",
            transactionDigest:
              !isSimulated && verifiedDigest
                ? body.quantity === 1
                  ? verifiedDigest
                  : `${verifiedDigest}#${i}`
                : null,
            isSimulated,
            status: isSimulated ? "SIMULATED_LOCAL" : "CONFIRMED_ON_CHAIN",
          },
        });

        createdTickets.push({
          ...ticket,
          qrPayload: buildOpaqueQrPayload(ticket.id, event.id, qrSignature),
        });
        createdTransactions.push(txRecord);
      }

      return { event, createdTickets, createdTransactions };
    });

    // Real-time AI suspicious activity analysis on the purchase behavior
    const buyerTicketsCount = await prisma.ticket.count({
      where: { currentOwnerId: user.id, eventId: result.event.id },
    });
    const oneHourAgo = new Date(Date.now() - 3600 * 1000);
    const recentTxCount = await prisma.transaction.count({
      where: {
        OR: [{ buyerId: user.id }, { sellerId: user.id }],
        createdAt: { gte: oneHourAgo },
      },
    });

    const walletIdentifier =
      user.wallets[0]?.walletAddress || `user:${user.id.slice(0, 8)}`;

    const aiPrediction = await analyzeTransactionWithAi({
      wallet_id: walletIdentifier,
      event_id: result.event.id,
      event_category: result.event.category,
      tickets_bought: buyerTicketsCount,
      transfers: 0,
      resales: 0,
      time_diff: body.quantity >= 4 ? 45 : 1800,
      resale_price: result.event.originalPrice,
      original_price: result.event.originalPrice,
      transaction_frequency: Math.max(1, recentTxCount),
    });

    const primaryTx = result.createdTransactions[0];
    const fraudAlert = await prisma.fraudAlert.create({
      data: {
        transactionId: primaryTx.id,
        walletAddress: walletIdentifier,
        riskScore: aiPrediction.risk_score,
        predictedLabel: aiPrediction.predicted_label,
        reasons: aiPrediction.reasons,
        ticketsBoughtFeature: buyerTicketsCount,
        transfersFeature: 0,
        resalesFeature: 0,
        timeDiffSeconds: body.quantity >= 4 ? 45 : 1800,
        priceRatio: 1.0,
        txFrequencyPerHour: Math.max(1, recentTxCount),
        reviewStatus:
          aiPrediction.predicted_label === "SUSPICIOUS" ? "PENDING_REVIEW" : "ACKNOWLEDGED",
      },
    });

    res.status(201).json({
      executionMode: activeMode,
      isSimulated: activeMode !== "SUI_TESTNET",
      tickets: result.createdTickets,
      transactions: result.createdTransactions,
      aiAnalysis: {
        alertId: fraudAlert.id,
        predictedLabel: aiPrediction.predicted_label,
        riskScore: aiPrediction.risk_score,
        reasons: aiPrediction.reasons,
        advisoryNotice: aiPrediction.advisory_notice,
      },
    });
  } catch (err) {
    next(err);
  }
});

ticketsRouter.get("/my", authenticate, async (req, res, next) => {
  try {
    const statusFilter =
      typeof req.query.status === "string" ? req.query.status.toUpperCase() : "ALL";

    const whereClause: any = {
      currentOwnerId: req.user!.id,
    };
    if (
      statusFilter === "ACTIVE" ||
      statusFilter === "USED" ||
      statusFilter === "LISTED_FOR_RESALE"
    ) {
      whereClause.currentStatus = statusFilter;
    }

    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      orderBy: { mintedAt: "desc" },
      include: {
        event: true,
        currentOwner: {
          select: { id: true, name: true, email: true },
        },
        transactions: {
          orderBy: { createdAt: "desc" },
        },
        resaleListings: {
          where: { status: "ACTIVE" },
        },
      },
    });

    const enriched = tickets.map((t) => ({
      ...t,
      qrPayload: buildOpaqueQrPayload(t.id, t.eventId, t.qrSignature),
    }));

    res.json({ tickets: enriched });
  } catch (err) {
    next(err);
  }
});

ticketsRouter.get("/:id", authenticate, async (req, res, next) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: String(req.params.id) },
      include: {
        event: true,
        currentOwner: {
          select: { id: true, name: true, email: true },
        },
        transactions: {
          orderBy: { createdAt: "desc" },
        },
        resaleListings: {
          orderBy: { createdAt: "desc" },
        },
        verificationLogs: {
          orderBy: { scannedAt: "desc" },
        },
      },
    });

    if (!ticket) {
      throw new AppError("Ticket not found.", 404);
    }

    res.json({
      ticket: {
        ...ticket,
        qrPayload: buildOpaqueQrPayload(ticket.id, ticket.eventId, ticket.qrSignature),
      },
    });
  } catch (err) {
    next(err);
  }
});

ticketsRouter.post("/:id/transfer", authenticate, async (req, res, next) => {
  try {
    const body = transferTicketSchema.parse(req.body);
    const activeMode = body.mode || (process.env.EXECUTION_MODE as any) || "LOCAL_DEMO";

    let verifiedDigest: string | null = null;
    if (activeMode === "SUI_TESTNET") {
      if (!body.suiTransactionDigest) {
        throw new AppError(
          "SUI_TESTNET mode requires a real on-chain transaction digest for ticket transfer.",
          400,
          "SUI_DIGEST_REQUIRED"
        );
      }
      const verification = await verifySuiTransactionOnChain(body.suiTransactionDigest);
      if (!verification.verified) {
        throw new AppError(
          `On-chain Sui transfer verification failed: ${verification.error}`,
          400
        );
      }
      verifiedDigest = body.suiTransactionDigest;
    }

    const recipient = await prisma.user.findUnique({
      where: { email: body.recipientEmail.toLowerCase().trim() },
    });
    if (!recipient) {
      throw new AppError("Recipient user account not found by email.", 404);
    }
    if (recipient.id === req.user!.id) {
      throw new AppError("Cannot transfer a ticket to yourself.", 400);
    }

    const updatedResult = await prisma.$transaction(async (tx: any) => {
      const ticket = await tx.ticket.findUnique({
        where: { id: String(req.params.id) },
        include: { event: true },
      });
      if (!ticket) {
        throw new AppError("Ticket not found.", 404);
      }
      if (ticket.currentOwnerId !== req.user!.id) {
        throw new AppError("Unauthorized: Only the current ticket owner can transfer it.", 403);
      }
      if (ticket.currentStatus === "USED") {
        throw new AppError("Cannot transfer a ticket that has already been used.", 400);
      }

      // Cancel any active resale listings
      await tx.resaleListing.updateMany({
        where: { ticketId: ticket.id, status: "ACTIVE" },
        data: { status: "CANCELLED" },
      });

      const isSimulated = activeMode !== "SUI_TESTNET";
      const updatedTicket = await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          currentOwnerId: recipient.id,
          currentStatus: "ACTIVE",
          transferCount: { increment: 1 },
        },
        include: {
          event: true,
          currentOwner: { select: { id: true, name: true, email: true } },
        },
      });

      const txRecord = await tx.transaction.create({
        data: {
          ticketId: ticket.id,
          sellerId: req.user!.id,
          buyerId: recipient.id,
          transactionType: "P2P_TRANSFER",
          amount: 0,
          blockchain: isSimulated ? "SIMULATED_LOCAL" : "SUI_TESTNET",
          transactionDigest: verifiedDigest,
          isSimulated,
          status: isSimulated ? "SIMULATED_LOCAL" : "CONFIRMED_ON_CHAIN",
        },
      });

      return { updatedTicket, txRecord, event: ticket.event };
    });

    // Trigger AI behavioral check on the transfer
    const timeSinceMintSec = Math.max(
      10,
      (Date.now() - new Date(updatedResult.updatedTicket.mintedAt).getTime()) / 1000
    );
    const aiPrediction = await analyzeTransactionWithAi({
      wallet_id: `user:${req.user!.id.slice(0, 8)}`,
      event_id: updatedResult.event.id,
      event_category: updatedResult.event.category,
      tickets_bought: 1,
      transfers: updatedResult.updatedTicket.transferCount,
      resales: updatedResult.updatedTicket.resaleCount,
      time_diff: timeSinceMintSec,
      resale_price: updatedResult.updatedTicket.originalPrice,
      original_price: updatedResult.updatedTicket.originalPrice,
      transaction_frequency: updatedResult.updatedTicket.transferCount + 1,
    });

    await prisma.fraudAlert.create({
      data: {
        transactionId: updatedResult.txRecord.id,
        walletAddress: `user:${req.user!.id.slice(0, 8)}`,
        riskScore: aiPrediction.risk_score,
        predictedLabel: aiPrediction.predicted_label,
        reasons: aiPrediction.reasons,
        ticketsBoughtFeature: 1,
        transfersFeature: updatedResult.updatedTicket.transferCount,
        resalesFeature: updatedResult.updatedTicket.resaleCount,
        timeDiffSeconds: timeSinceMintSec,
        priceRatio: 1.0,
        txFrequencyPerHour: updatedResult.updatedTicket.transferCount + 1,
      },
    });

    res.json({
      ticket: updatedResult.updatedTicket,
      transaction: updatedResult.txRecord,
      aiAnalysis: aiPrediction,
    });
  } catch (err) {
    next(err);
  }
});
