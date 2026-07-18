import { readFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import type { VisionProvider } from "@/lib/vision/provider";
import { validateExtraction } from "@/lib/vision/schema";

const EXTRACTION_PROMPT = `Extract only publicly displayed business contact information visible in this screenshot.
Never guess, infer, or construct an email from a username.
Return JSON with emailFound, emails (email, visibleContext, confidence), displayName, and notes.
The visibleContext must quote the nearby evidence shown in the image.
If no email is visible, return emailFound false and an empty emails array.`;

function imageMimeType(imagePath: string): string {
  const extension = path.extname(imagePath).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  return "image/jpeg";
}

export class OpenAIVisionProvider implements VisionProvider {
  async extractPublicContactInformation(imagePath: string) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured.");
    }
    const bytes = await readFile(imagePath);
    const dataUrl = `data:${imageMimeType(imagePath)};base64,${bytes.toString("base64")}`;
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_VISION_MODEL || "gpt-5.4-nano",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: EXTRACTION_PROMPT },
            { type: "input_image", image_url: dataUrl, detail: "high" },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "contact_extraction",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["emailFound", "emails", "displayName", "notes"],
            properties: {
              emailFound: { type: "boolean" },
              emails: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["email", "visibleContext", "confidence"],
                  properties: {
                    email: { type: "string" },
                    visibleContext: { type: "string" },
                    confidence: { type: "number" },
                  },
                },
              },
              displayName: { type: ["string", "null"] },
              notes: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
    });
    return validateExtraction(JSON.parse(response.output_text));
  }
}
