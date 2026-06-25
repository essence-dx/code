export const embedFramePolicies = ["allowlist", "deny", "self"] as const;
export const embedSandboxPresets = [
  "interactive",
  "preview",
  "strict",
  "trusted",
] as const;

export type EmbedFramePolicy = (typeof embedFramePolicies)[number];
export type EmbedSandboxPreset = (typeof embedSandboxPresets)[number];

export type EmbedSecurityPolicy = {
  allowedOrigins: string[];
  configSource: "default" | "env";
  framePolicy: EmbedFramePolicy;
  sandboxAttributes: string;
  sandboxPreset: EmbedSandboxPreset;
};
