import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, authorizeRoles } from "../middleware/auth";
import { getSuiNetworkStatus } from "../lib/sui";

export const adminRouter = Router();

adminRouter.get(
  "/overview",
  authenticate,
  authorizeRoles("ORGANIZER", "ADMIN"),
  async (req, res, next) => {
    try {
      const isOrganizerOnly = req.user!.role === "ORGANIZER";
      const eventScope: any = isOrganizerOnly ? { organizerId: req.user!.id } : {};
      const ticketScope: any = isOrganizerOnly ? { event: { organizerId: req.user!.id } } : {};
      const txScope: any = isOrganizerOnly
        ? { ticket: { event: { organizerId: req.user!.id } } }
        : {};
      const alertScope: any = isOrganizerOnly
        ? { transaction: { ticket: { event: { organizerId: req.user!.id } } } }
        : {};

      const [
        users,
        events,
        tickets,
        resaleListings,
        transactions,
        fraudAlerts,
        verificationLogs,
        suiStatus,
      ] = await Promise.all([
        isOrganizerOnly
          ? Promise.resolve([])
          : prisma.user.findMany({
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                wallets: true,
                _count: {
                  select: { ownedTickets: true, organizedEvents: true },
                },
              },
              orderBy: { createdAt: "desc" },
            }),
        prisma.event.findMany({
          where: eventScope,
          include: {
            organizer: { select: { id: true, name: true, email: true } },
            _count: { select: { tickets: true, verificationLogs: true } },
          },
          orderBy: { startDate: "asc" },
        }),
        prisma.ticket.findMany({
          where: ticketScope,
          include: {
            event: { select: { id: true, name: true, venue: true, startDate: true } },
            currentOwner: { select: { id: true, name: true, email: true } },
          },
          orderBy: { mintedAt: "desc" },
        }),
        prisma.resaleListing.findMany({
          where: ticketScope ? { ticket: ticketScope } : {},
          include: {
            ticket: {
              include: {
                event: {
                  select: {
                    id: true,
                    name: true,
                    originalPrice: true,
                    resaleCap: true,
                  },
                },
              },
            },
            seller: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.transaction.findMany({
          where: txScope,
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            ticket: {
              include: {
                event: { select: { id: true, name: true } },
              },
            },
            buyer: { select: { id: true, name: true, email: true } },
            seller: { select: { id: true, name: true, email: true } },
          },
        }),
        prisma.fraudAlert.findMany({
          where: alertScope,
          orderBy: { createdAt: "desc" },
          take: 40,
          include: {
            transaction: {
              include: {
                ticket: { include: { event: { select: { id: true, name: true } } } },
                buyer: { select: { id: true, name: true, email: true } },
                seller: { select: { id: true, name: true, email: true } },
              },
            },
          },
        }),
        prisma.qRVerificationLog.findMany({
          where: isOrganizerOnly ? { event: { organizerId: req.user!.id } } : {},
          orderBy: { scannedAt: "desc" },
          take: 40,
          include: {
            event: { select: { id: true, name: true } },
            ticket: { select: { id: true, seatNumber: true, tierName: true, currentStatus: true } },
            verifier: { select: { id: true, name: true, email: true } },
          },
        }),
        getSuiNetworkStatus(),
      ]);

      // Check AI FastAPI service reachability
      let aiServiceOnline = false;
      try {
        const aiUrl = process.env.AI_SERVICE_URL || "http://127.0.0.1:8001";
        const aiRes = await fetch(`${aiUrl}/health`);
        aiServiceOnline = aiRes.ok;
      } catch {
        aiServiceOnline = false;
      }

      const roleCounts = {
        USER: users.filter((u: any) => u.role === "USER").length,
        ORGANIZER: users.filter((u: any) => u.role === "ORGANIZER").length,
        ADMIN: users.filter((u: any) => u.role === "ADMIN").length,
      };

      const totalCapacity = events.reduce((acc, ev) => acc + ev.totalTickets, 0);
      const totalRemaining = events.reduce((acc, ev) => acc + ev.ticketsAvailable, 0);
      const totalSold = totalCapacity - totalRemaining;
      const usedTicketsCount = tickets.filter((t) => t.currentStatus === "USED").length;
      const activeListingsCount = resaleListings.filter((r) => r.status === "ACTIVE").length;
      const suspiciousAlerts = fraudAlerts.filter((a) => a.predictedLabel === "SUSPICIOUS");

      res.json({
        metrics: {
          totalUsers: users.length,
          roleCounts,
          totalEvents: events.length,
          totalCapacity,
          totalTicketsRemaining: totalRemaining,
          totalTicketsSold: totalSold,
          totalTicketsIssued: tickets.length,
          ticketsUsed: usedTicketsCount,
          activeResaleListings: activeListingsCount,
          suspiciousAlertsCount: suspiciousAlerts.length,
        },
        systemStatus: {
          database: "Connected (PostgreSQL + Prisma)",
          aiService: aiServiceOnline
            ? "Online (FastAPI Random Forest Model)"
            : "Standby (Statistical Fallback Ready)",
          aiServiceOnline,
          executionMode: process.env.EXECUTION_MODE || "LOCAL_DEMO",
          blockchain: suiStatus,
        },
        users,
        events,
        tickets,
        resaleListings,
        recentTransactions: transactions,
        allAlerts: fraudAlerts,
        suspiciousAlerts,
        recentVerifications: verificationLogs,
      });
    } catch (err) {
      next(err);
    }
  }
);
