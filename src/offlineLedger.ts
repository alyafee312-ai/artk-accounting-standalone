/** Offline-first ledger primitives. Experimental: not a production database. */
export type Entry = { id:string; account:string; debit:number; credit:number };
export type Journal = { id:string; createdAt:string; entries:Entry[] };
export function validateJournal(j:Journal):void {
 if(!j.id || !Array.isArray(j.entries) || j.entries.length<2) throw Error("Invalid journal");
 const ids=new Set<string>(); let debit=0,credit=0;
 for(const e of j.entries){
  if(!e.id || ids.has(e.id) || !e.account) throw Error("Invalid entry");
  ids.add(e.id);
  if(!Number.isSafeInteger(e.debit)||!Number.isSafeInteger(e.credit)||e.debit<0||e.credit<0) throw Error("Invalid amount");
  if((e.debit>0)===(e.credit>0)) throw Error("One-sided entry required");
  debit+=e.debit;credit+=e.credit;
 }
 if(!Number.isSafeInteger(debit)||debit!==credit) throw Error("Unbalanced journal");
}
export function appendJournal(existing:readonly Journal[],next:Journal):Journal[]{
 validateJournal(next);
 if(existing.some(x=>x.id===next.id)) throw Error("Duplicate journal");
 return [...existing,next];
}
