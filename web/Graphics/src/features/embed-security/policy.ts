import {
  embedFramePolicies,
  embedSandboxPresets,
  type EmbedFramePolicy,
  type EmbedSandboxPreset,
  type EmbedSecurityPolicy,
} from "@/features/embed-security/types";

type EmbedPolicyConfigValue =
  | string
  | string[]
  | {
      allowedOrigins?: string[];
      framePolicy?: string;
      sandboxPreset?: string;
    };

type EmbedPolicyScope = {
  fileId?: string | null;
  shareId?: string | null;
  token?: string | null;
};

const defaultPolicy: EmbedSecurityPolicy = {
  allowedOrigins: [],
  configSource: "default",
  framePolicy: "self",
  sandboxAttributes: "allow-same-origin allow-scripts allow-popups",
  sandboxPreset: "interactive",
};

const sandboxAttributesByPreset: Record<EmbedSandboxPreset, string> = {
  interactive: "allow-same-origin allow-scripts allow-popups",
  preview: "allow-same-origin allow-scripts",
  strict: "allow-same-origin",
  trusted:
    "allow-downloads allow-forms allow-popups allow-same-origin allow-scripts",
};

export function resolveEmbedSecurityPolicy({
  env = process.env,
  fileId,
  shareId,
  token,
}: EmbedPolicyScope & {
  env?: Record<string, string | undefined>;
}): EmbedSecurityPolicy {
  const policyConfig = parseEmbedPolicyConfig(env.ESSENCE_EMBED_HOST_ALLOWLISTS);
  const scopedConfig = getScopedEmbedPolicyConfig(policyConfig, {
    fileId,
    shareId,
    token,
  });
  const allowedOrigins = normalizeAllowedOrigins(
    scopedConfig?.allowedOrigins ??
      parseOriginList(env.ESSENCE_EMBED_ALLOWED_ORIGINS),
  );
  const framePolicy = normalizeFramePolicy(
    scopedConfig?.framePolicy ?? env.ESSENCE_EMBED_FRAME_POLICY,
    allowedOrigins.length > 0 ? "allowlist" : defaultPolicy.framePolicy,
  );
  const sandboxPreset = normalizeSandboxPreset(
    scopedConfig?.sandboxPreset ?? env.ESSENCE_EMBED_SANDBOX_PRESET,
  );

  return {
    allowedOrigins,
    configSource: scopedConfig ? "env" : allowedOrigins.length > 0 ? "env" : "default",
    framePolicy,
    sandboxAttributes: sandboxAttributesByPreset[sandboxPreset],
    sandboxPreset,
  };
}

export function createEmbedContentSecurityPolicy(policy: EmbedSecurityPolicy) {
  const frameAncestors = getFrameAncestorsDirective(policy);

  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    `frame-ancestors ${frameAncestors}`,
  ].join("; ");
}

export function getEmbedXFrameOptions(policy: EmbedSecurityPolicy) {
  if (policy.framePolicy === "deny") {
    return "DENY";
  }

  if (policy.framePolicy === "self") {
    return "SAMEORIGIN";
  }

  return null;
}

export function isEmbedOriginAllowed(
  origin: string | null,
  policy: EmbedSecurityPolicy,
  appOrigin?: string | null,
) {
  if (!origin) {
    return true;
  }

  if (policy.framePolicy === "deny") {
    return false;
  }

  if (policy.framePolicy === "self") {
    return appOrigin
      ? normalizeOrigin(origin) === normalizeOrigin(appOrigin)
      : false;
  }

  const normalizedOrigin = normalizeOrigin(origin);

  return policy.allowedOrigins.some((allowedOrigin) =>
    matchesAllowedOrigin(normalizedOrigin, allowedOrigin),
  );
}

function getFrameAncestorsDirective(policy: EmbedSecurityPolicy) {
  if (policy.framePolicy === "deny") {
    return "'none'";
  }

  if (policy.framePolicy === "self") {
    return "'self'";
  }

  return ["'self'", ...policy.allowedOrigins].join(" ");
}

function parseEmbedPolicyConfig(value: string | undefined) {
  if (!value) {
    return new Map<string, EmbedPolicyConfigValue>();
  }

  const parsed = tryParseJson(value);

  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return new Map(
      Object.entries(parsed as Record<string, EmbedPolicyConfigValue>),
    );
  }

  return new Map(
    value
      .split(";")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const [key, origins = ""] = entry.split("=");

        return [key.trim(), parseOriginList(origins)] as const;
      }),
  );
}

function getScopedEmbedPolicyConfig(
  config: Map<string, EmbedPolicyConfigValue>,
  scope: EmbedPolicyScope,
) {
  const candidates = [
    scope.token ? `token:${scope.token}` : "",
    scope.token ?? "",
    scope.shareId ? `share:${scope.shareId}` : "",
    scope.shareId ?? "",
    scope.fileId ? `file:${scope.fileId}` : "",
    scope.fileId ?? "",
    "*",
  ].filter(Boolean);

  for (const candidate of candidates) {
    const value = config.get(candidate);

    if (value !== undefined) {
      return normalizePolicyConfigValue(value);
    }
  }

  return null;
}

function normalizePolicyConfigValue(value: EmbedPolicyConfigValue) {
  if (typeof value === "string" || Array.isArray(value)) {
    return {
      allowedOrigins: parseOriginList(value),
    };
  }

  return {
    allowedOrigins: normalizeAllowedOrigins(value.allowedOrigins ?? []),
    framePolicy: value.framePolicy,
    sandboxPreset: value.sandboxPreset,
  };
}

function parseOriginList(value: string | string[] | undefined) {
  if (!value) {
    return [];
  }

  return normalizeAllowedOrigins(
    Array.isArray(value)
      ? value
      : value
          .split(",")
          .map((origin) => origin.trim())
          .filter(Boolean),
  );
}

function normalizeAllowedOrigins(origins: string[]) {
  return Array.from(
    new Set(
      origins
        .map((origin) => normalizeOrigin(origin))
        .filter((origin) => origin.startsWith("https://")),
    ),
  );
}

function normalizeFramePolicy(
  value: string | undefined,
  fallback: EmbedFramePolicy,
) {
  return embedFramePolicies.find((policy) => policy === value) ?? fallback;
}

function normalizeSandboxPreset(value: string | undefined) {
  return (
    embedSandboxPresets.find((preset) => preset === value) ??
    defaultPolicy.sandboxPreset
  );
}

function normalizeOrigin(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");

  if (trimmed.startsWith("https://*.") || trimmed === "https://*") {
    return trimmed.toLowerCase();
  }

  try {
    return new URL(trimmed).origin.toLowerCase();
  } catch {
    return "";
  }
}

function matchesAllowedOrigin(origin: string, allowedOrigin: string) {
  if (allowedOrigin === origin) {
    return true;
  }

  if (!allowedOrigin.startsWith("https://*.")) {
    return false;
  }

  const suffix = allowedOrigin.replace("https://*.", ".");

  try {
    return new URL(origin).hostname.endsWith(suffix);
  } catch {
    return false;
  }
}

function tryParseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}
