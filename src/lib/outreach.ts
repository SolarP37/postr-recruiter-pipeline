import {
  getLandingPageUrl,
  getHostedQrUrl,
  RECRUITER_CONFIG,
} from "@/config/recruiter";

export type CreatorOutreachContext = {
  creatorFirstName?: string | null;
  displayName?: string | null;
  creatorCategory?: string | null;
  personalizationHook?: string | null;
};

export type BrandOutreachContext = {
  contactFirstName?: string | null;
  organizationName?: string | null;
  brandCategory?: string | null;
  personalizationHook?: string | null;
};

export type TailoredOutreachContext = {
  leadType: "CREATOR" | "BRAND";
  creatorFirstName?: string | null;
  displayName?: string | null;
  organizationName?: string | null;
  creatorCategory?: string | null;
  personalizationHook?: string | null;
};

export type SubjectOption = {
  subject: string;
  score: number;
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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function renderEditedHtml(
  body: string,
  audience: "creator" | "brand" = "creator",
): string {
  const { referralUrl, qrAltText } = RECRUITER_CONFIG;
  const landingUrl = getLandingPageUrl(audience);
  const qrUrl = getHostedQrUrl();
  const paragraphs = body
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) =>
      escapeHtml(paragraph)
        .replaceAll("\n", "<br>")
        .replaceAll(
          referralUrl,
          `<a href="${referralUrl}">${referralUrl}</a>`,
        )
        .replaceAll(
          landingUrl,
          `<a href="${landingUrl}">${landingUrl}</a>`,
        ),
    )
    .map((paragraph) => `<p>${paragraph}</p>`)
    .join("\n");
  return `${paragraphs}
<p><a href="${referralUrl}"><img src="${escapeHtml(qrUrl)}" alt="${escapeHtml(qrAltText)}" width="180" height="180" /></a></p>
<p><a href="${referralUrl}">${referralUrl}</a></p>`;
}

export function replacePersonalizedOpening(
  body: string,
  opening: string,
): string {
  const paragraphs = body.split(/\n{2,}/);
  if (paragraphs.length < 2) return body;
  paragraphs[1] = opening;
  return paragraphs.join("\n\n");
}

function firstName(context: CreatorOutreachContext): string | null {
  const explicit = cleanInline(context.creatorFirstName, 60);
  if (explicit) return explicit.split(/\s+/)[0];
  return cleanInline(context.displayName, 120)?.split(/\s+/)[0] || null;
}

export function createPersonalizedOpening(
  context: CreatorOutreachContext,
): string {
  const hook = cleanInline(context.personalizationHook, 280);
  const category = cleanInline(context.creatorCategory, 120);
  if (hook) {
    return `I came across your public profile and noticed ${withoutTrailingPunctuation(hook)}.`;
  }
  if (category) {
    return `I came across your public profile while looking at creators making ${withoutTrailingPunctuation(category)} content.`;
  }
  return "I came across your public creator profile and thought Postr may be relevant to the type of content you make.";
}

export function createSubjectOptions(
  context: CreatorOutreachContext,
): SubjectOption[] {
  const name = firstName(context);
  return [
    {
      subject: name
        ? `A creator opportunity for ${name}`
        : "A creator opportunity through Postr",
      score: name ? 94 : 86,
    },
    { subject: "Potential brand opportunities through Postr", score: 90 },
    {
      subject: name
        ? `${name}, this may fit your content`
        : "This may fit your creator content",
      score: name ? 88 : 78,
    },
    { subject: "Creator campaign invitation through Postr", score: 84 },
    { subject: "A possible creator partnership resource", score: 80 },
  ];
}

