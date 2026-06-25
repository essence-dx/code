import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { and, desc, eq, inArray } from "drizzle-orm";
import packageJson from "../../../package.json";
import { Box, Code2, FolderOpen, Globe2, LayoutDashboard, Plus, Rocket, ShieldCheck, Trash2, Users2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDb } from "@/db/client";
import {
  project,
  projectAccessGrant,
  projectCollaborationOperationBatch,
  projectComment,
  projectDataRetentionPolicy,
  projectFolderAccessGrant,
  projectVersion,
  session as authSession,
  user as authUser,
} from "@/db/schema";
import { PostDeploySyntheticSmokePanel } from "@/features/deployment/components/post-deploy-synthetic-smoke-panel";
import { ReleaseReadinessPanel } from "@/features/deployment/components/release-readiness-panel";
import { createDashboardPostDeploySyntheticSmokeSummary, readPostDeploySyntheticSmokeHistory, readPostDeploySyntheticSmokeReport } from "@/features/deployment/server/post-deploy-synthetic-source";
import { createDashboardReleaseDeploymentChecklist } from "@/features/deployment/server/release-deployment-source";
import { ProjectAuditSearchPanel } from "@/features/projects/components/project-audit-search-panel";
import { ProjectAdminUsersTable, type DashboardUserRow } from "@/features/projects/components/project-admin-users-table";
import { ProjectAppPackageCertificatePanel } from "@/features/projects/components/project-app-package-certificate-panel";
import { ProjectArtifactProvenancePanel } from "@/features/projects/components/project-artifact-provenance-panel";
import { ProjectArtifactRegistryPanel } from "@/features/projects/components/project-artifact-registry-panel";
import { CadConversionExecutionQueuePanel } from "@/features/projects/components/cad-conversion-execution-queue-panel";
import { CadConversionFixtureCorpusPanel } from "@/features/projects/components/cad-conversion-fixture-corpus-panel";
import { CadKernelWorkerHealthPanel } from "@/features/projects/components/cad-kernel-worker-health-panel";
import { CadRuntimeAcceptancePacketPanel } from "@/features/projects/components/cad-runtime-acceptance-packet-panel";
import { CertificateBackedNativeArtifactIngestionPanel } from "@/features/projects/components/certificate-backed-native-artifact-ingestion-panel";
import { LiveProductionParityEvidenceDashboardPanel } from "@/features/projects/components/live-production-parity-evidence-dashboard-panel";
import { NativeReleasePromotionApprovalPanel } from "@/features/projects/components/native-release-promotion-approval-panel";
import { NativeCadKernelExecutionRunnerPanel } from "@/features/projects/components/native-cad-kernel-execution-runner-panel";
import { ProductionParityHistorySnapshotsPanel } from "@/features/projects/components/production-parity-history-snapshots-panel";
import { RollbackRehearsalEvidencePanel } from "@/features/projects/components/rollback-rehearsal-evidence-panel";
import { VisualParityEvidencePanel } from "@/features/projects/components/visual-parity-evidence-panel";
import { ProjectCadConversionQueuePanel } from "@/features/projects/components/project-cad-conversion-queue-panel";
import { ProjectCollaborationInboxPanel } from "@/features/projects/components/project-collaboration-inbox-panel";
import { ProjectDashboardAnalyticsPanel } from "@/features/projects/components/project-dashboard-analytics-panel";
import { ProjectDashboardActions, ProjectDashboardProjects } from "@/features/projects/components/project-dashboard-projects";
import { ProjectExportLineagePanel } from "@/features/projects/components/project-export-lineage-panel";
import { ProjectHealthNotificationCenter } from "@/features/projects/components/project-health-notification-center";
import { ProjectIncidentHistoryPanel } from "@/features/projects/components/project-incident-history-panel";
import { ProjectIncidentPostmortemPanel } from "@/features/projects/components/project-incident-postmortem-panel";
import { ProjectPublicSurfaceHealthPanel } from "@/features/projects/components/project-public-surface-health-panel";
import { ProjectRegressionWatchlistPanel } from "@/features/projects/components/project-regression-watchlist-panel";
import { ProjectSceneQaBaselineTrendsPanel } from "@/features/projects/components/project-scene-qa-baseline-trends-panel";
import { ProjectSceneQaSnapshotPanel } from "@/features/projects/components/project-scene-qa-snapshot-panel";
import { ProjectWebsiteTable, type DashboardWebsiteRow } from "@/features/projects/components/project-website-table";
import { BoardAssuranceAuditExportPanel } from "@/features/projects/components/board-assurance-audit-export-panel";
import { BoardAssuranceEvidenceBundlePanel } from "@/features/projects/components/board-assurance-evidence-bundle-panel";
import { BoardAssuranceExceptionWorkflowPanel } from "@/features/projects/components/board-assurance-exception-workflow-panel";
import { BoardApprovalPacketPanel } from "@/features/projects/components/board-approval-packet-panel";
import { BoardApprovalAgendaPanel } from "@/features/projects/components/board-approval-agenda-panel";
import { BoardApprovalCirculationQueuePanel } from "@/features/projects/components/board-approval-circulation-queue-panel";
import { BoardDecisionReplayAuditPanel } from "@/features/projects/components/board-decision-replay-audit-panel";
import { BoardApprovalDiffPanel } from "@/features/projects/components/board-approval-diff-panel";
import { BoardApprovalPostApprovalTrackerPanel } from "@/features/projects/components/board-approval-post-approval-tracker-panel";
import { BoardApprovalRedactionPoliciesPanel } from "@/features/projects/components/board-approval-redaction-policies-panel";
import { BoardAssuranceNotificationRoutingPanel } from "@/features/projects/components/board-assurance-notification-routing-panel";
import { BoardAuditCompletionDigestPanel } from "@/features/projects/components/board-audit-completion-digest-panel";
import { BoardAuditEvidenceAcceptancePanel } from "@/features/projects/components/board-audit-evidence-acceptance-panel";
import { BoardAuditEvidenceManifestPanel } from "@/features/projects/components/board-audit-evidence-manifest-panel";
import { BoardAuditEvidenceReadinessDigestPanel } from "@/features/projects/components/board-audit-evidence-readiness-digest-panel";
import { BoardAuditEvidenceVerificationPanel } from "@/features/projects/components/board-audit-evidence-verification-panel";
import { BoardAuditFollowUpTasksPanel } from "@/features/projects/components/board-audit-follow-up-tasks-panel";
import { BoardAuditReminderRoutingPanel } from "@/features/projects/components/board-audit-reminder-routing-panel";
import { BoardApprovalScenarioForecastPanel } from "@/features/projects/components/board-approval-scenario-forecast-panel";
import { BoardEvidenceAcceptanceCampaignPanel } from "@/features/projects/components/board-evidence-acceptance-campaign-panel";
import { BoardEvidenceCloseoutReportPanel } from "@/features/projects/components/board-evidence-closeout-report-panel";
import { BoardEvidenceCommandCenterPanel } from "@/features/projects/components/board-evidence-command-center-panel";
import { BoardEvidenceEscalationRoutingPanel } from "@/features/projects/components/board-evidence-escalation-routing-panel";
import { BoardEvidenceFreshnessMonitorPanel } from "@/features/projects/components/board-evidence-freshness-monitor-panel";
import { BoardEvidencePacketLockPanel } from "@/features/projects/components/board-evidence-packet-lock-panel";
import { BoardEvidenceReadinessSnapshotsPanel } from "@/features/projects/components/board-evidence-readiness-snapshots-panel";
import { BoardEvidenceReleaseApprovalHandoffPanel } from "@/features/projects/components/board-evidence-release-approval-handoff-panel";
import { BoardEvidenceReleaseArchiveRecordsPanel } from "@/features/projects/components/board-evidence-release-archive-records-panel";
import { BoardEvidenceReleaseCloseoutNotificationsPanel } from "@/features/projects/components/board-evidence-release-closeout-notifications-panel";
import { BoardEvidenceReleasePromotionGatePanel } from "@/features/projects/components/board-evidence-release-promotion-gate-panel";
import { BoardEvidenceReleaseVariancePanel } from "@/features/projects/components/board-evidence-release-variance-panel";
import { BoardReleaseDistributionAcknowledgementsPanel } from "@/features/projects/components/board-release-distribution-acknowledgements-panel";
import { BoardReleaseDistributionAuditTimelinePanel } from "@/features/projects/components/board-release-distribution-audit-timeline-panel";
import { BoardReleaseDistributionReadinessDashboardPanel } from "@/features/projects/components/board-release-distribution-readiness-dashboard-panel";
import { BoardReleaseDistributionRecipientManifestsPanel } from "@/features/projects/components/board-release-distribution-recipient-manifests-panel";
import { BoardReleaseDistributionRetryPlanningPanel } from "@/features/projects/components/board-release-distribution-retry-planning-panel";
import { BoardReleaseArchiveAssuranceDecisionMemoPanel } from "@/features/projects/components/board-release-archive-assurance-decision-memo-panel";
import { BoardReleaseArchiveAssuranceDistributionMatrixPanel } from "@/features/projects/components/board-release-archive-assurance-distribution-matrix-panel";
import { BoardReleaseArchiveAssuranceFinalCloseoutCertificatePanel } from "@/features/projects/components/board-release-archive-assurance-final-closeout-certificate-panel";
import { BoardReleaseArchiveAssuranceNotarizationRegisterPanel } from "@/features/projects/components/board-release-archive-assurance-notarization-register-panel";
import { BoardReleaseArchiveAssurancePostReleaseAuditChecklistPanel } from "@/features/projects/components/board-release-archive-assurance-post-release-audit-checklist-panel";
import { BoardReleaseArchiveCertificationEvidenceReplayVerifierPanel } from "@/features/projects/components/board-release-archive-certification-evidence-replay-verifier-panel";
import { BoardReleaseArchiveCertificationExecutiveAttestationDigestPanel } from "@/features/projects/components/board-release-archive-certification-executive-attestation-digest-panel";
import { BoardReleaseArchiveCertificationExternalAuditorPacketPanel } from "@/features/projects/components/board-release-archive-certification-external-auditor-packet-panel";
import { BoardReleaseArchiveCertificationHistoryLedgerPanel } from "@/features/projects/components/board-release-archive-certification-history-ledger-panel";
import { BoardReleaseArchiveCertificationRevocationWorkflowPanel } from "@/features/projects/components/board-release-archive-certification-revocation-workflow-panel";
import { BoardReleaseArchiveCustodyAccessReviewQueuePanel } from "@/features/projects/components/board-release-archive-custody-access-review-queue-panel";
import { BoardReleaseArchiveCustodyChainOfControlLedgerPanel } from "@/features/projects/components/board-release-archive-custody-chain-of-control-ledger-panel";
import { BoardReleaseArchiveCustodyExecutiveCloseoutDigestPanel } from "@/features/projects/components/board-release-archive-custody-executive-closeout-digest-panel";
import { BoardReleaseArchiveCustodyRetentionLockWorkflowPanel } from "@/features/projects/components/board-release-archive-custody-retention-lock-workflow-panel";
import { BoardReleaseArchiveCustodyRestoreRehearsalPacketPanel } from "@/features/projects/components/board-release-archive-custody-restore-rehearsal-packet-panel";
import { BoardReleaseArchiveOversightBoardDistributionDigestPanel } from "@/features/projects/components/board-release-archive-oversight-board-distribution-digest-panel";
import { BoardReleaseArchiveOversightEvidenceQualityMonitorPanel } from "@/features/projects/components/board-release-archive-oversight-evidence-quality-monitor-panel";
import { BoardReleaseArchiveOversightExecutiveHealthPacketPanel } from "@/features/projects/components/board-release-archive-oversight-executive-health-packet-panel";
import { BoardReleaseArchiveOversightExceptionRenewalCalendarPanel } from "@/features/projects/components/board-release-archive-oversight-exception-renewal-calendar-panel";
import { BoardReleaseArchiveOversightIncidentReplayDrillPanel } from "@/features/projects/components/board-release-archive-oversight-incident-replay-drill-panel";
import { BoardReleaseArchiveGovernanceControlOwnerMatrixPanel } from "@/features/projects/components/board-release-archive-governance-control-owner-matrix-panel";
import { BoardReleaseArchiveGovernanceAutomationAuditTrailPanel } from "@/features/projects/components/board-release-archive-governance-automation-audit-trail-panel";
import { BoardReleaseArchiveGovernanceAutomationExecutivePacketPanel } from "@/features/projects/components/board-release-archive-governance-automation-executive-packet-panel";
import { BoardReleaseArchiveGovernanceAutomationFailureLedgerPanel } from "@/features/projects/components/board-release-archive-governance-automation-failure-ledger-panel";
import { BoardReleaseArchiveGovernanceAutomationRunbookPanel } from "@/features/projects/components/board-release-archive-governance-automation-runbook-panel";
import { BoardReleaseArchiveGovernanceAutomationTriggerRegisterPanel } from "@/features/projects/components/board-release-archive-governance-automation-trigger-register-panel";
import { BoardReleaseArchiveGovernanceExceptionQuorumTrackerPanel } from "@/features/projects/components/board-release-archive-governance-exception-quorum-tracker-panel";
import { BoardReleaseArchiveGovernanceExecutivePacketPanel } from "@/features/projects/components/board-release-archive-governance-executive-packet-panel";
import { BoardReleaseArchiveGovernancePolicyDriftMonitorPanel } from "@/features/projects/components/board-release-archive-governance-policy-drift-monitor-panel";
import { BoardReleaseArchiveGovernancePolicyCharterPanel } from "@/features/projects/components/board-release-archive-governance-policy-charter-panel";
import { NativeCadKernelCapabilityMatrixPanel } from "@/features/projects/components/native-cad-kernel-capability-matrix-panel";
import { NativeArtifactSigningExecutionReceiptsPanel } from "@/features/projects/components/native-artifact-signing-execution-receipts-panel";
import { SignedNativeArtifactProvenanceLedgerPanel } from "@/features/projects/components/signed-native-artifact-provenance-ledger-panel";
import { SignedNativePackageReadinessPacketPanel } from "@/features/projects/components/signed-native-package-readiness-packet-panel";
import { BoardReleaseArchiveStewardshipContinuityRehearsalPanel } from "@/features/projects/components/board-release-archive-stewardship-continuity-rehearsal-panel";
import { BoardReleaseArchiveStewardshipEvidenceAgingForecastPanel } from "@/features/projects/components/board-release-archive-stewardship-evidence-aging-forecast-panel";
import { BoardReleaseArchiveStewardshipExecutivePacketPanel } from "@/features/projects/components/board-release-archive-stewardship-executive-packet-panel";
import { BoardReleaseArchiveStewardshipExceptionBudgetLedgerPanel } from "@/features/projects/components/board-release-archive-stewardship-exception-budget-ledger-panel";
import { BoardReleaseArchiveStewardshipOwnershipRotationPlannerPanel } from "@/features/projects/components/board-release-archive-stewardship-ownership-rotation-planner-panel";
import { BoardReleaseArchiveVerificationDistributionProofBundlePanel } from "@/features/projects/components/board-release-archive-verification-distribution-proof-bundle-panel";
import { BoardReleaseArchiveVerificationExceptionRegisterPanel } from "@/features/projects/components/board-release-archive-verification-exception-register-panel";
import { BoardReleaseArchiveVerificationFinalAcceptancePacketPanel } from "@/features/projects/components/board-release-archive-verification-final-acceptance-packet-panel";
import { BoardReleaseArchiveVerificationReadinessTimelinePanel } from "@/features/projects/components/board-release-archive-verification-readiness-timeline-panel";
import { BoardReleaseArchiveVerificationSignatureChainValidatorPanel } from "@/features/projects/components/board-release-archive-verification-signature-chain-validator-panel";
import { BoardReleaseArchiveEvidenceDiffSnapshotsPanel } from "@/features/projects/components/board-release-archive-evidence-diff-snapshots-panel";
import { BoardReleaseArchiveEvidenceExceptionRenewalSchedulerPanel } from "@/features/projects/components/board-release-archive-evidence-exception-renewal-scheduler-panel";
import { BoardReleaseArchiveEvidenceReleaseHandoffDigestPanel } from "@/features/projects/components/board-release-archive-evidence-release-handoff-digest-panel";
import { BoardReleaseArchiveEvidenceRetentionVaultPanel } from "@/features/projects/components/board-release-archive-evidence-retention-vault-panel";
import { BoardReleaseArchiveEvidenceReviewerPacketsPanel } from "@/features/projects/components/board-release-archive-evidence-reviewer-packets-panel";
import { BoardReleaseArchiveAnomalyReviewPanel } from "@/features/projects/components/board-release-archive-anomaly-review-panel";
import { BoardReleaseArchiveIntelligenceAutomationDigestPanel } from "@/features/projects/components/board-release-archive-intelligence-automation-digest-panel";
import { BoardReleaseArchiveIntelligenceCommandCenterPanel } from "@/features/projects/components/board-release-archive-intelligence-command-center-panel";
import { BoardReleaseArchiveIntelligenceApprovalWorkflowPanel } from "@/features/projects/components/board-release-archive-intelligence-approval-workflow-panel";
import { BoardReleaseArchiveIntelligenceNotificationRoutingPanel } from "@/features/projects/components/board-release-archive-intelligence-notification-routing-panel";
import { BoardReleaseArchiveIntelligencePacketPanel } from "@/features/projects/components/board-release-archive-intelligence-packet-panel";
import { BoardReleaseArchiveIntelligenceIndexPanel } from "@/features/projects/components/board-release-archive-intelligence-index-panel";
import { BoardReleaseArchiveReplaySimulatorPanel } from "@/features/projects/components/board-release-archive-replay-simulator-panel";
import { BoardReleaseArchiveTrendDigestPanel } from "@/features/projects/components/board-release-archive-trend-digest-panel";
import { BoardReleaseCloseoutArchiveManifestsPanel } from "@/features/projects/components/board-release-closeout-archive-manifests-panel";
import { BoardReleaseCloseoutExecutivePacketPanel } from "@/features/projects/components/board-release-closeout-executive-packet-panel";
import { BoardReleaseCloseoutOwnerAcknowledgementsPanel } from "@/features/projects/components/board-release-closeout-owner-acknowledgements-panel";
import { BoardReleaseCloseoutReadinessGatesPanel } from "@/features/projects/components/board-release-closeout-readiness-gates-panel";
import { BoardReleaseCloseoutVarianceRemediationPanel } from "@/features/projects/components/board-release-closeout-variance-remediation-panel";
import { BoardReleaseObservabilityAlertRoutingPanel } from "@/features/projects/components/board-release-observability-alert-routing-panel";
import { BoardReleaseObservabilityEventHealthPanel } from "@/features/projects/components/board-release-observability-event-health-panel";
import { BoardReleaseObservabilityExecutiveDigestPanel } from "@/features/projects/components/board-release-observability-executive-digest-panel";
import { BoardReleaseObservabilityIncidentNotesPanel } from "@/features/projects/components/board-release-observability-incident-notes-panel";
import { BoardReleaseObservabilityTrendSnapshotsPanel } from "@/features/projects/components/board-release-observability-trend-snapshots-panel";
import { BoardReleaseOperationsApprovalSnapshotsPanel } from "@/features/projects/components/board-release-operations-approval-snapshots-panel";
import { BoardReleaseOperationsDashboardFiltersPanel } from "@/features/projects/components/board-release-operations-dashboard-filters-panel";
import { BoardReleaseOperationsExportPacketsPanel } from "@/features/projects/components/board-release-operations-export-packets-panel";
import { BoardReleaseOperationsHistoryPanel } from "@/features/projects/components/board-release-operations-history-panel";
import { BoardReleaseOperationsReviewQueuePanel } from "@/features/projects/components/board-release-operations-review-queue-panel";
import { BoardGovernanceExecutiveDigestPanel } from "@/features/projects/components/board-governance-executive-digest-panel";
import { BoardGovernanceDecisionLedgerPanel } from "@/features/projects/components/board-governance-decision-ledger-panel";
import { BoardOperationsControlCenterPanel } from "@/features/projects/components/board-operations-control-center-panel";
import { BoardReviewerWorkloadBalancingPanel } from "@/features/projects/components/board-reviewer-workload-balancing-panel";
import { CompliancePacketSharingPanel } from "@/features/projects/components/compliance-packet-sharing-panel";
import { CostQuotaForecastSimulatorPanel } from "@/features/projects/components/cost-quota-forecast-simulator-panel";
import { BoardReleaseVarianceDashboardPanel } from "@/features/projects/components/board-release-variance-dashboard-panel";
import { DeployPromotionDecisionBoardPanel } from "@/features/projects/components/deploy-promotion-decision-board-panel";
import { DeploymentEnvironmentDriftPanel } from "@/features/projects/components/deployment-environment-drift-panel";
import { ExecutiveActionOwnershipPanel } from "@/features/projects/components/executive-action-ownership-panel";
import { ExecutiveReleaseIntelligencePanel } from "@/features/projects/components/executive-release-intelligence-panel";
import { ExecutiveReleaseSnapshotPanel } from "@/features/projects/components/executive-release-snapshot-panel";
import { FreeTierResourceMonitorPanel } from "@/features/projects/components/free-tier-resource-monitor-panel";
import { GovernanceExceptionWorkflowPanel } from "@/features/projects/components/governance-exception-workflow-panel";
import { GovernanceTimelinePanel } from "@/features/projects/components/governance-timeline-panel";
import { OfflineDesktopHandoffKitPanel } from "@/features/projects/components/offline-desktop-handoff-kit-panel";
import { OperationalAnomalyDetectionPanel } from "@/features/projects/components/operational-anomaly-detection-panel";
import { PolicyAsCodeChecksPanel } from "@/features/projects/components/policy-as-code-checks-panel";
import { ReleaseArchiveExplorerPanel } from "@/features/projects/components/release-archive-explorer-panel";
import { ReleaseControlRoomTimelinePanel } from "@/features/projects/components/release-control-room-timeline-panel";
import { ReleaseDrillSimulationPanel } from "@/features/projects/components/release-drill-simulation-panel";
import { ReleaseEvidenceBundlePanel } from "@/features/projects/components/release-evidence-bundle-panel";
import { ReleaseEvidenceDiffPanel } from "@/features/projects/components/release-evidence-diff-panel";
import { ReleaseReadinessWebhooksPanel } from "@/features/projects/components/release-readiness-webhooks-panel";
import { ReleaseScenarioComparisonPanel } from "@/features/projects/components/release-scenario-comparison-panel";
import { ReviewerHandoffPacketPanel } from "@/features/projects/components/reviewer-handoff-packet-panel";
import { RoleAccessReviewCampaignPanel } from "@/features/projects/components/role-access-review-campaign-panel";
import { RuntimeVersionWatchlistPanel } from "@/features/projects/components/runtime-version-watchlist-panel";
import { ScenePermissionPolicyTemplatesPanel } from "@/features/projects/components/scene-permission-policy-templates-panel";
import { SignedAuditEvidencePacketPanel } from "@/features/projects/components/signed-audit-evidence-packet-panel";
import { WorkspaceBackupRestoreRehearsalPanel } from "@/features/projects/components/workspace-backup-restore-rehearsal-panel";
import { WorkspaceEvidenceGraphPanel } from "@/features/projects/components/workspace-evidence-graph-panel";
import { WorkspaceMaintenanceCommandCenterPanel } from "@/features/projects/components/workspace-maintenance-command-center-panel";
import { WorkspacePolicySimulatorPanel } from "@/features/projects/components/workspace-policy-simulator-panel";
import { WorkspaceRiskDigestPanel } from "@/features/projects/components/workspace-risk-digest-panel";
import { WorkspaceSloDashboardPanel } from "@/features/projects/components/workspace-slo-dashboard-panel";
import { WorkspaceSecurityCompliancePanel } from "@/features/projects/components/workspace-security-compliance-panel";
import { WorkspaceTemplateManager, type TemplateSourceProject } from "@/features/projects/components/workspace-template-manager";
import { createProjectCollaborationInbox } from "@/features/projects/project-collaboration-inbox";
import { createProjectAppPackageCertificateReport } from "@/features/projects/app-package-certificates";
import { createProjectArtifactProvenanceReport } from "@/features/projects/artifact-provenance-verification";
import { createCadConversionExecutionQueue } from "@/features/projects/cad-conversion-execution-queue";
import { createCadConversionFixtureCorpusReport } from "@/features/projects/cad-conversion-fixture-corpus";
import { createCadKernelWorkerHealthReport } from "@/features/projects/cad-kernel-worker-health";
import { createCadRuntimeAcceptancePacket } from "@/features/projects/cad-runtime-acceptance-packet";
import { createProjectCadConversionQueueReport } from "@/features/projects/cad-conversion-worker";
import { createBoardAssuranceAuditExport } from "@/features/projects/board-assurance-audit-export";
import { createBoardAssuranceEvidenceBundleReport } from "@/features/projects/board-assurance-evidence-bundle";
import { createBoardAssuranceExceptionWorkflow } from "@/features/projects/board-assurance-exceptions";
import { createBoardAssuranceNotificationRoutingReport } from "@/features/projects/board-assurance-notification-routing";
import { createBoardAuditCompletionDigest } from "@/features/projects/board-audit-completion-digest";
import { createBoardAuditEvidenceAcceptanceWorkflow } from "@/features/projects/board-audit-evidence-acceptance";
import { createBoardAuditEvidenceAttachmentManifest } from "@/features/projects/board-audit-evidence-manifest";
import { createBoardAuditEvidenceReadinessDigest } from "@/features/projects/board-audit-evidence-readiness-digest";
import { createBoardAuditEvidenceVerificationReport } from "@/features/projects/board-audit-evidence-verification";
import { applyBoardAuditTaskPersistence, createBoardAuditFollowUpTasksReport } from "@/features/projects/board-audit-follow-up-tasks";
import { createBoardAuditReminderRoutingReport } from "@/features/projects/board-audit-reminder-routing";
import { createBoardApprovalScenarioForecast } from "@/features/projects/board-approval-scenario-forecast";
import { createBoardEvidenceAcceptanceCampaign } from "@/features/projects/board-evidence-acceptance-campaign";
import { createBoardEvidenceCloseoutReport } from "@/features/projects/board-evidence-closeout-report";
import { createBoardEvidenceCommandCenter } from "@/features/projects/board-evidence-command-center";
import { createBoardEvidenceEscalationRoutingReport } from "@/features/projects/board-evidence-escalation-routing";
import { createBoardEvidenceFreshnessMonitor } from "@/features/projects/board-evidence-freshness-monitor";
import { createBoardEvidencePacketLockReport } from "@/features/projects/board-evidence-packet-lock";
import { createBoardEvidenceReleaseApprovalHandoffReport } from "@/features/projects/board-evidence-release-approval-handoff";
import { createBoardEvidenceReleaseArchiveRecordReport } from "@/features/projects/board-evidence-release-archive-records";
import { createBoardEvidenceReleaseCloseoutNotificationReport } from "@/features/projects/board-evidence-release-closeout-notifications";
import { createBoardEvidenceReleasePromotionGateReport } from "@/features/projects/board-evidence-release-promotion-gate";
import { createBoardEvidenceReleaseVarianceReport } from "@/features/projects/board-evidence-release-variance";
import { createBoardReleaseDistributionAcknowledgementReport } from "@/features/projects/board-release-distribution-acknowledgements";
import { createBoardReleaseDistributionAuditTimelineReport } from "@/features/projects/board-release-distribution-audit-timeline";
import { createBoardReleaseDistributionReadinessDashboardReport } from "@/features/projects/board-release-distribution-readiness-dashboard";
import { createBoardReleaseDistributionRecipientManifestReport } from "@/features/projects/board-release-distribution-recipient-manifests";
import { createBoardReleaseDistributionRetryPlanningReport } from "@/features/projects/board-release-distribution-retry-planning";
import { createBoardReleaseArchiveAssuranceDecisionMemo } from "@/features/projects/board-release-archive-assurance-decision-memo";
import { createBoardReleaseArchiveAssuranceDistributionMatrix } from "@/features/projects/board-release-archive-assurance-distribution-matrix";
import { createBoardReleaseArchiveAssuranceFinalCloseoutCertificate } from "@/features/projects/board-release-archive-assurance-final-closeout-certificate";
import { createBoardReleaseArchiveAssuranceNotarizationRegister } from "@/features/projects/board-release-archive-assurance-notarization-register";
import { createBoardReleaseArchiveAssurancePostReleaseAuditChecklist } from "@/features/projects/board-release-archive-assurance-post-release-audit-checklist";
import { createBoardReleaseArchiveCertificationEvidenceReplayVerifier } from "@/features/projects/board-release-archive-certification-evidence-replay-verifier";
import { createBoardReleaseArchiveCertificationExecutiveAttestationDigest } from "@/features/projects/board-release-archive-certification-executive-attestation-digest";
import { createBoardReleaseArchiveCertificationExternalAuditorPacket } from "@/features/projects/board-release-archive-certification-external-auditor-packet";
import { createBoardReleaseArchiveCertificationHistoryLedger } from "@/features/projects/board-release-archive-certification-history-ledger";
import { createBoardReleaseArchiveCertificationRevocationWorkflow } from "@/features/projects/board-release-archive-certification-revocation-workflow";
import { createBoardReleaseArchiveCustodyAccessReviewQueue } from "@/features/projects/board-release-archive-custody-access-review-queue";
import { createBoardReleaseArchiveCustodyChainOfControlLedger } from "@/features/projects/board-release-archive-custody-chain-of-control-ledger";
import { createBoardReleaseArchiveCustodyExecutiveCloseoutDigest } from "@/features/projects/board-release-archive-custody-executive-closeout-digest";
import { createBoardReleaseArchiveCustodyRetentionLockWorkflow } from "@/features/projects/board-release-archive-custody-retention-lock-workflow";
import { createBoardReleaseArchiveCustodyRestoreRehearsalPacket } from "@/features/projects/board-release-archive-custody-restore-rehearsal-packet";
import { createBoardReleaseArchiveOversightBoardDistributionDigest } from "@/features/projects/board-release-archive-oversight-board-distribution-digest";
import { createBoardReleaseArchiveOversightEvidenceQualityMonitor } from "@/features/projects/board-release-archive-oversight-evidence-quality-monitor";
import { createBoardReleaseArchiveOversightExecutiveHealthPacket } from "@/features/projects/board-release-archive-oversight-executive-health-packet";
import { createBoardReleaseArchiveOversightExceptionRenewalCalendar } from "@/features/projects/board-release-archive-oversight-exception-renewal-calendar";
import { createBoardReleaseArchiveOversightIncidentReplayDrill } from "@/features/projects/board-release-archive-oversight-incident-replay-drill";
import { createBoardReleaseArchiveGovernanceControlOwnerMatrix } from "@/features/projects/board-release-archive-governance-control-owner-matrix";
import { createBoardReleaseArchiveGovernanceAutomationAuditTrail } from "@/features/projects/board-release-archive-governance-automation-audit-trail";
import { createBoardReleaseArchiveGovernanceAutomationExecutivePacket } from "@/features/projects/board-release-archive-governance-automation-executive-packet";
import { createBoardReleaseArchiveGovernanceAutomationFailureLedger } from "@/features/projects/board-release-archive-governance-automation-failure-ledger";
import { createBoardReleaseArchiveGovernanceAutomationRunbook } from "@/features/projects/board-release-archive-governance-automation-runbook";
import { createBoardReleaseArchiveGovernanceAutomationTriggerRegister } from "@/features/projects/board-release-archive-governance-automation-trigger-register";
import { createBoardReleaseArchiveGovernanceExceptionQuorumTracker } from "@/features/projects/board-release-archive-governance-exception-quorum-tracker";
import { createBoardReleaseArchiveGovernanceExecutivePacket } from "@/features/projects/board-release-archive-governance-executive-packet";
import { createBoardReleaseArchiveGovernancePolicyDriftMonitor } from "@/features/projects/board-release-archive-governance-policy-drift-monitor";
import { createBoardReleaseArchiveGovernancePolicyCharter } from "@/features/projects/board-release-archive-governance-policy-charter";
import { createCertificateBackedNativeArtifactIngestion } from "@/features/projects/certificate-backed-native-artifact-ingestion";
import { createLiveProductionParityEvidenceDashboard, createProductionParityHistorySnapshots } from "@/features/projects/live-production-parity-evidence-dashboard";
import { createVisualParityEvidenceReport } from "@/features/projects/visual-parity-evidence";
import { createNativeCadKernelCapabilityMatrix } from "@/features/projects/native-cad-kernel-capability-matrix";
import { createNativeCadKernelExecutionRunnerReport } from "@/features/projects/native-cad-kernel-execution-runner";
import { createNativeArtifactSigningExecutionReceipts } from "@/features/projects/native-artifact-signing-execution-receipts";
import { createNativeReleasePromotionApproval } from "@/features/projects/native-release-promotion-approval";
import { createRollbackRehearsalEvidenceReport } from "@/features/projects/rollback-rehearsal-evidence";
import { createSignedNativeArtifactProvenanceLedger } from "@/features/projects/signed-native-artifact-provenance-ledger";
import { createSignedNativePackageReadinessPacket } from "@/features/projects/signed-native-package-readiness-packet";
import { createBoardReleaseArchiveStewardshipContinuityRehearsal } from "@/features/projects/board-release-archive-stewardship-continuity-rehearsal";
import { createBoardReleaseArchiveStewardshipEvidenceAgingForecast } from "@/features/projects/board-release-archive-stewardship-evidence-aging-forecast";
import { createBoardReleaseArchiveStewardshipExecutivePacket } from "@/features/projects/board-release-archive-stewardship-executive-packet";
import { createBoardReleaseArchiveStewardshipExceptionBudgetLedger } from "@/features/projects/board-release-archive-stewardship-exception-budget-ledger";
import { createBoardReleaseArchiveStewardshipOwnershipRotationPlanner } from "@/features/projects/board-release-archive-stewardship-ownership-rotation-planner";
import { createBoardReleaseArchiveVerificationDistributionProofBundle } from "@/features/projects/board-release-archive-verification-distribution-proof-bundle";
import { createBoardReleaseArchiveVerificationExceptionRegister } from "@/features/projects/board-release-archive-verification-exception-register";
import { createBoardReleaseArchiveVerificationFinalAcceptancePacket } from "@/features/projects/board-release-archive-verification-final-acceptance-packet";
import { createBoardReleaseArchiveVerificationReadinessTimeline } from "@/features/projects/board-release-archive-verification-readiness-timeline";
import { createBoardReleaseArchiveVerificationSignatureChainValidator } from "@/features/projects/board-release-archive-verification-signature-chain-validator";
import { createBoardReleaseArchiveEvidenceDiffSnapshotReport } from "@/features/projects/board-release-archive-evidence-diff-snapshots";
import { createBoardReleaseArchiveEvidenceExceptionRenewalSchedulerReport } from "@/features/projects/board-release-archive-evidence-exception-renewal-scheduler";
import { createBoardReleaseArchiveEvidenceReleaseHandoffDigest } from "@/features/projects/board-release-archive-evidence-release-handoff-digest";
import { createBoardReleaseArchiveEvidenceRetentionVaultReport } from "@/features/projects/board-release-archive-evidence-retention-vault";
import { createBoardReleaseArchiveEvidenceReviewerPacketReport } from "@/features/projects/board-release-archive-evidence-reviewer-packets";
import { createBoardReleaseArchiveAnomalyReviewReport } from "@/features/projects/board-release-archive-anomaly-review";
import { createBoardReleaseArchiveIntelligenceAutomationDigestReport } from "@/features/projects/board-release-archive-intelligence-automation-digest";
import { createBoardReleaseArchiveIntelligenceCommandCenterReport } from "@/features/projects/board-release-archive-intelligence-command-center";
import { createBoardReleaseArchiveIntelligenceApprovalWorkflowReport } from "@/features/projects/board-release-archive-intelligence-approval-workflow";
import { createBoardReleaseArchiveIntelligenceNotificationRoutingReport } from "@/features/projects/board-release-archive-intelligence-notification-routing";
import { createBoardReleaseArchiveIntelligencePacketReport } from "@/features/projects/board-release-archive-intelligence-packet";
import { createBoardReleaseArchiveIntelligenceIndexReport } from "@/features/projects/board-release-archive-intelligence-index";
import { createBoardReleaseArchiveReplaySimulatorReport } from "@/features/projects/board-release-archive-replay-simulator";
import { createBoardReleaseArchiveTrendDigestReport } from "@/features/projects/board-release-archive-trend-digest";
import { createBoardReleaseCloseoutArchiveManifestReport } from "@/features/projects/board-release-closeout-archive-manifests";
import { createBoardReleaseCloseoutExecutivePacketReport } from "@/features/projects/board-release-closeout-executive-packet";
import { createBoardReleaseCloseoutOwnerAcknowledgementReport } from "@/features/projects/board-release-closeout-owner-acknowledgements";
import { createBoardReleaseCloseoutReadinessGateReport } from "@/features/projects/board-release-closeout-readiness-gates";
import { createBoardReleaseCloseoutVarianceRemediationReport } from "@/features/projects/board-release-closeout-variance-remediation";
import { createBoardReleaseObservabilityAlertRoutingReport } from "@/features/projects/board-release-observability-alert-routing";
import { createBoardReleaseObservabilityEventHealthReport } from "@/features/projects/board-release-observability-event-health";
import { createBoardReleaseObservabilityExecutiveDigest } from "@/features/projects/board-release-observability-executive-digest";
import { createBoardReleaseObservabilityIncidentNotesReport } from "@/features/projects/board-release-observability-incident-notes";
import { createBoardReleaseObservabilityTrendSnapshotReport } from "@/features/projects/board-release-observability-trend-snapshots";
import { createBoardReleaseOperationsApprovalSnapshotReport } from "@/features/projects/board-release-operations-approval-snapshots";
import { createBoardReleaseOperationsDashboardFilterReport } from "@/features/projects/board-release-operations-dashboard-filters";
import { createBoardReleaseOperationsExportPacketReport } from "@/features/projects/board-release-operations-export-packets";
import { createBoardReleaseOperationsHistoryReport } from "@/features/projects/board-release-operations-history";
import { createBoardReleaseOperationsReviewQueueReport } from "@/features/projects/board-release-operations-review-queue";
import {
  createBoardEvidenceReadinessSnapshotHistoryReport,
  createBoardEvidenceReadinessSnapshotRecord,
} from "@/features/projects/board-evidence-readiness-snapshots";
import { createBoardGovernanceExecutiveDigest } from "@/features/projects/board-governance-executive-digest";
import { createBoardGovernanceDecisionLedger } from "@/features/projects/board-governance-decision-ledger";
import { createBoardOperationsControlCenter, type BoardOperationsControlStatus } from "@/features/projects/board-operations-control-center";
import { createBoardReviewerWorkloadBalancingReport } from "@/features/projects/board-reviewer-workload-balancing";
import { createBoardApprovalMeetingAgenda } from "@/features/projects/board-approval-agenda";
import { createBoardApprovalPacketCirculationQueueReport } from "@/features/projects/board-approval-circulation-queue";
import { createBoardApprovalPacketDiffReport } from "@/features/projects/board-approval-diff";
import { createBoardApprovalPacket } from "@/features/projects/board-approval-packet";
import { createBoardApprovalPostApprovalTracker } from "@/features/projects/board-approval-post-approval-tracker";
import { createBoardApprovalSlaReminderReport } from "@/features/projects/board-approval-sla-reminders";
import { createBoardApprovalRedactionPolicyReport } from "@/features/projects/board-approval-redaction-policies";
import { createBoardDecisionReplayAuditReport } from "@/features/projects/board-decision-replay-audit";
import { createBoardReleaseVarianceDashboard } from "@/features/projects/board-release-variance-dashboard";
import { createCostQuotaForecastSimulator } from "@/features/projects/cost-quota-forecast-simulator";
import { createProjectDashboardAnalytics } from "@/features/projects/project-dashboard-analytics";
import { createDeployPromotionDecisionBoard } from "@/features/projects/deploy-promotion-decision-board";
import { createDeploymentEnvironmentDriftMonitor } from "@/features/projects/deployment-environment-drift";
import { createDesktopSigningPlan } from "@/features/projects/desktop-signing-workflow";
import { createExecutiveActionOwnershipMatrix } from "@/features/projects/executive-action-ownership";
import { createExecutiveReleaseIntelligenceReport } from "@/features/projects/executive-release-intelligence";
import { createFreeTierResourceMonitorReport } from "@/features/projects/free-tier-resource-monitor";
import { createGovernanceExceptionWorkflow } from "@/features/projects/governance-exception-workflow";
import { createGovernanceTimelineReport } from "@/features/projects/governance-timeline";
import { createOfflineDesktopHandoffKitPreview } from "@/features/projects/offline-desktop-handoff-kit";
import { createOperationalAnomalyDetectionReport } from "@/features/projects/operational-anomaly-detection";
import { createProjectExportLineageReport } from "@/features/projects/project-export-lineage";
import { applyProjectHealthNotificationStates, createProjectHealthNotificationCenter } from "@/features/projects/project-health-notifications";
import { createProjectIncidentHistory } from "@/features/projects/project-incident-history";
import { createProjectIncidentPostmortemReport } from "@/features/projects/project-incident-postmortem";
import { applyCollaborationInboxDeliveryPreferences, applyProjectHealthDeliveryPreferences } from "@/features/projects/project-notification-delivery";
import { createDefaultProjectAuditSearchFilters, createProjectAuditSearchResult } from "@/features/projects/project-audit-search";
import { createPolicyAsCodeReport } from "@/features/projects/policy-as-code-checks";
import { createWorkspacePolicySimulationReportFromSources } from "@/features/projects/workspace-policy-simulator";
import { createProjectRegressionWatchlist } from "@/features/projects/regression-watchlist";
import { createProjectPublicSurfaceHealthReport } from "@/features/projects/public-surface-health";
import { createReleaseArchiveExplorerReport } from "@/features/projects/release-archive-explorer";
import { createReleaseControlRoomTimeline } from "@/features/projects/release-control-room-timeline";
import { createReleaseDrillSimulationReport } from "@/features/projects/release-drill-simulation";
import { createReleaseEvidenceBundlePreview } from "@/features/projects/release-evidence-bundle";
import { createReleaseReadinessWebhookReportFromSources } from "@/features/projects/release-readiness-webhooks";
import { createReleaseScenarioComparisonReport } from "@/features/projects/release-scenario-comparison";
import { createReviewerHandoffPacketReport } from "@/features/projects/reviewer-handoff-packet";
import { createRoleAccessReviewCampaignReport } from "@/features/projects/role-access-review-campaigns";
import { createRuntimeVersionWatchlistReport } from "@/features/projects/runtime-version-watchlist";
import { createScenePermissionPolicyTemplateReport } from "@/features/projects/scene-permission-policy-templates";
import {
  attachSignedAuditEvidencePacketSignatures,
  createSignedAuditEvidencePacketVerificationReport,
  createUnsignedAuditEvidencePacket,
  parseAuditEvidencePublicKeyRingJson,
  parseSignedAuditEvidencePacketSignaturesJson,
} from "@/features/projects/signed-audit-evidence-packets";
import { createWorkspaceBackupRestoreRehearsalReport } from "@/features/projects/workspace-backup-restore-rehearsal";
import { createWorkspaceEvidenceGraph } from "@/features/projects/workspace-evidence-graph";
import { createWorkspaceMaintenanceCommandCenterReport } from "@/features/projects/workspace-maintenance-command-center";
import { createWorkspaceSloDashboard } from "@/features/projects/workspace-slo-dashboard";
import { createWorkspaceRiskDigest, createWorkspaceRiskDigestJson } from "@/features/projects/workspace-risk-digest";
import { createWorkspaceSecurityComplianceReport } from "@/features/projects/workspace-security-compliance";
import { listAccessibleFolders, listAccessibleProjects } from "@/features/projects/server/project-access-service";
import { listWorkspaceBoardApprovalPacketHistory } from "@/features/projects/server/board-approval-packet-history-service";
import { listWorkspaceBoardReleaseArchiveIntelligencePacketHistory } from "@/features/projects/server/board-release-archive-intelligence-packet-history-service";
import { listWorkspaceBoardDecisionReplaySnapshotHistory } from "@/features/projects/server/board-decision-replay-snapshot-service";
import { listWorkspaceBoardAssuranceNotificationHistory } from "@/features/projects/server/board-assurance-notification-history-service";
import { listWorkspaceBoardAuditTaskRecords, listWorkspaceBoardAuditTaskStates } from "@/features/projects/server/board-audit-follow-up-task-service";
import { listWorkspaceBoardOperationsReviewCycleHistory } from "@/features/projects/server/board-operations-review-cycle-history-service";
import { listWorkspaceBoardPostApprovalActions } from "@/features/projects/server/board-approval-post-approval-action-service";
import { listWorkspaceRoleAccessReviewHistory } from "@/features/projects/server/role-access-review-history-service";
import { loadProjectAuditSearchRows } from "@/features/projects/server/project-audit-search-service";
import { listWorkspaceRiskDigestPacketHistory } from "@/features/projects/server/workspace-risk-digest-packet-service";
import { listWorkspaceCompliancePacketShares } from "@/features/projects/server/compliance-packet-share-service";
import { createDesktopReleaseOperationsSnapshot } from "@/features/projects/server/desktop-release-source";
import { listWorkspaceExecutiveReleaseSnapshotHistory } from "@/features/projects/server/executive-release-snapshot-service";
import { listProjectHealthNotificationStates } from "@/features/projects/server/project-health-notification-state-service";
import { listProjectAppPackageCertificates } from "@/features/projects/server/app-package-certificate-service";
import { listProjectCadConversionJobs } from "@/features/projects/server/cad-conversion-job-service";
import { getPublicSurfaceHealthBatchId, recordProjectPublicSurfaceHealthReport } from "@/features/projects/server/public-surface-health-service";
import { listWorkspaceRegressionWatchlistItemStates, listWorkspaceRegressionWatchlistSnapshots } from "@/features/projects/server/regression-watchlist-service";
import { listWorkspaceReleaseDrillHistory } from "@/features/projects/server/release-drill-history-service";
import { listWorkspaceReleaseReadinessWebhookHistory } from "@/features/projects/server/release-readiness-webhook-history-service";
import { listWorkspaceProjectTemplates } from "@/features/projects/server/project-template-service";
import { syncProjectArtifactRegistryReports } from "@/features/projects/server/project-artifact-registry-service";
import { recordWorkspaceSceneQaBaselineReport } from "@/features/projects/server/scene-qa-baseline-service";
import { resolveShareSettings } from "@/features/projects/share-settings";
import { createSceneQaSnapshotReport } from "@/features/projects/scene-qa-snapshots";
import { WorkspaceManagementPanel } from "@/features/workspaces/components/workspace-management-panel";
import { WorkspaceNotificationEmailDeliveryPanel } from "@/features/workspaces/components/workspace-notification-email-delivery-panel";
import { WorkspaceNotificationPreferencesPanel } from "@/features/workspaces/components/workspace-notification-preferences-panel";
import { WorkspaceReleaseCalendarPanel } from "@/features/workspaces/components/workspace-release-calendar-panel";
import { WorkspaceReleaseRunbookPanel } from "@/features/workspaces/components/workspace-release-runbook-panel";
import { createWorkspaceNotificationEmailDeliveryReport } from "@/features/workspaces/notification-email-delivery";
import { createDefaultWorkspaceNotificationDeliveryPreferences } from "@/features/workspaces/notification-delivery-preferences";
import { createWorkspaceReleaseRunbookReport } from "@/features/workspaces/release-runbook";
import {
  enqueueWorkspaceBoardApprovalSlaReminderEmailDeliveries,
  enqueueWorkspaceNotificationEmailDeliveries,
  listWorkspaceNotificationEmailDeliveryReport,
} from "@/features/workspaces/server/workspace-notification-email-delivery-service";
import { listWorkspaceNotificationDeliveryPreferences } from "@/features/workspaces/server/workspace-notification-preferences-service";
import { syncWorkspaceReleaseCalendarMilestones } from "@/features/workspaces/server/workspace-release-calendar-service";
import { getWorkspaceReleaseRunbookBatchId, recordWorkspaceReleaseRunbookReport } from "@/features/workspaces/server/workspace-release-runbook-service";
import { createWorkspaceReleaseCalendarReport } from "@/features/workspaces/workspace-release-calendar";
import { WorkspaceSwitcher } from "@/features/workspaces/components/workspace-switcher";
import { getWorkspaceDashboard } from "@/features/workspaces/server/workspace-service";
import { auth } from "@/lib/auth";

