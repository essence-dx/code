"use server";

import {
  deleteAccountAction as deleteAccountActionImpl,
  revokeSessionAction as revokeSessionActionImpl,
  updateAccountProfileAction as updateAccountProfileActionImpl,
} from "./actions/account";
import {
  deleteAssetAction as deleteAssetActionImpl,
  deleteDuplicateAssetsAction as deleteDuplicateAssetsActionImpl,
} from "./actions/assets";
import { applyAutomationRecipeAction as applyAutomationRecipeActionImpl } from "./actions/automation";
import {
  bulkScheduleCampaignDeliverablesAction as bulkScheduleCampaignDeliverablesActionImpl,
  createCampaignBoardAction as createCampaignBoardActionImpl,
  createCampaignDerivativesAction as createCampaignDerivativesActionImpl,
} from "./actions/campaigns";
import { sendTestEmailAction as sendTestEmailActionImpl } from "./actions/email";
import {
  installFirstPartyExtensionAction as installFirstPartyExtensionActionImpl,
  removeFirstPartyExtensionAction as removeFirstPartyExtensionActionImpl,
} from "./actions/extensions";
import {
  markAllNotificationsReadAction as markAllNotificationsReadActionImpl,
  markNotificationReadAction as markNotificationReadActionImpl,
} from "./actions/notifications";
import {
  createContentScheduleAction as createContentScheduleActionImpl,
  deleteContentScheduleAction as deleteContentScheduleActionImpl,
  rescheduleContentScheduleAction as rescheduleContentScheduleActionImpl,
  updateContentScheduleStatusAction as updateContentScheduleStatusActionImpl,
} from "./actions/planner";
import {
  createDesignAction as createDesignActionImpl,
  createDesignFromCatalogTemplateAction as createDesignFromCatalogTemplateActionImpl,
  createDesignFromTemplateAction as createDesignFromTemplateActionImpl,
  createFolderAction as createFolderActionImpl,
  deleteDesignAction as deleteDesignActionImpl,
  duplicateDesignAsSizeAction as duplicateDesignAsSizeActionImpl,
  moveDesignToFolderAction as moveDesignToFolderActionImpl,
  permanentlyDeleteDesignAction as permanentlyDeleteDesignActionImpl,
  refreshVariantSourceMetadataAction as refreshVariantSourceMetadataActionImpl,
  renameDesignAction as renameDesignActionImpl,
  restoreDesignAction as restoreDesignActionImpl,
  setProjectLegalHoldAction as setProjectLegalHoldActionImpl,
  toggleStarDesignAction as toggleStarDesignActionImpl,
} from "./actions/project";
import { requestReleaseOverrideAction as requestReleaseOverrideActionImpl } from "./actions/release-overrides";
import {
  updateApprovalStatusAction as updateApprovalStatusActionImpl,
  updateReviewTaskStatusAction as updateReviewTaskStatusActionImpl,
} from "./actions/review";
import {
  disableTwoFactorAction as disableTwoFactorActionImpl,
  enableTwoFactorAction as enableTwoFactorActionImpl,
  sendVerificationEmailAction as sendVerificationEmailActionImpl,
} from "./actions/security";
import {
  acceptTeamInviteAction as acceptTeamInviteActionImpl,
  createTeamWorkspaceAction as createTeamWorkspaceActionImpl,
  inviteTeamMemberAction as inviteTeamMemberActionImpl,
  revokeTeamInviteAction as revokeTeamInviteActionImpl,
  transferTeamOwnershipAction as transferTeamOwnershipActionImpl,
  updateTeamMemberRoleAction as updateTeamMemberRoleActionImpl,
} from "./actions/team";
import { updateTemplateMarketplaceAction as updateTemplateMarketplaceActionImpl } from "./actions/templates";
import {
  addWebsiteDomainAction as addWebsiteDomainActionImpl,
  attachWebsiteDomainAction as attachWebsiteDomainActionImpl,
  createLinkInBioWebsiteAction as createLinkInBioWebsiteActionImpl,
  deleteWebsiteDomainAction as deleteWebsiteDomainActionImpl,
  publishWebsiteAction as publishWebsiteActionImpl,
  refreshWebsiteDomainPlatformAction as refreshWebsiteDomainPlatformActionImpl,
  unpublishWebsiteAction as unpublishWebsiteActionImpl,
  verifyWebsiteDomainAction as verifyWebsiteDomainActionImpl,
} from "./actions/website";
import { installWorkflowTemplateAction as installWorkflowTemplateActionImpl } from "./actions/workflow-templates";

export async function createFolderAction(formData: FormData) {
  return createFolderActionImpl(formData);
}

export async function createDesignAction(formData: FormData) {
  return createDesignActionImpl(formData);
}

export async function createDesignFromCatalogTemplateAction(
  formData: FormData,
) {
  return createDesignFromCatalogTemplateActionImpl(formData);
}

export async function createDesignFromTemplateAction(formData: FormData) {
  return createDesignFromTemplateActionImpl(formData);
}

export async function deleteDesignAction(formData: FormData) {
  return deleteDesignActionImpl(formData);
}

export async function duplicateDesignAsSizeAction(formData: FormData) {
  return duplicateDesignAsSizeActionImpl(formData);
}

export async function moveDesignToFolderAction(formData: FormData) {
  return moveDesignToFolderActionImpl(formData);
}

export async function permanentlyDeleteDesignAction(formData: FormData) {
  return permanentlyDeleteDesignActionImpl(formData);
}

