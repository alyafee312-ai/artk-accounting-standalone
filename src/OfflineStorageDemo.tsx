import React from 'react';
import {storeEncryptedDraft} from './encryptedDraftStore';
import {loadEncryptedDraft} from './loadEncryptedDraft';
import {deleteEncryptedDraft} from './deleteEncryptedDraft';
import {exportEncryptedDraft,importEncryptedDraft} from './encryptedDraftTransfer';
const ID='preview-diagnostic-draft';
export function OfflineStorageDemo(){
 const [passphrase,setPassphrase]=React.useState('');
 const [backup,setBackup]=React.useState('');
 const [message,setMessage]=React.useState('لم يتم إجراء أي عملية');
 const [busy,setBusy]=React.useState(false);
 async function execute(action:'save'|'read'|'delete'|'export'|'import'){
  setBusy(true);
  try{
   if(passphrase.length<12)throw new Error('أدخل عبارة مرور تجريبية من 12 حرفًا على الأقل');
   if(action==='save'){
    await storeEncryptedDraft({id:ID,type:'invoice',amount:12500,createdAt:new Date().toISOString()},passphrase);
    setMessage('حُفظت فاتورة اختبار بقيمة 12,500 ريال بشكل مشفر على الجهاز');
   }else if(action==='read'){
    const record=await loadEncryptedDraft(ID,passphrase);
    setMessage(record?'تم فك التشفير: مبلغ الفاتورة التجريبية '+record.amount+' ريال':'لا توجد مسودة اختبار محفوظة');
   }else if(action==='delete'){
    await deleteEncryptedDraft(ID);
    setMessage('حُذفت المسودة التجريبية من هذا الجهاز');
   }else if(action==='export'){
    const data=await exportEncryptedDraft(ID);
    setBackup(data);
    setMessage('تم تجهيز نص نسخة مشفرة تجريبية؛ انسخه واحفظه خارج التطبيق');
   }else{
    const restoredId=await importEncryptedDraft(backup,passphrase);
    setMessage('تم استيراد المسودة التجريبية: '+restoredId);
   }
  }catch(error){setMessage('تعذرت العملية: '+(error instanceof Error?error.message:String(error)));}
  finally{setBusy(false);}
 }
 return <section><h3>تجربة الحفظ المشفر دون إنترنت</h3><p>بيانات تجريبية فقط؛ لا تُدخل بيانات مالية حقيقية أو كلمات مرور حساباتك.</p><label htmlFor="preview-passphrase">عبارة مرور تجريبية</label><input id="preview-passphrase" type="password" autoComplete="off" value={passphrase} onChange={e=>setPassphrase(e.target.value)} /><div><button disabled={busy} onClick={()=>execute('save')}>حفظ تجربة</button><button disabled={busy} onClick={()=>execute('read')}>قراءة تجربة</button><button disabled={busy} onClick={()=>execute('delete')}>حذف تجربة</button><button disabled={busy} onClick={()=>execute('export')}>تصدير مشفر</button><button disabled={busy||!backup} onClick={()=>execute('import')}>استيراد مشفر</button></div><label htmlFor="preview-backup">نص النسخة الاحتياطية المشفرة (تجريبي)</label><textarea id="preview-backup" value={backup} onChange={e=>setBackup(e.target.value)} rows={4} dir="ltr" style={{width:'100%'}}/><p role="status">{message}</p></section>;
}
