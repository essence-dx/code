import { redirect } from "next/navigation";

import { listAccessibilityLocalizationFinishCenter } from "@/db/accessibility-localization-finish";
import {
  acceptTeamInviteAction,
  addWebsiteDomainAction,
  applyAutomationRecipeAction,
  attachWebsiteDomainAction,
  bulkScheduleCampaignDeliverablesAction,
  createCampaignBoardAction,
  createCampaignDerivativesAction,
  createLinkInBioWebsiteAction,
  createContentScheduleAction,
  createDesignAction,
  createDesignFromCatalogTemplateAction,
  createDesignFromTemplateAction,
  createTeamWorkspaceAction,
  deleteAssetAction,
  deleteAccountAction,
  deleteContentScheduleAction,
  deleteDuplicateAssetsAction,
  deleteWebsiteDomainAction,
  duplicateDesignAsSizeAction,
  disableTwoFactorAction,
  enableTwoFactorAction,
  inviteTeamMemberAction,
  installFirstPartyExtensionAction,
  installWorkflowTemplateAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  publishWebsiteAction,
  requestReleaseOverrideAction,
  refreshWebsiteDomainPlatformAction,
  rescheduleContentScheduleAction,
  revokeTeamInviteAction,
  removeFirstPartyExtensionAction,
  revokeSessionAction,
  sendVerificationEmailAction,
  sendTestEmailAction,
  transferTeamOwnershipAction,
  unpublishWebsiteAction,
  updateApprovalStatusAction,
  updateContentScheduleStatusAction,
  updateTeamMemberRoleAction,
  updateReviewTaskStatusAction,
  updateAccountProfileAction,
  updateTemplateMarketplaceAction,
  verifyWebsiteDomainAction,
} from "@/app/designs/actions";
import { getAdminDashboardData, isAdminEmail } from "@/db/admin-dashboard";
import { getAccountProfile, listAccountSessions } from "@/db/account-settings";
import { getUserAssetLibraryAudit } from "@/db/assets";
import { listAccountAuthEmails } from "@/db/auth-emails";
import { listBrandColors } from "@/db/brand-colors";
import { listBrandFonts } from "@/db/brand-fonts";
import { listBrandLogos } from "@/db/brand-logos";
import { listCampaignBoards } from "@/db/campaigns";
import { listContentScheduleItems } from "@/db/content-planner";
import { listMediaBrandDeliveryKitProjects } from "@/db/media-brand-delivery-kits";
import { listMixedFormatProjectOrchestration } from "@/db/mixed-format-projects";
import { listProfessionalTypographySystemCenter } from "@/db/professional-typography-system";
import { listRuleBasedLayoutIntelligenceCenter } from "@/db/rule-based-layout-intelligence";
import { listUserNotifications } from "@/db/notifications";
import { listProjectCommentTasks } from "@/db/project-comments";
import { listWorkspaceProjectPresence } from "@/db/project-presence";
import { listProjectAuditSummaries } from "@/db/project-audit-center";
import { listProjectFolders } from "@/db/project-folders";
import { listProjectHandoffPackets } from "@/db/project-handoff-packets";
import { listWorkspaceProjectVersions } from "@/db/project-versions";
import { listProjects } from "@/db/projects";
import { listServerExportJobs } from "@/db/server-export-jobs";
import { listDesignTemplates } from "@/db/design-templates";
import { listTeamWorkspaceManagement } from "@/db/team-workspace-management";
import {
  listPendingWorkspaceInvites,
  listTeamWorkspaces,
} from "@/db/team-workspaces";
import { getTwoFactorProfile } from "@/db/two-factor";
import {
  listWebsiteFormSubmissions,
  listWebsitePublishes,
} from "@/db/website-publishing";
import { listWorkspaceAuditLogs } from "@/db/workspace-audit-logs";
import { StudioDashboard } from "@/features/dashboard/studio-dashboard";
import { createAutomationRecipeSummaries } from "@/features/automation/automation-recipes";
import { createMediaBrandDeliveryKitCenter } from "@/features/media-delivery/media-brand-delivery-kits";
import {
  createNotificationPreferenceRoutingCenter,
  createWorkspaceNotificationChannelStatuses,
} from "@/features/notifications/notification-preference-routing";
import { getServerSession } from "@/lib/auth-session";
import { requireTwoFactorVerified } from "@/lib/two-factor-session";

