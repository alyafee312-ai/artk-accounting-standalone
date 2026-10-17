import {accountingCsv} from '../../src/local/csv';
import {useLedger} from '../../src/local/service';
import React,{useState} from "react";
import {Button} from "./Button";
import {accountingDownload} from "../helpers/accountingDownload";
export function AccountingDownloadButton({url,filename,children}:{url:string;filename:string;children:React.ReactNode}){
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 return <span><Button variant="outline" disabled={busy} onClick={async()=>{setBusy(true);setError("");try{const route=new URL(url,'https://localhost');if(route.pathname!=='/_api/accounting_csv')throw Error('نوع التصدير غير مدعوم');const csv=accountingCsv(await useLedger().read(),route.searchParams);await accountingDownload(new Blob([csv],{type:'text/csv;charset=utf-8'}),filename);}catch(e){setError(e instanceof Error?e.message:"تعذر حفظ الملف")}finally{setBusy(false)}}}>{busy?"جارٍ التنزيل…":children}</Button>{error&&<small role="alert" style={{display:"block",color:"#a33"}}>{error}</small>}</span>;
}
