import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

import { authRouter } from "./routes/auth";
import { eventsRouter } from "./routes/events";
import { ticketsRouter } from "./routes/tickets";
import { resaleRouter } from "./routes/resale";
import { fraudRouter } from "./routes/fraud";
import { verificationRouter } from "./routes/verification";
import { benchmarkRouter } from "./routes/benchmark";
import { adminRouter } from "./routes/admin";
import path from "path";
import { EVENT_UPLOAD_DIR } from "./lib/imageUpload";
import { errorHandler } from "./middleware/errorHandler";
import { getSuiNetworkStatus } from "./lib/sui";

dotenv.config();

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: (process.env.FRONTEND_URL || "http://localhost:5173").split(",").map((o) => o.trim()),
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "2mb" }));

// Public event photos only (uploads/events). No directory listing, no dotfiles, no sniffing.
app.use(
  "/uploads/events",
  (_req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("X-Content-Type-Options", "nosniff");
    next();
  },
  express.static(EVENT_UPLOAD_DIR, { index: false, dotfiles: "deny", maxAge: "1h" })
);

// Rate limiter for public and auth routes (relaxed during test runs)
if (process.env.NODE_ENV !== "test") {
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api", apiLimiter);
}

app.get("/api/health", async (_req, res) => {
  const suiStatus = await getSuiNetworkStatus();
  res.json({
    status: "ok",
    project: "EVENTRA — AI-Assisted NFT Ticketing and Anti-Scalping System",
    executionMode: process.env.EXECUTION_MODE || "LOCAL_DEMO",
    suiStatus,
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRouter);
app.use("/api/events", eventsRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/resale", resaleRouter);
app.use("/api/fraud", fraudRouter);
app.use("/api/verification", verificationRouter);
app.use("/api/benchmark", benchmarkRouter);
app.use("/api/admin", adminRouter);

app.use(errorHandler);
