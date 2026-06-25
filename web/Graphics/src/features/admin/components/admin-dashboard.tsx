"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Activity,
  BadgeCheck,
  Bell,
  CircleSlash,
  ClipboardList,
  Download,
  ExternalLink,
  FileText,
  Frame,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  LockKeyhole,
  RotateCcw,
  Rocket,
  Settings2,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/tablecn/data-table";
import { DataTableColumnHeader } from "@/components/tablecn/data-table-column-header";
import { AdminAccessibilityPrivacyReleasePanel } from "@/features/admin/components/admin-accessibility-privacy-release-panel";
import { AdminDesktopUpdateChannelPanel } from "@/features/admin/components/admin-desktop-update-channel-panel";
import { AdminDesignBranchesPanel } from "@/features/admin/components/admin-design-branches-panel";
import { AdminBranchReviewInboxPanel } from "@/features/admin/components/admin-branch-review-inbox-panel";
import { AdminCollaborationHandoffOperationsPanel } from "@/features/admin/components/admin-collaboration-handoff-operations-panel";
import { AdminPublishChannelManagerPanel } from "@/features/admin/components/admin-publish-channel-manager-panel";
import { AdminPublicLinkObservabilityPanel } from "@/features/admin/components/admin-public-link-observability-panel";
import { AdminPublicRouteAnalyticsPanel } from "@/features/admin/components/admin-public-route-analytics-panel";
import { AdminRealtimeHealthMonitorPanel } from "@/features/admin/components/admin-realtime-health-monitor-panel";
import { AdminCollaborationEventIngestionPanel } from "@/features/admin/components/admin-collaboration-event-ingestion-panel";
import { AdminMultiplayerPresencePanel } from "@/features/admin/components/admin-multiplayer-presence-panel";
import { AdminCollaborationRecoveryPacketsPanel } from "@/features/admin/components/admin-collaboration-recovery-packets-panel";
import { AdminCursorChatRoomMessagesPanel } from "@/features/admin/components/admin-cursor-chat-room-messages-panel";
import { AdminLiveReviewSessionsPanel } from "@/features/admin/components/admin-live-review-sessions-panel";
import { AdminReviewRoomAudioReadinessPanel } from "@/features/admin/components/admin-review-room-audio-readiness-panel";
import { AdminCommandCenterSearchPanel } from "@/features/admin/components/admin-command-center-search-panel";
import { AdminAutomationRunbookCenterPanel } from "@/features/admin/components/admin-automation-runbook-center-panel";
import { AdminDataLossPreventionPanel } from "@/features/admin/components/admin-data-loss-prevention-panel";
import { AdminEmbedRouteAnalyticsJoinPanel } from "@/features/admin/components/admin-embed-route-analytics-join-panel";
import { AdminEmbedSecurityPanel } from "@/features/admin/components/admin-embed-security-panel";
import { AdminFileBrowserDepthPanel } from "@/features/admin/components/admin-file-browser-depth-panel";
import { AdminPermissionMigrationReviewPanel } from "@/features/admin/components/admin-permission-migration-review-panel";
import { AdminExternalCommentNotificationWorkflowsPanel } from "@/features/admin/components/admin-external-comment-notification-workflows-panel";
import { AdminCommentReactionWorkflowsPanel } from "@/features/admin/components/admin-comment-reaction-workflows-panel";
import { AdminCollaborationNotificationPreferenceCenterPanel } from "@/features/admin/components/admin-collaboration-notification-preference-center-panel";
import { AdminOperationalIncidentsPanel } from "@/features/admin/components/admin-operational-incidents-panel";
import { AdminLibraryReleaseGatesPanel } from "@/features/admin/components/admin-library-release-gates-panel";
import { AdminLibraryRolloutMonitorPanel } from "@/features/admin/components/admin-library-rollout-monitor-panel";
import { AdminNotificationDigestSubscriptionsPanel } from "@/features/admin/components/admin-notification-digest-subscriptions-panel";
import { AdminOfflineVaultPanel } from "@/features/admin/components/admin-offline-vault-panel";
import { AdminOperatorRehearsalsPanel } from "@/features/admin/components/admin-operator-rehearsals-panel";
import { AdminPostDeploySmokePanel } from "@/features/admin/components/admin-post-deploy-smoke-panel";
import { AdminPluginPermissionGovernancePanel } from "@/features/admin/components/admin-plugin-permission-governance-panel";
import { AdminProductionMonitoringDigestPanel } from "@/features/admin/components/admin-production-monitoring-digest-panel";
import { AdminReleaseArtifactManifestPanel } from "@/features/admin/components/admin-release-artifact-manifest-panel";
import { AdminReleaseArchiveRetentionPanel } from "@/features/admin/components/admin-release-archive-retention-panel";
import { AdminReleaseApprovalSnapshotsPanel } from "@/features/admin/components/admin-release-approval-snapshots-panel";
import { AdminReleaseChannelsPanel } from "@/features/admin/components/admin-release-channels-panel";
import { AdminReleaseIncidentTimelinePanel } from "@/features/admin/components/admin-release-incident-timeline-panel";
import { AdminReleaseRiskTimelinePanel } from "@/features/admin/components/admin-release-risk-timeline-panel";
import { AdminReleasePublicationGatesPanel } from "@/features/admin/components/admin-release-publication-gates-panel";
import { AdminRetentionPrivacyPanel } from "@/features/admin/components/admin-retention-privacy-panel";
import { AdminRoleChangeApprovalPanel } from "@/features/admin/components/admin-role-change-approval-panel";
import { AdminRollbackReadinessPanel } from "@/features/admin/components/admin-rollback-readiness-panel";
import { AdminSelfHostedBackupReadinessPanel } from "@/features/admin/components/admin-self-hosted-backup-readiness-panel";
import { AdminSelfHostedSyncDiagnosticsPanel } from "@/features/admin/components/admin-self-hosted-sync-diagnostics-panel";
import { AdminSupportBundlePanel } from "@/features/admin/components/admin-support-bundle-panel";
import { AdminWorkspacePolicyPanel } from "@/features/admin/components/admin-workspace-policy-panel";
import { AdminWorkspaceOperationsPanel } from "@/features/admin/components/admin-workspace-operations-panel";
import { AdminWorkspaceAccessBudgetPanel } from "@/features/admin/components/admin-workspace-access-budget-panel";
import { AdminWorkspaceCapacityForecastPanel } from "@/features/admin/components/admin-workspace-capacity-forecast-panel";
import { AdminOrganizationAuditIntelligencePanel } from "@/features/admin/components/admin-organization-audit-intelligence-panel";
import { AdminOperatorOnboardingRecoveryPanel } from "@/features/admin/components/admin-operator-onboarding-recovery-panel";
import { AdminScopedPublicationApprovalsPanel } from "@/features/admin/components/admin-scoped-publication-approvals-panel";
import { AdminSlidesSitesPublishApprovalWorkflowPanel } from "@/features/admin/components/admin-slides-sites-publish-approval-workflow-panel";
import { AdminReviewFilters } from "@/features/admin/components/admin-review-filters";
import { DeployEnvironmentPreflightPanel } from "@/features/admin/components/deploy-environment-preflight-panel";
import { getNotificationColumns } from "@/features/admin/components/admin-notification-columns";
import {
  filterFiles,
  filterShares,
  filterUsers,
  getFileFilterOptions,
  getShareFilterOptions,
  getUserFilterOptions,
  type FileReviewFilter,
  type ShareReviewFilter,
  type UserReviewFilter,
} from "@/features/admin/admin-review-model";
import type {
  AdminAuditRow,
  AdminDashboardData,
  AdminFileRow,
  AdminShareRow,
  AdminUserRow,
} from "@/features/admin/admin-data";
import {
  disableAdminShare,
  restoreAdminShare,
  revokeAdminUserSessions,
  verifyAdminUser,
} from "@/features/admin/actions";

