# EVENTRA — REST API & AI Microservice Reference Documentation

Base URL (Backend API): `http://localhost:4000/api`  
Base URL (AI Microservice): `http://127.0.0.1:8001`

All protected Backend API routes require an HTTP `Authorization` header:
```http
Authorization: Bearer <JWT_TOKEN>
```

---

## 1. Authentication & Public Wallet Linking

### `POST /api/auth/register`
Registers a new user account with a bcrypt-hashed password. `role` may be `USER` or `ORGANIZER`; `ADMIN` is rejected (400).

**Example Request:**
```json
{
  "name": "Arjun Mehta",
  "email": "user@example.com",
  "password": "<choose-a-strong-password>",
  "role": "USER"
}
```

**Example Response (`201 Created`):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "b1929f02-4a2b-49c1-9843-77a918230192",
    "name": "Arjun Mehta",
    "email": "arjun@eventra.edu",
    "role": "USER",
    "wallets": []
  }
}
```

### `POST /api/auth/login`
Authenticates an existing user and returns a signed JWT.

### `GET /api/auth/me`
Returns the currently authenticated user profile and associated public wallets.

### `POST /api/auth/wallet`
Links a public blockchain wallet address (`0x...`) to the authenticated user account. Private keys are never requested or stored.

**Example Request:**
```json
{
  "blockchain": "SUI_TESTNET",
  "walletAddress": "0x00cc3300000000000000000000000000000000000000000000000000000f4a01"
}
```

---

## 2. Events API

### `GET /api/events`
Lists all events. Supports query parameters:
- `search`: Filter by event name, venue, or description
- `category`: `ELECTRONIC`, `INDIE_ROCK`, `CLASSICAL`, `FESTIVAL`, or `ALL`
- `sortBy`: `date_asc`, `price_asc`, `price_desc`, `availability`

### `GET /api/events/:id`
Returns detailed event information, remaining ticket inventory, `originalPrice`, `resaleCap`, and Sui network parameters.

### `POST /api/events` *(Requires `ORGANIZER` or `ADMIN`)*
Creates a new event. Validates `resaleCap >= originalPrice`.

**Example Request:**
```json
{
  "name": "SONIC HORIZONS // Analog Modular Synthesis Night",
  "description": "Quadraphonic modular synthesizer showcase.",
  "category": "ELECTRONIC",
  "venue": "Bikaner House Acoustic Pavilion, New Delhi",
  "startDate": "2026-11-14T19:30:00.000Z",
  "endDate": "2026-11-14T23:45:00.000Z",
  "totalTickets": 120,
  "originalPrice": 1000,
  "resaleCap": 1200
}
```

### `PATCH /api/events/:id` *(Requires Event `ORGANIZER` or `ADMIN`)*
Updates event details, ticket supply, or resale price cap.

---

## 3. Tickets API

### `POST /api/tickets/purchase`
Purchases and mints 1–10 tickets for an event, validates supply atomically, generates an HMAC-SHA256 signed QR payload, and invokes the AI Fraud Detection service.
- If `mode: "SUI_TESTNET"`, requires a valid `suiTransactionDigest` verified on-chain via Sui Testnet RPC.
- If `mode: "LOCAL_DEMO"`, creates simulated records explicitly marked `isSimulated: true` and `status: "SIMULATED_LOCAL"`.

**Example Request:**
```json
{
  "eventId": "67c19012-8b10-4b11-9a10-112233445566",
  "quantity": 1,
  "tierName": "Quadraphonic Floor",
  "mode": "LOCAL_DEMO"
}
```

**Example Response (`201 Created`):**
```json
{
  "executionMode": "LOCAL_DEMO",
  "isSimulated": true,
  "tickets": [
    {
      "id": "11111111-2222-4333-8444-555555550001",
      "seatNumber": "QUA-001",
      "originalPrice": 1000,
      "maximumResalePrice": 1200,
      "currentStatus": "ACTIVE",
      "blockchain": "SIMULATED_LOCAL",
      "nftObjectId": null,
      "qrPayload": "{\"v\":1,\"sys\":\"EVENTRA\",\"tid\":\"11111111-2222-4333-8444-555555550001\",\"eid\":\"...\",\"sig\":\"9f81c2...\"}"
    }
  ],
  "aiAnalysis": {
    "predictedLabel": "NORMAL",
    "riskScore": 0.084,
    "reasons": ["Purchasing, timing, and pricing behavior within normal fan baseline"]
  }
}
```

### `GET /api/tickets/my`
Returns tickets owned by the authenticated user. Supports `?status=ACTIVE|USED|LISTED_FOR_RESALE`.

### `POST /api/tickets/:id/transfer`
Transfers a ticket to another registered user by email (`recipientEmail`). Rejects transfers of `USED` tickets or tickets not owned by the caller.

---

## 4. Resale Marketplace API

### `POST /api/resale/listings`
Lists an `ACTIVE` ticket for secondary resale. Strictly enforces `askingPrice <= ticket.maximumResalePrice`.

**Example Rejection Response when `askingPrice > maximumResalePrice` (`400 Bad Request`):**
```json
{
  "error": "Anti-Scalping Cap Violation: Proposed price (1500 units) exceeds the smart-contract maximum permitted resale price of 1200 units (Original price: 1000 units).",
  "code": "RESALE_PRICE_EXCEEDS_CAP"
}
```

### `GET /api/resale/listings`
Returns active and historical secondary resale listings.

### `POST /api/resale/listings/:id/purchase`
Executes a secondary resale purchase, transfers ownership to the buyer, records the transaction, and triggers an AI behavioural evaluation on the seller's resale velocity and price ratio.

### `DELETE /api/resale/listings/:id`
Cancels an active listing and restores the ticket to `ACTIVE` status.

---

## 5. AI Suspicious Activity Detection API

### `POST /api/fraud/analyze` (Backend) & `POST /predict` (FastAPI Service)
Evaluates transaction behaviour using the trained Scikit-learn `RandomForestClassifier`.

**Example Request:**
```json
{
  "wallet_id": "0x999988887777",
  "event_id": "EVT-PULSE-02",
  "event_category": "FESTIVAL",
  "tickets_bought": 8,
  "transfers": 5,
  "resales": 4,
  "time_diff": 35.0,
  "resale_price": 2950.0,
  "original_price": 2500.0,
  "transaction_frequency": 12.5
}
```

**Example Response (`200 OK`):**
```json
{
  "predicted_label": "SUSPICIOUS",
  "risk_score": 0.9612,
  "confidence": 0.9612,
  "reasons": [
    "Unusually high ticket accumulation (8 tickets acquired)",
    "Repeated secondary resale activity (4 resales recorded)",
    "Elevated peer-to-peer transfer velocity (5 transfers)",
    "Unusually short interval between acquisition and action (35s elapsed)",
    "Resale markup near or pushing price cap (1.18x original face value)",
    "High transaction frequency (12.5 tx/hour suggests automated script)"
  ],
  "advisory_notice": "ADVISORY ALERT ONLY: A SUSPICIOUS classification indicates elevated statistical risk requiring administrator review; it is not automatic proof of fraud or scalping."
}
```

### `GET /api/fraud/alerts`
Returns summary counts, risk distribution buckets, held-out test set evaluation metrics (`accuracy`, `precision`, `recall`, `f1_score`, `confusion_matrix`), and the filterable alert ledger.

### `PATCH /api/fraud/alerts/:id/review` *(Requires `ORGANIZER` or `ADMIN`)*
Updates an alert's `reviewStatus` (`PENDING_REVIEW`, `ACKNOWLEDGED`, `DISMISSED`, `RESTRICTED`).

---

## 6. QR Verification API

### `POST /api/verification/scan` *(Requires `ORGANIZER` or `ADMIN`)*
Verifies an opaque QR payload or Ticket UUID, checks event association and HMAC signature, and atomically transitions the ticket from `ACTIVE` to `USED`.
- First valid scan returns `200 OK` (`verificationResult: "VALID_ADMITTED"`).
- Any subsequent or concurrent duplicate scan returns `409 Conflict` (`verificationResult: "REJECTED_ALREADY_USED"`).

### `GET /api/verification/:ticketId`
Read-only inspection of a ticket's current status and verification history without mutating state.

---

## 7. Benchmarking & Admin APIs

### `GET /api/benchmark/results`
Returns aggregated and raw benchmark measurements comparing `SUI` and `ETHEREUM` across `MINT_TICKET`, `TRANSFER_TICKET`, `RESALE_TICKET`, and `VERIFY_ENTRY`. Unmeasured operations return `statusLabel: "Not measured"`.

### `POST /api/benchmark/run` *(Requires `ORGANIZER` or `ADMIN`)*
Synchronizes recorded Hardhat Ethereum measurements from `blockchain/ethereum/benchmark_output.json` and optional verified Sui Testnet digests into PostgreSQL.

### `GET /api/admin/overview` *(Requires `ORGANIZER` or `ADMIN`)*
Returns platform-wide user/role counts, event metrics, recent transactions, flagged AI alerts, and sanitized blockchain RPC status.
