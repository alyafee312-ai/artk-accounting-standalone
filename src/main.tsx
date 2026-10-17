import React from 'react';
import {App as NativeApp} from '@capacitor/app';
import {createRoot} from 'react-dom/client';
import '@fontsource/cairo/400.css';
import '@fontsource/cairo/600.css';
import '@fontsource/cairo/700.css';
import '../floot-source/base.css';
import './style.css';
import {PinGate} from './PinGate';
import {AccountingWorkspace} from '../floot-source/components/AccountingWorkspace';
import type {AccountingData} from '../floot-source/endpoints/accounting_GET.schema';
import type {Kysely} from 'kysely';
import {database,migrate} from './local/database';
import {nativeBackend} from './local/native';
import {Ledger,setLedger,authenticate,initialPasswordRequired,initializeAdmin} from './local/service';
function AccountLogin({db,onLogin}:{db:Kysely<any>;onLogin:(user:{id:number;role:string;name:string})=>void}){const [initial,setInitial]=React.useState<boolean>(),[email,setEmail]=React.useState('admin'),[password,setPassword]=React.useState(''),[confirmation,setConfirmation]=React.useState(''),[error,setError]=React.useState(''),[busy,setBusy]=React.useState(false);React.useEffect(()=>{void initialPasswordRequired(db).then(setInitial).catch(e=>setError(String(e)))},[db]);return <main className="lock-screen"><h1>أرتك المحاسبي</h1><h2>{initial?'إعداد حساب المدير':'تسجيل الدخول المحلي'}</h2><form onSubmit={async e=>{e.preventDefault();setBusy(true);try{if(initial){if(password!==confirmation)throw Error('كلمتا المرور غير متطابقتين');await initializeAdmin(db,password)}onLogin(await authenticate(db,email,password));setPassword('')}catch(e){setError(String(e))}finally{setBusy(false)}}}><label>اسم الدخول<input required disabled={initial} autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>كلمة المرور<input type="password" required minLength={initial?8:undefined} value={password} onChange={e=>setPassword(e.target.value)}/></label>{initial&&<label>تأكيد كلمة المرور<input type="password" required value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></label>}<button disabled={busy||initial===undefined}>دخول</button></form><p role="alert">{error}</p></main>}
let closePending:Promise<unknown>=Promise.resolve();
function Workspace(){const [data,setData]=React.useState<AccountingData>(),[error,setError]=React.useState(''),[ledger,setLocal]=React.useState<Ledger>(),[db,setDb]=React.useState<Kysely<any>>(),[name,setName]=React.useState('');const ledgerRef=React.useRef<Ledger|undefined>(undefined);
 React.useEffect(()=>{let alive=true;let opened:Kysely<any>|undefined;void(async()=>{try{await closePending;const backend=await nativeBackend();await migrate(backend);opened=database(backend);if(!alive){await opened.destroy();return}setDb(opened)}catch(e){if(alive)setError(String(e))}})();return()=>{alive=false;setLedger(undefined);if(opened)closePending=ledgerRef.current?ledgerRef.current.close():opened.destroy()}},[]);
 if(error)return <main dir="rtl"><h1>أرتك المحاسبي</h1><p role="alert">{error}</p></main>;
 if(!db)return <main dir="rtl">جارٍ فتح قاعدة البيانات المحلية المشفرة…</main>;
 if(!ledger)return <AccountLogin db={db} onLogin={user=>{const l=new Ledger(db,user);ledgerRef.current=l;setLedger(l);setLocal(l);setName(user.name);void l.read().then(setData).catch(e=>setError(String(e)))}}/>;
 if(!data)return <main>جارٍ تحميل الحساب…</main>;
 return <AccountingWorkspace data={data} refresh={async()=>setData(await ledger.read())} onLogout={async()=>{setLedger(undefined);setData(undefined);setLocal(undefined);ledgerRef.current=undefined}} userName={name}/>;
}
function App(){const [unlocked,setUnlocked]=React.useState(false);React.useEffect(()=>{const listener=NativeApp.addListener('appStateChange',state=>{if(!state.isActive){setLedger(undefined);setUnlocked(false)}});return()=>{void listener.then(x=>x.remove())}},[]);return unlocked?<Workspace/>:<PinGate onUnlock={()=>setUnlocked(true)}/>;}
createRoot(document.getElementById('root')!).render(<App/>);
if(import.meta.env.VITE_NATIVE_QA==='true'){
 import('./nativeQa').then(module=>{(window as any).__artkNativeQa=module.runNativeQa;});
}
