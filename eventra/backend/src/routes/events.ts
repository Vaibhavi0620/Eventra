import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, authorizeRoles } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import express from "express";
import { saveEventImage, deleteUploadedImage, MAX_IMAGE_BYTES } from "../lib/imageUpload";

export const eventsRouter = Router();

const createEventSchema = z
  .object({
    name: z.string().min(3).max(150),
    description: z.string().min(10).max(2000),
    category: z.string().min(2).max(50),
    venue: z.string().min(3).max(200),
    imageUrl: z.string().optional(),
    startDate: z.string(),
    endDate: z.string(),
    totalTickets: z.number().int().min(1).max(100000),
    originalPrice: z.number().int().min(1),
    resaleCap: z.number().int().min(1),
    onChainEventId: z.string().optional(),
  })
  .refine((data) => data.resaleCap >= data.originalPrice, {
    message: "Resale cap must be greater than or equal to original ticket price.",
    path: ["resaleCap"],
  });

const updateEventSchema = z.object({
  name: z.string().min(3).max(150).optional(),
  description: z.string().min(10).max(2000).optional(),
  category: z.string().min(2).max(50).optional(),
  venue: z.string().min(3).max(200).optional(),
  originalPrice: z.number().int().min(1).optional(),
  resaleCap: z.number().int().min(1).optional(),
  totalTickets: z.number().int().min(1).optional(),
  status: z.enum(["UPCOMING", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
  // Only our own uploads, bundled images or an https URL are accepted.
  imageUrl: z
    .string()
    .max(500)
    .refine((v) => /^(\/uploads\/events\/[\w.-]+|\/images\/[\w./-]+|https:\/\/[^\s]+)$/.test(v), {
      message: "imageUrl must be an uploaded photo, a bundled image or an https URL.",
    })
    .optional(),
});

eventsRouter.get("/", async (req, res, next) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const category = typeof req.query.category === "string" ? req.query.category.trim() : "";
    const sortBy = typeof req.query.sortBy === "string" ? req.query.sortBy : "date_asc";

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { venue: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }
    if (category && category !== "ALL") {
      whereClause.category = { equals: category, mode: "insensitive" };
    }

    let orderBy: any = { startDate: "asc" };
    if (sortBy === "price_asc") orderBy = { originalPrice: "asc" };
    else if (sortBy === "price_desc") orderBy = { originalPrice: "desc" };
    else if (sortBy === "availability") orderBy = { ticketsAvailable: "desc" };

    const events = await prisma.event.findMany({
      where: whereClause,
      orderBy,
      include: {
        organizer: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { tickets: true, verificationLogs: true },
        },
      },
    });

    res.json({ events });
  } catch (err) {
    next(err);
  }
});

eventsRouter.get("/:id", async (req, res, next) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: {
        organizer: {
          select: { id: true, name: true, email: true },
        },
        tickets: {
          select: {
            id: true,
            currentStatus: true,
            seatNumber: true,
            tierName: true,
            originalPrice: true,
            maximumResalePrice: true,
            blockchain: true,
            nftObjectId: true,
          },
          take: 50,
        },
        _count: {
          select: { tickets: true, verificationLogs: true },
        },
      },
    });

    if (!event) {
      throw new AppError("Event not found.", 404);
    }

    res.json({
      event,
      networkInfo: {
        executionMode: process.env.EXECUTION_MODE || "LOCAL_DEMO",
        suiNetwork: process.env.SUI_NETWORK || "testnet",
        suiPackageId:
          process.env.SUI_PACKAGE_ID ||
          "0x0000000000000000000000000000000000000000000000000000000000000000",
      },
    });
  } catch (err) {
    next(err);
  }
});

eventsRouter.post(
  "/",
  authenticate,
  authorizeRoles("ORGANIZER", "ADMIN"),
  async (req, res, next) => {
    try {
      const body = createEventSchema.parse(req.body);

      const event = await prisma.event.create({
        data: {
          organizerId: req.user!.id,
          name: body.name.trim(),
          description: body.description.trim(),
          category: body.category.toUpperCase().trim(),
          venue: body.venue.trim(),
          imageUrl: body.imageUrl || "/images/default-event.svg",
          startDate: new Date(body.startDate),
          endDate: new Date(body.endDate),
          totalTickets: body.totalTickets,
          ticketsAvailable: body.totalTickets,
          originalPrice: body.originalPrice,
          resaleCap: body.resaleCap,
          onChainEventId: body.onChainEventId || null,
          status: "UPCOMING",
        },
      });

      res.status(201).json({ event });
    } catch (err) {
      next(err);
    }
  }
);

