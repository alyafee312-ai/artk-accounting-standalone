import type { ReactNode } from "react";
import styles from "./AccountingTable.module.css";

export function AccountingTable({
  className,
  headers,
  children,
  empty,
}: {
  className?: string;
  headers: string[];
  children: ReactNode;
  empty?: boolean;
}) {
  return (
    <div className={`${styles.tableWrap} ${className ?? ""}`}>
      <table>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {empty && (
        <div className={styles.empty}>
          لا توجد سجلات مطابقة. أضف أول سجل من زر الإضافة.
        </div>
      )}
    </div>
  );
}
