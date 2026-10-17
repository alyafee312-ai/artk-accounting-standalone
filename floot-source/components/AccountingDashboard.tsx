import { ArrowUpLeft, Plus } from "lucide-react";
import type { AccountingData } from "../endpoints/accounting_GET.schema";
import { accountingReport } from "../helpers/accountingReport";
import { Button } from "./Button";
import { AccountingStats } from "./AccountingStats";
import styles from "./AccountingDashboard.module.css";

type DashboardProps = {
  className?: string;
  data: AccountingData;
  all: ReturnType<typeof accountingReport>;
  manage: boolean;
  canAddCost: boolean;
  isAdmin: boolean;
  money: (value: unknown) => string;
  name: (id: unknown) => string;
  paid: (id: unknown) => number;
  open: (kind: string, initial?: { projectId?: string | number; workType?: string; status?: string }) => void;
  goto: (tab: string, options?: { status?: string }) => void;
};

export function AccountingDashboard({
  className,
  data: d,
  all,
  manage,
  canAddCost,
  isAdmin,
  money,
  name,
  paid,
  open,
  goto,
}: DashboardProps) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Aden",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const month = manage
    ? accountingReport(d, today.slice(0, 7) + "-01", today)
    : null;

  return (
    <div className={`${styles.dashboard} ${className ?? ""}`}>
      <section className={styles.welcome}>
        <div>
          <span>إدارة يومك بوضوح</span>
          <h2>أعمالك، حساباتك، ومتابعتك</h2>
          <p>ابدأ إجراءً جديدًا أو تابع الأعمال التي تنتظر التنفيذ والتسليم.</p>
        </div>
        <span className={styles.date}>
          {new Date().toLocaleDateString("ar-YE", {
            weekday: "long",
            day: "numeric",
            month: "long",
            timeZone: "Asia/Aden",
          })}
        </span>
      </section>

      {manage && (
        <AccountingStats
          items={[
            ["إجمالي الفواتير", money(all.revenue)],
            ["التحصيلات", money(all.received)],
            ["المتبقي على العملاء", money(all.debt)],
            [
              "مشاريع مفتوحة",
              d.projects.filter(
                (p) => !["تم التسليم", "مغلق", "ملغي"].includes(p.status),
              ).length,
            ],
          ]}
        />
      )}
      {month && (
        <AccountingStats
          items={[
            ["إيرادات الشهر", money(month.revenue)],
            ["تحصيلات الشهر", money(month.received)],
            ["تكاليف ومصروفات الشهر", money(month.cost + month.expense)],
            ["ربح الشهر", money(month.profit)],
          ]}
        />
      )}

      <div className={styles.quick}>
        <Button
          variant="outline"
          onClick={() => goto("المشاريع", { status: "notDone" })}
        >
          أعمال غير منفذة: {all.notDone.length}
        </Button>
        <Button
          variant="outline"
          onClick={() => goto("المشاريع", { status: "notDelivered" })}
        >
          أعمال غير مسلّمة: {all.notDelivered.length}
        </Button>
        {manage && (
          <Button variant="outline" onClick={() => goto("الفواتير")}>
            فواتير عليها رصيد:{" "}
            {
              d.invoices.filter(
                (i) => !i.voidedAt && Number(i.amount) > paid(i.id),
              ).length
            }
          </Button>
        )}
      </div>

      {manage && (
        <div className={styles.quick}>
          {[
            ["project", "مشروع جديد"],
            ["invoice", "فاتورة جديدة"],
            ["receipt", "سند قبض"],
            ["cost", "مصروف مشروع سريع"],
          ].map(([kind, label]) => (
            <Button variant="outline" key={kind} onClick={() => open(kind)}>
              <Plus size={18} />
              {label}
            </Button>
          ))}
          <Button
            variant="outline"
            onClick={() => open("project", { workType: "عمل سريع", status: "قيد التنفيذ" })}
          >
            <Plus size={18} />
            عمل سريع
          </Button>
        </div>
      )}

      <div className={styles.sectionHead}>
        <h2>المشاريع الحالية</h2>
        <Button variant="link" onClick={() => goto("المشاريع")}>
          كل المشاريع <ArrowUpLeft size={17} />
        </Button>
      </div>
      <section className={styles.cards}>
        {d.projects
          .filter((p) => !["تم التسليم", "مغلق", "ملغي"].includes(p.status))
          .slice(0, 6)
          .map((p) => (
            <article key={p.id}>
              <span className={styles.badge}>{p.status}</span>
              <h3>{p.name}</h3>
              <p>{name(p.customerId)}</p>
              <strong>{money(p.amount)}</strong>
              {canAddCost && !["مغلق", "ملغي"].includes(p.status) && (
                <Button
                  variant="outline"
                  onClick={() => open("cost", { projectId: p.id })}
                >
                  إضافة مصروف سريع
                </Button>
              )}
            </article>
          ))}
        {!d.projects.length && (
          <p className={styles.empty}>ابدأ بإضافة عميل، ثم مشروع أو فاتورة.</p>
        )}
      </section>
            {manage &&
        d.materials.some(
          (m) => Number(m.stockQty) <= Number(m.minQty),
        ) && (
          <Button
            className={styles.lowAlert}
            variant="outline"
            onClick={() => goto("المخزون")}
          >
            تنبيه: توجد مواد وصلت إلى حد إعادة الطلب
          </Button>
        )}
    </div>
  );
}
