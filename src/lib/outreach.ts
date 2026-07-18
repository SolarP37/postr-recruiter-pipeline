export const CREATOR_OUTREACH_SUBJECT = "Open to paid brand collaborations?";

export function createCreatorOutreach(displayName: string | null | undefined) {
  const greeting = displayName?.trim() || "there";
  return {
    subject: CREATOR_OUTREACH_SUBJECT,
    body: `Hi ${greeting},

I found your publicly listed business contact while looking for creators who may be interested in brand collaboration opportunities.

I’m an independent recruiter for Postr, a platform that connects creators and brands. Joining is free, and I can send you my recruiter invitation if you would like to take a look.

Would you be open to the details?

Patrick

If you would rather not receive another message from me, reply “no thanks,” and I will remove your address.`,
  };
}

export function appendReferralLink(body: string, referralLink: string): string {
  return `${body.trim()}\n\nPostr invitation: ${referralLink}`;
}