export function createCreatorOutreach(context: CreatorOutreachContext) {
  const greeting = firstName(context) || "there";
  const personalizedOpening = createPersonalizedOpening(context);
  const subject = createSubjectOptions(context)[0].subject;
  const {
    recruiterName,
    recruiterRole,
    referralCode,
    referralUrl,
    minimumFollowerCount,
    qrAltText,
  } = RECRUITER_CONFIG;
  const qrUrl = getHostedQrUrl();
  const landingUrl = getLandingPageUrl("creator");

  const body = `Hi ${greeting},

${personalizedOpening}

My name is ${recruiterName}, and I recruit creators for Postr. Postr connects eligible creators with opportunities to create content and participate in brand campaigns.

Creators generally need at least ${minimumFollowerCount.toLocaleString("en-US")} followers to join. Based on the public information available on your profile, I thought Postr could be relevant to the type of content you create.

You can review the opportunity on my creator invitation page:

${landingUrl}

There is no obligation to join or accept campaigns. You can review the platform first and decide whether it is appropriate for you.

Best,

${recruiterName}
${recruiterRole}
Referral code: ${referralCode}
${landingUrl}

You received this message because a public business contact address was associated with your creator profile. Reply “No thanks” if you do not want additional messages from me.`;

  const htmlBody = `<p>Hi ${escapeHtml(greeting)},</p>
<p>${escapeHtml(personalizedOpening)}</p>
<p>My name is ${escapeHtml(recruiterName)}, and I recruit creators for Postr. Postr connects eligible creators with opportunities to create content and participate in brand campaigns.</p>
<p>Creators generally need at least ${minimumFollowerCount.toLocaleString("en-US")} followers to join. Based on the public information available on your profile, I thought Postr could be relevant to the type of content you create.</p>
<p>You can review the opportunity through my personal invitation:</p>
<p><a href="${referralUrl}">View ${escapeHtml(recruiterName)}’s Postr creator invitation</a></p>
<p>You can also scan the QR code below:</p>
<p><a href="${referralUrl}"><img src="${escapeHtml(qrUrl)}" alt="${escapeHtml(qrAltText)}" width="180" height="180" /></a></p>
<p><a href="${referralUrl}">${referralUrl}</a></p>
<p>There is no obligation to join or accept campaigns. You can review the platform first and decide whether it is appropriate for you.</p>
<p>Best,<br><strong>${escapeHtml(recruiterName)}</strong><br>${escapeHtml(recruiterRole)}<br>Referral code: ${escapeHtml(referralCode)}<br><a href="${referralUrl}">${referralUrl}</a></p>
<p style="font-size:12px;color:#666;">You received this message because a public business contact address was associated with your creator profile. Reply “No thanks” if you do not want additional messages from me.</p>`;

  const landingHtmlBody = htmlBody.replaceAll(
    `href="${referralUrl}"`,
    `href="${landingUrl}"`,
  );
  return {
    subject,
    body,
    htmlBody: landingHtmlBody,
    personalizedOpening,
  };
}

export function createBrandPersonalizedOpening(
  context: BrandOutreachContext,
): string {
  const hook = cleanInline(context.personalizationHook, 280);
  const category = cleanInline(context.brandCategory, 120);
  const organization = cleanInline(context.organizationName, 120);
  if (hook) {
    return `I came across ${organization || "your public business profile"} and noticed ${withoutTrailingPunctuation(hook)}.`;
  }
  if (category) {
    return `I came across ${organization || "your business"} while looking at brands in ${withoutTrailingPunctuation(category)}.`;
  }
  return `I came across ${organization || "your business"} while researching brands that may want to work with creators.`;
}

export function createBrandSubjectOptions(
  context: BrandOutreachContext,
): SubjectOption[] {
  const organization =
    cleanInline(context.organizationName, 80) || "your brand";
  return [
    {
      subject: `A creator campaign resource for ${organization}`,
      score: 92,
    },
    { subject: "Explore creator campaigns through Postr", score: 89 },
    { subject: "A possible creator partnership resource", score: 85 },
    { subject: "Connecting your brand with creators", score: 82 },
  ];
}

