import React,{useState} from "react";
import {ar} from "react-day-picker/locale";
import {Calendar} from "./Calendar";
import {Popover,PopoverTrigger,PopoverContent} from "./Popover";
import {Button} from "./Button";
export function AccountingDate({value,onChange,label}:{value:string;onChange:(v:string)=>void;label:string}){
 const [open,setOpen]=useState(false);
 return <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><Button variant="outline" aria-label={label}>{label}: {value||"كل التواريخ"}</Button></PopoverTrigger><PopoverContent dir="rtl"><Calendar mode="single" locale={ar} dir="rtl" selected={value?new Date(value+"T12:00:00"):undefined} onSelect={(d:Date|undefined)=>{onChange(d?d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"):"");setOpen(false)}}/><Button variant="ghost" onClick={()=>{onChange("");setOpen(false)}}>مسح التاريخ</Button></PopoverContent></Popover>;
}
