import React from 'react';
import {createRoot} from 'react-dom/client';
import './style.css';
const tabs=['الرئيسية','العملاء','المشاريع','عروض الأسعار','الفواتير','التحصيلات','المصروفات','الموردون','المخزون','التقارير','الإعدادات'];
function App(){const [tab,setTab]=React.useState('الرئيسية');return <div className="app"><header><h1>أرتك المحاسبي</h1><p>نسخة مستقلة — قيد التطوير</p></header><nav>{tabs.map(t=><button key={t} onClick={()=>setTab(t)} aria-pressed={t===tab}>{t}</button>)}</nav><main><h2>{tab}</h2><p>معاينة فقط: لا تستخدم بيانات مالية حقيقية. سيتم ربط مكونات Floot الأصلية بعد استكمال الترحيل والأمان.</p></main></div>};
createRoot(document.getElementById('root')!).render(<App/>);
