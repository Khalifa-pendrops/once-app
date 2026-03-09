import sodium from "libsodium-wrappers";

async function main() {
  await sodium.ready;

  // Recipient (Bob) keypair (this would be stored on the device)
  const bob = sodium.crypto_box_keypair();

  // Sender (Alice) keypair (sender device keypair)
  const alice = sodium.crypto_box_keypair();

  const message = "hello from ONCE (E2EE)";
  const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);

  // Encrypt for Bob: uses Bob public key + Alice private key
  const ciphertext = sodium.crypto_box_easy(
    message,
    nonce,
    bob.publicKey,
    alice.privateKey
  );

  // Decrypt on Bob: uses Alice public key + Bob private key
  const plaintextBytes = sodium.crypto_box_open_easy(
    ciphertext,
    nonce,
    alice.publicKey,
    bob.privateKey
  );

  const plaintext = sodium.to_string(plaintextBytes);

  console.log("Nonce (b64):", sodium.to_base64(nonce));
  console.log("Ciphertext (b64):", sodium.to_base64(ciphertext));
  console.log("SenderPublicKey (b64):", sodium.to_base64(alice.publicKey));
  console.log("Decrypted:", plaintext);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});