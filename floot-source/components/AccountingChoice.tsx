import React from "react";
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from "./Select";
export function AccountingChoice({value,onChange,options,label,empty="اختر",disabled=false}:{value:any;onChange:(v:string)=>void;options:{value:any;label:string}[];label:string;empty?:string;disabled?:boolean}){
 return <Select dir="rtl" value={String(value||"__empty")} onValueChange={v=>onChange(v==="__empty"?"":v)} disabled={disabled}><SelectTrigger aria-label={label}><SelectValue placeholder={empty}/></SelectTrigger><SelectContent><SelectItem value="__empty">{empty}</SelectItem>{options.map(o=><SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent></Select>;
}
