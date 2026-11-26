# EVENTRA — AI-Assisted NFT Ticketing and Anti-Scalping System

**Tagline:** *Fair Access. Secure Tickets. Better Events.*

> **Academic Research & Prototype Disclaimer:**  
> EVENTRA is a complete, full-stack academic software engineering and blockchain research project built to demonstrate how **Sui Move smart contracts**, **Ethereum ERC-721 equivalents**, **Scikit-learn machine learning**, and **cryptographic HMAC QR verification** work together to mitigate secondary-market ticket scalping and duplicate gate entry. It uses blockchain testnets, local EVM execution, and explicitly labelled synthetic/simulated data. It is **not** formally audited for production financial deployment.

---

## Table of Contents

1. [Project Introduction](#1-project-introduction)
2. [Problem Statement](#2-problem-statement)
3. [Objectives](#3-objectives)
4. [Research Gap](#4-research-gap)
5. [Proposed Solution](#5-proposed-solution)
6. [System Architecture](#6-system-architecture)
7. [Technology Stack](#7-technology-stack)
8. [Database Schema & ER Diagram](#8-database-schema--er-diagram)
9. [AI/ML Methodology & Evaluation](#9-aiml-methodology--evaluation)
10. [Sui Smart-Contract Design (`eventra::ticket_nft`)](#10-sui-smart-contract-design-eventraticket_nft)
11. [Ethereum Solidity Comparison (`EventraTicket.sol`)](#11-ethereum-solidity-comparison-eventraticketsol)
12. [Installation Instructions](#12-installation-instructions)
13. [Environment Setup](#13-environment-setup)
14. [Database Setup](#14-database-setup)
15. [Model Training & AI Microservice](#15-model-training--ai-microservice)
16. [Smart-Contract Testing](#16-smart-contract-testing)
17. [Testnet Deployment](#17-testnet-deployment)
18. [Running the Frontend and Backend](#18-running-the-frontend-and-backend)
19. [Running the Complete Demonstration](#19-running-the-complete-demonstration)
20. [Benchmarking Procedure: Sui vs Ethereum](#20-benchmarking-procedure-sui-vs-ethereum)
21. [Known Limitations](#21-known-limitations)
22. [Future Enhancements](#22-future-enhancements)
23. [Engineering Student Glossary](#23-engineering-student-glossary)

---

## 1. Project Introduction

Live music concerts, cultural showcases, and sporting events suffer from two persistent failures in traditional centralized ticketing platforms:
1. **Industrialized Scalping:** Automated bots purchase large inventories within seconds of primary release and resell them on secondary marketplaces at 200%–500% markups.
2. **Counterfeit & Replay Fraud:** Static PDF barcodes or screenshots of QR codes are sold to multiple buyers simultaneously, leaving legitimate fans rejected at the venue gate.

**EVENTRA** solves both challenges through a defense-in-depth architecture:
- **Deterministic On-Chain Price Caps:** Tickets are minted as programmable objects with an immutable `max_resale_price` field. Any secondary transfer or escrow settlement exceeding the cap aborts at the smart-contract execution layer—even if an attacker bypasses the web frontend.
- **Advisory AI Behavioural Anomaly Detection:** A Python FastAPI microservice running a trained Scikit-learn `RandomForestClassifier` inspects acquisition bursts, transfer velocity, time intervals, and price ratios to surface explainable risk alerts for human administrators.
- **Atomic One-Time Gate Verification:** Each ticket generates an HMAC-SHA256 signed opaque QR payload. Gate scanners verify event association, ownership, and live usage state, executing an atomic state transition (`ACTIVE -> USED`) that prevents concurrent duplicate admissions.

---

## 2. Problem Statement

Conventional ticketing systems store ownership in opaque, siloed databases with either unrestricted off-platform secondary transfers (enabling price gouging) or draconian transfer bans (penalizing genuine fans whose plans change). Existing blockchain ticketing prototypes often:
- Rely purely on frontend checks for resale limits while leaving standard `ERC-721 transferFrom` or `public_transfer` unrestricted on-chain.
- Claim that machine learning "blocks all fraud" without distinguishing probabilistic behavioural alerts from deterministic smart-contract invariants.
- Trust static data embedded inside a QR code without checking authoritative state under concurrent gate-scanning loads.

---

## 3. Objectives

1. **Issue Event Tickets as Unique NFTs:** Represent every ticket on the Sui blockchain (`TicketNFT`) with `original_price`, `max_resale_price`, `current_owner`, and `is_used` state.
2. **Detect Suspicious Ticket Activity via AI/ML:** Train, evaluate, and expose a reproducible Scikit-learn classifier via FastAPI (`POST /predict`) with human-readable feature explanations.
3. **Enforce Maximum Resale Prices On-Chain:** Reject any resale where `asking_price > max_resale_price` (e.g., Original = 1,000 units, Cap = 1,200 units; 1,100 and 1,200 succeed; 1,500 aborts).
4. **Verify Ownership & Validity via Secure QR Codes:** Use HMAC-SHA256 signed opaque references verified against live authoritative state.
5. **Prevent Duplicate Ticket Usage:** Guarantee atomic one-time admission (`verify_and_mark_used`) across both smart contracts and PostgreSQL row-level compare-and-swap locks.
6. **Maintain Relational Application & Audit Records:** Persist users, public wallets, events, tickets, transactions, resale listings, fraud alerts, verification logs, and benchmark trials in PostgreSQL via Prisma ORM.
7. **Benchmark Sui vs Ethereum:** Compare equivalent core ticketing operations across Sui Move and Ethereum Solidity (`ERC-721`) using recorded execution cost and confirmation latency.

---

## 4. Research Gap

| Dimension | Legacy Web2 Ticketing | Naive NFT Prototypes | **EVENTRA System** |
| :--- | :--- | :--- | :--- |
| **Resale Price Cap** | Bypassed on external resale sites | Enforced only in UI; bypassed via direct contract calls | **Enforced inside Move & Solidity smart contracts** (`EResalePriceExceedsCap`) |
| **Bot / Scalper Detection** | Basic CAPTCHA at checkout | Rarely integrated | **Real-time Random Forest behavioural classifier** with explainable risk factors |
| **AI vs Contract Boundary** | N/A | Often conflated | **Explicit separation:** AI generates advisory alerts; smart contracts enforce hard rules |
| **Gate QR Security** | Static barcode / screenshot replay | Trusts embedded JSON payload | **Opaque HMAC-signed reference + atomic compare-and-swap lock** |
| **Cross-Chain Evaluation** | N/A | Single-chain claims without data | **Empirical Sui vs Ethereum benchmark module** with honest `"Not measured"` states |

---

## 5. Proposed Solution

EVENTRA combines four coordinated subsystems:
1. **Frontend Client (`frontend/`):** A responsive React + TypeScript + Tailwind CSS application designed with a high-contrast editorial aesthetic (Deep Black `#080808`, Dark Navy `#0D1020`, Charcoal `#171C2E`, Purple `#8B5CF6`, Blue `#55B8FF`, Acid Lime `#B9FF00` for verification only, Off White `#F4F4F0`; Bebas Neue display + Inter body; zero gradients).
2. **Backend REST API (`backend/`):** An Express + TypeScript + Prisma + Zod server enforcing JWT authentication, Role-Based Access Control (`USER`, `ORGANIZER`, `ADMIN`), atomic PostgreSQL transactions, Sui RPC verification, and AI service orchestration.
3. **AI Fraud Microservice (`ai-service/`):** A Python FastAPI service exposing `POST /predict`, `GET /metrics`, and `GET /health`, backed by a reproducible Scikit-learn `RandomForestClassifier` and `LogisticRegression` baseline.
4. **Dual Blockchain Implementations (`blockchain/sui/` & `blockchain/ethereum/`):** Equivalent Move (`eventra::ticket_nft`) and Solidity (`EventraTicket.sol`) contracts enforcing ticket minting, ownership, price-capped resale, and one-time venue entry.

---

## 6. System Architecture

### 6.1 High-Level System Architecture Diagram

```mermaid
flowchart TB
    subgraph Client["Frontend Layer (React 18 + Vite + Tailwind CSS)"]
        UI["User / Organizer / Admin UI"]
        QRGen["HMAC QR Generator (qrcode.react)"]
        QRScan["Optical Camera Scanner (html5-qrcode)"]
        SuiWallet["Public Sui Wallet Connector"]
    end

    subgraph Server["Backend Layer (Node.js + Express + TypeScript)"]
        AuthMW["JWT Auth & RBAC Middleware"]
        Controllers["REST API Controllers (Events, Tickets, Resale, Verify, Admin)"]
        PrismaClient["Prisma ORM Client"]
        SuiVerifier["Sui RPC Digest Verifier (@mysten/sui)"]
    end

    subgraph DataAndAI["Persistence & Intelligence Layer"]
        PG[("PostgreSQL 18 Database")]
        FastAPI["Python FastAPI AI Service (Port 8001)"]
        RFModel["Trained RandomForest Pipeline (.joblib)"]
    end

    subgraph Chains["Blockchain Execution & Benchmark Layer"]
        SuiChain["Sui Testnet / Move VM (eventra::ticket_nft)"]
        EthChain["Ethereum Hardhat EVM (EventraTicket.sol ERC-721)"]
    end

    UI -->|REST JSON + Bearer JWT| AuthMW
    QRScan -->|POST /api/verification/scan| AuthMW
    AuthMW --> Controllers
    Controllers --> PrismaClient
    PrismaClient --> PG
    Controllers -->|POST /predict| FastAPI
    FastAPI --> RFModel
    Controllers --> SuiVerifier
    SuiVerifier -->|JSON-RPC| SuiChain
    SuiWallet -.->|Public 0x Address & Digest| UI
    EthChain -->|benchmark_output.json| Controllers
```

### 6.2 End-to-End Ticketing, Resale & AI Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Org as Organizer
    actor Fan1 as Buyer 1 (Original Fan)
    actor Fan2 as Buyer 2 (Secondary Buyer)
    participant API as Express Backend API
    participant AI as FastAPI AI Service
    participant DB as PostgreSQL (Prisma)
    participant Chain as Sui / Ethereum Contract

    Org->>API: POST /api/events (origPrice=1000, resaleCap=1200)
    API->>DB: Insert Event (ticketsAvailable = totalTickets)
    Fan1->>API: POST /api/tickets/purchase (qty=1)
    API->>Chain: Verify Tx Digest (SUI_TESTNET) or Label SIMULATED_LOCAL
    API->>DB: Atomic Decrement Supply + Create Ticket & HMAC Signature
    API->>AI: POST /predict (tickets_bought, transfers, resales, time_diff, price_ratio)
    AI-->>API: {predicted_label, risk_score, reasons}
    API->>DB: Store FraudAlert record
    API-->>Fan1: Return Ticket + Opaque QR Payload + AI Evaluation

    Note over Fan1,Chain: Secondary Resale Attempt Above Cap (1,500 > 1,200)
    Fan1->>API: POST /api/resale/listings (askingPrice=1500)
    API-->>Fan1: 400 RESALE_PRICE_EXCEEDS_CAP (Also aborts on-chain with EResalePriceExceedsCap)

    Note over Fan1,Fan2: Valid Secondary Resale Within Cap (1,150 <= 1,200)
    Fan1->>API: POST /api/resale/listings (askingPrice=1150)
    Fan2->>API: POST /api/resale/listings/:id/purchase
    API->>DB: Transfer Ownership to Buyer 2 + Increment resaleCount
    API->>AI: POST /predict (Evaluate seller resale velocity)
    API->>DB: Record Transaction & FraudAlert
```

---

## 7. Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React 18, Vite 6, TypeScript 5.7, Tailwind CSS 3.4, React Router v7, Lucide React Icons, Recharts, `qrcode.react`, `html5-qrcode`, `@mysten/dapp-kit` |
| **Backend** | Node.js (v24), Express.js, TypeScript, Zod validation, `bcryptjs`, `jsonwebtoken`, `helmet`, `express-rate-limit`, Vitest + Supertest |
| **Database** | PostgreSQL 18, Prisma ORM (`database/schema.prisma`), ACID transactions, relational foreign keys & composite indexes |
| **AI/ML** | Python 3.13, FastAPI, Uvicorn, Scikit-learn (`RandomForestClassifier`, `LogisticRegression`), Pandas, NumPy, Joblib, Pytest |
| **Sui Blockchain** | Sui Move (`2024.beta` edition), `@mysten/sui` TypeScript SDK, Sui Testnet RPC integration |
| **Ethereum Comparison** | Solidity `0.8.24` (`cancun` EVM target), OpenZeppelin `ERC721`, Hardhat, Ethers.js v6, Chai automated test & gas benchmark suite |

---

## 8. Database Schema & ER Diagram

All 9 required normalized entities are defined in [`database/schema.prisma`](file:///C:/Users/VAIBHAVI/.gemini/antigravity/scratch/eventra/database/schema.prisma) and migrated to PostgreSQL (`database/migrations/`).

```mermaid
erDiagram
    USERS ||--o{ WALLETS : "links public address"
    USERS ||--o{ EVENTS : "organizes"
    USERS ||--o{ TICKETS : "owns (currentOwnerId)"
    USERS ||--o{ TRANSACTIONS : "buys / sells"
    USERS ||--o{ RESALE_LISTINGS : "lists"
    USERS ||--o{ QR_VERIFICATION_LOGS : "verifies at gate"
    EVENTS ||--o{ TICKETS : "issues"
    EVENTS ||--o{ QR_VERIFICATION_LOGS : "logs gate scans"
    TICKETS ||--o{ TRANSACTIONS : "records history"
    TICKETS ||--o{ RESALE_LISTINGS : "escrows"
    TICKETS ||--o{ QR_VERIFICATION_LOGS : "verifies"
    TRANSACTIONS ||--o{ FRAUD_ALERTS : "triggers AI scan"

    USERS {
        uuid id PK
        string name
        string email UK
        string passwordHash
        enum role "USER | ORGANIZER | ADMIN"
    }
    WALLETS {
        uuid id PK
        uuid userId FK
        string blockchain
        string walletAddress
    }
    EVENTS {
        uuid id PK
        uuid organizerId FK
        string name
        string category
        int totalTickets
        int ticketsAvailable
        int originalPrice
        int resaleCap
        enum status
    }
    TICKETS {
        uuid id PK
        uuid eventId FK
        uuid currentOwnerId FK
        string blockchain
        string nftObjectId UK
        int originalPrice
        int maximumResalePrice
        enum currentStatus "ACTIVE | LISTED_FOR_RESALE | USED"
        string qrSignature
        datetime usedAt
    }
    TRANSACTIONS {
        uuid id PK
        uuid ticketId FK
        uuid sellerId FK
        uuid buyerId FK
        enum transactionType
        int amount
        string transactionDigest UK
        boolean isSimulated
        enum status
    }
    RESALE_LISTINGS {
        uuid id PK
        uuid ticketId FK
        uuid sellerId FK
        int askingPrice
        enum status
    }
    FRAUD_ALERTS {
        uuid id PK
        uuid transactionId FK
        string walletAddress
        float riskScore
        enum predictedLabel "NORMAL | SUSPICIOUS"
        string_array reasons
        enum reviewStatus
    }
    BENCHMARK_RESULTS {
        uuid id PK
        string blockchain "SUI | ETHEREUM"
        string operationType
        string transactionCost
        float gasNumeric
        float confirmationTimeMs
        boolean success
        string network
    }
    QR_VERIFICATION_LOGS {
        uuid id PK
        uuid ticketId FK
        uuid eventId FK
        uuid verifierId FK
        enum verificationResult
        datetime scannedAt
    }
```

---

## 9. AI/ML Methodology & Evaluation

### 9.1 Synthetic Dataset Design & Academic Honesty
Because no real-world, ground-truth-labelled NFT ticket scalping dataset is publicly available, [`ai-service/train_model.py`](file:///C:/Users/VAIBHAVI/.gemini/antigravity/scratch/eventra/ai-service/train_model.py) generates a documented 1,600-record probabilistic dataset (`ai-service/data/synthetic_ticket_transactions.csv`) modeling five overlapping behavioural archetypes:
1. **Regular Concertgoer (`NORMAL`):** Purchases 1–3 tickets, 0 resales, long holding intervals.
2. **Legitimate Group/Family Purchaser (`NORMAL`):** Purchases 3–6 tickets and transfers to friends at face value (`price_ratio ≈ 1.0`).
3. **Last-Minute Fan Resale (`NORMAL`):** Resells 1–2 tickets after hours near face value.
4. **High-Frequency Bot Scalper (`SUSPICIOUS`):** Accumulates 4–10 tickets, flips rapidly (`time_diff < 180s`) near or attempting above the price cap (`price_ratio > 1.12`), high hourly transaction frequency.
5. **Coordinated Wash / Churn Ring (`SUSPICIOUS`):** High transfer count (`3–9 transfers`) and rapid inter-wallet velocity.

### 9.2 Preprocessing & Data Leakage Prevention
- **Train/Test Split First:** `train_test_split(..., test_size=0.25, random_state=42, stratify=y)` is executed **before** fitting the `ColumnTransformer` (`SimpleImputer(strategy="median")` + `StandardScaler()` for numeric features; `OneHotEncoder` for `event_category`), preventing test-set statistics from leaking into training.
- **Actual Held-Out Test Set Metrics (`n = 400` test samples, Seed = 42):**
  - **Accuracy:** `98.50%` (`0.9850`)
  - **Precision:** `100.00%` (`1.0000`)
  - **Recall:** `93.62%` (`0.9362`)
  - **F1-Score:** `96.70%` (`0.9670`)
  - **Confusion Matrix:** `TN = 306`, `FP = 0`, `FN = 6`, `TP = 88`

### 9.3 Limitations of Synthetic Evaluation
Synthetic datasets validate feature engineering, pipeline serialization, and decision-boundary learning, but their class separability is governed by the simulation's latent log-odds equation. In production, adversaries adapt their timing and split purchases across Sybil wallets. Therefore, **all AI classifications in EVENTRA are surfaced as advisory alerts (`PENDING_REVIEW`) for human administrators, never as automatic proof of guilt.**

---

## 10. Sui Smart-Contract Design (`eventra::ticket_nft`)

Implemented in [`blockchain/sui/sources/eventra_ticket.move`](file:///C:/Users/VAIBHAVI/.gemini/antigravity/scratch/eventra/blockchain/sui/sources/eventra_ticket.move) with 11 unit tests in [`blockchain/sui/tests/eventra_ticket_tests.move`](file:///C:/Users/VAIBHAVI/.gemini/antigravity/scratch/eventra/blockchain/sui/tests/eventra_ticket_tests.move):

- **Restricted Transfer Capability:** `TicketNFT has key` (deliberately omitting `store`). Because it lacks `store`, holders **cannot** use Sui's generic `sui::transfer::public_transfer` to bypass price caps via external wallets or scripts; every transfer or resale must pass through `eventra::ticket_nft` functions.
- **Integer Monetary Units & Rounding Policy:** All prices (`original_price`, `max_resale_price`, `asking_price`) use unsigned 64-bit integers (`u64`). We never assume `1 SUI == 1 INR`. When organizers compute a percentage cap in the UI (e.g., `+20%`), integer floor division `Math.floor(originalPrice * 1.20)` is applied, and the contract asserts `max_resale_price >= original_price`.
- **On-Chain Resale Price Cap Enforcement:**
  ```move
  assert!(!ticket.is_used, ETicketAlreadyUsed);
  assert!(asking_price <= ticket.max_resale_price, EResalePriceExceedsCap);
  assert!(coin::value(&payment) == asking_price, EInsufficientPayment);
  ```
- **Atomic One-Time Gate Entry (`verify_and_mark_used`):**
  ```move
  let registry_id = object::uid_to_inner(&registry.id);
  assert!(verifier_cap.event_id == registry_id, EUnauthorizedVerifier);
  assert!(ticket.event_id == registry_id, EInvalidEventAssociation);
  assert!(!ticket.is_used, ETicketAlreadyUsed);
  ticket.is_used = true;
  ```

---

## 11. Ethereum Solidity Comparison (`EventraTicket.sol`)

Implemented in [`blockchain/ethereum/contracts/EventraTicket.sol`](file:///C:/Users/VAIBHAVI/.gemini/antigravity/scratch/eventra/blockchain/ethereum/contracts/EventraTicket.sol) using Solidity `0.8.24` and OpenZeppelin `ERC721`. It reproduces the exact same invariants (`NotTicketOwner`, `ResalePriceExceedsCap`, `TicketAlreadyUsed`, `InvalidEventAssociation`, `UnauthorizedVerifier`) and is verified by 9 automated Hardhat Mocha/Chai tests (`blockchain/ethereum/test/EventraTicket.test.ts`).

---

## 12. Installation Instructions

### Prerequisites
- **Node.js** `v20+` (tested on `v24.11.1`) and **npm**
- **Python** `3.11+` (tested on `3.13.1`) and **pip**
- **PostgreSQL** `15+` (tested on `PostgreSQL 18` running on `localhost:5432`)
- *(Optional for live Sui Testnet deployment)* **Sui CLI** (`sui --version`)

### Install Dependencies Across All Services
```powershell
# 1. Backend API Dependencies
cd C:\Users\VAIBHAVI\.gemini\antigravity\scratch\eventra\backend
npm install

# 2. Frontend React Dependencies
cd C:\Users\VAIBHAVI\.gemini\antigravity\scratch\eventra\frontend
npm install

# 3. Ethereum Hardhat Dependencies
cd C:\Users\VAIBHAVI\.gemini\antigravity\scratch\eventra\blockchain\ethereum
npm install

# 4. Python AI Service Dependencies
cd C:\Users\VAIBHAVI\.gemini\antigravity\scratch\eventra\ai-service
python -m pip install -r requirements.txt
```

---

## 13. Environment Setup

Copy `.env.example` to `backend/.env` and configure your local PostgreSQL password and secrets:
```env
PORT=4000
NODE_ENV=development
EXECUTION_MODE=LOCAL_DEMO
FRONTEND_URL=http://localhost:5173
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/eventra?schema=public
JWT_SECRET=eventra_dev_jwt_secret_key_2026_academic_demo_882194
JWT_EXPIRES_IN=24h
QR_HMAC_SECRET=eventra_qr_hmac_secret_2026_anti_replay_991823
AI_SERVICE_URL=http://127.0.0.1:8001
SUI_NETWORK=testnet
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
SUI_PACKAGE_ID=0x0000000000000000000000000000000000000000000000000000000000000000
```

---

## 14. Database Setup

```powershell
cd C:\Users\VAIBHAVI\.gemini\antigravity\scratch\eventra\backend

# 1. Generate Prisma Client
npm run prisma:generate

# 2. Run PostgreSQL Schema Migrations
npm run prisma:migrate

# 3. Seed Demo Users, Events, Simulated Tickets, Resale Listings & Benchmark Data
npm run seed
```

### Seeded Demo Accounts (developer-only)
Set `DEMO_ACCOUNT_PASSWORD` in `backend/.env` before running `npm run seed`. Account details live only in
[`backend/docs/DEMO_ACCOUNTS.md`](backend/docs/DEMO_ACCOUNTS.md); they are intentionally not shown in the UI.
The seeder refuses to run with `NODE_ENV=production`.

---

## 15. Model Training & AI Microservice

```powershell
cd C:\Users\VAIBHAVI\.gemini\antigravity\scratch\eventra\ai-service

# 1. Generate synthetic dataset, train Random Forest & Logistic Regression baseline, and save metrics
python train_model.py

# 2. Run automated Pytest suite (5 tests)
python -m pytest test_ai_service.py -v

# 3. Start the FastAPI prediction server on port 8001
python -m uvicorn app:app --host 127.0.0.1 --port 8001
```

---

## 16. Smart-Contract Testing

### Ethereum Hardhat Tests & Gas Benchmarks
```powershell
cd C:\Users\VAIBHAVI\.gemini\antigravity\scratch\eventra\blockchain\ethereum
npm run test
npm run benchmark
```

### Sui Move Unit Tests
When the `sui` CLI binary is installed on your PATH:
```powershell
cd C:\Users\VAIBHAVI\.gemini\antigravity\scratch\eventra\blockchain\sui
sui move test
```

---

## 17. Testnet Deployment

### Deploying to Sui Testnet
1. Install the Sui CLI binary and switch to Testnet:
   ```powershell
   sui client switch --env testnet
   sui client faucet
   ```
2. Run our automated PowerShell deployment script:
   ```powershell
   .\scripts\deploy-sui-testnet.ps1
   ```
3. Copy the output `SUI_PACKAGE_ID` into `backend/.env` and switch `EXECUTION_MODE=SUI_TESTNET` (or toggle **Mode: Sui Testnet (On-Chain)** in the top bar of the web application).

---

## 18. Running the Frontend and Backend

Open three terminal windows:

```powershell
# Terminal 1: FastAPI AI Service (Port 8001)
cd C:\Users\VAIBHAVI\.gemini\antigravity\scratch\eventra\ai-service
python -m uvicorn app:app --host 127.0.0.1 --port 8001

# Terminal 2: Express Backend API (Port 4000)
cd C:\Users\VAIBHAVI\.gemini\antigravity\scratch\eventra\backend
npm run dev

# Terminal 3: React Vite Frontend (Port 5173)
cd C:\Users\VAIBHAVI\.gemini\antigravity\scratch\eventra\frontend
npm run dev
```

Open **`http://localhost:5173`** in your browser.

---

## 19. Running the Complete Demonstration

### Ticket Resale & Gate Verification Workflow Diagram

```mermaid
stateDiagram-v2
    [*] --> Minted_ACTIVE: Primary Purchase (1,000 U)
    Minted_ACTIVE --> Listed_For_Resale: Seller Lists <= 1,200 U Cap
    Minted_ACTIVE --> Minted_ACTIVE: Listing > 1,200 U Rejected (EResalePriceExceedsCap)
    Listed_For_Resale --> Minted_ACTIVE: Buyer Purchases Listing (Ownership Transferred)
    Listed_For_Resale --> Minted_ACTIVE: Seller Cancels Listing
    Minted_ACTIVE --> Admitted_USED: 1st Valid Gate QR Scan (verify_and_mark_used)
    Admitted_USED --> Rejected_409: 2nd / Concurrent QR Scan (ETicketAlreadyUsed)
```

1. **Sign In:** Go to `/auth` and click **Arjun Mehta (`arjun@eventra.edu`)** or **Organizer (`organizer@eventra.edu`)**.
2. **Browse & Mint:** Visit `/events`, open **SONIC HORIZONS**, select ticket quantity, and mint in **Local Demo Mode** (or test **Sui Testnet Mode** to observe strict on-chain digest verification).
3. **Test Resale Cap Enforcement:** Go to `/resale` or `/my-tickets`. Click **Test Above Cap (1500 — Rejects)** to verify that prices exceeding the 1,200-unit ceiling are rejected. Then list at `1,150 units` and purchase as `meera@eventra.edu`.
4. **Inspect AI Fraud Monitor:** Open `/fraud` to view real-time risk scores, confusion matrix metrics, and run custom behavioural scenarios in the **Interactive AI Inference Tester**.
5. **Scan QR at Gate:** Sign in as `organizer@eventra.edu`, open `/verify`, click **Fill Seeded UNUSED Ticket (#MOD-001)**, and click **Verify & Admit (Mark USED)**. Then click **Test Immediate Replay Scan** to confirm `409 Conflict — REJECTED_ALREADY_USED`.

---

## 20. Benchmarking Procedure: Sui vs Ethereum

1. Execute `npm run benchmark` in `blockchain/ethereum/` to run 5 trials each of `MINT_TICKET`, `TRANSFER_TICKET`, `RESALE_TICKET`, and `VERIFY_ENTRY` on `hardhat-local-evm`.
2. In the web UI (`/benchmark`), click **Import Recorded Hardhat / Sui Trials** (or run `npm run seed` in `backend/`).
3. **Interpreting Cost Differences:**
   - **Ethereum:** Reports EVM gas units (`receipt.gasUsed`). Actual monetary cost in ETH equals $\text{gasUsed} \times \text{gasPrice (Gwei)}$.
   - **Sui:** Reports net MIST ($\text{computationCost} + \text{storageCost} - \text{storageRebate}$). Because Sui uses an object-centric storage fund with storage rebates when objects are deleted or mutated, raw numeric units (`gas` vs `MIST`) cannot be compared 1:1 without applying network token prices.
   - Any operation not yet run against a live Sui node is explicitly displayed as **`Not measured`**.

---

## 21. Known Limitations

1. **Synthetic AI Training Data:** The Random Forest classifier is trained on simulated behavioural archetypes (`1,600` rows). Real-world deployment requires continuous retraining on live ticketing telemetry.
2. **Sybil Wallet Splitting:** While on-chain caps prevent per-ticket price gouging on the protocol marketplace, a determined scalper could create multiple wallets to bypass per-wallet quantity alerts unless paired with decentralized identity (DID) or Proof-of-Attendance credentials.
3. **Local Sui CLI Availability:** If the `sui` binary is not installed on the host machine, Sui Move tests cannot be executed locally until the binary is added to `PATH`; however, the complete Move source and 11-test suite are provided in `blockchain/sui/` and the application operates seamlessly in explicitly labelled `LOCAL_DEMO` mode.

---

## 22. Future Enhancements

- **Zero-Knowledge Proof of Identity (zkLogin):** Integrate Sui zkLogin so fans can authenticate and bind non-transferable identity credentials without managing seed phrases.
- **Dynamic Dutch-Auction Capped Drops:** Allow organizers to configure time-weighted resale caps that decrease closer to showtime.
- **Graph Neural Network (GNN) Collusion Detection:** Upgrade the tabular Random Forest model to a temporal GNN that detects multi-hop wash-trading rings across wallet graphs.

---

## 23. Engineering Student Glossary

| Term | Plain-English Explanation for Engineering Students |
| :--- | :--- |
| **NFT (Non-Fungible Token)** | A unique digital object on a blockchain with its own distinct identifier (`UID` in Sui Move or `tokenId` in Ethereum ERC-721). Unlike cryptocurrencies where every coin is identical, each NFT ticket represents a specific event seat and admission state. |
| **Sui Move Object Model** | Unlike Ethereum (which stores all token balances inside a central contract mapping), Sui treats every `TicketNFT` as an independent object owned by an address, enabling parallel transaction execution and explicit capability-based access control. |
| **Capability Pattern (`VerifierCap`)** | A design pattern in Move where authority to perform a privileged action (such as marking a ticket `USED` at the venue gate) is represented by a special unforgeable object (`VerifierCap`) held by the organizer. |
| **MIST & Gwei** | The smallest fractional denominations of native gas tokens: $1\text{ SUI} = 10^9\text{ MIST}$ on Sui, and $1\text{ ETH} = 10^9\text{ Gwei} = 10^{18}\text{ wei}$ on Ethereum. |
| **HMAC-SHA256 Signature** | A keyed cryptographic hash function (`Hash-based Message Authentication Code`). The backend signs `ticketId:eventId` with a secret key (`QR_HMAC_SECRET`) so nobody can forge a QR code for a fake ticket ID. |
| **Compare-And-Swap (CAS)** | An atomic concurrency technique (`UPDATE tickets SET currentStatus='USED' WHERE id=:id AND usedAt IS NULL`). It guarantees that if two gate scanners scan the same QR code at the exact same instant, only one succeeds and the second is rejected. |
| **Data Leakage (ML)** | A flaw in machine learning pipelines where information from the test set accidentally influences preprocessing (such as computing mean/median across the whole dataset before splitting). EVENTRA prevents this by splitting train and test sets first and wrapping `SimpleImputer` and `StandardScaler` inside a Scikit-learn `Pipeline`. |
| **Precision vs Recall** | **Precision** measures how many transactions flagged as `SUSPICIOUS` were genuinely suspicious ($\frac{TP}{TP + FP}$). **Recall** measures what fraction of all truly suspicious transactions the model successfully caught ($\frac{TP}{TP + FN}$). |


## Editing Event Photos

**From the website (privileged users only):** sign in as an Organizer (own events) or Admin (any event), open the event page and use **Change photo** (JPEG/PNG/WebP, max 5 MB). Customers and guests do not see the control, and the API rejects them (403/401). Files are checked by their real content, not the declared type, and stored in `backend/uploads/events/` under random names.

**From the backend (server access):**
```bash
cd backend
npm run event-image -- list
npm run event-image -- set "Sonic Horizons" ./photos/sonic.jpg
npm run event-image -- hero ./photos/hero.jpg      # homepage hero
```
