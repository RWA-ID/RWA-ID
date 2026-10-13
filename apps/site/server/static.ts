import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { injectMeta } from "./og";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist, with the share-card
  // tags rewritten for whichever route was asked for — a crawler never runs the
  // bundle, so this is the only place per-route metadata can come from.
  const template = fs.readFileSync(path.resolve(distPath, "index.html"), "utf-8");

  app.use("*", (req, res) => {
    res
      .status(200)
      .set({ "Content-Type": "text/html; charset=utf-8" })
      .end(injectMeta(template, req.originalUrl));
  });
}