type AdminDashboardProps = {
  data: AdminDashboardData;
};

type ActionRunner = (
  action: () => Promise<{ ok: boolean }>,
  successMessage: string,
) => void;

function getUserColumns(runAction: ActionRunner): ColumnDef<AdminUserRow>[] {
  return [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Name" />
    ),
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.name}</div>
        <div className="text-xs text-muted-foreground">{row.original.email}</div>
      </div>
    ),
  },
  {
    accessorKey: "emailVerified",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Verification" />
    ),
    cell: ({ row }) =>
      row.original.emailVerified ? (
        <Badge variant="secondary">
          <BadgeCheck className="size-3" />
          Verified
        </Badge>
      ) : (
        <Badge variant="destructive">
          <CircleSlash className="size-3" />
          Pending
        </Badge>
      ),
  },
  {
    accessorKey: "files",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Files" />
    ),
  },
  {
    accessorKey: "sessions",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Sessions" />
    ),
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Joined" />
    ),
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <div className="flex flex-wrap items-center gap-1">
        {!row.original.emailVerified ? (
          <Button
            type="button"
            size="xs"
            variant="secondary"
            onClick={() =>
              runAction(
                () => verifyAdminUser({ userId: row.original.id }),
                `${row.original.email} is verified.`,
              )
            }
          >
            Verify
          </Button>
        ) : null}
        <Button
          type="button"
          size="xs"
          variant="outline"
          disabled={row.original.isCurrentUser || row.original.sessions === 0}
          onClick={() =>
            runAction(
              () => revokeAdminUserSessions({ userId: row.original.id }),
              `${row.original.email} sessions revoked.`,
            )
          }
        >
          Revoke sessions
        </Button>
      </div>
    ),
  },
];
}

