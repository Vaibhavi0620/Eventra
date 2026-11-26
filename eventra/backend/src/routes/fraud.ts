import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, authorizeRoles } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { analyzeTransactionWithAi } from "../lib/aiClient";

export const fraudRouter = Router();

const manualAnalyzeSchema = z.object({
  wallet_id: z.string().default("0xdemo_wallet"),
  event_id: z.string().default("EVT-SONIC-01"),
  event_category: z.string().default("ELECTRONIC"),
  tickets_bought: z.number().int().min(1).max(500),
  transfers: z.number().int().min(0).max(500),
  resales: z.number().int().min(0).max(500),
  time_diff: z.number().min(0),
  resale_price: z.number().positive(),
  original_price: z.number().positive(),
  transaction_frequency: z.number().min(0),
});

const reviewSchema = z.object({
  reviewStatus: z.enum(["PENDING_REVIEW", "ACKNOWLEDGED", "DISMISSED", "RESTRICTED"]),
  reviewerNotes: z.string().max(1000).optional(),
});

fraudRouter.post(
  "/analyze",
  authenticate,
  authorizeRoles("ORGANIZER", "ADMIN"),
  async (req, res, next) => {
    try {
      const body = manualAnalyzeSchema.parse(req.body);
      const result = await analyzeTransactionWithAi(body);
      res.json({ prediction: result });
    } catch (err) {
      next(err);
    }
  }
);

fraudRouter.get(
  "/alerts",
  authenticate,
  authorizeRoles("ORGANIZER", "ADMIN"),
  async (req, res, next) => {
    try {
      const eventId = typeof req.query.eventId === "string" ? req.query.eventId : undefined;
      const riskLevel = typeof req.query.riskLevel === "string" ? req.query.riskLevel : undefined;
      const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

      const whereClause: any = {};

      if (riskLevel === "SUSPICIOUS" || riskLevel === "NORMAL") {
        whereClause.predictedLabel = riskLevel;
      } else if (riskLevel === "HIGH") {
        whereClause.riskScore = { gte: 0.75 };
      } else if (riskLevel === "MEDIUM") {
        whereClause.riskScore = { gte: 0.4, lt: 0.75 };
      } else if (riskLevel === "LOW") {
        whereClause.riskScore = { lt: 0.4 };
      }

      // Scope to organizer's own events unless ADMIN
      const ticketFilter: any = {};
      if (req.user!.role === "ORGANIZER") {
        ticketFilter.event = { organizerId: req.user!.id };
      }
      if (eventId && eventId !== "ALL") {
        ticketFilter.eventId = eventId;
      }
      if (Object.keys(ticketFilter).length > 0) {
        whereClause.transaction = { ticket: ticketFilter };
      }

      if (search) {
        whereClause.OR = [
          { walletAddress: { contains: search, mode: "insensitive" } },
          { transactionId: { contains: search, mode: "insensitive" } },
        ];
      }

      const alerts = await prisma.fraudAlert.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        include: {
          transaction: {
            include: {
              ticket: {
                include: {
                  event: {
                    select: { id: true, name: true, category: true, organizerId: true },
                  },
                },
              },
              buyer: { select: { id: true, name: true, email: true } },
              seller: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      const baseScope =
        req.user!.role === "ORGANIZER"
          ? { transaction: { ticket: { event: { organizerId: req.user!.id } } } }
          : {};

      const totalAnalyzed = await prisma.fraudAlert.count({ where: baseScope });
      const flaggedCount = await prisma.fraudAlert.count({
        where: { ...baseScope, predictedLabel: "SUSPICIOUS" },
      });
      const normalCount = totalAnalyzed - flaggedCount;

      const lowRisk = await prisma.fraudAlert.count({
        where: { ...baseScope, riskScore: { lt: 0.35 } },
      });
      const mediumRisk = await prisma.fraudAlert.count({
        where: { ...baseScope, riskScore: { gte: 0.35, lt: 0.7 } },
      });
      const highRisk = await prisma.fraudAlert.count({
        where: { ...baseScope, riskScore: { gte: 0.7 } },
      });

      // Fetch model metrics from FastAPI service or local artifacts file
      let modelMetrics: any = null;
      try {
        const aiUrl = process.env.AI_SERVICE_URL || "http://127.0.0.1:8001";
        const mRes = await fetch(`${aiUrl}/metrics`);
        if (mRes.ok) {
          modelMetrics = await mRes.json();
        }
      } catch {
        try {
          const fs = await import("fs");
          const path = await import("path");
          const metricsFile = path.resolve(
            __dirname,
            "../../../ai-service/artifacts/evaluation_metrics.json"
          );
          if (fs.existsSync(metricsFile)) {
            modelMetrics = JSON.parse(fs.readFileSync(metricsFile, "utf-8"));
          }
        } catch {
          modelMetrics = null;
        }
      }

      res.json({
        summary: {
          totalAnalyzed,
          normalCount,
          flaggedCount,
          riskDistribution: [
            { range: "Low Risk (0.00 - 0.34)", count: lowRisk },
            { range: "Elevated Risk (0.35 - 0.69)", count: mediumRisk },
            { range: "High Risk (0.70 - 1.00)", count: highRisk },
          ],
        },
        modelMetrics,
        alerts,
      });
    } catch (err) {
      next(err);
    }
  }
);

fraudRouter.patch(
  "/alerts/:id/review",
  authenticate,
  authorizeRoles("ORGANIZER", "ADMIN"),
  async (req, res, next) => {
    try {
      const body = reviewSchema.parse(req.body);
      const existing = await prisma.fraudAlert.findUnique({
        where: { id: String(req.params.id) },
        include: {
          transaction: {
            include: {
              ticket: {
                include: { event: true },
              },
            },
          },
        },
      });
      if (!existing) {
        throw new AppError("Fraud alert not found.", 404);
      }

      if (
        req.user!.role === "ORGANIZER" &&
        existing.transaction?.ticket?.event?.organizerId !== req.user!.id
      ) {
        throw new AppError(
          "You are only authorized to review fraud alerts for events you manage.",
          403
        );
      }

      const updated = await prisma.fraudAlert.update({
        where: { id: existing.id },
        data: {
          reviewStatus: body.reviewStatus,
          reviewerNotes: body.reviewerNotes,
        },
      });

      res.json({ alert: updated });
    } catch (err) {
      next(err);
    }
  }
);
