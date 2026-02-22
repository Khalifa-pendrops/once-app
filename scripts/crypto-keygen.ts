import sodium from "libsodium-wrappers";

async function main() {
  await sodium.ready;

  // Generate encryption keypair (X25519)
  const keyPair = sodium.crypto_box_keypair();

  const publicKey = sodium.to_base64(keyPair.publicKey);
  const privateKey = sodium.to_base64(keyPair.privateKey);

  console.log("PUBLIC KEY (share this):", publicKey);
  console.log("PRIVATE KEY (keep secret):", privateKey);
}

main().catch(console.error);
