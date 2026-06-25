"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  CalendarClock,
  FolderKanban,
  Globe2,
  LayoutDashboard,
  LibraryBig,
  Mail,
  MailCheck,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { AdminOperationsCenterPanel } from "@/features/admin/admin-operations-center-panel";
import { createAdminOperationsCenter } from "@/features/admin/admin-operations-center";
import { AdminDashboardPanel } from "@/features/dashboard/admin-dashboard-panel";
import { AccountSettingsPanel } from "@/features/account/account-settings-panel";
import { AdvancedAdminAutomationRecipesPanel } from "@/features/automation/advanced-admin-automation-recipes-panel";
import { createAdvancedAdminAutomationCenter } from "@/features/automation/advanced-admin-automation-recipes";
import { AutomationRecipesPanel } from "@/features/automation/automation-recipes-panel";
import { AutomationRunHistoryPanel } from "@/features/automation/automation-run-history-panel";
import { createAutomationRunHistoryCenter } from "@/features/automation/automation-run-history";
import { createNoCodeAutomationBuilderCenter } from "@/features/automation/no-code-automation-builder";
import { NoCodeAutomationBuilderPanel } from "@/features/automation/no-code-automation-builder-panel";
import { WorkflowTemplateMarketplacePanel } from "@/features/automation/workflow-template-marketplace-panel";
import { createWorkflowTemplateMarketplace } from "@/features/automation/workflow-template-marketplace";
import { AssetQuotaDashboard } from "@/features/assets/asset-quota-dashboard";
import { createAdvancedBatchAssetOperationCenter } from "@/features/assets/advanced-batch-asset-operations";
import { AdvancedBatchAssetOperationsPanel } from "@/features/assets/advanced-batch-asset-operations-panel";
import { AssetLibraryOperationsPanel } from "@/features/assets/asset-library-operations-panel";
import { createAssetLibraryOperationCenter } from "@/features/assets/asset-library-operations";
import { AssetLifecycleGovernancePanel } from "@/features/assets/asset-lifecycle-governance-panel";
import { createAssetLifecycleGovernanceCenter } from "@/features/assets/asset-lifecycle-governance";
import { CreativeAssetIntelligencePanel } from "@/features/assets/creative-asset-intelligence-panel";
import { createCreativeAssetIntelligenceCenter } from "@/features/assets/creative-asset-intelligence";
import { AssetProvenanceReviewPanel } from "@/features/assets/asset-provenance-review-panel";
import { createAssetProvenanceReviewCenter } from "@/features/assets/asset-provenance-review";
import { SignOutButton } from "@/features/auth/sign-out-button";
import { WorkspaceAuditLogPanel } from "@/features/audit/workspace-audit-log-panel";
import { CampaignBoardPanel } from "@/features/campaigns/campaign-board-panel";
import { createCampaignLaunchRoomCenter } from "@/features/campaigns/campaign-launch-rooms";
import { CampaignLaunchRoomsPanel } from "@/features/campaigns/campaign-launch-rooms-panel";
import { createRuleBasedCampaignGenerationCenter } from "@/features/campaigns/rule-based-campaign-generation";
import { RuleBasedCampaignGenerationPanel } from "@/features/campaigns/rule-based-campaign-generation-panel";
import { ClientPortalRoomsPanel } from "@/features/client-portal/client-portal-rooms-panel";
import { createClientPortalCenter } from "@/features/client-portal/client-portal-rooms";
import { createClientAnalyticsHandoffRooms } from "@/features/client-portal/client-analytics-handoff-rooms";
import { ClientAnalyticsHandoffRoomsPanel } from "@/features/client-portal/client-analytics-handoff-rooms-panel";
import { ProjectCoachingModePanel } from "@/features/coaching/project-coaching-mode-panel";
import { createProjectCoachingModeCenter } from "@/features/coaching/project-coaching-mode";
import { LiveCollaborationSessionReconciliationPanel } from "@/features/collaboration/live-collaboration-session-reconciliation-panel";
import { createLiveCollaborationSessionReconciliationCenter } from "@/features/collaboration/live-collaboration-session-reconciliation";
import { ProductionCollaborationRoomsPanel } from "@/features/collaboration/production-collaboration-rooms-panel";
import { createProductionCollaborationRoomCenter } from "@/features/collaboration/production-collaboration-rooms";
import { CompliancePrivacyCenterPanel } from "@/features/compliance/compliance-privacy-center-panel";
import { createCompliancePrivacyCenter } from "@/features/compliance/compliance-privacy-center";
import { DataResidencyExportControlsPanel } from "@/features/compliance/data-residency-export-controls-panel";
import { createDataResidencyExportControlsCenter } from "@/features/compliance/data-residency-export-controls";
import { ProfessionalTypographySystemPanel } from "@/features/creation/professional-typography-system-panel";
import { RuleBasedLayoutIntelligencePanel } from "@/features/creation/rule-based-layout-intelligence-panel";
import { ContentDatabasePanel } from "@/features/content-database/content-database-panel";
import { createContentDatabaseCenter } from "@/features/content-database/content-database";
import { createEnterpriseContentOperationsCalendar } from "@/features/content-planner/enterprise-content-operations-calendar";
import { EnterpriseContentOperationsCalendarPanel } from "@/features/content-planner/enterprise-content-operations-calendar-panel";
import { ContentPlannerPanel } from "@/features/content-planner/content-planner-panel";
import { DesignSystemIntelligencePanel } from "@/features/design-system/design-system-intelligence-panel";
import { createDesignSystemIntelligenceCenter } from "@/features/design-system/design-system-intelligence";
import { DesignSystemReleaseGovernancePanel } from "@/features/design-system/design-system-release-governance-panel";
import { createDesignSystemReleaseGovernanceCenter } from "@/features/design-system/design-system-release-governance";
import { ReusableComponentSectionLibraryPanel } from "@/features/libraries/reusable-component-section-library-panel";
import { createReusableComponentSectionLibraryCenter } from "@/features/libraries/reusable-component-section-library";
import { DesktopOfflineSyncCenterPanel } from "@/features/desktop/desktop-offline-sync-center-panel";
import { createDesktopOfflineSyncCenter } from "@/features/desktop/desktop-offline-sync-center";
import { DesktopAutoUpdateDeliveryPanel } from "@/features/desktop/desktop-auto-update-delivery-panel";
import { createDesktopAutoUpdateDeliveryCenter } from "@/features/desktop/desktop-auto-update-delivery";
import { desktopAutoUpdateArtifacts } from "@/features/desktop/desktop-auto-update-delivery-source";
import { DesktopPackagingReadinessPanel } from "@/features/desktop/desktop-packaging-readiness-panel";
import { createDesktopPackagingReadinessCenter } from "@/features/desktop/desktop-packaging-readiness";
import { desktopPackagingReadinessSource } from "@/features/desktop/desktop-packaging-readiness-source";
import { DesktopSyncReconciliationPanel } from "@/features/desktop/desktop-sync-reconciliation-panel";
import { createDesktopSyncReconciliationCenter } from "@/features/desktop/desktop-sync-reconciliation";
import { createWebsiteEmailRenderingQaCenter } from "@/features/distribution/website-email-rendering-qa";
import { WebsiteEmailRenderingQaPanel } from "@/features/distribution/website-email-rendering-qa-panel";
import { createProductionDistributionAnalyticsCenter } from "@/features/distribution/production-distribution-analytics";
import { ProductionDistributionAnalyticsPanel } from "@/features/distribution/production-distribution-analytics-panel";
import { createSocialDistributionCommandCenter } from "@/features/distribution/social-distribution-command-center";
import { SocialDistributionCommandCenterPanel } from "@/features/distribution/social-distribution-command-center-panel";
import { EmailBuilderPanel } from "@/features/email/email-builder-panel";
import { createEditorCommandWorkflowAutomationCenter } from "@/features/editor/command-workflow-automation";
import { EditorCommandWorkflowAutomationPanel } from "@/features/editor/command-workflow-automation-panel";
import { createFirstPartyExtensionRuntimeCenter } from "@/features/extensions/first-party-extension-runtime";
import { FirstPartyExtensionRuntimePanel } from "@/features/extensions/first-party-extension-runtime-panel";
import { ExportCertificationWorkspacesPanel } from "@/features/export-certification/export-certification-workspaces-panel";
import { createExportCertificationCenter } from "@/features/export-certification/export-certification-workspaces";
import { ServerExportJobsPanel } from "@/features/export-jobs/server-export-jobs-panel";
import { createBrandComplianceApprovalCenter } from "@/features/governance/brand-compliance-approvals";
import { BrandComplianceApprovalsPanel } from "@/features/governance/brand-compliance-approvals-panel";
import { DesignGovernancePanel } from "@/features/governance/design-governance-panel";
import { createDesignGovernanceReport } from "@/features/governance/design-governance";
import { ImportRepairOperationsPanel } from "@/features/import-repair/import-repair-operations-panel";
import { createImportRepairOperationsCenter } from "@/features/import-repair/import-repair-operations";
import { AccessibilityLocalizationFinishPanel } from "@/features/localization/accessibility-localization-finish-panel";
import { MediaBrandDeliveryKitsPanel } from "@/features/media-delivery/media-brand-delivery-kits-panel";
import { MultiBrandWorkspacePanel } from "@/features/governance/multi-brand-workspace-panel";
import { createMultiBrandWorkspaceControlCenter } from "@/features/governance/multi-brand-workspace";
import { WorkspaceRolePolicySimulatorPanel } from "@/features/governance/workspace-role-policy-simulator-panel";
import { createWorkspaceRolePolicySimulator } from "@/features/governance/workspace-role-policy-simulator";
import { OrganizationUsageGovernancePanel } from "@/features/governance/organization-usage-governance-panel";
import { createOrganizationUsageGovernance } from "@/features/governance/organization-usage-governance";
import { PolicyAsCodeGovernancePanel } from "@/features/governance/policy-as-code-governance-panel";
import { createPolicyAsCodeGovernanceCenter } from "@/features/governance/policy-as-code-governance";
import { NotificationsPanel } from "@/features/notifications/notifications-panel";
import { ProductionObservabilityPanel } from "@/features/observability/production-observability-panel";
import { createProductionObservabilityReport } from "@/features/observability/production-observability";
import { createLargeWorkspacePerformanceIntelligenceCenter } from "@/features/performance/large-workspace-performance-intelligence";
import { LargeWorkspacePerformanceIntelligencePanel } from "@/features/performance/large-workspace-performance-intelligence-panel";
import { ReleaseReadinessGatesPanel } from "@/features/operations/release-readiness-gates-panel";
import { createReleaseReadinessReport } from "@/features/operations/release-readiness-gates";
import { PublishExportReleaseGatesPanel } from "@/features/operations/publish-export-release-gates-panel";
import { createPublishExportReleaseGateCenter } from "@/features/operations/publish-export-release-gates";
import { ProductionCommandRunnerPanel } from "@/features/operations/production-command-runner-panel";
import { createProductionCommandRunnerCenter } from "@/features/operations/production-command-runner";
import { ProductionCapacityForecastingPanel } from "@/features/operations/production-capacity-forecasting-panel";
import { createProductionCapacityForecastingCenter } from "@/features/operations/production-capacity-forecasting";
import { ProductionSupportDeskPanel } from "@/features/support/production-support-desk-panel";
import { createProductionSupportDesk } from "@/features/support/production-support-desk";
import { EnterpriseIncidentResponseCommandCenterPanel } from "@/features/support/enterprise-incident-response-command-center-panel";
import { createEnterpriseIncidentResponseCommandCenter } from "@/features/support/enterprise-incident-response-command-center";
import { WorkspaceBackupRestorePanel } from "@/features/operations/workspace-backup-restore-panel";
import { createWorkspaceBackupRestoreCenter } from "@/features/operations/workspace-backup-restore";
import { WorkspacePackageOperationsPanel } from "@/features/operations/workspace-package-operations-panel";
import { createWorkspacePackageOperations } from "@/features/operations/workspace-package-operations";
import { ProjectLibrary } from "@/features/projects/project-library";
import { ProjectAuditCenterPanel } from "@/features/projects/project-audit-center-panel";
import { createProjectDependencyGraph } from "@/features/projects/project-dependency-graph";
import { ProjectDependencyGraphPanel } from "@/features/projects/project-dependency-graph-panel";
import { ProjectHandoffPacketPanel } from "@/features/projects/project-handoff-packet-panel";
import { ProjectRetentionCenterPanel } from "@/features/projects/project-retention-center-panel";
import { createProjectRetentionCenter } from "@/features/projects/project-retention-center";
import { VendorProductionHandoffPanel } from "@/features/print-production/vendor-production-handoff-panel";
import { createVendorProductionHandoffCenter } from "@/features/print-production/vendor-production-handoff";
import { PublishingChannelCenterPanel } from "@/features/publishing/publishing-channel-center-panel";
import { createPublishingChannelCenter } from "@/features/publishing/publishing-channel-depth";
import { createDataConnectedReportDashboardCenter } from "@/features/reports/data-connected-report-dashboards";
import { DataConnectedReportDashboardsPanel } from "@/features/reports/data-connected-report-dashboards-panel";
import { createStakeholderReportingSubscriptionCenter } from "@/features/reports/stakeholder-reporting-subscriptions";
import { StakeholderReportingSubscriptionsPanel } from "@/features/reports/stakeholder-reporting-subscriptions-panel";
import { CollaborativeProofingCompareRoomsPanel } from "@/features/review/collaborative-proofing-compare-rooms-panel";
import { createCollaborativeProofingCompareRooms } from "@/features/review/collaborative-proofing-compare-rooms";
import { ReviewerCollaborationCenterPanel } from "@/features/review/reviewer-collaboration-center-panel";
import { createReviewerCollaborationCenter } from "@/features/review/reviewer-collaboration-center";
import { EnterpriseApprovalAnalyticsPanel } from "@/features/review/enterprise-approval-analytics-panel";
import { createEnterpriseApprovalAnalyticsCenter } from "@/features/review/enterprise-approval-analytics";
import { EnterpriseApprovalWorkflowsPanel } from "@/features/review/enterprise-approval-workflows-panel";
import { createEnterpriseApprovalWorkflowCenter } from "@/features/review/enterprise-approval-workflows";
import { ReviewTasksPanel } from "@/features/review/review-tasks-panel";
import { EnterpriseSsoScimReadinessPanel } from "@/features/security/enterprise-sso-scim-readiness-panel";
import { createEnterpriseSsoScimReadinessCenter } from "@/features/security/enterprise-sso-scim-readiness";
import { EnterpriseSsoScimEnforcementPanel } from "@/features/security/enterprise-sso-scim-enforcement-panel";
import { createEnterpriseSsoScimEnforcementCenter } from "@/features/security/enterprise-sso-scim-enforcement";
import {
  enterpriseIdentityProviderConfig,
  enterpriseScimProvisioningGroups,
  enterpriseScimProvisioningUsers,
} from "@/features/security/enterprise-sso-scim-source";
import { WorkspaceCommandCenterPanel } from "@/features/search/workspace-command-center-panel";
import { createWorkspaceCommandCenter } from "@/features/search/workspace-command-center";
import { StockLibraryPanel } from "@/features/stock/stock-library-panel";
import { createWorkspacePortfolioPlanningCenter } from "@/features/portfolio/workspace-portfolio-planning";
import { WorkspacePortfolioPlanningPanel } from "@/features/portfolio/workspace-portfolio-planning-panel";
import { TeamWorkspacePanel } from "@/features/team/team-workspace-panel";
import { MultiWorkspaceFederationPanel } from "@/features/team/multi-workspace-federation-panel";
import { createMultiWorkspaceFederationCenter } from "@/features/team/multi-workspace-federation";
import { createMarketplaceCreatorOperationsCenter } from "@/features/templates/marketplace-creator-operations";
import { MarketplaceCreatorOperationsPanel } from "@/features/templates/marketplace-creator-operations-panel";
import { createFirstPartyTemplateLibraryExpansion } from "@/features/templates/first-party-template-library-expansion";
import { FirstPartyTemplateLibraryExpansionPanel } from "@/features/templates/first-party-template-library-expansion-panel";
import { TemplateGallery } from "@/features/templates/template-gallery";
import { getTemplateCollectionResults } from "@/features/templates/template-collections";
import { createTemplateMarketplaceIntelligence } from "@/features/templates/template-marketplace-intelligence";
import { TemplateMarketplaceIntelligencePanel } from "@/features/templates/template-marketplace-intelligence-panel";
import { TemplatePackageRegistryPanel } from "@/features/templates/template-package-registry-panel";
import { createTemplatePackageRegistry } from "@/features/templates/template-package-registry";
import { createTemplateDesignReleaseChannelsCenter } from "@/features/templates/template-design-release-channels";
import { TemplateDesignReleaseChannelsPanel } from "@/features/templates/template-design-release-channels-panel";
import { createTemplateInstancePropagationCenter } from "@/features/templates/template-instance-propagation";
import { TemplateInstancePropagationPanel } from "@/features/templates/template-instance-propagation-panel";
import { createTemplateQualityQaCenter } from "@/features/templates/template-quality-qa-center";
import { TemplateQualityQaCenterPanel } from "@/features/templates/template-quality-qa-center-panel";
import { MixedFormatOrchestrationPanel } from "@/features/visual-suite/mixed-format-orchestration-panel";
import { NotificationPreferenceRoutingPanel } from "@/features/notifications/notification-preference-routing-panel";
import { WorkspaceIntegrationSurfacePanel } from "@/features/visual-suite/workspace-integration-surface-panel";
import { createWorkspaceIntegrationSurface } from "@/features/visual-suite/workspace-integration-surface";
import { createWorkspaceIntelligenceBriefingCenter } from "@/features/workspace-intelligence/workspace-intelligence-briefings";
import { WorkspaceIntelligenceBriefingsPanel } from "@/features/workspace-intelligence/workspace-intelligence-briefings-panel";
import { WebsitePublisherPanel } from "@/features/website/website-publisher-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  AccountProfile,
  AccountSessionSummary,
} from "@/db/account-settings";
import type { AuthEmailSummary } from "@/db/auth-emails";
import type { AdminDashboardData } from "@/db/admin-dashboard";
import type { AutomationRecipeSummary } from "@/features/automation/automation-recipes";
import type { CampaignBoardSummary } from "@/db/campaigns";
import type { ContentScheduleSummary } from "@/db/content-planner";
import type {
  TeamWorkspaceInviteSummary,
  TeamWorkspaceSummary,
} from "@/db/team-workspaces";
import type { TeamWorkspaceManagementSummary } from "@/db/team-workspace-management";
import type { UserNotificationSummary } from "@/db/notifications";
import type { ReviewTaskSummary } from "@/db/project-comments";
import type { WorkspaceProjectPresenceSummary } from "@/db/project-presence";
import type { TwoFactorProfile } from "@/db/two-factor";
import type {
  WebsiteFormSubmissionSummary,
  WebsitePublishSummary,
} from "@/db/website-publishing";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { AssetLibraryAudit } from "@/features/assets/asset-library-audit";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type { ProfessionalTypographySystemCenter } from "@/features/creation/professional-typography-system";
import type { RuleBasedLayoutIntelligenceCenter } from "@/features/creation/rule-based-layout-intelligence";
import type { AccessibilityLocalizationFinishCenter } from "@/features/localization/accessibility-localization-finish";
import type { MediaBrandDeliveryKitCenter } from "@/features/media-delivery/media-brand-delivery-kits";
import type { NotificationPreferenceRoutingCenter } from "@/features/notifications/notification-preference-routing";
import type { ProjectAuditSummary } from "@/features/projects/project-audit-center";
import type { ProjectHandoffPacket } from "@/features/projects/project-handoff-packet";
import type { MixedFormatWorkspaceOrchestration } from "@/features/visual-suite/mixed-format-orchestration";
import type {
  DesignTemplateSummary,
  BrandColorSummary,
  BrandFontSummary,
  BrandLogoSummary,
  ProjectFolderSummary,
  ProjectVersionSummary,
  ProjectSummary,
} from "@/features/editor/types";
import {
  customDesignDimensionLimits,
  designPresets,
} from "@/features/editor/presets";
import {
  editorLocales,
  getEditorLocale,
  type EditorLocale,
} from "@/features/editor/editor-localization";
import {
  dashboardLocaleStorageKey,
  getDashboardCopy,
  type DashboardCopy,
} from "@/features/dashboard/dashboard-localization";
import { productName } from "@/lib/product";

