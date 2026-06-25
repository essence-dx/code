export const approvalStatuses = [
  "draft",
  "in-review",
  "changes-requested",
  "approved",
] as const;

export type ApprovalStatus = (typeof approvalStatuses)[number];

export const approvalStatusLabels: Record<ApprovalStatus, string> = {
  draft: "Draft",
  "in-review": "In review",
  "changes-requested": "Changes requested",
  approved: "Approved",
};

export function normalizeApprovalStatus(value: unknown): ApprovalStatus {
  if (
    value === "in-review" ||
    value === "changes-requested" ||
    value === "approved"
  ) {
    return value;
  }

  return "draft";
}

export function getApprovalStatusBadgeVariant(status: ApprovalStatus) {
  if (status === "approved") return "secondary" as const;
  if (status === "changes-requested") return "destructive" as const;

  return "outline" as const;
}
