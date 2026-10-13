import type { MerkleEntry } from "./merkle";
import { buildMerkleTree } from "./merkle";
import type { Hex } from "viem";
import type { MerkleTree } from "merkletreejs";
import { getDb, saveDb } from "./db";

export interface ProjectData {
  slug: string;
  merkleRoot: Hex;
  entries: MerkleEntry[];
  tree: MerkleTree;
  createdAt: number;
}

export interface IStorage {
  getProject(slug: string): Promise<ProjectData | undefined>;
  saveProject(data: ProjectData): Promise<void>;
  getAllProjects(): Promise<ProjectData[]>;
}

interface ProjectRow {
  id: number;
  slug: string;
  merkle_root: string;
  entries: string;
  tree_data: string;
  created_at: number;
}

export class DatabaseStorage implements IStorage {
  async getProject(slug: string): Promise<ProjectData | undefined> {
    const db = await getDb();
    const stmt = db.prepare("SELECT * FROM projects WHERE slug = ?");
    stmt.bind([slug.toLowerCase()]);

    if (!stmt.step()) {
      stmt.free();
      return undefined;
    }

    const row = stmt.getAsObject() as unknown as ProjectRow;
    stmt.free();

    const entries = JSON.parse(row.entries) as MerkleEntry[];
    const treeResult = buildMerkleTree(entries);

    return {
      slug: row.slug,
      merkleRoot: row.merkle_root as Hex,
      entries,
      tree: treeResult.tree,
      createdAt: row.created_at,
    };
  }

  async saveProject(data: ProjectData): Promise<void> {
    const db = await getDb();
    const entriesJson = JSON.stringify(data.entries);
    const treeDataJson = JSON.stringify({ root: data.merkleRoot });

    const checkStmt = db.prepare("SELECT id FROM projects WHERE slug = ?");
    checkStmt.bind([data.slug.toLowerCase()]);
    const exists = checkStmt.step();
    checkStmt.free();

    if (exists) {
      db.run(
        "UPDATE projects SET merkle_root = ?, entries = ?, tree_data = ?, created_at = ? WHERE slug = ?",
        [data.merkleRoot, entriesJson, treeDataJson, data.createdAt, data.slug.toLowerCase()]
      );
    } else {
      db.run(
        "INSERT INTO projects (slug, merkle_root, entries, tree_data, created_at) VALUES (?, ?, ?, ?, ?)",
        [data.slug.toLowerCase(), data.merkleRoot, entriesJson, treeDataJson, data.createdAt]
      );
    }

    saveDb();
  }

  async getAllProjects(): Promise<ProjectData[]> {
    const db = await getDb();
    const results: ProjectData[] = [];
    const stmt = db.prepare("SELECT * FROM projects");

    while (stmt.step()) {
      const row = stmt.getAsObject() as unknown as ProjectRow;
      const entries = JSON.parse(row.entries) as MerkleEntry[];
      const treeResult = buildMerkleTree(entries);

      results.push({
        slug: row.slug,
        merkleRoot: row.merkle_root as Hex,
        entries,
        tree: treeResult.tree,
        createdAt: row.created_at,
      });
    }

    stmt.free();
    return results;
  }
}

export const storage = new DatabaseStorage();
