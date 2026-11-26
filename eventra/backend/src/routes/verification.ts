import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, authorizeRoles } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { verifyTicketQrPayload } from "../lib/qr";
import { verifySuiTransactionOnChain } from "../lib/sui";

export const verificationRouter = Router();

const scanSchema = z.object({
  qrPayload: z.string().min(1),
  eventId: z.string().optional(),
  markAsUsed: z.boolean().optional().default(true),
  mode: z.enum(["LOCAL_DEMO", "SUI_TESTNET"]).optional(),
  suiTransactionDigest: z.string().optional(),
});

/**
 * GET /api/verification/:ticketId
 * Read-only lookup of a ticket's authoritative state and verification history.
 */
verificationRouter.get(
  "/:ticketId",
  authenticate,
  authorizeRoles("ORGANIZER", "ADMIN"),
  async (req, res, next) => {
    try {
      const ticket = await prisma.ticket.findUnique({
        where: { id: String(req.params.ticketId) },
        include: {
          event: true,
          currentOwner: {
            select: { id: true, name: true, email: true },
          },
          verificationLogs: {
            orderBy: { scannedAt: "desc" },
            include: {
              verifier: { select: { id: true, name: true, email: true, role: true } },
            },
          },
        },
      });

      if (!ticket) {
        throw new AppError("Ticket not found.", 404);
      }

      if (req.user!.role === "ORGANIZER" && ticket.event.organizerId !== req.user!.id) {
        throw new AppError(
          "You are only authorized to inspect tickets for events you manage.",
          403
        );
      }

      res.json({
        ticket,
        isValidForEntry: ticket.currentStatus === "ACTIVE" && !ticket.usedAt,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/verification/scan
 * Executes atomic QR entry verification and one-time usage update.
 *
 * CONCURRENCY & ANTI-REPLAY PROTECTION:
 * Uses `updateMany` with `WHERE id = ticket.id AND currentStatus = 'ACTIVE' AND usedAt IS NULL`
 * inside a database transaction. If two gate scanners scan the exact same QR code at the same
 * millisecond, PostgreSQL row-level locking ensures `count === 1` for the first scanner and
 * `count === 0` for the second scanner, rejecting the duplicate scan deterministically.
 */
verificationRouter.post(
  "/scan",
  authenticate,
  authorizeRoles("ORGANIZER", "ADMIN"),
  async (req, res, next) => {
    try {
      const body = scanSchema.parse(req.body);
      const activeMode = body.mode || (process.env.EXECUTION_MODE as any) || "LOCAL_DEMO";

      const parsed = verifyTicketQrPayload(body.qrPayload);
      if (!parsed.validFormat || !parsed.ticketId) {
        throw new AppError("Malformed QR payload or invalid ticket reference.", 400);
      }

      const ticket = await prisma.ticket.findUnique({
        where: { id: parsed.ticketId },
        include: {
          event: true,
          currentOwner: { select: { id: true, name: true, email: true } },
        },
      });

      if (!ticket) {
        if (body.eventId) {
          await prisma.qRVerificationLog.create({
            data: {
              ticketId: null,
              eventId: body.eventId,
              verificationResult: "REJECTED_NOT_FOUND",
              verifierId: req.user!.id,
              notes: `Scanned unknown ticket reference: ${parsed.ticketId}`,
            },
          });
        }
        res.status(404).json({
          admitted: false,
          verificationResult: "REJECTED_NOT_FOUND",
          message: "Ticket reference does not exist in authoritative state.",
        });
        return;
      }

      if (req.user!.role === "ORGANIZER" && ticket.event.organizerId !== req.user!.id) {
        throw new AppError(
          "You are only authorized to verify tickets for events you manage.",
          403
        );
      }

      const targetEventId = body.eventId || parsed.eventId || ticket.eventId;

      // 1. Verify Event Association
      if (ticket.eventId !== targetEventId) {
        const log = await prisma.qRVerificationLog.create({
          data: {
            ticketId: ticket.id,
            eventId: targetEventId,
            verificationResult: "REJECTED_WRONG_EVENT",
            verifierId: req.user!.id,
            notes: `Ticket belongs to event ${ticket.event.name}, not target event ${targetEventId}`,
          },
        });
        res.status(400).json({
          admitted: false,
          verificationResult: "REJECTED_WRONG_EVENT",
          message: `Invalid event association: Ticket belongs to "${ticket.event.name}".`,
          ticket,
          log,
        });
        return;
      }

      // 2. Verify Cryptographic HMAC Signature if provided in JSON QR payload
      if (
        parsed.signaturePrefix &&
        !ticket.qrSignature.startsWith(parsed.signaturePrefix)
      ) {
        const log = await prisma.qRVerificationLog.create({
          data: {
            ticketId: ticket.id,
            eventId: ticket.eventId,
            verificationResult: "REJECTED_INVALID_SIGNATURE",
            verifierId: req.user!.id,
            notes: "Cryptographic QR HMAC signature mismatch.",
          },
        });
        res.status(400).json({
          admitted: false,
          verificationResult: "REJECTED_INVALID_SIGNATURE",
          message: "QR cryptographic signature verification failed (tampered payload).",
          ticket,
          log,
        });
        return;
      }

      // 3. Check if already used
      if (ticket.currentStatus === "USED" || ticket.usedAt !== null) {
        const log = await prisma.qRVerificationLog.create({
          data: {
            ticketId: ticket.id,
            eventId: ticket.eventId,
            verificationResult: "REJECTED_ALREADY_USED",
            verifierId: req.user!.id,
            notes: `Duplicate scan rejected. Ticket was already used at ${ticket.usedAt?.toISOString()}`,
          },
        });
        res.status(409).json({
          admitted: false,
          verificationResult: "REJECTED_ALREADY_USED",
          message: `REJECTED: Ticket was already used at ${
            ticket.usedAt ? new Date(ticket.usedAt).toLocaleString() : "an earlier scan"
          }. Duplicate entry prevented.`,
          ticket,
          log,
        });
        return;
      }

      // 4. If SUI_TESTNET mode is active, verify on-chain transaction before marking used
      if (activeMode === "SUI_TESTNET") {
        if (!body.suiTransactionDigest) {
          throw new AppError(
            "SUI_TESTNET mode requires a confirmed Sui transaction digest for `verify_and_mark_used`. Entry NOT granted.",
            400,
            "SUI_DIGEST_REQUIRED"
          );
        }
        const verification = await verifySuiTransactionOnChain(body.suiTransactionDigest);
        if (!verification.verified) {
          throw new AppError(
            `Blockchain confirmation failed: ${verification.error}. Entry NOT granted.`,
            400,
            "SUI_ONCHAIN_VERIFICATION_FAILED"
          );
        }
      }

      // 5. Atomic Compare-And-Swap state update to prevent concurrent race conditions
      const atomicAdmission = await prisma.$transaction(async (tx) => {
        const now = new Date();
        const updateRes = await tx.ticket.updateMany({
          where: {
            id: ticket.id,
            usedAt: null,
            currentStatus: { in: ["ACTIVE", "LISTED_FOR_RESALE"] },
          },
          data: {
            currentStatus: "USED",
            usedAt: now,
          },
        });

        if (updateRes.count === 0) {
          // Concurrent scan won the race millisecond earlier!
          const dupLog = await tx.qRVerificationLog.create({
            data: {
              ticketId: ticket.id,
              eventId: ticket.eventId,
              verificationResult: "REJECTED_ALREADY_USED",
              verifierId: req.user!.id,
              notes: "Concurrent duplicate scan blocked by atomic compare-and-swap lock.",
            },
          });
          return { admitted: false, log: dupLog, updatedTicket: ticket };
        }

        // Cancel any active resale listings on admission
        await tx.resaleListing.updateMany({
          where: { ticketId: ticket.id, status: "ACTIVE" },
          data: { status: "CANCELLED" },
        });

        const updatedTicket = await tx.ticket.findUnique({
          where: { id: ticket.id },
          include: {
            event: true,
            currentOwner: { select: { id: true, name: true, email: true } },
          },
        });

        const admitLog = await tx.qRVerificationLog.create({
          data: {
            ticketId: ticket.id,
            eventId: ticket.eventId,
            verificationResult: "VALID_ADMITTED",
            verifierId: req.user!.id,
            notes:
              activeMode === "SUI_TESTNET"
                ? `Verified on Sui Testnet (${body.suiTransactionDigest})`
                : "Verified & admitted via atomic state transition (Local Demo Mode)",
          },
        });

        return { admitted: true, log: admitLog, updatedTicket };
      });

      if (!atomicAdmission.admitted) {
        res.status(409).json({
          admitted: false,
          verificationResult: "REJECTED_ALREADY_USED",
          message: "Concurrent scan detected: Ticket has already been marked used.",
          ticket: atomicAdmission.updatedTicket,
          log: atomicAdmission.log,
        });
        return;
      }

      res.json({
        admitted: true,
        verificationResult: "VALID_ADMITTED",
        message: "Ticket verified and atomically marked as USED. Attendee admitted.",
        ticket: atomicAdmission.updatedTicket,
        log: atomicAdmission.log,
      });
    } catch (err) {
      next(err);
    }
  }
);
