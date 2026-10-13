import { MerkleTree } from 'merkletreejs'
import { keccak256, toBytes, encodePacked, getAddress } from 'viem'

// Hash function wrapper: viem keccak256 accepts Uint8Array, returns 0x-hex
// merkletreejs passes Buffer (subclass of Uint8Array) and expects Buffer back
function hashFn(data) {
  const hex = keccak256(data)
  return Buffer.from(hex.slice(2), 'hex')
}

// Compute nameHash = keccak256(bytes(name)) — matches Solidity keccak256(bytes(name))
export function computeNameHash(name) {
  return keccak256(toBytes(name))
}

/**
 * Labels must be lowercase [a-z0-9-_].
 *
 * The CCIP-Read gateway lowercases a name before hashing it, so a label
 * allowlisted as "Zac" hashes to a different node than the "zac" ENS asks for —
 * it mints fine and then never resolves. Normalizing here keeps the allowlist,
 * the claim and ENS resolution pointing at the same node.
 */
export function normalizeLabel(name) {
  const label = String(name).trim().toLowerCase()
  if (!label) throw new Error('name is empty')
  if (label.length > 63) throw new Error(`"${label}" is longer than 63 characters`)
  if (!/^[a-z0-9_-]+$/.test(label)) {
    throw new Error(`"${name}" has characters that are not allowed — use a-z, 0-9, hyphen or underscore`)
  }
  return label
}

// Compute leaf = keccak256(abi.encodePacked(claimer, nameHash))
export function computeLeaf(address, nameHash) {
  return keccak256(encodePacked(['address', 'bytes32'], [getAddress(address), nameHash]))
}

// Parse CSV text into rows: [{ address, name }]
// Expected format: name,wallet  (name first, wallet second)
export function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim())
  const rows = []

  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].split(',').map(p => p.trim())
    if (parts.length < 2) continue

    const [col0, col1] = parts
    // Skip header row
    if (i === 0 && (col0.toLowerCase() === 'name' || col0.toLowerCase() === 'wallet' || col0.toLowerCase() === 'address')) continue

    const name = col0
    const wallet = col1

    if (!wallet.startsWith('0x') || wallet.length !== 42) {
      throw new Error(`Row ${i + 1}: "${wallet}" is not a valid Ethereum address`)
    }

    let label
    try {
      label = normalizeLabel(name)
    } catch (err) {
      throw new Error(`Row ${i + 1}: ${err.message}`)
    }

    rows.push({ address: wallet, name: label })
  }

  if (rows.length === 0) throw new Error('CSV has no valid rows')
  return rows
}

// Build a Merkle tree from parsed rows.
// Returns { tree, root, entries } where entries include the proof for each address.
export function buildMerkleTree(rows) {
  const entries = rows.map(({ address, name }) => {
    // The normalized label is what gets hashed, claimed and resolved.
    const label = normalizeLabel(name)
    const nameHash = computeNameHash(label)
    const leaf = computeLeaf(address, nameHash)
    return { address: getAddress(address), name: label, nameHash, leaf }
  })

  const leafBuffers = entries.map(e => Buffer.from(e.leaf.slice(2), 'hex'))

  const tree = new MerkleTree(leafBuffers, hashFn, { sortPairs: true })

  const root = '0x' + tree.getRoot().toString('hex')

  const entriesWithProofs = entries.map((e, i) => ({
    ...e,
    proof: tree.getProof(leafBuffers[i]).map(x => '0x' + x.data.toString('hex')),
  }))

  return { root, entries: entriesWithProofs }
}
