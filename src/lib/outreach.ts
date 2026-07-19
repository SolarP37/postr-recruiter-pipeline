export const CREATOR_OUTREACH_SUBJECT = "Open to paid brand collaborations?";

export type CreatorOutreachContext = {
  displayName?: string | null;
  creatorCategory?: string | null;
  personalizationHook?: string | null;
};

function cleanInline(
  value: string | null | undefined,
  maxLength: number,
): string | null {
  return (
    value
      ?.replace(/[\r\n\t]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxLength) || null
  );
}

function withoutTrailingPunctuation(value: string): string {
  return value.replace(/[.!?]+$/, "");
}

export function createCreatorOutreach(context: CreatorOutreachContext) {
  const greeting = cleanInline(context.displayName, 120) || "there";
  const hook = cleanInline(context.personalizationHook, 280);
  const category = cleanInline(context.creatorCategory, 120);
  const personalizedOpening = hook
    ? `I came across your public profile and noticed ${withoutTrailingPunctuation(hook)}.`
    : category
      ? `I came across your public profile while looking for creators working in ${withoutTrailingPunctuation(category)}.`
      : "I came across your public profile while looking for creators who may be a fit for brand collaborations.";

  return {
    subject: CREATOR_OUTREACH_SUBJECT,
    body: `Hi ${greeting},

${personalizedOpening}

I found your publicly listed business contact there. I’m an independent recruiter for Postr, a platform that connects creators and brands. Joining is free, and I can send you my recruiter invitation if you would like to take a look.

Would you be open to the details?

Patrick

If you would rather not receive another message from me, reply “no thanks,” and I will remove your address.`,
  };
}

export function appendReferralLink(body: string, referralLink: string): string {
  return `${body.trim()}\n\nPostr invitation: ${referralLink}`;
}
