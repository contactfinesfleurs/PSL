/**
 * db-push.mjs — retry wrapper for `prisma db push`
 *
 * Neon free-tier endpoints auto-suspend after inactivity.
 * The first connection attempt may time out while the endpoint wakes up.
 * This script retries up to 3 times with increasing delays.
 */

import { execSync } from "child_process";

const MAX_RETRIES = 3;
const DELAYS_MS = [8000, 15000, 30000];

for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
  try {
    console.log(`\n▶  prisma db push (attempt ${attempt}/${MAX_RETRIES})`);
    execSync("prisma db push --accept-data-loss", { stdio: "inherit" });
    console.log("✅  Database schema synchronized");
    process.exit(0);
  } catch {
    if (attempt < MAX_RETRIES) {
      const delay = DELAYS_MS[attempt - 1];
      console.log(`⏳  Failed — waiting ${delay / 1000}s for DB endpoint to wake up…`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

console.error("❌  prisma db push failed after all retries");
process.exit(1);