const ADMIN_EMAIL = "admin@mail.com";

function getRequestOrigin(requestHeaders: Headers) {
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");

  if (!host) {
    return "https://essence-spline.vercel.app";
  }

  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");

  return `${protocol}://${host}`;
}

function getPublishedVisibility(value: unknown) {
  const settings = resolveShareSettings(value);
  const enabled = [
    settings.allowView ? "Viewer" : null,
    settings.allowEmbed ? "Embed" : null,
    settings.allowPublicApi ? "API" : null,
    settings.allowCodeExport ? "Code" : null,
    settings.allowViewerDownload ? "Download" : null,
  ].filter(Boolean);

  return enabled.length === 5 ? "Public package" : enabled.join(", ") || "Restricted";
}

function getProjectsPath(options: { folderId?: string | null; view?: "active" | "trash"; workspaceId: string }) {
  const params = new URLSearchParams({ workspaceId: options.workspaceId });

  if (options.view === "trash") {
    params.set("view", "trash");
  }

  if (options.folderId) {
    params.set("folderId", options.folderId);
  }

  return `/projects?${params.toString()}`;
}

interface ProjectsPageProps {
  searchParams: Promise<{
    folderId?: string | string[];
    workspaceId?: string | string[];
    view?: string | string[];
  }>;
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({
    headers: requestHeaders,
  });

