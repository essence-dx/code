import type { LibraryPublishReadinessReport } from "@/features/editor/library-publish-readiness";
import type { LibraryPublishRiskReport } from "@/features/editor/library-publish-risk";
import type { LibraryReleaseApprovalReport } from "@/features/editor/library-release-approval";
import type { LibraryReleaseArchive } from "@/features/editor/library-release-archive";
import type { LibraryReleaseEvidenceSummary } from "@/features/editor/library-release-evidence";
import type { LibraryReleaseGovernanceWarning } from "@/features/editor/library-release-governance-review";
import type { LibraryReleaseReplayItem } from "@/features/editor/library-release-replay";
import { getLibraryReleaseReplaySummary } from "@/features/editor/library-release-replay";
import type { LibraryReleaseSearchResult } from "@/features/editor/library-release-search";

export const libraryReleaseEvidenceBundleType =
  "essence.library-release-evidence-bundle";

export type LibraryReleaseEvidenceBundle = {
  type: typeof libraryReleaseEvidenceBundleType;
  version: 1;
  exportedAt: string;
  release: {
    libraryId: string;
    libraryName: string;
    teamName: string;
    currentVersion: number;
    targetVersion: number;
    componentCount: number;
    payloadHash: string;
  };
  readiness: {
    label: string;
    score: number;
    canPublish: boolean;
    readyCount: number;
    reviewCount: number;
    blockedCount: number;
  };
  risk: {
    label: string;
    score: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };
  approval: {
    itemCount: number;
    acknowledgedCount: number;
    outstandingCount: number;
    canApprove: boolean;
    items: LibraryReleaseApprovalReport["items"];
  };
  evidence: LibraryReleaseEvidenceSummary;
  governanceWarnings: LibraryReleaseGovernanceWarning[];
  replay: {
    readyCount: number;
    reviewCount: number;
    missingCount: number;
    items: LibraryReleaseReplayItem[];
  };
  search: {
    resultCount: number;
    results: LibraryReleaseSearchResult[];
  };
};

export function createLibraryReleaseEvidenceBundle({
  approval,
  archive,
  evidence,
  readiness,
  replayItems,
  risk,
  searchResults,
  warnings,
}: {
  approval: LibraryReleaseApprovalReport;
  archive: LibraryReleaseArchive;
  evidence: LibraryReleaseEvidenceSummary;
  readiness: LibraryPublishReadinessReport;
  replayItems: LibraryReleaseReplayItem[];
  risk: LibraryPublishRiskReport;
  searchResults: LibraryReleaseSearchResult[];
  warnings: LibraryReleaseGovernanceWarning[];
}): LibraryReleaseEvidenceBundle {
  const replaySummary = getLibraryReleaseReplaySummary(replayItems);

  return {
    type: libraryReleaseEvidenceBundleType,
    version: 1,
    exportedAt: new Date().toISOString(),
    release: {
      libraryId: archive.library.id,
      libraryName: archive.library.name,
      teamName: archive.library.teamName,
      currentVersion: archive.library.currentVersion,
      targetVersion: archive.library.targetVersion,
      componentCount: archive.library.componentCount,
      payloadHash: archive.integrity.payloadHash,
    },
    readiness: {
      label: readiness.label,
      score: readiness.score,
      canPublish: readiness.canPublish,
      readyCount: readiness.readyCount,
      reviewCount: readiness.reviewCount,
      blockedCount: readiness.blockedCount,
    },
    risk: {
      label: risk.label,
      score: risk.score,
      highCount: risk.highCount,
      mediumCount: risk.mediumCount,
      lowCount: risk.lowCount,
    },
    approval: {
      itemCount: approval.itemCount,
      acknowledgedCount: approval.acknowledgedCount,
      outstandingCount: approval.outstandingCount,
      canApprove: approval.canApprove,
      items: approval.items,
    },
    evidence,
    governanceWarnings: warnings,
    replay: {
      readyCount: replaySummary.readyCount,
      reviewCount: replaySummary.reviewCount,
      missingCount: replaySummary.missingCount,
      items: replayItems,
    },
    search: {
      resultCount: searchResults.length,
      results: searchResults,
    },
  };
}

export function getLibraryReleaseEvidenceBundleJson(
  input: Parameters<typeof createLibraryReleaseEvidenceBundle>[0],
) {
  return `${JSON.stringify(createLibraryReleaseEvidenceBundle(input), null, 2)}\n`;
}
