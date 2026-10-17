export const accountingAccess = {
  roleLabel(role: string) {
    if (role === "admin") return "مدير النظام";
    if (role === "accountant") return "محاسب";
    return "موظف";
  },
  canManage(role: string) { return role === "admin" || role === "accountant"; },
  canViewCosts(role: string) { return role === "admin" || role === "accountant"; },
  isAdmin(role: string) { return role === "admin"; },
  assertCanWrite(role: string, kind: string) {
    if (this.canManage(role) || (role === "user" && (kind === "cost" || kind === "projectStatus"))) return;
    throw new Error("لا تملك صلاحية تنفيذ هذا الإجراء");
  },
  assertAdmin(role:string){if(role!=="admin")throw new Error("يتطلب هذا الإجراء صلاحية المدير");},
  assertWriteRequest(request:Request){
    const type=request.headers.get("content-type")||"";
    if(!type.includes("application/json"))throw new Error("نوع الطلب غير مسموح");
    if(request.headers.get("sec-fetch-site")==="cross-site"&&!["capacitor://localhost","http://localhost","https://localhost"].includes(request.headers.get("origin")||""))throw new Error("مصدر الطلب غير مسموح");
  }
};
