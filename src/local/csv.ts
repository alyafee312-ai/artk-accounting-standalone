import type {AccountingData} from '../../floot-source/endpoints/accounting_GET.schema';
import {accountingReport} from '../../floot-source/helpers/accountingReport';
export function accountingCsv(d:AccountingData,p:URLSearchParams){
 if(!d.permissions.canManage)throw Error('لا تملك صلاحية تصدير التقرير');
 const r=accountingReport(d,p.get('from')||'',p.get('to')||'',p.get('customerId')||'',p.get('projectId')||'');
 const customer=(id:unknown)=>d.customers.find(c=>String(c.id)===String(id))?.name||'';
 const date=(v:any)=>new Date(v).toISOString().slice(0,10);
 const rows:unknown[][]=[['النوع','الرقم','التاريخ','الوصف','المبلغ ر.ي','العميل','المشروع']];
 r.invoices.forEach(x=>rows.push(['فاتورة',x.documentNo,date(x.issuedOn),x.description,x.amount,customer(x.customerId),x.projectId||'']));
 r.receipts.forEach(x=>rows.push(['سند قبض',x.receiptNo,date(x.receivedOn),x.method,x.amount,customer(x.customerId),x.invoiceId||'']));
 r.costs.forEach(x=>rows.push(['تكلفة مشروع',x.id,date(x.incurredOn),x.description,x.amount,'',x.projectId]));
 r.expenses.forEach(x=>rows.push(['مصروف عام',x.id,date(x.incurredOn),x.description,x.amount,'','']));
 r.purchases.forEach(x=>rows.push(['شراء مخزون',x.id,date(x.purchasedOn),x.notes,x.amount,'','']));
 const cell=(v:unknown)=>{let s=String(v??'');if(/^[\s]*[=+@\-]/.test(s)||/^[\t\r\n]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'};
 return '\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n');
}
