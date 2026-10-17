import superjson from "superjson";
export type AccountingData={customers:any[];projects:any[];costs:any[];invoices:any[];receipts:any[];quotes:any[];expenses:any[];suppliers:any[];materials:any[];purchases:any[];movements:any[];permissions:{canManage:boolean;canViewCosts:boolean;canBackup:boolean;canAdmin?:boolean;canAddCost?:boolean;role?:string;roleLabel?:string};settings?:{companyName:string;tagline:string;phone:string;address:string;logoDataUrl:string|null;roundingDecimals:number;documentFooter:string};audit?:{id:string;createdAt:Date;operation:string;entityId:string;userId:number;details:unknown;userName:string}[];asOf:string};
export type OutputType=AccountingData|{error:string};
export const getAccounting=async():Promise<OutputType>=>{
 const r=await fetch("/_api/accounting",{credentials:"include",cache:"no-store"});
 const result=superjson.parse<OutputType>(await r.text());
 if(!r.ok)throw new Error("error" in result?result.error:"تعذر تحميل البيانات");
 return result;
};
