import {accountingMath} from "./accountingMath";
import {accountingValidation} from "./accountingValidation";
import {accountingAccess} from "./accountingAccess";
import {accountingCrypto} from "./accountingCrypto";
import {accountingReport} from "./accountingReport";
describe("Artk accounting acceptance rules",()=>{
 it("calculates multi-line invoices and full/partial balances exactly",()=>{
  const total=accountingMath.total([{quantity:2,unitPrice:1800},{quantity:20,unitPrice:800}]);
  expect(total).toBe("19600.00");expect(accountingMath.balance(total,[5000])).toBe("14600.00");expect(accountingMath.balance(total,[5000,14600])).toBe("0.00");
 });
 it("handles fractional quantities without floating-point drift",()=>{
  expect(accountingMath.total([{quantity:0.1,unitPrice:0.2},{quantity:0.2,unitPrice:0.3}])).toBe("0.08");
  expect(accountingMath.money("1.005")).toBe("1.01");
 });
 it("rounds money and invoice totals half-up to whole riyals",()=>{
  expect(accountingMath.money(1234.56,0)).toBe("1235");
  expect(accountingMath.total([{quantity:3,unitPrice:333.5}],0)).toBe("1001");
 });
 it("values purchased stock using a weighted average",()=>expect(accountingMath.average(10,1000,10,2000)).toBe("1500.0000"));
 it("rejects invalid dates, negative receipts and nonfinite prices",()=>{
  expect(accountingValidation.safeParse({kind:"receipt",amount:-1,date:"2026-02-30"}).success).toBe(false);
  expect(accountingValidation.safeParse({kind:"invoice",items:[{description:"بنر",quantity:1,unitPrice:Infinity}]}).success).toBe(false);
 });
 it("allows permitted writes and denies restricted writes by role",()=>{
  expect(()=>accountingAccess.assertCanWrite("user","cost")).not.toThrow();
  expect(()=>accountingAccess.assertCanWrite("user","projectStatus")).not.toThrow();
  for(const kind of ["invoice","receipt","void"]){
   expect(()=>accountingAccess.assertCanWrite("user",kind)).toThrow(new Error("لا تملك صلاحية تنفيذ هذا الإجراء"));
  }
  expect(()=>accountingAccess.assertCanWrite("accountant","invoice")).not.toThrow();
  expect(()=>accountingAccess.assertCanWrite("accountant","void")).not.toThrow();
 });
 it("denies financial writes to a non-admin",()=>expect(()=>accountingAccess.assertAdmin("user")).toThrow(new Error("يتطلب هذا الإجراء صلاحية المدير")));
 it("denies a cross-site mutation",()=>expect(()=>accountingAccess.assertWriteRequest(new Request("https://example.invalid",{headers:{"content-type":"application/json","sec-fetch-site":"cross-site"}}))).toThrow(new Error("مصدر الطلب غير مسموح")));
 it("encrypts, authenticates, and detects tampering and wrong keys",()=>{
  const key=Buffer.alloc(32,7);const source={tables:{customers:[{name:"بيانات تجريبية",amount:"19600.00"}]}};
  const encrypted=accountingCrypto.encrypt(source,key,"fixture");
  expect(JSON.stringify(encrypted).includes("بيانات تجريبية")).toBe(false);
  expect(accountingCrypto.decrypt(encrypted,key)).toEqual(source);
  expect(()=>accountingCrypto.decrypt({...encrypted,sha256:"0".repeat(64)},key)).toThrow();
  expect(()=>accountingCrypto.decrypt(encrypted,Buffer.alloc(32,8))).toThrow();
 });
 it("wraps and recovers a distinct encryption key",()=>{
  const key=Buffer.alloc(32,9);const wrapped=accountingCrypto.wrap(key,"fixture-server-secret");
  expect(accountingCrypto.unwrap(wrapped,"fixture-server-secret").equals(key)).toBe(true);
  expect(()=>accountingCrypto.unwrap(wrapped,"wrong-secret")).toThrow();
 });
 it("does not count quotes, contract values or stock purchases as profit twice",()=>{
  const data:any={customers:[{id:"1",name:"اختبار"}],projects:[{id:"1",name:"اختبار",customerId:"1",amount:"50000"}],quotes:[{amount:"50000"}],invoices:[{id:"1",customerId:"1",projectId:"1",amount:"19600",issuedOn:"2026-10-16"}],receipts:[{invoiceId:"1",customerId:"1",amount:"5000",receivedOn:"2026-10-16"}],costs:[{projectId:"1",amount:"7800",source:"manual",incurredOn:"2026-10-16"}],expenses:[{amount:"500",incurredOn:"2026-10-16"}],purchases:[{amount:"10000",purchasedOn:"2026-10-16"}]};
  const r=accountingReport(data,"2026-10-01","2026-10-31");
  expect(r.profit).toBe(11300);expect(r.debt).toBe(14600);expect(r.revenue).toBe(19600);
  expect(accountingReport(data,"2026-11-01","2026-11-30").revenue).toBe(0);
 });
 it("excludes voided transactions from revenue, receipts, costs, profit and debt",()=>{
  const date="2026-10-16";
  const voidedAt="2026-10-17";
  const data:any={
   customers:[{id:"1",name:"اختبار"}],
   projects:[{id:"1",name:"اختبار",customerId:"1",status:"قيد التنفيذ"}],
   quotes:[],suppliers:[],materials:[],movements:[],purchases:[],
   invoices:[
    {id:"1",customerId:"1",projectId:"1",amount:"100",issuedOn:date,voidedAt:null},
    {id:"2",customerId:"1",projectId:"1",amount:"900",issuedOn:date,voidedAt}
   ],
   receipts:[
    {invoiceId:"1",customerId:"1",amount:"30",receivedOn:date,voidedAt:null},
    {invoiceId:"1",customerId:"1",amount:"400",receivedOn:date,voidedAt},
    {invoiceId:"2",customerId:"1",amount:"800",receivedOn:date,voidedAt:null}
   ],
   costs:[
    {projectId:"1",amount:"20",source:"manual",incurredOn:date,voidedAt:null},
    {projectId:"1",amount:"300",source:"manual",incurredOn:date,voidedAt}
   ],
   expenses:[
    {amount:"5",incurredOn:date,voidedAt:null},
    {amount:"200",incurredOn:date,voidedAt}
   ]
  };
  const report=accountingReport(data);
  expect(report.revenue).toBe(100);
  expect(report.received).toBe(30);
  expect(report.cost).toBe(20);
  expect(report.expense).toBe(5);
  expect(report.profit).toBe(75);
  expect(report.debt).toBe(70);
 });
});
