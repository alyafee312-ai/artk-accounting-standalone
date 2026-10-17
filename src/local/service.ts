import type {Kysely} from 'kysely';
import type {AccountingData} from '../../floot-source/endpoints/accounting_GET.schema';
import {passwordHash} from './password';
import {accountingWrite} from './accountingWrite';
import {accountingRead} from './accountingRead';
import {accountingAccess} from './accountingAccess';
export class Ledger {
 private queue:Promise<unknown>=Promise.resolve();
 constructor(readonly db:Kysely<any>,readonly user={id:1,role:'admin'}){}
 serial<T>(fn:()=>Promise<T>):Promise<T>{const result=this.queue.then(fn);this.queue=result.catch(()=>{});return result;}
 write(input:unknown){return this.serial(()=>this.db.transaction().execute(tx=>accountingWrite(tx,this.user,input)));}
 read(){return this.serial(async()=>{const data=await accountingRead(this.db,this.user.role);if(!data.permissions.canViewCosts){
  data.invoices=data.invoices.map(({amount,items,...r})=>r);data.receipts=data.receipts.map(({amount,...r})=>r);data.quotes=data.quotes.map(({amount,items,...r})=>r);
 }return data as AccountingData;});}
 users(){return this.serial(async()=>{accountingAccess.assertAdmin(this.user.role);return this.db.selectFrom('users').select(['id','displayName','email','role','disabledAt']).execute()})}
 userAction(input:{id?:number;displayName:string;email:string;role:string;password?:string;disabled?:boolean}){return this.serial(async()=>{accountingAccess.assertAdmin(this.user.role);if(!['admin','accountant','user'].includes(input.role)||input.displayName.trim().length<2||!input.email.trim())throw Error('بيانات المستخدم غير صالحة');
 const values:Record<string,unknown>={displayName:input.displayName.trim(),email:input.email.trim().toLowerCase(),role:input.role,disabledAt:input.disabled?new Date():null};
 if(input.password){if(input.password.length<8)throw Error('كلمة المرور أقل من 8 أحرف');const salt=crypto.randomUUID();values.passwordSalt=salt;values.passwordHash=await passwordHash(input.password,salt);values.attempts=0;values.nextAttempt=0}
 if(!input.id&&!input.password)throw Error('كلمة المرور مطلوبة');
 await this.db.transaction().execute(async tx=>{if(input.id){const old=await tx.selectFrom('users').selectAll().where('id','=',input.id).executeTakeFirstOrThrow();if(old.id===this.user.id&&(input.disabled||input.role!=='admin'))throw Error('لا يمكن تعطيل أو خفض صلاحية حسابك الحالي');if(old.role==='admin'&&(input.disabled||input.role!=='admin')){const admins=await tx.selectFrom('users').select('id').where('role','=','admin').where('disabledAt','is',null).execute();if(admins.length<=1)throw Error('يجب إبقاء مدير نشط')}await tx.updateTable('users').set(values).where('id','=',input.id).execute()}else await tx.insertInto('users').values(values).execute();await tx.insertInto('accountingAudit').values({userId:this.user.id,operation:'user:update',entityId:String(input.id||'new'),details:{role:input.role,disabled:!!input.disabled}}).execute()});
 });}
 close(){return this.serial(()=>this.db.destroy())}
 settings(values:Record<string,unknown>){return this.serial(async()=>{accountingAccess.assertAdmin(this.user.role);await this.db.transaction().execute(async tx=>{
  await tx.updateTable('accountingSettings').set(values).where('id','=',1).execute();
  await tx.insertInto('accountingAudit').values({userId:this.user.id,operation:'settings',entityId:'1',details:{summary:'settings'}}).execute();
 });});}
}
let current:Ledger|undefined;
export function useLedger(){if(!current)throw Error('قاعدة البيانات مقفلة');return current;}
export function setLedger(ledger:Ledger|undefined){current=ledger;}

export async function initialPasswordRequired(db:Kysely<any>){return !(await db.selectFrom('users').select('passwordHash').where('id','=',1).executeTakeFirstOrThrow()).passwordHash;}
export async function initializeAdmin(db:Kysely<any>,password:string){if(password.length<8)throw Error('كلمة المرور أقل من 8 أحرف');if(!await initialPasswordRequired(db))throw Error('الحساب مضبوط مسبقًا');const salt=crypto.randomUUID();await db.updateTable('users').set({passwordSalt:salt,passwordHash:await passwordHash(password,salt)}).where('id','=',1).where('passwordHash','is',null).execute();}
export async function authenticate(db:Kysely<any>,email:string,password:string){const u=await db.selectFrom('users').selectAll().where('email','=',email.trim().toLowerCase()).executeTakeFirst();if(!u||u.disabledAt||!u.passwordHash)throw Error('بيانات الدخول غير صحيحة');if(Date.now()<Number(u.nextAttempt))throw Error('انتظر قبل المحاولة التالية');const actual=await passwordHash(password,u.passwordSalt);if(actual!==u.passwordHash){const attempts=Number(u.attempts)+1;await db.updateTable('users').set({attempts,nextAttempt:Date.now()+Math.min(300000,2**Math.min(attempts,9)*1000)}).where('id','=',u.id).execute();throw Error('بيانات الدخول غير صحيحة')}await db.updateTable('users').set({attempts:0,nextAttempt:0}).where('id','=',u.id).execute();return {id:Number(u.id),role:String(u.role),name:String(u.displayName)};}
