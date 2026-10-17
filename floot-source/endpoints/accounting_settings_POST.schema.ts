import {useLedger} from "../../src/local/service";
import superjson from "superjson";
import { z } from "zod";

const logoTooLarge = "حجم الشعار كبير؛ استخدم صورة أصغر من 500 كيلوبايت";

export const schema = z.object({
  companyName: z.string().trim().min(2).max(120),
  tagline: z.string().max(120),
  phone: z.string().max(40),
  address: z.string().max(200),
  documentFooter: z.string().max(500),
  roundingDecimals: z.union([z.literal(0), z.literal(2)]),
  logoDataUrl: z
    .string()
    .max(700_000, logoTooLarge)
    .regex(/^data:image\/(png|jpeg|webp);base64,/, "صيغة الشعار غير مدعومة")
    .nullable(),
});

export type InputType = z.infer<typeof schema>;
export type OutputType = { ok: true };

export async function postAccountingSettings(body:InputType):Promise<OutputType>{await useLedger().settings(schema.parse(body));return {ok:true};}
