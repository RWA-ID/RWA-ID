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
 * Labels follow RWAIDv4._validateLabel, which follows ENSIP-15: lowercase
 * a-z 0-9 and hyphens, underscores only as a leading run, and no "--" in
 * positions 3-4. Anything else would be rejected at claim time — or, under v3,
 * minted and then never resolved by a wallet.
 *
 * Lowercasing happens here because the CCIP-Read gateway lowercases a name
 * before hashing it: "Zac" allowlisted as-is hashes to a different node than the
 * "zac" ENS asks for.
 */
export function normalizeLabel(name) {
  const label = String(name).trim().toLowerCase()
  if (!label) throw new Error('name is empty')
  if (label.length > 63) throw new Error(`"${label}" is longer than 63 characters`)
  if (!/^[a-z0-9_-]+$/.test(label)) {
    throw new Error(`"${name}" has characters that are not allowed — use a-z, 0-9 and hyphens`)
  }
  if (/^_*[^_]+_/.test(label)) throw new Error(`"${label}" has an underscore after the start — ENS only allows them at the beginning`)
  if (label.length >= 4 && label[2] === '-' && label[3] === '-') {
    throw new Error(`"${label}" has "--" in the third and fourth positions, which ENS rejects`)
  }
  return label
}

// Compute leaf = keccak256(abi.encodePacked(claimer, nameHash))
export function computeLeaf(address, nameHash) {
  return keccak256(encodePacked(['address', 'bytes32'], [getAddress(address), nameHash]))
}

/**
 * Split CSV text into raw { name, wallet } rows without validating them, so the
 * console can show every row's status (ready, lowercased, invalid) instead of
 * rejecting the whole file at the first bad line. Skips a name/wallet header.
 */
export function parseCSVRaw(text) {
  const rows = []
  const lines = String(text).trim().split(/\r?\n/).filter(l => l.trim())
  lines.forEach((line, i) => {
    const [name = '', wallet = ''] = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''))
    if (i === 0 && ['name', 'wallet', 'address', 'label'].includes(name.toLowerCase())) return
    rows.push({ name, wallet })
  })
  if (rows.length === 0) throw new Error('CSV has no rows')
  return rows
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
