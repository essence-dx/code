export interface SocialSafeZoneInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface SocialSafeZone {
  label: string;
  insets: SocialSafeZoneInsets;
}

export interface SocialFormatPreset {
  id: string;
  label: string;
  platform: string;
  aspectRatio: string;
  width: number;
  height: number;
  description: string;
  safeZones: {
    action: SocialSafeZone;
    title: SocialSafeZone;
  };
}

export interface SocialDeliveryPreset {
  id: string;
  label: string;
  socialFormatId: string;
  exportPresetId: string;
  description: string;
}

export const socialFormatPresets: SocialFormatPreset[] = [
  {
    id: "youtube-video",
    label: "YouTube Video",
    platform: "YouTube",
    aspectRatio: "16:9",
    width: 1920,
    height: 1080,
    description: "Landscape exports for long-form video and embeds.",
    safeZones: {
      action: { label: "Action safe", insets: { top: 0.1, right: 0.1, bottom: 0.1, left: 0.1 } },
      title: { label: "Title safe", insets: { top: 0.16, right: 0.18, bottom: 0.16, left: 0.18 } },
    },
  },
  {
    id: "youtube-shorts",
    label: "Shorts",
    platform: "YouTube",
    aspectRatio: "9:16",
    width: 1080,
    height: 1920,
    description: "Vertical short-form video with bottom UI clearance.",
    safeZones: {
      action: { label: "Shorts safe", insets: { top: 0.08, right: 0.08, bottom: 0.16, left: 0.08 } },
      title: { label: "Text safe", insets: { top: 0.14, right: 0.14, bottom: 0.24, left: 0.14 } },
    },
  },
  {
    id: "instagram-reels",
    label: "Instagram Reels",
    platform: "Instagram",
    aspectRatio: "9:16",
    width: 1080,
    height: 1920,
    description: "Instagram Reels and Stories with bottom caption and action clearance.",
    safeZones: {
      action: { label: "Reels safe", insets: { top: 0.08, right: 0.1, bottom: 0.19, left: 0.08 } },
      title: { label: "Caption safe", insets: { top: 0.14, right: 0.16, bottom: 0.29, left: 0.12 } },
    },
  },
  {
    id: "tiktok-reel",
    label: "TikTok",
    platform: "TikTok",
    aspectRatio: "9:16",
    width: 1080,
    height: 1920,
    description: "Vertical creator video with right rail and caption clearance.",
    safeZones: {
      action: { label: "Vertical safe", insets: { top: 0.08, right: 0.16, bottom: 0.18, left: 0.08 } },
      title: { label: "Caption safe", insets: { top: 0.14, right: 0.22, bottom: 0.28, left: 0.12 } },
    },
  },
  {
    id: "linkedin-feed",
    label: "LinkedIn Feed",
    platform: "LinkedIn",
    aspectRatio: "4:5",
    width: 1080,
    height: 1350,
    description: "Professional feed video and image posts with conservative text margins.",
    safeZones: {
      action: { label: "Feed safe", insets: { top: 0.08, right: 0.08, bottom: 0.12, left: 0.08 } },
      title: { label: "Text safe", insets: { top: 0.14, right: 0.14, bottom: 0.2, left: 0.14 } },
    },
  },
  {
    id: "linkedin-video",
    label: "LinkedIn Video",
    platform: "LinkedIn",
    aspectRatio: "16:9",
    width: 1920,
    height: 1080,
    description: "Landscape business videos, webinars, and product updates.",
    safeZones: {
      action: { label: "Video safe", insets: { top: 0.1, right: 0.1, bottom: 0.12, left: 0.1 } },
      title: { label: "Text safe", insets: { top: 0.16, right: 0.18, bottom: 0.18, left: 0.18 } },
    },
  },
  {
    id: "linkedin-banner",
    label: "LinkedIn Banner",
    platform: "LinkedIn",
    aspectRatio: "4:1",
    width: 1600,
    height: 400,
    description: "Wide profile and company-page banner artwork.",
    safeZones: {
      action: { label: "Banner safe", insets: { top: 0.16, right: 0.12, bottom: 0.16, left: 0.18 } },
      title: { label: "Logo safe", insets: { top: 0.22, right: 0.18, bottom: 0.22, left: 0.28 } },
    },
  },
  {
    id: "instagram-square",
    label: "Square Feed",
    platform: "Instagram",
    aspectRatio: "1:1",
    width: 1080,
    height: 1080,
    description: "Square feed posts, carousels, and compact ads.",
    safeZones: {
      action: { label: "Feed safe", insets: { top: 0.08, right: 0.08, bottom: 0.08, left: 0.08 } },
      title: { label: "Text safe", insets: { top: 0.14, right: 0.14, bottom: 0.14, left: 0.14 } },
    },
  },
  {
    id: "instagram-feed-portrait",
    label: "Instagram Feed",
    platform: "Instagram",
    aspectRatio: "4:5",
    width: 1080,
    height: 1350,
    description: "Portrait feed post with room for captions and product text.",
    safeZones: {
      action: { label: "Feed safe", insets: { top: 0.08, right: 0.08, bottom: 0.1, left: 0.08 } },
      title: { label: "Text safe", insets: { top: 0.14, right: 0.14, bottom: 0.18, left: 0.14 } },
    },
  },
  {
    id: "portrait-feed",
    label: "Portrait Feed",
    platform: "Instagram",
    aspectRatio: "4:5",
    width: 1080,
    height: 1350,
    description: "Portrait social posts with extra vertical real estate.",
    safeZones: {
      action: { label: "Portrait safe", insets: { top: 0.08, right: 0.08, bottom: 0.1, left: 0.08 } },
      title: { label: "Text safe", insets: { top: 0.14, right: 0.14, bottom: 0.18, left: 0.14 } },
    },
  },
  {
    id: "youtube-thumbnail",
    label: "YouTube Thumbnail",
    platform: "YouTube",
    aspectRatio: "16:9",
    width: 1280,
    height: 720,
    description: "Thumbnail canvas with generous title and face-safe areas.",
    safeZones: {
      action: { label: "Thumbnail safe", insets: { top: 0.08, right: 0.08, bottom: 0.08, left: 0.08 } },
      title: { label: "Title safe", insets: { top: 0.16, right: 0.16, bottom: 0.16, left: 0.16 } },
    },
  },
  {
    id: "youtube-channel-banner",
    label: "YouTube Banner",
    platform: "YouTube",
    aspectRatio: "16:9",
    width: 2560,
    height: 1440,
    description: "Channel banner artwork with center-safe text area.",
    safeZones: {
      action: { label: "TV safe", insets: { top: 0.1, right: 0.08, bottom: 0.1, left: 0.08 } },
      title: { label: "Desktop safe", insets: { top: 0.36, right: 0.28, bottom: 0.36, left: 0.28 } },
    },
  },
  {
    id: "wide-cinema",
    label: "Wide Cinema",
    platform: "Web",
    aspectRatio: "21:9",
    width: 2560,
    height: 1080,
    description: "Wide embeds, banners, and cinematic hero media.",
    safeZones: {
      action: { label: "Wide safe", insets: { top: 0.1, right: 0.12, bottom: 0.1, left: 0.12 } },
      title: { label: "Title safe", insets: { top: 0.18, right: 0.22, bottom: 0.18, left: 0.22 } },
    },
  },
];