eventsRouter.patch(
  "/:id",
  authenticate,
  authorizeRoles("ORGANIZER", "ADMIN"),
  async (req, res, next) => {
    try {
      const body = updateEventSchema.parse(req.body);
      const existing = await prisma.event.findUnique({ where: { id: String(req.params.id) } });
      if (!existing) {
        throw new AppError("Event not found.", 404);
      }

      if (req.user!.role !== "ADMIN" && existing.organizerId !== req.user!.id) {
        throw new AppError("Only the event organizer or an admin can modify this event.", 403);
      }

      const newOrigPrice = body.originalPrice ?? existing.originalPrice;
      const newResaleCap = body.resaleCap ?? existing.resaleCap;
      if (newResaleCap < newOrigPrice) {
        throw new AppError(
          "Resale cap cannot be lower than the original ticket price.",
          400
        );
      }

      const issuedCount = existing.totalTickets - existing.ticketsAvailable;
      let updatedAvailable = existing.ticketsAvailable;
      if (body.totalTickets !== undefined) {
        if (body.totalTickets < issuedCount) {
          throw new AppError(
            `Cannot reduce totalTickets below already issued count (${issuedCount}).`,
            400
          );
        }
        updatedAvailable = body.totalTickets - issuedCount;
      }

      const updated = await prisma.event.update({
        where: { id: existing.id },
        data: {
          name: body.name,
          description: body.description,
          category: body.category ? body.category.toUpperCase() : undefined,
          venue: body.venue,
          originalPrice: body.originalPrice,
          resaleCap: body.resaleCap,
          totalTickets: body.totalTickets,
          ticketsAvailable: updatedAvailable,
          status: body.status,
          imageUrl: body.imageUrl,
        },
      });
      if (body.imageUrl && body.imageUrl !== existing.imageUrl) {
        await deleteUploadedImage(existing.imageUrl);
      }

      res.json({ event: updated });
    } catch (err) {
      next(err);
    }
  }
);

// Replace an event photo. Body is the raw image file (Content-Type image/jpeg|png|webp).
// Allowed: ADMIN (any event) and the ORGANIZER who owns the event.
eventsRouter.post(
  "/:id/image",
  authenticate,
  authorizeRoles("ORGANIZER", "ADMIN"),
  express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: MAX_IMAGE_BYTES }),
  async (req, res, next) => {
    try {
      const existing = await prisma.event.findUnique({ where: { id: String(req.params.id) } });
      if (!existing) throw new AppError("Event not found.", 404);
      if (req.user!.role !== "ADMIN" && existing.organizerId !== req.user!.id) {
        throw new AppError("Only the event organizer or an admin can change this photo.", 403);
      }
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        throw new AppError("Send the image file as the request body (JPEG, PNG or WebP, max 5 MB).", 400);
      }

      let imageUrl: string;
      try {
        imageUrl = await saveEventImage(existing.id, req.body);
      } catch (e: any) {
        throw new AppError(e.message || "Invalid image.", 400);
      }
      const event = await prisma.event.update({ where: { id: existing.id }, data: { imageUrl } });
      await deleteUploadedImage(existing.imageUrl);
      res.json({ event });
    } catch (err) {
      next(err);
    }
  }
);

// Remove a custom photo and fall back to the default panel.
eventsRouter.delete(
  "/:id/image",
  authenticate,
  authorizeRoles("ORGANIZER", "ADMIN"),
  async (req, res, next) => {
    try {
      const existing = await prisma.event.findUnique({ where: { id: String(req.params.id) } });
      if (!existing) throw new AppError("Event not found.", 404);
      if (req.user!.role !== "ADMIN" && existing.organizerId !== req.user!.id) {
        throw new AppError("Only the event organizer or an admin can change this photo.", 403);
      }
      const event = await prisma.event.update({
        where: { id: existing.id },
        data: { imageUrl: "/images/default-event.svg" },
      });
      await deleteUploadedImage(existing.imageUrl);
      res.json({ event });
    } catch (err) {
      next(err);
    }
  }
);
