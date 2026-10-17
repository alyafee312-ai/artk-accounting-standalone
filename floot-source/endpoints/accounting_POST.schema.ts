import superjson from "superjson";
import {z} from "zod";
import {accountingValidation} from "../helpers/accountingValidation";
export const schema=accountingValidation;
export type InputType=z.input<typeof schema>;
export type OutputType={ok:true;id:string;duplicate?:boolean}|{error:string};
export async function postAccounting(input:InputType):Promise<OutputType>{
 const r=await fetch("/_api/accounting",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:superjson.stringify(schema.parse(input))});
 const out=superjson.parse<OutputType>(await r.text());
 if(!r.ok)throw new Error("error" in out?out.error:"تعذر الحفظ");
 return out;
}
