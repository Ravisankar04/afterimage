import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hex,
  type Log,
  type PublicClient,
  type WalletClient,
  parseAbiItem,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { config } from "../config.js";

const afterimageCreatedEvent = parseAbiItem(
  "event AfterimageCreated(bytes32 indexed afterimageId, address indexed creator, bytes32 metadataHash)",
);
const eventCreatedEvent = parseAbiItem(
  "event EventCreated(bytes32 indexed eventId, bytes32 indexed afterimageId, bytes32 indexed parentEventId, uint8 eventType)",
);
const evidenceRegisteredEvent = parseAbiItem(
  "event EvidenceRegistered(bytes32 indexed evidenceId, bytes32 indexed afterimageId, bytes32 indexed eventId)",
);
const witnessAddedEvent = parseAbiItem(
  "event WitnessAdded(bytes32 indexed confirmationId, bytes32 indexed eventId, address indexed witness)",
);
const disputeCreatedEvent = parseAbiItem(
  "event DisputeCreated(bytes32 indexed disputeId, bytes32 indexed afterimageId, address indexed claimant)",
);
const disputeResolvedEvent = parseAbiItem(
  "event DisputeResolved(bytes32 indexed disputeId, bool favorClaimant)",
);
const ownershipTransferredEvent = parseAbiItem(
  "event OwnershipTransferred(bytes32 indexed afterimageId, address indexed from, address indexed to)",
);
const afterimageMarkedGoneEvent = parseAbiItem(
  "event AfterimageMarkedGone(bytes32 indexed afterimageId)",
);

export const INDEXED_EVENTS = [
  afterimageCreatedEvent,
  eventCreatedEvent,
  evidenceRegisteredEvent,
  witnessAddedEvent,
  disputeCreatedEvent,
  disputeResolvedEvent,
  ownershipTransferredEvent,
  afterimageMarkedGoneEvent,
] as const;

export type ContractAddresses = {
  afterimageRegistry?: Address;
  evidenceRegistry?: Address;
  witnessRegistry?: Address;
  disputeRegistry?: Address;
  ownershipRegistry?: Address;
  eventRegistry?: Address;
};

export function getContractAddresses(): ContractAddresses {
  return {
    afterimageRegistry: config.AFTERIMAGE_REGISTRY_ADDRESS as Address | undefined,
    evidenceRegistry: config.EVIDENCE_REGISTRY_ADDRESS as Address | undefined,
    witnessRegistry: config.WITNESS_REGISTRY_ADDRESS as Address | undefined,
    disputeRegistry: config.DISPUTE_REGISTRY_ADDRESS as Address | undefined,
    ownershipRegistry: config.OWNERSHIP_REGISTRY_ADDRESS as Address | undefined,
    eventRegistry: config.EVENT_REGISTRY_ADDRESS as Address | undefined,
  };
}

export function createChainPublicClient(): PublicClient {
  return createPublicClient({
    chain: { ...foundry, id: config.CHAIN_ID },
    transport: http(config.RPC_URL),
  });
}

export function createChainWalletClient(): WalletClient | null {
  if (!config.DEPLOYER_PRIVATE_KEY) return null;
  const account = privateKeyToAccount(config.DEPLOYER_PRIVATE_KEY as Hex);
  return createWalletClient({
    account,
    chain: { ...foundry, id: config.CHAIN_ID },
    transport: http(config.RPC_URL),
  });
}

/**
 * Blockchain client stub for contract calls.
 * Real ABIs are wired when contracts are deployed; methods enqueue registration jobs until then.
 */
export class BlockchainClient {
  readonly publicClient: PublicClient;
  readonly walletClient: WalletClient | null;
  readonly addresses: ContractAddresses;

  constructor() {
    this.publicClient = createChainPublicClient();
    this.walletClient = createChainWalletClient();
    this.addresses = getContractAddresses();
  }

  async getBlockNumber(): Promise<bigint> {
    return this.publicClient.getBlockNumber();
  }

  async getTransactionConfirmations(txHash: Hex): Promise<number> {
    const receipt = await this.publicClient.getTransactionReceipt({ hash: txHash });
    const head = await this.publicClient.getBlockNumber();
    if (head < receipt.blockNumber) return 0;
    return Number(head - receipt.blockNumber) + 1;
  }

  isConfigured(): boolean {
    return Boolean(this.addresses.afterimageRegistry);
  }

  /**
   * Placeholder: enqueue on-chain registration via worker.
   * Returns null txHash until a real Anvil deployment fills contract addresses.
   */
  async registerAfterimageStub(_args: {
    metadataHash: Hex;
  }): Promise<{ txHash: Hex | null; pending: boolean }> {
    if (!this.isConfigured() || !this.walletClient) {
      return { txHash: null, pending: true };
    }
    // Real contract write wired by worker once ABIs are available
    return { txHash: null, pending: true };
  }
}

export type IndexedLog = {
  eventName: string;
  address: Address;
  blockNumber: bigint;
  blockHash: Hex;
  transactionHash: Hex;
  logIndex: number;
  args: Record<string, unknown>;
  removed: boolean;
};

export function mapLogToIndexed(log: Log & { eventName?: string; args?: unknown }): IndexedLog {
  return {
    eventName: log.eventName ?? "Unknown",
    address: log.address,
    blockNumber: log.blockNumber ?? 0n,
    blockHash: log.blockHash ?? ("0x" as Hex),
    transactionHash: log.transactionHash ?? ("0x" as Hex),
    logIndex: log.logIndex ?? 0,
    args: (log.args as Record<string, unknown>) ?? {},
    removed: Boolean(log.removed),
  };
}
