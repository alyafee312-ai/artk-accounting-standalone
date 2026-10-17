import Decimal from "decimal.js";
export const accountingMath = {
  money(value: number | string, decimals: 0 | 2 = 2) {
    const n = new Decimal(value);
    if (!n.isFinite() || n.abs().gt("1000000000000")) throw new Error("المبلغ خارج النطاق المسموح");
    return n.toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP).toFixed(decimals);
  },
  total(items: {quantity:number;unitPrice:number}[], decimals: 0 | 2 = 2) {
    return accountingMath.money(items.reduce((sum,item)=>sum.plus(new Decimal(item.quantity).times(item.unitPrice).toDecimalPlaces(decimals,Decimal.ROUND_HALF_UP)),new Decimal(0)).toString(), decimals);
  },
  balance(amount: string | number, payments: (string | number)[]) {
    return new Decimal(amount).minus(payments.reduce((sum,p)=>sum.plus(p),new Decimal(0))).toFixed(2);
  },
  average(oldQty:string|number,oldCost:string|number,qty:string|number,cost:string|number) {
    return new Decimal(oldQty).times(oldCost).plus(new Decimal(qty).times(cost)).div(new Decimal(oldQty).plus(qty)).toDecimalPlaces(4,Decimal.ROUND_HALF_UP).toFixed(4);
  }
};
