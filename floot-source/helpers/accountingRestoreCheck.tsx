import {Kysely,sql} from "kysely";
import {accountingBackupTables} from "./accountingBackupTables";
import {accountingCrypto} from "./accountingCrypto";
export async function accountingRestoreCheck(tx:Kysely<any>,snapshot:any){
if(snapshot.format!=="artk-accounting-logical-backup"||![3,4].includes(snapshot.version)||snapshot.projectId!=="e8baeff1-2faa-4725-be8d-e3ebace16662")throw new Error("النسخة لا تخص هذا النظام");
 const results:any[]=[];let rowCount=0;
 for(const table of accountingBackupTables){
const rows=table==="accountingSettings"&&snapshot.version===3&&snapshot.tables?.[table]===undefined?[]:snapshot.tables?.[table];if(!Array.isArray(rows))throw new Error("جدول ناقص في النسخة: "+table);
  const name="artkRestore"+table[0].toUpperCase()+table.slice(1);
  const snake=(v:string)=>v.replace(/[A-Z]/g,c=>"_"+c.toLowerCase());
  await sql.raw('CREATE TEMP TABLE "'+snake(name)+'" (LIKE "'+snake(table)+'" INCLUDING CONSTRAINTS) ON COMMIT DROP').execute(tx);
  for(let offset=0;offset<rows.length;offset+=100){
   const batch=rows.slice(offset,offset+100);
   if(batch.length)await tx.withSchema("pg_temp").insertInto(name).values(batch).execute();
  }
  const restored=await tx.withSchema("pg_temp").selectFrom(name).selectAll().orderBy(table==="accountingOperations"?"requestKey":"id","asc").execute();
  const expected=accountingCrypto.digest(rows),actual=accountingCrypto.digest(restored);
  if(expected!==actual)throw new Error("فشل تطابق الجدول: "+table);
  results.push({table,count:rows.length,sha256:actual,matched:true});rowCount+=rows.length;
 }
 return {ok:true,rowCount,tables:results};
}
