import React from 'react';
import {storeEncryptedDraft} from './encryptedDraftStore';
import {loadEncryptedDraft} from './loadEncryptedDraft';
import {deleteEncryptedDraft} from './deleteEncryptedDraft';
const ID='preview-diagnostic-draft';
export function OfflineStorageDemo(){
 const [passphrase,setPassphrase]=React.useState('');
 const [message,setMessage]=React.useState('لم يتم إجراء أي عملية');
 const [busy,setBusy]=React.useState(false);
 async function execute(action:'save'|'read'|'delete'){
  setBusy(true);
  try{
   if(passphrase.length<12)throw new Error('أدخل عبارة مرور من 12 حرفًا على الأقل');
   if(action==='save'){
    await storeEncryptedDraft({id:ID,type:'invoice',amount:12500,createdAt:new Date().toISOString()},passphrase);
    setMessage('حُفظت فاتورة اختبار بقيمة 12,500 ريال بشكل مشفر على الجهاز');
   }else if(action==='read'){
    const record=await loadEncryptedDraft(ID,passphrase);
    setMessage(record?'تم فك التشفير: مبلغ الفاتورة التجريبية '+record.amount+' ريال':'لا توجد مسودة اختبار محفوظة');
   }else{
    await deleteEncryptedDraft(ID);
    setMessage('حُذفت المسودة التجريبية من هذا الجهاز');
   }
  }catch(error){setMessage('تعذرت العملية: '+(error instanceof Error?error.message:String(error)));}
  finally{setBusy(false);}
 }
 return <section><h3>تجربة الحفظ المشفر دون إنترنت</h3><p>بيانات تجريبية فقط؛ لا تُدخل بيانات مالية حقيقية أو كلمات مرور حساباتك.</p><label htmlFor="preview-passphrase">عبارة مرور تجريبية</label><input id="preview-passphrase" type="password" autoComplete="off" value={passphrase} onChange={e=>setPassphrase(e.target.value)} /><div><button disabled={busy} onClick={()=>execute('save')}>حفظ تجربة</button><button disabled={busy} onClick={()=>execute('read')}>استعادة تجربة</button><button disabled={busy} onClick={()=>execute('delete')}>حذف تجربة</button></div><p role="status">{message}</p></section>;
}
