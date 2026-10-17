import React,{useRef,useState} from "react";
import {z} from "zod";
import {Button} from "./Button";
import {Input} from "./Input";
import {Textarea} from "./Textarea";
import {Dialog,DialogContent,DialogTitle,DialogDescription} from "./Dialog";
import {Form,useForm,FormItem,FormLabel,FormControl} from "./Form";
import {AccountingChoice} from "./AccountingChoice";
import {AccountingDate} from "./AccountingDate";
import {postAccounting} from "../endpoints/accounting_POST.schema";
import {AccountingData} from "../endpoints/accounting_GET.schema";
import styles from "./AccountingEntry.module.css";
const titles:Record<string,string>={customer:"عميل",project:"مشروع",cost:"مصروف مشروع",invoice:"فاتورة",quote:"عرض سعر",receipt:"سند قبض",expense:"مصروف عام",supplier:"مورد",material:"مادة",purchase:"شراء مواد",consume:"صرف مواد لمشروع"};
export function AccountingEntry({kind,initial={},data,onClose,onSaved}:{kind:string;initial?:any;data:AccountingData;onClose:()=>void;onSaved:()=>Promise<void>}){
 const day=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Aden",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
 const form=useForm({schema:z.record(z.any()),defaultValues:{name:"",phone:"",address:"",notes:"",amount:"",description:"",customerId:"",projectId:"",invoiceId:"",supplierId:"",materialId:"",quantity:"",unit:"وحدة",minQty:0,category:"عام",method:"نقد",status:"جديد",workType:"",title:"فاتورة أولية",date:day,items:[{description:"",quantity:"1",unit:"وحدة",unitPrice:"",materialId:""}],...initial}});
 const v=form.values;const set=(key:string,value:any)=>form.setValues((p:any)=>({...p,[key]:value}));
 const [busy,setBusy]=useState(false),[error,setError]=useState("");const key=useRef(crypto.randomUUID());const guard=useRef(false);
 const opts=(rows:any[],field="name")=>rows.map(r=>({value:r.id,label:r[field]||String(r.id)}));
 const projects=data.projects.filter(p=>!v.customerId||String(p.customerId)===String(v.customerId));
 const invoices=data.invoices.filter(i=>!v.customerId||String(i.customerId)===String(v.customerId));
 const choice=(name:string,label:string,options:{value:any;label:string}[],required=false)=><FormItem name={name}><FormLabel>{label}{required?" *":""}</FormLabel><AccountingChoice label={label} value={v[name]} onChange={x=>{set(name,x);if(name==="customerId"){set("projectId","");set("invoiceId","")}}} options={options}/></FormItem>;
 const field=(name:string,label:string,type="text")=><FormItem name={name}><FormLabel>{label}</FormLabel><FormControl><Input type={type} inputMode={type==="number"?"decimal":undefined} step="any" value={v[name]??""} onChange={e=>set(name,e.target.value)}/></FormControl></FormItem>;
 const number=(value:any)=>{if(value===""||value===null||value===undefined||!Number.isFinite(Number(value)))throw Error("أكمل الحقول الرقمية بقيم صحيحة");return Number(value);};
 const optId=(value:any)=>value?Number(value):undefined;
 const submit=async()=>{
  if(guard.current)return;guard.current=true;setBusy(true);setError("");
  try{
   const base:any={kind,requestKey:key.current,...(v.id?{id:Number(v.id)}:{})};let input:any;
   if(kind==="customer"||kind==="supplier")input={...base,name:v.name,phone:v.phone,address:v.address,notes:v.notes};
   else if(kind==="project"){if(!v.customerId)throw Error("اختر العميل");input={...base,name:v.name,customerId:number(v.customerId),amount:number(v.amount),status:v.status,workType:v.workType,notes:v.notes};}
   else if(kind==="cost")input={...base,projectId:number(v.projectId),amount:number(v.amount),description:v.description,date:v.date||day};
   else if(kind==="invoice"||kind==="quote"){
    if(!v.customerId)throw Error("اختر العميل");
    input={...base,customerId:number(v.customerId),projectId:optId(v.projectId),items:v.items.map((i:any)=>({description:i.description,quantity:number(i.quantity),unit:i.unit,unitPrice:number(i.unitPrice)})),date:v.date||day,notes:v.notes,...(kind==="invoice"?{title:v.title}:{})};
   }else if(kind==="receipt")input={...base,customerId:optId(v.customerId),invoiceId:number(v.invoiceId),amount:number(v.amount),method:v.method,date:v.date||day,notes:v.notes};
   else if(kind==="expense")input={...base,amount:number(v.amount),description:v.description,category:v.category,method:v.method,date:v.date||day};
   else if(kind==="material")input={...base,name:v.name,unit:v.unit,minQty:number(v.minQty)};
   else if(kind==="purchase")input={...base,supplierId:number(v.supplierId),items:v.items.map((i:any)=>({materialId:number(i.materialId),quantity:number(i.quantity),unitPrice:number(i.unitPrice)})),date:v.date||day,notes:v.notes};
   else input={...base,projectId:number(v.projectId),materialId:number(v.materialId),quantity:number(v.quantity),date:v.date||day};
   await postAccounting(input);await onSaved();onClose();
  }catch(e){setError(e instanceof Error?e.message:"تعذر الحفظ. أعد المحاولة؛ مدخلاتك باقية.");}
  finally{guard.current=false;setBusy(false);}
 };
 const lineItems=["invoice","quote","purchase"].includes(kind);
 const updateItem=(n:number,k:string,x:any)=>set("items",v.items.map((i:any,j:number)=>n===j?{...i,[k]:x}:i));
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose()}}><DialogContent className={styles.modal} dir="rtl" onInteractOutside={e=>e.preventDefault()}><DialogTitle>{v.id?"تعديل":"إضافة"} {titles[kind]}</DialogTitle><DialogDescription>{kind==="cost"?"أدخل المصروف مباشرة؛ لا يلزم فتح سجل التكاليف.":"تُحفظ العملية بعد التحقق من بياناتها."}</DialogDescription><Form {...form}><form onSubmit={e=>{e.preventDefault();void submit()}} className={styles.form}><fieldset disabled={busy} className={styles.fields}>
 {["customer","supplier","project","material"].includes(kind)&&field("name","الاسم *")}
 {["customer","supplier"].includes(kind)&&<>{field("phone","الهاتف","tel")}{field("address","العنوان")}</>}
 {["project","invoice","quote","receipt"].includes(kind)&&choice("customerId","العميل",opts(data.customers),true)}
 {["cost","consume"].includes(kind)&&choice("projectId","المشروع",opts(data.projects),true)}
 {["invoice","quote"].includes(kind)&&choice("projectId","ربط بمشروع (اختياري)",opts(projects))}
 {kind==="project"&&<>{field("workType","نوع العمل")}{field("amount","قيمة المشروع (ر.ي) *","number")}{choice("status","الحالة",["جديد","بانتظار الاعتماد","بانتظار التنفيذ","قيد التنفيذ","جاهز","تم التسليم","مغلق","ملغي"].map(x=>({value:x,label:x})))}</>}
 {["cost","expense"].includes(kind)&&<>{field("description","وصف المصروف *")}{field("amount","المبلغ (ر.ي) *","number")}</>}
 {kind==="expense"&&field("category","التصنيف")}
 {kind==="invoice"&&choice("title","نوع الفاتورة",["فاتورة أولية","فاتورة"].map(x=>({value:x,label:x})))}
 {kind==="receipt"&&<>{choice("invoiceId","الفاتورة",invoices.map(i=>({value:i.id,label:"#"+i.documentNo+" — المتبقي "+(Number(i.amount)-data.receipts.filter(r=>String(r.invoiceId)===String(i.id)).reduce((s,r)=>s+Number(r.amount),0)).toLocaleString("ar-YE")+" ر.ي"})),true)}{field("amount","مبلغ التحصيل *","number")}</>}
 {["receipt","expense"].includes(kind)&&choice("method","وسيلة الدفع",["نقد","جيب","تحويل"].map(x=>({value:x,label:x})))}
 {kind==="material"&&<>{field("unit","وحدة القياس *")}{field("minQty","حد التنبيه","number")}</>}
 {kind==="purchase"&&choice("supplierId","المورد",opts(data.suppliers),true)}
 {kind==="consume"&&<>{choice("materialId","المادة",data.materials.map(m=>({value:m.id,label:m.name+" — متاح "+m.stockQty+" "+m.unit})),true)}{field("quantity","الكمية المصروفة *","number")}</>}
 {!["customer","supplier","material","project"].includes(kind)&&<AccountingDate label="التاريخ" value={v.date} onChange={d=>set("date",d)}/>}
 {lineItems&&<div className={styles.wide}><h3>البنود</h3>{v.items.map((i:any,n:number)=><div key={n} className={styles.item}>
 {kind==="purchase"?<AccountingChoice label={"مادة البند "+(n+1)} value={i.materialId} onChange={x=>updateItem(n,"materialId",x)} options={opts(data.materials)}/>:<Input aria-label={"وصف البند "+(n+1)} placeholder="وصف العمل" value={i.description} onChange={e=>updateItem(n,"description",e.target.value)}/>}
 <Input aria-label={"الكمية "+(n+1)} placeholder="الكمية" type="number" step="0.1" min="0.1" value={i.quantity} onChange={e=>updateItem(n,"quantity",e.target.value)}/>
 {kind!=="purchase"&&<Input aria-label={"الوحدة "+(n+1)} placeholder="الوحدة" value={i.unit} onChange={e=>updateItem(n,"unit",e.target.value)}/>}
 <Input aria-label={"سعر الوحدة "+(n+1)} placeholder="سعر الوحدة" type="number" min="0" step="0.01" value={i.unitPrice} onChange={e=>updateItem(n,"unitPrice",e.target.value)}/>
 <Button variant="ghost" disabled={v.items.length===1} onClick={()=>set("items",v.items.filter((_:any,j:number)=>j!==n))}>حذف البند</Button></div>)}
 <Button variant="outline" disabled={v.items.length>=100} onClick={()=>set("items",[...v.items,{description:"",quantity:"1",unit:"وحدة",unitPrice:"",materialId:""}])}>+ إضافة بند</Button>
 <p>الإجمالي: <strong>{v.items.reduce((s:number,i:any)=>s+Math.round(Number(i.quantity||0)*Number(i.unitPrice||0)*100)/100,0).toLocaleString("ar-YE")} ر.ي</strong></p></div>}
 {["customer","supplier","project","invoice","quote","receipt","purchase"].includes(kind)&&<FormItem name="notes" className={styles.wide}><FormLabel>ملاحظات</FormLabel><FormControl><Textarea value={v.notes} onChange={e=>set("notes",e.target.value)}/></FormControl></FormItem>}
 </fieldset>{error&&<p role="alert" className={styles.error}>{error}</p>}<div className={styles.actions}><Button type="submit" disabled={busy}>{busy?"جارٍ الحفظ…":"حفظ "+titles[kind]}</Button><Button variant="outline" disabled={busy} onClick={onClose}>إغلاق</Button></div></form></Form></DialogContent></Dialog>;
}
