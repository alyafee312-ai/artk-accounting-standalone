import { useRef, useState, type FormEvent } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";
import { Textarea } from "./Textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./Dialog";
import styles from "./AccountingVoidDialog.module.css";

export function AccountingVoidDialog({
  title,
  description,
  onConfirm,
  onClose,
  className,
}: {
  title: string;
  description?: string;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
  className?: string;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 3) {
      setError("أدخل سبب الإلغاء من 3 أحرف على الأقل");
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      await onConfirm(trimmedReason);
      onClose();
    } catch (cause) {
      console.error("تعذر إلغاء السجل المالي", cause);
      setError(cause instanceof Error ? cause.message : "تعذر إلغاء السجل");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => {
      if (!open && !submitting.current) onClose();
    }}>
      <DialogContent dir="rtl" className={`${styles.content} ${className ?? ""}`}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description ?? "راجع السجل قبل تأكيد إلغائه."}</DialogDescription>
        </DialogHeader>
        <p className={styles.warning}>
          <AlertTriangle size={20} aria-hidden="true" />
          <span>الإلغاء لا يحذف السجل؛ يبقى ظاهرًا كملغى ويُستبعد من الأرصدة والتقارير ويُسجل في سجل التدقيق.</span>
        </p>
        <form className={styles.form} onSubmit={(event) => void confirm(event)}>
          <label htmlFor="void-reason">سبب الإلغاء</label>
          <Textarea id="void-reason" required minLength={3} maxLength={500}
            value={reason} disabled={busy}
            onChange={(event) => setReason(event.target.value)}
            placeholder="اكتب سبب الإلغاء" />
          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.actions}>
            <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>تراجع</Button>
            <Button type="submit" variant="destructive" disabled={busy}>
              {busy ? "جارٍ الإلغاء…" : "تأكيد الإلغاء"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
