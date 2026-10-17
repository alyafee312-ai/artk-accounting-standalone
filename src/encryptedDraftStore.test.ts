import 'fake-indexeddb/auto';
import {webcrypto} from 'node:crypto';
import {beforeAll} from 'vitest';
beforeAll(()=>{Object.defineProperty(globalThis,'crypto',{value:webcrypto,configurable:true});});
import {describe,it,expect} from 'vitest';
import {storeEncryptedDraft} from './encryptedDraftStore';
import {loadEncryptedDraft} from './loadEncryptedDraft';
import {deleteEncryptedDraft} from './deleteEncryptedDraft';
describe('offline encrypted draft persistence',()=>{
 it('saves and restores a test invoice and rejects an incorrect passphrase',async()=>{
  const record={id:'offline-test-invoice-1',type:'invoice' as const,amount:12500,createdAt:'2026-10-17T00:00:00.000Z'};
  const password='offline-test-passphrase-123';
  await storeEncryptedDraft(record,password);
  await expect(loadEncryptedDraft(record.id,password)).resolves.toEqual(record);
  await expect(loadEncryptedDraft(record.id,'wrong-test-passphrase-123')).rejects.toThrow();
  await expect(loadEncryptedDraft('missing-id',password)).resolves.toBeNull();
  await deleteEncryptedDraft(record.id);
  await expect(loadEncryptedDraft(record.id,password)).resolves.toBeNull();
 });
});
