import type {AccountingData} from "../endpoints/accounting_GET.schema";
import {accountingReport} from "./accountingReport";

export function accountingDocument(kind:string,row:any,d:AccountingData,filters:{from?:string;to?:string;customerId?:string;projectId?:string}={}){
 const money=(n:number)=>Number(n||0).toLocaleString("ar-YE",{maximumFractionDigits:2})+" ر.ي";
 const date=(v:Date|string)=>new Date(v).toLocaleDateString("ar-YE",{timeZone:"Asia/Aden"});
 const name=(id:unknown)=>d.customers.find(c=>String(c.id)===String(id))?.name||"غير محدد";
 const company={name:d.settings?.companyName||"أرتك للديكور والإعلان",tagline:d.settings?.tagline||"التصميم • الطباعة • الديكور",phone:d.settings?.phone||"",address:d.settings?.address||"",logo:d.settings?.logoDataUrl||null,footer:d.settings?.documentFooter||""};
 const doc:{title:string;subtitle:string;columns:string[];rows:string[][];totals:[string,string][];notes:string;filename:string;company:typeof company}={title:"",subtitle:"",columns:[],rows:[],totals:[],notes:"",filename:"artk-document",company};
 const report=accountingReport(d,filters.from||"",filters.to||"",filters.customerId||"",filters.projectId||"");
 if(kind==="invoice"||kind==="quote"){
  doc.title=(kind==="quote"?"عرض سعر":row.title||"فاتورة أولية")+(row.voidedAt?" (ملغاة)":"");
  doc.filename=kind+"-"+row.documentNo;
  doc.subtitle="رقم "+row.documentNo+" · "+date(row.issuedOn||row.createdAt)+" · العميل: "+name(row.customerId);
  doc.columns=["البيان","الكمية","الوحدة","سعر الوحدة","الإجمالي"];
  const items=Array.isArray(row.items)&&row.items.length?row.items:[{description:row.description,quantity:1,unit:"وحدة",unitPrice:row.amount}];
  doc.rows=items.map((i:any)=>[i.description,String(i.quantity),i.unit||"وحدة",money(Number(i.unitPrice)),money(Number(i.quantity)*Number(i.unitPrice))]);
  doc.totals=[["الإجمالي",money(Number(row.amount))]];
  if(kind==="invoice"){
   const paid=d.receipts.filter(r=>!r.voidedAt&&String(r.invoiceId)===String(row.id)).reduce((s,r)=>s+Number(r.amount),0);
   doc.totals.push(["المدفوع",money(paid)],["المتبقي",money(row.voidedAt?0:Number(row.amount)-paid)]);
  }
  doc.notes=(row.notes||"")+(kind==="quote"?"\nعرض السعر ليس فاتورة ولا سند قبض.":"");
 }else if(kind==="receipt"){
  doc.title="سند قبض"+(row.voidedAt?" (ملغاة)":"");
  doc.filename="receipt-"+row.receiptNo;
  doc.subtitle="رقم "+row.receiptNo+" · "+date(row.receivedOn)+" · العميل: "+name(row.customerId);
  doc.columns=["البيان","القيمة"];
  doc.rows=[["المبلغ المستلم",money(Number(row.amount))],["وسيلة الدفع",row.method],["الفاتورة المرتبطة",String(d.invoices.find(i=>String(i.id)===String(row.invoiceId))?.documentNo||"—")]];
  doc.notes=row.notes||"";
 }else if(kind==="customer"){
  doc.title="كشف حساب عميل";doc.subtitle=row.name+(row.phone?" · "+row.phone:"");doc.filename="customer-statement-"+row.id;
  doc.columns=["التاريخ","البيان","مدين","دائن","الرصيد"];
  const entries=[...d.invoices.filter(i=>!i.voidedAt&&String(i.customerId)===String(row.id)).map(i=>({date:i.issuedOn||i.createdAt,description:"فاتورة "+i.documentNo,debit:Number(i.amount),credit:0})),...d.receipts.filter(r=>!r.voidedAt&&String(r.customerId)===String(row.id)&&d.invoices.some(i=>!i.voidedAt&&String(i.id)===String(r.invoiceId))).map(r=>({date:r.receivedOn||r.createdAt,description:"سند "+r.receiptNo+" · "+r.method,debit:0,credit:Number(r.amount)}))].sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime());
  let balance=0;
  doc.rows=entries.map(e=>{balance+=e.debit-e.credit;return [date(e.date),e.description,money(e.debit),money(e.credit),money(balance)]});
  doc.totals=[["إجمالي الفواتير",money(entries.reduce((s,e)=>s+e.debit,0))],["إجمالي التحصيل",money(entries.reduce((s,e)=>s+e.credit,0))],["رصيد الحساب",money(balance)]];
  doc.notes="المشاريع والعروض لا تُضاف إلى المديونية مرة ثانية. تُثبت المديونية بالفواتير والتحصيل بالسندات.";
 }else if(kind==="project"){
  doc.title="تكاليف وربح المشروع";doc.filename="project-"+row.id;doc.subtitle=row.name+" · "+name(row.customerId);
  doc.columns=["التاريخ","المصروف","المصدر","المبلغ"];
  doc.rows=d.costs.filter(c=>!c.voidedAt&&String(c.projectId)===String(row.id)).map(c=>[date(c.incurredOn),c.description,c.source==="manual"?"مصروف مباشر":"صرف مخزون",money(Number(c.amount))]);
  const r=accountingReport(d,"","","",String(row.id));
  doc.totals=[["قيمة التعاقد",money(Number(row.amount))],["المفوتر فعليًا",money(r.revenue)],["التكلفة",money(r.cost)],["الربح من المفوتر",money(r.profit)]];
 }else if(kind==="receivables"){
  const debts=report.debts.filter(c=>c.balance>0).sort((a,b)=>b.balance-a.balance);
  doc.title="مستحقات العملاء";doc.filename="artk-receivables";doc.columns=["العميل","المفوتر","المدفوع","المتبقي"];
  doc.rows=debts.map(c=>[c.name,money(c.billed),money(c.paid),money(c.balance)]);
  doc.totals=[["إجمالي المستحقات",money(debts.reduce((sum,c)=>sum+c.balance,0))]];
 }else if(kind==="unfinished"){
  doc.title="أعمال غير منفذة وغير مسلّمة";doc.filename="artk-unfinished";
  doc.columns=["المشروع","العميل","الحالة","قيمة التعاقد"];
  doc.rows=report.notDelivered.map(p=>[p.name,name(p.customerId),p.status,money(Number(p.amount))]);
  doc.totals=[["غير منفذة",String(report.notDone.length)],["غير مسلّمة",String(report.notDelivered.length)]];
 }else if(kind==="projectExpenses"){
  doc.title="مصروفات المشاريع";doc.filename="artk-project-expenses";
  doc.columns=["المشروع","عدد المصروفات","الإجمالي"];
  doc.rows=report.projectExpenses.map(p=>[p.name,String(p.count),money(p.cost)]);
  doc.totals=[["إجمالي مصروفات المشاريع",money(report.projectExpenses.reduce((sum,p)=>sum+p.cost,0))]];
 }else{
  doc.title="تقرير الإيرادات والمصروفات";doc.filename="artk-report";
  doc.subtitle=(filters.from||"البداية")+" إلى "+(filters.to||"اليوم");
  doc.columns=["المشروع","الإيراد المفوتر","التكلفة","الربح"];
  doc.rows=report.projects.map(p=>[p.name,money(p.revenue),money(p.cost),money(p.profit)]);
  doc.totals=[["الإيراد المفوتر",money(report.revenue)],["التحصيلات",money(report.received)],["تكاليف المشاريع",money(report.cost)],["المصروفات العامة",money(report.expense)],["الربح",money(report.profit)],["مديونية العملاء الحالية",money(report.debt)]];
  doc.notes="الإيراد من الفواتير فقط؛ شراء المخزون يظهر في التدفق النقدي وتُحمّل تكلفته عند استهلاكه. مديونية العملاء تشمل الرصيد الحالي الكامل.";
 }
 if(row?.voidedAt)doc.notes+=(doc.notes?"\n":"")+"ملغى — سبب الإلغاء: "+(row.voidReason||"غير محدد");
 return doc;
}
