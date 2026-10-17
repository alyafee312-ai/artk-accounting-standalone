import 'fake-indexeddb/auto';
import {webcrypto} from 'node:crypto';
import {beforeAll,describe,it,expect} from 'vitest';
import {storeEncryptedDraft} from './encryptedDraftStore';
import {loadEncryptedDraft} from './loadEncryptedDraft';
import {deleteEncryptedDraft} from './deleteEncryptedDraft';
import {exportEncryptedDraft,importEncryptedDraft} from './encryptedDraftTransfer';
beforeAll(()=>{Object.defineProperty(globalThis,'crypto',{value:webcrypto,configurable:true});});
describe('encrypted draft backup transfer',()=>{
 it('exports, restores and rejects wrong passphrases and duplicate records',async()=>{
  const pass='backup-test-passphrase-123';
  const record={id:'backup-test-invoice-1',type:'invoice' as const,amount:6500,createdAt:'2026-10-17T00:00:00.000Z'};
  await storeEncryptedDraft(record,pass);
  const backup=await exportEncryptedDraft(record.id);
  expect(backup).not.toContain('"amount"');
  await expect(importEncryptedDraft(backup,pass)).rejects.toThrow();
  await deleteEncryptedDraft(record.id);
  await expect(importEncryptedDraft(backup,'wrong-backup-passphrase')).rejects.toThrow();
  await importEncryptedDraft(backup,pass);
  await expect(loadEncryptedDraft(record.id,pass)).resolves.toEqual(record);
 });
});
