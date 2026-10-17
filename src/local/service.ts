import type {Kysely} from 'kysely';
import type {AccountingData} from '../../floot-source/endpoints/accounting_GET.schema';
import {accountingWrite} from './accountingWrite';
import {accountingRead} from './accountingRead';
import {accountingAccess} from './accountingAccess';
export class Ledger {
 private queue:Promise<unknown>=Promise.resolve();
 constructor(readonly db:Kysely<any>,readonly user={id:1,role:'admin'}){}
 private serial<T>(fn:()=>Promise<T>):Promise<T>{const result=this.queue.then(fn);this.queue=result.catch(()=>{});return result;}
 write(input:unknown){return this.serial(()=>this.db.transaction().execute(tx=>accountingWrite(tx,this.user,input)));}
 read(){return this.serial(async()=>{const data=await accountingRead(this.db,this.user.role);if(!data.permissions.canViewCosts){
  data.invoices=data.invoices.map(({amount,items,...r})=>r);data.receipts=data.receipts.map(({amount,...r})=>r);data.quotes=data.quotes.map(({amount,items,...r})=>r);
 }return data as AccountingData;});}
 settings(values:Record<string,unknown>){return this.serial(async()=>{accountingAccess.assertAdmin(this.user.role);await this.db.transaction().execute(async tx=>{
  await tx.updateTable('accountingSettings').set(values).where('id','=',1).execute();
  await tx.insertInto('accountingAudit').values({userId:this.user.id,operation:'settings',entityId:'1',details:{summary:'settings'}}).execute();
 });});}
}
let current:Ledger|undefined;
export function useLedger(){if(!current)throw Error('قاعدة البيانات مقفلة');return current;}
export function setLedger(ledger:Ledger|undefined){current=ledger;}
