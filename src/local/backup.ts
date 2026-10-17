import type {Kysely} from 'kysely';
import {sql} from 'kysely';
const encoder=new TextEncoder();
const b64=(v:Uint8Array)=>btoa(Array.from(v,b=>String.fromCharCode(b)).join(''));
const un64=(v:string)=>Uint8Array.from(atob(v),x=>x.charCodeAt(0));
async function key(password:string,salt:Uint8Array){if(password.length<10)throw Error('استخدم كلمة مرور من 10 أحرف على الأقل');const material=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt:salt as BufferSource,iterations:310000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
export async function sealBackup(value:unknown,password:string){const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode('artk-backup-v1')},await key(password,salt),encoder.encode(JSON.stringify(value)));return JSON.stringify({format:'artk-backup',version:1,salt:b64(salt),iv:b64(iv),ciphertext:b64(new Uint8Array(ciphertext))});}
export async function openBackup(text:string,password:string){if(text.length>50_000_000)throw Error('حجم النسخة كبير');const v=JSON.parse(text);if(v.format!=='artk-backup'||v.version!==1)throw Error('صيغة النسخة غير مدعومة');return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:un64(v.iv) as BufferSource,additionalData:encoder.encode('artk-backup-v1')},await key(password,un64(v.salt)),un64(v.ciphertext) as BufferSource)));}
export async function snapshot(db:Kysely<any>){const tables=(await sql<{name:string}>`select name from sqlite_master where type='table' and name not like 'sqlite_%'`.execute(db)).rows;const data:Record<string,unknown[]>={};for(const t of tables)data[t.name]=await db.selectFrom(t.name).selectAll().execute();return {schemaVersion:2,createdAt:new Date().toISOString(),tables:data};}
// Target must be a newly migrated, empty database. Existing ledgers are never overwritten.
export async function restoreIntoEmpty(db:Kysely<any>,value:unknown){
 const v=value as {schemaVersion:number;tables:Record<string,Record<string,unknown>[]>};
 if(!v||v.schemaVersion!==2||!v.tables||typeof v.tables!=='object')throw Error('بنية النسخة غير صالحة');
 await db.transaction().execute(async tx=>{
  const names=(await sql<{name:string}>`select name from sqlite_master where type='table' and name not like 'sqlite_%'`.execute(tx)).rows.map(r=>r.name);
  if(Object.keys(v.tables).sort().join()!==names.sort().join())throw Error('جداول النسخة لا تطابق إصدار التطبيق');
  for(const table of names){if(!Array.isArray(v.tables[table]))throw Error('بيانات الجدول غير صالحة');if(!['users','accountingSettings'].includes(table)&&(await tx.selectFrom(table).selectAll().limit(1).execute()).length)throw Error('الاستعادة مسموحة إلى قاعدة جديدة فارغة فقط');}
  await sql`PRAGMA defer_foreign_keys=ON`.execute(tx);
  await tx.deleteFrom('users').execute();await tx.deleteFrom('accountingSettings').execute();
  for(const table of names){const columns=(await sql.raw(`PRAGMA table_xinfo("${table}")`).execute(tx)).rows as {name:string;hidden:number}[];const allowed=new Set(columns.filter(c=>!c.hidden).map(c=>c.name));
   for(const raw of v.tables[table]){if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('سجل غير صالح');const row=Object.fromEntries(Object.entries(raw).filter(([k])=>allowed.has(k)));if(!Object.keys(row).length)throw Error('سجل فارغ');await tx.insertInto(table).values(row).execute();}
  }
  const violations=await sql`PRAGMA foreign_key_check`.execute(tx);if(violations.rows.length)throw Error('علاقات النسخة غير سليمة');
 });
 const integrity=await sql`PRAGMA integrity_check`.execute(db);if((integrity.rows[0] as any)?.integrity_check!=='ok')throw Error('فشل فحص سلامة النسخة');
}
