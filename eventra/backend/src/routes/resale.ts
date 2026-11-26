import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { verifySuiTransactionOnChain } from "../lib/sui";
import { analyzeTransactionWithAi } from "../lib/aiClient";

export const resaleRouter = Router();

const createListingSchema = z.object({
  ticketId: z.string().min(1),
  askingPrice: z.number().int().min(1),
});

const purchaseListingSchema = z.object({
  mode: z.enum(["LOCAL_DEMO", "SUI_TESTNET"]).optional(),
  suiTransactionDigest: z.string().optional(),
});

resaleRouter.get("/listings", async (req, res, next) => {
  try {
    const statusFilter =
      typeof req.query.status === "string" ? req.query.status.toUpperCase() : "ACTIVE";

    const whereClause: any = {};
    if (statusFilter !== "ALL") {
      whereClause.status = statusFilter;
    }

    const listings = await prisma.resaleListing.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        ticket: {
          include: {
            event: true,
          },
        },
        seller: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json({ listings });
  } catch (err) {
    next(err);
  }
});

resaleRouter.post("/listings", authenticate, async (req, res, next) => {
  try {
    const body = createListingSchema.parse(req.body);

    const ticket = await prisma.ticket.findUnique({
      where: { id: body.ticketId },
      include: { event: true },
    });

    if (!ticket) {
      throw new AppError("Ticket not found.", 404);
    }
    if (ticket.currentOwnerId !== req.user!.id) {
      throw new AppError("Only the current ticket owner can list this ticket for resale.", 403);
    }
    if (ticket.currentStatus === "USED") {
      throw new AppError("Used tickets cannot be listed for resale.", 400);
    }
    if (ticket.currentStatus === "LISTED_FOR_RESALE") {
      throw new AppError("This ticket is already listed for resale.", 400);
    }

    // Strict Anti-Scalping Price Cap Enforcement
    if (body.askingPrice > ticket.maximumResalePrice) {
      throw new AppError(
        `Anti-Scalping Cap Violation: Proposed price (${body.askingPrice} units) exceeds the smart-contract maximum permitted resale price of ${ticket.maximumResalePrice} units (Original price: ${ticket.originalPrice} units).`,
        400,
        "RESALE_PRICE_EXCEEDS_CAP"
      );
    }

    const listing = await prisma.$transaction(async (tx) => {
      await tx.ticket.update({
        where: { id: ticket.id },
        data: { currentStatus: "LISTED_FOR_RESALE" },
      });

      return tx.resaleListing.create({
        data: {
          ticketId: ticket.id,
          sellerId: req.user!.id,
          askingPrice: body.askingPrice,
          status: "ACTIVE",
        },
        include: {
          ticket: { include: { event: true } },
          seller: { select: { id: true, name: true, email: true } },
        },
      });
    });

    res.status(201).json({ listing });
  } catch (err) {
    next(err);
  }
});