function getShareColumns(runAction: ActionRunner): ColumnDef<AdminShareRow>[] {
  return [
  {
    accessorKey: "fileName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Website view" />
    ),
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.fileName}</div>
        <div className="text-xs text-muted-foreground">
          {row.original.ownerEmail}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "sharePath",
    header: "Public URL",
    cell: ({ row }) => (
      <Button asChild variant="ghost" size="sm" className="px-1.5">
        <Link href={row.original.sharePath} target="_blank">
          <ExternalLink className="size-3.5" />
          Open
        </Link>
      </Button>
    ),
  },
  {
    accessorKey: "permissionPreset",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Preset" />
    ),
    cell: ({ row }) => (
      <div className="space-y-1">
        <Badge variant="secondary">
          {formatSharePreset(row.original.permissionPreset)}
        </Badge>
        <div className="text-xs text-muted-foreground">
          {row.original.allowDownload ? "Downloads" : "No downloads"}
          {" / "}
          {row.original.allowComments ? "Comments" : "No comments"}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "disabledAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Status" />
    ),
    cell: ({ row }) =>
      row.original.disabledAt ? (
        <Badge variant="outline">Disabled</Badge>
      ) : row.original.expiresAt &&
        new Date(row.original.expiresAt).getTime() < Date.now() ? (
        <Badge variant="destructive">Expired</Badge>
      ) : (
        <Badge variant="secondary">Live</Badge>
      ),
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Created" />
    ),
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <Button
        type="button"
        size="xs"
        variant={row.original.disabledAt ? "secondary" : "outline"}
        onClick={() =>
          row.original.disabledAt
            ? runAction(
                () => restoreAdminShare({ shareId: row.original.id }),
                `${row.original.fileName} share restored.`,
              )
            : runAction(
                () => disableAdminShare({ shareId: row.original.id }),
                `${row.original.fileName} share disabled.`,
              )
        }
      >
        {row.original.disabledAt ? (
          <>
            <RotateCcw className="size-3" />
            Restore
          </>
        ) : (
          "Disable"
        )}
      </Button>
    ),
  },
];
}

