// Included only in the separate CI-only emulator build, never in the downloadable APK.
import React from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {nativeBackend,deleteTestDatabase} from './local/native';
import {database,migrate} from './local/database';
import {Ledger,initializeAdmin,authenticate} from './local/service';
import {sealBackup,openBackup,snapshot,restoreIntoEmpty} from './local/backup';
import {AccountingPrint} from '../floot-source/components/AccountingPrint';
import {accountingDocument} from '../floot-source/helpers/accountingDocument';
import {accountingPdf} from '../floot-source/helpers/accountingPdf';
export async function runNativeQa(){
 const passed:string[]=[];const verify=(ok:boolean,label:string)=>{if(!ok)throw Error(label);passed.push(label)};
 const name='artk_verify_'+Date.now(),restoreName=name+'_restore';let db:ReturnType<typeof database>|undefined;let restored:ReturnType<typeof database>|undefined;
 try{
 const backend=await nativeBackend(name);await migrate(backend);db=database(backend);let ledger=new Ledger(db);
 const write=(v:object)=>ledger.write({...v,requestKey:crypto.randomUUID()});
 await initializeAdmin(db,'QA-Only-Password-481');await authenticate(db,'admin','QA-Only-Password-481');passed.push('native local authentication');
 await write({kind:'customer',name:'عميل اختبار معزول'});await write({kind:'project',name:'مشروع اختبار معزول',customerId:1,amount:10000});await write({kind:'cost',projectId:1,description:'تكلفة اختبار',amount:2000});
 await write({kind:'invoice',customerId:1,projectId:1,items:[{description:'طباعة اختبار',quantity:2,unitPrice:3000},{description:'تركيب اختبار',quantity:1,unitPrice:4000}]});await write({kind:'receipt',invoiceId:1,amount:4000});await write({kind:'projectStatus',id:1,status:'جاهز'});
 let d=await ledger.read();verify(Number(d.invoices[0].amount)-Number(d.receipts[0].amount)===6000,'native atomic accounting balance');verify(d.invoices[0].documentNo===1001,'native generated numbering');
 let rejected=false;try{await write({kind:'receipt',invoiceId:1,amount:6001})}catch{rejected=true}verify(rejected,'native rejects overpayment');
 await ledger.close();db=undefined;const reopened=await nativeBackend(name);await migrate(reopened);db=database(reopened);ledger=new Ledger(db);d=await ledger.read();verify(d.projects[0].status==='جاهز'&&d.receipts.length===1,'encrypted database survives close/reopen');
 const encrypted=await sealBackup(await snapshot(db),'Native-QA-Backup-239');const restoredBackend=await nativeBackend(restoreName);await migrate(restoredBackend);restored=database(restoredBackend);await restoreIntoEmpty(restored,await openBackup(encrypted,'Native-QA-Backup-239'));verify((await new Ledger(restored).read()).invoices.length===1,'native encrypted backup isolated restore');
 const employee=new Ledger(db,{id:1,role:'user'});verify((await employee.read()).costs.length===0,'native employee cost redaction');
 const mount=document.createElement('div');document.body.appendChild(mount);const root=createRoot(mount);flushSync(()=>root.render(<AccountingPrint doc={accountingDocument('invoice',d.invoices[0],d,{})} onClose={()=>{}}/>));await new Promise(r=>setTimeout(r,400));
 let pdf64='';try{const print=document.querySelector('[data-print-sheet]')?.parentElement;if(!print)throw Error('print sheet missing');const blob=await accountingPdf(print,'qa',false);verify(blob.size>3000,'Arabic invoice PDF rendered');pdf64=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=reject;r.readAsDataURL(blob)})}finally{root.unmount();mount.remove()}
 return {passed,pdf64};
 }finally{if(restored)await restored.destroy();if(db)await db.destroy();await deleteTestDatabase(name);await deleteTestDatabase(restoreName)}
}
