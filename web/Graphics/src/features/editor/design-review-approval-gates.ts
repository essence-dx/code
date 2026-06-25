import type { AssetLibraryManagementReport } from "@/features/editor/asset-library-management";
import type { AssetMediaGovernanceReport } from "@/features/editor/asset-media-governance";
import type { ComponentUsageIntelligenceReport } from "@/features/editor/component-usage-intelligence";
import type { PerformanceRegressionExport } from "@/features/editor/performance-regression-export";
import type { PluginDeveloperOpsReport } from "@/features/editor/plugin-developer-operations";
import type { ProductionDeploySmokeReport } from "@/features/editor/production-deploy-smoke";
import type { ResponsiveConstraintsReviewReport } from "@/features/editor/responsive-constraints-review-types";
import type { VariableGovernanceReviewReport } from "@/features/editor/variable-governance-review-types";
import type { DesignReviewGateInput } from "@/features/editor/design-review-approval-types";

export function getDesignReviewApprovalGates({
  assetLibrary,
  assetMedia,
  componentUsage,
  performanceRegression,
  pluginDeveloperOps,
  productionDeploySmoke,
  responsiveConstraints,
  variableGovernance,
}: {
  assetLibrary: AssetLibraryManagementReport;
  assetMedia: AssetMediaGovernanceReport;
  componentUsage: ComponentUsageIntelligenceReport;
  performanceRegression: PerformanceRegressionExport;
  pluginDeveloperOps: PluginDeveloperOpsReport;
  productionDeploySmoke: ProductionDeploySmokeReport;
  responsiveConstraints: ResponsiveConstraintsReviewReport;
  variableGovernance: VariableGovernanceReviewReport;
}): DesignReviewGateInput[] {
  return [
    {
      id: "variables",
      label: "Variables",
      status: variableGovernance.status,
      score: variableGovernance.score,
      blockedCount: variableGovernance.blockedCount,
      reviewCount: variableGovernance.reviewCount,
      evidenceCount:
        variableGovernance.variableCount +
        variableGovernance.modeCount +
        variableGovernance.collectionCount,
    },
    {
      id: "components",
      label: "Components",
      status: componentUsage.status,
      score: componentUsage.score,
      blockedCount: componentUsage.blockedCount,
      reviewCount: componentUsage.reviewCount,
      evidenceCount: componentUsage.componentCount + componentUsage.instanceCount,
    },
    {
      id: "plugins",
      label: "Plugins",
      status: pluginDeveloperOps.status,
      score: pluginDeveloperOps.score,
      blockedCount: pluginDeveloperOps.blockedCount,
      reviewCount: pluginDeveloperOps.reviewCount,
      evidenceCount:
        pluginDeveloperOps.manifestCount +
        pluginDeveloperOps.runCount +
        pluginDeveloperOps.replayableApprovalCount,
    },
    {
      id: "responsive",
      label: "Responsive",
      status: responsiveConstraints.status,
      score: responsiveConstraints.score,
      blockedCount: responsiveConstraints.blockedCount,
      reviewCount: responsiveConstraints.reviewCount,
      evidenceCount:
        responsiveConstraints.frameCount +
        responsiveConstraints.simulatedFrameCount +
        responsiveConstraints.repairableCount,
    },
    {
      id: "visual-qa",
      label: "Visual QA",
      status: performanceRegression.status,
      score: performanceRegression.score,
      blockedCount: performanceRegression.blockedCount,
      reviewCount: performanceRegression.reviewCount,
      evidenceCount:
        performanceRegression.canvasRenderBudget.visibleLayerCount +
        performanceRegression.performanceBaseline.baselineCount +
        performanceRegression.runtimeObservability.issueCount,
    },
    {
      id: "deploy-smoke",
      label: "Deploy smoke",
      status: productionDeploySmoke.status,
      score: productionDeploySmoke.score,
      blockedCount: productionDeploySmoke.blockedCount,
      reviewCount: productionDeploySmoke.reviewCount,
      evidenceCount:
        productionDeploySmoke.routeCount + productionDeploySmoke.commands.length,
    },
    {
      id: "asset-media",
      label: "Asset media",
      status: assetMedia.status,
      score: assetMedia.score,
      blockedCount: assetMedia.blockedCount,
      reviewCount: assetMedia.reviewCount,
      evidenceCount:
        assetMedia.imageLayerCount +
        assetMedia.fontFamilyCount +
        assetMedia.optimizationQueueCount,
    },
    {
      id: "asset-library",
      label: "Asset library",
      status: assetLibrary.status,
      score: assetLibrary.score,
      blockedCount: assetLibrary.blockedCount,
      reviewCount: assetLibrary.reviewCount,
      evidenceCount:
        assetLibrary.mediaAssetCount +
        assetLibrary.fontFamilyCount +
        assetLibrary.reusableMediaCount,
    },
  ];
}
