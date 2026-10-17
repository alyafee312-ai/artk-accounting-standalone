export interface AccountingRecord {
  id: string;
  type: 'customer' | 'project' | 'invoice' | 'receipt' | 'expense';
  amount?: number;
  revision: number;
}
export function validateAccountingRecord(record: AccountingRecord): boolean {
  return record.id.length > 0 &&
    Number.isInteger(record.revision) &&
    record.revision > 0 &&
    (record.amount === undefined ||
      (Number.isFinite(record.amount) && record.amount >= 0));
}