export async function refreshVariantSourceMetadataAction(formData: FormData) {
  return refreshVariantSourceMetadataActionImpl(formData);
}

export async function renameDesignAction(formData: FormData) {
  return renameDesignActionImpl(formData);
}

export async function restoreDesignAction(formData: FormData) {
  return restoreDesignActionImpl(formData);
}

export async function setProjectLegalHoldAction(formData: FormData) {
  return setProjectLegalHoldActionImpl(formData);
}

export async function toggleStarDesignAction(formData: FormData) {
  return toggleStarDesignActionImpl(formData);
}

export async function acceptTeamInviteAction(formData: FormData) {
  return acceptTeamInviteActionImpl(formData);
}

export async function createTeamWorkspaceAction(formData: FormData) {
  return createTeamWorkspaceActionImpl(formData);
}

export async function inviteTeamMemberAction(formData: FormData) {
  return inviteTeamMemberActionImpl(formData);
}

export async function revokeTeamInviteAction(formData: FormData) {
  return revokeTeamInviteActionImpl(formData);
}

export async function transferTeamOwnershipAction(formData: FormData) {
  return transferTeamOwnershipActionImpl(formData);
}

export async function updateTeamMemberRoleAction(formData: FormData) {
  return updateTeamMemberRoleActionImpl(formData);
}

export async function markAllNotificationsReadAction() {
  return markAllNotificationsReadActionImpl();
}

export async function markNotificationReadAction(formData: FormData) {
  return markNotificationReadActionImpl(formData);
}

export async function updateApprovalStatusAction(formData: FormData) {
  return updateApprovalStatusActionImpl(formData);
}

export async function updateReviewTaskStatusAction(formData: FormData) {
  return updateReviewTaskStatusActionImpl(formData);
}

export async function requestReleaseOverrideAction(formData: FormData) {
  return requestReleaseOverrideActionImpl(formData);
}

export async function deleteAccountAction(formData: FormData) {
  return deleteAccountActionImpl(formData);
}

export async function revokeSessionAction(formData: FormData) {
  return revokeSessionActionImpl(formData);
}

export async function updateAccountProfileAction(formData: FormData) {
  return updateAccountProfileActionImpl(formData);
}

export async function disableTwoFactorAction(formData: FormData) {
  return disableTwoFactorActionImpl(formData);
}

export async function enableTwoFactorAction(formData: FormData) {
  return enableTwoFactorActionImpl(formData);
}

export async function sendVerificationEmailAction() {
  return sendVerificationEmailActionImpl();
}

export async function bulkScheduleCampaignDeliverablesAction(
  formData: FormData,
) {
  return bulkScheduleCampaignDeliverablesActionImpl(formData);
}

export async function createCampaignBoardAction(formData: FormData) {
  return createCampaignBoardActionImpl(formData);
}

export async function createCampaignDerivativesAction(formData: FormData) {
  return createCampaignDerivativesActionImpl(formData);
}

export async function createContentScheduleAction(formData: FormData) {
  return createContentScheduleActionImpl(formData);
}

export async function deleteContentScheduleAction(formData: FormData) {
  return deleteContentScheduleActionImpl(formData);
}

export async function rescheduleContentScheduleAction(formData: FormData) {
  return rescheduleContentScheduleActionImpl(formData);
}

export async function updateContentScheduleStatusAction(formData: FormData) {
  return updateContentScheduleStatusActionImpl(formData);
}

export async function applyAutomationRecipeAction(formData: FormData) {
  return applyAutomationRecipeActionImpl(formData);
}

export async function addWebsiteDomainAction(formData: FormData) {
  return addWebsiteDomainActionImpl(formData);
}

export async function attachWebsiteDomainAction(formData: FormData) {
  return attachWebsiteDomainActionImpl(formData);
}

export async function createLinkInBioWebsiteAction(formData: FormData) {
  return createLinkInBioWebsiteActionImpl(formData);
}

export async function deleteWebsiteDomainAction(formData: FormData) {
  return deleteWebsiteDomainActionImpl(formData);
}

export async function publishWebsiteAction(formData: FormData) {
  return publishWebsiteActionImpl(formData);
}

export async function refreshWebsiteDomainPlatformAction(formData: FormData) {
  return refreshWebsiteDomainPlatformActionImpl(formData);
}

export async function unpublishWebsiteAction(formData: FormData) {
  return unpublishWebsiteActionImpl(formData);
}

export async function verifyWebsiteDomainAction(formData: FormData) {
  return verifyWebsiteDomainActionImpl(formData);
}

export async function sendTestEmailAction(formData: FormData) {
  return sendTestEmailActionImpl(formData);
}

export async function deleteAssetAction(formData: FormData) {
  return deleteAssetActionImpl(formData);
}

export async function deleteDuplicateAssetsAction(formData: FormData) {
  return deleteDuplicateAssetsActionImpl(formData);
}

export async function updateTemplateMarketplaceAction(formData: FormData) {
  return updateTemplateMarketplaceActionImpl(formData);
}

export async function installFirstPartyExtensionAction(formData: FormData) {
  return installFirstPartyExtensionActionImpl(formData);
}

export async function removeFirstPartyExtensionAction(formData: FormData) {
  return removeFirstPartyExtensionActionImpl(formData);
}

export async function installWorkflowTemplateAction(formData: FormData) {
  return installWorkflowTemplateActionImpl(formData);
}
