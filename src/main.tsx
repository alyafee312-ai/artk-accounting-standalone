import React from 'react';
import {App as NativeApp} from '@capacitor/app';
import {PinGate} from './PinGate';
import {createRoot} from 'react-dom/client';
import '@fontsource/cairo/400.css';
import '@fontsource/cairo/600.css';
import '@fontsource/cairo/700.css';
import '../floot-source/base.css';
import './style.css';
import {AccountingWorkspace} from '../floot-source/components/AccountingWorkspace';
import type {AccountingData} from '../floot-source/endpoints/accounting_GET.schema';
import {database,migrate} from './local/database';
import {nativeBackend} from './local/native';
import {Ledger,setLedger} from './local/service';
function Workspace(){const [data,setData]=React.useState<AccountingData>(),[error,setError]=React.useState(''),[ledger,setLocal]=React.useState<Ledger>();
 React.useEffect(()=>{let alive=true;let opened:Ledger|undefined;void(async()=>{try{const backend=await nativeBackend();await migrate(backend);const l=new Ledger(database(backend));opened=l;if(!alive){await l.db.destroy();return}setLedger(l);if(alive){setLocal(l);setData(await l.read())}}catch(e){if(alive)setError(String(e))}})();return()=>{alive=false;setLedger(undefined);if(opened)void opened.db.destroy()}},[]);
 if(error)return <main dir="rtl"><h1>أرتك المحاسبي</h1><p role="alert">{error}</p></main>;
 if(!data||!ledger)return <main dir="rtl">جارٍ فتح قاعدة البيانات المحلية المشفرة…</main>;
 return <AccountingWorkspace data={data} refresh={async()=>setData(await ledger.read())} onLogout={async()=>{setLedger(undefined);await ledger.db.destroy();setData(undefined);setError('تم إغلاق قاعدة البيانات. أعد فتح التطبيق.')}} userName="المدير المحلي"/>;
}
function App(){const [unlocked,setUnlocked]=React.useState(false);React.useEffect(()=>{const listener=NativeApp.addListener('appStateChange',state=>{if(!state.isActive){setLedger(undefined);setUnlocked(false)}});return()=>{void listener.then(x=>x.remove())}},[]);return unlocked?<Workspace/>:<PinGate onUnlock={()=>setUnlocked(true)}/>;}
createRoot(document.getElementById('root')!).render(<App/>);
