import { useRef, useState, type FormEvent } from "react";
import { postAccountingSettings, schema, type InputType } from "../endpoints/accounting_settings_POST.schema";
import type { AccountingData } from "../endpoints/accounting_GET.schema";
import { Button } from "./Button";
import { Input } from "./Input";
import { Textarea } from "./Textarea";
import { AccountingChoice } from "./AccountingChoice";
import styles from "./AccountingSettingsPanel.module.css";

type Settings = NonNullable<AccountingData["settings"]>;

async function resizeLogo(file: File): Promise<string> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    throw new Error("اختر صورة PNG أو JPEG أو WebP");
  }
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 480 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("تعذرت معالجة صورة الشعار");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let dataUrl = canvas.toDataURL("image/png");
    if (dataUrl.length > 650_000) {
      context.globalCompositeOperation = "destination-over";
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    }
    if (dataUrl.length > 700_000) {
      throw new Error("حجم الشعار كبير؛ اختر صورة أصغر");
    }
    return dataUrl;
  } finally {
    bitmap.close();
  }
}

export function AccountingSettingsPanel({
  settings,
  onSaved,
  className,
}: {
  settings: Settings;
  onSaved: () => Promise<void>;
  className?: string;
}) {
  const [values, setValues] = useState<InputType>({
    companyName: settings.companyName,
    tagline: settings.tagline,
    phone: settings.phone,
    address: settings.address,
    documentFooter: settings.documentFooter,
    roundingDecimals: settings.roundingDecimals === 2 ? 2 : 0,
    logoDataUrl: settings.logoDataUrl,
  });
  const [processingLogo, setProcessingLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const submitting = useRef(false);

  async function onLogo(file: File | undefined) {
    if (!file || processingLogo || submitting.current) return;
    setProcessingLogo(true);
    setError("");
    setMessage("");
    try {
      const logoDataUrl = await resizeLogo(file);
      setValues((previous) => ({ ...previous, logoDataUrl }));
    } catch (cause) {
      console.error("تعذرت معالجة الشعار", cause);
      setError(cause instanceof Error ? cause.message : "تعذرت معالجة الشعار");
    } finally {
      setProcessingLogo(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || processingLogo) return;
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setError(issue.path[0] === "companyName"
        ? "يجب أن يتكون اسم المنشأة من حرفين على الأقل"
        : issue.message);
      return;
    }
    submitting.current = true;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await postAccountingSettings(parsed.data);
      await onSaved();
      setMessage("تم حفظ الإعدادات");
    } catch (cause) {
      console.error("تعذر حفظ الإعدادات أو تحديثها", cause);
      setError(cause instanceof Error ? cause.message : "تعذر حفظ الإعدادات");
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <section dir="rtl" className={`${styles.panel} ${className ?? ""}`}>
      <div className={styles.heading}>
        <h2>إعدادات المنشأة والمستندات</h2>
        <p>تظهر بيانات المنشأة في ترويسات المستندات الصادرة.</p>
      </div>
      <form className={styles.form} onSubmit={(event) => void save(event)}>
        <div className={styles.fields}>
          <label>اسم المنشأة
            <Input required minLength={2} maxLength={120} value={values.companyName}
              onChange={(event) => setValues({ ...values, companyName: event.target.value })} />
          </label>
          <label>العبارة التعريفية
            <Input maxLength={120} value={values.tagline}
              onChange={(event) => setValues({ ...values, tagline: event.target.value })} />
          </label>
          <label>رقم الهاتف
            <Input type="tel" maxLength={40} value={values.phone}
              onChange={(event) => setValues({ ...values, phone: event.target.value })} />
          </label>
          <label>العنوان
            <Input maxLength={200} value={values.address}
              onChange={(event) => setValues({ ...values, address: event.target.value })} />
          </label>
        </div>
        <label>تذييل المستندات
          <Textarea maxLength={500} value={values.documentFooter}
            onChange={(event) => setValues({ ...values, documentFooter: event.target.value })} />
        </label>
        <div className={styles.section}>
          <label>تقريب المبالغ
            <AccountingChoice
              label="تقريب المبالغ"
              value={values.roundingDecimals}
              options={[
                { value: 0, label: "بدون كسور (أقرب ريال)" },
                { value: 2, label: "منزلتان عشريتان" },
              ]}
              onChange={(value) => {
                if (value !== "0" && value !== "2") {
                  setError("اختر طريقة تقريب صالحة");
                  return;
                }
                setError("");
                setValues({ ...values, roundingDecimals: value === "2" ? 2 : 0 });
              }}
            />
          </label>
          <p className={styles.hint}>ينطبق التقريب على العمليات الجديدة فقط؛ لا تتغير السجلات السابقة.</p>
        </div>
        <div className={styles.section}>
          <label htmlFor="accounting-logo">شعار المنشأة</label>
          <Input id="accounting-logo" type="file" accept="image/png,image/jpeg,image/webp"
            disabled={saving || processingLogo}
            onChange={(event) => {
              void onLogo(event.target.files?.[0]);
              event.target.value = "";
            }} />
          {processingLogo && <p role="status">جارٍ تجهيز الشعار…</p>}
          {values.logoDataUrl && (
            <div className={styles.logoRow}>
              <img className={styles.logo} src={values.logoDataUrl} alt="معاينة شعار المنشأة" />
              <Button type="button" variant="secondary" disabled={saving || processingLogo}
                onClick={() => setValues({ ...values, logoDataUrl: null })}>
                إزالة الشعار
              </Button>
            </div>
          )}
          <p className={styles.hint}>عند عدم وجود شعار، تستخدم المستندات الترويسة النصية.</p>
        </div>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {message && <p className={styles.success} role="status">{message}</p>}
        <Button type="submit" disabled={saving || processingLogo}>
          {saving ? "جارٍ الحفظ…" : "حفظ الإعدادات"}
        </Button>
      </form>
    </section>
  );
}
