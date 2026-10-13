import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { buildMerkleTree, generateProof, parseCSV, computeNameHash } from "./merkle";
import { z } from "zod";

const uploadProofsSchema = z.object({
  projectId: z.union([z.string(), z.number()]),
  root: z.string(),
  entries: z.array(z.object({
    name: z.string(),
    address: z.string(),
    nameHash: z.string(),
    proof: z.array(z.string()),
  })),
});

const uploadSchema = z.object({
  slug: z.string().min(1, "Slug is required"),
  csvText: z.string().min(1, "CSV content is required"),
});

const proofQuerySchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address"),
});

const claimableQuerySchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address"),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.post("/api/platform/upload", async (req, res) => {
    try {
      const validation = uploadSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          error: validation.error.errors[0]?.message || "Invalid request" 
        });
      }

      const { slug, csvText } = validation.data;

      const entries = parseCSV(csvText);

      const treeResult = buildMerkleTree(entries);

      await storage.saveProject({
        slug: slug.toLowerCase(),
        merkleRoot: treeResult.root,
        entries: treeResult.entries,
        tree: treeResult.tree,
        createdAt: Date.now(),
      });

      const proofs: Record<string, { name: string; nameHash: string; proof: string[] }> = {};
      for (const entry of treeResult.entries) {
        const { proof, nameHash } = generateProof(
          treeResult.tree,
          treeResult.entries,
          entry.address,
          entry.name
        );
        proofs[entry.address.toLowerCase()] = {
          name: entry.name.trim().toLowerCase(),
          nameHash,
          proof,
        };
      }

      return res.json({
        merkleRoot: treeResult.root,
        rowCount: entries.length,
        proofs,
      });
    } catch (error) {
      console.error("Upload error:", error);
      return res.status(400).json({ 
        error: error instanceof Error ? error.message : "Failed to process CSV" 
      });
    }
  });

  app.get("/api/proof", async (req, res) => {
    try {
      const validation = proofQuerySchema.safeParse(req.query);
      
      if (!validation.success) {
        return res.status(400).json({ 
          error: validation.error.errors[0]?.message || "Invalid query parameters",
          eligible: false,
        });
      }

      const { slug, name, address } = validation.data;

      const project = await storage.getProject(slug);
      
      if (!project) {
        return res.json({
          proof: [],
          nameHash: computeNameHash(name),
          eligible: false,
        });
      }

      const { proof, nameHash, found } = generateProof(
        project.tree,
        project.entries,
        address,
        name
      );

      return res.json({
        proof,
        nameHash,
        eligible: found,
      });
    } catch (error) {
      console.error("Proof error:", error);
      return res.status(500).json({ 
        error: "Failed to generate proof",
        eligible: false,
      });
    }
  });

  app.get("/api/project/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const project = await storage.getProject(slug);
      
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      return res.json({
        slug: project.slug,
        merkleRoot: project.merkleRoot,
        entryCount: project.entries.length,
        createdAt: project.createdAt,
      });
    } catch (error) {
      console.error("Project fetch error:", error);
      return res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  // Get all claimable identities for an address across all projects
  app.get("/api/claimable", async (req, res) => {
    try {
      const validation = claimableQuerySchema.safeParse(req.query);
      
      if (!validation.success) {
        return res.status(400).json({ 
          error: validation.error.errors[0]?.message || "Invalid address",
          claims: [],
        });
      }

      const { address } = validation.data;
      const normalizedAddress = address.toLowerCase();
      
      const allProjects = await storage.getAllProjects();
      const claims: Array<{
        slug: string;
        projectId: string;
        name: string;
        nameHash: string;
        proof: string[];
      }> = [];

      for (const project of allProjects) {
        const matchingEntries = project.entries.filter(
          entry => entry.address.toLowerCase() === normalizedAddress
        );

        for (const entry of matchingEntries) {
          const { proof, nameHash } = generateProof(
            project.tree,
            project.entries,
            entry.address,
            entry.name
          );

          claims.push({
            slug: project.slug,
            projectId: "on-chain",
            name: entry.name.trim().toLowerCase(),
            nameHash,
            proof,
          });
        }
      }

      return res.json({ claims });
    } catch (error) {
      console.error("Claimable error:", error);
      return res.status(500).json({ 
        error: "Failed to fetch claimable identities",
        claims: [],
      });
    }
  });

  app.post("/api/upload-proofs", async (req, res) => {
    try {
      const validation = uploadProofsSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          error: validation.error.errors[0]?.message || "Invalid request" 
        });
      }

      const pinataJwt = process.env.PINATA_JWT;
      if (!pinataJwt) {
        return res.status(500).json({ error: "IPFS upload not configured" });
      }

      const pinataRes = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pinataJwt}`,
        },
        body: JSON.stringify({
          pinataContent: validation.data,
          pinataMetadata: {
            name: `rwa-id-proofs-project-${validation.data.projectId}-${Date.now()}`,
          },
          pinataOptions: { cidVersion: 1 },
        }),
      });

      if (!pinataRes.ok) {
        const err = await pinataRes.text();
        console.error("Pinata upload failed:", err);
        return res.status(500).json({ error: "IPFS upload failed" });
      }

      const data = await pinataRes.json();
      return res.json({ cid: data.IpfsHash });
    } catch (error) {
      console.error("Upload proofs error:", error);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to upload proofs" 
      });
    }
  });

  return httpServer;
}
