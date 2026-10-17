import {Capacitor} from '@capacitor/core';
import {Preferences} from '@capacitor/preferences';
import {CapacitorSQLite,SQLiteConnection} from '@capacitor-community/sqlite';
import {type SqlBackend} from './database';
export async function nativeBackend(selectedName?:string):Promise<SqlBackend>{
 if(!Capacitor.isNativePlatform())throw Error('التخزين الدائم الآمن متاح في تطبيق أندرويد. معاينة المتصفح لا تحفظ البيانات.');
 const name=selectedName||(await Preferences.get({key:'artk.active.ledger'})).value||'artk_ledger';
 const sqlite=new SQLiteConnection(CapacitorSQLite);
 if(!(await sqlite.isSecretStored()).result){
  const secret=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x=>x.toString(16).padStart(2,'0')).join('');
  await sqlite.setEncryptionSecret(secret);
 }
 const db=await sqlite.createConnection(name,true,'secret',1,false);await db.open();
 return {async execute(sql,values=[]){
  if(/^BEGIN\b/i.test(sql)){await db.beginTransaction();return []}if(sql==='COMMIT'){await db.commitTransaction();return []}if(sql==='ROLLBACK'){await db.rollbackTransaction();return []}
  if(/^\s*(SELECT|PRAGMA|WITH)\b/i.test(sql)||/\breturning\b/i.test(sql))return (await db.query(sql,values)).values||[];
  await db.run(sql,values,false);return [];
 },async close(){await sqlite.closeConnection(name,false)}};
}

export async function deleteTestDatabase(name:string){if(!name.startsWith('artk_verify_'))throw Error('غير مسموح');const sqlite=new SQLiteConnection(CapacitorSQLite);const db=await sqlite.createConnection(name,true,'secret',1,false);await db.open();try{await db.delete()}finally{await sqlite.closeConnection(name,false)}}
