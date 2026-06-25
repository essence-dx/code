import type { EmailBlock, EmailSection } from "@/features/email/email-model";

export type EmailBlockPackId =
  | "none"
  | "product-update"
  | "event-reminder"
  | "newsletter-footer";

export type EmailBlockPack = {
  id: EmailBlockPackId;
  label: string;
  description: string;
  section: EmailSection | null;
};

export const emailBlockPacks: EmailBlockPack[] = [
  {
    id: "none",
    label: "No extra block",
    description: "Use only blocks generated from the selected design.",
    section: null,
  },
  {
    id: "product-update",
    label: "Product update CTA",
    description: "A headline, short copy, divider, and launch button.",
    section: createReusableSection("product-update", "Product update CTA", [
      createTextBlock({
        id: "product-update-heading",
        content: "What changed this week",
        fontSize: 28,
        fontWeight: 800,
        align: "center",
      }),
      createTextBlock({
        id: "product-update-copy",
        content:
          "Share the key product improvement, who it helps, and the clearest next action.",
        fontSize: 16,
        lineHeight: 1.5,
        align: "center",
      }),
      {
        id: "product-update-button",
        type: "button",
        label: "Read the update",
        href: "https://example.com",
        backgroundColor: "#111827",
        color: "#ffffff",
        align: "center",
        padding: 18,
      },
    ]),
  },
  {
    id: "event-reminder",
    label: "Event reminder",
    description: "A compact reminder block with agenda and registration CTA.",
    section: createReusableSection("event-reminder", "Event reminder", [
      createTextBlock({
        id: "event-reminder-kicker",
        content: "Reminder",
        fontSize: 13,
        fontWeight: 800,
        align: "center",
        color: "#2563eb",
      }),
      createTextBlock({
        id: "event-reminder-title",
        content: "Your session starts soon",
        fontSize: 26,
        fontWeight: 800,
        align: "center",
      }),
      createTextBlock({
        id: "event-reminder-body",
        content:
          "Add the date, time, location, and one sentence about what attendees will get from joining.",
        fontSize: 15,
        align: "center",
      }),
      {
        id: "event-reminder-button",
        type: "button",
        label: "Join or register",
        href: "https://example.com",
        backgroundColor: "#2563eb",
        color: "#ffffff",
        align: "center",
        padding: 18,
      },
    ]),
  },
  {
    id: "newsletter-footer",
    label: "Newsletter footer",
    description: "A reusable footer with divider, preference link, and signoff.",
    section: createReusableSection("newsletter-footer", "Newsletter footer", [
      {
        id: "newsletter-footer-divider",
        type: "divider",
        color: "#e5e7eb",
        height: 1,
        padding: 18,
      },
      createTextBlock({
        id: "newsletter-footer-copy",
        content:
          "You are receiving this because you signed up for updates. Update preferences or unsubscribe from your email provider.",
        fontSize: 12,
        lineHeight: 1.5,
        align: "center",
        color: "#71717a",
      }),
    ]),
  },
];

export function normalizeEmailBlockPackId(
  value: string | null | undefined,
): EmailBlockPackId {
  return emailBlockPacks.some((pack) => pack.id === value)
    ? (value as EmailBlockPackId)
    : "none";
}

export function getEmailBlockPack(id: EmailBlockPackId) {
  return emailBlockPacks.find((pack) => pack.id === id) ?? emailBlockPacks[0];
}

export function createReusableEmailSection(
  id: EmailBlockPackId,
): EmailSection | null {
  const section = getEmailBlockPack(id).section;

  if (!section) return null;

  return {
    ...section,
    blocks: section.blocks.map((block) => ({ ...block })),
  };
}

function createReusableSection(
  id: EmailBlockPackId,
  name: string,
  blocks: EmailBlock[],
): EmailSection {
  return {
    id: `reusable-${id}`,
    name,
    background: "#ffffff",
    blocks,
  };
}

function createTextBlock(
  input: Partial<Extract<EmailBlock, { type: "text" }>> & {
    id: string;
    content: string;
  },
): Extract<EmailBlock, { type: "text" }> {
  return {
    id: input.id,
    type: "text",
    content: input.content,
    align: input.align ?? "left",
    color: input.color ?? "#111827",
    fontFamily: input.fontFamily ?? "Arial",
    fontSize: input.fontSize ?? 16,
    fontWeight: input.fontWeight ?? 500,
    lineHeight: input.lineHeight ?? 1.45,
    backgroundColor: input.backgroundColor ?? "transparent",
    padding: input.padding ?? 16,
  };
}
