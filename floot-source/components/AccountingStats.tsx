import type { ReactNode } from "react";
import styles from "./AccountingStats.module.css";

export function AccountingStats({
  className,
  items,
}: {
  className?: string;
  items: ReadonlyArray<readonly [string, ReactNode]>;
}) {
  return (
    <div className={`${styles.stats} ${className ?? ""}`}>
      {items.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}
