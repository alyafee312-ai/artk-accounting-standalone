import {encryptPreview} from "./cryptoPreview";
export async function cryptoSelfTest():Promise<boolean> {
  const result=await encryptPreview({test:"ARTK"}, "preview-only-passphrase-2026");
  return result.salt.length===16 && result.iv.length===12 && result.ciphertext.length>0;
}
