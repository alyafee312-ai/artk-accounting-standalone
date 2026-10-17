import React from 'react';
import {createRoot} from 'react-dom/client';
import {runPreviewDiagnostics} from './runDiagnostics';
import './style.css';
const tabs=['الرئيسية','العملاء','المشاريع','عروض الأسعار','الفواتير','التحصيلات','المصروفات','الموردون','المخزون','التقارير','الإعدادات'];
function App(){
 const [tab,setTab]=React.useState('الرئيسية');
 const [status,setStatus]=React.useState('لم يتم تشغيل فحص التشفير');
 const [busy,setBusy]=React.useState(false);
 async function checkEncryption(){
   setBusy(true);setStatus('جار فحص التشفير...');
   try{await runPreviewDiagnostics();setStatus('نجح فحص التشفير وفحص المبالغ التجريبية');}
   catch(error){setStatus('فشل الفحص: '+(error instanceof Error?error.message:String(error)));}
   finally{setBusy(false);}
 }
 return <div className="app"><header><h1>أرتك المحاسبي</h1><p>نسخة مستقلة — قيد التطوير</p></header><nav>{tabs.map(t=><button key={t} onClick={()=>setTab(t)} aria-pressed={t===tab}>{t}</button>)}</nav><main><h2>{tab}</h2><p>معاينة فقط: لا تستخدم بيانات مالية حقيقية. سيتم ربط مكونات Floot الأصلية بعد استكمال الترحيل والأمان.</p>{tab==='الإعدادات'&&<section><h3>تشخيص التشفير التجريبي</h3><button type="button" disabled={busy} onClick={checkEncryption}>تشغيل الفحص</button><p role="status">{status}</p><small>يستخدم بيانات اختبار فقط ولا يفحص قاعدة البيانات الفعلية.</small></section>}</main></div>;
}
createRoot(document.getElementById('root')!).render(<App/>);
