import sodium from "libsodium-wrappers";

async function main() {
  const recipientPrekeyPublicB64 = process.argv[2];
  const message = process.argv.slice(3).join(" ") || "hello from ONCE (prekey test)";

  if (!recipientPrekeyPublicB64) {
    console.error("Usage: npx ts-node scripts/encrypt-to-prekey.ts <recipientPrekeyPublicB64> [message]");
    process.exit(1);
  }

  await sodium.ready;

  // Sender ephemeral keypair for this test
  const senderKp = sodium.crypto_box_keypair();

  const recipientPub = sodium.from_base64(recipientPrekeyPublicB64, sodium.base64_variants.URLSAFE_NO_PADDING);
  const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);

  const ciphertext = sodium.crypto_box_easy(Buffer.from(message, "utf8"), nonce, recipientPub, senderKp.privateKey);

  const nonceB64 = sodium.to_base64(nonce, sodium.base64_variants.URLSAFE_NO_PADDING);
  const ciphertextB64 = sodium.to_base64(ciphertext, sodium.base64_variants.URLSAFE_NO_PADDING);
  const senderPublicKeyB64 = sodium.to_base64(senderKp.publicKey, sodium.base64_variants.URLSAFE_NO_PADDING);

  console.log(JSON.stringify({ nonce: nonceB64, ciphertext: ciphertextB64, senderPublicKey: senderPublicKeyB64 }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});