import { z } from "zod";
import { isValidEmail, normalizeEmail } from "@/lib/email";

export const contactExtractionSchema = z.object({
  emailFound: z.boolean(),
  emails: z.array(
    z.object({
      email: z.string().refine(isValidEmail, "Invalid email syntax."),
      visibleContext: z.string().min(1).max(500),
      confidence: z.number().min(0).max(1),
    }),
  ),
  displayName: z.string().trim().min(1).max(120).nullable(),
  profileBio: z.string().trim().min(1).max(500).nullable(),
  creatorCategory: z.string().trim().min(1).max(120).nullable(),
  personalizationHook: z.string().trim().min(1).max(280).nullable(),
  publicLocation: z.string().trim().min(1).max(120).nullable(),
  notes: z.array(z.string().trim().min(1).max(500)).max(20),
}).superRefine((value, context) => {
  if (value.emailFound !== (value.emails.length > 0)) {
    context.addIssue({
      code: "custom",
      message: "emailFound must match whether emails are present.",
    });
  }
});

export type ContactExtractionResult = z.infer<typeof contactExtractionSchema>;

export function validateExtraction(value: unknown): ContactExtractionResult {
  const parsed = contactExtractionSchema.parse(value);
  return {
    ...parsed,
    emails: parsed.emails.map((item) => ({
      ...item,
      email: normalizeEmail(item.email),
    })),
  };
}
