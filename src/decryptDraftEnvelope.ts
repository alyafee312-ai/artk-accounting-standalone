import type { DraftRecord } from './sealDraft';
import { validateDraft } from './validateDraft';
export interface EncryptedDraftEnvelope {salt:number[];iv:number[];ciphertext:number[]}
export async function decryptDraftEnvelope(envelope:EncryptedDraftEnvelope,passphrase:string):Promise<DraftRecord>{
 if(passphrase.length<12)throw new Error('Passphrase too short');
 if(envelope.salt.length!==16||envelope.iv.length!==12||envelope.ciphertext.length<16)throw new Error('Invalid envelope');
 const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(passphrase),'PBKDF2',false,['deriveKey']);
 const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:new Uint8Array(envelope.salt),iterations:310000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['decrypt']);
 const decrypted=await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(envelope.iv)},key,new Uint8Array(envelope.ciphertext));
 const record=JSON.parse(new TextDecoder().decode(decrypted)) as DraftRecord;
 validateDraft(record);
 return record;
}
