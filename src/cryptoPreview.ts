// Prototype only: encrypted data must not be used for production until native key storage and recovery are audited.
const enc = new TextEncoder();
export async function encryptPreview(value: unknown, passphrase: string) {
  if (passphrase.length < 12) throw new Error("Passphrase too short");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const material = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:310000,hash:"SHA-256"}, material, {name:"AES-GCM",length:256}, false, ["encrypt"]);
  const ciphertext = await crypto.subtle.encrypt({name:"AES-GCM",iv}, key, enc.encode(JSON.stringify(value)));
  return {salt:[...salt],iv:[...iv],ciphertext:[...new Uint8Array(ciphertext)]};
}
