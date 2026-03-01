import sodium from "libsodium-wrappers";
import fs from "fs";
import path from "path";

async function main() {
  const deviceId = process.argv[2];
  const count = Number(process.argv[3] ?? 3);

  if (!deviceId) {
    console.error("Usage: npx ts-node scripts/generate-prekeys.ts <deviceId> [count]");
    process.exit(1);
  }

  await sodium.ready;

  const pairs = Array.from({ length: count }).map(() => {
    const kp = sodium.crypto_box_keypair(); // X25519 for crypto_box
    return {
      publicKeyB64: sodium.to_base64(kp.publicKey, sodium.base64_variants.URLSAFE_NO_PADDING),
      privateKeyB64: sodium.to_base64(kp.privateKey, sodium.base64_variants.URLSAFE_NO_PADDING),
    };
  });

  const outDir = path.join(process.cwd(), "scripts", "out");
  fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, `prekeys-${deviceId}.json`);
  fs.writeFileSync(outPath, JSON.stringify({ deviceId, createdAt: new Date().toISOString(), pairs }, null, 2));

  console.log("Saved:", outPath);
  console.log("Public keys (register these):");
  pairs.forEach((p, i) => console.log(`${i + 1}. ${p.publicKeyB64}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});