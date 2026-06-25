"use client";

import Link from "next/link";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Circle, Download, ExternalLink, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ExportProofBundleCard } from "@/features/review/components/export-proof-bundle-card";
import { ExportProofBundleImportPanel } from "@/features/review/components/export-proof-bundle-import-panel";
import { PublishPrepPanel } from "@/features/review/components/publish-prep-panel";
import { ReleaseReviewHandoffPanel } from "@/features/review/components/release-review-handoff-panel";
import { ReviewerAuditPacketCard } from "@/features/review/components/reviewer-audit-packet-card";
import { StaleReviewPackagePanel } from "@/features/review/components/stale-review-package-panel";
import { createDesktopLaunchProofSummary } from "@/lib/desktop/desktop-launch-proof";
import { loadDesktopVerificationHistory } from "@/lib/desktop/desktop-verification-history";
import {
  addExportReviewComment,
  getExportReviewPackage,
  listExportReviewComments,
  listExportReviewDownloads,
  recordExportReviewDownload,
  setExportReviewCommentResolved,
  setExportReviewStatus,
  type ExportReviewComment,
  type ExportReviewDownload,
  type ExportReviewPackage,
  type ExportReviewStatus,
} from "@/lib/projects/collaboration-store";
import type { ExportQaSnapshotSection, MediaAttributionItem } from "@/lib/editor/types";
import { createReleaseEvidenceSummary, loadReleaseEvidence } from "@/lib/product/release-evidence";
import { loadReleaseEvidenceHistory, selectPinnedReleaseEvidenceHistoryEntry } from "@/lib/product/release-evidence-history";
import { compareExportProofBundles, createExportProofBundle, type ExportProofBundle, type ExportProofBundleComparison } from "@/lib/projects/export-proof-bundle";
import { createReleaseReviewHandoffComparison, type ReleaseReviewHandoffComparison } from "@/lib/projects/release-review-handoff";
import { createStaleReviewPackageReport, type StaleReviewPackageReport } from "@/lib/projects/stale-review-package";
import {
  clearImportedProofBundle,
  importExportProofBundle,
  loadExportProofBundleHistory,
  type ExportProofBundleHistoryEntry,
} from "@/lib/projects/export-proof-bundle-history";

const statusLabels: Record<ExportReviewStatus, string> = {
  "needs-review": "Needs review",
  "changes-requested": "Changes requested",
  approved: "Approved",
};