type ServerAction = (formData: FormData) => Promise<void> | void;

const dashboardLocaleChangedEvent = "essence-dashboard-locale-changed";
let dashboardLocaleMemorySnapshot: EditorLocale = "en";

type StudioDashboardProps = {
  sessionEmail: string;
  projects: ProjectSummary[];
  folders: ProjectFolderSummary[];
  templates: DesignTemplateSummary[];
  workspaces: TeamWorkspaceSummary[];
  teamManagement: TeamWorkspaceManagementSummary[];
  pendingInvites: TeamWorkspaceInviteSummary[];
  notifications: UserNotificationSummary[];
  accountProfile: AccountProfile;
  accountSessions: AccountSessionSummary[];
  authEmails: AuthEmailSummary[];
  brandColors: BrandColorSummary[];
  brandFonts: BrandFontSummary[];
  brandLogos: BrandLogoSummary[];
  assetAudit: AssetLibraryAudit;
  serverExportJobs: ServerExportJobSummary[];
  reviewTasks: ReviewTaskSummary[];
  workspacePresence: WorkspaceProjectPresenceSummary[];
  campaignBoards: CampaignBoardSummary[];
  contentScheduleItems: ContentScheduleSummary[];
  websitePublishes: WebsitePublishSummary[];
  websiteFormSubmissions: WebsiteFormSubmissionSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  projectAudits: ProjectAuditSummary[];
  projectHandoffPackets: ProjectHandoffPacket[];
  projectVersions: ProjectVersionSummary[];
  mediaBrandDeliveryKitCenter: MediaBrandDeliveryKitCenter;
  mixedFormatOrchestration: MixedFormatWorkspaceOrchestration;
  ruleBasedLayoutIntelligence: RuleBasedLayoutIntelligenceCenter;
  professionalTypographySystem: ProfessionalTypographySystemCenter;
  accessibilityLocalizationFinish: AccessibilityLocalizationFinishCenter;
  automationRecipes: AutomationRecipeSummary[];
  notificationRoutingCenter: NotificationPreferenceRoutingCenter;
  twoFactor: TwoFactorProfile;
  adminData: AdminDashboardData | null;
  createDesignAction: ServerAction;
  bulkScheduleCampaignDeliverablesAction: ServerAction;
  createCampaignBoardAction: ServerAction;
  createCampaignDerivativesAction: ServerAction;
  updateApprovalStatusAction: ServerAction;
  requestReleaseOverrideAction: ServerAction;
  updateReviewTaskStatusAction: ServerAction;
  createDesignFromCatalogTemplateAction: ServerAction;
  createDesignFromTemplateAction: ServerAction;
  duplicateDesignAsSizeAction: ServerAction;
  createContentScheduleAction: ServerAction;
  applyAutomationRecipeAction: ServerAction;
  rescheduleContentScheduleAction: ServerAction;
  updateContentScheduleStatusAction: ServerAction;
  deleteContentScheduleAction: ServerAction;
  updateTemplateMarketplaceAction: ServerAction;
  publishWebsiteAction: ServerAction;
  unpublishWebsiteAction: ServerAction;
  createLinkInBioWebsiteAction: ServerAction;
  addWebsiteDomainAction: ServerAction;
  attachWebsiteDomainAction: ServerAction;
  refreshWebsiteDomainPlatformAction: ServerAction;
  verifyWebsiteDomainAction: ServerAction;
  deleteWebsiteDomainAction: ServerAction;
  sendTestEmailAction: ServerAction;
  createTeamWorkspaceAction: ServerAction;
  inviteTeamMemberAction: ServerAction;
  acceptTeamInviteAction: ServerAction;
  revokeTeamInviteAction: ServerAction;
  updateTeamMemberRoleAction: ServerAction;
  transferTeamOwnershipAction: ServerAction;
  markNotificationReadAction: ServerAction;
  markAllNotificationsReadAction: ServerAction;
  updateAccountProfileAction: ServerAction;
  sendVerificationEmailAction: ServerAction;
  revokeSessionAction: ServerAction;
  deleteAccountAction: ServerAction;
  enableTwoFactorAction: ServerAction;
  disableTwoFactorAction: ServerAction;
  deleteAssetAction: ServerAction;
  deleteDuplicateAssetsAction: ServerAction;
  installExtensionAction: ServerAction;
  removeExtensionAction: ServerAction;
  installWorkflowTemplateAction: ServerAction;
};

