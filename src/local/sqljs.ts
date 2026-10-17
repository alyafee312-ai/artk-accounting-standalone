import initSqlJs from 'sql.js';
import type {SqlBackend} from './database';
export async function testBackend(bytes?:Uint8Array){const SQL=await initSqlJs();const raw=new SQL.Database(bytes);const backend:SqlBackend={async execute(sql,values=[]){const statement=raw.prepare(sql);try{statement.bind(values as any[]);const rows:Record<string,unknown>[]=[];while(statement.step())rows.push(statement.getAsObject());return rows;}finally{statement.free()}},async close(){raw.close()}};return {backend,exportBytes:()=>raw.export()};}
