import { Kysely } from "kysely";
import { DB } from "./schema";

export const accountingSettingsDefaults = {
  companyName: "أرتك للديكور والإعلان",
  tagline: "التصميم • الطباعة • الديكور",
  phone: "",
  address: "",
  logoDataUrl: null as string | null,
  roundingDecimals: 2,
  documentFooter: "",
};

export async function getAccountingSettings(tx: Kysely<DB>) {
  const row = await tx
    .selectFrom("accountingSettings")
    .select([
      "companyName",
      "tagline",
      "phone",
      "address",
      "logoDataUrl",
      "roundingDecimals",
      "documentFooter",
    ])
    .where("id", "=", 1)
    .executeTakeFirst();

  return { ...accountingSettingsDefaults, ...row };
}
