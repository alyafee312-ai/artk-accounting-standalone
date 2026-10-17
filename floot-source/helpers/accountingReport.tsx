import {AccountingData} from "../endpoints/accounting_GET.schema";
import Decimal from "decimal.js";
export function accountingReport(d:AccountingData,from="",to="",customerId="",projectId=""){
 const sum=(rows:any[])=>rows.reduce((s,x)=>s.plus(x.amount),new Decimal(0)).toNumber();
 const day=(v:any)=>typeof v==="string"?v.slice(0,10):new Date(v).toISOString().slice(0,10);
 const period=(row:any,key:string)=>{const date=day(row[key]||row.createdAt);return (!from||date>=from)&&(!to||date<=to);};
 const project=(id:any)=>d.projects.find(x=>String(x.id)===String(id));
 const activeInvoices=d.invoices.filter(x=>!x.voidedAt);
 const activeReceipts=d.receipts.filter(x=>!x.voidedAt&&activeInvoices.some(i=>String(i.id)===String(x.invoiceId)));
 const activeCosts=d.costs.filter(x=>!x.voidedAt);
 const inv=activeInvoices.filter(x=>period(x,"issuedOn")&&(!customerId||String(x.customerId)===customerId)&&(!projectId||String(x.projectId)===projectId));
 const receipts=activeReceipts.filter(x=>period(x,"receivedOn")&&(!customerId||String(x.customerId)===customerId)&&(!projectId||activeInvoices.some(i=>String(i.id)===String(x.invoiceId)&&String(i.projectId)===projectId)));
 const costs=activeCosts.filter(x=>period(x,"incurredOn")&&(!projectId||String(x.projectId)===projectId)&&(!customerId||String(project(x.projectId)?.customerId)===customerId));
 const expenses=(!customerId&&!projectId)?d.expenses.filter(x=>!x.voidedAt&&period(x,"incurredOn")):[];
 const purchases=(!customerId&&!projectId)?d.purchases.filter(x=>period(x,"purchasedOn")):[];
 const debts=d.customers.filter(c=>!customerId||String(c.id)===customerId).map(c=>{
  const invoices=activeInvoices.filter(i=>String(i.customerId)===String(c.id)&&(!projectId||String(i.projectId)===projectId));
  const paid=activeReceipts.filter(r=>invoices.some(i=>String(i.id)===String(r.invoiceId)));
  return {id:c.id,name:c.name,billed:sum(invoices),paid:sum(paid),balance:sum(invoices)-sum(paid)};
 });
 const projects=d.projects.filter(p=>(!customerId||String(p.customerId)===customerId)&&(!projectId||String(p.id)===projectId)).map(p=>{
  const revenue=sum(inv.filter(i=>String(i.projectId)===String(p.id)));
  const cost=sum(costs.filter(c=>String(c.projectId)===String(p.id)));
  return {...p,revenue,cost,profit:revenue-cost};
 });
 const visibleProjects=d.projects.filter(p=>(!customerId||String(p.customerId)===customerId)&&(!projectId||String(p.id)===projectId));
 const notDone=visibleProjects.filter(p=>!["جاهز","تم التسليم","مغلق","ملغي"].includes(p.status));
 const notDelivered=visibleProjects.filter(p=>!["تم التسليم","مغلق","ملغي"].includes(p.status));
 const projectExpenses=visibleProjects.map(p=>{
  const projectCosts=costs.filter(c=>String(c.projectId)===String(p.id));
  return {id:p.id,name:p.name,customerName:d.customers.find(c=>String(c.id)===String(p.customerId))?.name,cost:sum(projectCosts),count:projectCosts.length};
 }).filter(p=>p.cost>0);
 return {invoices:inv,receipts,costs,expenses,purchases,debts,projects,notDone,notDelivered,projectExpenses,revenue:sum(inv),received:sum(receipts),cost:sum(costs),expense:sum(expenses),profit:sum(inv)-sum(costs)-sum(expenses),cashOut:sum(costs.filter(c=>c.source==="manual"))+sum(expenses)+sum(purchases),debt:debts.reduce((s,c)=>s+c.balance,0)};
}
