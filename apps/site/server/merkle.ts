import { keccak256, toBytes, hexToBytes, type Hex } from "viem";
import keccak256js from "keccak256";
import { MerkleTree } from "merkletreejs";

export interface MerkleEntry {
  name: string;
  address: string;
}

export interface MerkleTreeResult {
  root: Hex;
  leaves: Buffer[];
  entries: MerkleEntry[];
  tree: MerkleTree;
}

export function computeNameHash(name: string): Hex {
  return keccak256(toBytes(name.trim().toLowerCase()));
}

export function computeLeaf(address: string, name: string): Buffer {
  const nh = computeNameHash(name);
  const addrBytes = hexToBytes(address.toLowerCase() as `0x${string}`);
  const nhBytes = hexToBytes(nh);

  const packed = new Uint8Array(20 + 32);
  packed.set(addrBytes, 0);
  packed.set(nhBytes, 20);

  return keccak256js(Buffer.from(packed));
}

export function buildMerkleTree(entries: MerkleEntry[]): MerkleTreeResult {
  if (entries.length === 0) {
    throw new Error("Cannot build Merkle tree with empty entries");
  }

  const leaves = entries.map((entry) => computeLeaf(entry.address, entry.name));

  const tree = new MerkleTree(leaves, keccak256js, { sortPairs: true });
  const root = tree.getHexRoot() as Hex;

  return {
    root,
    leaves,
    entries,
    tree,
  };
}

export function generateProof(
  tree: MerkleTree,
  entries: MerkleEntry[],
  targetAddress: string,
  targetName: string
): { proof: Hex[]; nameHash: Hex; found: boolean } {
  const targetLeaf = computeLeaf(targetAddress, targetName);
  const nameHash = computeNameHash(targetName);

  const entryIndex = entries.findIndex(
    (e) =>
      e.address.toLowerCase() === targetAddress.toLowerCase() &&
      e.name.trim().toLowerCase() === targetName.trim().toLowerCase()
  );

  if (entryIndex === -1) {
    return { proof: [], nameHash, found: false };
  }

  const proof = tree.getHexProof(targetLeaf) as Hex[];

  return { proof, nameHash, found: true };
}

export function parseCSV(csvText: string): MerkleEntry[] {
  const lines = csvText.trim().split(/\r?\n/);

  if (lines.length < 2) {
    throw new Error("CSV must have at least a header row and one data row");
  }

  const header = lines[0].toLowerCase();
  const hasHeader = header.includes("name") || header.includes("address");
  const startIndex = hasHeader ? 1 : 0;

  const entries: MerkleEntry[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(",").map((p) => p.trim());

    if (parts.length < 2) {
      throw new Error(`Invalid CSV row ${i + 1}: expected name,address`);
    }

    const [name, address] = parts;

    if (!name) {
      throw new Error(`Invalid CSV row ${i + 1}: name is empty`);
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new Error(`Invalid CSV row ${i + 1}: invalid Ethereum address "${address}"`);
    }

    entries.push({ name, address });
  }

  if (entries.length === 0) {
    throw new Error("No valid entries found in CSV");
  }

  return entries;
}
