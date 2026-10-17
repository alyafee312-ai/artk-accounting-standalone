import type {EncryptedDraftEnvelope} from './decryptDraftEnvelope';
export interface DraftBackupV1 {format:'artk-encrypted-draft-preview';version:1;id:string;encrypted:EncryptedDraftEnvelope}
function validBytes(input:unknown,length?:number):input is number[]{
 return Array.isArray(input)&&(length===undefined||input.length===length)&&input.every(x=>Number.isInteger(x)&&x>=0&&x<=255);
}
export function parseEncryptedDraftBackup(input:string):DraftBackupV1{
 const parsed:unknown=JSON.parse(input);
 if(typeof parsed!=='object'||parsed===null)throw new Error('Invalid backup');
 const p=parsed as Record<string,unknown>;
 if(p.format!=='artk-encrypted-draft-preview'||p.version!==1||typeof p.id!=='string'||!p.id.trim()||p.id.length>128)throw new Error('Unsupported backup');
 if(typeof p.encrypted!=='object'||p.encrypted===null)throw new Error('Invalid encrypted payload');
 const e=p.encrypted as Record<string,unknown>;
 if(!validBytes(e.salt,16)||!validBytes(e.iv,12)||!validBytes(e.ciphertext)||e.ciphertext.length<16)throw new Error('Invalid encrypted payload');
 return {format:'artk-encrypted-draft-preview',version:1,id:p.id,encrypted:{salt:e.salt,iv:e.iv,ciphertext:e.ciphertext}};
}
export function stringifyEncryptedDraftBackup(backup:DraftBackupV1):string{
 return JSON.stringify(parseEncryptedDraftBackup(JSON.stringify(backup)));
}