  if (!session?.user.id) {
    redirect("/sign-in");
  }

  const params = await searchParams;
  const rawView = Array.isArray(params.view) ? params.view[0] : params.view;
  const rawFolderId = Array.isArray(params.folderId) ? params.folderId[0] : params.folderId;
  const rawWorkspaceId = Array.isArray(params.workspaceId) ? params.workspaceId[0] : params.workspaceId;
  const view = rawView === "trash" ? "trash" : "active";
  const showingTrash = view === "trash";
  const selectedFolderId = showingTrash ? null : (rawFolderId ?? null);
  const origin = getRequestOrigin(requestHeaders);
  const isAdmin = session.user.email?.toLowerCase() === ADMIN_EMAIL;
  const db = getDb();
  const workspaceDashboard = await getWorkspaceDashboard(session.user.id, session.user.name, rawWorkspaceId);
  const workspaceId = workspaceDashboard.id;
  const canManageWorkspaceEmail = workspaceDashboard.role === "owner" || workspaceDashboard.role === "admin";
  const notificationPreferenceResult = await listWorkspaceNotificationDeliveryPreferences({
    currentUserId: session.user.id,
    workspaceId,
  });
  const notificationPreferences = "error" in notificationPreferenceResult ? createDefaultWorkspaceNotificationDeliveryPreferences() : notificationPreferenceResult.preferences;
  const folders = await listAccessibleFolders(session.user.id, { workspaceId });
  const folderSummaries = folders.map((folder) => ({
    id: folder.id,
    name: folder.name,
    createdAt: folder.createdAt.toISOString(),
    updatedAt: folder.updatedAt.toISOString(),
  }));
  const activeProjectFolderRows = await listAccessibleProjects(session.user.id, { workspaceId });
  const folderCounts = activeProjectFolderRows.reduce<Record<string, number>>((counts, row) => {
    if (row.folderId) {
      counts[row.folderId] = (counts[row.folderId] ?? 0) + 1;
    }

    return counts;
  }, {});
  const unfiledCount = activeProjectFolderRows.filter((row) => row.folderId === null).length;
  const projects = await listAccessibleProjects(session.user.id, {
    folderId: selectedFolderId,
    trash: showingTrash,
    workspaceId,
  });
  const dashboardProjects = isAdmin
    ? await db.select().from(project).where(eq(project.workspaceId, workspaceId)).orderBy(desc(project.updatedAt))
    : await db.select().from(project).where(and(eq(project.userId, session.user.id), eq(project.workspaceId, workspaceId))).orderBy(desc(project.updatedAt));
  const dashboardProjectIds = dashboardProjects.map((entry) => entry.id);
  const dashboardComments = dashboardProjectIds.length > 0 ? await db.select().from(projectComment).where(inArray(projectComment.projectId, dashboardProjectIds)) : [];
  const dashboardVersions =
    dashboardProjectIds.length > 0
      ? await db
          .select({
            createdAt: projectVersion.createdAt,
            id: projectVersion.id,
            name: projectVersion.name,
            projectId: projectVersion.projectId,
          })
          .from(projectVersion)
          .where(inArray(projectVersion.projectId, dashboardProjectIds))
          .orderBy(desc(projectVersion.createdAt))
          .limit(160)
      : [];
  type DashboardVersionRow = (typeof dashboardVersions)[number];
  const dashboardOperationBatches =
    dashboardProjectIds.length > 0
      ? await db
          .select({
            batchId: projectCollaborationOperationBatch.batchId,
            createdAt: projectCollaborationOperationBatch.createdAt,
            operationCount: projectCollaborationOperationBatch.operationCount,
            projectId: projectCollaborationOperationBatch.projectId,
            userEmail: authUser.email,
            userId: projectCollaborationOperationBatch.userId,
            userName: authUser.name,
          })
          .from(projectCollaborationOperationBatch)
          .innerJoin(authUser, eq(projectCollaborationOperationBatch.userId, authUser.id))
          .where(inArray(projectCollaborationOperationBatch.projectId, dashboardProjectIds))
          .orderBy(desc(projectCollaborationOperationBatch.createdAt))
          .limit(80)
      : [];
  const dashboardProjectAccessGrants =
    dashboardProjectIds.length > 0
      ? await db
          .select({
            projectId: projectAccessGrant.projectId,
            role: projectAccessGrant.role,
            userId: projectAccessGrant.userId,
          })
          .from(projectAccessGrant)
          .where(inArray(projectAccessGrant.projectId, dashboardProjectIds))
      : [];
  const dashboardFolderIds = folders.map((folder) => folder.id);
  const dashboardFolderAccessGrants =
    dashboardFolderIds.length > 0
      ? await db
          .select({
            folderId: projectFolderAccessGrant.folderId,
            role: projectFolderAccessGrant.role,
            userId: projectFolderAccessGrant.userId,
          })
          .from(projectFolderAccessGrant)
          .where(inArray(projectFolderAccessGrant.folderId, dashboardFolderIds))
      : [];
  const dashboardRetentionPolicies =
    dashboardProjectIds.length > 0
      ? await db
          .select({
            auditLogDays: projectDataRetentionPolicy.auditLogDays,
            commentDays: projectDataRetentionPolicy.commentDays,
            deletedAssetTombstoneDays: projectDataRetentionPolicy.deletedAssetTombstoneDays,
            projectId: projectDataRetentionPolicy.projectId,
            purgeReviewStatus: projectDataRetentionPolicy.purgeReviewStatus,
            updatedAt: projectDataRetentionPolicy.updatedAt,
            versionDays: projectDataRetentionPolicy.versionDays,
          })
          .from(projectDataRetentionPolicy)
          .where(inArray(projectDataRetentionPolicy.projectId, dashboardProjectIds))
      : [];
  const dashboardUsers = isAdmin ? await db.select().from(authUser).orderBy(desc(authUser.createdAt)) : [];
  const dashboardSessions = isAdmin ? await db.select().from(authSession) : await db.select().from(authSession).where(eq(authSession.userId, session.user.id));
  const projectCountsByUser = dashboardProjects.reduce<Record<string, number>>((counts, entry) => {
    counts[entry.userId] = (counts[entry.userId] ?? 0) + 1;

    return counts;
  }, {});
  const now = new Date();
  const generatedAt = now.toISOString();
  const activeSessionsByUser = dashboardSessions.reduce<Record<string, number>>((counts, entry) => {
    if (entry.expiresAt > now) {
      counts[entry.userId] = (counts[entry.userId] ?? 0) + 1;
    }

    return counts;
  }, {});
  const userRows: DashboardUserRow[] = dashboardUsers.map((entry) => ({
    id: entry.id,
    name: entry.name,
    email: entry.email,
    emailVerified: entry.emailVerified,
    role: entry.email.toLowerCase() === ADMIN_EMAIL ? "Admin" : "User",
    projectCount: projectCountsByUser[entry.id] ?? 0,
    activeSessions: activeSessionsByUser[entry.id] ?? 0,
    createdAt: entry.createdAt.toISOString(),
  }));
  const userNameById = new Map(dashboardUsers.map((entry) => [entry.id, entry.name]));
  const websiteRows: DashboardWebsiteRow[] = dashboardProjects
    .filter((entry) => !entry.archivedAt)
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      owner: isAdmin ? (userNameById.get(entry.userId) ?? "Unknown user") : (session.user.name ?? "You"),
      status: entry.publishedAt ? "Published" : "Draft",
      visibility: entry.publishedAt ? getPublishedVisibility(entry.shareSettings) : "Private",
      shareUrl: entry.shareId ? `${origin}/share/${entry.shareId}` : null,
      embedUrl: entry.shareId ? `${origin}/embed/${entry.shareId}` : null,
      updatedAt: entry.updatedAt.toISOString(),
    }));
  const activeDashboardProjects = dashboardProjects.filter((entry) => !entry.archivedAt);
  const templateSourceProjects: TemplateSourceProject[] = activeDashboardProjects.map((entry) => ({
    id: entry.id,
    name: entry.name,
    updatedAt: entry.updatedAt.toISOString(),
  }));
  const projectVersionsById = dashboardVersions.reduce<Map<string, DashboardVersionRow[]>>((versions, entry) => {
    const entries = versions.get(entry.projectId) ?? [];

    entries.push(entry);
    versions.set(entry.projectId, entries);

    return versions;
  }, new Map());
  const exportLineageReports = activeDashboardProjects.map((entry) =>
    createProjectExportLineageReport({
      origin,
      project: entry,
      sceneData: entry.sceneData,
      versions: projectVersionsById.get(entry.id) ?? [],
    }),
  );
  const artifactRegistryReport = await syncProjectArtifactRegistryReports(exportLineageReports);
  const appPackageCertificates = await listProjectAppPackageCertificates(dashboardProjectIds);
  const appPackageCertificateReport = createProjectAppPackageCertificateReport({
    artifactRegistryReport,
    certificates: appPackageCertificates,
    generatedAt,
    now,
  });
  const cadConversionJobs = await listProjectCadConversionJobs(dashboardProjectIds);
  const cadConversionQueueReport = createProjectCadConversionQueueReport(cadConversionJobs, generatedAt);
  const cadConversionExecutionQueue = createCadConversionExecutionQueue({
    generatedAt,
    jobs: cadConversionJobs,
    workspaceId,
  });
  const publicSurfaceHealthReportBase = createProjectPublicSurfaceHealthReport({
    batchId: getPublicSurfaceHealthBatchId(),
    generatedAt,
    lineageReports: exportLineageReports,
  });
  const publicSurfaceHealthResult = await recordProjectPublicSurfaceHealthReport({
    currentUserId: session.user.id,
    report: publicSurfaceHealthReportBase,
    workspaceId,
  });
  const publicSurfaceHealthReport = "error" in publicSurfaceHealthResult ? publicSurfaceHealthReportBase : publicSurfaceHealthResult.report;
  const securityComplianceReport = createWorkspaceSecurityComplianceReport({
    appPackageCertificateReport,
    artifactRegistryReport,
    exportLineageReports,
    folderAccessGrants: dashboardFolderAccessGrants,
    members: workspaceDashboard.members,
    projectAccessGrants: dashboardProjectAccessGrants,
    projects: dashboardProjects,
    retentionPolicies: dashboardRetentionPolicies,
    workspace: {
      id: workspaceDashboard.id,
      name: workspaceDashboard.name,
      role: workspaceDashboard.role,
    },
  });
  const roleAccessReviewCampaign = createRoleAccessReviewCampaignReport({
    activeSessionsByUserId: activeSessionsByUser,
    folderAccessGrants: dashboardFolderAccessGrants,
    generatedAt,
    members: workspaceDashboard.members,
    projectAccessGrants: dashboardProjectAccessGrants,
    projects: dashboardProjects,
    workspace: {
      id: workspaceDashboard.id,
      name: workspaceDashboard.name,
    },
  });
  const roleAccessReviewHistoryResult = canManageWorkspaceEmail
    ? await listWorkspaceRoleAccessReviewHistory({
        campaign: roleAccessReviewCampaign,
        currentUserId: session.user.id,
        workspaceId,
      })
    : null;
  const roleAccessReviewHistory = roleAccessReviewHistoryResult && !("error" in roleAccessReviewHistoryResult) ? roleAccessReviewHistoryResult.history : null;
  const workspaceTemplateResult = await listWorkspaceProjectTemplates({
    currentUserId: session.user.id,
    workspaceId,
  });
  const workspaceTemplates = "error" in workspaceTemplateResult ? [] : workspaceTemplateResult.templates;
  const sceneQaSnapshotReport = createSceneQaSnapshotReport({
    now,
    projects: dashboardProjects,
  });
  const sceneQaBaselineTrendResult = await recordWorkspaceSceneQaBaselineReport({
    currentUserId: session.user.id,
    report: sceneQaSnapshotReport,
    workspaceId,
  });
  const publishedCount = activeDashboardProjects.filter((entry) => entry.publishedAt).length;
  const dashboardAnalytics = createProjectDashboardAnalytics({
    comments: dashboardComments,
    now,
    projects: dashboardProjects,
  });
  const baseHealthNotificationCenter = createProjectHealthNotificationCenter({
    comments: dashboardComments,
    now,
    projects: dashboardProjects,
  });
  const healthNotificationStates = await listProjectHealthNotificationStates({
    notificationIds: baseHealthNotificationCenter.notifications.map((notification) => notification.id),
    userId: session.user.id,
  });
  const healthNotificationCenterWithStates = applyProjectHealthNotificationStates(baseHealthNotificationCenter, healthNotificationStates, now);
  const healthNotificationCenter = applyProjectHealthDeliveryPreferences(healthNotificationCenterWithStates, notificationPreferences);
  const baseCollaborationInbox = createProjectCollaborationInbox({
    comments: dashboardComments,
    currentUser: {
      email: session.user.email,
      id: session.user.id,
      name: session.user.name,
    },
    now,
    operationBatches: dashboardOperationBatches,
    projects: dashboardProjects,
  });
  const collaborationInbox = applyCollaborationInboxDeliveryPreferences(baseCollaborationInbox, notificationPreferences);
  const notificationEmailDeliveryResult = canManageWorkspaceEmail
    ? await enqueueWorkspaceNotificationEmailDeliveries({
        currentUserId: session.user.id,
        healthCenter: healthNotificationCenterWithStates,
        inbox: baseCollaborationInbox,
        workspaceId,
      })
    : await listWorkspaceNotificationEmailDeliveryReport({
        currentUserId: session.user.id,
        workspaceId,
      });
  const notificationEmailDeliveryReport =
    "error" in notificationEmailDeliveryResult
      ? createWorkspaceNotificationEmailDeliveryReport({ attempts: [], jobs: [], now })
      : notificationEmailDeliveryResult.report;
  const workspaceSloDashboard = createWorkspaceSloDashboard({
    cadConversionQueueReport,
    collaborationInbox: baseCollaborationInbox,
    collaborationOperationBatches: dashboardOperationBatches,
    collaborationWebSocketConfigured: Boolean(process.env.NEXT_PUBLIC_ESSENCE_COLLABORATION_WS_URL),
    emailDeliveryReport: notificationEmailDeliveryReport,
    generatedAt,
    publicSurfaceHealthReport,
  });
  const releaseReadinessChecklist = isAdmin ? createDashboardReleaseDeploymentChecklist() : null;
  const postDeploySmokeSummary = isAdmin ? createDashboardPostDeploySyntheticSmokeSummary() : null;
  const latestPostDeploySmokeReport = isAdmin ? readPostDeploySyntheticSmokeReport() : null;
  const postDeploySmokeReports = isAdmin
    ? [
        ...(latestPostDeploySmokeReport ? [latestPostDeploySmokeReport] : []),
        ...readPostDeploySyntheticSmokeHistory().filter((report) => report.generatedAt !== latestPostDeploySmokeReport?.generatedAt),
      ]
    : [];
  const projectIncidentHistory = createProjectIncidentHistory({
    now,
    postDeployReports: postDeploySmokeReports,
    projects: dashboardProjects,
  });
  const regressionWatchlist = createProjectRegressionWatchlist({
    cadConversionQueueReport,
    certificateReport: appPackageCertificateReport,
    generatedAt,
    incidentHistory: projectIncidentHistory,
    publicSurfaceHealthReport,
  });
  const regressionWatchlistStateResult = canManageWorkspaceEmail
    ? await listWorkspaceRegressionWatchlistItemStates({
        currentUserId: session.user.id,
        itemIds: regressionWatchlist.items.map((item) => item.id),
        workspaceId,
      })
    : null;
  const regressionWatchlistStates = regressionWatchlistStateResult && !("error" in regressionWatchlistStateResult) ? regressionWatchlistStateResult.states : [];
  const regressionWatchlistHistoryResult = canManageWorkspaceEmail
    ? await listWorkspaceRegressionWatchlistSnapshots({
        currentUserId: session.user.id,
        workspaceId,
      })
    : null;
  const regressionWatchlistHistory = regressionWatchlistHistoryResult && !("error" in regressionWatchlistHistoryResult) ? regressionWatchlistHistoryResult : null;
  const releaseCalendarResult = await syncWorkspaceReleaseCalendarMilestones({
    currentUserId: session.user.id,
    now,
    postDeploySummary: postDeploySmokeSummary,
    projects: dashboardProjects,
    releaseReadinessChecklist,
    workspaceId,
  });
  const releaseCalendarReport =
    "error" in releaseCalendarResult
      ? createWorkspaceReleaseCalendarReport({
          now,
          postDeploySummary: postDeploySmokeSummary,
          projects: dashboardProjects,
          releaseReadinessChecklist,
          workspaceId,
        })
      : releaseCalendarResult.report;
  const releaseRunbookReportBase = createWorkspaceReleaseRunbookReport({
    batchId: getWorkspaceReleaseRunbookBatchId(),
    generatedAt,
    members: workspaceDashboard.members,
    releaseCalendar: releaseCalendarReport,
    workspaceId,
  });
  const releaseRunbookResult = await recordWorkspaceReleaseRunbookReport({
    currentUserId: session.user.id,
    report: releaseRunbookReportBase,
    workspaceId,
  });
  const releaseRunbookReport = "error" in releaseRunbookResult ? releaseRunbookReportBase : releaseRunbookResult.report;
  const auditSearchRows = isAdmin ? await loadProjectAuditSearchRows(dashboardProjects) : [];
  const workspaceRiskDigest = createWorkspaceRiskDigest({
    auditRows: auditSearchRows,
    generatedAt,
    incidents: projectIncidentHistory,
    publicHealth: publicSurfaceHealthReport,
    runbook: releaseRunbookReport,
    trust: securityComplianceReport,
    workspace: {
      id: workspaceDashboard.id,
      name: workspaceDashboard.name,
      role: workspaceDashboard.role,
    },
  });
  const workspaceRiskDigestHistoryResult = canManageWorkspaceEmail
    ? await listWorkspaceRiskDigestPacketHistory({
        currentUserId: session.user.id,
        workspaceId,
      })
    : null;
  const workspaceRiskDigestHistory = workspaceRiskDigestHistoryResult && !("error" in workspaceRiskDigestHistoryResult) ? workspaceRiskDigestHistoryResult : null;
  const releaseEvidenceBundlePreview = createReleaseEvidenceBundlePreview({
    cadConversionQueueReport,
    certificateReport: appPackageCertificateReport,
    complianceReportCount: activeDashboardProjects.length,
    projectCount: activeDashboardProjects.length,
    publicSurfaceHealthReport,
    riskDigest: workspaceRiskDigest,
    runbookReport: releaseRunbookReport,
  });
  const deployPromotionDecisionBoard = createDeployPromotionDecisionBoard({
    generatedAt,
    postDeploySummary: postDeploySmokeSummary,
    releaseCalendar: releaseCalendarReport,
    riskDigest: workspaceRiskDigest,
    runbook: releaseRunbookReport,
  });
  const releaseDrillSimulationReport = createReleaseDrillSimulationReport({
    cadConversionQueueReport,
    certificateReport: appPackageCertificateReport,
    generatedAt,
    postDeploySummary: postDeploySmokeSummary,
    releaseCalendar: releaseCalendarReport,
    releaseRunbook: releaseRunbookReport,
  });
  const releaseDrillHistoryResult = canManageWorkspaceEmail
    ? await listWorkspaceReleaseDrillHistory({
        currentUserId: session.user.id,
        workspaceId,
      })
    : null;
  const releaseDrillHistory = releaseDrillHistoryResult && !("error" in releaseDrillHistoryResult) ? releaseDrillHistoryResult : null;
  const backupRestoreRehearsal = createWorkspaceBackupRestoreRehearsalReport({
    artifactRegistryReport,
    auditSearchResult: createProjectAuditSearchResult(auditSearchRows, createDefaultProjectAuditSearchFilters()),
    generatedAt,
    projectCount: activeDashboardProjects.length,
    releaseEvidenceBundleSummary: releaseEvidenceBundlePreview,
    releaseRunbookReport,
    workspaceName: workspaceDashboard.name,
  });
  const incidentPostmortemReport = createProjectIncidentPostmortemReport({
    generatedAt,
    incidentHistory: projectIncidentHistory,
    postDeploySummary: postDeploySmokeSummary,
    releaseDrillHistory,
    releaseRunbookReport,
  });
  const runtimeVersionWatchlist = createRuntimeVersionWatchlistReport({
    dependencies: packageJson.dependencies,
    devDependencies: packageJson.devDependencies,
    generatedAt,
    runtime: {
      bun: (process.versions as Record<string, string | undefined>).bun ?? null,
      node: process.versions.node,
    },
    scripts: packageJson.scripts,
  });
  const freeTierResourceMonitor = createFreeTierResourceMonitorReport({
    artifactRegistryReport,
    cadConversionQueueReport,
    emailDeliveryReport: notificationEmailDeliveryReport,
    generatedAt,
    postDeploySummary: postDeploySmokeSummary,
    releaseDeploymentChecklist: releaseReadinessChecklist,
  });
  const releaseArchiveExplorer = createReleaseArchiveExplorerReport({
    backupRestoreRehearsal,
    freeTierResourceMonitor,
    generatedAt,
    hasReleaseEvidenceBundleDownload: canManageWorkspaceEmail && activeDashboardProjects.length > 0,
    incidentPostmortemReport,
    releaseDrillHistory,
    releaseEvidenceBundleSummary: releaseEvidenceBundlePreview,
    workspaceId,
  });
  const reviewerHandoffPacket = createReviewerHandoffPacketReport({
    archiveExplorer: releaseArchiveExplorer,
    generatedAt,
    ownerAttestations: releaseArchiveExplorer.rows
      .filter((row) => row.status === "ready")
      .map((row) => ({
        ownerHint: row.ownerHint,
        signedBy: session.user.name ?? session.user.email ?? "Workspace manager",
        signedOffAt: generatedAt,
        sourceId: row.id,
      })),
    releaseEvidenceBundleSummary: releaseEvidenceBundlePreview,
    riskDigest: workspaceRiskDigest,
  });
  const auditEvidencePacketCandidates = [
    createUnsignedAuditEvidencePacket({
      body: reviewerHandoffPacket.packetJson,
      createdAt: reviewerHandoffPacket.generatedAt,
      packetId: reviewerHandoffPacket.packetId,
      packetKind: "reviewer-handoff",
      sourceLabel: "Reviewer handoff packet",
    }),
    createUnsignedAuditEvidencePacket({
      body: createWorkspaceRiskDigestJson(workspaceRiskDigest),
      createdAt: workspaceRiskDigest.generatedAt,
      packetId: workspaceRiskDigest.packetId,
      packetKind: "risk-digest",
      sourceLabel: "Workspace risk digest",
    }),
  ];
  const signedAuditEvidencePacketVerification = createSignedAuditEvidencePacketVerificationReport({
    generatedAt,
    packets: attachSignedAuditEvidencePacketSignatures(auditEvidencePacketCandidates, parseSignedAuditEvidencePacketSignaturesJson(process.env.AUDIT_EVIDENCE_PACKET_SIGNATURES_JSON)),
    publicKeys: parseAuditEvidencePublicKeyRingJson(process.env.AUDIT_EVIDENCE_PUBLIC_KEYS_JSON),
    workspaceId,
  });
  const packetBodiesById = new Map(auditEvidencePacketCandidates.map((packet) => [`${packet.packetKind}:${packet.packetId}`, packet.body]));
  const compliancePacketShareSources = signedAuditEvidencePacketVerification.rows.map((row) => ({
    contentHash: row.contentHash,
    keyId: row.keyId,
    packetBody: packetBodiesById.get(`${row.packetKind}:${row.packetId}`) ?? null,
    packetId: row.packetId,
    packetKind: row.packetKind,
    signedAt: row.signedAt,
    signer: row.signer,
    sourceLabel: row.sourceLabel,
    status: row.status,
    verificationState: row.verificationState,
  }));
  const compliancePacketShareHistoryResult = canManageWorkspaceEmail
    ? await listWorkspaceCompliancePacketShares({
        currentUserId: session.user.id,
        workspaceId,
      })
    : null;
  const compliancePacketShareHistory = compliancePacketShareHistoryResult && !("error" in compliancePacketShareHistoryResult) ? compliancePacketShareHistoryResult : null;
  const policyAsCodeReport = createPolicyAsCodeReport({
    generatedAt,
    projects: dashboardProjects,
    publicSurfaceHealthReport,
    releaseArchiveExplorer,
    retentionPolicies: dashboardRetentionPolicies,
    reviewerHandoffPacket,
    securityComplianceReport,
    workspaceRiskDigest,
  });
  const governanceTimelineReport = createGovernanceTimelineReport({
    auditRows: auditSearchRows,
    freeTierResourceMonitor,
    generatedAt,
    incidentHistory: projectIncidentHistory,
    postmortemReport: incidentPostmortemReport,
    releaseDrillHistory,
    sloDashboard: workspaceSloDashboard,
  });
  const governanceExceptionWorkflow = createGovernanceExceptionWorkflow({
    exceptionRequests: [],
    generatedAt,
    governanceTimelineReport,
    policyAsCodeReport,
  });
  const scenePermissionPolicyTemplatesReport = createScenePermissionPolicyTemplateReport({
    generatedAt,
    projects: dashboardProjects,
  });
  const workspaceEvidenceGraph = createWorkspaceEvidenceGraph({
    artifactRegistryReport,
    auditRows: auditSearchRows,
    generatedAt,
    governanceTimelineReport,
    incidentHistory: projectIncidentHistory,
    policyAsCodeReport,
    releaseEvidenceBundleSummary: releaseEvidenceBundlePreview,
    reviewerHandoffPacket,
  });
  const workspaceMaintenanceCommandCenter = createWorkspaceMaintenanceCommandCenterReport({
    activeSessionsByUserId: activeSessionsByUser,
    artifactRegistryReport,
    generatedAt,
    members: workspaceDashboard.members,
    projects: dashboardProjects,
    releaseArchiveExplorer,
  });
  const desktopReleaseOperations = canManageWorkspaceEmail ? createDesktopReleaseOperationsSnapshot(origin) : null;
  const deploymentEnvironmentDrift = canManageWorkspaceEmail
    ? createDeploymentEnvironmentDriftMonitor({
        env: process.env,
        expectedBrevoSenderEmail: "ajju40959@gmail.com",
        expectedVercelProjectName: process.env.VERCEL_PROJECT_NAME || "essence-spline",
        generatedAt,
        releaseDeploymentChecklist: releaseReadinessChecklist,
        releaseOperationsDashboard: desktopReleaseOperations?.dashboard ?? null,
      })
    : null;
  const releaseReadinessWebhooks = canManageWorkspaceEmail
    ? createReleaseReadinessWebhookReportFromSources({
        emailDeliveryReport: notificationEmailDeliveryReport,
        generatedAt,
        postDeploySummary: postDeploySmokeSummary,
        releaseDeploymentChecklist: releaseReadinessChecklist,
        releaseOperationsDashboard: desktopReleaseOperations?.dashboard ?? null,
        workspaceId,
      })
    : null;
  const releaseReadinessWebhookHistoryResult = canManageWorkspaceEmail
    ? await listWorkspaceReleaseReadinessWebhookHistory({
        currentUserId: session.user.id,
        workspaceId,
      })
    : null;
  const releaseReadinessWebhookHistory =
    releaseReadinessWebhookHistoryResult && !("error" in releaseReadinessWebhookHistoryResult) ? releaseReadinessWebhookHistoryResult : null;
  const operationalAnomalyDetection = canManageWorkspaceEmail
    ? createOperationalAnomalyDetectionReport({
        cadConversionQueueReport,
        emailDeliveryReport: notificationEmailDeliveryReport,
        generatedAt,
        publicSurfaceHealthReport,
        releaseReadinessWebhookHistory,
        releaseReadinessWebhooks,
        workspaceId,
        workspaceSloDashboard,
      })
    : null;
  const costQuotaForecast = canManageWorkspaceEmail
    ? createCostQuotaForecastSimulator({
        deploymentEnvironmentDrift,
        freeTierResourceMonitor,
        generatedAt,
        releaseCalendar: releaseCalendarReport,
      })
    : null;
  const workspacePolicySimulation = canManageWorkspaceEmail
    ? createWorkspacePolicySimulationReportFromSources({
        activeProjectCount: activeDashboardProjects.length,
        costQuotaForecast,
        generatedAt,
        memberCount: workspaceDashboard.members.length,
        policyAsCodeReport,
        releaseReadinessWebhooks,
        workspaceId,
      })
    : null;
  const executiveReleaseIntelligence = canManageWorkspaceEmail
    ? createExecutiveReleaseIntelligenceReport({
        costQuotaForecast,
        deployPromotionDecisionBoard,
        generatedAt,
        governanceTimelineReport,
        incidentHistory: projectIncidentHistory,
        operationalAnomalyDetection,
        releaseEvidenceBundleSummary: releaseEvidenceBundlePreview,
        releaseReadinessWebhooks,
        workspaceEvidenceGraph,
        workspaceId,
        workspacePolicySimulation,
        workspaceRiskDigest,
      })
    : null;
  const executiveReleaseSnapshotHistoryResult = executiveReleaseIntelligence
    ? await listWorkspaceExecutiveReleaseSnapshotHistory({
        currentUserId: session.user.id,
        workspaceId,
      })
    : null;
  const executiveReleaseSnapshotHistory =
    executiveReleaseSnapshotHistoryResult && !("error" in executiveReleaseSnapshotHistoryResult) ? executiveReleaseSnapshotHistoryResult : null;
  const executiveActionOwnership = executiveReleaseIntelligence
    ? createExecutiveActionOwnershipMatrix({
        executiveReleaseIntelligence,
        generatedAt,
        releaseCalendar: releaseCalendarReport,
        releaseRunbook: releaseRunbookReport,
        workspaceId,
      })
    : null;
  const releaseScenarioComparison = executiveReleaseIntelligence
    ? createReleaseScenarioComparisonReport({
        costQuotaForecast,
        executiveActionOwnership,
        executiveReleaseIntelligence,
        generatedAt,
        incidentHistory: projectIncidentHistory,
        releaseDrillSimulation: releaseDrillSimulationReport,
        workspaceId,
      })
    : null;
  const releaseControlRoomTimeline = executiveReleaseIntelligence
    ? createReleaseControlRoomTimeline({
        executiveActionOwnership,
        generatedAt,
        incidentHistory: projectIncidentHistory,
        postDeploySummary: postDeploySmokeSummary,
        releaseReadinessWebhookHistory,
        releaseReadinessWebhooks,
        releaseRunbook: releaseRunbookReport,
        workspaceId,
      })
    : null;
  const boardApprovalPacket = executiveReleaseIntelligence
    ? createBoardApprovalPacket({
        executiveActionOwnership,
        executiveReleaseIntelligence,
        executiveReleaseSnapshotHistory,
        generatedAt,
        releaseControlRoomTimeline,
        releaseScenarioComparison,
        workspaceId,
      })
    : null;
  const boardApprovalPacketHistoryResult =
    boardApprovalPacket && canManageWorkspaceEmail
      ? await listWorkspaceBoardApprovalPacketHistory({
          currentUserId: session.user.id,
          workspaceId,
        })
      : null;
  const boardApprovalPacketHistory = boardApprovalPacketHistoryResult && !("error" in boardApprovalPacketHistoryResult) ? boardApprovalPacketHistoryResult : null;
  const boardApprovalAgenda = boardApprovalPacket
    ? createBoardApprovalMeetingAgenda({
        boardApprovalPacket,
        executiveActionOwnership,
        generatedAt,
        releaseControlRoomTimeline,
        releaseScenarioComparison,
        workspaceId,
      })
    : null;
  const boardApprovalDiff = boardApprovalPacket
    ? createBoardApprovalPacketDiffReport({
        currentPacket: boardApprovalPacket,
        executiveSnapshotHistory: executiveReleaseSnapshotHistory,
        generatedAt,
        packetHistory: boardApprovalPacketHistory,
        workspaceId,
      })
    : null;
  const boardApprovalRedactionPolicies = boardApprovalPacket
    ? createBoardApprovalRedactionPolicyReport({
        boardApprovalAgenda,
        boardApprovalDiff,
        boardApprovalPacket,
        generatedAt,
        workspaceId,
      })
    : null;
  const boardApprovalCirculationQueue = boardApprovalRedactionPolicies
    ? createBoardApprovalPacketCirculationQueueReport({
        generatedAt,
        packetHistory: boardApprovalPacketHistory,
        redactionPolicies: boardApprovalRedactionPolicies,
        workspaceId,
      })
    : null;
  const boardApprovalPostApprovalTracker = boardApprovalPacket
    ? createBoardApprovalPostApprovalTracker({
        boardApprovalAgenda,
        boardApprovalPacket,
        generatedAt,
        releaseCalendar: releaseCalendarReport,
        releaseRunbook: releaseRunbookReport,
        workspaceId,
      })
    : null;
  const boardApprovalSlaReminders = boardApprovalPostApprovalTracker
    ? createBoardApprovalSlaReminderReport({
        now,
        tracker: boardApprovalPostApprovalTracker,
        workspaceId,
      })
    : null;
  const boardApprovalSlaEmailDeliveryResult =
    boardApprovalSlaReminders && canManageWorkspaceEmail
      ? await enqueueWorkspaceBoardApprovalSlaReminderEmailDeliveries({
          currentUserId: session.user.id,
          reminders: boardApprovalSlaReminders,
          workspaceId,
        })
      : null;
  const boardAwareNotificationEmailDeliveryReport =
    boardApprovalSlaEmailDeliveryResult && !("error" in boardApprovalSlaEmailDeliveryResult) ? boardApprovalSlaEmailDeliveryResult.report : notificationEmailDeliveryReport;
  const boardAwareNotificationEmailDeliveryError =
    boardApprovalSlaEmailDeliveryResult && "error" in boardApprovalSlaEmailDeliveryResult
      ? boardApprovalSlaEmailDeliveryResult.error
      : "error" in notificationEmailDeliveryResult
        ? notificationEmailDeliveryResult.error
        : null;
  const boardDecisionReplayAudit = boardApprovalDiff
    ? createBoardDecisionReplayAuditReport({
        boardApprovalDiff,
        generatedAt,
        incidentHistory: projectIncidentHistory,
        packetHistory: boardApprovalPacketHistory,
        releaseEvidenceSummary: releaseEvidenceBundlePreview,
        releaseRunbook: releaseRunbookReport,
        workspaceId,
      })
    : null;
  const boardDecisionReplaySnapshotHistoryResult =
    boardDecisionReplayAudit && canManageWorkspaceEmail
      ? await listWorkspaceBoardDecisionReplaySnapshotHistory({
          currentUserId: session.user.id,
          workspaceId,
        })
      : null;
  const boardDecisionReplaySnapshotHistory =
    boardDecisionReplaySnapshotHistoryResult && !("error" in boardDecisionReplaySnapshotHistoryResult) ? boardDecisionReplaySnapshotHistoryResult : null;
  const boardAssuranceExceptionWorkflow = boardDecisionReplayAudit
    ? createBoardAssuranceExceptionWorkflow({
        exceptionRequests: [],
        generatedAt,
        releaseCalendar: releaseCalendarReport,
        replayAudit: boardDecisionReplayAudit,
      })
    : null;
  const boardAssuranceEvidenceBundle = boardDecisionReplayAudit
    ? createBoardAssuranceEvidenceBundleReport({
        approvalHistory: boardApprovalPacketHistory,
        exceptionWorkflow: boardAssuranceExceptionWorkflow,
        generatedAt,
        incidentPostmortemReport,
        replayAudit: boardDecisionReplayAudit,
        replaySnapshotHistory: boardDecisionReplaySnapshotHistory,
        runbookReport: releaseRunbookReport,
        workspaceId,
      })
    : null;
  const boardReleaseVarianceDashboard = boardDecisionReplayAudit
    ? createBoardReleaseVarianceDashboard({
        approvalHistory: boardApprovalPacketHistory,
        evidenceBundle: boardAssuranceEvidenceBundle,
        generatedAt,
        incidentPostmortemReport,
        replayAudit: boardDecisionReplayAudit,
        replaySnapshotHistory: boardDecisionReplaySnapshotHistory,
        runbookReport: releaseRunbookReport,
        workspaceId,
      })
    : null;
  const boardEvidenceAcceptanceCampaign =
    boardDecisionReplayAudit && boardAssuranceEvidenceBundle
      ? createBoardEvidenceAcceptanceCampaign({
          evidenceBundle: boardAssuranceEvidenceBundle,
          exceptionWorkflow: boardAssuranceExceptionWorkflow,
          generatedAt,
          replayAudit: boardDecisionReplayAudit,
          workspaceId,
        })
      : null;
  const boardApprovalScenarioForecast = boardReleaseVarianceDashboard
    ? createBoardApprovalScenarioForecast({
        acceptanceCampaign: boardEvidenceAcceptanceCampaign,
        exceptionWorkflow: boardAssuranceExceptionWorkflow,
        generatedAt,
        varianceDashboard: boardReleaseVarianceDashboard,
        workspaceId,
      })
    : null;
  const boardAssuranceNotificationRouting =
    boardDecisionReplayAudit && boardAssuranceEvidenceBundle
      ? createBoardAssuranceNotificationRoutingReport({
          evidenceBundle: boardAssuranceEvidenceBundle,
          exceptionWorkflow: boardAssuranceExceptionWorkflow,
          generatedAt,
          members: workspaceDashboard.members,
          preferencesByUserId: new Map([[session.user.id, notificationPreferences]]),
          replayAudit: boardDecisionReplayAudit,
          varianceDashboard: boardReleaseVarianceDashboard,
          workspaceId,
        })
      : null;
  const boardAssuranceNotificationHistoryResult =
    boardAssuranceNotificationRouting && canManageWorkspaceEmail
      ? await listWorkspaceBoardAssuranceNotificationHistory({
          currentUserId: session.user.id,
          workspaceId,
        })
      : null;
  const boardAssuranceNotificationHistory =
    boardAssuranceNotificationHistoryResult && !("error" in boardAssuranceNotificationHistoryResult) ? boardAssuranceNotificationHistoryResult : null;
  const boardAssuranceAuditExport =
    boardAssuranceEvidenceBundle && boardAssuranceNotificationRouting && boardReleaseVarianceDashboard
      ? createBoardAssuranceAuditExport({
          evidenceBundle: boardAssuranceEvidenceBundle,
          generatedAt,
          notificationHistory: boardAssuranceNotificationHistory,
          notificationRouting: boardAssuranceNotificationRouting,
          replaySnapshotHistory: boardDecisionReplaySnapshotHistory,
          varianceDashboard: boardReleaseVarianceDashboard,
          workspaceId,
        })
      : null;
  const boardEvidenceFreshnessMonitor =
    boardApprovalPacketHistory || boardDecisionReplaySnapshotHistory || boardAssuranceNotificationHistory || boardAssuranceNotificationRouting
      ? createBoardEvidenceFreshnessMonitor({
          generatedAt,
          notificationHistory: boardAssuranceNotificationHistory,
          packetHistory: boardApprovalPacketHistory,
          replaySnapshotHistory: boardDecisionReplaySnapshotHistory,
          routing: boardAssuranceNotificationRouting,
          workspaceId,
        })
      : null;
  const boardOperationsReviewCycles =
    boardApprovalPacketHistory?.records.slice(0, 4).map((record) => {
      const status: BoardOperationsControlStatus =
        record.status === "revoked" || record.approvalStatus === "blocked" ? "blocked" : record.approvalStatus === "watch" ? "watch" : "ready";

      return {
        id: record.id,
        label: record.recipientPurpose,
        owner: record.createdBy.name ?? record.createdBy.email ?? "Board operations",
        savedAt: record.updatedAt,
        status,
      };
    }) ?? [];
  const boardOperationsControlCenter =
    boardAssuranceAuditExport || boardApprovalAgenda || boardApprovalPacketHistory || boardAssuranceNotificationRouting || boardApprovalScenarioForecast
      ? createBoardOperationsControlCenter({
          agenda: boardApprovalAgenda,
          auditExport: boardAssuranceAuditExport,
          generatedAt,
          packetHistory: boardApprovalPacketHistory,
          reviewCycles: boardOperationsReviewCycles,
          routing: boardAssuranceNotificationRouting,
          scenarioForecast: boardApprovalScenarioForecast,
          workspaceId,
        })
      : null;
  const boardGovernanceDecisionLedger =
    boardOperationsControlCenter || boardAssuranceAuditExport || boardApprovalAgenda || boardApprovalPacketHistory || boardAssuranceExceptionWorkflow
      ? createBoardGovernanceDecisionLedger({
          agenda: boardApprovalAgenda,
          auditExport: boardAssuranceAuditExport,
          controlCenter: boardOperationsControlCenter,
          exceptionWorkflow: boardAssuranceExceptionWorkflow,
          generatedAt,
          packetHistory: boardApprovalPacketHistory,
          workspaceId,
        })
      : null;
  const boardReviewerWorkloadBalancing =
    boardApprovalAgenda || boardApprovalPacketHistory || boardAssuranceNotificationHistory || boardAssuranceExceptionWorkflow
      ? createBoardReviewerWorkloadBalancingReport({
          agenda: boardApprovalAgenda,
          exceptionWorkflow: boardAssuranceExceptionWorkflow,
          generatedAt,
          notificationHistory: boardAssuranceNotificationHistory,
          packetHistory: boardApprovalPacketHistory,
          workspaceId,
        })
      : null;
  const boardGovernanceExecutiveDigest =
    boardOperationsControlCenter || boardGovernanceDecisionLedger || boardEvidenceFreshnessMonitor || boardReviewerWorkloadBalancing
      ? createBoardGovernanceExecutiveDigest({
          controlCenter: boardOperationsControlCenter,
          decisionLedger: boardGovernanceDecisionLedger,
          freshnessMonitor: boardEvidenceFreshnessMonitor,
          generatedAt,
          reviewerWorkload: boardReviewerWorkloadBalancing,
          workspaceId,
        })
      : null;
  const boardAuditTaskStateResult = canManageWorkspaceEmail
    ? await listWorkspaceBoardAuditTaskStates({
        currentUserId: session.user.id,
        workspaceId,
      })
    : null;
  const boardAuditTaskStates = boardAuditTaskStateResult && !("error" in boardAuditTaskStateResult) ? boardAuditTaskStateResult.states : [];
  const boardAuditTaskRecordResult = canManageWorkspaceEmail
    ? await listWorkspaceBoardAuditTaskRecords({
        currentUserId: session.user.id,
        workspaceId,
      })
    : null;
  const boardAuditTaskRecords = boardAuditTaskRecordResult && !("error" in boardAuditTaskRecordResult) ? boardAuditTaskRecordResult.records : [];
  const boardAuditFollowUpTasks =
    boardGovernanceExecutiveDigest || boardGovernanceDecisionLedger || boardEvidenceFreshnessMonitor || boardReviewerWorkloadBalancing
      ? applyBoardAuditTaskPersistence(
          createBoardAuditFollowUpTasksReport({
            decisionLedger: boardGovernanceDecisionLedger,
            executiveDigest: boardGovernanceExecutiveDigest,
            freshnessMonitor: boardEvidenceFreshnessMonitor,
            generatedAt,
            reviewerWorkload: boardReviewerWorkloadBalancing,
            workspaceId,
          }),
          boardAuditTaskStates,
        )
      : null;
  const boardAuditReminderRouting = boardAuditFollowUpTasks
    ? createBoardAuditReminderRoutingReport({
        generatedAt,
        members: workspaceDashboard.members,
        preferencesByUserId: new Map([[session.user.id, notificationPreferences]]),
        report: boardAuditFollowUpTasks,
        workspaceId,
      })
    : null;
  const boardAuditCompletionDigest = boardAuditFollowUpTasks
    ? createBoardAuditCompletionDigest({
        generatedAt,
        records: boardAuditTaskRecords,
        reminderRouting: boardAuditReminderRouting,
        report: boardAuditFollowUpTasks,
        workspaceId,
      })
    : null;
  const boardAuditEvidenceManifest = boardAuditFollowUpTasks
    ? createBoardAuditEvidenceAttachmentManifest({
        evidenceFiles: boardAssuranceEvidenceBundle?.files ?? [],
        generatedAt,
        report: boardAuditFollowUpTasks,
        workspaceId,
      })
    : null;
  const boardAuditEvidenceVerification = boardAuditEvidenceManifest
    ? createBoardAuditEvidenceVerificationReport({
        generatedAt,
        manifest: boardAuditEvidenceManifest,
        signedPacketVerification: signedAuditEvidencePacketVerification,
        workspaceId,
      })
    : null;
  const boardAuditEvidenceAcceptance =
    boardAuditEvidenceManifest && boardAuditEvidenceVerification
      ? createBoardAuditEvidenceAcceptanceWorkflow({
          acceptances: [],
          generatedAt,
          manifest: boardAuditEvidenceManifest,
          verification: boardAuditEvidenceVerification,
          workspaceId,
        })
      : null;
  const boardAuditEvidenceReadiness =
    boardAuditEvidenceManifest && boardAuditEvidenceVerification && boardAuditEvidenceAcceptance
      ? createBoardAuditEvidenceReadinessDigest({
          acceptance: boardAuditEvidenceAcceptance,
          generatedAt,
          manifest: boardAuditEvidenceManifest,
          verification: boardAuditEvidenceVerification,
          workspaceId,
        })
      : null;
  const boardEvidenceCommandCenter =
    boardAuditEvidenceManifest && boardAuditEvidenceVerification && boardAuditEvidenceAcceptance && boardAuditEvidenceReadiness
      ? createBoardEvidenceCommandCenter({
          acceptance: boardAuditEvidenceAcceptance,
          generatedAt,
          manifest: boardAuditEvidenceManifest,
          readiness: boardAuditEvidenceReadiness,
          verification: boardAuditEvidenceVerification,
          workspaceId,
        })
      : null;
  const boardEvidenceReadinessSnapshots = boardAuditEvidenceReadiness
    ? createBoardEvidenceReadinessSnapshotHistoryReport([
        createBoardEvidenceReadinessSnapshotRecord({
          actor: {
            email: session.user.email ?? null,
            name: session.user.name ?? null,
            userId: session.user.id,
          },
          createdAt: generatedAt,
          digest: boardAuditEvidenceReadiness,
          workspaceId,
        }),
      ])
    : null;
  const boardEvidenceEscalationRouting = boardAuditEvidenceReadiness
    ? createBoardEvidenceEscalationRoutingReport({
        generatedAt,
        members: workspaceDashboard.members,
        preferencesByUserId: new Map([[session.user.id, notificationPreferences]]),
        readiness: boardAuditEvidenceReadiness,
        workspaceId,
      })
    : null;
  const boardEvidencePacketLock = boardAuditEvidenceAcceptance
    ? createBoardEvidencePacketLockReport({
        acceptance: boardAuditEvidenceAcceptance,
        generatedAt,
        lockActor: {
          email: session.user.email ?? null,
          name: session.user.name ?? null,
          userId: session.user.id,
        },
        releasePromotionId: boardApprovalPacket?.packetId ?? null,
        workspaceId,
      })
    : null;
  const boardEvidenceCloseoutReport =
    boardAuditEvidenceManifest && boardAuditEvidenceVerification && boardAuditEvidenceAcceptance && boardAuditEvidenceReadiness && boardEvidencePacketLock
      ? createBoardEvidenceCloseoutReport({
          acceptance: boardAuditEvidenceAcceptance,
          generatedAt,
          manifest: boardAuditEvidenceManifest,
          packetLock: boardEvidencePacketLock,
          readiness: boardAuditEvidenceReadiness,
          verification: boardAuditEvidenceVerification,
          workspaceId,
        })
      : null;
  const boardEvidenceReleaseApprovalHandoff =
    boardEvidenceCloseoutReport && boardEvidencePacketLock
      ? createBoardEvidenceReleaseApprovalHandoffReport({
          closeout: boardEvidenceCloseoutReport,
          generatedAt,
          members: workspaceDashboard.members,
          packetLock: boardEvidencePacketLock,
          releasePromotionId: boardApprovalPacket?.packetId ?? null,
          workspaceId,
        })
      : null;
  const boardEvidenceReleasePromotionGate =
    boardEvidenceCloseoutReport && boardEvidencePacketLock && boardEvidenceReleaseApprovalHandoff
      ? createBoardEvidenceReleasePromotionGateReport({
          closeout: boardEvidenceCloseoutReport,
          escalationRouting: boardEvidenceEscalationRouting,
          generatedAt,
          handoff: boardEvidenceReleaseApprovalHandoff,
          packetLock: boardEvidencePacketLock,
          releasePromotionId: boardApprovalPacket?.packetId ?? null,
          workspaceId,
        })
      : null;
  const boardEvidenceReleaseArchiveRecords =
    boardEvidenceCloseoutReport && boardEvidenceReleasePromotionGate
      ? createBoardEvidenceReleaseArchiveRecordReport({
          actor: {
            email: session.user.email ?? null,
            name: session.user.name ?? null,
            userId: session.user.id,
          },
          closeout: boardEvidenceCloseoutReport,
          generatedAt,
          promotionGate: boardEvidenceReleasePromotionGate,
          workspaceId,
        })
      : null;
  const boardEvidenceReleaseVariance =
    boardEvidenceReleaseArchiveRecords && boardEvidenceCloseoutReport && boardAuditEvidenceReadiness
      ? createBoardEvidenceReleaseVarianceReport({
          archive: boardEvidenceReleaseArchiveRecords,
          closeout: boardEvidenceCloseoutReport,
          generatedAt,
          readiness: boardAuditEvidenceReadiness,
          workspaceId,
        })
      : null;
  const boardEvidenceReleaseCloseoutNotifications =
    boardEvidenceReleaseApprovalHandoff && boardEvidenceReleaseVariance
      ? createBoardEvidenceReleaseCloseoutNotificationReport({
          generatedAt,
          handoff: boardEvidenceReleaseApprovalHandoff,
          members: workspaceDashboard.members,
          preferencesByUserId: new Map([[session.user.id, notificationPreferences]]),
          variance: boardEvidenceReleaseVariance,
          workspaceId,
        })
      : null;
  const boardReleaseOperationsHistory =
    boardEvidenceReleaseArchiveRecords && boardEvidenceReleaseCloseoutNotifications && boardEvidenceReleasePromotionGate && boardEvidenceReleaseVariance
      ? createBoardReleaseOperationsHistoryReport({
          archive: boardEvidenceReleaseArchiveRecords,
          generatedAt,
          notifications: boardEvidenceReleaseCloseoutNotifications,
          promotionGate: boardEvidenceReleasePromotionGate,
          variance: boardEvidenceReleaseVariance,
          workspaceId,
        })
      : null;
  const boardReleaseOperationsReviewQueue = boardReleaseOperationsHistory
    ? createBoardReleaseOperationsReviewQueueReport({
        generatedAt,
        history: boardReleaseOperationsHistory,
        members: workspaceDashboard.members,
        workspaceId,
      })
    : null;
  const boardReleaseOperationsApprovalSnapshots =
    boardEvidenceReleasePromotionGate && boardReleaseOperationsHistory && boardReleaseOperationsReviewQueue
      ? createBoardReleaseOperationsApprovalSnapshotReport({
          currentGate: boardEvidenceReleasePromotionGate,
          generatedAt,
          history: boardReleaseOperationsHistory,
          queue: boardReleaseOperationsReviewQueue,
          workspaceId,
        })
      : null;
  const boardReleaseOperationsExportPackets =
    boardEvidenceReleaseArchiveRecords &&
    boardEvidenceReleaseCloseoutNotifications &&
    boardEvidenceReleaseVariance &&
    boardReleaseOperationsApprovalSnapshots &&
    boardReleaseOperationsHistory &&
    boardReleaseOperationsReviewQueue
      ? createBoardReleaseOperationsExportPacketReport({
          approvalSnapshots: boardReleaseOperationsApprovalSnapshots,
          archive: boardEvidenceReleaseArchiveRecords,
          generatedAt,
          history: boardReleaseOperationsHistory,
          notifications: boardEvidenceReleaseCloseoutNotifications,
          queue: boardReleaseOperationsReviewQueue,
          signerName: workspaceDashboard.members.find((member) => member.role === "owner" || member.role === "admin")?.name,
          variance: boardEvidenceReleaseVariance,
          workspaceId,
        })
      : null;
  const boardReleaseOperationsDashboardFilters =
    boardReleaseOperationsApprovalSnapshots && boardReleaseOperationsExportPackets && boardReleaseOperationsHistory && boardReleaseOperationsReviewQueue
      ? createBoardReleaseOperationsDashboardFilterReport({
          approvalSnapshots: boardReleaseOperationsApprovalSnapshots,
          exportPackets: boardReleaseOperationsExportPackets,
          generatedAt,
          history: boardReleaseOperationsHistory,
          queue: boardReleaseOperationsReviewQueue,
          workspaceId,
        })
      : null;
  const boardReleaseDistributionRecipientManifests =
    boardEvidenceReleaseCloseoutNotifications && boardReleaseOperationsExportPackets
      ? createBoardReleaseDistributionRecipientManifestReport({
          exportPackets: boardReleaseOperationsExportPackets,
          generatedAt,
          members: workspaceDashboard.members,
          notifications: boardEvidenceReleaseCloseoutNotifications,
          workspaceId,
        })
      : null;
  const boardReleaseDistributionAcknowledgements = boardReleaseDistributionRecipientManifests
    ? createBoardReleaseDistributionAcknowledgementReport({
        generatedAt,
        manifests: boardReleaseDistributionRecipientManifests,
        workspaceId,
      })
    : null;
  const boardReleaseDistributionRetryPlanning =
    boardReleaseDistributionAcknowledgements && boardReleaseDistributionRecipientManifests
      ? createBoardReleaseDistributionRetryPlanningReport({
          acknowledgements: boardReleaseDistributionAcknowledgements,
          generatedAt,
          manifests: boardReleaseDistributionRecipientManifests,
          workspaceId,
        })
      : null;
  const boardReleaseDistributionAuditTimeline =
    boardEvidenceReleaseVariance &&
    boardReleaseDistributionAcknowledgements &&
    boardReleaseDistributionRecipientManifests &&
    boardReleaseDistributionRetryPlanning &&
    boardReleaseOperationsExportPackets
      ? createBoardReleaseDistributionAuditTimelineReport({
          acknowledgements: boardReleaseDistributionAcknowledgements,
          exportPackets: boardReleaseOperationsExportPackets,
          generatedAt,
          manifests: boardReleaseDistributionRecipientManifests,
          retries: boardReleaseDistributionRetryPlanning,
          variance: boardEvidenceReleaseVariance,
          workspaceId,
        })
      : null;
  const boardReleaseDistributionReadinessDashboard =
    boardReleaseDistributionAcknowledgements &&
    boardReleaseDistributionAuditTimeline &&
    boardReleaseDistributionRecipientManifests &&
    boardReleaseDistributionRetryPlanning
      ? createBoardReleaseDistributionReadinessDashboardReport({
          acknowledgements: boardReleaseDistributionAcknowledgements,
          auditTimeline: boardReleaseDistributionAuditTimeline,
          generatedAt,
          manifests: boardReleaseDistributionRecipientManifests,
          retries: boardReleaseDistributionRetryPlanning,
          workspaceId,
        })
      : null;
  const boardReleaseObservabilityEventHealth =
    boardReleaseDistributionAcknowledgements &&
    boardReleaseDistributionAuditTimeline &&
    boardReleaseDistributionReadinessDashboard &&
    boardReleaseDistributionRetryPlanning &&
    boardReleaseOperationsExportPackets
      ? createBoardReleaseObservabilityEventHealthReport({
          acknowledgements: boardReleaseDistributionAcknowledgements,
          auditTimeline: boardReleaseDistributionAuditTimeline,
          exportPackets: boardReleaseOperationsExportPackets,
          generatedAt,
          readinessDashboard: boardReleaseDistributionReadinessDashboard,
          retries: boardReleaseDistributionRetryPlanning,
          workspaceId,
        })
      : null;
  const boardReleaseObservabilityIncidentNotes = boardReleaseObservabilityEventHealth
    ? createBoardReleaseObservabilityIncidentNotesReport({
        eventHealth: boardReleaseObservabilityEventHealth,
        generatedAt,
        incidentHistory: projectIncidentHistory,
        workspaceId,
      })
    : null;
  const boardReleaseObservabilityTrendSnapshots =
    boardReleaseDistributionAuditTimeline &&
    boardReleaseDistributionReadinessDashboard &&
    boardReleaseDistributionRetryPlanning &&
    boardReleaseOperationsDashboardFilters
      ? createBoardReleaseObservabilityTrendSnapshotReport({
          auditTimeline: boardReleaseDistributionAuditTimeline,
          dashboardFilters: boardReleaseOperationsDashboardFilters,
          generatedAt,
          readinessDashboard: boardReleaseDistributionReadinessDashboard,
          retries: boardReleaseDistributionRetryPlanning,
          workspaceId,
        })
      : null;
  const boardReleaseObservabilityAlertRouting =
    boardReleaseObservabilityIncidentNotes && boardReleaseObservabilityTrendSnapshots
      ? createBoardReleaseObservabilityAlertRoutingReport({
          generatedAt,
          incidentNotes: boardReleaseObservabilityIncidentNotes,
          members: workspaceDashboard.members,
          preferencesByUserId: new Map([[session.user.id, notificationPreferences]]),
          trendSnapshots: boardReleaseObservabilityTrendSnapshots,
          workspaceId,
        })
      : null;
  const boardReleaseObservabilityExecutiveDigest =
    boardReleaseObservabilityAlertRouting &&
    boardReleaseObservabilityEventHealth &&
    boardReleaseObservabilityIncidentNotes &&
    boardReleaseObservabilityTrendSnapshots
      ? createBoardReleaseObservabilityExecutiveDigest({
          alertRouting: boardReleaseObservabilityAlertRouting,
          eventHealth: boardReleaseObservabilityEventHealth,
          generatedAt,
          incidentNotes: boardReleaseObservabilityIncidentNotes,
          trendSnapshots: boardReleaseObservabilityTrendSnapshots,
          workspaceId,
        })
      : null;
  const boardReleaseCloseoutReadinessGates =
    boardEvidenceReleaseArchiveRecords &&
    boardReleaseDistributionReadinessDashboard &&
    boardReleaseObservabilityExecutiveDigest &&
    boardReleaseOperationsExportPackets
      ? createBoardReleaseCloseoutReadinessGateReport({
          archiveRecords: boardEvidenceReleaseArchiveRecords,
          distributionReadiness: boardReleaseDistributionReadinessDashboard,
          exportPackets: boardReleaseOperationsExportPackets,
          generatedAt,
          observabilityDigest: boardReleaseObservabilityExecutiveDigest,
          workspaceId,
        })
      : null;
  const boardReleaseCloseoutOwnerAcknowledgements = boardReleaseCloseoutReadinessGates
    ? createBoardReleaseCloseoutOwnerAcknowledgementReport({
        generatedAt,
        members: workspaceDashboard.members,
        readinessGates: boardReleaseCloseoutReadinessGates,
        workspaceId,
      })
    : null;
  const boardReleaseCloseoutArchiveManifests =
    boardEvidenceReleaseArchiveRecords &&
    boardReleaseCloseoutOwnerAcknowledgements &&
    boardReleaseCloseoutReadinessGates &&
    boardReleaseDistributionReadinessDashboard &&
    boardReleaseObservabilityExecutiveDigest &&
    boardReleaseOperationsExportPackets
      ? createBoardReleaseCloseoutArchiveManifestReport({
          distributionReadiness: boardReleaseDistributionReadinessDashboard,
          evidenceArchive: boardEvidenceReleaseArchiveRecords,
          generatedAt,
          observabilityDigest: boardReleaseObservabilityExecutiveDigest,
          operationsExportPackets: boardReleaseOperationsExportPackets,
          ownerAcknowledgements: boardReleaseCloseoutOwnerAcknowledgements,
          readinessGates: boardReleaseCloseoutReadinessGates,
          workspaceId,
        })
      : null;
  const boardReleaseCloseoutVarianceRemediation =
    boardReleaseCloseoutArchiveManifests && boardReleaseCloseoutOwnerAcknowledgements
      ? createBoardReleaseCloseoutVarianceRemediationReport({
          archiveManifests: boardReleaseCloseoutArchiveManifests,
          generatedAt,
          members: workspaceDashboard.members,
          ownerAcknowledgements: boardReleaseCloseoutOwnerAcknowledgements,
          workspaceId,
        })
      : null;
  const boardReleaseCloseoutExecutivePacket =
    boardReleaseCloseoutArchiveManifests &&
    boardReleaseCloseoutOwnerAcknowledgements &&
    boardReleaseCloseoutReadinessGates &&
    boardReleaseCloseoutVarianceRemediation
      ? createBoardReleaseCloseoutExecutivePacketReport({
          archiveManifests: boardReleaseCloseoutArchiveManifests,
          generatedAt,
          ownerAcknowledgements: boardReleaseCloseoutOwnerAcknowledgements,
          readinessGates: boardReleaseCloseoutReadinessGates,
          remediation: boardReleaseCloseoutVarianceRemediation,
          workspaceId,
        })
      : null;
  const boardReleaseArchiveIntelligenceIndex =
    boardReleaseCloseoutArchiveManifests && boardReleaseCloseoutExecutivePacket && boardReleaseCloseoutVarianceRemediation
      ? createBoardReleaseArchiveIntelligenceIndexReport({
          archiveManifests: boardReleaseCloseoutArchiveManifests,
          executivePacket: boardReleaseCloseoutExecutivePacket,
          generatedAt,
          remediation: boardReleaseCloseoutVarianceRemediation,
          workspaceId,
        })
      : null;
  const boardReleaseArchiveAnomalyReview = boardReleaseArchiveIntelligenceIndex
    ? createBoardReleaseArchiveAnomalyReviewReport({
        generatedAt,
        index: boardReleaseArchiveIntelligenceIndex,
        workspaceId,
      })
    : null;
  const boardReleaseArchiveTrendDigest =
    boardReleaseArchiveAnomalyReview && boardReleaseArchiveIntelligenceIndex
      ? createBoardReleaseArchiveTrendDigestReport({
          anomalyReview: boardReleaseArchiveAnomalyReview,
          generatedAt,
          index: boardReleaseArchiveIntelligenceIndex,
          workspaceId,
        })
      : null;
  const boardReleaseArchiveReplaySimulator =
    boardReleaseArchiveAnomalyReview && boardReleaseArchiveIntelligenceIndex && boardReleaseArchiveTrendDigest
      ? createBoardReleaseArchiveReplaySimulatorReport({
          anomalyReview: boardReleaseArchiveAnomalyReview,
          generatedAt,
          index: boardReleaseArchiveIntelligenceIndex,
          trendDigest: boardReleaseArchiveTrendDigest,
          workspaceId,
        })
      : null;
  const boardReleaseArchiveIntelligencePacket =
    boardReleaseArchiveAnomalyReview && boardReleaseArchiveIntelligenceIndex && boardReleaseArchiveReplaySimulator && boardReleaseArchiveTrendDigest
      ? createBoardReleaseArchiveIntelligencePacketReport({
          anomalyReview: boardReleaseArchiveAnomalyReview,
          generatedAt,
          index: boardReleaseArchiveIntelligenceIndex,
          replaySimulator: boardReleaseArchiveReplaySimulator,
          trendDigest: boardReleaseArchiveTrendDigest,
          workspaceId,
        })
      : null;
  const boardReleaseArchiveIntelligencePacketHistoryResult =
    boardReleaseArchiveIntelligencePacket && canManageWorkspaceEmail
      ? await listWorkspaceBoardReleaseArchiveIntelligencePacketHistory({
          currentUserId: session.user.id,
          workspaceId,
        })
      : null;
  const boardReleaseArchiveIntelligencePacketHistory =
    boardReleaseArchiveIntelligencePacketHistoryResult && !("error" in boardReleaseArchiveIntelligencePacketHistoryResult)
      ? boardReleaseArchiveIntelligencePacketHistoryResult
      : null;
  const boardReleaseArchiveIntelligenceNotificationRouting = boardReleaseArchiveIntelligencePacket
    ? createBoardReleaseArchiveIntelligenceNotificationRoutingReport({
        generatedAt,
        members: workspaceDashboard.members,
        packet: boardReleaseArchiveIntelligencePacket,
        preferencesByUserId: new Map([[session.user.id, notificationPreferences]]),
        workspaceId,
      })
    : null;
  const boardReleaseArchiveIntelligenceApprovalWorkflow = boardReleaseArchiveIntelligencePacket
    ? createBoardReleaseArchiveIntelligenceApprovalWorkflowReport({
        generatedAt,
        members: workspaceDashboard.members,
        notificationRouting: boardReleaseArchiveIntelligenceNotificationRouting,
        packet: boardReleaseArchiveIntelligencePacket,
        workspaceId,
      })
    : null;
  const boardReleaseArchiveIntelligenceCommandCenter = boardReleaseArchiveIntelligencePacket
    ? createBoardReleaseArchiveIntelligenceCommandCenterReport({
        approvalWorkflow: boardReleaseArchiveIntelligenceApprovalWorkflow,
        generatedAt,
        notificationRouting: boardReleaseArchiveIntelligenceNotificationRouting,
        packet: boardReleaseArchiveIntelligencePacket,
        packetHistory: boardReleaseArchiveIntelligencePacketHistory,
        workspaceId,
      })
    : null;
  const boardReleaseArchiveIntelligenceAutomationDigest = boardReleaseArchiveIntelligencePacket
    ? createBoardReleaseArchiveIntelligenceAutomationDigestReport({
        approvalWorkflow: boardReleaseArchiveIntelligenceApprovalWorkflow,
        commandCenter: boardReleaseArchiveIntelligenceCommandCenter,
        generatedAt,
        notificationRouting: boardReleaseArchiveIntelligenceNotificationRouting,
        packet: boardReleaseArchiveIntelligencePacket,
        trendDigest: boardReleaseArchiveTrendDigest,
        workspaceId,
      })
    : null;
  const boardReleaseArchiveEvidenceRetentionVault = boardReleaseArchiveIntelligencePacket
    ? createBoardReleaseArchiveEvidenceRetentionVaultReport({
        approvalWorkflow: boardReleaseArchiveIntelligenceApprovalWorkflow,
        automationDigest: boardReleaseArchiveIntelligenceAutomationDigest,
        commandCenter: boardReleaseArchiveIntelligenceCommandCenter,
        generatedAt,
        notificationRouting: boardReleaseArchiveIntelligenceNotificationRouting,
        packet: boardReleaseArchiveIntelligencePacket,
        workspaceId,
      })
    : null;
  const boardReleaseArchiveEvidenceDiffSnapshots = boardReleaseArchiveEvidenceRetentionVault
    ? createBoardReleaseArchiveEvidenceDiffSnapshotReport({
        currentVault: boardReleaseArchiveEvidenceRetentionVault,
        generatedAt,
        previousVault: null,
        workspaceId,
      })
    : null;
  const boardReleaseArchiveEvidenceReviewerPackets =
    boardReleaseArchiveEvidenceRetentionVault && boardReleaseArchiveEvidenceDiffSnapshots
      ? createBoardReleaseArchiveEvidenceReviewerPacketReport({
          diffSnapshots: boardReleaseArchiveEvidenceDiffSnapshots,
          generatedAt,
          members: workspaceDashboard.members,
          retentionVault: boardReleaseArchiveEvidenceRetentionVault,
          workspaceId,
        })
      : null;
  const boardReleaseArchiveEvidenceExceptionRenewals = boardReleaseArchiveEvidenceReviewerPackets
    ? createBoardReleaseArchiveEvidenceExceptionRenewalSchedulerReport({
        approvalWorkflow: boardReleaseArchiveIntelligenceApprovalWorkflow,
        generatedAt,
        reviewerPackets: boardReleaseArchiveEvidenceReviewerPackets,
        workspaceId,
      })
    : null;
  const boardReleaseArchiveEvidenceReleaseHandoffDigest =
    boardReleaseArchiveEvidenceRetentionVault &&
    boardReleaseArchiveEvidenceDiffSnapshots &&
    boardReleaseArchiveEvidenceReviewerPackets &&
    boardReleaseArchiveEvidenceExceptionRenewals
      ? createBoardReleaseArchiveEvidenceReleaseHandoffDigest({
          diffSnapshots: boardReleaseArchiveEvidenceDiffSnapshots,
          exceptionRenewals: boardReleaseArchiveEvidenceExceptionRenewals,
          generatedAt,
          retentionVault: boardReleaseArchiveEvidenceRetentionVault,
          reviewerPackets: boardReleaseArchiveEvidenceReviewerPackets,
          workspaceId,
        })
      : null;
  const boardReleaseArchiveAssuranceDecisionMemo = boardReleaseArchiveEvidenceReleaseHandoffDigest
    ? createBoardReleaseArchiveAssuranceDecisionMemo({
        generatedAt,
        handoffDigest: boardReleaseArchiveEvidenceReleaseHandoffDigest,
        workspaceId,
      })
    : null;
  const boardReleaseArchiveAssuranceNotarizationRegister =
    boardReleaseArchiveAssuranceDecisionMemo &&
    boardReleaseArchiveEvidenceExceptionRenewals &&
    boardReleaseArchiveEvidenceReleaseHandoffDigest &&
    boardReleaseArchiveEvidenceReviewerPackets
      ? createBoardReleaseArchiveAssuranceNotarizationRegister({
          decisionMemo: boardReleaseArchiveAssuranceDecisionMemo,
          exceptionRenewals: boardReleaseArchiveEvidenceExceptionRenewals,
          generatedAt,
          handoffDigest: boardReleaseArchiveEvidenceReleaseHandoffDigest,
          reviewerPackets: boardReleaseArchiveEvidenceReviewerPackets,
          workspaceId,
        })
      : null;
  const boardReleaseArchiveAssuranceDistributionMatrix =
    boardReleaseArchiveAssuranceNotarizationRegister && boardReleaseArchiveEvidenceReviewerPackets
      ? createBoardReleaseArchiveAssuranceDistributionMatrix({
          generatedAt,
          notarizationRegister: boardReleaseArchiveAssuranceNotarizationRegister,
          reviewerPackets: boardReleaseArchiveEvidenceReviewerPackets,
          workspaceId,
        })
      : null;
  const boardReleaseArchiveAssurancePostReleaseAuditChecklist =
    boardReleaseArchiveAssuranceDistributionMatrix && boardReleaseArchiveEvidenceExceptionRenewals
      ? createBoardReleaseArchiveAssurancePostReleaseAuditChecklist({
          distributionMatrix: boardReleaseArchiveAssuranceDistributionMatrix,
          exceptionRenewals: boardReleaseArchiveEvidenceExceptionRenewals,
          generatedAt,
          workspaceId,
        })
      : null;
  const boardReleaseArchiveAssuranceFinalCloseoutCertificate =
    boardReleaseArchiveAssuranceDistributionMatrix &&
    boardReleaseArchiveAssuranceNotarizationRegister &&
    boardReleaseArchiveAssurancePostReleaseAuditChecklist &&
    boardReleaseArchiveEvidenceReleaseHandoffDigest
      ? createBoardReleaseArchiveAssuranceFinalCloseoutCertificate({
          distributionMatrix: boardReleaseArchiveAssuranceDistributionMatrix,
          generatedAt,
          handoffDigest: boardReleaseArchiveEvidenceReleaseHandoffDigest,
          notarizationRegister: boardReleaseArchiveAssuranceNotarizationRegister,
          postReleaseAuditChecklist: boardReleaseArchiveAssurancePostReleaseAuditChecklist,
          workspaceId,
        })
      : null;
  const boardReleaseArchiveCertificationHistoryLedger = boardReleaseArchiveAssuranceFinalCloseoutCertificate
    ? createBoardReleaseArchiveCertificationHistoryLedger({
        finalCloseoutCertificate: boardReleaseArchiveAssuranceFinalCloseoutCertificate,
        generatedAt,
        workspaceId,
      })
    : null;
  const boardReleaseArchiveCertificationEvidenceReplayVerifier =
    boardReleaseArchiveAssuranceDistributionMatrix &&
    boardReleaseArchiveAssuranceFinalCloseoutCertificate &&
    boardReleaseArchiveAssuranceNotarizationRegister &&
    boardReleaseArchiveAssurancePostReleaseAuditChecklist &&
    boardReleaseArchiveCertificationHistoryLedger &&
    boardReleaseArchiveEvidenceReleaseHandoffDigest
      ? createBoardReleaseArchiveCertificationEvidenceReplayVerifier({
          distributionMatrix: boardReleaseArchiveAssuranceDistributionMatrix,
          finalCloseoutCertificate: boardReleaseArchiveAssuranceFinalCloseoutCertificate,
          generatedAt,
          handoffDigest: boardReleaseArchiveEvidenceReleaseHandoffDigest,
          historyLedger: boardReleaseArchiveCertificationHistoryLedger,
          notarizationRegister: boardReleaseArchiveAssuranceNotarizationRegister,
          postReleaseAuditChecklist: boardReleaseArchiveAssurancePostReleaseAuditChecklist,
          workspaceId,
        })
      : null;
  const boardReleaseArchiveCertificationExternalAuditorPacket =
    boardReleaseArchiveAssuranceFinalCloseoutCertificate && boardReleaseArchiveCertificationEvidenceReplayVerifier && boardReleaseArchiveCertificationHistoryLedger
      ? createBoardReleaseArchiveCertificationExternalAuditorPacket({
          finalCloseoutCertificate: boardReleaseArchiveAssuranceFinalCloseoutCertificate,
          generatedAt,
          historyLedger: boardReleaseArchiveCertificationHistoryLedger,
          replayVerifier: boardReleaseArchiveCertificationEvidenceReplayVerifier,
          workspaceId,
        })
      : null;
  const boardReleaseArchiveCertificationRevocationWorkflow =
    boardReleaseArchiveCertificationEvidenceReplayVerifier && boardReleaseArchiveCertificationExternalAuditorPacket && boardReleaseArchiveCertificationHistoryLedger
      ? createBoardReleaseArchiveCertificationRevocationWorkflow({
          auditorPacket: boardReleaseArchiveCertificationExternalAuditorPacket,
          generatedAt,
          historyLedger: boardReleaseArchiveCertificationHistoryLedger,
          replayVerifier: boardReleaseArchiveCertificationEvidenceReplayVerifier,
          workspaceId,
        })
      : null;
  const boardReleaseArchiveCertificationExecutiveAttestationDigest =
    boardReleaseArchiveCertificationEvidenceReplayVerifier &&
    boardReleaseArchiveCertificationExternalAuditorPacket &&
    boardReleaseArchiveCertificationHistoryLedger &&
    boardReleaseArchiveCertificationRevocationWorkflow
      ? createBoardReleaseArchiveCertificationExecutiveAttestationDigest({
          auditorPacket: boardReleaseArchiveCertificationExternalAuditorPacket,
          generatedAt,
          historyLedger: boardReleaseArchiveCertificationHistoryLedger,
          replayVerifier: boardReleaseArchiveCertificationEvidenceReplayVerifier,
          revocationWorkflow: boardReleaseArchiveCertificationRevocationWorkflow,
          workspaceId,
        })
      : null;
  const boardReleaseArchiveVerificationSignatureChainValidator =
    boardReleaseArchiveCertificationExecutiveAttestationDigest &&
    boardReleaseArchiveCertificationExternalAuditorPacket &&
    boardReleaseArchiveCertificationHistoryLedger &&
    boardReleaseArchiveCertificationRevocationWorkflow
      ? createBoardReleaseArchiveVerificationSignatureChainValidator({
          auditorPacket: boardReleaseArchiveCertificationExternalAuditorPacket,
          attestationDigest: boardReleaseArchiveCertificationExecutiveAttestationDigest,
          generatedAt,
          historyLedger: boardReleaseArchiveCertificationHistoryLedger,
          revocationWorkflow: boardReleaseArchiveCertificationRevocationWorkflow,
          workspaceId,
        })
      : null;
  const boardReleaseArchiveVerificationExceptionRegister =
    boardReleaseArchiveCertificationExecutiveAttestationDigest && boardReleaseArchiveVerificationSignatureChainValidator
      ? createBoardReleaseArchiveVerificationExceptionRegister({
          attestationDigest: boardReleaseArchiveCertificationExecutiveAttestationDigest,
          generatedAt,
          signatureChainValidator: boardReleaseArchiveVerificationSignatureChainValidator,
          workspaceId,
        })
      : null;
  const boardReleaseArchiveVerificationDistributionProofBundle =
    boardReleaseArchiveVerificationExceptionRegister && boardReleaseArchiveVerificationSignatureChainValidator
      ? createBoardReleaseArchiveVerificationDistributionProofBundle({
          exceptionRegister: boardReleaseArchiveVerificationExceptionRegister,
          generatedAt,
          signatureChainValidator: boardReleaseArchiveVerificationSignatureChainValidator,
          workspaceId,
        })
      : null;
  const boardReleaseArchiveVerificationReadinessTimeline =
    boardReleaseArchiveCertificationEvidenceReplayVerifier &&
    boardReleaseArchiveCertificationExternalAuditorPacket &&
    boardReleaseArchiveCertificationHistoryLedger &&
    boardReleaseArchiveCertificationRevocationWorkflow &&
    boardReleaseArchiveVerificationExceptionRegister &&
    boardReleaseArchiveVerificationDistributionProofBundle
      ? createBoardReleaseArchiveVerificationReadinessTimeline({
          auditorPacket: boardReleaseArchiveCertificationExternalAuditorPacket,
          distributionProofBundle: boardReleaseArchiveVerificationDistributionProofBundle,
          exceptionRegister: boardReleaseArchiveVerificationExceptionRegister,
          generatedAt,
          historyLedger: boardReleaseArchiveCertificationHistoryLedger,
          replayVerifier: boardReleaseArchiveCertificationEvidenceReplayVerifier,
          revocationWorkflow: boardReleaseArchiveCertificationRevocationWorkflow,
          workspaceId,
        })
      : null;
  const boardReleaseArchiveVerificationFinalAcceptancePacket =
    boardReleaseArchiveVerificationDistributionProofBundle &&
    boardReleaseArchiveVerificationExceptionRegister &&
    boardReleaseArchiveVerificationReadinessTimeline &&
    boardReleaseArchiveVerificationSignatureChainValidator
      ? createBoardReleaseArchiveVerificationFinalAcceptancePacket({
          distributionProofBundle: boardReleaseArchiveVerificationDistributionProofBundle,
          exceptionRegister: boardReleaseArchiveVerificationExceptionRegister,
          generatedAt,
          readinessTimeline: boardReleaseArchiveVerificationReadinessTimeline,
          signatureChainValidator: boardReleaseArchiveVerificationSignatureChainValidator,
          workspaceId,
        })
      : null;
  const boardReleaseArchiveCustodyChainOfControlLedger = boardReleaseArchiveVerificationFinalAcceptancePacket
    ? createBoardReleaseArchiveCustodyChainOfControlLedger({
        finalAcceptancePacket: boardReleaseArchiveVerificationFinalAcceptancePacket,
        generatedAt,
        workspaceId,
      })
    : null;
  const boardReleaseArchiveCustodyRetentionLockWorkflow =
    boardReleaseArchiveCustodyChainOfControlLedger && boardReleaseArchiveVerificationFinalAcceptancePacket
      ? createBoardReleaseArchiveCustodyRetentionLockWorkflow({
          chainOfControlLedger: boardReleaseArchiveCustodyChainOfControlLedger,
          finalAcceptancePacket: boardReleaseArchiveVerificationFinalAcceptancePacket,
          generatedAt,
          workspaceId,
        })
      : null;
  const boardReleaseArchiveCustodyAccessReviewQueue = boardReleaseArchiveCustodyRetentionLockWorkflow
    ? createBoardReleaseArchiveCustodyAccessReviewQueue({
        generatedAt,
        retentionLockWorkflow: boardReleaseArchiveCustodyRetentionLockWorkflow,
        workspaceId,
      })
    : null;
  const boardReleaseArchiveCustodyRestoreRehearsalPacket =
    boardReleaseArchiveCustodyAccessReviewQueue && boardReleaseArchiveCustodyRetentionLockWorkflow
      ? createBoardReleaseArchiveCustodyRestoreRehearsalPacket({
          accessReviewQueue: boardReleaseArchiveCustodyAccessReviewQueue,
          generatedAt,
          retentionLockWorkflow: boardReleaseArchiveCustodyRetentionLockWorkflow,
          workspaceId,
        })
      : null;
  const boardReleaseArchiveCustodyExecutiveCloseoutDigest =
    boardReleaseArchiveCustodyAccessReviewQueue &&
    boardReleaseArchiveCustodyChainOfControlLedger &&
    boardReleaseArchiveCustodyRestoreRehearsalPacket &&
    boardReleaseArchiveCustodyRetentionLockWorkflow
      ? createBoardReleaseArchiveCustodyExecutiveCloseoutDigest({
          accessReviewQueue: boardReleaseArchiveCustodyAccessReviewQueue,
          chainOfControlLedger: boardReleaseArchiveCustodyChainOfControlLedger,
          generatedAt,
          restoreRehearsalPacket: boardReleaseArchiveCustodyRestoreRehearsalPacket,
          retentionLockWorkflow: boardReleaseArchiveCustodyRetentionLockWorkflow,
          workspaceId,
        })
      : null;
  const boardReleaseArchiveOversightExceptionRenewalCalendar = boardReleaseArchiveCustodyExecutiveCloseoutDigest
    ? createBoardReleaseArchiveOversightExceptionRenewalCalendar({
        closeoutDigest: boardReleaseArchiveCustodyExecutiveCloseoutDigest,
        generatedAt,
        workspaceId,
      })
    : null;
  const boardReleaseArchiveOversightEvidenceQualityMonitor = boardReleaseArchiveOversightExceptionRenewalCalendar
    ? createBoardReleaseArchiveOversightEvidenceQualityMonitor({
        generatedAt,
        renewalCalendar: boardReleaseArchiveOversightExceptionRenewalCalendar,
        workspaceId,
      })
    : null;
  const boardReleaseArchiveOversightBoardDistributionDigest = boardReleaseArchiveOversightEvidenceQualityMonitor
    ? createBoardReleaseArchiveOversightBoardDistributionDigest({
        generatedAt,
        qualityMonitor: boardReleaseArchiveOversightEvidenceQualityMonitor,
        workspaceId,
      })
    : null;
  const boardReleaseArchiveOversightIncidentReplayDrill = boardReleaseArchiveOversightBoardDistributionDigest
    ? createBoardReleaseArchiveOversightIncidentReplayDrill({
        distributionDigest: boardReleaseArchiveOversightBoardDistributionDigest,
        generatedAt,
        workspaceId,
      })
    : null;
  const boardReleaseArchiveOversightExecutiveHealthPacket =
    boardReleaseArchiveOversightBoardDistributionDigest &&
    boardReleaseArchiveOversightEvidenceQualityMonitor &&
    boardReleaseArchiveOversightExceptionRenewalCalendar &&
    boardReleaseArchiveOversightIncidentReplayDrill
      ? createBoardReleaseArchiveOversightExecutiveHealthPacket({
          boardDistributionDigest: boardReleaseArchiveOversightBoardDistributionDigest,
          evidenceQualityMonitor: boardReleaseArchiveOversightEvidenceQualityMonitor,
          exceptionRenewalCalendar: boardReleaseArchiveOversightExceptionRenewalCalendar,
          generatedAt,
          incidentReplayDrill: boardReleaseArchiveOversightIncidentReplayDrill,
          workspaceId,
        })
      : null;
  const boardReleaseArchiveStewardshipOwnershipRotationPlanner = boardReleaseArchiveOversightExecutiveHealthPacket
    ? createBoardReleaseArchiveStewardshipOwnershipRotationPlanner({
        generatedAt,
        healthPacket: boardReleaseArchiveOversightExecutiveHealthPacket,
        workspaceId,
      })
    : null;
  const boardReleaseArchiveStewardshipEvidenceAgingForecast = boardReleaseArchiveStewardshipOwnershipRotationPlanner
    ? createBoardReleaseArchiveStewardshipEvidenceAgingForecast({
        generatedAt,
        rotationPlanner: boardReleaseArchiveStewardshipOwnershipRotationPlanner,
        workspaceId,
      })
    : null;
  const boardReleaseArchiveStewardshipExceptionBudgetLedger = boardReleaseArchiveStewardshipEvidenceAgingForecast
    ? createBoardReleaseArchiveStewardshipExceptionBudgetLedger({
        agingForecast: boardReleaseArchiveStewardshipEvidenceAgingForecast,
        generatedAt,
        workspaceId,
      })
    : null;
  const boardReleaseArchiveStewardshipContinuityRehearsal = boardReleaseArchiveStewardshipExceptionBudgetLedger
    ? createBoardReleaseArchiveStewardshipContinuityRehearsal({
        exceptionBudgetLedger: boardReleaseArchiveStewardshipExceptionBudgetLedger,
        generatedAt,
        workspaceId,
      })
    : null;
  const boardReleaseArchiveStewardshipExecutivePacket =
    boardReleaseArchiveStewardshipOwnershipRotationPlanner &&
    boardReleaseArchiveStewardshipEvidenceAgingForecast &&
    boardReleaseArchiveStewardshipExceptionBudgetLedger &&
    boardReleaseArchiveStewardshipContinuityRehearsal
      ? createBoardReleaseArchiveStewardshipExecutivePacket({
          continuityRehearsal: boardReleaseArchiveStewardshipContinuityRehearsal,
          evidenceAgingForecast: boardReleaseArchiveStewardshipEvidenceAgingForecast,
          exceptionBudgetLedger: boardReleaseArchiveStewardshipExceptionBudgetLedger,
          generatedAt,
          ownershipRotationPlanner: boardReleaseArchiveStewardshipOwnershipRotationPlanner,
          workspaceId,
        })
      : null;
  const boardReleaseArchiveGovernancePolicyCharter = boardReleaseArchiveStewardshipExecutivePacket
    ? createBoardReleaseArchiveGovernancePolicyCharter({
        generatedAt,
        stewardshipPacket: boardReleaseArchiveStewardshipExecutivePacket,
        workspaceId,
      })
    : null;
  const boardReleaseArchiveGovernanceControlOwnerMatrix = boardReleaseArchiveGovernancePolicyCharter
    ? createBoardReleaseArchiveGovernanceControlOwnerMatrix({
        generatedAt,
        policyCharter: boardReleaseArchiveGovernancePolicyCharter,
        workspaceId,
      })
    : null;
  const boardReleaseArchiveGovernanceExceptionQuorumTracker = boardReleaseArchiveGovernanceControlOwnerMatrix
    ? createBoardReleaseArchiveGovernanceExceptionQuorumTracker({
        controlOwnerMatrix: boardReleaseArchiveGovernanceControlOwnerMatrix,
        generatedAt,
        workspaceId,
      })
    : null;
  const boardReleaseArchiveGovernancePolicyDriftMonitor = boardReleaseArchiveGovernanceExceptionQuorumTracker
    ? createBoardReleaseArchiveGovernancePolicyDriftMonitor({
        generatedAt,
        quorumTracker: boardReleaseArchiveGovernanceExceptionQuorumTracker,
        workspaceId,
      })
    : null;
  const boardReleaseArchiveGovernanceExecutivePacket =
    boardReleaseArchiveGovernancePolicyCharter &&
    boardReleaseArchiveGovernanceControlOwnerMatrix &&
    boardReleaseArchiveGovernanceExceptionQuorumTracker &&
    boardReleaseArchiveGovernancePolicyDriftMonitor
      ? createBoardReleaseArchiveGovernanceExecutivePacket({
          controlOwnerMatrix: boardReleaseArchiveGovernanceControlOwnerMatrix,
          exceptionQuorumTracker: boardReleaseArchiveGovernanceExceptionQuorumTracker,
          generatedAt,
          policyCharter: boardReleaseArchiveGovernancePolicyCharter,
          policyDriftMonitor: boardReleaseArchiveGovernancePolicyDriftMonitor,
          workspaceId,
        })
      : null;
  const boardReleaseArchiveGovernanceAutomationTriggerRegister = boardReleaseArchiveGovernanceExecutivePacket
    ? createBoardReleaseArchiveGovernanceAutomationTriggerRegister({
        executivePacket: boardReleaseArchiveGovernanceExecutivePacket,
        generatedAt,
        workspaceId,
      })
    : null;
  const boardReleaseArchiveGovernanceAutomationRunbook = boardReleaseArchiveGovernanceAutomationTriggerRegister
    ? createBoardReleaseArchiveGovernanceAutomationRunbook({
        generatedAt,
        triggerRegister: boardReleaseArchiveGovernanceAutomationTriggerRegister,
        workspaceId,
      })
    : null;
  const boardReleaseArchiveGovernanceAutomationFailureLedger =
    boardReleaseArchiveGovernanceAutomationTriggerRegister && boardReleaseArchiveGovernanceAutomationRunbook
      ? createBoardReleaseArchiveGovernanceAutomationFailureLedger({
          generatedAt,
          runbook: boardReleaseArchiveGovernanceAutomationRunbook,
          triggerRegister: boardReleaseArchiveGovernanceAutomationTriggerRegister,
          workspaceId,
        })
      : null;
  const boardReleaseArchiveGovernanceAutomationAuditTrail =
    boardReleaseArchiveGovernanceAutomationTriggerRegister &&
    boardReleaseArchiveGovernanceAutomationRunbook &&
    boardReleaseArchiveGovernanceAutomationFailureLedger
      ? createBoardReleaseArchiveGovernanceAutomationAuditTrail({
          failureLedger: boardReleaseArchiveGovernanceAutomationFailureLedger,
          generatedAt,
          runbook: boardReleaseArchiveGovernanceAutomationRunbook,
          triggerRegister: boardReleaseArchiveGovernanceAutomationTriggerRegister,
          workspaceId,
        })
      : null;
  const boardReleaseArchiveGovernanceAutomationExecutivePacket =
    boardReleaseArchiveGovernanceAutomationTriggerRegister &&
    boardReleaseArchiveGovernanceAutomationRunbook &&
    boardReleaseArchiveGovernanceAutomationFailureLedger &&
    boardReleaseArchiveGovernanceAutomationAuditTrail
      ? createBoardReleaseArchiveGovernanceAutomationExecutivePacket({
          auditTrail: boardReleaseArchiveGovernanceAutomationAuditTrail,
          failureLedger: boardReleaseArchiveGovernanceAutomationFailureLedger,
          generatedAt,
          runbook: boardReleaseArchiveGovernanceAutomationRunbook,
          triggerRegister: boardReleaseArchiveGovernanceAutomationTriggerRegister,
          workspaceId,
        })
      : null;
  const signedNativeArtifactProvenanceLedger = createSignedNativeArtifactProvenanceLedger({
    generatedAt,
    workspaceId,
  });
  const nativeArtifactSigningExecutionReceipts = createNativeArtifactSigningExecutionReceipts({
    generatedAt,
    workspaceId,
  });
  const certificateBackedNativeArtifactIngestion = createCertificateBackedNativeArtifactIngestion({
    generatedAt,
    workspaceId,
  });
  const desktopSigningPlan = createDesktopSigningPlan(process.env);
  const signedNativePackageReadinessPacket = createSignedNativePackageReadinessPacket({
    artifactProvenance: signedNativeArtifactProvenanceLedger,
    generatedAt,
    signingPlan: desktopSigningPlan,
    workspaceId,
  });
  const nativeCadKernelCapabilityMatrix = createNativeCadKernelCapabilityMatrix({
    generatedAt,
    workspaceId,
  });
  const cadKernelWorkerHealth = createCadKernelWorkerHealthReport({
    generatedAt,
    workspaceId,
  });
  const cadConversionFixtureCorpus = createCadConversionFixtureCorpusReport({
    generatedAt,
    workspaceId,
  });
  const nativeCadKernelExecutionRunner = createNativeCadKernelExecutionRunnerReport({
    executionQueue: cadConversionExecutionQueue,
    generatedAt,
    runs: [],
    workspaceId,
  });
  const cadRuntimeAcceptancePacket = createCadRuntimeAcceptancePacket({
    capabilityMatrix: nativeCadKernelCapabilityMatrix,
    executionQueue: cadConversionExecutionQueue,
    generatedAt,
    workspaceId,
  });
  const nativeReleasePromotionApproval = createNativeReleasePromotionApproval({
    cadRuntimeAcceptance: cadRuntimeAcceptancePacket,
    generatedAt,
    operatorApprovalStatus: "review",
    rollbackEvidenceStatus: "review",
    signedPackageReadiness: signedNativePackageReadinessPacket,
    workspaceId,
  });
  const liveProductionParityEvidenceDashboard = createLiveProductionParityEvidenceDashboard({
    artifactRegistryReport,
    cadRuntimeAcceptance: cadRuntimeAcceptancePacket,
    generatedAt,
    nativeReleasePromotionApproval,
    postDeploySummary: postDeploySmokeSummary,
    publicSurfaceHealthReport,
    releaseDeploymentChecklist: releaseReadinessChecklist,
    sceneQaSnapshotReport,
    signedPackageReadiness: signedNativePackageReadinessPacket,
    workspaceId,
  });
  const productionParityHistorySnapshots = createProductionParityHistorySnapshots({
    current: liveProductionParityEvidenceDashboard,
  });
  const visualParityEvidence = createVisualParityEvidenceReport({
    generatedAt,
    publicSurfaceHealthReport,
    sceneQaSnapshotReport,
    workspaceId,
  });
  const rollbackRehearsalEvidence = createRollbackRehearsalEvidenceReport({
    currentDeploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    generatedAt,
    knownGoodDeploymentId: process.env.VERCEL_ROLLBACK_DEPLOYMENT_ID ?? null,
    parityHistory: productionParityHistorySnapshots,
    postRollbackSmokeStatus: postDeploySmokeSummary?.status === "pass" ? "ready" : postDeploySmokeSummary?.status === "fail" ? "blocked" : "review",
    productionAlias: process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL ?? null,
    releaseApproval: nativeReleasePromotionApproval,
    rollbackCommandHash: process.env.VERCEL_ROLLBACK_COMMAND_HASH ?? null,
    rollbackPlanHash: process.env.VERCEL_ROLLBACK_PLAN_HASH ?? null,
    workspaceId,
  });
  const boardOperationsReviewCycleHistoryResult =
    boardOperationsControlCenter && canManageWorkspaceEmail
      ? await listWorkspaceBoardOperationsReviewCycleHistory({
          currentUserId: session.user.id,
          workspaceId,
        })
      : null;
  const boardOperationsReviewCycleHistory =
    boardOperationsReviewCycleHistoryResult && !("error" in boardOperationsReviewCycleHistoryResult) ? boardOperationsReviewCycleHistoryResult : null;
  const boardApprovalPostApprovalHistoryResult =
    boardApprovalPostApprovalTracker && canManageWorkspaceEmail
      ? await listWorkspaceBoardPostApprovalActions({
          currentUserId: session.user.id,
          workspaceId,
        })
      : null;
  const boardApprovalPostApprovalHistory =
    boardApprovalPostApprovalHistoryResult && !("error" in boardApprovalPostApprovalHistoryResult) ? boardApprovalPostApprovalHistoryResult : null;
  const artifactProvenanceReport = createProjectArtifactProvenanceReport({
    artifactRegistryReport,
    cadConversionQueueReport,
    certificateReport: appPackageCertificateReport,
    generatedAt,
    publicSurfaceHealthReport,
    releaseOperationsDashboard: desktopReleaseOperations?.dashboard ?? null,
  });
  const offlineDesktopHandoffKitPreview = desktopReleaseOperations
    ? createOfflineDesktopHandoffKitPreview({
        appPackageCertificateReport,
        cadConversionQueueReport,
        generatedAt,
        metadata: desktopReleaseOperations.metadata,
        releaseOperationsDashboard: desktopReleaseOperations.dashboard,
        scan: desktopReleaseOperations.scan,
        signingPlan: desktopSigningPlan,
        workspace: {
          id: workspaceDashboard.id,
          name: workspaceDashboard.name,
          role: workspaceDashboard.role,
        },
      })
    : null;

  return (
    <main className="h-dvh overflow-y-auto bg-muted/30 text-foreground">
      <div className="mx-auto grid min-h-dvh w-full max-w-[1500px] lg:grid-cols-[260px_1fr]">
        <aside className="border-b bg-background p-4 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Box className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Essence Spline</p>
              <p className="truncate text-xs text-muted-foreground">{session.user.email}</p>
            </div>
          </div>
          <nav className="mt-6 grid gap-1 text-sm">
            <Link className={buttonVariants({ className: "justify-start gap-2", variant: "secondary" })} href={getProjectsPath({ workspaceId })}>
              <LayoutDashboard className="size-4" />
              Dashboard
            </Link>
            <Link className={buttonVariants({ className: "justify-start gap-2", variant: "ghost" })} href="/">
              <Plus className="size-4" />
              New scene
            </Link>
            <Link className={buttonVariants({ className: "justify-start gap-2", variant: "ghost" })} href={getProjectsPath({ view: "trash", workspaceId })}>
              <Trash2 className="size-4" />
              Trash
            </Link>
            <Link className={buttonVariants({ className: "justify-start gap-2", variant: "ghost" })} href="/projects/integration-qa">
              <Code2 className="size-4" />
              Integration QA
            </Link>
            <Link className={buttonVariants({ className: "justify-start gap-2", variant: "ghost" })} href="/projects/release-operations">
              <Rocket className="size-4" />
              Release Ops
            </Link>
          </nav>
          <WorkspaceSwitcher activeWorkspaceId={workspaceId} workspaces={workspaceDashboard.workspaces} />
          <Card className="mt-6">
            <CardHeader className="gap-1">
              <CardTitle className="text-sm">{isAdmin ? "Admin workspace" : "Creator workspace"}</CardTitle>
              <CardDescription>{isAdmin ? "Manage users, projects, and public scenes." : "Manage your saved and published scenes."}</CardDescription>
            </CardHeader>
          </Card>
        </aside>

        <section className="min-w-0 p-4 lg:p-6">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">Dashboard</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {projects.length} {showingTrash ? "trashed" : "saved"} scene{projects.length === 1 ? "" : "s"}
              </p>
            </div>
            <ProjectDashboardActions showingTrash={showingTrash} workspaceId={workspaceId} />
          </header>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={<FolderOpen className="size-4" />} label="Active scenes" value={activeDashboardProjects.length} />
            <MetricCard icon={<Globe2 className="size-4" />} label="Published" value={publishedCount} />
            <MetricCard icon={<ShieldCheck className="size-4" />} label="Active sessions" value={dashboardSessions.filter((entry) => entry.expiresAt > now).length} />
            <MetricCard icon={<Users2 className="size-4" />} label={isAdmin ? "Users" : "Workspace members"} value={isAdmin ? dashboardUsers.length : workspaceDashboard.members.length} />
          </div>
          <ProjectDashboardAnalyticsPanel analytics={dashboardAnalytics} />
          {releaseReadinessChecklist ? <ReleaseReadinessPanel checklist={releaseReadinessChecklist} /> : null}
          {postDeploySmokeSummary ? <PostDeploySyntheticSmokePanel summary={postDeploySmokeSummary} /> : null}
          <WorkspaceSloDashboardPanel dashboard={workspaceSloDashboard} />
          {operationalAnomalyDetection ? <OperationalAnomalyDetectionPanel report={operationalAnomalyDetection} /> : null}
          {executiveReleaseIntelligence ? <ExecutiveReleaseIntelligencePanel report={executiveReleaseIntelligence} /> : null}
          {executiveReleaseIntelligence ? (
            <ExecutiveReleaseSnapshotPanel
              canPersist={canManageWorkspaceEmail}
              history={executiveReleaseSnapshotHistory}
              report={executiveReleaseIntelligence}
              workspaceId={workspaceId}
            />
          ) : null}
          {executiveActionOwnership ? <ExecutiveActionOwnershipPanel matrix={executiveActionOwnership} /> : null}
          {releaseScenarioComparison ? <ReleaseScenarioComparisonPanel report={releaseScenarioComparison} /> : null}
          {releaseControlRoomTimeline ? <ReleaseControlRoomTimelinePanel report={releaseControlRoomTimeline} /> : null}
          {boardApprovalPacket ? (
            <BoardApprovalPacketPanel canPersist={canManageWorkspaceEmail} history={boardApprovalPacketHistory} report={boardApprovalPacket} workspaceId={workspaceId} />
          ) : null}
          {boardApprovalAgenda ? <BoardApprovalAgendaPanel report={boardApprovalAgenda} /> : null}
          {boardApprovalDiff ? <BoardApprovalDiffPanel report={boardApprovalDiff} /> : null}
          {boardApprovalRedactionPolicies ? <BoardApprovalRedactionPoliciesPanel report={boardApprovalRedactionPolicies} /> : null}
          {boardApprovalCirculationQueue ? <BoardApprovalCirculationQueuePanel report={boardApprovalCirculationQueue} /> : null}
          {boardApprovalPostApprovalTracker ? (
            <BoardApprovalPostApprovalTrackerPanel
              canPersist={canManageWorkspaceEmail}
              emailDelivery={boardAwareNotificationEmailDeliveryReport}
              history={boardApprovalPostApprovalHistory}
              report={boardApprovalPostApprovalTracker}
              slaReminders={boardApprovalSlaReminders}
              workspaceId={workspaceId}
            />
          ) : null}
          {boardDecisionReplayAudit ? (
            <BoardDecisionReplayAuditPanel
              canPersist={canManageWorkspaceEmail}
              history={boardDecisionReplaySnapshotHistory}
              report={boardDecisionReplayAudit}
              workspaceId={workspaceId}
            />
          ) : null}
          {boardAssuranceExceptionWorkflow ? <BoardAssuranceExceptionWorkflowPanel report={boardAssuranceExceptionWorkflow} /> : null}
          {boardAssuranceEvidenceBundle ? <BoardAssuranceEvidenceBundlePanel report={boardAssuranceEvidenceBundle} /> : null}
          {boardReleaseVarianceDashboard ? <BoardReleaseVarianceDashboardPanel dashboard={boardReleaseVarianceDashboard} /> : null}
          {boardEvidenceAcceptanceCampaign ? <BoardEvidenceAcceptanceCampaignPanel report={boardEvidenceAcceptanceCampaign} /> : null}
          {boardApprovalScenarioForecast ? <BoardApprovalScenarioForecastPanel report={boardApprovalScenarioForecast} /> : null}
          {boardAssuranceAuditExport ? <BoardAssuranceAuditExportPanel report={boardAssuranceAuditExport} /> : null}
          {boardEvidenceFreshnessMonitor ? <BoardEvidenceFreshnessMonitorPanel report={boardEvidenceFreshnessMonitor} /> : null}
          {boardOperationsControlCenter ? (
            <BoardOperationsControlCenterPanel
              canPersist={canManageWorkspaceEmail}
              history={boardOperationsReviewCycleHistory}
              report={boardOperationsControlCenter}
              workspaceId={workspaceId}
            />
          ) : null}
          {boardGovernanceDecisionLedger ? <BoardGovernanceDecisionLedgerPanel report={boardGovernanceDecisionLedger} /> : null}
          {boardReviewerWorkloadBalancing ? <BoardReviewerWorkloadBalancingPanel report={boardReviewerWorkloadBalancing} /> : null}
          {boardGovernanceExecutiveDigest ? <BoardGovernanceExecutiveDigestPanel report={boardGovernanceExecutiveDigest} /> : null}
          {boardAuditFollowUpTasks ? <BoardAuditFollowUpTasksPanel report={boardAuditFollowUpTasks} /> : null}
          {boardAuditReminderRouting ? <BoardAuditReminderRoutingPanel report={boardAuditReminderRouting} /> : null}
          {boardAuditCompletionDigest ? <BoardAuditCompletionDigestPanel digest={boardAuditCompletionDigest} /> : null}
          {boardEvidenceCommandCenter ? <BoardEvidenceCommandCenterPanel commandCenter={boardEvidenceCommandCenter} /> : null}
          {boardEvidenceReadinessSnapshots ? <BoardEvidenceReadinessSnapshotsPanel history={boardEvidenceReadinessSnapshots} /> : null}
          {boardEvidenceEscalationRouting ? <BoardEvidenceEscalationRoutingPanel report={boardEvidenceEscalationRouting} /> : null}
          {boardEvidencePacketLock ? <BoardEvidencePacketLockPanel report={boardEvidencePacketLock} /> : null}
          {boardEvidenceCloseoutReport ? <BoardEvidenceCloseoutReportPanel report={boardEvidenceCloseoutReport} /> : null}
          {boardEvidenceReleaseApprovalHandoff ? <BoardEvidenceReleaseApprovalHandoffPanel report={boardEvidenceReleaseApprovalHandoff} /> : null}
          {boardEvidenceReleasePromotionGate ? <BoardEvidenceReleasePromotionGatePanel report={boardEvidenceReleasePromotionGate} /> : null}
          {boardEvidenceReleaseArchiveRecords ? <BoardEvidenceReleaseArchiveRecordsPanel report={boardEvidenceReleaseArchiveRecords} /> : null}
          {boardEvidenceReleaseVariance ? <BoardEvidenceReleaseVariancePanel report={boardEvidenceReleaseVariance} /> : null}
          {boardEvidenceReleaseCloseoutNotifications ? (
            <BoardEvidenceReleaseCloseoutNotificationsPanel report={boardEvidenceReleaseCloseoutNotifications} />
          ) : null}
          {boardReleaseOperationsDashboardFilters ? <BoardReleaseOperationsDashboardFiltersPanel report={boardReleaseOperationsDashboardFilters} /> : null}
          {boardReleaseOperationsHistory ? <BoardReleaseOperationsHistoryPanel report={boardReleaseOperationsHistory} /> : null}
          {boardReleaseOperationsReviewQueue ? <BoardReleaseOperationsReviewQueuePanel report={boardReleaseOperationsReviewQueue} /> : null}
          {boardReleaseOperationsApprovalSnapshots ? <BoardReleaseOperationsApprovalSnapshotsPanel report={boardReleaseOperationsApprovalSnapshots} /> : null}
          {boardReleaseOperationsExportPackets ? <BoardReleaseOperationsExportPacketsPanel report={boardReleaseOperationsExportPackets} /> : null}
          {boardReleaseDistributionRecipientManifests ? (
            <BoardReleaseDistributionRecipientManifestsPanel report={boardReleaseDistributionRecipientManifests} />
          ) : null}
          {boardReleaseDistributionAcknowledgements ? (
            <BoardReleaseDistributionAcknowledgementsPanel report={boardReleaseDistributionAcknowledgements} />
          ) : null}
          {boardReleaseDistributionRetryPlanning ? <BoardReleaseDistributionRetryPlanningPanel report={boardReleaseDistributionRetryPlanning} /> : null}
          {boardReleaseDistributionAuditTimeline ? <BoardReleaseDistributionAuditTimelinePanel report={boardReleaseDistributionAuditTimeline} /> : null}
          {boardReleaseDistributionReadinessDashboard ? (
            <BoardReleaseDistributionReadinessDashboardPanel report={boardReleaseDistributionReadinessDashboard} />
          ) : null}
          {boardReleaseObservabilityEventHealth ? <BoardReleaseObservabilityEventHealthPanel report={boardReleaseObservabilityEventHealth} /> : null}
          {boardReleaseObservabilityIncidentNotes ? (
            <BoardReleaseObservabilityIncidentNotesPanel report={boardReleaseObservabilityIncidentNotes} />
          ) : null}
          {boardReleaseObservabilityTrendSnapshots ? (
            <BoardReleaseObservabilityTrendSnapshotsPanel report={boardReleaseObservabilityTrendSnapshots} />
          ) : null}
          {boardReleaseObservabilityAlertRouting ? (
            <BoardReleaseObservabilityAlertRoutingPanel report={boardReleaseObservabilityAlertRouting} />
          ) : null}
          {boardReleaseObservabilityExecutiveDigest ? (
            <BoardReleaseObservabilityExecutiveDigestPanel report={boardReleaseObservabilityExecutiveDigest} />
          ) : null}
          {boardReleaseCloseoutReadinessGates ? (
            <BoardReleaseCloseoutReadinessGatesPanel report={boardReleaseCloseoutReadinessGates} />
          ) : null}
          {boardReleaseCloseoutOwnerAcknowledgements ? (
            <BoardReleaseCloseoutOwnerAcknowledgementsPanel report={boardReleaseCloseoutOwnerAcknowledgements} />
          ) : null}
          {boardReleaseCloseoutArchiveManifests ? (
            <BoardReleaseCloseoutArchiveManifestsPanel report={boardReleaseCloseoutArchiveManifests} />
          ) : null}
          {boardReleaseCloseoutVarianceRemediation ? (
            <BoardReleaseCloseoutVarianceRemediationPanel report={boardReleaseCloseoutVarianceRemediation} />
          ) : null}
          {boardReleaseCloseoutExecutivePacket ? (
            <BoardReleaseCloseoutExecutivePacketPanel report={boardReleaseCloseoutExecutivePacket} />
          ) : null}
          {boardReleaseArchiveIntelligenceIndex ? (
            <BoardReleaseArchiveIntelligenceIndexPanel report={boardReleaseArchiveIntelligenceIndex} />
          ) : null}
          {boardReleaseArchiveAnomalyReview ? (
            <BoardReleaseArchiveAnomalyReviewPanel report={boardReleaseArchiveAnomalyReview} />
          ) : null}
          {boardReleaseArchiveTrendDigest ? (
            <BoardReleaseArchiveTrendDigestPanel report={boardReleaseArchiveTrendDigest} />
          ) : null}
          {boardReleaseArchiveReplaySimulator ? (
            <BoardReleaseArchiveReplaySimulatorPanel report={boardReleaseArchiveReplaySimulator} />
          ) : null}
          {boardReleaseArchiveIntelligencePacket ? (
            <BoardReleaseArchiveIntelligencePacketPanel
              canPersist={canManageWorkspaceEmail}
              history={boardReleaseArchiveIntelligencePacketHistory}
              report={boardReleaseArchiveIntelligencePacket}
              workspaceId={workspaceId}
            />
          ) : null}
          {boardReleaseArchiveIntelligenceNotificationRouting ? (
            <BoardReleaseArchiveIntelligenceNotificationRoutingPanel report={boardReleaseArchiveIntelligenceNotificationRouting} />
          ) : null}
          {boardReleaseArchiveIntelligenceApprovalWorkflow ? (
            <BoardReleaseArchiveIntelligenceApprovalWorkflowPanel report={boardReleaseArchiveIntelligenceApprovalWorkflow} />
          ) : null}
          {boardReleaseArchiveIntelligenceCommandCenter ? (
            <BoardReleaseArchiveIntelligenceCommandCenterPanel report={boardReleaseArchiveIntelligenceCommandCenter} />
          ) : null}
          {boardReleaseArchiveIntelligenceAutomationDigest ? (
            <BoardReleaseArchiveIntelligenceAutomationDigestPanel report={boardReleaseArchiveIntelligenceAutomationDigest} />
          ) : null}
          {boardReleaseArchiveEvidenceRetentionVault ? (
            <BoardReleaseArchiveEvidenceRetentionVaultPanel report={boardReleaseArchiveEvidenceRetentionVault} />
          ) : null}
          {boardReleaseArchiveEvidenceDiffSnapshots ? (
            <BoardReleaseArchiveEvidenceDiffSnapshotsPanel report={boardReleaseArchiveEvidenceDiffSnapshots} />
          ) : null}
          {boardReleaseArchiveEvidenceReviewerPackets ? (
            <BoardReleaseArchiveEvidenceReviewerPacketsPanel report={boardReleaseArchiveEvidenceReviewerPackets} />
          ) : null}
          {boardReleaseArchiveEvidenceExceptionRenewals ? (
            <BoardReleaseArchiveEvidenceExceptionRenewalSchedulerPanel report={boardReleaseArchiveEvidenceExceptionRenewals} />
          ) : null}
          {boardReleaseArchiveEvidenceReleaseHandoffDigest ? (
            <BoardReleaseArchiveEvidenceReleaseHandoffDigestPanel report={boardReleaseArchiveEvidenceReleaseHandoffDigest} />
          ) : null}
          {boardReleaseArchiveAssuranceDecisionMemo ? (
            <BoardReleaseArchiveAssuranceDecisionMemoPanel report={boardReleaseArchiveAssuranceDecisionMemo} />
          ) : null}
          {boardReleaseArchiveAssuranceNotarizationRegister ? (
            <BoardReleaseArchiveAssuranceNotarizationRegisterPanel report={boardReleaseArchiveAssuranceNotarizationRegister} />
          ) : null}
          {boardReleaseArchiveAssuranceDistributionMatrix ? (
            <BoardReleaseArchiveAssuranceDistributionMatrixPanel report={boardReleaseArchiveAssuranceDistributionMatrix} />
          ) : null}
          {boardReleaseArchiveAssurancePostReleaseAuditChecklist ? (
            <BoardReleaseArchiveAssurancePostReleaseAuditChecklistPanel report={boardReleaseArchiveAssurancePostReleaseAuditChecklist} />
          ) : null}
          {boardReleaseArchiveAssuranceFinalCloseoutCertificate ? (
            <BoardReleaseArchiveAssuranceFinalCloseoutCertificatePanel report={boardReleaseArchiveAssuranceFinalCloseoutCertificate} />
          ) : null}
          {boardReleaseArchiveCertificationHistoryLedger ? (
            <BoardReleaseArchiveCertificationHistoryLedgerPanel report={boardReleaseArchiveCertificationHistoryLedger} />
          ) : null}
          {boardReleaseArchiveCertificationEvidenceReplayVerifier ? (
            <BoardReleaseArchiveCertificationEvidenceReplayVerifierPanel report={boardReleaseArchiveCertificationEvidenceReplayVerifier} />
          ) : null}
          {boardReleaseArchiveCertificationExternalAuditorPacket ? (
            <BoardReleaseArchiveCertificationExternalAuditorPacketPanel report={boardReleaseArchiveCertificationExternalAuditorPacket} />
          ) : null}
          {boardReleaseArchiveCertificationRevocationWorkflow ? (
            <BoardReleaseArchiveCertificationRevocationWorkflowPanel report={boardReleaseArchiveCertificationRevocationWorkflow} />
          ) : null}
          {boardReleaseArchiveCertificationExecutiveAttestationDigest ? (
            <BoardReleaseArchiveCertificationExecutiveAttestationDigestPanel report={boardReleaseArchiveCertificationExecutiveAttestationDigest} />
          ) : null}
          {boardReleaseArchiveVerificationSignatureChainValidator ? (
            <BoardReleaseArchiveVerificationSignatureChainValidatorPanel report={boardReleaseArchiveVerificationSignatureChainValidator} />
          ) : null}
          {boardReleaseArchiveVerificationExceptionRegister ? (
            <BoardReleaseArchiveVerificationExceptionRegisterPanel report={boardReleaseArchiveVerificationExceptionRegister} />
          ) : null}
          {boardReleaseArchiveVerificationDistributionProofBundle ? (
            <BoardReleaseArchiveVerificationDistributionProofBundlePanel report={boardReleaseArchiveVerificationDistributionProofBundle} />
          ) : null}
          {boardReleaseArchiveVerificationReadinessTimeline ? (
            <BoardReleaseArchiveVerificationReadinessTimelinePanel report={boardReleaseArchiveVerificationReadinessTimeline} />
          ) : null}
          {boardReleaseArchiveVerificationFinalAcceptancePacket ? (
            <BoardReleaseArchiveVerificationFinalAcceptancePacketPanel report={boardReleaseArchiveVerificationFinalAcceptancePacket} />
          ) : null}
          {boardReleaseArchiveCustodyChainOfControlLedger ? (
            <BoardReleaseArchiveCustodyChainOfControlLedgerPanel report={boardReleaseArchiveCustodyChainOfControlLedger} />
          ) : null}
          {boardReleaseArchiveCustodyRetentionLockWorkflow ? (
            <BoardReleaseArchiveCustodyRetentionLockWorkflowPanel report={boardReleaseArchiveCustodyRetentionLockWorkflow} />
          ) : null}
          {boardReleaseArchiveCustodyAccessReviewQueue ? (
            <BoardReleaseArchiveCustodyAccessReviewQueuePanel report={boardReleaseArchiveCustodyAccessReviewQueue} />
          ) : null}
          {boardReleaseArchiveCustodyRestoreRehearsalPacket ? (
            <BoardReleaseArchiveCustodyRestoreRehearsalPacketPanel report={boardReleaseArchiveCustodyRestoreRehearsalPacket} />
          ) : null}
          {boardReleaseArchiveCustodyExecutiveCloseoutDigest ? (
            <BoardReleaseArchiveCustodyExecutiveCloseoutDigestPanel report={boardReleaseArchiveCustodyExecutiveCloseoutDigest} />
          ) : null}
          {boardReleaseArchiveOversightExceptionRenewalCalendar ? (
            <BoardReleaseArchiveOversightExceptionRenewalCalendarPanel report={boardReleaseArchiveOversightExceptionRenewalCalendar} />
          ) : null}
          {boardReleaseArchiveOversightEvidenceQualityMonitor ? (
            <BoardReleaseArchiveOversightEvidenceQualityMonitorPanel report={boardReleaseArchiveOversightEvidenceQualityMonitor} />
          ) : null}
          {boardReleaseArchiveOversightBoardDistributionDigest ? (
            <BoardReleaseArchiveOversightBoardDistributionDigestPanel report={boardReleaseArchiveOversightBoardDistributionDigest} />
          ) : null}
          {boardReleaseArchiveOversightIncidentReplayDrill ? (
            <BoardReleaseArchiveOversightIncidentReplayDrillPanel report={boardReleaseArchiveOversightIncidentReplayDrill} />
          ) : null}
          {boardReleaseArchiveOversightExecutiveHealthPacket ? (
            <BoardReleaseArchiveOversightExecutiveHealthPacketPanel report={boardReleaseArchiveOversightExecutiveHealthPacket} />
          ) : null}
          {boardReleaseArchiveStewardshipOwnershipRotationPlanner ? (
            <BoardReleaseArchiveStewardshipOwnershipRotationPlannerPanel report={boardReleaseArchiveStewardshipOwnershipRotationPlanner} />
          ) : null}
          {boardReleaseArchiveStewardshipEvidenceAgingForecast ? (
            <BoardReleaseArchiveStewardshipEvidenceAgingForecastPanel report={boardReleaseArchiveStewardshipEvidenceAgingForecast} />
          ) : null}
          {boardReleaseArchiveStewardshipExceptionBudgetLedger ? (
            <BoardReleaseArchiveStewardshipExceptionBudgetLedgerPanel report={boardReleaseArchiveStewardshipExceptionBudgetLedger} />
          ) : null}
          {boardReleaseArchiveStewardshipContinuityRehearsal ? (
            <BoardReleaseArchiveStewardshipContinuityRehearsalPanel report={boardReleaseArchiveStewardshipContinuityRehearsal} />
          ) : null}
          {boardReleaseArchiveStewardshipExecutivePacket ? (
            <BoardReleaseArchiveStewardshipExecutivePacketPanel report={boardReleaseArchiveStewardshipExecutivePacket} />
          ) : null}
          {boardReleaseArchiveGovernancePolicyCharter ? (
            <BoardReleaseArchiveGovernancePolicyCharterPanel report={boardReleaseArchiveGovernancePolicyCharter} />
          ) : null}
          {boardReleaseArchiveGovernanceControlOwnerMatrix ? (
            <BoardReleaseArchiveGovernanceControlOwnerMatrixPanel report={boardReleaseArchiveGovernanceControlOwnerMatrix} />
          ) : null}
          {boardReleaseArchiveGovernanceExceptionQuorumTracker ? (
            <BoardReleaseArchiveGovernanceExceptionQuorumTrackerPanel report={boardReleaseArchiveGovernanceExceptionQuorumTracker} />
          ) : null}
          {boardReleaseArchiveGovernancePolicyDriftMonitor ? (
            <BoardReleaseArchiveGovernancePolicyDriftMonitorPanel report={boardReleaseArchiveGovernancePolicyDriftMonitor} />
          ) : null}
          {boardReleaseArchiveGovernanceExecutivePacket ? (
            <BoardReleaseArchiveGovernanceExecutivePacketPanel report={boardReleaseArchiveGovernanceExecutivePacket} />
          ) : null}
          {boardReleaseArchiveGovernanceAutomationTriggerRegister ? (
            <BoardReleaseArchiveGovernanceAutomationTriggerRegisterPanel report={boardReleaseArchiveGovernanceAutomationTriggerRegister} />
          ) : null}
          {boardReleaseArchiveGovernanceAutomationRunbook ? (
            <BoardReleaseArchiveGovernanceAutomationRunbookPanel report={boardReleaseArchiveGovernanceAutomationRunbook} />
          ) : null}
          {boardReleaseArchiveGovernanceAutomationFailureLedger ? (
            <BoardReleaseArchiveGovernanceAutomationFailureLedgerPanel report={boardReleaseArchiveGovernanceAutomationFailureLedger} />
          ) : null}
          {boardReleaseArchiveGovernanceAutomationAuditTrail ? (
            <BoardReleaseArchiveGovernanceAutomationAuditTrailPanel report={boardReleaseArchiveGovernanceAutomationAuditTrail} />
          ) : null}
          {boardReleaseArchiveGovernanceAutomationExecutivePacket ? (
            <BoardReleaseArchiveGovernanceAutomationExecutivePacketPanel report={boardReleaseArchiveGovernanceAutomationExecutivePacket} />
          ) : null}
          <SignedNativeArtifactProvenanceLedgerPanel report={signedNativeArtifactProvenanceLedger} />
          <NativeArtifactSigningExecutionReceiptsPanel report={nativeArtifactSigningExecutionReceipts} />
          <CertificateBackedNativeArtifactIngestionPanel report={certificateBackedNativeArtifactIngestion} />
          <SignedNativePackageReadinessPacketPanel report={signedNativePackageReadinessPacket} />
          <NativeCadKernelCapabilityMatrixPanel report={nativeCadKernelCapabilityMatrix} />
          <CadKernelWorkerHealthPanel report={cadKernelWorkerHealth} />
          <CadConversionFixtureCorpusPanel report={cadConversionFixtureCorpus} />
          <NativeCadKernelExecutionRunnerPanel report={nativeCadKernelExecutionRunner} />
          <CadRuntimeAcceptancePacketPanel report={cadRuntimeAcceptancePacket} />
          <NativeReleasePromotionApprovalPanel report={nativeReleasePromotionApproval} />
          <LiveProductionParityEvidenceDashboardPanel report={liveProductionParityEvidenceDashboard} />
          <ProductionParityHistorySnapshotsPanel report={productionParityHistorySnapshots} />
          <VisualParityEvidencePanel report={visualParityEvidence} />
          <RollbackRehearsalEvidencePanel report={rollbackRehearsalEvidence} />
          {boardAuditEvidenceManifest ? <BoardAuditEvidenceManifestPanel manifest={boardAuditEvidenceManifest} /> : null}
          {boardAuditEvidenceVerification ? <BoardAuditEvidenceVerificationPanel report={boardAuditEvidenceVerification} /> : null}
          {boardAuditEvidenceAcceptance ? <BoardAuditEvidenceAcceptancePanel workflow={boardAuditEvidenceAcceptance} /> : null}
          {boardAuditEvidenceReadiness ? <BoardAuditEvidenceReadinessDigestPanel digest={boardAuditEvidenceReadiness} /> : null}
          {boardAssuranceNotificationRouting ? (
            <BoardAssuranceNotificationRoutingPanel
              canPersist={canManageWorkspaceEmail}
              history={boardAssuranceNotificationHistory}
              report={boardAssuranceNotificationRouting}
              workspaceId={workspaceId}
            />
          ) : null}
          <ProjectIncidentHistoryPanel history={projectIncidentHistory} />
          {canManageWorkspaceEmail ? <ProjectIncidentPostmortemPanel report={incidentPostmortemReport} /> : null}
          {canManageWorkspaceEmail ? <RuntimeVersionWatchlistPanel report={runtimeVersionWatchlist} /> : null}
          {canManageWorkspaceEmail ? <FreeTierResourceMonitorPanel report={freeTierResourceMonitor} /> : null}
          {costQuotaForecast ? <CostQuotaForecastSimulatorPanel report={costQuotaForecast} /> : null}
          {canManageWorkspaceEmail ? (
            <RoleAccessReviewCampaignPanel canPersist={canManageWorkspaceEmail} history={roleAccessReviewHistory} report={roleAccessReviewCampaign} workspaceId={workspaceId} />
          ) : null}
          {canManageWorkspaceEmail ? <ReleaseArchiveExplorerPanel report={releaseArchiveExplorer} /> : null}
          {canManageWorkspaceEmail ? <ReviewerHandoffPacketPanel report={reviewerHandoffPacket} /> : null}
          {canManageWorkspaceEmail ? <SignedAuditEvidencePacketPanel report={signedAuditEvidencePacketVerification} /> : null}
          {canManageWorkspaceEmail ? <CompliancePacketSharingPanel history={compliancePacketShareHistory} sources={compliancePacketShareSources} workspaceId={workspaceId} /> : null}
          {canManageWorkspaceEmail ? <ScenePermissionPolicyTemplatesPanel report={scenePermissionPolicyTemplatesReport} /> : null}
          {canManageWorkspaceEmail ? <PolicyAsCodeChecksPanel report={policyAsCodeReport} /> : null}
          {workspacePolicySimulation ? <WorkspacePolicySimulatorPanel report={workspacePolicySimulation} /> : null}
          {canManageWorkspaceEmail ? <GovernanceTimelinePanel report={governanceTimelineReport} /> : null}
          {canManageWorkspaceEmail ? <GovernanceExceptionWorkflowPanel report={governanceExceptionWorkflow} /> : null}
          {canManageWorkspaceEmail ? <WorkspaceEvidenceGraphPanel report={workspaceEvidenceGraph} /> : null}
          {deploymentEnvironmentDrift ? <DeploymentEnvironmentDriftPanel report={deploymentEnvironmentDrift} /> : null}
          {releaseReadinessWebhooks ? <ReleaseReadinessWebhooksPanel history={releaseReadinessWebhookHistory} report={releaseReadinessWebhooks} /> : null}
          {canManageWorkspaceEmail ? <WorkspaceMaintenanceCommandCenterPanel report={workspaceMaintenanceCommandCenter} /> : null}
          <ProjectRegressionWatchlistPanel
            canPersist={canManageWorkspaceEmail}
            history={regressionWatchlistHistory}
            itemStates={regressionWatchlistStates}
            report={regressionWatchlist}
            workspaceId={workspaceId}
          />
          <WorkspaceReleaseCalendarPanel error={"error" in releaseCalendarResult ? releaseCalendarResult.error : null} report={releaseCalendarReport} />
          <WorkspaceReleaseRunbookPanel error={"error" in releaseRunbookResult ? releaseRunbookResult.error : null} report={releaseRunbookReport} />
          <ProjectExportLineagePanel reports={exportLineageReports} />
          <ProjectArtifactRegistryPanel report={artifactRegistryReport} />
          <ProjectArtifactProvenancePanel report={artifactProvenanceReport} />
          <ProjectAppPackageCertificatePanel report={appPackageCertificateReport} />
          <CadConversionExecutionQueuePanel report={cadConversionExecutionQueue} />
          <ProjectCadConversionQueuePanel report={cadConversionQueueReport} />
          <ProjectPublicSurfaceHealthPanel error={"error" in publicSurfaceHealthResult ? publicSurfaceHealthResult.error : null} report={publicSurfaceHealthReport} />
          <WorkspaceSecurityCompliancePanel report={securityComplianceReport} />
          <WorkspaceRiskDigestPanel history={workspaceRiskDigestHistory} report={workspaceRiskDigest} workspaceId={workspaceId} />
          {canManageWorkspaceEmail && activeDashboardProjects.length > 0 ? (
            <ReleaseEvidenceBundlePanel downloadHref={`/api/workspaces/${encodeURIComponent(workspaceId)}/release-evidence-bundle`} summary={releaseEvidenceBundlePreview} />
          ) : null}
          {canManageWorkspaceEmail ? <DeployPromotionDecisionBoardPanel report={deployPromotionDecisionBoard} /> : null}
          <ReleaseDrillSimulationPanel canPersist={canManageWorkspaceEmail} history={releaseDrillHistory} report={releaseDrillSimulationReport} workspaceId={workspaceId} />
          {canManageWorkspaceEmail ? <WorkspaceBackupRestoreRehearsalPanel report={backupRestoreRehearsal} /> : null}
          {canManageWorkspaceEmail && offlineDesktopHandoffKitPreview ? (
            <OfflineDesktopHandoffKitPanel
              downloadHref={`/api/workspaces/${encodeURIComponent(workspaceId)}/offline-desktop-handoff-kit`}
              summary={offlineDesktopHandoffKitPreview}
            />
          ) : null}
          {canManageWorkspaceEmail && activeDashboardProjects.length > 0 ? (
            <ReleaseEvidenceDiffPanel
              current={{
                generatedAt,
                offlineDesktopHandoffSummary: offlineDesktopHandoffKitPreview,
                releaseEvidenceSummary: releaseEvidenceBundlePreview,
                workspace: {
                  id: workspaceDashboard.id,
                  name: workspaceDashboard.name,
                  role: workspaceDashboard.role,
                },
              }}
            />
          ) : null}
          <ProjectSceneQaSnapshotPanel report={sceneQaSnapshotReport} />
          <ProjectSceneQaBaselineTrendsPanel
            error={"error" in sceneQaBaselineTrendResult ? sceneQaBaselineTrendResult.error : null}
            report={"error" in sceneQaBaselineTrendResult ? null : sceneQaBaselineTrendResult.trendReport}
          />
          <ProjectCollaborationInboxPanel inbox={collaborationInbox} />
          <ProjectHealthNotificationCenter center={healthNotificationCenter} />

          <Tabs className="mt-6" defaultValue="projects">
            <TabsList>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="website">Website</TabsTrigger>
              <TabsTrigger value="workspace">Workspace</TabsTrigger>
              {isAdmin ? <TabsTrigger value="audit">Audit</TabsTrigger> : null}
              {isAdmin ? <TabsTrigger value="users">Users</TabsTrigger> : null}
            </TabsList>
            <TabsContent className="mt-4" value="projects">
              <ProjectDashboardProjects
                folderCounts={folderCounts}
                folders={folderSummaries}
                projects={projects}
                selectedFolderId={selectedFolderId}
                showingTrash={showingTrash}
                unfiledCount={unfiledCount}
                view={view}
                workspaceId={workspaceId}
                workspaceMembers={workspaceDashboard.members}
              />
            </TabsContent>
            <TabsContent className="mt-4" value="templates">
              <WorkspaceTemplateManager initialTemplates={workspaceTemplates} sourceProjects={templateSourceProjects} workspaceId={workspaceId} />
            </TabsContent>
            <TabsContent className="mt-4" value="website">
              <Card>
                <CardHeader>
                  <CardTitle>Website view</CardTitle>
                  <CardDescription>Published links, embeds, and API-ready scenes.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ProjectWebsiteTable scenes={websiteRows} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent className="mt-4" value="workspace">
              <div className="grid gap-4">
                <WorkspaceNotificationEmailDeliveryPanel
                  error={boardAwareNotificationEmailDeliveryError}
                  report={boardAwareNotificationEmailDeliveryReport}
                />
                <WorkspaceNotificationPreferencesPanel initialPreferences={notificationPreferences} workspaceId={workspaceId} />
                <WorkspaceManagementPanel workspace={workspaceDashboard} />
              </div>
            </TabsContent>
            {isAdmin ? (
              <TabsContent className="mt-4" value="audit">
                <ProjectAuditSearchPanel rows={auditSearchRows} />
              </TabsContent>
            ) : null}
            {isAdmin ? (
              <TabsContent className="mt-4" value="users">
                <Card>
                  <CardHeader>
                    <CardTitle>Auth management</CardTitle>
                    <CardDescription>Users, email verification state, project ownership, and active sessions.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ProjectAdminUsersTable users={userRows} />
                  </CardContent>
                </Card>
              </TabsContent>
            ) : null}
          </Tabs>
        </section>
      </div>
    </main>
  );
}

function MetricCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
        <div className="flex size-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">{icon}</div>
      </CardContent>
    </Card>
  );
}
