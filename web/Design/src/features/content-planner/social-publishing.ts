import type { ContentScheduleSummary } from "@/db/content-planner";

type SocialPublishingTarget = {
  label: string;
  href: string;
  manualUpload: boolean;
};

const socialPublishingTargets: Record<string, SocialPublishingTarget> = {
  Instagram: {
    label: "Open Instagram",
    href: "https://www.instagram.com/",
    manualUpload: true,
  },
  TikTok: {
    label: "Open TikTok upload",
    href: "https://www.tiktok.com/upload",
    manualUpload: true,
  },
  YouTube: {
    label: "Open YouTube Studio",
    href: "https://studio.youtube.com/",
    manualUpload: true,
  },
  LinkedIn: {
    label: "Open LinkedIn",
    href: "https://www.linkedin.com/feed/",
    manualUpload: true,
  },
  Pinterest: {
    label: "Open Pinterest create",
    href: "https://www.pinterest.com/pin-builder/",
    manualUpload: true,
  },
  X: {
    label: "Draft on X",
    href: "https://x.com/compose/post",
    manualUpload: true,
  },
  Website: {
    label: "Open website export",
    href: "/designs",
    manualUpload: true,
  },
  Email: {
    label: "Draft email",
    href: "mailto:",
    manualUpload: true,
  },
};

export function getSocialPublishingTarget(channel: string) {
  return socialPublishingTargets[channel] ?? socialPublishingTargets.Website;
}

export function createSocialPublishingText(item: ContentScheduleSummary) {
  const caption = item.caption.trim();
  const lines = [
    caption || item.title,
    "",
    `Channel: ${item.channel}`,
    `Scheduled: ${new Date(item.scheduledAt).toLocaleString()}`,
  ];

  if (item.projectName) {
    lines.push(`Design: ${item.projectName}`);
  }

  return lines.join("\n").trim();
}

export function getSocialPublisherHref(item: ContentScheduleSummary) {
  if (item.channel === "X") {
    const text = encodeURIComponent(createSocialPublishingText(item));

    return `https://x.com/compose/post?text=${text}`;
  }

  if (item.channel === "Email") {
    const subject = encodeURIComponent(item.title);
    const body = encodeURIComponent(createSocialPublishingText(item));

    return `mailto:?subject=${subject}&body=${body}`;
  }

  return getSocialPublishingTarget(item.channel).href;
}
