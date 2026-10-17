import React,{useState} from "react";
import {Button} from "./Button";
import {accountingDownload} from "../helpers/accountingDownload";
export function AccountingDownloadButton({url,filename,children}:{url:string;filename:string;children:React.ReactNode}){
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 return <span><Button variant="outline" disabled={busy} onClick={async()=>{setBusy(true);setError("");try{const r=await fetch(url,{credentials:"include",cache:"no-store"});if(!r.ok)throw Error("تعذر تنزيل الملف؛ تحقق من الاتصال والصلاحية");const disposition=r.headers.get("Content-Disposition");const name=disposition?.match(/filename="([^"]+)"/)?.[1]||filename;await accountingDownload(await r.blob(),name);}catch(e){setError(e instanceof Error?e.message:"تعذر حفظ الملف")}finally{setBusy(false)}}}>{busy?"جارٍ التنزيل…":children}</Button>{error&&<small role="alert" style={{display:"block",color:"#a33"}}>{error}</small>}</span>;
}
