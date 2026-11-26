-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ORGANIZER', 'ADMIN');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('ACTIVE', 'LISTED_FOR_RESALE', 'USED', 'REVOKED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('PRIMARY_MINT', 'RESALE_PURCHASE', 'P2P_TRANSFER');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('CONFIRMED_ON_CHAIN', 'SIMULATED_LOCAL', 'PENDING', 'FAILED');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('ACTIVE', 'SOLD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FraudLabel" AS ENUM ('NORMAL', 'SUSPICIOUS');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING_REVIEW', 'ACKNOWLEDGED', 'DISMISSED', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "VerificationOutcome" AS ENUM ('VALID_ADMITTED', 'REJECTED_ALREADY_USED', 'REJECTED_INVALID_SIGNATURE', 'REJECTED_WRONG_EVENT', 'REJECTED_NOT_FOUND');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "blockchain" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL DEFAULT '/images/default-event.svg',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalTickets" INTEGER NOT NULL,
    "ticketsAvailable" INTEGER NOT NULL,
    "originalPrice" INTEGER NOT NULL,
    "resaleCap" INTEGER NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'UPCOMING',
    "onChainEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "currentOwnerId" TEXT NOT NULL,
    "blockchain" TEXT NOT NULL,
    "nftObjectId" TEXT,
    "seatNumber" TEXT NOT NULL DEFAULT 'GA-001',
    "tierName" TEXT NOT NULL DEFAULT 'General Admission',
    "originalPrice" INTEGER NOT NULL,
    "maximumResalePrice" INTEGER NOT NULL,
    "currentStatus" "TicketStatus" NOT NULL DEFAULT 'ACTIVE',
    "transferCount" INTEGER NOT NULL DEFAULT 0,
    "resaleCount" INTEGER NOT NULL DEFAULT 0,
    "qrSignature" TEXT NOT NULL,
    "mintedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "sellerId" TEXT,
    "buyerId" TEXT NOT NULL,
    "transactionType" "TransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "blockchain" TEXT NOT NULL,
    "transactionDigest" TEXT,
    "isSimulated" BOOLEAN NOT NULL DEFAULT true,
    "status" "TransactionStatus" NOT NULL DEFAULT 'SIMULATED_LOCAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resale_listings" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "askingPrice" INTEGER NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resale_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fraud_alerts" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "riskScore" DOUBLE PRECISION NOT NULL,
    "predictedLabel" "FraudLabel" NOT NULL,
    "reasons" TEXT[],
    "ticketsBoughtFeature" INTEGER NOT NULL DEFAULT 1,
    "transfersFeature" INTEGER NOT NULL DEFAULT 0,
    "resalesFeature" INTEGER NOT NULL DEFAULT 0,
    "timeDiffSeconds" DOUBLE PRECISION NOT NULL DEFAULT 3600,
    "priceRatio" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "txFrequencyPerHour" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewerNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fraud_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benchmark_results" (
    "id" TEXT NOT NULL,
    "blockchain" TEXT NOT NULL,
    "operationType" TEXT NOT NULL,
    "transactionCost" TEXT NOT NULL,
    "gasNumeric" DOUBLE PRECISION NOT NULL,
    "confirmationTimeMs" DOUBLE PRECISION NOT NULL,
    "success" BOOLEAN NOT NULL,
    "network" TEXT NOT NULL,
    "transactionDigest" TEXT,
    "notes" TEXT,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "benchmark_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_verification_logs" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT,
    "eventId" TEXT NOT NULL,
    "verificationResult" "VerificationOutcome" NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifierId" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "qr_verification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "wallets_userId_idx" ON "wallets"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_blockchain_walletAddress_key" ON "wallets"("blockchain", "walletAddress");

-- CreateIndex
CREATE INDEX "events_organizerId_idx" ON "events"("organizerId");

-- CreateIndex
CREATE INDEX "events_category_idx" ON "events"("category");

-- CreateIndex
CREATE INDEX "events_status_idx" ON "events"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_nftObjectId_key" ON "tickets"("nftObjectId");

-- CreateIndex
CREATE INDEX "tickets_eventId_idx" ON "tickets"("eventId");

-- CreateIndex
CREATE INDEX "tickets_currentOwnerId_idx" ON "tickets"("currentOwnerId");

-- CreateIndex
CREATE INDEX "tickets_currentStatus_idx" ON "tickets"("currentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_transactionDigest_key" ON "transactions"("transactionDigest");

-- CreateIndex
CREATE INDEX "transactions_ticketId_idx" ON "transactions"("ticketId");

-- CreateIndex
CREATE INDEX "transactions_buyerId_idx" ON "transactions"("buyerId");

-- CreateIndex
CREATE INDEX "transactions_sellerId_idx" ON "transactions"("sellerId");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "resale_listings_ticketId_idx" ON "resale_listings"("ticketId");

-- CreateIndex
CREATE INDEX "resale_listings_sellerId_idx" ON "resale_listings"("sellerId");

-- CreateIndex
CREATE INDEX "resale_listings_status_idx" ON "resale_listings"("status");

-- CreateIndex
CREATE INDEX "fraud_alerts_transactionId_idx" ON "fraud_alerts"("transactionId");

-- CreateIndex
CREATE INDEX "fraud_alerts_predictedLabel_idx" ON "fraud_alerts"("predictedLabel");

-- CreateIndex
CREATE INDEX "fraud_alerts_reviewStatus_idx" ON "fraud_alerts"("reviewStatus");

-- CreateIndex
CREATE INDEX "benchmark_results_blockchain_idx" ON "benchmark_results"("blockchain");

-- CreateIndex
CREATE INDEX "benchmark_results_operationType_idx" ON "benchmark_results"("operationType");

-- CreateIndex
CREATE INDEX "qr_verification_logs_ticketId_idx" ON "qr_verification_logs"("ticketId");

-- CreateIndex
CREATE INDEX "qr_verification_logs_eventId_idx" ON "qr_verification_logs"("eventId");

-- CreateIndex
CREATE INDEX "qr_verification_logs_scannedAt_idx" ON "qr_verification_logs"("scannedAt");

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_currentOwnerId_fkey" FOREIGN KEY ("currentOwnerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resale_listings" ADD CONSTRAINT "resale_listings_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resale_listings" ADD CONSTRAINT "resale_listings_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fraud_alerts" ADD CONSTRAINT "fraud_alerts_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_verification_logs" ADD CONSTRAINT "qr_verification_logs_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_verification_logs" ADD CONSTRAINT "qr_verification_logs_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_verification_logs" ADD CONSTRAINT "qr_verification_logs_verifierId_fkey" FOREIGN KEY ("verifierId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
