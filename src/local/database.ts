import {Kysely,SqliteAdapter,SqliteIntrospector,SqliteQueryCompiler, type CompiledQuery, type DatabaseConnection, type QueryResult, type Driver} from 'kysely';
import {migrationV1} from './migration';
export interface SqlBackend {execute(sql:string,values?:unknown[]):Promise<Record<string,unknown>[]>; close():Promise<void>}
const encode=(v:unknown)=>v instanceof Date?v.toISOString():typeof v==='object'&&v!==null?JSON.stringify(v):v;
export function database(backend:SqlBackend){
 const connection:DatabaseConnection={
  async executeQuery<R>(q:CompiledQuery):Promise<QueryResult<R>>{
   const rows=await backend.execute(q.sql,q.parameters.map(encode));
   for(const row of rows)for(const k of ['items','details','result'])if(typeof row[k]==='string')row[k]=JSON.parse(row[k] as string);
   return {rows:rows as R[]};
  }, async *streamQuery<R>():AsyncIterableIterator<QueryResult<R>>{throw Error('Streaming unavailable');}
 };
 const driver:Driver={async init(){},async acquireConnection(){return connection},async beginTransaction(){await backend.execute('BEGIN IMMEDIATE')},async commitTransaction(){await backend.execute('COMMIT')},async rollbackTransaction(){await backend.execute('ROLLBACK')},async releaseConnection(){},async destroy(){await backend.close()}};
 return new Kysely<any>({dialect:{createAdapter:()=>new SqliteAdapter(),createDriver:()=>driver,createIntrospector:db=>new SqliteIntrospector(db),createQueryCompiler:()=>new SqliteQueryCompiler()}});
}
export async function migrate(backend:SqlBackend){
 await backend.execute('PRAGMA foreign_keys=ON');
 const version=Number((await backend.execute('PRAGMA user_version'))[0]?.user_version||0);
 if(version>2)throw Error('إصدار قاعدة البيانات أحدث من التطبيق');
 if(version===0){await backend.execute('BEGIN IMMEDIATE');try{
 for(const statement of migrationV1.split(';').filter(s=>s.trim()))await backend.execute(statement);
 await backend.execute('CREATE TABLE users (id INTEGER PRIMARY KEY, displayName TEXT NOT NULL, role TEXT NOT NULL, email TEXT UNIQUE, passwordSalt TEXT, passwordHash TEXT, disabledAt TEXT, attempts INTEGER NOT NULL DEFAULT 0, nextAttempt INTEGER NOT NULL DEFAULT 0)');
 await backend.execute("INSERT INTO users(id,displayName,role,email) VALUES (1,'المدير','admin','admin')");
 await backend.execute("INSERT INTO accountingSettings(id,companyName,tagline) VALUES (1,'أرتك للديكور والإعلان','التصميم • الطباعة • الديكور')");
 await backend.execute('PRAGMA user_version=2');await backend.execute('COMMIT');
 }catch(e){await backend.execute('ROLLBACK');throw e;}}
 if(version===1){await backend.execute('BEGIN IMMEDIATE');try{for(const statement of [
  'ALTER TABLE users ADD COLUMN email TEXT',
  'ALTER TABLE users ADD COLUMN passwordSalt TEXT',
  'ALTER TABLE users ADD COLUMN passwordHash TEXT',
  'ALTER TABLE users ADD COLUMN disabledAt TEXT',
  'ALTER TABLE users ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE users ADD COLUMN nextAttempt INTEGER NOT NULL DEFAULT 0',
  'CREATE UNIQUE INDEX users_email ON users(email)',
  "UPDATE users SET email='admin' WHERE id=1",
  'PRAGMA user_version=2'])await backend.execute(statement);await backend.execute('COMMIT')}catch(e){await backend.execute('ROLLBACK');throw e}}
 const check=await backend.execute('PRAGMA integrity_check');
 if(check[0]?.integrity_check!=='ok')throw Error('فشل فحص سلامة قاعدة البيانات');
}