export function createBrandOutreach(context: BrandOutreachContext) {
  const greeting = cleanInline(context.contactFirstName, 60) || "there";
  const personalizedOpening = createBrandPersonalizedOpening(context);
  const subject = createBrandSubjectOptions(context)[0].subject;
  const {
    recruiterName,
    recruiterRole,
    referralCode,
    referralUrl,
    qrAltText,
  } = RECRUITER_CONFIG;
  const qrUrl = getHostedQrUrl();
  const landingUrl = getLandingPageUrl("brand");

  const body = `Hi ${greeting},

${personalizedOpening}

My name is ${recruiterName}, and I recruit users for Postr. Postr gives brands a place to launch campaigns and connect with creators who produce content.

I thought it may be worth reviewing for your brand. Campaign availability, creator participation, and results vary, and there is no obligation to join or launch a campaign.

You can review Postr on my brand invitation page:

${landingUrl}

Best,

${recruiterName}
${recruiterRole}
Referral code: ${referralCode}
${landingUrl}

I may receive a referral bonus from qualifying activity. You received this message because a public business contact address was associated with your organization. Reply “No thanks” if you do not want additional messages from me.`;

  const htmlBody = `<p>Hi ${escapeHtml(greeting)},</p>
<p>${escapeHtml(personalizedOpening)}</p>
<p>My name is ${escapeHtml(recruiterName)}, and I recruit users for Postr. Postr gives brands a place to launch campaigns and connect with creators who produce content.</p>
<p>I thought it may be worth reviewing for your brand. Campaign availability, creator participation, and results vary, and there is no obligation to join or launch a campaign.</p>
<p><a href="${referralUrl}">Review Postr through ${escapeHtml(recruiterName)}’s invitation</a></p>
<p><a href="${referralUrl}"><img src="${escapeHtml(qrUrl)}" alt="${escapeHtml(qrAltText)}" width="180" height="180" /></a></p>
<p><a href="${referralUrl}">${referralUrl}</a></p>
<p>Best,<br><strong>${escapeHtml(recruiterName)}</strong><br>${escapeHtml(recruiterRole)}<br>Referral code: ${escapeHtml(referralCode)}</p>
<p style="font-size:12px;color:#666;">I may receive a referral bonus from qualifying activity. You received this message because a public business contact address was associated with your organization. Reply “No thanks” if you do not want additional messages from me.</p>`;

  const landingHtmlBody = htmlBody.replaceAll(
    `href="${referralUrl}"`,
    `href="${landingUrl}"`,
  );
  return {
    subject,
    body,
    htmlBody: landingHtmlBody,
    personalizedOpening,
  };
}

export function createTailoredOutreach(
  context: TailoredOutreachContext,
) {
  return context.leadType === "BRAND"
    ? createBrandOutreach({
        contactFirstName: context.creatorFirstName,
        organizationName:
          context.organizationName || context.displayName,
        brandCategory: context.creatorCategory,
        personalizationHook: context.personalizationHook,
      })
    : createCreatorOutreach({
        creatorFirstName: context.creatorFirstName,
        displayName: context.displayName,
        creatorCategory: context.creatorCategory,
        personalizationHook: context.personalizationHook,
      });
}

export function createTailoredFollowUp(
  context: TailoredOutreachContext,
  followUpNumber: 1 | 2,
) {
  const base = createTailoredOutreach(context);
  const recipient =
    cleanInline(context.creatorFirstName, 60) ||
    cleanInline(context.displayName, 120)?.split(/\s+/)[0] ||
    "there";
  const { recruiterName, recruiterRole, referralCode } = RECRUITER_CONFIG;
  const audience = context.leadType === "BRAND" ? "brand" : "creator";
  const landingUrl = getLandingPageUrl(audience);
  const subject =
    followUpNumber === 1
      ? context.leadType === "BRAND"
        ? "Following up on Postr for your brand"
        : "Following up on the Postr creator invitation"
      : context.leadType === "BRAND"
        ? "Final note about Postr for your brand"
        : "Final note about the Postr creator invitation";
  const reason =
    context.leadType === "BRAND"
      ? "a place for brands to launch campaigns and connect with creators"
      : "a platform that connects eligible creators with brand campaign opportunities";
  const intro =
    followUpNumber === 1
      ? `I wanted to follow up once on the Postr information I sent earlier. Postr is ${reason}.`
      : `This is my final follow-up about Postr, ${reason}. I will not send another reminder if I do not hear back.`;
  const body = `Hi ${recipient},

${intro}

You can review the invitation here:

${landingUrl}

There is no obligation to join or participate. If it is not relevant, no action is needed.

Best,

${recruiterName}
${recruiterRole}
Referral code: ${referralCode}

Reply "No thanks" if you do not want additional messages from me.`;
  return {
    subject,
    body,
    htmlBody: renderEditedHtml(body, audience),
    personalizedOpening: base.personalizedOpening,
  };
}

export function appendReferralLink(body: string, referralLink: string): string {
  return `${body.trim()}\n\nPostr invitation: ${referralLink}`;
}