export function ExportReviewPageClient({ reviewId }: { reviewId: string }) {
  const [review, setReview] = useState<ExportReviewPackage | null>(null);
  const [comments, setComments] = useState<ExportReviewComment[]>([]);
  const [downloads, setDownloads] = useState<ExportReviewDownload[]>([]);
  const [proofBundle, setProofBundle] = useState<ExportProofBundle | null>(null);
  const [importedProofBundle, setImportedProofBundle] = useState<ExportProofBundle | null>(null);
  const [importedProofEntry, setImportedProofEntry] = useState<ExportProofBundleHistoryEntry | null>(null);
  const [proofBundleComparison, setProofBundleComparison] = useState<ExportProofBundleComparison | null>(null);
  const [handoffComparison, setHandoffComparison] = useState<ReleaseReviewHandoffComparison | null>(null);
  const [staleReviewReport, setStaleReviewReport] = useState<StaleReviewPackageReport | null>(null);
  const [proofImportMessage, setProofImportMessage] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, setIsPending] = useState(false);

  const refresh = useCallback(async () => {
    const nextReview = await getExportReviewPackage(reviewId);
    setReview(nextReview ?? null);
    if (!nextReview) {
      setComments([]);
      setDownloads([]);
      return;
    }

    const [nextComments, nextDownloads] = await Promise.all([
      listExportReviewComments(reviewId),
      listExportReviewDownloads(reviewId),
    ]);
    setComments(nextComments);
    setDownloads(nextDownloads);
  }, [reviewId]);

  useEffect(() => {
    setIsLoading(true);
    void refresh()
      .catch(() => setMessage("Review package could not be loaded."))
      .finally(() => setIsLoading(false));
  }, [refresh]);

  const refreshImportedProofBundle = useCallback(() => {
    const entry = loadExportProofBundleHistory().find((item) => item.bundle.reviewId === reviewId) ?? null;
    setImportedProofEntry(entry);
    setImportedProofBundle(entry?.bundle ?? null);
  }, [reviewId]);

  useEffect(() => {
    refreshImportedProofBundle();
  }, [refreshImportedProofBundle]);

  useEffect(() => {
    if (!review) {
      setProofBundle(null);
      setHandoffComparison(null);
      setStaleReviewReport(null);
      return;
    }

    const releaseEvidence = loadReleaseEvidence();
    const releaseEvidenceSummary = createReleaseEvidenceSummary(releaseEvidence);
    const pinnedReleaseEvidence = selectPinnedReleaseEvidenceHistoryEntry(loadReleaseEvidenceHistory());
    const latestDesktopEvidence = loadDesktopVerificationHistory()[0] ?? null;
    const desktopProofSummary = createDesktopLaunchProofSummary(latestDesktopEvidence);
    const nextProofBundle = createExportProofBundle({
      review,
      downloads,
      releaseEvidenceSummary,
      releaseEvidenceLabel: pinnedReleaseEvidence
        ? `Pinned ${pinnedReleaseEvidence.auditStatus} release proof saved ${formatEpochDate(pinnedReleaseEvidence.savedAt)}.`
        : undefined,
      desktopProofSummary,
      desktopEvidenceLabel: latestDesktopEvidence
        ? `Latest desktop check ${latestDesktopEvidence.status} from ${formatEpochDate(latestDesktopEvidence.checkedAt)}.`
        : undefined,
    });

    setProofBundle(nextProofBundle);
    setStaleReviewReport(
      createStaleReviewPackageReport({
        review,
        releaseEvidenceUpdatedAt: releaseEvidence.updatedAt,
        desktopEvidenceCheckedAt: latestDesktopEvidence?.checkedAt ?? null,
      }),
    );
    setHandoffComparison(
      createReleaseReviewHandoffComparison({
        bundle: nextProofBundle,
        releaseEvidenceSummary,
        releaseEvidenceUpdatedAt: releaseEvidence.updatedAt,
        desktopProofSummary,
        desktopEvidenceCheckedAt: latestDesktopEvidence?.checkedAt ?? null,
      }),
    );
  }, [review, downloads]);

  useEffect(() => {
    setProofBundleComparison(proofBundle && importedProofBundle ? compareExportProofBundles(proofBundle, importedProofBundle) : null);
  }, [proofBundle, importedProofBundle]);

  async function runAction(action: () => Promise<void>, failureMessage: string) {
    setIsPending(true);
    setMessage(null);

    try {
      await action();
      await refresh();
    } catch {
      setMessage(failureMessage);
    } finally {
      setIsPending(false);
    }
  }

  async function updateStatus(reviewStatus: ExportReviewStatus) {
    await runAction(async () => setExportReviewStatus(reviewId, reviewStatus), "Review status could not be updated.");
  }

  async function submitComment() {
    await runAction(async () => {
      const comment = await addExportReviewComment({ reviewId, body: commentBody });
      if (comment) setCommentBody("");
    }, "Comment could not be saved.");
  }

  async function toggleCommentResolved(comment: ExportReviewComment) {
    await runAction(async () => setExportReviewCommentResolved(comment.id, !comment.resolvedAt), "Comment status could not be updated.");
  }

  async function recordDownload() {
    if (!review) return;
    await runAction(async () => {
      await recordExportReviewDownload(review);
    }, "Download history could not be recorded.");
  }

  async function importProofBundle(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());
      const entry = importExportProofBundle(parsed);
      if (!entry) {
        setProofImportMessage("That file is not a readable Essence proof bundle.");
        return;
      }

      if (entry.bundle.reviewId !== reviewId) {
        setProofImportMessage(`Imported proof for review ${entry.bundle.reviewId}. Open that review URL to compare it.`);
        return;
      }

      setImportedProofEntry(entry);
      setImportedProofBundle(entry.bundle);
      setProofImportMessage("Proof bundle imported and ready to compare.");
    } catch {
      setProofImportMessage("Proof bundle could not be imported.");
    }
  }

  function clearImportedProof() {
    clearImportedProofBundle(reviewId);
    setImportedProofEntry(null);
    setImportedProofBundle(null);
    setProofBundleComparison(null);
    setProofImportMessage("Imported proof cleared for this review.");
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background p-6 text-foreground">
        <div className="mx-auto max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>Loading review</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Opening the local review package.</CardContent>
          </Card>
        </div>
      </main>
    );
  }

  if (!review) {
    return (
      <main className="min-h-screen bg-background p-6 text-foreground">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Review not found</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>This local review package is not available in this browser profile.</p>
              <Button asChild variant="outline">
                <Link href="/editor">Open editor</Link>
              </Button>
            </CardContent>
          </Card>
          {importedProofBundle ? <ExportProofBundleCard bundle={importedProofBundle} /> : null}
          <ExportProofBundleImportPanel
            comparison={null}
            importedAt={importedProofEntry?.importedAt}
            message={proofImportMessage ?? undefined}
            onClear={clearImportedProof}
            onImport={importProofBundle}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background p-6 text-foreground">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline">{review.format.toUpperCase()}</Badge>
              <Badge variant={review.reviewStatus === "approved" ? "default" : review.reviewStatus === "changes-requested" ? "destructive" : "secondary"}>
                {statusLabels[review.reviewStatus]}
              </Badge>
              {review.exportQaSnapshot ? <Badge variant={exportQaBadgeVariant(review.exportQaSnapshot.status)}>Export QA {review.exportQaSnapshot.status}</Badge> : null}
              {review.reviewSnapshot ? <Badge variant="outline">QA {review.reviewSnapshot.status}</Badge> : null}
            </div>
            <h1 className="text-2xl font-semibold">{review.outputName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {review.sourceSnapshot?.projectTitle ?? "Untitled project"} / {review.preset}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/editor?project=${encodeURIComponent(review.projectId)}`}>
                <ExternalLink className="size-4" />
                Open project
              </Link>
            </Button>
            <Button variant="outline" onClick={recordDownload} disabled={isPending}>
              <Download className="size-4" />
              Record download
            </Button>
          </div>
        </header>

        {message ? <div className="rounded-md border border-border p-3 text-sm text-muted-foreground">{message}</div> : null}

        {staleReviewReport ? <StaleReviewPackagePanel report={staleReviewReport} /> : null}
        {proofBundle ? <ExportProofBundleCard bundle={proofBundle} /> : null}
        {handoffComparison ? <ReleaseReviewHandoffPanel comparison={handoffComparison} /> : null}
        <ExportProofBundleImportPanel
          comparison={proofBundleComparison}
          importedAt={importedProofEntry?.importedAt}
          message={proofImportMessage ?? undefined}
          onClear={clearImportedProof}
          onImport={importProofBundle}
        />
        <ReviewerAuditPacketCard review={review} comments={comments} downloads={downloads} />

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Approval</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-3">
                {(["needs-review", "changes-requested", "approved"] satisfies ExportReviewStatus[]).map((status) => (
                  <Button key={status} variant={review.reviewStatus === status ? "secondary" : "outline"} onClick={() => updateStatus(status)} disabled={isPending}>
                    {statusLabels[status]}
                  </Button>
                ))}
              </div>
              <Separator />
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <ReviewMeta label="Filename" value={review.renderedFile?.filename ?? review.outputName} />
                <ReviewMeta label="Size" value={formatBytes(review.renderedFile?.size ?? 0)} />
                <ReviewMeta label="Saved" value={formatDate(review.renderedFile?.savedAt ?? review.updatedAt)} />
                <ReviewMeta label="Created" value={formatDate(review.createdAt)} />
                <ReviewMeta label="Duration" value={review.sourceSnapshot ? `${review.sourceSnapshot.duration}s` : "Unknown"} />
                <ReviewMeta label="Canvas" value={review.sourceSnapshot ? `${review.sourceSnapshot.width}x${review.sourceSnapshot.height}` : "Unknown"} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Download History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {downloads.length ? (
                downloads.map((download) => (
                  <div key={download.id} className="rounded-md border border-border p-2 text-sm">
                    <div className="truncate font-medium">{download.filename}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatBytes(download.size)} / {formatDate(download.createdAt)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                  No download records yet.
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {review.exportQaSnapshot ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center justify-between gap-2">
                <span>Export QA Evidence</span>
                <Badge variant={exportQaBadgeVariant(review.exportQaSnapshot.status)}>
                  {review.exportQaSnapshot.readyCount} ready / {review.exportQaSnapshot.reviewCount} review / {review.exportQaSnapshot.blockedCount} blocked
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <ReviewMeta label="Preset" value={review.exportQaSnapshot.preset} />
                <ReviewMeta label="Render route" value={review.exportQaSnapshot.renderRouteLabel} />
                <ReviewMeta label="Captured" value={formatDate(review.exportQaSnapshot.capturedAt)} />
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {review.exportQaSnapshot.sections.map((section) => (
                  <ExportQaEvidenceRow key={section.id} section={section} />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {review.mediaAttributionSummary ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center justify-between gap-2">
                <span>Media Attribution</span>
                <Badge variant={review.mediaAttributionSummary.status === "review" ? "secondary" : "outline"}>
                  {review.mediaAttributionSummary.itemCount} assets / {review.mediaAttributionSummary.reviewCount} review
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <ReviewMeta label="Stock" value={String(review.mediaAttributionSummary.stockCount)} />
                <ReviewMeta label="Self-hosted" value={String(review.mediaAttributionSummary.selfHostedCount)} />
                <ReviewMeta label="Browser" value={String(review.mediaAttributionSummary.browserCount)} />
                <ReviewMeta label="Desktop" value={String(review.mediaAttributionSummary.desktopCount)} />
              </div>
              <div className="grid gap-2 lg:grid-cols-2">
                {review.mediaAttributionSummary.items.map((item) => (
                  <MediaAttributionRow key={item.assetId} item={item} />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <PublishPrepPanel review={review} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="size-5 text-muted-foreground" />
              Comments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea value={commentBody} onChange={(event) => setCommentBody(event.target.value)} placeholder="Leave review feedback" />
            <Button onClick={submitComment} disabled={!commentBody.trim() || isPending}>
              Add comment
            </Button>
            <div className="space-y-2">
              {comments.length ? (
                comments.map((comment) => (
                  <div key={comment.id} className="rounded-md border border-border p-3 text-sm">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <Badge variant={comment.resolvedAt ? "secondary" : "default"}>{comment.resolvedAt ? "Resolved" : "Open"}</Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={() => toggleCommentResolved(comment)}
                        disabled={isPending}
                        aria-label={comment.resolvedAt ? "Reopen comment" : "Resolve comment"}
                      >
                        {comment.resolvedAt ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
                      </Button>
                    </div>
                    <p className="whitespace-pre-wrap">{comment.body}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{formatDate(comment.createdAt)}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">No comments yet.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function ExportQaEvidenceRow({ section }: { section: ExportQaSnapshotSection }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium">{section.label}</div>
        <Badge variant={exportQaBadgeVariant(section.status)}>{section.status === "blocked" ? "Blocked" : section.status === "review" ? "Review" : "Ready"}</Badge>
      </div>
      <div className="mt-2 text-xs font-medium">{section.summary}</div>
      <p className="mt-1 text-xs text-muted-foreground">{section.detail}</p>
    </div>
  );
}

function MediaAttributionRow({ item }: { item: MediaAttributionItem }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-sm font-medium">{item.assetName}</div>
          <div className="mt-1 text-xs text-muted-foreground">{item.sourceLabel}</div>
        </div>
        <Badge variant={item.status === "review" ? "secondary" : "outline"}>{item.status === "review" ? "Review" : "Ready"}</Badge>
      </div>
      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
        {item.licenseLabel ? <div>License: {item.licenseLabel}</div> : null}
        {item.attributionText ? <div>Credit: {item.attributionText}</div> : null}
        <p>{item.detail}</p>
        <div className="flex flex-wrap gap-3">
          {item.pageUrl ? <AttributionLink href={item.pageUrl} label="Source page" /> : null}
          {item.licenseUrl ? <AttributionLink href={item.licenseUrl} label="License" /> : null}
        </div>
      </div>
    </div>
  );
}

function AttributionLink({ href, label }: { href: string; label: string }) {
  return (
    <a className="inline-flex items-center gap-1 text-foreground underline-offset-4 hover:underline" href={href} target="_blank" rel="noreferrer">
      {label}
      <ExternalLink className="size-3" />
    </a>
  );
}

function ReviewMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-medium">{value}</div>
    </div>
  );
}

function exportQaBadgeVariant(status: "ready" | "review" | "blocked") {
  if (status === "blocked") return "destructive";
  if (status === "review") return "secondary";
  return "outline";
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "Unknown";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
}

function formatEpochDate(value: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
}
