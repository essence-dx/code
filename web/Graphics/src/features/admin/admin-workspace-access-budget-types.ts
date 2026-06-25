import type { WorkspacePolicyReviewReport } from "@/features/admin/workspace-policy";

export type AdminWorkspaceAccessBudgetStatus = "ready" | "review" | "blocked";

export type AdminWorkspaceAccessBudgetCategory =
  | "collaborators"
  | "domains"
  | "role-requests"
  | "seat-hygiene"
  | "share-drift"
  | "users";

export type AdminWorkspaceAccessBudgetUser = {
  email: string;
  emailVerified: boolean;
  files: number;
  sessions: number;
};

export type AdminWorkspaceAccessBudgetFile = {
  id: string;
  name: string;
  ownerEmail: string;
  collaboratorCount: number;
  editorCount: number;
  commenterCount: number;
  viewerCount: number;
  publicShareCount: number;
  staleShareCount: number;
  downloadShareCount: number;
  reviewShareCount: number;
  updatedAt: string;
  trashedAt: string | null;
};

export type AdminWorkspaceAccessBudgetShare = {
  id: string;
  fileId: string;
  fileName: string;
  ownerEmail: string;
  accessLevel: string;
  permissionPreset: string;
  allowComments: boolean;
  allowDownload: boolean;
  createdAt: string;
  expiresAt: string | null;
  disabledAt: string | null;
};

export type AdminWorkspaceAccessBudgetSession = {
  userEmail: string;
  expiresAt: string;
  updatedAt: string;
};

export type AdminWorkspaceAccessBudgetCollaborator = {
  fileId: string;
  fileName: string;
  ownerEmail: string;
  userId: string;
  collaboratorEmail: string;
  collaboratorName: string;
  role: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminWorkspaceAccessBudgetThresholds = {
  elevatedSeatLimit: number;
  externalDomainLimit: number;
  staleCollaboratorDays: number;
};

export type AdminWorkspaceAccessBudgetInput = {
  adminEmails: string[];
  collaborators: AdminWorkspaceAccessBudgetCollaborator[];
  files: AdminWorkspaceAccessBudgetFile[];
  generatedAt?: string;
  now?: number;
  roleChangePendingCount: number;
  sessions: AdminWorkspaceAccessBudgetSession[];
  shares: AdminWorkspaceAccessBudgetShare[];
  users: AdminWorkspaceAccessBudgetUser[];
  workspacePolicy: WorkspacePolicyReviewReport;
  budgets?: Partial<AdminWorkspaceAccessBudgetThresholds>;
};

export type AdminWorkspaceAccessDomain = {
  domain: string;
  status: AdminWorkspaceAccessBudgetStatus;
  userCount: number;
  collaboratorCount: number;
  ownerFileCount: number;
  elevatedCollaboratorCount: number;
  latestAt: string | null;
};

export type AdminWorkspaceAccessRoleBudget = {
  label: string;
  status: AdminWorkspaceAccessBudgetStatus;
  used: number;
  limit: number;
  remaining: number;
  detail: string;
};

export type AdminWorkspaceAccessBudgetRow = {
  id: string;
  category: AdminWorkspaceAccessBudgetCategory;
  status: AdminWorkspaceAccessBudgetStatus;
  label: string;
  detail: string;
  recommendation: string;
  owner: string;
  count: number;
  latestAt: string | null;
};

export type AdminWorkspaceAccessBudgetReport = {
  generatedAt: string;
  status: AdminWorkspaceAccessBudgetStatus;
  score: number;
  trustedDomains: string[];
  userCount: number;
  verifiedUserCount: number;
  unverifiedUserCount: number;
  collaboratorCount: number;
  elevatedCollaboratorCount: number;
  staleCollaboratorCount: number;
  staleSessionCount: number;
  externalDomainCount: number;
  riskyShareCount: number;
  noExpiryShareCount: number;
  downloadShareCount: number;
  expiredActiveShareCount: number;
  pendingRoleChangeCount: number;
  thresholds: AdminWorkspaceAccessBudgetThresholds;
  roleBudgets: AdminWorkspaceAccessRoleBudget[];
  domains: AdminWorkspaceAccessDomain[];
  rows: AdminWorkspaceAccessBudgetRow[];
  commands: string[];
};
