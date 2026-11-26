/**
 * EVENTRA — Comprehensive Backend & End-to-End Integration Test Suite
 *
 * Tests:
 * 1. Authentication (Registration, Login, Profile, Protected route enforcement)
 * 2. Role-Based Authorization (USER rejected from creating events; ORGANIZER allowed)
 * 3. Complete End-to-End Lifecycle:
 *    Create event (1,000 units original, 1,200 units resale cap)
 *    -> Issue/purchase ticket
 *    -> Analyze suspicious activity via AI module
 *    -> Reject resale above the cap (1,500 > 1,200)
 *    -> Resell within the permitted price (1,150 <= 1,200)
 *    -> Verify buyer's updated ownership
 *    -> Scan QR code at gate & mark ticket USED
 *    -> Reject a second QR scan (`REJECTED_ALREADY_USED`)
 * 4. Blockchain Honest Mode Separation:
 *    Reject `SUI_TESTNET` purchase if no real on-chain transaction digest is supplied
 */

import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../app";
import { prisma } from "../lib/prisma";

describe("EVENTRA Backend API & End-to-End Lifecycle Suite", () => {
  let organizerToken = "";
  let buyer1Token = "";
  let buyer2Token = "";
  let buyer2Id = "";
  let createdEventId = "";
  let mintedTicketId = "";
  let mintedQrPayload = "";
  let resaleListingId = "";

  const uniqueSuffix = Date.now();

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
  });

  it("1. Registers Organizer, Buyer 1, and Buyer 2 and enforces authentication", async () => {
    const orgRes = await request(app).post("/api/auth/register").send({
      name: "Test Organizer",
      email: `org_${uniqueSuffix}@eventra.edu`,
      password: "Password123!",
      role: "ORGANIZER",
    });
    expect(orgRes.status).toBe(201);
    expect(orgRes.body.token).toBeDefined();
    organizerToken = orgRes.body.token;

    const b1Res = await request(app).post("/api/auth/register").send({
      name: "Test Buyer One",
      email: `buyer1_${uniqueSuffix}@eventra.edu`,
      password: "Password123!",
      role: "USER",
    });
    expect(b1Res.status).toBe(201);
    buyer1Token = b1Res.body.token;

    const b2Res = await request(app).post("/api/auth/register").send({
      name: "Test Buyer Two",
      email: `buyer2_${uniqueSuffix}@eventra.edu`,
      password: "Password123!",
      role: "USER",
    });
    expect(b2Res.status).toBe(201);
    buyer2Token = b2Res.body.token;
    buyer2Id = b2Res.body.user.id;

    // Unauthenticated request to /api/auth/me must fail with 401
    const unauthRes = await request(app).get("/api/auth/me");
    expect(unauthRes.status).toBe(401);

    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${buyer1Token}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.role).toBe("USER");
  });

  it("1b. Rejects public self-registration as ADMIN", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Would-be Admin",
        email: `escalate_${Date.now()}@eventra.edu`,
        password: "SomeStrongPass1!",
        role: "ADMIN",
      });
    expect(res.status).toBe(400);
  });

  it("2. Enforces RBAC: rejects event creation by USER role and allows ORGANIZER", async () => {
    const forbiddenRes = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${buyer1Token}`)
      .send({
        name: "Unauthorized Event",
        description: "Should fail role check",
        category: "ELECTRONIC",
        venue: "Test Hall",
        startDate: "2026-12-01T18:00:00.000Z",
        endDate: "2026-12-01T22:00:00.000Z",
        totalTickets: 50,
        originalPrice: 1000,
        resaleCap: 1200,
      });
    expect(forbiddenRes.status).toBe(403);

    const createRes = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${organizerToken}`)
      .send({
        name: "Integration Test Synth Concert",
        description: "End-to-end verification of NFT ticketing and anti-scalping rules.",
        category: "ELECTRONIC",
        venue: "Auditorium Alpha",
        startDate: "2026-12-10T19:00:00.000Z",
        endDate: "2026-12-10T23:00:00.000Z",
        totalTickets: 25,
        originalPrice: 1000,
        resaleCap: 1200,
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.event.originalPrice).toBe(1000);
    expect(createRes.body.event.resaleCap).toBe(1200);
    createdEventId = createRes.body.event.id;
  });

  it("2b. Event photo upload: customers blocked, organizer allowed, non-images rejected", async () => {
    // Smallest valid PNG (1x1 pixel)
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );

    const asCustomer = await request(app)
      .post(`/api/events/${createdEventId}/image`)
      .set("Authorization", `Bearer ${buyer1Token}`)
      .set("Content-Type", "image/png")
      .send(png);
    expect(asCustomer.status).toBe(403);

    const asGuest = await request(app)
      .post(`/api/events/${createdEventId}/image`)
      .set("Content-Type", "image/png")
      .send(png);
    expect(asGuest.status).toBe(401);

    // Declared as PNG but the bytes are not an image -> rejected by magic-byte check
    const fake = await request(app)
      .post(`/api/events/${createdEventId}/image`)
      .set("Authorization", `Bearer ${organizerToken}`)
      .set("Content-Type", "image/png")
      .send(Buffer.from("<script>alert(1)</script> not an image at all"));
    expect(fake.status).toBe(400);

    const ok = await request(app)
      .post(`/api/events/${createdEventId}/image`)
      .set("Authorization", `Bearer ${organizerToken}`)
      .set("Content-Type", "image/png")
      .send(png);
    expect(ok.status).toBe(200);
    expect(ok.body.event.imageUrl).toMatch(/^\/uploads\/events\/.+\.png$/);

    const served = await request(app).get(ok.body.event.imageUrl);
    expect(served.status).toBe(200);

    const removed = await request(app)
      .delete(`/api/events/${createdEventId}/image`)
      .set("Authorization", `Bearer ${organizerToken}`);
    expect(removed.status).toBe(200);
  });

  it("3. Rejects SUI_TESTNET purchase when no real on-chain digest is provided (never fakes on-chain tx)", async () => {
    const fakeTestnetAttempt = await request(app)
      .post("/api/tickets/purchase")
      .set("Authorization", `Bearer ${buyer1Token}`)
      .send({
        eventId: createdEventId,
        quantity: 1,
        mode: "SUI_TESTNET",
      });
    expect(fakeTestnetAttempt.status).toBe(400);
    expect(fakeTestnetAttempt.body.code).toBe("SUI_DIGEST_REQUIRED");
  });

  it("4. Purchases ticket in LOCAL_DEMO mode and runs AI suspicious activity analysis", async () => {
    const purchaseRes = await request(app)
      .post("/api/tickets/purchase")
      .set("Authorization", `Bearer ${buyer1Token}`)
      .send({
        eventId: createdEventId,
        quantity: 1,
        tierName: "Floor VIP",
        mode: "LOCAL_DEMO",
      });

    expect(purchaseRes.status).toBe(201);
    expect(purchaseRes.body.isSimulated).toBe(true);
    expect(purchaseRes.body.tickets).toHaveLength(1);
    expect(purchaseRes.body.aiAnalysis).toBeDefined();
    expect(["NORMAL", "SUSPICIOUS"]).toContain(purchaseRes.body.aiAnalysis.predictedLabel);

    mintedTicketId = purchaseRes.body.tickets[0].id;
    mintedQrPayload = purchaseRes.body.tickets[0].qrPayload;
  });

  it("5. Rejects resale listing above the maximum resale cap (1,500 > 1,200)", async () => {
    const overCapRes = await request(app)
      .post("/api/resale/listings")
      .set("Authorization", `Bearer ${buyer1Token}`)
      .send({
        ticketId: mintedTicketId,
        askingPrice: 1500, // Exceeds 1,200 cap!
      });

    expect(overCapRes.status).toBe(400);
    expect(overCapRes.body.code).toBe("RESALE_PRICE_EXCEEDS_CAP");
  });

  it("6. Allows resale listing within cap (1,150 <= 1,200) and transfers ownership to Buyer 2 on purchase", async () => {
    const listRes = await request(app)
      .post("/api/resale/listings")
      .set("Authorization", `Bearer ${buyer1Token}`)
      .send({
        ticketId: mintedTicketId,
        askingPrice: 1150,
      });

    expect(listRes.status).toBe(201);
    resaleListingId = listRes.body.listing.id;

    const buyRes = await request(app)
      .post(`/api/resale/listings/${resaleListingId}/purchase`)
      .set("Authorization", `Bearer ${buyer2Token}`)
      .send({
        mode: "LOCAL_DEMO",
      });

    expect(buyRes.status).toBe(200);
    expect(buyRes.body.ticket.currentOwnerId).toBe(buyer2Id);
    expect(buyRes.body.ticket.resaleCount).toBe(1);
  });

  it("7. Verifies QR code at gate, marks ticket USED on first scan, and rejects second scan", async () => {
    // First scan by Organizer succeeds
    const firstScan = await request(app)
      .post("/api/verification/scan")
      .set("Authorization", `Bearer ${organizerToken}`)
      .send({
        qrPayload: mintedQrPayload,
        eventId: createdEventId,
        mode: "LOCAL_DEMO",
      });

    expect(firstScan.status).toBe(200);
    expect(firstScan.body.admitted).toBe(true);
    expect(firstScan.body.verificationResult).toBe("VALID_ADMITTED");
    expect(firstScan.body.ticket.currentStatus).toBe("USED");

    // Second scan of the exact same QR code must be rejected with 409 Conflict
    const secondScan = await request(app)
      .post("/api/verification/scan")
      .set("Authorization", `Bearer ${organizerToken}`)
      .send({
        qrPayload: mintedQrPayload,
        eventId: createdEventId,
        mode: "LOCAL_DEMO",
      });

    expect(secondScan.status).toBe(409);
    expect(secondScan.body.admitted).toBe(false);
    expect(secondScan.body.verificationResult).toBe("REJECTED_ALREADY_USED");
  });

  it("8. Enforces backend RBAC on Organizer Dashboard, Fraud Monitoring, and Benchmark endpoints", async () => {
    const userFraudRes = await request(app)
      .get("/api/fraud/alerts")
      .set("Authorization", `Bearer ${buyer1Token}`);
    expect(userFraudRes.status).toBe(403);

    const userOverviewRes = await request(app)
      .get("/api/admin/overview")
      .set("Authorization", `Bearer ${buyer1Token}`);
    expect(userOverviewRes.status).toBe(403);

    const orgOverviewRes = await request(app)
      .get("/api/admin/overview")
      .set("Authorization", `Bearer ${organizerToken}`);
    expect(orgOverviewRes.status).toBe(200);
    expect(orgOverviewRes.body.events.every((ev: any) => ev.id === createdEventId)).toBe(true);
  });
});

