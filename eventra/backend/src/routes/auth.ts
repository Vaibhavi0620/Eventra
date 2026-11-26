import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, signToken } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(128),
  // ADMIN can never be self-assigned through public registration.
  role: z.enum(["USER", "ORGANIZER"]).optional().default("USER"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const linkWalletSchema = z.object({
  blockchain: z.enum(["SUI_TESTNET", "ETHEREUM_LOCAL", "SIMULATED"]).default("SUI_TESTNET"),
  walletAddress: z
    .string()
    .min(10)
    .max(128)
    .regex(/^0x[a-fA-F0-9]+$/, "Wallet address must be a valid 0x hexadecimal public address"),
});

authRouter.post("/register", async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const normalizedEmail = body.email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      throw new AppError("An account with this email already exists.", 409);
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        name: body.name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: body.role,
      },
      include: { wallets: true },
    });

    const token = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        wallets: user.wallets,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const normalizedEmail = body.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { wallets: true },
    });
    if (!user) {
      throw new AppError("Invalid email or password.", 401);
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      throw new AppError("Invalid email or password.", 401);
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        wallets: user.wallets,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", (_req, res) => {
  res.json({ message: "Logged out successfully." });
});

authRouter.get("/me", authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { wallets: true },
    });
    if (!user) {
      throw new AppError("User not found.", 404);
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        wallets: user.wallets,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/wallet", authenticate, async (req, res, next) => {
  try {
    const body = linkWalletSchema.parse(req.body);
    const wallet = await prisma.wallet.upsert({
      where: {
        blockchain_walletAddress: {
          blockchain: body.blockchain,
          walletAddress: body.walletAddress,
        },
      },
      update: {
        userId: req.user!.id,
      },
      create: {
        userId: req.user!.id,
        blockchain: body.blockchain,
        walletAddress: body.walletAddress,
      },
    });

    res.status(201).json({ wallet });
  } catch (err) {
    next(err);
  }
});
