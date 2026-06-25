import type {
  AdminDesignBranchReport,
  AdminDesignBranchRecord,
} from "@/features/admin/admin-design-branches";
import type {
  AdminLibraryReleaseGateFile,
  AdminLibraryReleaseGateReport,
  AdminLibraryReleaseGateRow,
} from "@/features/admin/admin-library-release-gates";
import type {
  AdminLibraryRolloutFile,
  AdminLibraryRolloutMonitorReport,
} from "@/features/admin/admin-library-rollout-monitor";

export type AdminPermissionMigrationStatus = "ready" | "review" | "blocked";

export type AdminPermissionMigrationCategory =
  | "branch"
  | "component"
  | "file"
  | "library"
  | "share";

export type AdminPermissionMigrationFile = {
  id: string;
  name: string;
  ownerEmail: string;
  scope: string;
  teamName: string;
  projectName: string;
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

export type AdminPermissionMigrationCollaborator = {
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

export type AdminPermissionMigrationShare = {
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

export type AdminPermissionMigrationReviewInput = {
  generatedAt?: string;
  files: AdminPermissionMigrationFile[];
  collaborators: AdminPermissionMigrationCollaborator[];
  shares: AdminPermissionMigrationShare[];
  designBranches: Pick<
    AdminDesignBranchReport,
    | "activeBranchCount"
    | "branchCount"
    | "commands"
    | "generatedAt"
    | "missingRestorePointCount"
    | "records"
    | "reviewIntentCount"
    | "rows"
    | "score"
    | "staleBranchCount"
    | "status"
  >;
  libraryReleaseGates: Pick<
    AdminLibraryReleaseGateReport,
    | "blockedLibraryFileCount"
    | "componentCount"
    | "componentFileCount"
    | "files"
    | "generatedAt"
    | "reviewLibraryFileCount"
    | "rows"
    | "score"
    | "status"
    | "tokenCoveragePercent"
  >;
  libraryRolloutMonitor: Pick<
    AdminLibraryRolloutMonitorReport,
    | "detachedComponentCount"
    | "files"
    | "generatedAt"
    | "orphanSubscriptionCount"
    | "releaseAdoptionPercent"
    | "rows"
    | "score"
    | "status"
    | "subscribedComponentCount"
    | "subscriptionDriftCount"
    | "updateAvailableComponentCount"
  >;
};

export type AdminPermissionMigration = {
  id: string;
  category: AdminPermissionMigrationCategory;
  status: AdminPermissionMigrationStatus;
  surface: string;
  fileId: string | null;
  fileName: string;
  ownerEmail: string | null;
  currentAccess: string;
  targetAccess: string;
  risk: string;
  leastPrivilegeRecommendation: string;
  evidenceCount: number;
  latestAt: string | null;
};

export type AdminPermissionMigrationReviewRow = {
  id: string;
  category: AdminPermissionMigrationCategory;
  status: AdminPermissionMigrationStatus;
  label: string;
  value: string;
  detail: string;
  recommendation: string;
  count: number;
  target: string | null;
  latestAt: string | null;
};

export type AdminPermissionMigrationReviewReport = {
  generatedAt: string;
  status: AdminPermissionMigrationStatus;
  score: number;
  migrationCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  fileMigrationCount: number;
  shareMigrationCount: number;
  branchMigrationCount: number;
  libraryMigrationCount: number;
  componentMigrationCount: number;
  leastPrivilegeRecommendationCount: number;
  migrations: AdminPermissionMigration[];
  rows: AdminPermissionMigrationReviewRow[];
  commands: string[];
};

export type AdminPermissionMigrationBranchSource = AdminDesignBranchRecord;
export type AdminPermissionMigrationLibraryFileSource = AdminLibraryRolloutFile;
export type AdminPermissionMigrationComponentFileSource =
  AdminLibraryReleaseGateFile;
export type AdminPermissionMigrationReleaseGateRowSource =
  AdminLibraryReleaseGateRow;
