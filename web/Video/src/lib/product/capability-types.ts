export const capabilityAreas = [
  "core-editor",
  "ai",
  "assets",
  "audio-recording",
  "export-delivery",
  "desktop",
  "collaboration",
  "platform",
] as const;

export type CapabilityArea = (typeof capabilityAreas)[number];

export type CapabilityStatus = "ready" | "needs-verification" | "partial" | "missing";

export type CapabilityPriority = "p0" | "p1" | "p2";

export interface ProductCapability {
  id: string;
  area: CapabilityArea;
  label: string;
  userValue: string;
  status: CapabilityStatus;
  priority: CapabilityPriority;
  ownerPath: string;
  evidence: string[];
  nextStep: string;
}

export const capabilityAreaLabels: Record<CapabilityArea, string> = {
  "core-editor": "Core editor",
  ai: "Creative AI",
  assets: "Assets and templates",
  "audio-recording": "Audio and recording",
  "export-delivery": "Export and delivery",
  desktop: "Desktop app",
  collaboration: "Collaboration",
  platform: "Platform quality",
};

export const capabilityStatusLabels: Record<CapabilityStatus, string> = {
  ready: "Ready",
  "needs-verification": "Needs verification",
  partial: "Partial",
  missing: "Missing",
};

export const capabilityStatusWeights: Record<CapabilityStatus, number> = {
  ready: 1,
  "needs-verification": 0.7,
  partial: 0.45,
  missing: 0,
};
