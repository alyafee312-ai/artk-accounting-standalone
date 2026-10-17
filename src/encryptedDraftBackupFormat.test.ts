import {describe,it,expect} from 'vitest';
import {parseEncryptedDraftBackup,stringifyEncryptedDraftBackup} from './encryptedDraftBackupFormat';
describe('encrypted draft backup format',()=>{
 const sample={format:'artk-encrypted-draft-preview' as const,version:1 as const,id:'draft-1',encrypted:{salt:Array(16).fill(1),iv:Array(12).fill(2),ciphertext:Array(32).fill(3)}};
 it('round trips a versioned encrypted envelope',()=>{expect(parseEncryptedDraftBackup(stringifyEncryptedDraftBackup(sample))).toEqual(sample);});
 it('rejects plaintext and malformed envelopes',()=>{
  expect(()=>parseEncryptedDraftBackup(JSON.stringify({id:'draft-1',amount:12500}))).toThrow();
  expect(()=>parseEncryptedDraftBackup(JSON.stringify({...sample,encrypted:{...sample.encrypted,iv:[1]}}))).toThrow();
  expect(()=>parseEncryptedDraftBackup(JSON.stringify({...sample,version:2}))).toThrow();
  expect(()=>parseEncryptedDraftBackup(JSON.stringify({...sample,encrypted:{...sample.encrypted,ciphertext:Array(1024*1024+1).fill(0)}}))).toThrow();
 });
});
