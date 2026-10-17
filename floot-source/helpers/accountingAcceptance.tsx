import {sql} from "kysely";
import {createHash} from "node:crypto";
import {db} from "./db";
import {accountingBackupTables} from "./accountingBackupTables";
import {accountingWrite} from "./accountingWrite";
import {accountingRead} from "./accountingRead";
import {accountingSnapshot} from "./accountingSnapshot";
import {accountingCrypto} from "./accountingCrypto";
import {accountingRestoreCheck} from "./accountingRestoreCheck";
import {accountingReport} from "./accountingReport";
// Developer acceptance run. Every table and every sequence is TEMPORARY.
// The transaction is rolled back deliberately, even after success.
export async function accountingAcceptance(){
 const checks:{name:string;passed:boolean;detail?:any}[]=[];let result:any;
 const finish=new Error("ARTK_QA_ROLLBACK");
 const check=(name:string,value:boolean,detail?:any)=>{checks.push({name,passed:value,detail});if(!value)throw Error("QA failed: "+name+" "+JSON.stringify(detail??null));};
 try{await db.transaction().execute(async tx=>{
  await sql.raw("SET LOCAL search_path TO pg_temp, public").execute(tx);
  for(const table of accountingBackupTables){
   const snake=table.replace(/[A-Z]/g,c=>"_"+c.toLowerCase());
   await sql.raw('CREATE TEMP TABLE "'+snake+'" (LIKE public."'+snake+'" INCLUDING ALL) ON COMMIT DROP').execute(tx);
   if(table!=="accountingOperations"){
    await sql.raw('CREATE TEMP SEQUENCE "qa_'+snake+'_id"').execute(tx);
    await sql.raw('ALTER TABLE pg_temp."'+snake+'" ALTER COLUMN id SET DEFAULT nextval(\'pg_temp.qa_'+snake+'_id\')').execute(tx);
   }
   const number=table==="accountingInvoices"||table==="accountingQuotes"?"document_no":table==="accountingReceipts"?"receipt_no":null;
   if(number){await sql.raw('CREATE TEMP SEQUENCE "qa_'+snake+'_no" START 1001').execute(tx);await sql.raw('ALTER TABLE pg_temp."'+snake+'" ALTER COLUMN '+number+' SET DEFAULT nextval(\'pg_temp.qa_'+snake+'_no\')').execute(tx);}
  }
  await tx.insertInto("accountingSettings").values({id:1,roundingDecimals:2}).execute();
  const user={id:999999,role:"admin"};
  let serial=0;const write=(x:any)=>accountingWrite(tx,user,{...x,requestKey:x.requestKey||"artk-isolated-qa-"+(++serial)});
  const customer=await write({kind:"customer",name:"عميل اختبار معزول",requestKey:"qa-customer-stable-key"});
  const duplicate=await write({kind:"customer",name:"عميل اختبار معزول",requestKey:"qa-customer-stable-key"});
  check("customer creation and idempotency",customer.id===duplicate.id&&duplicate.duplicate===true,{customer,duplicate,stored:await tx.selectFrom("accountingOperations").selectAll().execute()});
  await write({kind:"customer",id:Number(customer.id),name:"عميل اختبار معدل",phone:"000000000"});
  const project=await write({kind:"project",name:"مشروع اختبار",customerId:Number(customer.id),amount:24000});
  await write({kind:"projectStatus",id:Number(project.id),status:"قيد التنفيذ"});
  await write({kind:"cost",projectId:Number(project.id),amount:5800,description:"أجور اختبار"});
  check("project, status and quick cost",true);
  const supplier=await write({kind:"supplier",name:"مورد اختبار"});
  const material=await write({kind:"material",name:"مادة اختبار",unit:"متر",minQty:10});
  await write({kind:"purchase",supplierId:Number(supplier.id),items:[{materialId:Number(material.id),quantity:10,unitPrice:1000}]});
  await write({kind:"consume",materialId:Number(material.id),projectId:Number(project.id),quantity:2});
  const stock=await tx.selectFrom("accountingMaterials").selectAll().where("id","=",material.id).executeTakeFirstOrThrow();
  check("purchase and project material consumption",Number(stock.stockQty)===8&&Number(stock.avgCost)===1000);
  let rejected=false;try{await write({kind:"consume",materialId:Number(material.id),projectId:Number(project.id),quantity:99})}catch{rejected=true}check("negative stock rejected",rejected);
  const quote=await write({kind:"quote",customerId:Number(customer.id),projectId:Number(project.id),items:[{description:"طباعة بنر",quantity:2,unit:"حبة",unitPrice:1800},{description:"دفاتر",quantity:20,unit:"دفتر",unitPrice:800}]});
  rejected=false;try{await write({kind:"convertQuote",id:Number(quote.id)})}catch{rejected=true}check("unapproved quote cannot convert",rejected);
  await write({kind:"approveQuote",id:Number(quote.id)});
  const invoice=await write({kind:"convertQuote",id:Number(quote.id)});
  const convertedAgain=await write({kind:"convertQuote",id:Number(quote.id)});
  check("quote converts exactly once",invoice.id===convertedAgain.id);
  const first=await write({kind:"receipt",invoiceId:Number(invoice.id),customerId:Number(customer.id),amount:5000,method:"جيب",requestKey:"qa-receipt-stable-key"});
  await write({kind:"receipt",invoiceId:Number(invoice.id),customerId:Number(customer.id),amount:5000,method:"جيب",requestKey:"qa-receipt-stable-key"});
  let data=await accountingRead(tx,"admin");
  check("partial receipt and duplicate protection",data.receipts.length===1&&Number(data.invoices[0].amount)-Number(data.receipts[0].amount)===14600);
  check("receipt numbering starts at 1001",Number(data.receipts[0].receiptNo)===1001);
  rejected=false;try{await write({kind:"receipt",invoiceId:Number(invoice.id),amount:14601})}catch{rejected=true}check("overcollection rejected",rejected);
  await write({kind:"receipt",invoiceId:Number(invoice.id),amount:14600,method:"تحويل"});
  const invoice2=await write({kind:"invoice",customerId:Number(customer.id),projectId:Number(project.id),items:[{description:"لوحة صغيرة",quantity:1.5,unit:"متر",unitPrice:1200},{description:"تركيب",quantity:2,unit:"حبة",unitPrice:800}]});
  await write({kind:"receipt",invoiceId:Number(invoice2.id),amount:3400,method:"نقد"});
  await write({kind:"expense",amount:500,description:"مصروف عام تجريبي"});
  data=await accountingRead(tx,"admin");const totals=accountingReport(data);
  check("full collection, balances and profit",totals.debt===0&&totals.revenue===23000&&totals.cost===7800&&totals.profit===14700,totals.profit);
  const viewer=await accountingRead(tx,"user");
  check("server redacts costs, purchases and stock values",viewer.costs.length===0&&viewer.materials.length===0&&viewer.purchases.length===0&&!viewer.permissions.canManage);
  rejected=false;try{await accountingWrite(tx,{id:999998,role:"user"},{kind:"customer",name:"ممنوع"})}catch{rejected=true}check("non-admin financial write denied",rejected);
  const accountant={id:999996,role:"accountant"};
  const employee={id:999995,role:"user"};
  const accountantCustomer=await accountingWrite(tx,accountant,{kind:"customer",name:"عميل المحاسب",requestKey:"qa-accountant-customer"});
  check("accountant can create a customer",!!accountantCustomer.id);
  const employeeCost=await accountingWrite(tx,employee,{kind:"cost",projectId:Number(project.id),amount:100,description:"مصروف موظف",requestKey:"qa-employee-cost"});
  const employeeStatus=await accountingWrite(tx,employee,{kind:"projectStatus",id:Number(project.id),status:"قيد التنفيذ",requestKey:"qa-employee-status"});
  check("employee can add project cost and change status",!!employeeCost.id&&employeeStatus.id===project.id);
  for(const kind of ["invoice","receipt"] as const){
   rejected=false;
   try{
    await accountingWrite(tx,employee,kind==="invoice"
     ?{kind,customerId:Number(customer.id),items:[{description:"ممنوع",quantity:1,unitPrice:100}],requestKey:"qa-employee-invoice"}
     :{kind,invoiceId:Number(invoice.id),amount:100,requestKey:"qa-employee-receipt"});
   }catch{rejected=true}
   check("employee cannot create "+kind,rejected);
  }
  const employeeView=await accountingRead(tx,"user");
  const accountantView=await accountingRead(tx,"accountant");
  check("employee costs are redacted",employeeView.costs.length===0&&!employeeView.permissions.canViewCosts);
  check("accountant can view costs but cannot back up",accountantView.permissions.canViewCosts&&!accountantView.permissions.canBackup);

  const beforeVoids=accountingReport(await accountingRead(tx,"admin"));
  const invoice3=await write({kind:"invoice",customerId:Number(customer.id),items:[{description:"فاتورة للإلغاء",quantity:1,unitPrice:1000}]});
  const receipt3=await write({kind:"receipt",invoiceId:Number(invoice3.id),amount:400});
  rejected=false;try{await write({kind:"void",entity:"invoice",id:Number(invoice3.id),reason:"خطأ إدخال"})}catch{rejected=true}
  check("invoice with an active receipt cannot be voided",rejected);
  const voidedReceipt=await write({kind:"void",entity:"receipt",id:Number(receipt3.id),reason:"خطأ إدخال"});
  const voidedAgain=await write({kind:"void",entity:"receipt",id:Number(receipt3.id),reason:"خطأ إدخال"});
  check("voiding an already voided receipt keeps its id",voidedReceipt.id===voidedAgain.id&&voidedReceipt.id===receipt3.id);
  const voidedInvoice=await write({kind:"void",entity:"invoice",id:Number(invoice3.id),reason:"خطأ إدخال"});
  check("invoice can be voided after its receipt",voidedInvoice.id===invoice3.id);
  rejected=false;try{await write({kind:"receipt",invoiceId:Number(invoice3.id),amount:100})}catch{rejected=true}
  check("voided invoice cannot receive payments",rejected);
  const afterVoids=accountingReport(await accountingRead(tx,"admin"));
  check("voids preserve revenue, receipts and debt",afterVoids.revenue===beforeVoids.revenue&&afterVoids.received===beforeVoids.received&&afterVoids.debt===beforeVoids.debt);
  const voidAudits=await tx.selectFrom("accountingAudit").select("details").where("operation","=","void").execute();
  check("void audit records include reasons",voidAudits.length>=2&&voidAudits.every(a=>typeof a.details==="object"&&a.details!==null&&"reason" in a.details&&a.details.reason==="خطأ إدخال"));

  const preliminary=await write({kind:"invoice",title:"فاتورة أولية",customerId:Number(customer.id),items:[{description:"فاتورة أولية",quantity:1,unitPrice:100}]});
  await write({kind:"finalizeInvoice",id:Number(preliminary.id)});
  const finalized=await tx.selectFrom("accountingInvoices").select("title").where("id","=",preliminary.id).executeTakeFirstOrThrow();
  check("finalizeInvoice changes the title",finalized.title==="فاتورة");

  await tx.updateTable("accountingSettings").set({roundingDecimals:0}).where("id","=",1).execute();
  const rounded=await write({kind:"invoice",customerId:Number(customer.id),items:[{description:"تقريب",quantity:1,unitPrice:1234.56}]});
  const roundedInvoice=await tx.selectFrom("accountingInvoices").select("amount").where("id","=",rounded.id).executeTakeFirstOrThrow();
  check("zero-decimal rounding applies to invoices",Number(roundedInvoice.amount)===1235);
  await tx.updateTable("accountingSettings").set({roundingDecimals:2}).where("id","=",1).execute();

  const snapshot=await accountingSnapshot(tx);
  const fixtureKey=createHash("sha256").update("artk-public-test-fixture-only").digest();
  const envelope=accountingCrypto.encrypt(snapshot,fixtureKey,"qa-fixture-only");
  const decrypted=accountingCrypto.decrypt(envelope,fixtureKey);
  const restored=await accountingRestoreCheck(tx,decrypted);
  check("AES-GCM decrypt and isolated restore match",restored.ok,restored.rowCount);
  let tamper=false;try{accountingCrypto.decrypt({...envelope,ciphertext:envelope.ciphertext.slice(0,-6)+"AAAAAA"},fixtureKey)}catch{tamper=true}check("tampered backup rejected",tamper);
  result={ok:true,checks,restore:restored,fixtureEnvelope:envelope,fixtureData:data};
  throw finish;
 });}catch(e){if(e!==finish)throw e;}
 return result;
}
