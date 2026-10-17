import { encryptPreview } from './cryptoPreview';
export interface DraftRecord {id:string;type:'customer'|'project'|'invoice'|'receipt'|'expense';amount?:number;createdAt:string}
export async function sealDraft(record:DraftRecord,passphrase:string){
 if(!record.id)throw new Error('Missing ID');
 if(record.amount!==undefined && (!Number.isSafeInteger(record.amount)||record.amount<0))throw new Error('Invalid amount');
 return encryptPreview(record,passphrase);
}
