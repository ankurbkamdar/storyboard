import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import express from "express";
import parseHandler from "./api/parse.js";
import generateFrameHandler from "./api/generate-frame.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === "production";

// Load .env if present (skipped when env vars are set by the host)
const envPath = join(__dirname, ".env");
if (existsSync(envPath)) {
  const envFile = readFileSync(envPath, "utf-8");
  for (const line of envFile.split("\n")) {
    const match = line.match(/^(\w+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
}

const app = express();
app.use(express.json({ limit: "1mb" }));

// API routes — same handlers used by Vercel serverless functions
app.post("/api/parse", parseHandler);
app.post("/api/generate-frame", generateFrameHandler);

// Catch-all for unmatched /api routes — always return JSON, never HTML
app.use("/api", (req, res) => {
  res.status(404).json({ error: `Unknown API route: ${req.method} ${req.path}` });
});

// Serve frontend
if (isProd) {
  const distPath = join(__dirname, "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => res.sendFile(join(distPath, "index.html")));
} else {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
  app.use(vite.middlewares);
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
