"use client";

import { useMemo, useRef, useState } from "react";
import { Download, PackageCheck, PackageOpen, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getComponentLibraryUpdateReview } from "@/features/editor/component-library-review";
import type { LocalLibraryStatus } from "@/features/editor/component-library-manifest";
import {
  LibraryPublishReadinessPanel,
  LibraryPublishRiskPanel,
  LibraryReleaseApprovalPanel,
  LibraryReleaseGovernancePanel,
  LibraryReleaseNotesPanel,
  LibraryReleaseSessionControls,
  verifyArchiveFile,
} from "@/features/editor/components/library-release-panels";
import { LibraryReleaseSearchPanel } from "@/features/editor/components/library-release-search-panel";
import type { LibraryReleaseApprovalSnapshot } from "@/features/editor/library-release-approval";
import type { LibraryReleaseApprovalReport } from "@/features/editor/library-release-approval";
import {
  createLibraryReleaseApprovalSnapshot,
  getLibraryReleaseApprovalReport,
} from "@/features/editor/library-release-approval";
import { getLibraryReleaseGovernanceWarnings } from "@/features/editor/library-release-governance-review";
import { getLibraryReleaseEvidenceSummary } from "@/features/editor/library-release-evidence";
import { getLibraryReleaseReplayChecklist } from "@/features/editor/library-release-replay";
import { getLibraryReleaseSearchResults } from "@/features/editor/library-release-search";
import type {
  LibraryReleaseArchive,
  LibraryReleaseArchiveComparison,
  LibraryReleaseArchiveImportSummary,
  LibraryReleaseArchiveVerification,
} from "@/features/editor/library-release-archive";
import { withLibraryReleaseApprovalReport } from "@/features/editor/library-release-archive";
import type { LibraryPublishReadinessReport } from "@/features/editor/library-publish-readiness";
import type { LibraryPublishRiskReport } from "@/features/editor/library-publish-risk";
import type { LibraryReleaseNotesReport } from "@/features/editor/library-release-notes";
import type {
  DesignComponent,
  DesignLibraryMetadata,
} from "@/features/editor/types";

type ComponentLibraryControlsProps = {
  libraryMetadata?: DesignLibraryMetadata;
  libraryStatus: LocalLibraryStatus;
  publishReadiness: LibraryPublishReadinessReport;
  publishRisk: LibraryPublishRiskReport;
  releaseNotes: LibraryReleaseNotesReport;
  releaseArchive: LibraryReleaseArchive;
  components: DesignComponent[];
  pendingUpdates: Record<string, DesignComponent>;
  onUpdateLibraryMetadata: (
    patch: Partial<Pick<DesignLibraryMetadata, "name" | "teamName">>,
  ) => void;
  onPublishLibrary: () => void;
  onExportLibrary: () => void;
  onExportDesignSystemPackage: () => void;
  onImportLibrary: (file: File) => void;
  onAcceptLibraryUpdate: (componentId: string) => void;
  onReviewDocumentation: () => void;
  onReviewStaleInstances: () => void;
  onAcceptAllLibraryUpdates: () => void;
};

