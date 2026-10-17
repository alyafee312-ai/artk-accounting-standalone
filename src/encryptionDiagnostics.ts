import {encryptPreview} from './cryptoPreview';
import {decryptDraftEnvelope} from './decryptDraftEnvelope';
import {newDraft} from './newDraft';
/** Development diagnostic; does not access real customer or financial data. */
export async function runEncryptionDiagnostics():Promise<{roundTrip:boolean;wrongPasswordRejected:boolean;tamperingRejected:boolean}>{
 const passphrase='development-only-passphrase-123';
 const record=newDraft('invoice',12500);
 const sealed=await encryptPreview(record,passphrase);
 const restored=await decryptDraftEnvelope(sealed,passphrase);
 let wrongPasswordRejected=false;
 try{await decryptDraftEnvelope(sealed,'wrong-development-passphrase');}catch{wrongPasswordRejected=true;}
 const tampered={...sealed,ciphertext:[...sealed.ciphertext]};
 tampered.ciphertext[0]^=1;
 let tamperingRejected=false;
 try{await decryptDraftEnvelope(tampered,passphrase);}catch{tamperingRejected=true;}
 return {roundTrip:restored.id===record.id&&restored.amount===record.amount,wrongPasswordRejected,tamperingRejected};
}
