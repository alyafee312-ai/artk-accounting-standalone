import {useLedger} from "../../src/local/service";
import superjson from "superjson";
import {z} from "zod";
import {accountingValidation} from "../helpers/accountingValidation";
export const schema=accountingValidation;
export type InputType=z.input<typeof schema>;
export type OutputType={ok:true;id:string;duplicate?:boolean}|{error:string};
export async function postAccounting(input:InputType):Promise<OutputType>{return useLedger().write(schema.parse(input));}
