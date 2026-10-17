import React from 'react';
import {createRoot} from 'react-dom/client';
import {runPreviewDiagnostics} from './runDiagnostics';
import {OfflineStorageDemo} from './OfflineStorageDemo';
import './style.css';
import styles from '../floot-source/components/AccountingWorkspace.module.css';
const tabs=['الرئيسية','العملاء','المشاريع','عروض الأسعار','الفواتير','التحصيلات','المصروفات','الموردون','المخزون','التقارير','النسخ الاحتياطي','المستخدمون','الإعدادات','سجل التدقيق'];
function App(){
 const [tab,setTab]=React.useState('الرئيسية');
 const [nav,setNav]=React.useState(false);
 const [status,setStatus]=React.useState('لم يتم تشغيل فحص التشفير');
 const [busy,setBusy]=React.useState(false);
 async function checkEncryption(){
  setBusy(true);
  try{await runPreviewDiagnostics();setStatus('نجح فحص التشفير التجريبي');}
  catch(e){setStatus('فشل الفحص: '+(e instanceof Error?e.message:String(e)));}
  finally{setBusy(false);}
 }
 const goto=(t:string)=>{setTab(t);setNav(false);};
 return <div className={styles.app} dir="rtl">
  <aside className={styles.sidebar+' '+(nav?styles.open:'')}>
   <div className={styles.brand}><b>أرتك المحاسبي</b><span>أرتك للديكور والإعلان</span></div>
   <nav>{tabs.map(t=><button key={t} className={tab===t?styles.active:''} onClick={()=>goto(t)}>{t}</button>)}</nav>
   <div className={styles.profile}><span>نسخة مستقلة تجريبية</span><small>دون بيانات حقيقية</small></div>
  </aside>
  {nav&&<button className={styles.scrim} aria-label="إغلاق القائمة" onClick={()=>setNav(false)}/>}
  <main className={styles.main}>
   <header className={styles.header}><div className={styles.heading}><button className={styles.menu} aria-label="فتح القائمة" onClick={()=>setNav(true)}>☰</button><div><small>أرتك للديكور والإعلان</small><h1>{tab}</h1></div></div></header>
   <p className={styles.notice}>واجهة مطابقة في الهيكل والألوان لمشروع Floot الأصلي، لكنها معاينة معزولة؛ لا تدخل بيانات مالية فعلية.</p>
   {tab==='الرئيسية'?<>
    <section className="original-welcome"><span>إدارة يومك بوضوح</span><h2>أعمالك، حساباتك، ومتابعتك</h2><p>ابدأ إجراءً جديدًا أو تابع الأعمال التي تنتظر التنفيذ والتسليم.</p></section>
    <div className="stat-grid">{['إجمالي الفواتير','التحصيلات','المتبقي على العملاء','مشاريع مفتوحة'].map(t=><article key={t}><small>{t}</small><strong>—</strong></article>)}</div>
    <div className={styles.quick}><button onClick={()=>goto('المشاريع')}>أعمال غير منفذة</button><button onClick={()=>goto('المشاريع')}>أعمال غير مسلّمة</button><button onClick={()=>goto('الفواتير')}>فواتير عليها رصيد</button></div>
    <h2>المشاريع الحالية</h2><section className={styles.cards}><article><p>لا توجد بيانات في هذه المعاينة. سيتم ربط المشاريع بعد ترحيل محرك المحاسبة الأصلي.</p></article></section>
   </>:tab==='الإعدادات'||tab==='النسخ الاحتياطي'?<section><h3>تشخيص التشفير التجريبي</h3><button disabled={busy} onClick={checkEncryption}>تشغيل الفحص</button><p role="status">{status}</p><OfflineStorageDemo/></section>:<section className={styles.cards}><article><h3>{tab}</h3><p>واجهة القسم محفوظة في المصدر الأصلي، ولم تُربط وظائفها بقاعدة البيانات المحلية بعد.</p></article></section>}
  </main>
 </div>;
}
createRoot(document.getElementById('root')!).render(<App/>);
