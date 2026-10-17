import {randomUUID} from "node:crypto";
import {sql} from "kysely";
import {db} from "./db";
import {accountingBackupTables} from "./accountingBackupTables";
import {accountingWrite} from "./accountingWrite";
export async function accountingConcurrency(){
 const schema="artk_qa_"+randomUUID().replace(/-/g,"");const user={id:999997,role:"admin"};const checks:any[]=[];
 const assert=(name:string,pass:boolean)=>{checks.push({name,passed:pass});if(!pass)throw Error("Concurrent QA failed: "+name)};
 await db.transaction().execute(async tx=>{
  await sql.raw('CREATE SCHEMA "'+schema+'"').execute(tx);
  for(const table of accountingBackupTables){
   const name=table.replace(/[A-Z]/g,c=>"_"+c.toLowerCase());const fq='"'+schema+'"."'+name+'"';
   await sql.raw('CREATE TABLE '+fq+' (LIKE public."'+name+'" INCLUDING ALL)').execute(tx);
   if(table!=="accountingOperations"){await sql.raw('CREATE SEQUENCE "'+schema+'"."'+name+'_id"').execute(tx);await sql.raw('ALTER TABLE '+fq+' ALTER COLUMN id SET DEFAULT nextval(\''+schema+'.'+name+'_id\')').execute(tx);}
   const no=table==="accountingInvoices"||table==="accountingQuotes"?"document_no":table==="accountingReceipts"?"receipt_no":null;
   if(no){await sql.raw('CREATE SEQUENCE "'+schema+'"."'+name+'_no" START 1001').execute(tx);await sql.raw('ALTER TABLE '+fq+' ALTER COLUMN '+no+' SET DEFAULT nextval(\''+schema+'.'+name+'_no\')').execute(tx);}
  }
 });
 try{
  const write=(x:any)=>db.transaction().execute(tx=>accountingWrite(tx.withSchema(schema),user,{...x,requestKey:x.requestKey===null?undefined:x.requestKey||randomUUID()}));
  const c=await write({kind:"customer",name:"عميل تزامن معزول"}),p=await write({kind:"project",name:"مشروع تزامن",customerId:Number(c.id),amount:100});
  const i=await write({kind:"invoice",customerId:Number(c.id),items:[{description:"اختبار التزامن",quantity:1,unitPrice:100}]});
  const r=await Promise.all([1,2].map(()=>write({kind:"receipt",invoiceId:Number(i.id),amount:60,requestKey:"concurrent-same-operation"})));
  assert("simultaneous identical receipts create one record",r[0].id===r[1].id);
  const conflicting=await Promise.allSettled([1,2].map(()=>write({kind:"receipt",invoiceId:Number(i.id),amount:30})));
  assert("simultaneous receipts cannot exceed balance",conflicting.filter(x=>x.status==="fulfilled").length===1);
  const legacy=await Promise.all([1,2].map(()=>write({kind:"receipt",invoiceId:Number(i.id),amount:5,requestKey:null})));
  assert("legacy clients also deduplicate rapid repeats",legacy[0].id===legacy[1].id);
  const q=await write({kind:"quote",customerId:Number(c.id),items:[{description:"عرض تزامن",quantity:1,unitPrice:50}]});await write({kind:"approveQuote",id:Number(q.id)});
  const converted=await Promise.all([1,2].map(()=>write({kind:"convertQuote",id:Number(q.id)})));assert("simultaneous quote conversion creates one invoice",converted[0].id===converted[1].id);
  const s=await write({kind:"supplier",name:"مورد تزامن"}),m=await write({kind:"material",name:"مادة تزامن",unit:"حبة"});
  await write({kind:"purchase",supplierId:Number(s.id),items:[{materialId:Number(m.id),quantity:10,unitPrice:1000}]});
  const consumes=await Promise.allSettled([1,2].map(()=>write({kind:"consume",materialId:Number(m.id),projectId:Number(p.id),quantity:7})));
  const stock=await db.withSchema(schema).selectFrom("accountingMaterials").select("stockQty").where("id","=",m.id).executeTakeFirstOrThrow();
  assert("concurrent stock consumption cannot go negative",consumes.filter(x=>x.status==="fulfilled").length===1&&Number(stock.stockQty)===3);
  const receipts=await db.withSchema(schema).selectFrom("accountingReceipts").select("amount").execute();
  assert("final concurrent balance remains correct",receipts.reduce((s,x)=>s+Number(x.amount),0)===95);
  return {ok:true,checks,isolatedSchemaRemoved:true};
 }finally{await sql.raw('DROP SCHEMA "'+schema+'" CASCADE').execute(db);}
}