export function StudioDashboard({
  sessionEmail,
  projects,
  folders,
  templates,
  workspaces,
  teamManagement,
  pendingInvites,
  notifications,
  accountProfile,
  accountSessions,
  authEmails,
  brandColors,
  brandFonts,
  brandLogos,
  assetAudit,
  serverExportJobs,
  reviewTasks,
  workspacePresence,
  campaignBoards,
  contentScheduleItems,
  websitePublishes,
  websiteFormSubmissions,
  auditLogs,
  projectAudits,
  projectHandoffPackets,
  projectVersions,
  mediaBrandDeliveryKitCenter,
  mixedFormatOrchestration,
  ruleBasedLayoutIntelligence,
  professionalTypographySystem,
  accessibilityLocalizationFinish,
  automationRecipes,
  notificationRoutingCenter,
  twoFactor,
  adminData,
  createDesignAction,
  bulkScheduleCampaignDeliverablesAction,
  createCampaignBoardAction,
  createCampaignDerivativesAction,
  updateApprovalStatusAction,
  requestReleaseOverrideAction,
  updateReviewTaskStatusAction,
  createDesignFromCatalogTemplateAction,
  createDesignFromTemplateAction,
  duplicateDesignAsSizeAction,
  createContentScheduleAction,
  applyAutomationRecipeAction,
  rescheduleContentScheduleAction,
  updateContentScheduleStatusAction,
  deleteContentScheduleAction,
  updateTemplateMarketplaceAction,
  publishWebsiteAction,
  unpublishWebsiteAction,
  createLinkInBioWebsiteAction,
  addWebsiteDomainAction,
  attachWebsiteDomainAction,
  refreshWebsiteDomainPlatformAction,
  verifyWebsiteDomainAction,
  deleteWebsiteDomainAction,
  sendTestEmailAction,
  createTeamWorkspaceAction,
  inviteTeamMemberAction,
  acceptTeamInviteAction,
  revokeTeamInviteAction,
  updateTeamMemberRoleAction,
  transferTeamOwnershipAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
  updateAccountProfileAction,
  sendVerificationEmailAction,
  revokeSessionAction,
  deleteAccountAction,
  enableTwoFactorAction,
  disableTwoFactorAction,
  deleteAssetAction,
  deleteDuplicateAssetsAction,
  installExtensionAction,
  removeExtensionAction,
  installWorkflowTemplateAction,
}: StudioDashboardProps) {
  const dashboardLocale = useSyncExternalStore(
    subscribeToDashboardLocale,
    getDashboardLocaleSnapshot,
    getDashboardLocaleServerSnapshot,
  );
  const websiteUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://essence-studio-omega.vercel.app";
  const activeProjects = projects.filter((project) => !project.deletedAt);
  const plannedItems = contentScheduleItems.filter(
    (item) => item.status === "planned",
  );
  const unreadNotifications = notifications.filter((item) => !item.readAt);
  const governanceReport = useMemo(
    () =>
      createDesignGovernanceReport({
        projects,
        templates,
        brandColors,
        brandFonts,
        brandLogos,
        auditLogs,
      }),
    [auditLogs, brandColors, brandFonts, brandLogos, projects, templates],
  );
  const multiBrandWorkspace = useMemo(
    () =>
      createMultiBrandWorkspaceControlCenter({
        brandColors,
        brandFonts,
        brandLogos,
        templates,
        projects,
        projectAudits,
      }),
    [brandColors, brandFonts, brandLogos, projectAudits, projects, templates],
  );
  const workspaceRolePolicySimulator = useMemo(
    () =>
      createWorkspaceRolePolicySimulator({
        workspaces: teamManagement,
        projects,
        auditLogs,
      }),
    [auditLogs, projects, teamManagement],
  );
  const multiWorkspaceFederationCenter = useMemo(
    () =>
      createMultiWorkspaceFederationCenter({
        workspaces: teamManagement,
        auditLogs,
      }),
    [auditLogs, teamManagement],
  );
  const organizationUsageGovernance = useMemo(
    () =>
      createOrganizationUsageGovernance({
        assetAudit,
        serverExportJobs,
        websitePublishes,
        websiteFormSubmissions,
        authEmails,
        automationRecipes,
        teamManagement,
      }),
    [
      assetAudit,
      authEmails,
      automationRecipes,
      serverExportJobs,
      teamManagement,
      websiteFormSubmissions,
      websitePublishes,
    ],
  );
  const policyAsCodeGovernanceCenter = useMemo(
    () =>
      createPolicyAsCodeGovernanceCenter({
        projects,
        templates,
        contentScheduleItems,
        assetAudit,
        reviewTasks,
        auditLogs,
      }),
    [
      assetAudit,
      auditLogs,
      contentScheduleItems,
      projects,
      reviewTasks,
      templates,
    ],
  );
  const enterpriseSsoScimReadinessCenter = useMemo(
    () =>
      createEnterpriseSsoScimReadinessCenter({
        accountProfile,
        authEmails,
        twoFactor,
        teamManagement,
        auditLogs,
        providerConfig: enterpriseIdentityProviderConfig,
      }),
    [accountProfile, auditLogs, authEmails, teamManagement, twoFactor],
  );
  const enterpriseSsoScimEnforcementCenter = useMemo(
    () =>
      createEnterpriseSsoScimEnforcementCenter({
        readiness: enterpriseSsoScimReadinessCenter,
        teamManagement,
        providerConfig: enterpriseIdentityProviderConfig,
        scimUsers: enterpriseScimProvisioningUsers,
        scimGroups: enterpriseScimProvisioningGroups,
        auditLogs,
      }),
    [auditLogs, enterpriseSsoScimReadinessCenter, teamManagement],
  );
  const dataResidencyExportControlsCenter = useMemo(
    () =>
      createDataResidencyExportControlsCenter({
        projects,
        assetAudit,
        serverExportJobs,
        websitePublishes,
        auditLogs,
      }),
    [assetAudit, auditLogs, projects, serverExportJobs, websitePublishes],
  );
  const automationRunHistoryCenter = useMemo(
    () =>
      createAutomationRunHistoryCenter({
        automationRecipes,
        auditLogs,
        serverExportJobs,
        contentScheduleItems,
      }),
    [auditLogs, automationRecipes, contentScheduleItems, serverExportJobs],
  );
  const workflowTemplateMarketplace = useMemo(
    () =>
      createWorkflowTemplateMarketplace({
        automationRecipes,
        teamManagement,
        auditLogs,
      }),
    [auditLogs, automationRecipes, teamManagement],
  );
  const noCodeAutomationBuilderCenter = useMemo(
    () =>
      createNoCodeAutomationBuilderCenter({
        automationRecipes,
        runHistory: automationRunHistoryCenter,
        workflowMarketplace: workflowTemplateMarketplace,
        auditLogs,
      }),
    [
      auditLogs,
      automationRecipes,
      automationRunHistoryCenter,
      workflowTemplateMarketplace,
    ],
  );
  const publishingChannelCenter = useMemo(
    () =>
      createPublishingChannelCenter({
        projects,
        contentScheduleItems,
        campaigns: campaignBoards,
        websitePublishes,
        websiteFormSubmissions,
      }),
    [
      campaignBoards,
      contentScheduleItems,
      projects,
      websiteFormSubmissions,
      websitePublishes,
    ],
  );
  const enterpriseContentOperationsCalendar = useMemo(
    () =>
      createEnterpriseContentOperationsCalendar({
        campaigns: campaignBoards,
        contentScheduleItems,
        reviewTasks,
        teamManagement,
        auditLogs,
      }),
    [
      auditLogs,
      campaignBoards,
      contentScheduleItems,
      reviewTasks,
      teamManagement,
    ],
  );
  const productionCapacityForecasting = useMemo(
    () =>
      createProductionCapacityForecastingCenter({
        campaigns: campaignBoards,
        contentScheduleItems,
        serverExportJobs,
        reviewTasks,
        teamManagement,
        auditLogs,
      }),
    [
      auditLogs,
      campaignBoards,
      contentScheduleItems,
      reviewTasks,
      serverExportJobs,
      teamManagement,
    ],
  );
  const contentDatabaseCenter = useMemo(
    () =>
      createContentDatabaseCenter({
        brandColors,
        brandFonts,
        brandLogos,
        templates,
        projects,
        campaigns: campaignBoards,
        contentScheduleItems,
        websitePublishes,
      }),
    [
      brandColors,
      brandFonts,
      brandLogos,
      campaignBoards,
      contentScheduleItems,
      projects,
      templates,
      websitePublishes,
    ],
  );
  const ruleBasedCampaignGenerationCenter = useMemo(
    () =>
      createRuleBasedCampaignGenerationCenter({
        campaigns: campaignBoards,
        contentDatabase: contentDatabaseCenter,
        starterPacks: getTemplateCollectionResults(),
      }),
    [campaignBoards, contentDatabaseCenter],
  );
  const productionDistributionAnalyticsCenter = useMemo(
    () =>
      createProductionDistributionAnalyticsCenter({
        campaigns: campaignBoards,
        campaignGeneration: ruleBasedCampaignGenerationCenter,
        contentDatabase: contentDatabaseCenter,
        publishingChannelCenter,
        contentScheduleItems,
        websitePublishes,
        websiteFormSubmissions,
        serverExportJobs,
      }),
    [
      campaignBoards,
      contentDatabaseCenter,
      contentScheduleItems,
      publishingChannelCenter,
      ruleBasedCampaignGenerationCenter,
      serverExportJobs,
      websiteFormSubmissions,
      websitePublishes,
    ],
  );
  const socialDistributionCommandCenter = useMemo(
    () =>
      createSocialDistributionCommandCenter({
        projects,
        projectVersions,
        contentScheduleItems,
        campaigns: campaignBoards,
        auditLogs,
      }),
    [
      auditLogs,
      campaignBoards,
      contentScheduleItems,
      projectVersions,
      projects,
    ],
  );
  const dataConnectedReportDashboardCenter = useMemo(
    () =>
      createDataConnectedReportDashboardCenter({
        contentDatabase: contentDatabaseCenter,
        productionAnalytics: productionDistributionAnalyticsCenter,
        publishingChannelCenter,
        contentScheduleItems,
      }),
    [
      contentDatabaseCenter,
      contentScheduleItems,
      productionDistributionAnalyticsCenter,
      publishingChannelCenter,
    ],
  );
  const websiteEmailRenderingQaCenter = useMemo(
    () =>
      createWebsiteEmailRenderingQaCenter({
        appUrl: websiteUrl,
        projects,
        projectAudits,
        websitePublishes,
        websiteFormSubmissions,
        serverExportJobs,
      }),
    [
      projectAudits,
      projects,
      serverExportJobs,
      websiteFormSubmissions,
      websitePublishes,
      websiteUrl,
    ],
  );
  const campaignLaunchRoomCenter = useMemo(
    () =>
      createCampaignLaunchRoomCenter({
        campaigns: campaignBoards,
        contentScheduleItems,
        reviewTasks,
        projectAudits,
        publishingChannelCenter,
        auditLogs,
      }),
    [
      auditLogs,
      campaignBoards,
      contentScheduleItems,
      projectAudits,
      publishingChannelCenter,
      reviewTasks,
    ],
  );
  const reviewerCollaborationCenter = useMemo(
    () =>
      createReviewerCollaborationCenter({
        projects,
        templates,
        campaigns: campaignBoards,
        reviewTasks,
        auditLogs,
      }),
    [auditLogs, campaignBoards, projects, reviewTasks, templates],
  );
  const collaborativeProofingCompareRooms = useMemo(
    () =>
      createCollaborativeProofingCompareRooms({
        projects,
        projectVersions,
        reviewTasks,
        projectHandoffPackets,
        auditLogs,
      }),
    [auditLogs, projectHandoffPackets, projectVersions, projects, reviewTasks],
  );
  const liveCollaborationSessionReconciliationCenter = useMemo(
    () =>
      createLiveCollaborationSessionReconciliationCenter({
        projects,
        presence: workspacePresence,
        reviewTasks,
        auditLogs,
      }),
    [auditLogs, projects, reviewTasks, workspacePresence],
  );
  const productionCollaborationRoomCenter = useMemo(
    () =>
      createProductionCollaborationRoomCenter({
        sessionReconciliation: liveCollaborationSessionReconciliationCenter,
        reviewTasks,
        auditLogs,
      }),
    [auditLogs, liveCollaborationSessionReconciliationCenter, reviewTasks],
  );
  const enterpriseApprovalWorkflowCenter = useMemo(
    () =>
      createEnterpriseApprovalWorkflowCenter({
        projects,
        templates,
        campaigns: campaignBoards,
        reviewTasks,
        auditLogs,
        teamManagement,
      }),
    [
      auditLogs,
      campaignBoards,
      projects,
      reviewTasks,
      teamManagement,
      templates,
    ],
  );
  const brandComplianceApprovalCenter = useMemo(
    () =>
      createBrandComplianceApprovalCenter({
        designGovernance: governanceReport,
        policyAsCode: policyAsCodeGovernanceCenter,
        approvalWorkflows: enterpriseApprovalWorkflowCenter,
        campaigns: campaignBoards,
        auditLogs,
      }),
    [
      auditLogs,
      campaignBoards,
      enterpriseApprovalWorkflowCenter,
      governanceReport,
      policyAsCodeGovernanceCenter,
    ],
  );
  const enterpriseApprovalAnalyticsCenter = useMemo(
    () =>
      createEnterpriseApprovalAnalyticsCenter({
        projects,
        templates,
        campaigns: campaignBoards,
        reviewTasks,
        auditLogs,
        teamManagement,
      }),
    [
      auditLogs,
      campaignBoards,
      projects,
      reviewTasks,
      teamManagement,
      templates,
    ],
  );
  const clientPortalCenter = useMemo(
    () =>
      createClientPortalCenter({
        projects,
        reviewTasks,
        projectHandoffPackets,
        auditLogs,
      }),
    [auditLogs, projectHandoffPackets, projects, reviewTasks],
  );
  const clientAnalyticsHandoffRooms = useMemo(
    () =>
      createClientAnalyticsHandoffRooms({
        clientPortal: clientPortalCenter,
        productionAnalytics: productionDistributionAnalyticsCenter,
        reportDashboards: dataConnectedReportDashboardCenter,
        campaigns: campaignBoards,
        contentScheduleItems,
        projectHandoffPackets,
        reviewTasks,
        auditLogs,
      }),
    [
      auditLogs,
      campaignBoards,
      clientPortalCenter,
      contentScheduleItems,
      dataConnectedReportDashboardCenter,
      productionDistributionAnalyticsCenter,
      projectHandoffPackets,
      reviewTasks,
    ],
  );
  const observabilityReport = useMemo(
    () =>
      createProductionObservabilityReport({
        exportJobs: serverExportJobs,
        authEmails,
        websitePublishes,
        assetAudit,
        reviewTasks,
        projects,
      }),
    [
      assetAudit,
      authEmails,
      projects,
      reviewTasks,
      serverExportJobs,
      websitePublishes,
    ],
  );
  const assetOperations = useMemo(
    () =>
      createAssetLibraryOperationCenter({
        audit: assetAudit,
        projects,
        templates,
      }),
    [assetAudit, projects, templates],
  );
  const advancedBatchAssetOperations = useMemo(
    () =>
      createAdvancedBatchAssetOperationCenter({
        audit: assetAudit,
        projects,
      }),
    [assetAudit, projects],
  );
  const assetProvenanceReview = useMemo(
    () =>
      createAssetProvenanceReviewCenter({
        audit: assetAudit,
      }),
    [assetAudit],
  );
  const creativeAssetIntelligence = useMemo(
    () =>
      createCreativeAssetIntelligenceCenter({
        audit: assetAudit,
        projects,
        templates,
        serverExportJobs,
        websitePublishes,
      }),
    [assetAudit, projects, serverExportJobs, templates, websitePublishes],
  );
  const assetLifecycleGovernance = useMemo(
    () =>
      createAssetLifecycleGovernanceCenter({
        audit: assetAudit,
        provenanceReview: assetProvenanceReview,
        batchOperations: advancedBatchAssetOperations,
        creativeIntelligence: creativeAssetIntelligence,
        auditLogs,
      }),
    [
      advancedBatchAssetOperations,
      assetAudit,
      assetProvenanceReview,
      auditLogs,
      creativeAssetIntelligence,
    ],
  );
  const desktopOfflineSyncCenter = useMemo(
    () =>
      createDesktopOfflineSyncCenter({
        projects,
        assetAudit,
        serverExportJobs,
        auditLogs,
      }),
    [assetAudit, auditLogs, projects, serverExportJobs],
  );
  const desktopSyncReconciliationCenter = useMemo(
    () =>
      createDesktopSyncReconciliationCenter({
        projects,
        projectVersions,
        serverExportJobs,
        assetAudit,
        auditLogs,
        offlineSyncCenter: desktopOfflineSyncCenter,
      }),
    [
      assetAudit,
      auditLogs,
      desktopOfflineSyncCenter,
      projectVersions,
      projects,
      serverExportJobs,
    ],
  );
  const adminOperationsCenter = useMemo(
    () =>
      adminData
        ? createAdminOperationsCenter({
            adminData,
            assetAudit,
            websitePublishes,
            serverExportJobs,
            auditLogs,
          })
        : null,
    [adminData, assetAudit, auditLogs, serverExportJobs, websitePublishes],
  );
  const workspaceIntegrationSurface = useMemo(
    () =>
      createWorkspaceIntegrationSurface({
        projects,
        templates,
        projectAudits,
        projectHandoffPackets,
        reviewTasks,
        serverExportJobs,
        mixedFormatOrchestration,
      }),
    [
      mixedFormatOrchestration,
      projectAudits,
      projectHandoffPackets,
      projects,
      reviewTasks,
      serverExportJobs,
      templates,
    ],
  );
  const workspacePackageOperations = useMemo(
    () =>
      createWorkspacePackageOperations({
        projects,
        templates,
        projectVersions,
        serverExportJobs,
        projectHandoffPackets,
      }),
    [
      projectHandoffPackets,
      projectVersions,
      projects,
      serverExportJobs,
      templates,
    ],
  );
  const designSystemIntelligence = useMemo(
    () =>
      createDesignSystemIntelligenceCenter({
        brandColors,
        brandFonts,
        brandLogos,
        templates,
        projects,
        projectAudits,
        projectVersions,
        auditLogs,
      }),
    [
      auditLogs,
      brandColors,
      brandFonts,
      brandLogos,
      projectAudits,
      projectVersions,
      projects,
      templates,
    ],
  );
  const designSystemReleaseGovernance = useMemo(
    () =>
      createDesignSystemReleaseGovernanceCenter({
        designSystem: designSystemIntelligence,
        templates,
        projects,
        projectVersions,
        auditLogs,
      }),
    [auditLogs, designSystemIntelligence, projectVersions, projects, templates],
  );
  const importRepairOperations = useMemo(
    () =>
      createImportRepairOperationsCenter({
        projects,
        mixedFormatOrchestration,
        projectAudits,
        projectVersions,
        auditLogs,
      }),
    [
      auditLogs,
      mixedFormatOrchestration,
      projectAudits,
      projectVersions,
      projects,
    ],
  );
  const exportCertificationCenter = useMemo(
    () =>
      createExportCertificationCenter({
        projects,
        projectAudits,
        serverExportJobs,
        websitePublishes,
        reviewTasks,
        projectHandoffPackets,
        auditLogs,
      }),
    [
      auditLogs,
      projectAudits,
      projectHandoffPackets,
      projects,
      reviewTasks,
      serverExportJobs,
      websitePublishes,
    ],
  );
  const vendorProductionHandoffCenter = useMemo(
    () =>
      createVendorProductionHandoffCenter({
        projects,
        projectAudits,
        serverExportJobs,
        projectHandoffPackets,
      }),
    [projectAudits, projectHandoffPackets, projects, serverExportJobs],
  );
  const projectCoachingModeCenter = useMemo(
    () =>
      createProjectCoachingModeCenter({
        projects,
        layoutIntelligence: ruleBasedLayoutIntelligence,
        typographySystem: professionalTypographySystem,
        projectAudits,
        projectHandoffPackets,
        vendorProductionHandoff: vendorProductionHandoffCenter,
        mediaBrandDeliveryKitCenter,
        reviewTasks,
      }),
    [
      mediaBrandDeliveryKitCenter,
      professionalTypographySystem,
      projectAudits,
      projectHandoffPackets,
      projects,
      reviewTasks,
      ruleBasedLayoutIntelligence,
      vendorProductionHandoffCenter,
    ],
  );
  const marketplaceCreatorOperations = useMemo(
    () =>
      createMarketplaceCreatorOperationsCenter({
        templates,
        projects,
        projectVersions,
        projectAudits,
        reviewTasks,
        auditLogs,
      }),
    [
      auditLogs,
      projectAudits,
      projectVersions,
      projects,
      reviewTasks,
      templates,
    ],
  );
  const workspaceBackupRestoreCenter = useMemo(
    () =>
      createWorkspaceBackupRestoreCenter({
        projects,
        templates,
        projectVersions,
        serverExportJobs,
        websitePublishes,
        websiteFormSubmissions,
        campaigns: campaignBoards,
        assetAudit,
        auditLogs,
      }),
    [
      assetAudit,
      auditLogs,
      campaignBoards,
      projectVersions,
      projects,
      serverExportJobs,
      templates,
      websiteFormSubmissions,
      websitePublishes,
    ],
  );
  const releaseReadinessReport = useMemo(
    () =>
      createReleaseReadinessReport({
        accountProfile,
        adminUsers: adminData?.users ?? [],
        projects,
        templates,
        projectVersions,
        serverExportJobs,
        authEmails,
        auditLogs,
        websitePublishes,
        health: adminData?.health ?? null,
      }),
    [
      accountProfile,
      adminData,
      auditLogs,
      authEmails,
      projectVersions,
      projects,
      serverExportJobs,
      templates,
      websitePublishes,
    ],
  );
  const publishExportReleaseGateCenter = useMemo(
    () =>
      createPublishExportReleaseGateCenter({
        projects,
        templates,
        contentScheduleItems,
        serverExportJobs,
        websitePublishes,
        policyAsCode: policyAsCodeGovernanceCenter,
        auditLogs,
      }),
    [
      auditLogs,
      contentScheduleItems,
      policyAsCodeGovernanceCenter,
      projects,
      serverExportJobs,
      templates,
      websitePublishes,
    ],
  );
  const desktopPackagingReadinessCenter = useMemo(
    () =>
      createDesktopPackagingReadinessCenter({
        source: desktopPackagingReadinessSource,
        releaseReadiness: releaseReadinessReport,
        offlineSync: desktopOfflineSyncCenter,
        syncReconciliation: desktopSyncReconciliationCenter,
        operationalHealth: adminData?.health ?? null,
        auditLogs,
      }),
    [
      adminData,
      auditLogs,
      desktopOfflineSyncCenter,
      desktopSyncReconciliationCenter,
      releaseReadinessReport,
    ],
  );
  const desktopAutoUpdateDeliveryCenter = useMemo(
    () =>
      createDesktopAutoUpdateDeliveryCenter({
        source: desktopPackagingReadinessSource,
        packaging: desktopPackagingReadinessCenter,
        artifacts: desktopAutoUpdateArtifacts,
        auditLogs,
      }),
    [auditLogs, desktopPackagingReadinessCenter],
  );
  const productionSupportDesk = useMemo(
    () =>
      createProductionSupportDesk({
        projects,
        reviewTasks,
        projectAudits,
        projectHandoffPackets,
        serverExportJobs,
        websitePublishes,
        auditLogs,
      }),
    [
      auditLogs,
      projectAudits,
      projectHandoffPackets,
      projects,
      reviewTasks,
      serverExportJobs,
      websitePublishes,
    ],
  );
  const templatePackageRegistry = useMemo(
    () =>
      createTemplatePackageRegistry({
        templates,
        projects,
        projectVersions,
        auditLogs,
      }),
    [auditLogs, projectVersions, projects, templates],
  );
  const templateDesignReleaseChannels = useMemo(
    () =>
      createTemplateDesignReleaseChannelsCenter({
        templates,
        projects,
        projectVersions,
        auditLogs,
      }),
    [auditLogs, projectVersions, projects, templates],
  );
  const templateInstancePropagationCenter = useMemo(
    () =>
      createTemplateInstancePropagationCenter({
        templates,
        projects,
        projectVersions,
        campaigns: campaignBoards,
        auditLogs,
      }),
    [auditLogs, campaignBoards, projectVersions, projects, templates],
  );
  const reusableComponentSectionLibrary = useMemo(
    () =>
      createReusableComponentSectionLibraryCenter({
        templates,
        projects,
        projectVersions,
        designSystem: designSystemIntelligence,
        releaseGovernance: designSystemReleaseGovernance,
        templateInstancePropagation: templateInstancePropagationCenter,
      }),
    [
      designSystemIntelligence,
      designSystemReleaseGovernance,
      projectVersions,
      projects,
      templateInstancePropagationCenter,
      templates,
    ],
  );
  const projectDependencyGraph = useMemo(
    () =>
      createProjectDependencyGraph({
        projects,
        templates,
        exportJobs: serverExportJobs,
        websitePublishes,
        campaigns: campaignBoards,
      }),
    [campaignBoards, projects, serverExportJobs, templates, websitePublishes],
  );
  const workspacePortfolioPlanning = useMemo(
    () =>
      createWorkspacePortfolioPlanningCenter({
        projects,
        campaigns: campaignBoards,
        reviewTasks,
        contentScheduleItems,
        teamManagement,
        projectDependencyGraph,
        auditLogs,
      }),
    [
      auditLogs,
      campaignBoards,
      contentScheduleItems,
      projectDependencyGraph,
      projects,
      reviewTasks,
      teamManagement,
    ],
  );
  const marketplaceIntelligence = useMemo(
    () =>
      createTemplateMarketplaceIntelligence({
        templates,
        auditLogs,
      }),
    [auditLogs, templates],
  );
  const firstPartyTemplateLibraryExpansion = useMemo(
    () => createFirstPartyTemplateLibraryExpansion(),
    [],
  );
  const templateQualityQaCenter = useMemo(
    () =>
      createTemplateQualityQaCenter({
        templates,
        projectAudits,
        accessibilityLocalizationFinish,
        auditLogs,
      }),
    [accessibilityLocalizationFinish, auditLogs, projectAudits, templates],
  );
  const workspaceCommandCenter = useMemo(
    () =>
      createWorkspaceCommandCenter({
        projects,
        assetAudit,
        templates,
        reviewTasks,
        serverExportJobs,
        contentScheduleItems,
      }),
    [
      assetAudit,
      contentScheduleItems,
      projects,
      reviewTasks,
      serverExportJobs,
      templates,
    ],
  );
  const editorCommandWorkflowAutomation = useMemo(
    () =>
      createEditorCommandWorkflowAutomationCenter({
        projects,
        projectAudits,
        projectHandoffPackets,
        auditLogs,
      }),
    [auditLogs, projectAudits, projectHandoffPackets, projects],
  );
  const largeWorkspacePerformanceIntelligence = useMemo(
    () =>
      createLargeWorkspacePerformanceIntelligenceCenter({
        projects,
        projectAudits,
        projectVersions,
        serverExportJobs,
        assetAudit,
      }),
    [assetAudit, projectAudits, projectVersions, projects, serverExportJobs],
  );
  const firstPartyExtensionRuntime = useMemo(
    () =>
      createFirstPartyExtensionRuntimeCenter({
        auditLogs,
      }),
    [auditLogs],
  );
  const compliancePrivacyCenter = useMemo(
    () =>
      createCompliancePrivacyCenter({
        profile: accountProfile,
        sessions: accountSessions,
        authEmails,
        projects,
        websitePublishes,
        websiteFormSubmissions,
        auditLogs,
      }),
    [
      accountProfile,
      accountSessions,
      auditLogs,
      authEmails,
      projects,
      websiteFormSubmissions,
      websitePublishes,
    ],
  );
  const projectRetentionCenter = useMemo(
    () =>
      createProjectRetentionCenter({
        projects,
        projectVersions,
        serverExportJobs,
        websitePublishes,
        reviewTasks,
        auditLogs,
      }),
    [
      auditLogs,
      projectVersions,
      projects,
      reviewTasks,
      serverExportJobs,
      websitePublishes,
    ],
  );
  const advancedAdminAutomationCenter = useMemo(
    () =>
      createAdvancedAdminAutomationCenter({
        policyAsCode: policyAsCodeGovernanceCenter,
        approvalAnalytics: enterpriseApprovalAnalyticsCenter,
        projectRetention: projectRetentionCenter,
        automationRunHistory: automationRunHistoryCenter,
        auditLogs,
      }),
    [
      auditLogs,
      automationRunHistoryCenter,
      enterpriseApprovalAnalyticsCenter,
      policyAsCodeGovernanceCenter,
      projectRetentionCenter,
    ],
  );
  const productionCommandRunnerCenter = useMemo(
    () =>
      createProductionCommandRunnerCenter({
        policyAsCode: policyAsCodeGovernanceCenter,
        publishExportReleaseGates: publishExportReleaseGateCenter,
        automationRunHistory: automationRunHistoryCenter,
        advancedAdminAutomation: advancedAdminAutomationCenter,
        workspaceBackupRestore: workspaceBackupRestoreCenter,
        marketplaceCreatorOperations,
        auditLogs,
      }),
    [
      advancedAdminAutomationCenter,
      auditLogs,
      automationRunHistoryCenter,
      marketplaceCreatorOperations,
      policyAsCodeGovernanceCenter,
      publishExportReleaseGateCenter,
      workspaceBackupRestoreCenter,
    ],
  );
  const enterpriseIncidentResponseCenter = useMemo(
    () =>
      createEnterpriseIncidentResponseCommandCenter({
        observability: observabilityReport,
        supportDesk: productionSupportDesk,
        releaseReadiness: releaseReadinessReport,
        adminAutomation: advancedAdminAutomationCenter,
        teamManagement,
        auditLogs,
      }),
    [
      advancedAdminAutomationCenter,
      auditLogs,
      observabilityReport,
      productionSupportDesk,
      releaseReadinessReport,
      teamManagement,
    ],
  );
  const workspaceIntelligenceBriefings = useMemo(
    () =>
      createWorkspaceIntelligenceBriefingCenter({
        workspaceName: productName,
        publishing: publishingChannelCenter,
        contentOperations: enterpriseContentOperationsCalendar,
        performance: largeWorkspacePerformanceIntelligence,
        releaseGovernance: designSystemReleaseGovernance,
        observability: observabilityReport,
        notificationRouting: notificationRoutingCenter,
        auditLogs,
      }),
    [
      auditLogs,
      designSystemReleaseGovernance,
      enterpriseContentOperationsCalendar,
      largeWorkspacePerformanceIntelligence,
      notificationRoutingCenter,
      observabilityReport,
      publishingChannelCenter,
    ],
  );
  const stakeholderReportingSubscriptions = useMemo(
    () =>
      createStakeholderReportingSubscriptionCenter({
        workspaceName: productName,
        reportDashboards: dataConnectedReportDashboardCenter,
        clientHandoffRooms: clientAnalyticsHandoffRooms,
        workspaceIntelligence: workspaceIntelligenceBriefings,
        notificationRouting: notificationRoutingCenter,
        teamManagement,
        auditLogs,
      }),
    [
      auditLogs,
      clientAnalyticsHandoffRooms,
      dataConnectedReportDashboardCenter,
      notificationRoutingCenter,
      teamManagement,
      workspaceIntelligenceBriefings,
    ],
  );
  const copy = getDashboardCopy(dashboardLocale);
  const navItems: Array<{ id: string; label: string; Icon: LucideIcon }> = [
    { id: "overview", label: copy.nav.overview, Icon: LayoutDashboard },
    { id: "projects", label: copy.nav.projects, Icon: FolderKanban },
    { id: "templates", label: copy.nav.templates, Icon: LibraryBig },
    { id: "planner", label: copy.nav.planner, Icon: CalendarClock },
    { id: "website", label: copy.nav.website, Icon: Globe2 },
    { id: "email", label: copy.nav.email, Icon: Mail },
    { id: "team", label: copy.nav.team, Icon: UsersRound },
    { id: "security", label: copy.nav.security, Icon: ShieldCheck },
  ];

  function updateDashboardLocale(value: string) {
    const locale = getEditorLocale(value);

    dashboardLocaleMemorySnapshot = locale;
    try {
      window.localStorage.setItem(dashboardLocaleStorageKey, locale);
    } catch {
      // Ignore storage failures; the selected locale still updates this session.
    } finally {
      window.dispatchEvent(new Event(dashboardLocaleChangedEvent));
    }
  }

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="grid min-h-dvh lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden border-r border-border bg-card/70 lg:block">
          <div className="flex h-full flex-col gap-6 p-4">
            <div>
              <Badge variant="secondary">{productName}</Badge>
              <h1 className="mt-3 text-xl font-semibold">
                {copy.dashboardTitle}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {copy.dashboardDescription}
              </p>
            </div>
            <nav className="grid gap-1 text-sm">
              {navItems.map(({ id, label, Icon }) => (
                <div
                  key={id}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-muted-foreground"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </div>
              ))}
            </nav>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="border-b border-border bg-card/70">
            <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
              <div>
                <p className="text-sm text-muted-foreground">{productName}</p>
                <h2 className="text-xl font-semibold">{copy.workspace}</h2>
              </div>
              <div className="flex items-center gap-3">
                <Select
                  value={dashboardLocale}
                  onValueChange={updateDashboardLocale}
                >
                  <SelectTrigger className="w-24" aria-label={copy.language}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {editorLocales.map((locale) => (
                      <SelectItem key={locale.id} value={locale.id}>
                        {locale.shortLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Badge variant="outline">{sessionEmail}</Badge>
                <SignOutButton />
              </div>
            </div>
          </header>

          <div className="space-y-6 px-5 py-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title={copy.metrics.activeDesigns}
                value={activeProjects.length}
                icon={FolderKanban}
              />
              <MetricCard
                title={copy.metrics.templates}
                value={templates.length}
                icon={LibraryBig}
              />
              <MetricCard
                title={copy.metrics.scheduled}
                value={plannedItems.length}
                icon={CalendarClock}
              />
              <MetricCard
                title={copy.metrics.unread}
                value={unreadNotifications.length}
                icon={MailCheck}
              />
            </div>

            <Tabs defaultValue="studio" className="space-y-6">
              <TabsList className="grid w-full grid-cols-6 lg:w-fit">
                <TabsTrigger value="studio">{copy.tabs.studio}</TabsTrigger>
                <TabsTrigger value="website">{copy.tabs.website}</TabsTrigger>
                <TabsTrigger value="email">{copy.tabs.email}</TabsTrigger>
                <TabsTrigger value="team">{copy.tabs.team}</TabsTrigger>
                <TabsTrigger value="security">{copy.tabs.security}</TabsTrigger>
                {adminData ? (
                  <TabsTrigger value="admin">{copy.tabs.admin}</TabsTrigger>
                ) : null}
              </TabsList>

              <TabsContent value="studio" className="space-y-6">
                <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
                  <CreateDesignPanel
                    copy={copy}
                    createDesignAction={createDesignAction}
                  />
                  <div className="space-y-6">
                    <AssetQuotaDashboard
                      audit={assetAudit}
                      deleteAssetAction={deleteAssetAction}
                      deleteDuplicateAssetsAction={deleteDuplicateAssetsAction}
                    />
                    <WorkspaceCommandCenterPanel
                      center={workspaceCommandCenter}
                    />
                    <WorkspaceIntelligenceBriefingsPanel
                      center={workspaceIntelligenceBriefings}
                    />
                    <WorkspacePortfolioPlanningPanel
                      center={workspacePortfolioPlanning}
                    />
                    <RuleBasedLayoutIntelligencePanel
                      center={ruleBasedLayoutIntelligence}
                    />
                    <ProfessionalTypographySystemPanel
                      center={professionalTypographySystem}
                    />
                    <EditorCommandWorkflowAutomationPanel
                      center={editorCommandWorkflowAutomation}
                    />
                    <LargeWorkspacePerformanceIntelligencePanel
                      center={largeWorkspacePerformanceIntelligence}
                    />
                    <FirstPartyExtensionRuntimePanel
                      center={firstPartyExtensionRuntime}
                      installExtensionAction={installExtensionAction}
                      removeExtensionAction={removeExtensionAction}
                    />
                    <ContentDatabasePanel center={contentDatabaseCenter} />
                    <RuleBasedCampaignGenerationPanel
                      center={ruleBasedCampaignGenerationCenter}
                    />
                    <ProductionDistributionAnalyticsPanel
                      center={productionDistributionAnalyticsCenter}
                    />
                    <SocialDistributionCommandCenterPanel
                      center={socialDistributionCommandCenter}
                    />
                    <DataConnectedReportDashboardsPanel
                      center={dataConnectedReportDashboardCenter}
                    />
                    <AssetLibraryOperationsPanel operations={assetOperations} />
                    <AdvancedBatchAssetOperationsPanel
                      center={advancedBatchAssetOperations}
                    />
                    <AssetProvenanceReviewPanel
                      center={assetProvenanceReview}
                    />
                    <AssetLifecycleGovernancePanel
                      center={assetLifecycleGovernance}
                    />
                    <CreativeAssetIntelligencePanel
                      center={creativeAssetIntelligence}
                    />
                    <ServerExportJobsPanel jobs={serverExportJobs} />
                    <DesktopOfflineSyncCenterPanel
                      center={desktopOfflineSyncCenter}
                    />
                    <DesktopSyncReconciliationPanel
                      center={desktopSyncReconciliationCenter}
                    />
                    <DesktopPackagingReadinessPanel
                      center={desktopPackagingReadinessCenter}
                    />
                    <DesktopAutoUpdateDeliveryPanel
                      center={desktopAutoUpdateDeliveryCenter}
                    />
                    <ProductionObservabilityPanel
                      report={observabilityReport}
                    />
                    <ReleaseReadinessGatesPanel
                      report={releaseReadinessReport}
                    />
                    <PublishExportReleaseGatesPanel
                      center={publishExportReleaseGateCenter}
                      requestOverrideAction={requestReleaseOverrideAction}
                    />
                    <ProductionCommandRunnerPanel
                      center={productionCommandRunnerCenter}
                    />
                    <ProductionSupportDeskPanel desk={productionSupportDesk} />
                    <EnterpriseIncidentResponseCommandCenterPanel
                      center={enterpriseIncidentResponseCenter}
                    />
                    <MixedFormatOrchestrationPanel
                      orchestration={mixedFormatOrchestration}
                    />
                    <WorkspaceIntegrationSurfacePanel
                      surface={workspaceIntegrationSurface}
                    />
                    <DesignSystemIntelligencePanel
                      center={designSystemIntelligence}
                    />
                    <DesignSystemReleaseGovernancePanel
                      center={designSystemReleaseGovernance}
                    />
                    <ReusableComponentSectionLibraryPanel
                      center={reusableComponentSectionLibrary}
                    />
                    <ImportRepairOperationsPanel
                      center={importRepairOperations}
                    />
                    <ExportCertificationWorkspacesPanel
                      center={exportCertificationCenter}
                    />
                    <VendorProductionHandoffPanel
                      center={vendorProductionHandoffCenter}
                    />
                    <MediaBrandDeliveryKitsPanel
                      center={mediaBrandDeliveryKitCenter}
                    />
                    <ProjectCoachingModePanel
                      center={projectCoachingModeCenter}
                    />
                    <MarketplaceCreatorOperationsPanel
                      center={marketplaceCreatorOperations}
                    />
                    <WorkspacePackageOperationsPanel
                      operations={workspacePackageOperations}
                    />
                    <WorkspaceBackupRestorePanel
                      center={workspaceBackupRestoreCenter}
                    />
                    <TemplatePackageRegistryPanel
                      registry={templatePackageRegistry}
                    />
                    <TemplateDesignReleaseChannelsPanel
                      center={templateDesignReleaseChannels}
                    />
                    <TemplateInstancePropagationPanel
                      center={templateInstancePropagationCenter}
                    />
                    <ProjectDependencyGraphPanel
                      graph={projectDependencyGraph}
                    />
                    <FirstPartyTemplateLibraryExpansionPanel
                      expansion={firstPartyTemplateLibraryExpansion}
                    />
                    <TemplateMarketplaceIntelligencePanel
                      intelligence={marketplaceIntelligence}
                    />
                    <TemplateQualityQaCenterPanel
                      center={templateQualityQaCenter}
                    />
                    <AccessibilityLocalizationFinishPanel
                      center={accessibilityLocalizationFinish}
                    />
                    <ProjectHandoffPacketPanel
                      packets={projectHandoffPackets}
                    />
                    <ProjectAuditCenterPanel audits={projectAudits} />
                    <ReviewTasksPanel
                      tasks={reviewTasks}
                      updateTaskStatusAction={updateReviewTaskStatusAction}
                    />
                    <CampaignLaunchRoomsPanel
                      center={campaignLaunchRoomCenter}
                    />
                    <CampaignBoardPanel
                      campaigns={campaignBoards}
                      projects={projects}
                      brandColors={brandColors}
                      brandFonts={brandFonts}
                      brandLogos={brandLogos}
                      bulkScheduleCampaignAction={
                        bulkScheduleCampaignDeliverablesAction
                      }
                      createCampaignAction={createCampaignBoardAction}
                      createCampaignDerivativesAction={
                        createCampaignDerivativesAction
                      }
                      updateApprovalStatusAction={updateApprovalStatusAction}
                    />
                    <TemplateGallery
                      locale={dashboardLocale}
                      templates={templates}
                      createFromCatalogTemplateAction={
                        createDesignFromCatalogTemplateAction
                      }
                      createFromTemplateAction={createDesignFromTemplateAction}
                      updateApprovalStatusAction={updateApprovalStatusAction}
                    />
                    <ProjectLibrary
                      locale={dashboardLocale}
                      projects={projects}
                      folders={folders}
                      duplicateAsSizeAction={duplicateDesignAsSizeAction}
                      updateApprovalStatusAction={updateApprovalStatusAction}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="website" className="space-y-6">
                <section className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card p-4">
                    <div>
                      <p className="text-sm font-medium">
                        {copy.productionWebsite}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {websiteUrl}
                      </p>
                    </div>
                    <Button asChild variant="outline">
                      <a href={websiteUrl} target="_blank" rel="noreferrer">
                        {copy.open}
                      </a>
                    </Button>
                  </div>
                  <PublishingChannelCenterPanel
                    center={publishingChannelCenter}
                  />
                  <WebsiteEmailRenderingQaPanel
                    center={websiteEmailRenderingQaCenter}
                  />
                  <WebsitePublisherPanel
                    locale={dashboardLocale}
                    appUrl={websiteUrl}
                    projects={projects}
                    publishes={websitePublishes}
                    submissions={websiteFormSubmissions}
                    publishAction={publishWebsiteAction}
                    unpublishAction={unpublishWebsiteAction}
                    createLinkInBioAction={createLinkInBioWebsiteAction}
                    addDomainAction={addWebsiteDomainAction}
                    attachDomainAction={attachWebsiteDomainAction}
                    refreshDomainAction={refreshWebsiteDomainPlatformAction}
                    verifyDomainAction={verifyWebsiteDomainAction}
                    deleteDomainAction={deleteWebsiteDomainAction}
                  />
                  <ProductionCapacityForecastingPanel
                    center={productionCapacityForecasting}
                  />
                  <EnterpriseContentOperationsCalendarPanel
                    center={enterpriseContentOperationsCalendar}
                  />
                  <ContentPlannerPanel
                    locale={dashboardLocale}
                    projects={projects}
                    items={contentScheduleItems}
                    createAction={createContentScheduleAction}
                    rescheduleAction={rescheduleContentScheduleAction}
                    updateStatusAction={updateContentScheduleStatusAction}
                    deleteAction={deleteContentScheduleAction}
                  />
                  <AutomationRecipesPanel
                    recipes={automationRecipes}
                    applyRecipeAction={applyAutomationRecipeAction}
                  />
                  <AutomationRunHistoryPanel
                    center={automationRunHistoryCenter}
                    applyRecipeAction={applyAutomationRecipeAction}
                  />
                  <StockLibraryPanel locale={dashboardLocale} />
                </section>
              </TabsContent>

              <TabsContent value="email" className="space-y-6">
                <WebsiteEmailRenderingQaPanel
                  center={websiteEmailRenderingQaCenter}
                />
                <EmailBuilderPanel
                  locale={dashboardLocale}
                  sessionEmail={sessionEmail}
                  projects={projects}
                  sendTestEmailAction={sendTestEmailAction}
                />
              </TabsContent>

              <TabsContent value="team" className="space-y-6">
                <MultiWorkspaceFederationPanel
                  center={multiWorkspaceFederationCenter}
                />
                <MultiBrandWorkspacePanel center={multiBrandWorkspace} />
                <ClientPortalRoomsPanel center={clientPortalCenter} />
                <ClientAnalyticsHandoffRoomsPanel
                  center={clientAnalyticsHandoffRooms}
                />
                <StakeholderReportingSubscriptionsPanel
                  center={stakeholderReportingSubscriptions}
                />
                <ReviewerCollaborationCenterPanel
                  center={reviewerCollaborationCenter}
                />
                <CollaborativeProofingCompareRoomsPanel
                  center={collaborativeProofingCompareRooms}
                />
                <LiveCollaborationSessionReconciliationPanel
                  center={liveCollaborationSessionReconciliationCenter}
                />
                <ProductionCollaborationRoomsPanel
                  center={productionCollaborationRoomCenter}
                />
                <EnterpriseApprovalWorkflowsPanel
                  center={enterpriseApprovalWorkflowCenter}
                />
                <EnterpriseApprovalAnalyticsPanel
                  center={enterpriseApprovalAnalyticsCenter}
                />
                <BrandComplianceApprovalsPanel
                  center={brandComplianceApprovalCenter}
                />
                <DesignGovernancePanel report={governanceReport} />
                <PolicyAsCodeGovernancePanel
                  center={policyAsCodeGovernanceCenter}
                />
                <AdvancedAdminAutomationRecipesPanel
                  center={advancedAdminAutomationCenter}
                />
                <NoCodeAutomationBuilderPanel
                  center={noCodeAutomationBuilderCenter}
                />
                <WorkflowTemplateMarketplacePanel
                  center={workflowTemplateMarketplace}
                  installWorkflowTemplateAction={installWorkflowTemplateAction}
                />
                <WorkspaceRolePolicySimulatorPanel
                  simulator={workspaceRolePolicySimulator}
                />
                <OrganizationUsageGovernancePanel
                  center={organizationUsageGovernance}
                />
                <NotificationPreferenceRoutingPanel
                  center={notificationRoutingCenter}
                />
                <TeamWorkspacePanel
                  locale={dashboardLocale}
                  workspaces={workspaces}
                  workspaceManagement={teamManagement}
                  pendingInvites={pendingInvites}
                  createWorkspaceAction={createTeamWorkspaceAction}
                  inviteMemberAction={inviteTeamMemberAction}
                  acceptInviteAction={acceptTeamInviteAction}
                  revokeInviteAction={revokeTeamInviteAction}
                  updateMemberRoleAction={updateTeamMemberRoleAction}
                  transferOwnershipAction={transferTeamOwnershipAction}
                />
                <NotificationsPanel
                  locale={dashboardLocale}
                  notifications={notifications}
                  markReadAction={markNotificationReadAction}
                  markAllReadAction={markAllNotificationsReadAction}
                />
                <WorkspaceAuditLogPanel logs={auditLogs} />
              </TabsContent>

              <TabsContent value="security" className="space-y-6">
                <EnterpriseSsoScimReadinessPanel
                  center={enterpriseSsoScimReadinessCenter}
                />
                <EnterpriseSsoScimEnforcementPanel
                  center={enterpriseSsoScimEnforcementCenter}
                />
                <DataResidencyExportControlsPanel
                  center={dataResidencyExportControlsCenter}
                />
                <CompliancePrivacyCenterPanel
                  center={compliancePrivacyCenter}
                />
                <ProjectRetentionCenterPanel center={projectRetentionCenter} />
                <AccountSettingsPanel
                  locale={dashboardLocale}
                  profile={accountProfile}
                  sessions={accountSessions}
                  twoFactor={twoFactor}
                  authEmails={authEmails}
                  updateProfileAction={updateAccountProfileAction}
                  sendVerificationEmailAction={sendVerificationEmailAction}
                  revokeSessionAction={revokeSessionAction}
                  deleteAccountAction={deleteAccountAction}
                  enableTwoFactorAction={enableTwoFactorAction}
                  disableTwoFactorAction={disableTwoFactorAction}
                />
              </TabsContent>

              {adminData && adminOperationsCenter ? (
                <TabsContent value="admin" className="space-y-6">
                  <AdminOperationsCenterPanel
                    center={adminOperationsCenter}
                    deleteDuplicateAssetsAction={deleteDuplicateAssetsAction}
                    verifyDomainAction={verifyWebsiteDomainAction}
                    attachDomainAction={attachWebsiteDomainAction}
                    refreshDomainAction={refreshWebsiteDomainPlatformAction}
                  />
                  <AdminDashboardPanel
                    locale={dashboardLocale}
                    data={adminData}
                    updateTemplateMarketplaceAction={
                      updateTemplateMarketplaceAction
                    }
                  />
                </TabsContent>
              ) : null}
            </Tabs>
          </div>
        </section>
      </div>
    </main>
  );
}

function subscribeToDashboardLocale(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  function handleStorage(event: StorageEvent) {
    if (event.key === dashboardLocaleStorageKey) onStoreChange();
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(dashboardLocaleChangedEvent, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(dashboardLocaleChangedEvent, onStoreChange);
  };
}

function getDashboardLocaleSnapshot(): EditorLocale {
  if (typeof window === "undefined") return "en";

  try {
    dashboardLocaleMemorySnapshot = getEditorLocale(
      window.localStorage.getItem(dashboardLocaleStorageKey),
    );
    return dashboardLocaleMemorySnapshot;
  } catch {
    return dashboardLocaleMemorySnapshot;
  }
}

function getDashboardLocaleServerSnapshot(): EditorLocale {
  return "en";
}

function MetricCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: LucideIcon;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function CreateDesignPanel({
  copy,
  createDesignAction,
}: {
  copy: DashboardCopy;
  createDesignAction: ServerAction;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          {copy.newDesign}
        </CardTitle>
        <CardDescription>{copy.newDesignDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <CreateDesignForms
          copy={copy}
          createDesignAction={createDesignAction}
        />
      </CardContent>
    </Card>
  );
}

function CreateDesignForms({
  copy,
  createDesignAction,
}: {
  copy: DashboardCopy;
  createDesignAction: ServerAction;
}) {
  return (
    <>
      {designPresets.map((preset) => (
        <form
          action={createDesignAction}
          className="rounded-md border border-border p-3"
          key={preset.id}
        >
          <input type="hidden" name="preset" value={preset.id} />
          <Label htmlFor={`${preset.id}-name`}>
            {copy.presets[preset.id].name}
          </Label>
          <p className="mt-1 text-xs text-muted-foreground">
            {copy.presets[preset.id].description} {preset.width} x{" "}
            {preset.height}
          </p>
          <div className="mt-3 flex gap-2">
            <Input
              id={`${preset.id}-name`}
              name="name"
              placeholder={copy.presetDesignPlaceholder(
                copy.presets[preset.id].name,
              )}
            />
            <Button type="submit" size="icon" aria-label={copy.createDesign}>
              <Sparkles className="h-4 w-4" />
            </Button>
          </div>
        </form>
      ))}
      <form
        action={createDesignAction}
        className="rounded-md border border-dashed border-border p-3"
      >
        <input type="hidden" name="preset" value="custom" />
        <Label htmlFor="custom-design-name">{copy.customSize}</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          {copy.customSizeDescription(
            customDesignDimensionLimits.min,
            customDesignDimensionLimits.max,
          )}
        </p>
        <div className="mt-3 grid gap-2">
          <Input
            id="custom-design-name"
            name="name"
            placeholder={copy.customDesign}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              name="width"
              type="number"
              min={customDesignDimensionLimits.min}
              max={customDesignDimensionLimits.max}
              defaultValue={1200}
              aria-label={copy.customWidth}
            />
            <Input
              name="height"
              type="number"
              min={customDesignDimensionLimits.min}
              max={customDesignDimensionLimits.max}
              defaultValue={800}
              aria-label={copy.customHeight}
            />
          </div>
          <Button type="submit">
            <Sparkles className="h-4 w-4" />
            {copy.createCustomDesign}
          </Button>
        </div>
      </form>
    </>
  );
}
