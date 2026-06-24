/**
 * Webhook receiver for local testing.
 *
 * Usage (from the project root):
 *   node webhook-test/receiver.mjs
 *
 * Reads .env.local automatically. Fetches each workflow's real hmacSecret
 * from Firestore on every incoming request so you never need to paste the
 * secret manually.
 */

import { createServer } from "node:http";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ─── Load .env.local ──────────────────────────────────────────────────────────

const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dir, "..", ".env.local");

try {
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes (handles quoted private key values)
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
  console.log("✓ Loaded .env.local");
} catch {
  console.log("⚠️  .env.local not found — relying on environment variables");
}

// ─── Firebase Admin ───────────────────────────────────────────────────────────

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const db = getFirestore();

// ─── Server ───────────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT ?? 4000);

const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("OK");
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405);
    res.end();
    return;
  }

  // Collect raw body bytes before any parsing
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const rawBody = Buffer.concat(chunks).toString("utf8");

  const receivedSig = String(req.headers["x-signature"] ?? "");
  const workflowId = String(req.headers["x-workflow-id"] ?? "");

  console.log(`\n→ POST  workflow: ${workflowId || "(none)"}`);

  if (!workflowId) {
    console.log("⚠️  Missing X-Workflow-Id header");
    res.writeHead(400);
    res.end();
    return;
  }

  // Fetch the real hmacSecret from Firestore
  let hmacSecret = "";
  try {
    const snap = await db.collection("workflows").doc(workflowId).get();
    if (!snap.exists) {
      console.log(`⚠️  Workflow ${workflowId} not found in Firestore`);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ received: true }));
      return;
    }
    hmacSecret = snap.data()?.hmacSecret ?? "";
  } catch (err) {
    console.error("Firestore error:", err);
    res.writeHead(500);
    res.end();
    return;
  }

  // Verify signature against the raw body
  const expectedSig = createHmac("sha256", hmacSecret)
    .update(rawBody)
    .digest("hex");

  if (receivedSig === expectedSig) {
    console.log(`✅  Signature valid`);
  } else {
    console.log(`❌  Signature mismatch`);
    console.log(`   received : ${receivedSig}`);
    console.log(`   expected : ${expectedSig}`);
  }

  try {
    const payload = JSON.parse(rawBody);
    console.log("Payload:", JSON.stringify(payload, null, 2));
  } catch {
    console.log("Raw body (not JSON):", rawBody);
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ received: true }));
});

server.listen(PORT, () => {
  console.log(`\nWebhook receiver listening on http://localhost:${PORT}`);
});