export const socialDeliveryPresets: SocialDeliveryPreset[] = [
  {
    id: "youtube-1080p",
    label: "YouTube 1080p",
    socialFormatId: "youtube-video",
    exportPresetId: "mp4-1080p",
    description: "Landscape MP4 for channels, courses, and embeds.",
  },
  {
    id: "shorts-mp4",
    label: "Shorts MP4",
    socialFormatId: "youtube-shorts",
    exportPresetId: "mp4-vertical-1080",
    description: "Vertical MP4 for Shorts and mobile-first posting.",
  },
  {
    id: "tiktok-reels-mp4",
    label: "TikTok MP4",
    socialFormatId: "tiktok-reel",
    exportPresetId: "mp4-vertical-1080",
    description: "Vertical MP4 with safe-zone-aware framing.",
  },
  {
    id: "instagram-reels-mp4",
    label: "Reels MP4",
    socialFormatId: "instagram-reels",
    exportPresetId: "mp4-vertical-1080",
    description: "Vertical MP4 for Instagram Reels and Stories.",
  },
  {
    id: "linkedin-feed-mp4",
    label: "LinkedIn Feed MP4",
    socialFormatId: "linkedin-feed",
    exportPresetId: "mp4-vertical-1080",
    description: "Portrait MP4 for LinkedIn feed delivery.",
  },
  {
    id: "square-gif",
    label: "Square GIF",
    socialFormatId: "instagram-square",
    exportPresetId: "gif-social-square",
    description: "Square animated GIF for feed previews and reactions.",
  },
  {
    id: "thumbnail-png",
    label: "Thumbnail PNG",
    socialFormatId: "youtube-thumbnail",
    exportPresetId: "png-current-frame",
    description: "Still PNG from the current playhead frame.",
  },
  {
    id: "linkedin-banner-png",
    label: "LinkedIn Banner PNG",
    socialFormatId: "linkedin-banner",
    exportPresetId: "png-current-frame",
    description: "Still PNG for LinkedIn profile and company banners.",
  },
  {
    id: "youtube-banner-png",
    label: "YouTube Banner PNG",
    socialFormatId: "youtube-channel-banner",
    exportPresetId: "png-current-frame",
    description: "Still PNG for YouTube channel banner artwork.",
  },
];

export function preferredSocialFormatForAspect(aspectRatio: string) {
  return socialFormatPresets.find((preset) => preset.aspectRatio === aspectRatio) ?? socialFormatPresets[0];
}

export function findSocialFormatPreset(id: string) {
  return socialFormatPresets.find((preset) => preset.id === id) ?? socialFormatPresets[0];
}

export function preferredSocialFormatForCanvas({
  socialFormatId,
  aspectRatio,
  width,
  height,
}: {
  socialFormatId?: string;
  aspectRatio: string;
  width: number;
  height: number;
}) {
  return (
    socialFormatPresets.find((preset) => preset.id === socialFormatId) ??
    socialFormatPresets.find((preset) => preset.width === width && preset.height === height) ??
    preferredSocialFormatForAspect(aspectRatio)
  );
}
