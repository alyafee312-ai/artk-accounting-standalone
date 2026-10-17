import type {DraftRecord} from './sealDraft';
export function newDraft(type:DraftRecord['type'],amount?:number):DraftRecord {
 if(amount!==undefined && (!Number.isSafeInteger(amount)||amount<0))throw new Error('Invalid amount');
 return {id:crypto.randomUUID(),type,amount,createdAt:new Date().toISOString()};
}
