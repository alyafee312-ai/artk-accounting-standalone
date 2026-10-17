import {Kysely,sql} from "kysely";
import {sha256} from "./sha256";
import Decimal from "decimal.js";
import {accountingValidation} from "./accountingValidation";
import {accountingMath} from "./accountingMath";
import {accountingAccess} from "./accountingAccess";
import {getAccountingSettings} from "./accountingSettings";

// Caller supplies a transaction. Every financial mutation, its audit entry and
// idempotent result commit together, or none of them do.
export async function accountingWrite(tx:Kysely<any>,user:{id:number;role:string},raw:unknown){
 const input=accountingValidation.parse(raw);
 accountingAccess.assertCanWrite(user.role,input.kind);
 const {requestKey,...payload}=input;
 const hash=await sha256(JSON.stringify(payload));
 const key=requestKey||"legacy:"+hash;
 // Local service serializes writes; SQLite holds the transaction lock.
 const prior=await tx.selectFrom("accountingOperations").selectAll().where("userId","=",user.id).where("requestKey","=",key).executeTakeFirst();
 if(prior&&(requestKey||Date.now()-new Date(prior.createdAt).getTime()<30000)){
  if(prior.payloadHash!==hash)throw new Error("تغيرت بيانات العملية؛ افتح نموذجًا جديدًا");
  return {...(typeof prior.result==="string"?JSON.parse(prior.result):prior.result),duplicate:true};
 }
 const settings=await getAccountingSettings(tx);
 const decimals=settings.roundingDecimals===0?0:2;
 let details: Record<string, unknown>={role:user.role,summary:input.kind};
 const day=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Aden",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
 const date=("date" in input&&input.date)||day;
 const requireRow=async(table:string,id:number|string)=>{const row=await tx.selectFrom(table).selectAll().where("id","=",String(id)).executeTakeFirst();if(!row)throw new Error("السجل المرتبط غير موجود");return row;};
 const projectCustomer=async(projectId:number|undefined,customerId:number|undefined)=>{
  if(customerId)await requireRow("accountingCustomers",customerId);
  if(projectId){const p=await requireRow("accountingProjects",projectId);if(String(p.customerId)!==String(customerId))throw new Error("المشروع لا يخص العميل المختار");}
 };
 let id:string;
 if(input.kind==="customer"||input.kind==="supplier"){
  const table=input.kind==="customer"?"accountingCustomers":"accountingSuppliers";
  const values={name:input.name,phone:input.phone,address:input.address,notes:input.notes};
  if(input.id){
   const old=await requireRow(table,input.id);
   details={role:user.role,before:{name:old.name,phone:old.phone,address:old.address,notes:old.notes},after:values};
   await tx.updateTable(table).set(values).where("id","=",String(input.id)).execute();id=String(input.id);
  }
  else id=String((await tx.insertInto(table).values(values).returning("id").executeTakeFirstOrThrow()).id);
 }else if(input.kind==="project"){
  if(input.customerId)await requireRow("accountingCustomers",input.customerId);
  const values={name:input.name,customerId:input.customerId??null,amount:accountingMath.money(input.amount,decimals),status:input.status,workType:input.workType,notes:input.notes};
  if(input.id){
   const old=await requireRow("accountingProjects",input.id);
   if(String(old.customerId)!==String(input.customerId??null)){
    const linked=await tx.selectFrom("accountingInvoices").select("id").where("projectId","=",String(input.id)).executeTakeFirst();
    const quote=await tx.selectFrom("accountingQuotes").select("id").where("projectId","=",String(input.id)).executeTakeFirst();
    if(linked||quote)throw new Error("لا يمكن تغيير عميل مشروع مرتبط بمستندات");
   }
   details={role:user.role,before:{name:old.name,customerId:old.customerId,amount:old.amount,status:old.status,workType:old.workType,notes:old.notes},after:values};
   await tx.updateTable("accountingProjects").set(values).where("id","=",String(input.id)).execute();id=String(input.id);
  }else id=String((await tx.insertInto("accountingProjects").values(values).returning("id").executeTakeFirstOrThrow()).id);
 }else if(input.kind==="projectStatus"){
  const old=await requireRow("accountingProjects",input.id);
  details={role:user.role,before:{status:old.status},after:{status:input.status}};
  await tx.updateTable("accountingProjects").set({status:input.status}).where("id","=",String(input.id)).execute();id=String(input.id);
 }else if(input.kind==="cost"){
  const project=await requireRow("accountingProjects",input.projectId);
  if(project.status==="ملغي"||project.status==="مغلق")throw new Error("المشروع مغلق؛ لا يمكن إضافة مصروف");
  const amount=accountingMath.money(input.amount,decimals);
  id=String((await tx.insertInto("accountingProjectCosts").values({projectId:input.projectId,amount,description:input.description,incurredOn:date,source:"manual"}).returning("id").executeTakeFirstOrThrow()).id);
  details={role:user.role,summary:"cost",amount};
 }else if(input.kind==="invoice"||input.kind==="quote"){
  await projectCustomer(input.projectId,input.customerId);
  const items=input.items||[{description:input.description,quantity:1,unit:"وحدة",unitPrice:input.amount}];
  const amount=accountingMath.total(items,decimals);if(new Decimal(amount).lte(0))throw new Error("الإجمالي يجب أن يكون أكبر من صفر");
  const values={customerId:input.customerId??null,projectId:input.projectId??null,description:items.map(i=>i.description).join("، "),amount,items,issuedOn:date,notes:input.notes};
  const document=await tx.insertInto(input.kind==="invoice"?"accountingInvoices":"accountingQuotes").values({...values,...(input.kind==="invoice"?{title:input.title}:{status:"مسودة"})}).returning(["id","documentNo"]).executeTakeFirstOrThrow();
  id=String(document.id);
  details={role:user.role,summary:input.kind,amount,documentNo:String(document.documentNo)};
 }else if(input.kind==="approveQuote"||input.kind==="convertQuote"){
  const q=await tx.selectFrom("accountingQuotes").selectAll().where("id","=",String(input.id)).executeTakeFirst();
  if(!q)throw new Error("عرض السعر غير موجود");
  if(q.voidedAt)throw new Error("عرض السعر ملغى");
  if(q.convertedInvoiceId){id=String(input.kind==="convertQuote"?q.convertedInvoiceId:q.id);}
  else if(input.kind==="approveQuote"){await tx.updateTable("accountingQuotes").set({status:"معتمد"}).where("id","=",q.id).execute();id=String(q.id);}
  else{
   if(q.status!=="معتمد")throw new Error("اعتمد عرض السعر قبل تحويله");
   const invoice=await tx.insertInto("accountingInvoices").values({customerId:q.customerId,projectId:q.projectId,quoteId:q.id,amount:q.amount,description:q.description,items:q.items,title:"فاتورة",issuedOn:date,notes:q.notes}).returning("id").executeTakeFirstOrThrow();
   await tx.updateTable("accountingQuotes").set({status:"محول إلى فاتورة",convertedInvoiceId:invoice.id}).where("id","=",q.id).execute();id=String(invoice.id);
  }
 }else if(input.kind==="receipt"){
  if(!input.invoiceId)throw new Error("اربط التحصيل بفاتورة لمنع تجاوز الرصيد");
  const invoice=await tx.selectFrom("accountingInvoices").selectAll().where("id","=",String(input.invoiceId)).executeTakeFirst();
  if(!invoice)throw new Error("الفاتورة غير موجودة");
  if(invoice.voidedAt)throw new Error("الفاتورة ملغاة");
  if(input.customerId&&String(input.customerId)!==String(invoice.customerId))throw new Error("العميل لا يطابق عميل الفاتورة");
  const paid=await tx.selectFrom("accountingReceipts").select("amount").where("invoiceId","=",invoice.id).where("voidedAt","is",null).execute();
  const balance=accountingMath.balance(invoice.amount,paid.map(p=>p.amount));
  const amount=accountingMath.money(input.amount,decimals);
  if(new Decimal(amount).lte(0)||new Decimal(amount).gt(balance))throw new Error("التحصيل يتجاوز المبلغ المتبقي للفاتورة");
  const receipt=await tx.insertInto("accountingReceipts").values({invoiceId:invoice.id,customerId:invoice.customerId,amount,method:input.method,receivedOn:date,notes:input.notes}).returning(["id","receiptNo"]).executeTakeFirstOrThrow();
  id=String(receipt.id);
  details={role:user.role,summary:"receipt",amount,documentNo:String(receipt.receiptNo)};
 }else if(input.kind==="expense"){
  const amount=accountingMath.money(input.amount,decimals);
  id=String((await tx.insertInto("accountingExpenses").values({amount,description:input.description,category:input.category,method:input.method,incurredOn:date}).returning("id").executeTakeFirstOrThrow()).id);
  details={role:user.role,summary:"expense",amount};
 }else if(input.kind==="material"){
  const values={name:input.name,unit:input.unit,minQty:input.minQty};
  if(input.id){const old=await requireRow("accountingMaterials",input.id);if(old.unit!==input.unit&&Number(old.stockQty)!==0)throw new Error("لا يمكن تغيير وحدة مادة لها رصيد");details={role:user.role,before:{name:old.name,unit:old.unit,minQty:old.minQty},after:values};await tx.updateTable("accountingMaterials").set(values).where("id","=",String(input.id)).execute();id=String(input.id);}
  else id=String((await tx.insertInto("accountingMaterials").values(values).returning("id").executeTakeFirstOrThrow()).id);
 }else if(input.kind==="purchase"){
  await requireRow("accountingSuppliers",input.supplierId);
  if(new Set(input.items.map(i=>i.materialId)).size!==input.items.length)throw new Error("اجمع كمية المادة في بند واحد");
  const amount=accountingMath.total(input.items,decimals);if(Number(amount)<=0)throw new Error("إجمالي الشراء غير صحيح");
  details={role:user.role,summary:"purchase",amount};
  const purchase=await tx.insertInto("accountingPurchases").values({supplierId:input.supplierId,amount,items:input.items,purchasedOn:date,notes:input.notes}).returning("id").executeTakeFirstOrThrow();id=String(purchase.id);
  for(const line of [...input.items].sort((a,b)=>a.materialId-b.materialId)){
   const m=await tx.selectFrom("accountingMaterials").selectAll().where("id","=",String(line.materialId)).executeTakeFirst();
   if(!m)throw new Error("المادة غير موجودة");
   await tx.updateTable("accountingMaterials").set({stockQty:new Decimal(m.stockQty).plus(line.quantity).toFixed(3),avgCost:accountingMath.average(m.stockQty,m.avgCost,line.quantity,line.unitPrice)}).where("id","=",m.id).execute();
   await tx.insertInto("accountingStockMovements").values({materialId:m.id,kind:"purchase",quantity:line.quantity,unitCost:line.unitPrice,amount:accountingMath.total([line],decimals),purchaseId:id,movedOn:date}).execute();
  }
 }else if(input.kind==="finalizeInvoice"){
  const invoice=await tx.selectFrom("accountingInvoices").selectAll().where("id","=",String(input.id)).executeTakeFirst();
  if(!invoice)throw new Error("الفاتورة غير موجودة");
  if(invoice.voidedAt)throw new Error("الفاتورة ملغاة");
  id=String(invoice.id);
  if(invoice.title!=="فاتورة"){
   await tx.updateTable("accountingInvoices").set({title:"فاتورة"}).where("id","=",id).execute();
  }
  details={role:user.role,before:{title:invoice.title},after:{title:"فاتورة"}};
 }else if(input.kind==="void"){
  const table={
   invoice:"accountingInvoices",receipt:"accountingReceipts",
   cost:"accountingProjectCosts",expense:"accountingExpenses",quote:"accountingQuotes"
  } as const;
  const row=await tx.selectFrom(table[input.entity]).selectAll().where("id","=",String(input.id)).executeTakeFirst();
  if(!row)throw new Error("السجل المرتبط غير موجود");
  id=String(row.id);
  if(!row.voidedAt){
   if(input.entity==="invoice"){
    const receipt=await tx.selectFrom("accountingReceipts").select("id").where("invoiceId","=",id).where("voidedAt","is",null).executeTakeFirst();
    if(receipt)throw new Error("ألغِ سندات القبض المرتبطة أولًا");
   }
   if(input.entity==="quote"&&"convertedInvoiceId" in row&&row.convertedInvoiceId)throw new Error("لا يمكن إلغاء عرض سعر محول إلى فاتورة");
   if(input.entity==="cost"&&"source" in row&&row.source.startsWith("stock:"))throw new Error("هذه تكلفة صرف مخزون؛ لا تُلغى من هنا");
   await tx.updateTable(table[input.entity]).set({voidedAt:new Date(),voidReason:input.reason}).where("id","=",id).execute();
  }
  details={role:user.role,entity:input.entity,reason:input.reason,before:JSON.parse(JSON.stringify(row))};
 }else{
  await requireRow("accountingProjects",input.projectId);
  const m=await tx.selectFrom("accountingMaterials").selectAll().where("id","=",String(input.materialId)).executeTakeFirst();
  if(!m)throw new Error("المادة غير موجودة");
  if(new Decimal(input.quantity).gt(m.stockQty))throw new Error("الكمية المطلوبة أكبر من المخزون");
  const amount=accountingMath.total([{quantity:input.quantity,unitPrice:Number(m.avgCost)}],decimals);
  await tx.updateTable("accountingMaterials").set({stockQty:new Decimal(m.stockQty).minus(input.quantity).toFixed(3)}).where("id","=",m.id).execute();
  const movement=await tx.insertInto("accountingStockMovements").values({materialId:m.id,kind:"consume",quantity:input.quantity,unitCost:m.avgCost,amount,projectId:input.projectId,movedOn:date}).returning("id").executeTakeFirstOrThrow();id=String(movement.id);
  if(Number(amount)>0)await tx.insertInto("accountingProjectCosts").values({projectId:input.projectId,amount,description:"استهلاك "+m.name+" — "+input.quantity+" "+m.unit,incurredOn:date,source:"stock:"+id}).execute();
 }
 const result={ok:true as const,id};
 await tx.insertInto("accountingOperations").values({userId:user.id,requestKey:key,payloadHash:hash,result}).onConflict(oc=>oc.columns(["userId","requestKey"]).doUpdateSet({payloadHash:hash,result,createdAt:new Date()})).execute();
 await tx.insertInto("accountingAudit").values({userId:user.id,operation:input.kind,entityId:id,details}).execute();
 return result;
}