const fileColumns: ColumnDef<AdminFileRow>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="File" />
    ),
    cell: ({ row }) => (
      <div>
        <div className="flex items-center gap-2 font-medium">
          {row.original.favorite ? <Star className="size-3.5" /> : null}
          {row.original.name}
        </div>
        <div className="text-xs text-muted-foreground">
          {row.original.ownerEmail}
        </div>
        <div className="text-xs text-muted-foreground">
          {row.original.teamName} / {row.original.projectName} /{" "}
          {row.original.scope}
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {row.original.openCommentCount > 0 ? (
            <Badge variant="outline">
              {row.original.openCommentCount} open
            </Badge>
          ) : null}
          {row.original.brokenPrototypeCount > 0 ? (
            <Badge variant="destructive">
              {row.original.brokenPrototypeCount} broken
            </Badge>
          ) : null}
          {row.original.readyForDevCount > 0 ? (
            <Badge variant="secondary">
              {row.original.readyForDevCount} dev
            </Badge>
          ) : null}
          {row.original.prototypeHotspotCount > 0 ? (
            <Badge variant="outline">
              {row.original.prototypeHotspotCount} flows
            </Badge>
          ) : null}
        </div>
      </div>
    ),
  },
  {
    id: "access",
    header: "Access",
    cell: ({ row }) => (
      <div className="flex max-w-72 flex-wrap gap-1">
        <Badge variant="secondary">1 owner</Badge>
        {row.original.editorCount > 0 ? (
          <Badge variant="outline">{row.original.editorCount} editors</Badge>
        ) : null}
        {row.original.commenterCount > 0 ? (
          <Badge variant="outline">
            {row.original.commenterCount} commenters
          </Badge>
        ) : null}
        {row.original.viewerCount > 0 ? (
          <Badge variant="outline">{row.original.viewerCount} viewers</Badge>
        ) : null}
        {row.original.publicShareCount > 0 ? (
          <Badge variant="secondary">
            {row.original.publicShareCount} public
          </Badge>
        ) : null}
        {row.original.downloadShareCount > 0 ? (
          <Badge variant="outline">
            {row.original.downloadShareCount} downloads
          </Badge>
        ) : null}
        {row.original.reviewShareCount > 0 ? (
          <Badge variant="outline">{row.original.reviewShareCount} review</Badge>
        ) : null}
        {row.original.staleShareCount > 0 ? (
          <Badge variant="destructive">
            {row.original.staleShareCount} stale
          </Badge>
        ) : null}
      </div>
    ),
  },
  {
    accessorKey: "trashedAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="State" />
    ),
    cell: ({ row }) =>
      row.original.trashedAt ? (
        <Badge variant="outline">Trashed</Badge>
      ) : (
        <Badge variant="secondary">Active</Badge>
      ),
  },
  {
    accessorKey: "updatedAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Updated" />
    ),
    cell: ({ row }) => formatDate(row.original.updatedAt),
  },
];

const auditColumns: ColumnDef<AdminAuditRow>[] = [
  {
    accessorKey: "action",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Action" />
    ),
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{formatAction(row.original.action)}</div>
        <div className="text-xs text-muted-foreground">
          {row.original.targetType}: {row.original.targetLabel}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "actorEmail",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Actor" />
    ),
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Time" />
    ),
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
];

