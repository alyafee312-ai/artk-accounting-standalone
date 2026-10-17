import React from 'react';
import {App as NativeApp} from '@capacitor/app';
import {createRoot} from 'react-dom/client';
import '@fontsource/cairo/400.css';
import '@fontsource/cairo/600.css';
import '@fontsource/cairo/700.css';
import '../floot-source/base.css';
import './style.css';
import {AccountLogin} from './AccountLogin';
import {AccountingWorkspace} from '../floot-source/components/AccountingWorkspace';
import type {AccountingData} from '../floot-source/endpoints/accounting_GET.schema';
import type {Kysely} from 'kysely';
import {database,migrate} from './local/database';
import {nativeBackend} from './local/native';
import {Ledger,setLedger,useLedger} from './local/service';
let closePending:Promise<unknown>=Promise.resolve();
function Workspace(){const [data,setData]=React.useState<AccountingData>(),[error,setError]=React.useState(''),[ledger,setLocal]=React.useState<Ledger>(),[db,setDb]=React.useState<Kysely<any>>(),[name,setName]=React.useState('');const ledgerRef=React.useRef<Ledger|undefined>(undefined);
 React.useEffect(()=>{let alive=true;let opened:Kysely<any>|undefined;void(async()=>{try{await closePending;const backend=await nativeBackend();await migrate(backend);opened=database(backend);if(!alive){await opened.destroy();return}setDb(opened)}catch(e){if(alive)setError(String(e))}})();return()=>{alive=false;setLedger(undefined);if(opened)closePending=ledgerRef.current?ledgerRef.current.close():opened.destroy()}},[]);
 if(error)return <main dir="rtl"><h1>أرتك المحاسبي</h1><p role="alert">{error}</p></main>;
 if(!db)return <main dir="rtl">جارٍ فتح قاعدة البيانات المحلية المشفرة…</main>;
 if(!ledger)return <AccountLogin db={db} onLogin={user=>{const l=new Ledger(db,user);ledgerRef.current=l;setLedger(l);setLocal(l);setName(user.name);void l.read().then(setData).catch(e=>setError(String(e)))}}/>;
 if(!data)return <main>جارٍ تحميل الحساب…</main>;
 return <AccountingWorkspace data={data} refresh={async()=>setData(await ledger.read())} onLogout={async()=>{setLedger(undefined);setData(undefined);setLocal(undefined);ledgerRef.current=undefined}} userName={name}/>;
}
function App(){const [session,setSession]=React.useState(0);React.useEffect(()=>{const listener=NativeApp.addListener('appStateChange',state=>{if(!state.isActive){try{useLedger()}catch{return}setLedger(undefined);setSession(v=>v+1)}});return()=>{void listener.then(x=>x.remove())}},[]);return <Workspace key={session}/>;}
createRoot(document.getElementById('root')!).render(<App/>);
if(import.meta.env.VITE_NATIVE_QA==='true'){
 import('./nativeQa').then(module=>{(window as any).__artkNativeQa=module.runNativeQa;});
}