export function ComponentLibraryControls({
  libraryMetadata,
  libraryStatus,
  publishReadiness,
  publishRisk,
  releaseNotes,
  releaseArchive,
  components,
  pendingUpdates,
  onUpdateLibraryMetadata,
  onPublishLibrary,
  onExportLibrary,
  onExportDesignSystemPackage,
  onImportLibrary,
  onAcceptLibraryUpdate,
  onReviewDocumentation,
  onReviewStaleInstances,
  onAcceptAllLibraryUpdates,
}: ComponentLibraryControlsProps) {
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const archiveInputRef = useRef<HTMLInputElement>(null);
  const [acknowledgedApprovalIds, setAcknowledgedApprovalIds] = useState<
    string[]
  >([]);
  const [approvalNotes, setApprovalNotes] = useState<Record<string, string>>(
    {},
  );
  const [approvalSnapshots, setApprovalSnapshots] = useState<
    LibraryReleaseApprovalSnapshot[]
  >([]);
  const [approvalSessionLabel, setApprovalSessionLabel] = useState("");
  const [approvalReviewOwner, setApprovalReviewOwner] = useState("");
  const [approvalReviewerNote, setApprovalReviewerNote] = useState("");
  const [archiveVerification, setArchiveVerification] =
    useState<LibraryReleaseArchiveVerification | null>(null);
  const [archiveComparison, setArchiveComparison] =
    useState<LibraryReleaseArchiveComparison | null>(null);
  const [archiveImportSummary, setArchiveImportSummary] =
    useState<LibraryReleaseArchiveImportSummary | null>(null);
  const [importedApprovalReport, setImportedApprovalReport] =
    useState<LibraryReleaseApprovalReport | null>(null);
  const [releaseSearchQuery, setReleaseSearchQuery] = useState("");
  const pendingEntries = Object.entries(pendingUpdates);
  const componentById = new Map(
    components.map((component) => [component.id, component]),
  );
  const approvalReport = useMemo(
    () =>
      getLibraryReleaseApprovalReport({
        publishReadiness,
        publishRisk,
        acknowledgedItemIds: new Set(acknowledgedApprovalIds),
        acknowledgementNotes: approvalNotes,
      }),
    [acknowledgedApprovalIds, approvalNotes, publishReadiness, publishRisk],
  );
  const canPublishApproved =
    publishReadiness.canPublish && approvalReport.outstandingCount === 0;
  const approvedReleaseArchive = useMemo(
    () => withLibraryReleaseApprovalReport(releaseArchive, approvalReport),
    [approvalReport, releaseArchive],
  );
  const governanceWarnings = useMemo(
    () =>
      getLibraryReleaseGovernanceWarnings({
        archiveComparison,
        archiveVerification,
        approval: approvalReport,
      }),
    [approvalReport, archiveComparison, archiveVerification],
  );
  const evidenceSummary = useMemo(
    () =>
      getLibraryReleaseEvidenceSummary({
        approval: approvalReport,
        archive: approvedReleaseArchive,
        archiveComparison,
        archiveVerification,
        warnings: governanceWarnings,
      }),
    [
      approvalReport,
      approvedReleaseArchive,
      archiveComparison,
      archiveVerification,
      governanceWarnings,
    ],
  );
  const replayChecklist = useMemo(
    () =>
      getLibraryReleaseReplayChecklist({
        archiveComparison,
        archiveImportSummary,
        archiveVerification,
        importedApproval: importedApprovalReport,
      }),
    [
      archiveComparison,
      archiveImportSummary,
      archiveVerification,
      importedApprovalReport,
    ],
  );
  const releaseSearchResults = useMemo(
    () =>
      getLibraryReleaseSearchResults({
        archiveImportSummary,
        evidence: evidenceSummary,
        query: releaseSearchQuery,
        replayItems: replayChecklist,
        warnings: governanceWarnings,
      }),
    [
      archiveImportSummary,
      evidenceSummary,
      governanceWarnings,
      releaseSearchQuery,
      replayChecklist,
    ],
  );
  const approvalStateCount = getApprovalSessionStateCount({
    acknowledgedApprovalIds,
    approvalNotes,
    approvalReviewOwner,
    approvalReviewerNote,
    approvalSessionLabel,
  });
  const archiveReviewStateCount = [
    archiveVerification,
    archiveComparison,
    archiveImportSummary,
    importedApprovalReport,
  ].filter(Boolean).length;

  return (
    <div className="space-y-2 rounded-md border border-border bg-background p-2">
      <div className="grid grid-cols-2 gap-2">
        <Input
          value={libraryMetadata?.name ?? "Essence Component Library"}
          className="h-8 px-2 text-xs"
          aria-label="Library name"
          onChange={(event) =>
            onUpdateLibraryMetadata({ name: event.target.value })
          }
        />
        <Input
          value={libraryMetadata?.teamName ?? "Personal"}
          className="h-8 px-2 text-xs"
          aria-label="Library team"
          onChange={(event) =>
            onUpdateLibraryMetadata({ teamName: event.target.value })
          }
        />
      </div>
      <div className="flex items-center justify-between gap-2 font-mono text-[10px] text-muted-foreground">
        <span>v{libraryMetadata?.version ?? 0}</span>
        <span>{libraryStatus.componentCount} components</span>
        <span>{libraryStatus.changedCount} changes</span>
        <span>{libraryStatus.pendingUpdateCount} updates</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-8 gap-1.5 px-2 text-xs"
          disabled={!canPublishApproved}
          onClick={onPublishLibrary}
        >
          <PackageCheck className="size-3.5" />
          Publish
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 gap-1.5 px-2 text-xs"
          onClick={onExportDesignSystemPackage}
        >
          <PackageOpen className="size-3.5" />
          Pack
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 gap-1.5 px-2 text-xs"
          onClick={onExportLibrary}
        >
          <Download className="size-3.5" />
          Export
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 gap-1.5 px-2 text-xs"
          onClick={() => libraryInputRef.current?.click()}
        >
          <Upload className="size-3.5" />
          Import
        </Button>
      </div>
      <LibraryPublishReadinessPanel
        report={publishReadiness}
        onReviewDocumentation={onReviewDocumentation}
        onReviewStaleInstances={onReviewStaleInstances}
        onAcceptAllLibraryUpdates={onAcceptAllLibraryUpdates}
      />
      <LibraryPublishRiskPanel report={publishRisk} />
      <LibraryReleaseApprovalPanel
        report={approvalReport}
        snapshots={approvalSnapshots}
        sessionLabel={approvalSessionLabel}
        reviewOwner={approvalReviewOwner}
        reviewerNote={approvalReviewerNote}
        onUpdateSessionLabel={setApprovalSessionLabel}
        onUpdateReviewOwner={setApprovalReviewOwner}
        onUpdateReviewerNote={setApprovalReviewerNote}
        onToggleItem={(itemId) =>
          setAcknowledgedApprovalIds((currentIds) =>
            currentIds.includes(itemId)
              ? currentIds.filter((currentId) => currentId !== itemId)
              : [...currentIds, itemId],
          )
        }
        onUpdateNote={(itemId, note) =>
          setApprovalNotes((currentNotes) => ({
            ...currentNotes,
            [itemId]: note,
          }))
        }
        onRestoreSnapshot={(snapshot) => {
          setAcknowledgedApprovalIds(snapshot.acknowledgedItemIds);
          setApprovalNotes(snapshot.notes);
        }}
        onCaptureSnapshot={() =>
          setApprovalSnapshots((currentSnapshots) =>
            [
              createLibraryReleaseApprovalSnapshot({
                report: approvalReport,
                publishReadiness,
                publishRisk,
                libraryName:
                  libraryMetadata?.name?.trim() || "Essence Component Library",
                targetVersion: (libraryMetadata?.version ?? 0) + 1,
                sessionLabel: approvalSessionLabel,
                reviewOwner: approvalReviewOwner,
                reviewerNote: approvalReviewerNote,
              }),
              ...currentSnapshots,
            ].slice(0, 5),
          )
        }
      />
      <LibraryReleaseGovernancePanel
        archive={approvedReleaseArchive}
        approval={approvalReport}
        evidence={evidenceSummary}
        readiness={publishReadiness}
        replayItems={replayChecklist}
        risk={publishRisk}
        searchResults={releaseSearchResults}
        warnings={governanceWarnings}
      />
      <LibraryReleaseSessionControls
        approvalStateCount={approvalStateCount}
        archiveStateCount={archiveReviewStateCount}
        searchActive={releaseSearchQuery.trim().length > 0}
        onClearSearch={() => setReleaseSearchQuery("")}
        onResetApprovalSession={() => {
          setAcknowledgedApprovalIds([]);
          setApprovalNotes({});
          setApprovalSessionLabel("");
          setApprovalReviewOwner("");
          setApprovalReviewerNote("");
        }}
        onResetArchiveReview={() => {
          setArchiveVerification(null);
          setArchiveComparison(null);
          setArchiveImportSummary(null);
          setImportedApprovalReport(null);
        }}
      />
      <LibraryReleaseSearchPanel
        query={releaseSearchQuery}
        results={releaseSearchResults}
        onQueryChange={setReleaseSearchQuery}
      />
      <LibraryReleaseNotesPanel
        report={releaseNotes}
        archive={approvedReleaseArchive}
        archiveComparison={archiveComparison}
        archiveImportSummary={archiveImportSummary}
        archiveVerification={archiveVerification}
        importedApproval={importedApprovalReport}
        replayChecklist={replayChecklist}
        onRestoreImportedApproval={(approval) => {
          setAcknowledgedApprovalIds(
            approval.items
              .filter((item) => item.acknowledged)
              .map((item) => item.id),
          );
          setApprovalNotes(
            Object.fromEntries(
              approval.items
                .filter((item) => item.note?.trim())
                .map((item) => [item.id, item.note?.trim() ?? ""]),
            ),
          );
        }}
        onVerifyArchive={() => archiveInputRef.current?.click()}
      />
      <input
        ref={libraryInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";

          if (file) {
            onImportLibrary(file);
          }
        }}
      />
      <input
        ref={archiveInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";

          if (file) {
            void verifyArchiveFile(
              file,
              approvedReleaseArchive,
              setArchiveVerification,
              setArchiveComparison,
              setArchiveImportSummary,
              setImportedApprovalReport,
            );
          }
        }}
      />
      {pendingEntries.length > 0 ? (
        <div className="space-y-1 border-t border-border pt-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="mb-1 h-7 w-full px-2 text-xs"
            onClick={onAcceptAllLibraryUpdates}
          >
            Accept all updates
          </Button>
          {pendingEntries.map(([componentId, component]) => {
            const review = getComponentLibraryUpdateReview(
              componentById.get(componentId),
              component,
            );

            return (
              <div
                key={componentId}
                className="rounded-sm border border-border/70 bg-muted/20 p-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate font-medium">
                    {component.name}
                  </span>
                  <Badge variant="outline" className="shrink-0">
                    {review.title}
                  </Badge>
                </div>
                <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                  {review.detail}
                </div>
                <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                  {review.changes.slice(0, 3).map((change) => (
                    <div key={change} className="truncate">
                      {change}
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="mt-2 h-7 w-full px-2 text-xs"
                  onClick={() => onAcceptLibraryUpdate(componentId)}
                >
                  Accept update
                </Button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function getApprovalSessionStateCount({
  acknowledgedApprovalIds,
  approvalNotes,
  approvalReviewOwner,
  approvalReviewerNote,
  approvalSessionLabel,
}: {
  acknowledgedApprovalIds: string[];
  approvalNotes: Record<string, string>;
  approvalReviewOwner: string;
  approvalReviewerNote: string;
  approvalSessionLabel: string;
}) {
  return (
    acknowledgedApprovalIds.length +
    Object.values(approvalNotes).filter((note) => note.trim()).length +
    [approvalSessionLabel, approvalReviewOwner, approvalReviewerNote].filter(
      (value) => value.trim(),
    ).length
  );
}