export function AdminDashboard({ data }: AdminDashboardProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [userQuery, setUserQuery] = useState("");
  const [shareQuery, setShareQuery] = useState("");
  const [fileQuery, setFileQuery] = useState("");
  const [userReviewFilter, setUserReviewFilter] =
    useState<UserReviewFilter>("all");
  const [shareReviewFilter, setShareReviewFilter] =
    useState<ShareReviewFilter>("all");
  const [fileReviewFilter, setFileReviewFilter] =
    useState<FileReviewFilter>("all");
  const [isActionPending, startActionTransition] = useTransition();
  const runAction = useCallback<ActionRunner>(
    (action, successMessage) => {
      setMessage(null);
      setActionError(null);
      startActionTransition(async () => {
        try {
          await action();
          setMessage(successMessage);
          router.refresh();
        } catch (error) {
          setActionError(
            error instanceof Error ? error.message : "Admin action failed.",
          );
        }
      });
    },
    [router],
  );
  const userColumns = useMemo(() => getUserColumns(runAction), [runAction]);
  const shareColumns = useMemo(() => getShareColumns(runAction), [runAction]);
  const filteredUsers = useMemo(
    () => filterUsers(data.users, userReviewFilter, userQuery),
    [data.users, userReviewFilter, userQuery],
  );
  const filteredShares = useMemo(
    () => filterShares(data.shares, shareReviewFilter, shareQuery),
    [data.shares, shareReviewFilter, shareQuery],
  );
  const filteredFiles = useMemo(
    () => filterFiles(data.files, fileReviewFilter, fileQuery),
    [data.files, fileReviewFilter, fileQuery],
  );
  const userFilterOptions = useMemo(
    () => getUserFilterOptions(data.users),
    [data.users],
  );
  const shareFilterOptions = useMemo(
    () => getShareFilterOptions(data.shares),
    [data.shares],
  );
  const fileFilterOptions = useMemo(
    () => getFileFilterOptions(data.files),
    [data.files],
  );
  const userTable = useReactTable({
    data: filteredUsers,
    columns: userColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
    },
  });
  const shareTable = useReactTable({
    data: filteredShares,
    columns: shareColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
    },
  });
  const fileTable = useReactTable({
    data: filteredFiles,
    columns: fileColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
    },
  });
  const auditTable = useReactTable({
    data: data.auditEvents,
    columns: auditColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
    },
  });
  const notificationColumns = useMemo(
    () => getNotificationColumns(formatDate),
    [],
  );
  const notificationTable = useReactTable({
    data: data.notificationDeliveries,
    columns: notificationColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
    },
  });

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-b border-border bg-card/70 p-4 lg:border-r lg:border-b-0">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
              <Frame className="size-4" />
            </div>
            <div>
              <div className="font-semibold">Essence Admin</div>
              <div className="text-xs text-muted-foreground">
                {data.currentUser.email}
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <nav className="grid gap-1 text-sm">
            <a className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 font-medium">
              <LayoutDashboard className="size-4" />
              Overview
            </a>
            <a className="flex items-center gap-2 rounded-md px-3 py-2 text-muted-foreground">
              <Users className="size-4" />
              Users
            </a>
            <a className="flex items-center gap-2 rounded-md px-3 py-2 text-muted-foreground">
              <FileText className="size-4" />
              Website views
            </a>
            <a className="flex items-center gap-2 rounded-md px-3 py-2 text-muted-foreground">
              <KeyRound className="size-4" />
              Auth
            </a>
            <a className="flex items-center gap-2 rounded-md px-3 py-2 text-muted-foreground">
              <Activity className="size-4" />
              Operations
            </a>
            <a className="flex items-center gap-2 rounded-md px-3 py-2 text-muted-foreground">
              <Bell className="size-4" />
              Notifications
            </a>
            <a className="flex items-center gap-2 rounded-md px-3 py-2 text-muted-foreground">
              <Rocket className="size-4" />
              Release
            </a>
            <a className="flex items-center gap-2 rounded-md px-3 py-2 text-muted-foreground">
              <Settings2 className="size-4" />
              Governance
            </a>
            <a className="flex items-center gap-2 rounded-md px-3 py-2 text-muted-foreground">
              <LifeBuoy className="size-4" />
              Support
            </a>
            <a className="flex items-center gap-2 rounded-md px-3 py-2 text-muted-foreground">
              <ClipboardList className="size-4" />
              Audit
            </a>
          </nav>

          <div className="mt-4">
            <Button asChild variant="outline" className="w-full">
              <Link href="/">Back to editor</Link>
            </Button>
          </div>
        </aside>

        <section className="min-w-0 p-4 md:p-6">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Workspace dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Users, website views, files, and authentication health.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                <ShieldCheck className="size-3" />
                Email verification on
              </Badge>
              <Badge variant={data.authStatus.brevoConfigured ? "secondary" : "destructive"}>
                <LockKeyhole className="size-3" />
                {data.authStatus.brevoConfigured ? "Brevo ready" : "Brevo missing"}
              </Badge>
              {isActionPending ? (
                <Badge variant="outline">Updating...</Badge>
              ) : null}
            </div>
          </div>

          {message ? (
            <Alert className="mb-4">
              <ShieldCheck className="size-4" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          ) : null}

          {actionError ? (
            <Alert className="mb-4" variant="destructive">
              <AlertDescription>{actionError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {data.metrics.map((metric) => (
              <Card key={metric.label}>
                <CardHeader className="pb-2">
                  <CardDescription>{metric.label}</CardDescription>
                  <CardTitle className="text-3xl">{metric.value}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{metric.detail}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <WorkspaceHealthCard
              label="Open review files"
              value={data.workspaceHealth.filesWithOpenComments}
              detail="files with unresolved comments"
            />
            <WorkspaceHealthCard
              label="Broken prototypes"
              value={data.workspaceHealth.filesWithBrokenPrototypes}
              detail="files with missing prototype targets"
            />
            <WorkspaceHealthCard
              label="Handoff-ready files"
              value={data.workspaceHealth.handoffReadyFiles}
              detail="files with Dev Mode or prototype metadata"
            />
            <WorkspaceHealthCard
              label="Stale shares"
              value={data.workspaceHealth.staleShareCount}
              detail="expired public links still in the recent share window"
            />
          </div>

          <Tabs defaultValue="users" className="mt-6">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="website">Website</TabsTrigger>
              <TabsTrigger value="files">Files</TabsTrigger>
              <TabsTrigger value="auth">Auth</TabsTrigger>
              <TabsTrigger value="operations">Operations</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="release">Release</TabsTrigger>
              <TabsTrigger value="command">Command</TabsTrigger>
              <TabsTrigger value="governance">Governance</TabsTrigger>
              <TabsTrigger value="support">Support</TabsTrigger>
              <TabsTrigger value="audit">Audit</TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Users</CardTitle>
                  <CardDescription>
                    Account verification, file ownership, and active sessions.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DataTable table={userTable}>
                    <AdminReviewFilters
                      query={userQuery}
                      onQueryChange={setUserQuery}
                      placeholder="Search name or email..."
                      value={userReviewFilter}
                      onValueChange={setUserReviewFilter}
                      options={userFilterOptions}
                    />
                  </DataTable>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="website" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Website views</CardTitle>
                  <CardDescription>
                    Published share links that can be opened outside the editor.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DataTable table={shareTable}>
                    <AdminReviewFilters
                      query={shareQuery}
                      onQueryChange={setShareQuery}
                      placeholder="Search file, owner, or preset..."
                      value={shareReviewFilter}
                      onValueChange={setShareReviewFilter}
                      options={shareFilterOptions}
                    />
                  </DataTable>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="files" className="mt-4">
              <div className="grid gap-4">
                <AdminFileBrowserDepthPanel report={data.fileBrowserDepth} />
                <AdminPermissionMigrationReviewPanel
                  report={data.permissionMigrationReview}
                />
                <Card>
                  <CardHeader>
                    <CardTitle>Files</CardTitle>
                    <CardDescription>
                      Recent design files across the workspace.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DataTable table={fileTable}>
                      <AdminReviewFilters
                        query={fileQuery}
                        onQueryChange={setFileQuery}
                        placeholder="Search file, owner, team, or project..."
                        value={fileReviewFilter}
                        onValueChange={setFileReviewFilter}
                        options={fileFilterOptions}
                      />
                    </DataTable>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="auth" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Authentication</CardTitle>
                  <CardDescription>
                    Email/password access with OTP verification delivery.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm md:grid-cols-2">
                  <StatusRow
                    label="Verification"
                    value={
                      data.authStatus.emailVerificationRequired
                        ? "Required"
                        : "Optional"
                    }
                  />
                  <StatusRow
                    label="Email sender"
                    value={data.authStatus.senderEmail}
                  />
                  <StatusRow
                    label="Brevo"
                    value={data.authStatus.brevoConfigured ? "Configured" : "Missing"}
                  />
                  <StatusRow
                    label="Admins"
                    value={data.authStatus.adminEmails.join(", ")}
                  />
                </CardContent>
              </Card>
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Configuration health</CardTitle>
                  <CardDescription>
                    Runtime checks for account access and delivery settings.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-3">
                  {data.configChecks.map((check) => (
                    <StatusCheck key={check.label} check={check} />
                  ))}
                </CardContent>
              </Card>
              <div className="mt-4">
                <DeployEnvironmentPreflightPanel
                  report={data.deployEnvironmentPreflight}
                />
              </div>
              <div className="mt-4">
                <AdminOperationalIncidentsPanel
                  report={data.operationalIncidentReview}
                />
              </div>
            </TabsContent>

            <TabsContent value="operations" className="mt-4">
              <AdminWorkspaceOperationsPanel
                report={data.workspaceOperations}
              />
            </TabsContent>

            <TabsContent value="audit" className="mt-4">
              <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <AuditSummaryCard
                  label="Audit events"
                  value={data.auditSummary.total}
                  detail={
                    data.auditSummary.latestAction && data.auditSummary.latestAt
                      ? `Latest ${formatAction(
                          data.auditSummary.latestAction,
                        ).toLowerCase()} at ${formatDate(
                          data.auditSummary.latestAt,
                        )}`
                      : "latest loaded records"
                  }
                />
                <AuditSummaryCard
                  label="Actors"
                  value={data.auditSummary.actorCount}
                  detail="administrators with recorded changes"
                />
                <AuditSummaryCard
                  label="Users and sessions"
                  value={
                    data.auditSummary.userActions +
                    data.auditSummary.sessionActions
                  }
                  detail={`${data.auditSummary.userActions} user, ${data.auditSummary.sessionActions} session`}
                />
                <AuditSummaryCard
                  label="Share changes"
                  value={data.auditSummary.shareActions}
                  detail="public link changes recorded"
                />
              </div>
              <Card>
                <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle>Audit log</CardTitle>
                    <CardDescription>
                      Recent administrator changes across users, sessions, and shares.
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => exportAuditCsv(data.auditEvents)}
                  >
                    <Download className="size-4" />
                    Export CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  <DataTable table={auditTable} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="mt-4">
              <div className="grid gap-4">
                <AdminNotificationDigestSubscriptionsPanel
                  report={data.notificationDigestSubscriptions}
                />
                <AdminCollaborationNotificationPreferenceCenterPanel
                  report={data.collaborationNotificationPreferenceCenter}
                />
                <AdminExternalCommentNotificationWorkflowsPanel
                  report={data.externalCommentNotificationWorkflows}
                />
                <AdminCommentReactionWorkflowsPanel
                  report={data.commentReactionWorkflows}
                />
                <Card>
                  <CardHeader>
                    <CardTitle>Comment notifications</CardTitle>
                    <CardDescription>
                      Recent comment email delivery attempts across design files.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DataTable table={notificationTable} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="release" className="mt-4">
              <AdminReleaseArtifactManifestPanel
                report={data.releaseArtifactManifest}
              />
              <div className="mt-4">
                <AdminReleasePublicationGatesPanel
                  report={data.releasePublicationGates}
                />
              </div>
              <div className="mt-4">
                <AdminReleaseChannelsPanel report={data.releaseChannels} />
              </div>
              <div className="mt-4">
                <AdminReleaseIncidentTimelinePanel
                  report={data.releaseIncidentTimeline}
                />
              </div>
              <div className="mt-4">
                <AdminOperatorRehearsalsPanel
                  report={data.operatorRehearsals}
                />
              </div>
              <div className="mt-4">
                <AdminDesktopUpdateChannelPanel
                  report={data.desktopUpdateChannels}
                />
              </div>
              <div className="mt-4">
                <AdminReleaseArchiveRetentionPanel
                  report={data.releaseArchiveRetention}
                />
              </div>
              <div className="mt-4">
                <AdminAccessibilityPrivacyReleasePanel
                  report={data.accessibilityPrivacyRelease}
                />
              </div>
              <div className="mt-4">
                <AdminPostDeploySmokePanel
                  report={data.productionDeploySmoke}
                />
              </div>
              <div className="mt-4">
                <AdminRollbackReadinessPanel report={data.rollbackReadiness} />
              </div>
              <div className="mt-4">
                <AdminSelfHostedBackupReadinessPanel
                  report={data.selfHostedBackupReadiness}
                />
              </div>
              <div className="mt-4">
                <AdminReleaseApprovalSnapshotsPanel
                  defaults={data.releaseApprovalDefaults}
                  deployEnvironmentPreflight={data.deployEnvironmentPreflight}
                  operationalIncidentReview={data.operationalIncidentReview}
                  snapshots={data.releaseApprovalSnapshots}
                />
              </div>
            </TabsContent>

            <TabsContent value="command" className="mt-4">
              <div className="grid gap-4">
                <AdminCommandCenterSearchPanel
                  report={data.commandCenterSearch}
                />
                <AdminReleaseRiskTimelinePanel
                  report={data.releaseRiskTimeline}
                />
                <AdminWorkspaceCapacityForecastPanel
                  report={data.workspaceCapacityForecast}
                />
                <AdminOrganizationAuditIntelligencePanel
                  report={data.organizationAuditIntelligence}
                />
                <AdminOperatorOnboardingRecoveryPanel
                  report={data.operatorOnboardingRecovery}
                />
              </div>
            </TabsContent>

            <TabsContent value="governance" className="mt-4">
              <div className="grid gap-4">
                <AdminProductionMonitoringDigestPanel
                  digest={data.productionMonitoringDigest}
                />
                <AdminRealtimeHealthMonitorPanel
                  report={data.realtimeHealth}
                />
                <AdminSelfHostedSyncDiagnosticsPanel
                  report={data.selfHostedSyncDiagnostics}
                />
                <AdminDataLossPreventionPanel
                  report={data.dataLossPrevention}
                />
                <AdminAutomationRunbookCenterPanel
                  report={data.automationRunbookCenter}
                />
                <AdminScopedPublicationApprovalsPanel
                  report={data.scopedPublicationApprovals}
                />
                <AdminSlidesSitesPublishApprovalWorkflowPanel
                  report={data.slidesSitesPublishApprovalWorkflow}
                />
                <AdminCollaborationEventIngestionPanel
                  report={data.collaborationEventIngestion}
                />
                <AdminMultiplayerPresencePanel
                  report={data.multiplayerPresence}
                />
                <AdminCollaborationRecoveryPacketsPanel
                  report={data.collaborationRecoveryPackets}
                />
                <AdminCursorChatRoomMessagesPanel
                  report={data.cursorChatRoomMessages}
                />
                <AdminBranchReviewInboxPanel
                  report={data.branchReviewInbox}
                />
                <AdminLiveReviewSessionsPanel
                  report={data.liveReviewSessions}
                />
                <AdminReviewRoomAudioReadinessPanel
                  report={data.reviewRoomAudioReadiness}
                />
                <AdminCollaborationHandoffOperationsPanel
                  report={data.collaborationHandoffOperations}
                />
                <AdminPublishChannelManagerPanel
                  report={data.publishChannels}
                />
                <AdminPublicLinkObservabilityPanel
                  report={data.publicLinkObservability}
                />
                <AdminPublicRouteAnalyticsPanel
                  report={data.publicRouteAnalytics}
                />
                <AdminEmbedRouteAnalyticsJoinPanel
                  report={data.embedRouteAnalyticsJoin}
                />
                <AdminEmbedSecurityPanel report={data.embedSecurity} />
                <AdminWorkspaceAccessBudgetPanel
                  report={data.workspaceAccessBudget}
                />
                <AdminDesignBranchesPanel report={data.designBranches} />
                <AdminPluginPermissionGovernancePanel
                  report={data.pluginPermissionGovernance}
                />
                <AdminSelfHostedBackupReadinessPanel
                  report={data.selfHostedBackupReadiness}
                />
                <AdminRetentionPrivacyPanel report={data.retentionPrivacy} />
                <AdminLibraryReleaseGatesPanel
                  report={data.libraryReleaseGates}
                />
                <AdminLibraryRolloutMonitorPanel
                  report={data.libraryRolloutMonitor}
                />
                <AdminWorkspacePolicyPanel report={data.workspacePolicy} />
                <AdminRoleChangeApprovalPanel
                  queue={data.roleChangeApprovals}
                />
              </div>
            </TabsContent>

            <TabsContent value="support" className="mt-4">
              <div className="grid gap-4">
                <AdminOfflineVaultPanel data={data} />
                <AdminSupportBundlePanel data={data} />
              </div>
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </main>
  );
}

function AuditSummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function WorkspaceHealthCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 break-words font-medium">{value}</div>
    </div>
  );
}

function StatusCheck({
  check,
}: {
  check: AdminDashboardData["configChecks"][number];
}) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">{check.label}</div>
        <Badge variant={check.status === "ready" ? "secondary" : "destructive"}>
          {check.status === "ready" ? "Ready" : "Check"}
        </Badge>
      </div>
      <div className="mt-2 break-words text-sm font-medium">{check.detail}</div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatAction(action: string) {
  const labels: Record<string, string> = {
    "user.verify": "Verified user",
    "session.revoke": "Revoked sessions",
    "share.disable": "Disabled share",
    "share.restore": "Restored share",
    "release.approval.snapshot": "Saved release approval",
    "workspace.policy.update": "Updated workspace policy",
  };

  return labels[action] ?? action;
}

function formatSharePreset(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function exportAuditCsv(events: AdminAuditRow[]) {
  const rows = [
    ["Time", "Actor", "Action", "Target type", "Target"],
    ...events.map((event) => [
      event.createdAt,
      event.actorEmail,
      formatAction(event.action),
      event.targetType,
      event.targetLabel,
    ]),
  ];
  const csv = rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "essence-admin-audit.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}
