import {Kysely} from "kysely";
import {accountingAccess} from "./accountingAccess";
import {getAccountingSettings} from "./accountingSettings";
export async function accountingRead(tx:Kysely<any>,role:string){
 const admin=accountingAccess.isAdmin(role);
 const manager=accountingAccess.canManage(role);
 const read=(table:string)=>tx.selectFrom(table).selectAll().orderBy("id","desc").execute();
 const [customers,projects,invoices,receipts,quotes,costs,expenses,suppliers,materials,purchases,movements]=await Promise.all([
  read("accountingCustomers"),read("accountingProjects"),read("accountingInvoices"),read("accountingReceipts"),read("accountingQuotes"),
  manager?read("accountingProjectCosts"):[],manager?read("accountingExpenses"):[],manager?read("accountingSuppliers"):[],
  manager?read("accountingMaterials"):[],manager?read("accountingPurchases"):[],manager?read("accountingStockMovements"):[]
 ]);
 const settings=await getAccountingSettings(tx);
 const audit=admin?await tx.selectFrom("accountingAudit")
  .innerJoin("users","users.id","accountingAudit.userId")
  .select(["accountingAudit.id","accountingAudit.createdAt","accountingAudit.operation","accountingAudit.entityId","accountingAudit.userId","accountingAudit.details","users.displayName as userName"])
  .orderBy("accountingAudit.id","desc").limit(300).execute():[];
 return {customers,projects,invoices,receipts,quotes,costs,expenses,suppliers,materials,purchases,movements,
  permissions:{canManage:manager,canViewCosts:accountingAccess.canViewCosts(role),canBackup:admin,canAdmin:admin,canAddCost:true,role,roleLabel:accountingAccess.roleLabel(role)},
  settings,audit,asOf:new Date().toISOString()};
}
