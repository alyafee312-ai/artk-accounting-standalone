import type {DraftRecord} from './sealDraft';
import {decryptDraftEnvelope, type EncryptedDraftEnvelope} from './decryptDraftEnvelope';
export async function loadEncryptedDraft(id:string,passphrase:string):Promise<DraftRecord|null>{
 const db=await new Promise<IDBDatabase>((resolve,reject)=>{
   const req=indexedDB.open('artk-draft-preview',1);
   req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('sealed-drafts'))req.result.createObjectStore('sealed-drafts',{keyPath:'id'});};
   req.onsuccess=()=>resolve(req.result);
   req.onerror=()=>reject(req.error);
 });
 try{
   const stored=await new Promise<(EncryptedDraftEnvelope & {id:string})|undefined>((resolve,reject)=>{
     const tx=db.transaction('sealed-drafts','readonly');
     const req=tx.objectStore('sealed-drafts').get(id);
     req.onsuccess=()=>resolve(req.result);
     req.onerror=()=>reject(req.error);
   });
   if(!stored)return null;
   const record=await decryptDraftEnvelope(stored,passphrase);
   if(record.id!==id)throw new Error('Draft identity mismatch');
   return record;
 }finally{db.close();}
}
