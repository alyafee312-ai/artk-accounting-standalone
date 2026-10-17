import type { DraftRecord } from './sealDraft';
export function validateDraft(record: DraftRecord): void {
  if (!record.id || !record.createdAt) throw new Error('Missing record identity');
  if (!['customer','project','invoice','receipt','expense'].includes(record.type)) throw new Error('Unsupported record type');
  if (record.amount !== undefined && (!Number.isSafeInteger(record.amount) || record.amount < 0)) {
    throw new Error('Invalid amount in Yemeni rials');
  }
}
