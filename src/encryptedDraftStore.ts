import type { DraftRecord } from './sealDraft';
import { encryptPreview } from './cryptoPreview';
import { validateDraft } from './validateDraft';
// Encrypted draft prototype. IndexedDB is not a production-grade native encrypted database.
const DB_NAME = 'artk-draft-preview';
const STORE = 'sealed-drafts';
function openDraftDb(): Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,1);
    req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:'id'});};
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
export async function storeEncryptedDraft(draft:DraftRecord,passphrase:string):Promise<void>{
  validateDraft(draft);
  const encrypted=await encryptPreview(draft,passphrase);
  const db=await openDraftDb();
  try{
    await new Promise<void>((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).put({id:draft.id,...encrypted});
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error);
      tx.onabort=()=>reject(tx.error);
    });
  }finally{db.close();}
}
