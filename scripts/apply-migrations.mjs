#!/usr/bin/env node
// Apply SQL migrations against DATABASE_URL. Idempotent-ish: wraps each file
// in its own transaction; logs and continues if an object already exists.
//
// Usage: DATABASE_URL=postgres://... node scripts/apply-migrations.mjs

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "..", "supabase", "migrations");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
console.log("Connected.");

const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();

for (const f of files) {
  const sql = readFileSync(join(MIGRATIONS_DIR, f), "utf8");
  console.log(`\n=== ${f} (${sql.split("\n").length} lines) ===`);
  try {
    await client.query("begin");
    await client.query(sql);
    await client.query("commit");
    console.log("✓ applied");
  } catch (e) {
    await client.query("rollback").catch(() => {});
    const msg = e instanceof Error ? e.message : String(e);
    if (
      msg.includes("already exists") ||
      msg.includes("duplicate") ||
      msg.includes("42710") ||
      msg.includes("42P07")
    ) {
      console.log(`  (skipped, already exists: ${msg.split("\n")[0]})`);
    } else {
      console.error(`  ✗ ${msg.split("\n")[0]}`);
      throw e;
    }
  }
}

await client.end();
console.log("\nAll migrations processed.");
