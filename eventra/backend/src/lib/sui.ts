import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";

const SUI_RPC_URL = process.env.SUI_RPC_URL || getFullnodeUrl("testnet");
const SUI_PACKAGE_ID =
  process.env.SUI_PACKAGE_ID ||
  "0x0000000000000000000000000000000000000000000000000000000000000000";

export const suiClient = new SuiClient({ url: SUI_RPC_URL });

export function isSuiTestnetConfigured(): boolean {
  const mode = process.env.EXECUTION_MODE || "LOCAL_DEMO";
  return (
    mode === "SUI_TESTNET" &&
    SUI_PACKAGE_ID !== "0x0000000000000000000000000000000000000000000000000000000000000000" &&
    SUI_PACKAGE_ID.startsWith("0x")
  );
}

/**
 * Verifies an actual Sui transaction digest on Testnet when the user submits a real
 * wallet-signed transaction. Never fabricates digests.
 */
export async function verifySuiTransactionOnChain(digest: string): Promise<{
  verified: boolean;
  status: "SUCCESS" | "FAILURE" | "NOT_FOUND";
  createdObjectId?: string;
  computationCostMist?: string;
  storageCostMist?: string;
  storageRebateMist?: string;
  netGasUsedMist?: number;
  error?: string;
}> {
  try {
    const txBlock = await suiClient.getTransactionBlock({
      digest,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    const status = txBlock.effects?.status?.status;
    if (status !== "success") {
      return {
        verified: false,
        status: "FAILURE",
        error: txBlock.effects?.status?.error || "Sui transaction execution failed on-chain",
      };
    }

    const gasUsed = txBlock.effects?.gasUsed;
    const comp = BigInt(gasUsed?.computationCost || "0");
    const storage = BigInt(gasUsed?.storageCost || "0");
    const rebate = BigInt(gasUsed?.storageRebate || "0");
    const netMist = Number(comp + storage - rebate);

    const createdObj = txBlock.objectChanges?.find((change) => change.type === "created");
    const createdObjectId =
      createdObj && "objectId" in createdObj ? createdObj.objectId : undefined;

    return {
      verified: true,
      status: "SUCCESS",
      createdObjectId,
      computationCostMist: comp.toString(),
      storageCostMist: storage.toString(),
      storageRebateMist: rebate.toString(),
      netGasUsedMist: netMist,
    };
  } catch (err: any) {
    return {
      verified: false,
      status: "NOT_FOUND",
      error: err?.message || "Unable to verify digest on Sui Testnet RPC",
    };
  }
}

export async function getSuiNetworkStatus() {
  const configured = isSuiTestnetConfigured();
  let rpcReachable = false;
  let latestCheckpoint: string | null = null;
  let referenceGasPriceMist: string | null = null;

  try {
    const [cp, rgp] = await Promise.all([
      suiClient.getLatestCheckpointSequenceNumber(),
      suiClient.getReferenceGasPrice(),
    ]);
    rpcReachable = true;
    latestCheckpoint = cp;
    referenceGasPriceMist = rgp.toString();
  } catch {
    rpcReachable = false;
  }

  return {
    executionMode: process.env.EXECUTION_MODE || "LOCAL_DEMO",
    network: process.env.SUI_NETWORK || "testnet",
    rpcUrl: SUI_RPC_URL,
    packageId: SUI_PACKAGE_ID,
    contractDeployed:
      SUI_PACKAGE_ID !== "0x0000000000000000000000000000000000000000000000000000000000000000",
    testnetReady: configured && rpcReachable,
    rpcReachable,
    latestCheckpoint,
    referenceGasPriceMist,
  };
}
