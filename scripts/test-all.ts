import { execSync } from "node:child_process";

const token = process.env.TOKEN;
const deviceA = process.env.DEVICE_A;
const deviceB = process.env.DEVICE_B;

if (!token || !deviceA || !deviceB) {
  console.error("❌ ERROR: TOKEN, DEVICE_A, and DEVICE_B environment variables are required.");
  process.exit(1);
}

const env = { 
  ...process.env, 
  TOKEN: token, 
  DEVICE_ID: deviceA, // Default for single-device tests
  DEVICE_A: deviceA, 
  DEVICE_B: deviceB 
};

function runTest(name: string, script: string) {
  console.log(`\n========================================`);
  console.log(`🚀 RUNNING: ${name}`);
  console.log(`========================================`);
  try {
    const output = execSync(`npx ts-node scripts/${script}`, { env, stdio: "inherit" });
    console.log(`✅ ${name} PASSED`);
  } catch (err: any) {
    console.error(`\n❌ ${name} FAILED`);
    process.exit(1);
  }
}

async function main() {
  console.log("🏁 Starting Golden Regression Suite...");

  // 1. WS Connect + ping/pong + ack_ok
  runTest("WebSocket ACK Confirmation", "test-ws-ack.ts");

  // 2. Prekey register -> hygiene cap -> stats
  runTest("PreKey Hygiene & Stats", "test-prekey-hygiene.ts");

  // 3. Claim concurrency (C2 style)
  runTest("Claim Concurrency (Atomic Skip Locked)", "test-claim-concurrency.ts");

  // 4. Idempotent send + Offline sync
  runTest("Message Reliability (Idempotency & Sync)", "test-message-reliability.ts");

  // 5. Multi-device fanout partial ACK + Poisoned preKeyId prevention
  runTest("Security Semantics (Fanout & Poison Protection)", "test-security-semantics.ts");

  // 6. Rate limit test
  runTest("Rate Limiting Check", "test-rate-limit.ts");

  console.log("\n========================================");
  console.log("✨ ALL TEST BLOCKS PASSED! ✨");
  console.log("========================================");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
