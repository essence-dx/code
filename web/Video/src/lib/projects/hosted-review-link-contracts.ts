import { z } from "zod";

export const hostedReviewLinkPermissionSchema = z.enum(["comment-only", "view", "download"]);

export const createHostedReviewLinkInputSchema = z.object({
  projectId: z.string().trim().min(1).max(160),
  permission: hostedReviewLinkPermissionSchema.default("comment-only"),
  expiresInDays: z.number().finite().int().min(1).max(90).default(14),
  exportName: z.string().trim().max(160).optional(),
});

export const updateHostedReviewLinkInputSchema = z
  .object({
    id: z.string().trim().min(1).max(180),
    permission: hostedReviewLinkPermissionSchema.optional(),
    expiresInDays: z.number().finite().int().min(1).max(90).optional(),
    enabled: z.boolean().optional(),
  })
  .refine((value) => value.permission !== undefined || value.expiresInDays !== undefined || value.enabled !== undefined, {
    message: "At least one hosted review link setting must change.",
  });

export const createHostedReviewCommentInputSchema = z.object({
  reviewerName: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((value) => value || "Reviewer"),
  reviewerEmail: z
    .string()
    .trim()
    .max(160)
    .optional()
    .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), "Reviewer email must be valid.")
    .transform((value) => value || undefined),
  body: z.string().trim().min(1).max(2000),
  time: z.number().finite().int().min(0).max(24 * 60 * 60).optional(),
  anchorLabel: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => value || undefined),
});

export const hostedReviewLinkSummarySchema = z.object({
  id: z.string(),
  projectId: z.string(),
  title: z.string(),
  url: z.string(),
  permission: hostedReviewLinkPermissionSchema,
  enabled: z.boolean(),
  expired: z.boolean(),
  exportName: z.string().nullable(),
  expiresAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const hostedReviewLinkPublicSchema = z.object({
  token: z.string(),
  title: z.string(),
  permission: hostedReviewLinkPermissionSchema,
  enabled: z.boolean(),
  expired: z.boolean(),
  exportName: z.string().nullable(),
  expiresAt: z.string(),
  createdAt: z.string(),
});

export const hostedReviewCommentSchema = z.object({
  id: z.string(),
  reviewerName: z.string(),
  reviewerEmail: z
    .string()
    .nullable()
    .optional()
    .transform((value) => value ?? null),
  body: z.string(),
  time: z.number().nullable(),
  anchorLabel: z.string().nullable(),
  resolvedAt: z.string().nullable(),
  createdAt: z.string(),
});

export type HostedReviewLinkPermission = z.infer<typeof hostedReviewLinkPermissionSchema>;
export type CreateHostedReviewLinkInput = z.infer<typeof createHostedReviewLinkInputSchema>;
export type UpdateHostedReviewLinkInput = z.infer<typeof updateHostedReviewLinkInputSchema>;
export type CreateHostedReviewCommentInput = z.infer<typeof createHostedReviewCommentInputSchema>;
export type HostedReviewLinkSummary = z.infer<typeof hostedReviewLinkSummarySchema>;
export type HostedReviewLinkPublic = z.infer<typeof hostedReviewLinkPublicSchema>;
export type HostedReviewComment = z.infer<typeof hostedReviewCommentSchema>;

export function hostedReviewLinkUrl(origin: string, token: string) {
  return `${origin.replace(/\/+$/, "")}/share/${encodeURIComponent(token)}`;
}

export function hostedReviewExpiry(days: number, from = new Date()) {
  const expiresAt = new Date(from);
  expiresAt.setDate(expiresAt.getDate() + days);
  return expiresAt;
}

export function isHostedReviewExpired(expiresAt: Date, now = new Date()) {
  return expiresAt.getTime() <= now.getTime();
}

export function canHostedReviewComment(permission: HostedReviewLinkPermission) {
  return permission === "comment-only" || permission === "download";
}
