/** Delete only an encrypted test draft from the standalone preview store. */
export async function deleteEncryptedDraft(id:string):Promise<void>{
 if(!id.trim())throw new Error('Missing draft ID');
 const db=await new Promise<IDBDatabase>((resolve,reject)=>{
  const request=indexedDB.open('artk-draft-preview',1);
  request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('sealed-drafts'))request.result.createObjectStore('sealed-drafts',{keyPath:'id'});};
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error);
 });
 try{
  await new Promise<void>((resolve,reject)=>{
   const tx=db.transaction('sealed-drafts','readwrite');
   tx.objectStore('sealed-drafts').delete(id);
   tx.oncomplete=()=>resolve();
   tx.onerror=()=>reject(tx.error);
   tx.onabort=()=>reject(tx.error);
  });
 }finally{db.close();}
}
