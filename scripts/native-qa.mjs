import {execFileSync} from 'node:child_process';
import {writeFileSync,mkdirSync} from 'node:fs';
const adb=(...args)=>execFileSync('adb',args,{encoding:'utf8'}).trim();
mkdirSync('qa-output',{recursive:true});
adb('install','-r','android/app/build/outputs/apk/debug/app-debug.apk');
adb('shell','settings','put','global','airplane_mode_on','1');adb('shell','svc','wifi','disable');adb('shell','svc','data','disable');
adb('shell','am','start','-n','com.artk.accounting.standalone/.MainActivity');
let socket='';for(let i=0;i<60;i++){const sockets=adb('shell','cat','/proc/net/unix');socket=sockets.match(/@webview_devtools_remote_\d+/)?.[0].slice(1)||'';if(socket)break;await new Promise(r=>setTimeout(r,1000))}if(!socket)throw Error('WebView debug socket missing');
adb('forward','tcp:9222','localabstract:'+socket);
let target;for(let i=0;i<30;i++){const targets=await fetch('http://127.0.0.1:9222/json').then(r=>r.json());target=targets.find(x=>x.type==='page');if(target)break;await new Promise(r=>setTimeout(r,1000))}if(!target)throw Error('WebView target missing');
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});let id=0;const calls=new Map();ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&calls.has(m.id)){calls.get(m.id)(m);calls.delete(m.id)}});
const call=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;const timer=setTimeout(()=>{calls.delete(n);reject(Error(method+' timed out'))},180000);calls.set(n,r=>{clearTimeout(timer);r.error?reject(Error(JSON.stringify(r.error))):resolve(r.result)});ws.send(JSON.stringify({id:n,method,params}))});
const evaluate=async(expression)=>{const result=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));return result.result?.value};
for(let i=0;i<60;i++){if(await evaluate('typeof window.__artkNativeQa==="function"'))break;await new Promise(r=>setTimeout(r,1000))}
try{const report=await evaluate('window.__artkNativeQa()');if(!report?.passed?.length)throw Error('Empty native QA report');const {pdf64,...summary}=report;writeFileSync('qa-output/native-report.json',JSON.stringify(summary,null,2));writeFileSync('qa-output/arabic-invoice.pdf',Buffer.from(pdf64,'base64'));console.log(JSON.stringify(summary));
 const screen=await call('Page.captureScreenshot',{format:'png'});writeFileSync('qa-output/app.png',Buffer.from(screen.data,'base64'));
}finally{writeFileSync('qa-output/logcat.txt',adb('logcat','-d','-t','2000'));ws.close()}
