import { createHash } from "node:crypto";

const pin = process.argv[2];
if (!pin) {
  console.error("Usage: npm run pin:hash -- <your-pin>");
  process.exit(1);
}

const hash = createHash("sha256").update(pin).digest("hex");
console.log("\nAdd this to .env.local:\n");
console.log(`EDIT_PIN_HASH=${hash}\n`);
