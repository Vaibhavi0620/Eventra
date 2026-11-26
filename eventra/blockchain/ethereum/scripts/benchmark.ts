import * as fs from "fs";
import * as path from "path";
import { ethers } from "hardhat";

interface TrialMeasurement {
  blockchain: "ETHEREUM";
  operationType: "MINT_TICKET" | "TRANSFER_TICKET" | "RESALE_TICKET" | "VERIFY_ENTRY";
  transactionCost: string;
  gasNumeric: number;
  confirmationTimeMs: number;
  success: boolean;
  network: string;
  transactionDigest: string;
  notes: string;
  measuredAt: string;
}

async function main() {
  const [organizer, buyer1, buyer2] = await ethers.getSigners();
  const EventraTicket = await ethers.getContractFactory("EventraTicket");
  const contract = await EventraTicket.deploy();
  await contract.waitForDeployment();

  await contract.connect(organizer).createEvent("EVENTRA Benchmark Event", 1000n, 1200n, 500n);

  const measurements: TrialMeasurement[] = [];
  const trials = 5;

  for (let i = 0; i < trials; i++) {
    const tokenId = BigInt(i + 1);

    // 1. MINT_TICKET
    const t0Mint = performance.now();
    const txMint = await contract.connect(organizer).mintTicket(1n, buyer1.address, `BENCH-${i + 1}`);
    const receiptMint = await txMint.wait();
    const t1Mint = performance.now();
    const gasMint = Number(receiptMint!.gasUsed);
    measurements.push({
      blockchain: "ETHEREUM",
      operationType: "MINT_TICKET",
      transactionCost: `${gasMint.toLocaleString()} gas units`,
      gasNumeric: gasMint,
      confirmationTimeMs: Number((t1Mint - t0Mint).toFixed(2)),
      success: receiptMint!.status === 1,
      network: "hardhat-local-evm (chainId 31337)",
      transactionDigest: receiptMint!.hash,
      notes: `Trial #${i + 1}: ERC-721 _safeMint + TicketData struct storage`,
      measuredAt: new Date().toISOString(),
    });

    // 2. TRANSFER_TICKET
    const t0Transfer = performance.now();
    const txTransfer = await contract.connect(buyer1).transferTicket(tokenId, buyer2.address);
    const receiptTransfer = await txTransfer.wait();
    const t1Transfer = performance.now();
    const gasTransfer = Number(receiptTransfer!.gasUsed);
    measurements.push({
      blockchain: "ETHEREUM",
      operationType: "TRANSFER_TICKET",
      transactionCost: `${gasTransfer.toLocaleString()} gas units`,
      gasNumeric: gasTransfer,
      confirmationTimeMs: Number((t1Transfer - t0Transfer).toFixed(2)),
      success: receiptTransfer!.status === 1,
      network: "hardhat-local-evm (chainId 31337)",
      transactionDigest: receiptTransfer!.hash,
      notes: `Trial #${i + 1}: Controlled ownership transfer + counter increment`,
      measuredAt: new Date().toISOString(),
    });

    // 3. RESALE_TICKET (within cap: 1150 <= 1200)
    const t0Resale = performance.now();
    const txResale = await contract
      .connect(buyer1)
      .executeResale(tokenId, 1150n, buyer1.address, { value: 1150n });
    const receiptResale = await txResale.wait();
    const t1Resale = performance.now();
    const gasResale = Number(receiptResale!.gasUsed);
    measurements.push({
      blockchain: "ETHEREUM",
      operationType: "RESALE_TICKET",
      transactionCost: `${gasResale.toLocaleString()} gas units`,
      gasNumeric: gasResale,
      confirmationTimeMs: Number((t1Resale - t0Resale).toFixed(2)),
      success: receiptResale!.status === 1,
      network: "hardhat-local-evm (chainId 31337)",
      transactionDigest: receiptResale!.hash,
      notes: `Trial #${i + 1}: On-chain price cap assertion (1150 <= 1200) + ETH settlement`,
      measuredAt: new Date().toISOString(),
    });

    // 4. VERIFY_ENTRY (one-time usage update)
    const t0Verify = performance.now();
    const txVerify = await contract.connect(organizer).verifyAndMarkUsed(tokenId, 1n);
    const receiptVerify = await txVerify.wait();
    const t1Verify = performance.now();
    const gasVerify = Number(receiptVerify!.gasUsed);
    measurements.push({
      blockchain: "ETHEREUM",
      operationType: "VERIFY_ENTRY",
      transactionCost: `${gasVerify.toLocaleString()} gas units`,
      gasNumeric: gasVerify,
      confirmationTimeMs: Number((t1Verify - t0Verify).toFixed(2)),
      success: receiptVerify!.status === 1,
      network: "hardhat-local-evm (chainId 31337)",
      transactionDigest: receiptVerify!.hash,
      notes: `Trial #${i + 1}: Atomic one-time gate admission state mutation`,
      measuredAt: new Date().toISOString(),
    });
  }

  const outPath = path.join(__dirname, "..", "benchmark_output.json");
  fs.writeFileSync(outPath, JSON.stringify({ measuredAt: new Date().toISOString(), measurements }, null, 2));
  console.log(`Recorded ${measurements.length} real Ethereum benchmark trials to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
