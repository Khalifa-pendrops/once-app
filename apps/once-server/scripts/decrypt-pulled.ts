import sodium from "libsodium-wrappers";

async function main() {
  await sodium.ready;

  // 🔐 Recipient private key (base64) — keep secret
  const recipientPrivateKeyB64 = process.env.RECIPIENT_PRIV!;
  if (!recipientPrivateKeyB64) throw new Error("Set RECIPIENT_PRIV env var");

  // From /messages/pull response
  const nonceB64 = "RW5FjJ0xrv6KcHb_l6HuHJ-TxsQkMOs8";
  const ciphertextB64 = "6WdwRyc1FFAHEhAPYe5_4M2LY4fAScSbrXwrS3UdmkGv4i1rFNo";
  const senderPublicKeyB64 = "cu-FWxGv-0ldoUyrCOTJYTXrWHTKGuiMbc6akyukbB8";

  const recipientPrivateKey = sodium.from_base64(recipientPrivateKeyB64);
  const nonce = sodium.from_base64(nonceB64);
  const ciphertext = sodium.from_base64(ciphertextB64);
  const senderPublicKey = sodium.from_base64(senderPublicKeyB64);

  const plaintextBytes = sodium.crypto_box_open_easy(
    ciphertext,
    nonce,
    senderPublicKey,
    recipientPrivateKey
  );

  console.log("Decrypted:", sodium.to_string(plaintextBytes));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});