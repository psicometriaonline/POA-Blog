import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { injectMetaPixelNoscript } from "./meta-pixel-html";
import { injectSeoHead } from "./seo-html";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath, { index: false }));

  app.use("/{*path}", async (req, res) => {
    try {
      const indexPath = path.resolve(distPath, "index.html");
      const template = await fs.promises.readFile(indexPath, "utf-8");
      let page = await injectSeoHead(template, req.originalUrl);
      page = await injectMetaPixelNoscript(page, req.originalUrl);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (err) {
      res.status(500).send("Internal Server Error");
    }
  });
}
