import {parseEncryptedDraftBackup,stringifyEncryptedDraftBackup} from './encryptedDraftBackupFormat';
import {decryptDraftEnvelope} from './decryptDraftEnvelope';
const DB='artk-draft-preview',STORE='sealed-drafts';
async function openDb():Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{
  const req=indexedDB.open(DB,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:'id'});};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 });
}
export async function exportEncryptedDraft(id:string):Promise<string>{
 const db=await openDb();
 try{
  const row=await new Promise<any>((resolve,reject)=>{
   const req=db.transaction(STORE,'readonly').objectStore(STORE).get(id);
   req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
  if(!row)throw new Error('Draft not found');
  return stringifyEncryptedDraftBackup({format:'artk-encrypted-draft-preview',version:1,id,encrypted:{salt:row.salt,iv:row.iv,ciphertext:row.ciphertext}});
 }finally{db.close();}
}
export async function importEncryptedDraft(serialized:string,passphrase:string):Promise<string>{
 if(serialized.length>2_000_000)throw new Error('Backup too large');
 const backup=parseEncryptedDraftBackup(serialized);
 const record=await decryptDraftEnvelope(backup.encrypted,passphrase);
 if(record.id!==backup.id)throw new Error('Backup identity mismatch');
 const db=await openDb();
 try{
  await new Promise<void>((resolve,reject)=>{
   const tx=db.transaction(STORE,'readwrite');
   const store=tx.objectStore(STORE);
   const request=store.add({id:backup.id,...backup.encrypted});
   request.onerror=()=>reject(request.error);
   tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });
  return backup.id;
 }finally{db.close();}
}
