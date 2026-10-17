import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { AccountingData } from "../endpoints/accounting_GET.schema";
import { Button } from "./Button";
import { Input } from "./Input";
import styles from "./AccountingAuditPanel.module.css";

type Audit = NonNullable<AccountingData["audit"]>;
type Entry = Audit[number];

const pageSize = 50;
const dateFormatter = new Intl.DateTimeFormat("ar-YE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Aden",
});

const operationLabels: Record<string, string> = {
  customer: "عميل",
  project: "مشروع",
  projectStatus: "تغيير حالة مشروع",
  cost: "مصروف مشروع",
  invoice: "فاتورة",
  quote: "عرض سعر",
  approveQuote: "اعتماد عرض",
  convertQuote: "تحويل عرض إلى فاتورة",
  receipt: "سند قبض",
  expense: "مصروف عام",
  supplier: "مورد",
  material: "مادة",
  purchase: "شراء",
  consume: "صرف مخزون",
  void: "إلغاء",
  finalizeInvoice: "اعتماد فاتورة نهائية",
  settings: "الإعدادات",
};

function operationLabel(operation: string): string {
  if (operation.startsWith("user:")) return "إدارة المستخدمين";
  const prefix = operation.split(":")[0];
  return operationLabels[operation] ?? operationLabels[prefix] ?? operation;
}

function displayValue(value: unknown): string {
  if (value === null) return "فارغ";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) return value.map(displayValue).join("، ");
  if (value && typeof value === "object") {
    return Object.entries(value).map(([key, part]) => `${key}: ${displayValue(part)}`).join("، ");
  }
  return "";
}

function detailsSummary(details: unknown): string {
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return displayValue(details).slice(0, 240);
  }
  const fields = details as Record<string, unknown>;
  const parts: string[] = [];
  for (const [key, label] of [
    ["amount", "المبلغ"],
    ["documentNo", "رقم المستند"],
    ["reason", "السبب"],
  ] as const) {
    if (fields[key] !== undefined && fields[key] !== null) {
      parts.push(`${label}: ${displayValue(fields[key])}`);
    }
  }
  if (fields.before !== undefined || fields.after !== undefined) {
    parts.push(`${displayValue(fields.before)} ← ${displayValue(fields.after)}`);
  }
  if (!parts.length) {
    for (const [key, value] of Object.entries(fields).slice(0, 3)) {
      parts.push(`${key}: ${displayValue(value)}`);
    }
  }
  return parts.join(" · ").slice(0, 240);
}

function searchableText(entry: Entry): string {
  return [
    entry.operation,
    operationLabel(entry.operation),
    entry.userName,
    detailsSummary(entry.details),
    displayValue(entry.details),
  ].join(" ").toLocaleLowerCase("ar");
}

export function AccountingAuditPanel({
  audit,
  className,
}: {
  audit: Audit;
  className?: string;
}) {
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("ar");
    return term ? audit.filter((entry) => searchableText(entry).includes(term)) : audit;
  }, [audit, search]);

  return (
    <section dir="rtl" className={`${styles.panel} ${className ?? ""}`}>
      <div className={styles.heading}>
        <h2>سجل التدقيق</h2>
        <p>السجل للقراءة فقط ولا يمكن حذفه.</p>
      </div>
      <label className={styles.search}>
        <span>البحث في السجل</span>
        <span className={styles.searchControl}>
          <Search size={18} aria-hidden="true" />
          <Input type="search" value={search} placeholder="العملية، المستخدم أو التفاصيل"
            onChange={(event) => {
              setSearch(event.target.value);
              setVisibleCount(pageSize);
            }} />
        </span>
      </label>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">التاريخ والوقت</th>
              <th scope="col">المستخدم</th>
              <th scope="col">العملية</th>
              <th scope="col">معرّف السجل</th>
              <th scope="col">التفاصيل</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, visibleCount).map((entry) => (
              <tr key={entry.id}>
                <td>{dateFormatter.format(new Date(entry.createdAt))}</td>
                <td>{entry.userName}</td>
                <td><strong>{operationLabel(entry.operation)}</strong></td>
                <td><span dir="ltr">{entry.entityId}</span></td>
                <td className={styles.details}>{detailsSummary(entry.details) || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!filtered.length && <p className={styles.empty}>لا توجد تغييرات تطابق البحث.</p>}
      {visibleCount < filtered.length && (
        <Button variant="secondary" className={styles.more}
          onClick={() => setVisibleCount((count) => count + pageSize)}>
          عرض المزيد
        </Button>
      )}
      <p className={styles.count}>
        عرض {new Intl.NumberFormat("ar-YE").format(Math.min(visibleCount, filtered.length))} من {new Intl.NumberFormat("ar-YE").format(filtered.length)}
      </p>
    </section>
  );
}