resaleRouter.post("/listings/:id/purchase", authenticate, async (req, res, next) => {
  try {
    const body = purchaseListingSchema.parse(req.body || {});
    const activeMode = body.mode || (process.env.EXECUTION_MODE as any) || "LOCAL_DEMO";

    let verifiedDigest: string | null = null;
    if (activeMode === "SUI_TESTNET") {
      if (!body.suiTransactionDigest) {
        throw new AppError(
          "SUI_TESTNET mode requires a verified Sui transaction digest for secondary resale execution.",
          400,
          "SUI_DIGEST_REQUIRED"
        );
      }
      const verification = await verifySuiTransactionOnChain(body.suiTransactionDigest);
      if (!verification.verified) {
        throw new AppError(
          `On-chain Sui resale verification failed: ${verification.error}`,
          400,
          "SUI_ONCHAIN_VERIFICATION_FAILED"
        );
      }
      verifiedDigest = body.suiTransactionDigest;
    }

    const result = await prisma.$transaction(async (tx: any) => {
      const listing = await tx.resaleListing.findUnique({
        where: { id: String(req.params.id) },
        include: {
          ticket: { include: { event: true } },
          seller: { select: { id: true, name: true, email: true } },
        },
      });

      if (!listing) {
        throw new AppError("Resale listing not found.", 404);
      }
      if (listing.status !== "ACTIVE") {
        throw new AppError(`Listing is no longer active (current status: ${listing.status}).`, 400);
      }
      if (listing.sellerId === req.user!.id) {
        throw new AppError("You cannot purchase your own resale listing.", 400);
      }
      if (listing.ticket.currentStatus === "USED") {
        throw new AppError("Ticket has already been used and cannot be resold.", 400);
      }
      if (listing.askingPrice > listing.ticket.maximumResalePrice) {
        throw new AppError(
          `Resale price (${listing.askingPrice}) exceeds maximum cap (${listing.ticket.maximumResalePrice}).`,
          400,
          "RESALE_PRICE_EXCEEDS_CAP"
        );
      }

      const updatedListing = await tx.resaleListing.update({
        where: { id: listing.id },
        data: { status: "SOLD" },
      });

      const isSimulated = activeMode !== "SUI_TESTNET";
      const updatedTicket = await tx.ticket.update({
        where: { id: listing.ticketId },
        data: {
          currentOwnerId: req.user!.id,
          currentStatus: "ACTIVE",
          resaleCount: { increment: 1 },
          transferCount: { increment: 1 },
        },
        include: {
          event: true,
          currentOwner: { select: { id: true, name: true, email: true } },
        },
      });

      const txRecord = await tx.transaction.create({
        data: {
          ticketId: listing.ticketId,
          sellerId: listing.sellerId,
          buyerId: req.user!.id,
          transactionType: "RESALE_PURCHASE",
          amount: listing.askingPrice,
          blockchain: isSimulated ? "SIMULATED_LOCAL" : "SUI_TESTNET",
          transactionDigest: verifiedDigest,
          isSimulated,
          status: isSimulated ? "SIMULATED_LOCAL" : "CONFIRMED_ON_CHAIN",
        },
      });

      return { listing, updatedListing, updatedTicket, txRecord };
    });

    // Run AI suspicious activity evaluation on the resale transaction
    const timeSinceMintSec = Math.max(
      15,
      (Date.now() - new Date(result.updatedTicket.mintedAt).getTime()) / 1000
    );
    const sellerTicketsCount = await prisma.ticket.count({
      where: { currentOwnerId: result.listing.sellerId },
    });

    const aiPrediction = await analyzeTransactionWithAi({
      wallet_id: `seller:${result.listing.sellerId.slice(0, 8)}`,
      event_id: result.updatedTicket.eventId,
      event_category: result.updatedTicket.event.category,
      tickets_bought: Math.max(1, sellerTicketsCount + 1),
      transfers: result.updatedTicket.transferCount,
      resales: result.updatedTicket.resaleCount,
      time_diff: timeSinceMintSec,
      resale_price: result.listing.askingPrice,
      original_price: result.updatedTicket.originalPrice,
      transaction_frequency: result.updatedTicket.resaleCount + 1.5,
    });

    const priceRatio = Number(
      (result.listing.askingPrice / result.updatedTicket.originalPrice).toFixed(4)
    );

    const fraudAlert = await prisma.fraudAlert.create({
      data: {
        transactionId: result.txRecord.id,
        walletAddress: `seller:${result.listing.sellerId.slice(0, 8)}`,
        riskScore: aiPrediction.risk_score,
        predictedLabel: aiPrediction.predicted_label,
        reasons: aiPrediction.reasons,
        ticketsBoughtFeature: Math.max(1, sellerTicketsCount + 1),
        transfersFeature: result.updatedTicket.transferCount,
        resalesFeature: result.updatedTicket.resaleCount,
        timeDiffSeconds: timeSinceMintSec,
        priceRatio,
        txFrequencyPerHour: result.updatedTicket.resaleCount + 1.5,
        reviewStatus:
          aiPrediction.predicted_label === "SUSPICIOUS" ? "PENDING_REVIEW" : "ACKNOWLEDGED",
      },
    });

    res.json({
      executionMode: activeMode,
      isSimulated: activeMode !== "SUI_TESTNET",
      listing: result.updatedListing,
      ticket: result.updatedTicket,
      transaction: result.txRecord,
      aiAnalysis: {
        alertId: fraudAlert.id,
        predictedLabel: aiPrediction.predicted_label,
        riskScore: aiPrediction.risk_score,
        reasons: aiPrediction.reasons,
      },
    });
  } catch (err) {
    next(err);
  }
});

resaleRouter.delete("/listings/:id", authenticate, async (req, res, next) => {
  try {
    const listing = await prisma.resaleListing.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!listing) {
      throw new AppError("Listing not found.", 404);
    }
    if (listing.sellerId !== req.user!.id && req.user!.role !== "ADMIN") {
      throw new AppError("Only the seller or an admin can cancel this listing.", 403);
    }
    if (listing.status !== "ACTIVE") {
      throw new AppError("Only active listings can be cancelled.", 400);
    }

    await prisma.$transaction([
      prisma.resaleListing.update({
        where: { id: listing.id },
        data: { status: "CANCELLED" },
      }),
      prisma.ticket.update({
        where: { id: listing.ticketId },
        data: { currentStatus: "ACTIVE" },
      }),
    ]);

    res.json({ message: "Resale listing cancelled and ticket restored to ACTIVE status." });
  } catch (err) {
    next(err);
  }
});
