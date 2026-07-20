import OpenAI from "openai";
import type { VisionProvider } from "@/lib/vision/provider";
import { validateExtraction } from "@/lib/vision/schema";

const EXTRACTION_PROMPT = `Extract only publicly displayed business contact information visible in this screenshot.
Never guess, infer, or construct an email from a username.
Also extract only visibly supported professional creator context: profileBio, creatorCategory, personalizationHook, and publicLocation.
profileBio must transcribe or closely summarize visible creator/business bio text relevant to their content. creatorCategory must be a short category directly supported by visible words. personalizationHook must be a short factual observation grounded in visible profile or content text and suitable for recruiter review.
publicLocation may contain only a broad city, region, or country explicitly displayed in the public profile or business information. Never infer it from language, appearance, background scenery, phone metadata, or other indirect clues, and never extract a street address or precise location.
Use null for any profile field that is not clearly visible. Do not extract or infer demographics, precise location, health, religion, politics, sexual orientation, other sensitive traits, audience size, or performance.
Return JSON with emailFound, emails (email, visibleContext, confidence), displayName, profileBio, creatorCategory, personalizationHook, publicLocation, and notes.
The visibleContext must quote the nearby evidence shown in the image.
If no email is visible, return emailFound false and an empty emails array.`;

export class OpenAIVisionProvider implements VisionProvider {
  async extractPublicContactInformation(image: {
    bytes: Uint8Array;
    mimeType: "image/png" | "image/jpeg" | "image/webp";
  }) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured.");
    }
    const dataUrl = `data:${image.mimeType};base64,${Buffer.from(image.bytes).toString("base64")}`;
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
            required: [
              "emailFound",
              "emails",
              "displayName",
              "profileBio",
              "creatorCategory",
              "personalizationHook",
              "publicLocation",
              "notes",
            ],
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
              profileBio: { type: ["string", "null"] },
              creatorCategory: { type: ["string", "null"] },
              personalizationHook: { type: ["string", "null"] },
              publicLocation: { type: ["string", "null"] },
              notes: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
    });
    return validateExtraction(JSON.parse(response.output_text));
  }
}
