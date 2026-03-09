import sodium from "libsodium-wrappers";
import fs from "fs";

async function main() {
  const filePath = process.argv[2];
  const nonceB64 = process.argv[3];
  const ciphertextB64 = process.argv[4];
  const senderPublicKeyB64 = process.argv[5];

  if (!filePath || !nonceB64 || !ciphertextB64 || !senderPublicKeyB64) {
    console.error("Usage: npx ts-node scripts/decrypt-with-local-prekeys.ts <prekeys-json> <nonce> <ciphertext> <senderPublicKey>");
    process.exit(1);
  }

  const stored = JSON.parse(fs.readFileSync(filePath, "utf8")) as {
    deviceId: string;
    pairs: { publicKeyB64: string; privateKeyB64: string }[];
  };

  await sodium.ready;

  const nonce = sodium.from_base64(nonceB64, sodium.base64_variants.URLSAFE_NO_PADDING);
  const ciphertext = sodium.from_base64(ciphertextB64, sodium.base64_variants.URLSAFE_NO_PADDING);
  const senderPub = sodium.from_base64(senderPublicKeyB64, sodium.base64_variants.URLSAFE_NO_PADDING);

  for (let i = 0; i < stored.pairs.length; i++) {
    const priv = sodium.from_base64(stored.pairs[i].privateKeyB64, sodium.base64_variants.URLSAFE_NO_PADDING);
    try {
      const opened = sodium.crypto_box_open_easy(ciphertext, nonce, senderPub, priv);
      console.log("✅ Decrypted with prekey index", i);
      console.log(Buffer.from(opened).toString("utf8"));
      return;
    } catch {
      // try next key
    }
  }

  console.error("❌ Failed to decrypt with any stored prekey.");
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});