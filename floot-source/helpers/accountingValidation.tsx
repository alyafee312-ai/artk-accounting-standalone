import {z} from "zod";
const id=z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const amount=z.number().finite().nonnegative().max(1e12);
const text=z.string().trim().min(2).max(300);
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v,"التاريخ غير صحيح").optional();
const common={requestKey:z.string().min(16).max(120).optional()};
const item=z.object({description:text,quantity:z.number().finite().positive().max(1e7),unit:z.string().trim().min(1).max(30).default("وحدة"),unitPrice:amount});
const doc={...common,customerId:id.optional(),projectId:id.optional(),description:text.default("أعمال الورشة"),amount:amount.default(0),items:z.array(item).min(1).max(100).optional(),date,notes:z.string().max(1000).default("")};
export const accountingValidation=z.discriminatedUnion("kind",[
 z.object({...common,kind:z.literal("customer"),id:id.optional(),name:text,phone:z.string().max(25).default(""),address:z.string().max(300).default(""),notes:z.string().max(1000).default("")}),
 z.object({...common,kind:z.literal("project"),id:id.optional(),name:text,customerId:id.optional(),amount,status:z.enum(["جديد","بانتظار الاعتماد","بانتظار التنفيذ","قيد التنفيذ","تحت التنفيذ","جاهز","تم التسليم","مغلق","ملغي"]).default("جديد"),workType:z.string().max(100).default(""),notes:z.string().max(1000).default("")}),
 z.object({...common,kind:z.literal("projectStatus"),id,status:z.enum(["جديد","بانتظار الاعتماد","بانتظار التنفيذ","قيد التنفيذ","تحت التنفيذ","جاهز","تم التسليم","مغلق","ملغي"])}),
 z.object({...common,kind:z.literal("cost"),projectId:id,amount:amount.positive(),description:text,date}),
 z.object({...doc,kind:z.literal("invoice"),title:z.enum(["فاتورة","فاتورة أولية"]).default("فاتورة أولية")}),
 z.object({...doc,kind:z.literal("quote")}),
 z.object({...common,kind:z.literal("approveQuote"),id}),
 z.object({...common,kind:z.literal("convertQuote"),id}),
 z.object({...common,kind:z.literal("receipt"),invoiceId:id.optional(),customerId:id.optional(),amount:amount.positive(),method:z.enum(["نقد","جيب","تحويل"]).default("نقد"),date,notes:z.string().max(1000).default("")}),
 z.object({...common,kind:z.literal("expense"),amount:amount.positive(),description:text,category:z.string().max(80).default("عام"),method:z.enum(["نقد","جيب","تحويل"]).default("نقد"),date}),
 z.object({...common,kind:z.literal("supplier"),id:id.optional(),name:text,phone:z.string().max(25).default(""),address:z.string().max(300).default(""),notes:z.string().max(1000).default("")}),
 z.object({...common,kind:z.literal("material"),id:id.optional(),name:text,unit:z.string().trim().min(1).max(30),minQty:amount.default(0)}),
 z.object({...common,kind:z.literal("purchase"),supplierId:id,items:z.array(z.object({materialId:id,quantity:z.number().finite().positive().max(1e7).multipleOf(0.001),unitPrice:amount})).min(1).max(100),date,notes:z.string().max(1000).default("")}),
 z.object({...common,kind:z.literal("consume"),materialId:id,projectId:id,quantity:z.number().finite().positive().max(1e7).multipleOf(0.001),date}),
 z.object({...common,kind:z.literal("void"),entity:z.enum(["invoice","receipt","cost","expense","quote"]),id,reason:z.string().trim().min(3).max(300)}),
 z.object({...common,kind:z.literal("finalizeInvoice"),id})
]);
