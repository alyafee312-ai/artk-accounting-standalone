import type { Dispatch, SetStateAction } from "react";
import type { AccountingData } from "../endpoints/accounting_GET.schema";
import { accountingReport } from "../helpers/accountingReport";
import { AccountingDownloadButton } from "./AccountingDownloadButton";
import { AccountingStats } from "./AccountingStats";
import { AccountingTable } from "./AccountingTable";
import { Button } from "./Button";
import styles from "./AccountingReportsView.module.css";

type ReportsProps = {
  className?: string;
  data: AccountingData;
  from: string;
  to: string;
  customer: string;
  projectId: string;
  setFrom: Dispatch<SetStateAction<string>>;
  setTo: Dispatch<SetStateAction<string>>;
  money: (value: unknown) => string;
  name: (id: unknown) => string;
  search: (value: unknown) => boolean;
  print: (kind: string, row: Record<string, never>) => void;
};

export function AccountingReportsView({
  className,
  data: d,
  from,
  to,
  customer,
  projectId,
  setFrom,
  setTo,
  money,
  name,
  search,
  print,
}: ReportsProps) {
  const report = accountingReport(d, from, to, customer, projectId);

  const period = (type: "day" | "month") => {
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Aden",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    setFrom(type === "day" ? today : today.slice(0, 7) + "-01");
    setTo(today);
  };

  return (
    <div className={`${styles.view} ${className ?? ""}`}>
      <div className={styles.quick}>
        <Button variant="outline" onClick={() => period("day")}>
          تقرير اليوم
        </Button>
        <Button variant="outline" onClick={() => period("month")}>
          تقرير الشهر
        </Button>
        <Button onClick={() => print("report", {})}>تصدير PDF</Button>
        <AccountingDownloadButton
          url={
            "/_api/accounting_csv?" +
            new URLSearchParams({ from, to, customerId: customer, projectId })
          }
          filename="artk-report.csv"
        >
          تصدير CSV
        </AccountingDownloadButton>
      </div>

      <AccountingStats
        items={[
          ["إيرادات مفوترة", money(report.revenue)],
          ["تحصيلات الفترة", money(report.received)],
          ["تكاليف المشاريع", money(report.cost)],
          ["المصروفات العامة", money(report.expense)],
          ["ربح الفترة", money(report.profit)],
          ["رصيد العملاء الحالي", money(report.debt)],
        ]}
      />
      <p className={styles.hint}>
        الربح = الفواتير − المواد المستهلكة وتكاليف المشاريع − المصروفات
        العامة. المشتريات تدخل المخزون، ولا تُخصم مرة ثانية من الربح.
        المدفوعات النقدية المسجلة: {money(report.cashOut)}.
      </p>

      <h2>الربح حسب المشروع</h2>
      <AccountingTable
        headers={["المشروع", "الحالة", "الإيراد المفوتر", "التكلفة", "الربح"]}
        empty={!report.projects.length}
      >
        {report.projects
          .filter((p) => search(p.name))
          .map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.status}</td>
              <td>{money(p.revenue)}</td>
              <td>{money(p.cost)}</td>
              <td>{money(p.profit)}</td>
            </tr>
          ))}
      </AccountingTable>

      <div className={styles.sectionHead}>
        <h2>أعمال غير منفذة وغير مسلّمة</h2>
        <Button variant="outline" onClick={() => print("unfinished", {})}>
          PDF
        </Button>
      </div>
      <AccountingTable
        headers={["المشروع", "العميل", "الحالة", "قيمة التعاقد", "المفوتر"]}
        empty={!report.notDone.length && !report.notDelivered.length}
      >
        {report.notDelivered
          .filter((p) => search(p.name))
          .map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{name(p.customerId)}</td>
              <td>{p.status}</td>
              <td>{money(p.amount)}</td>
              <td>
                {money(
                  report.projects.find((x) => String(x.id) === String(p.id))
                    ?.revenue,
                )}
              </td>
            </tr>
          ))}
      </AccountingTable>

      <div className={styles.sectionHead}>
        <h2>مصروفات المشاريع</h2>
        <Button
          variant="outline"
          onClick={() => print("projectExpenses", {})}
        >
          PDF
        </Button>
      </div>
      <AccountingTable
        headers={["المشروع", "عدد المصروفات", "الإجمالي"]}
        empty={!report.projectExpenses.length}
      >
        {report.projectExpenses
          .filter((p) => search(p.name))
          .map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.count}</td>
              <td>{money(p.cost)}</td>
            </tr>
          ))}
      </AccountingTable>

      <div className={styles.sectionHead}>
        <h2>مستحقات العملاء</h2>
        <Button variant="outline" onClick={() => print("receivables", {})}>
          PDF
        </Button>
      </div>
      <AccountingTable
        headers={["العميل", "المفوتر", "المدفوع", "المتبقي"]}
        empty={!report.debts.some((c) => c.balance > 0)}
      >
        {report.debts
          .filter((c) => c.balance > 0 && search(c.name))
          .sort((a, b) => b.balance - a.balance)
          .map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{money(c.billed)}</td>
              <td>{money(c.paid)}</td>
              <td>{money(c.balance)}</td>
            </tr>
          ))}
      </AccountingTable>
    </div>
  );
}