export default async function DesignsPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  if (!session.user.emailVerified) {
    redirect(`/verify-email?email=${encodeURIComponent(session.user.email)}`);
  }

  await requireTwoFactorVerified(session.user.id, "/designs");

  const [
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
    mediaBrandDeliveryKitProjects,
    mixedFormatOrchestration,
    ruleBasedLayoutIntelligence,
    professionalTypographySystem,
    accessibilityLocalizationFinish,
    twoFactor,
    adminData,
  ] = await Promise.all([
    listProjects(session.user.id),
    listProjectFolders(session.user.id),
    listDesignTemplates(session.user.id),
    listTeamWorkspaces(session.user.id),
    listTeamWorkspaceManagement(session.user.id),
    listPendingWorkspaceInvites(session.user.email),
    listUserNotifications(session.user.id),
    getAccountProfile(session.user.id),
    listAccountSessions(session.user.id),
    listAccountAuthEmails({ userId: session.user.id }),
    listBrandColors(session.user.id),
    listBrandFonts(session.user.id),
    listBrandLogos(session.user.id),
    getUserAssetLibraryAudit(session.user.id),
    listServerExportJobs(session.user.id),
    listProjectCommentTasks(session.user.id),
    listWorkspaceProjectPresence(session.user.id),
    listCampaignBoards(session.user.id),
    listContentScheduleItems(session.user.id),
    listWebsitePublishes(session.user.id),
    listWebsiteFormSubmissions(session.user.id),
    listWorkspaceAuditLogs(session.user.id),
    listProjectAuditSummaries(session.user.id),
    listProjectHandoffPackets(session.user.id),
    listWorkspaceProjectVersions(session.user.id),
    listMediaBrandDeliveryKitProjects(session.user.id),
    listMixedFormatProjectOrchestration(session.user.id),
    listRuleBasedLayoutIntelligenceCenter(session.user.id),
    listProfessionalTypographySystemCenter(session.user.id),
    listAccessibilityLocalizationFinishCenter(session.user.id),
    getTwoFactorProfile({
      userId: session.user.id,
      accountName: session.user.email,
    }),
    isAdminEmail(session.user.email)
      ? getAdminDashboardData()
      : Promise.resolve(null),
  ]);

  if (!accountProfile) {
    redirect("/");
  }

  const automationRecipes = createAutomationRecipeSummaries({
    projects,
    campaigns: campaignBoards,
    reviewTasks,
    contentScheduleItems,
    serverExportJobs,
  });
  const notificationRoutingCenter = createNotificationPreferenceRoutingCenter({
    notifications,
    channels: createWorkspaceNotificationChannelStatuses(),
    now: new Date().toISOString(),
  });
  const mediaBrandDeliveryKitCenter = createMediaBrandDeliveryKitCenter({
    projects: mediaBrandDeliveryKitProjects,
    brandColors,
    brandFonts,
    brandLogos,
    serverExportJobs,
    projectHandoffPackets,
    now: new Date().toISOString(),
  });

  return (
    <StudioDashboard
      sessionEmail={session.user.email}
      projects={projects}
      folders={folders}
      templates={templates}
      workspaces={workspaces}
      teamManagement={teamManagement}
      pendingInvites={pendingInvites}
      notifications={notifications}
      accountProfile={accountProfile}
      accountSessions={accountSessions}
      authEmails={authEmails}
      brandColors={brandColors}
      brandFonts={brandFonts}
      brandLogos={brandLogos}
      assetAudit={assetAudit}
      serverExportJobs={serverExportJobs}
      reviewTasks={reviewTasks}
      workspacePresence={workspacePresence}
      campaignBoards={campaignBoards}
      contentScheduleItems={contentScheduleItems}
      websitePublishes={websitePublishes}
      websiteFormSubmissions={websiteFormSubmissions}
      auditLogs={auditLogs}
      projectAudits={projectAudits}
      projectHandoffPackets={projectHandoffPackets}
      projectVersions={projectVersions}
      mediaBrandDeliveryKitCenter={mediaBrandDeliveryKitCenter}
      mixedFormatOrchestration={mixedFormatOrchestration}
      ruleBasedLayoutIntelligence={ruleBasedLayoutIntelligence}
      professionalTypographySystem={professionalTypographySystem}
      accessibilityLocalizationFinish={accessibilityLocalizationFinish}
      automationRecipes={automationRecipes}
      notificationRoutingCenter={notificationRoutingCenter}
      twoFactor={twoFactor}
      adminData={adminData}
      createDesignAction={createDesignAction}
      bulkScheduleCampaignDeliverablesAction={
        bulkScheduleCampaignDeliverablesAction
      }
      createCampaignBoardAction={createCampaignBoardAction}
      createCampaignDerivativesAction={createCampaignDerivativesAction}
      updateApprovalStatusAction={updateApprovalStatusAction}
      requestReleaseOverrideAction={requestReleaseOverrideAction}
      updateReviewTaskStatusAction={updateReviewTaskStatusAction}
      createDesignFromCatalogTemplateAction={
        createDesignFromCatalogTemplateAction
      }
      createDesignFromTemplateAction={createDesignFromTemplateAction}
      duplicateDesignAsSizeAction={duplicateDesignAsSizeAction}
      createContentScheduleAction={createContentScheduleAction}
      applyAutomationRecipeAction={applyAutomationRecipeAction}
      rescheduleContentScheduleAction={rescheduleContentScheduleAction}
      updateContentScheduleStatusAction={updateContentScheduleStatusAction}
      deleteContentScheduleAction={deleteContentScheduleAction}
      publishWebsiteAction={publishWebsiteAction}
      unpublishWebsiteAction={unpublishWebsiteAction}
      createLinkInBioWebsiteAction={createLinkInBioWebsiteAction}
      addWebsiteDomainAction={addWebsiteDomainAction}
      attachWebsiteDomainAction={attachWebsiteDomainAction}
      refreshWebsiteDomainPlatformAction={refreshWebsiteDomainPlatformAction}
      verifyWebsiteDomainAction={verifyWebsiteDomainAction}
      deleteWebsiteDomainAction={deleteWebsiteDomainAction}
      sendTestEmailAction={sendTestEmailAction}
      createTeamWorkspaceAction={createTeamWorkspaceAction}
      inviteTeamMemberAction={inviteTeamMemberAction}
      acceptTeamInviteAction={acceptTeamInviteAction}
      revokeTeamInviteAction={revokeTeamInviteAction}
      updateTeamMemberRoleAction={updateTeamMemberRoleAction}
      transferTeamOwnershipAction={transferTeamOwnershipAction}
      markNotificationReadAction={markNotificationReadAction}
      markAllNotificationsReadAction={markAllNotificationsReadAction}
      updateAccountProfileAction={updateAccountProfileAction}
      updateTemplateMarketplaceAction={updateTemplateMarketplaceAction}
      sendVerificationEmailAction={sendVerificationEmailAction}
      revokeSessionAction={revokeSessionAction}
      deleteAccountAction={deleteAccountAction}
      enableTwoFactorAction={enableTwoFactorAction}
      disableTwoFactorAction={disableTwoFactorAction}
      deleteAssetAction={deleteAssetAction}
      deleteDuplicateAssetsAction={deleteDuplicateAssetsAction}
      installExtensionAction={installFirstPartyExtensionAction}
      removeExtensionAction={removeFirstPartyExtensionAction}
      installWorkflowTemplateAction={installWorkflowTemplateAction}
    />
  );
}
