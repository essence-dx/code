"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Link2, RefreshCw, RotateCw, ShieldOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HostedShareFreshnessWarning } from "@/features/projects/components/hosted-share-freshness-warning";
import { loadDesktopVerificationHistory } from "@/lib/desktop/desktop-verification-history";
import { listProjectExportReviews, type ExportReviewPackage } from "@/lib/projects/collaboration-store";
import { loadReleaseEvidence } from "@/lib/product/release-evidence";
import { loadExportProofBundleHistory } from "@/lib/projects/export-proof-bundle-history";
import {
  createHostedShareFreshnessReport,
  newestEvidenceTimestamp,
  type HostedShareFreshnessReport,
} from "@/lib/projects/hosted-share-freshness";
import {
  createHostedProjectReviewLink,
  listHostedProjectReviewLinks,
  updateHostedProjectReviewLink,
  type HostedReviewLinkSummary,
} from "@/lib/projects/hosted-review-link-client";
import type { HostedReviewLinkPermission } from "@/lib/projects/hosted-review-link-contracts";

type HostedReviewLinksPanelProps = {
  projectId: string;
  exportName?: string;
  canManage: boolean;
  disabled: boolean;
};

interface HostedShareFreshnessContext {
  releaseEvidenceUpdatedAt: number | null;
  desktopEvidenceCheckedAt: number | null;
  reviewProofUpdatedAt: string | number | null;
}

type HostedReviewLinkSort = "newest" | "oldest" | "expires-soon" | "proof-attention";
type HostedReviewLinkFilter = "all" | "active" | "attention" | "stale-proof";

interface HostedReviewLinkRow {
  link: HostedReviewLinkSummary;
  report: HostedShareFreshnessReport;
}

const permissionOptions: Array<{ value: HostedReviewLinkPermission; label: string }> = [
  { value: "comment-only", label: "Comment" },
  { value: "view", label: "View only" },
  { value: "download", label: "Download" },
];

export function HostedReviewLinksPanel({ projectId, exportName, canManage, disabled }: HostedReviewLinksPanelProps) {
  const [links, setLinks] = useState<HostedReviewLinkSummary[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<HostedReviewLinkSort>("newest");
  const [filterMode, setFilterMode] = useState<HostedReviewLinkFilter>("all");
  const [freshnessContext, setFreshnessContext] = useState<HostedShareFreshnessContext>({
    releaseEvidenceUpdatedAt: null,
    desktopEvidenceCheckedAt: null,
    reviewProofUpdatedAt: null,
  });

  const projectLinks = useMemo(() => links.filter((link) => link.projectId === projectId), [links, projectId]);
  const visibleLinks = useMemo(
    () =>
      projectLinks
        .map((link) => ({
          link,
          report: createHostedShareFreshnessReport({
            link,
            releaseEvidenceUpdatedAt: freshnessContext.releaseEvidenceUpdatedAt,
            desktopEvidenceCheckedAt: freshnessContext.desktopEvidenceCheckedAt,
            reviewProofUpdatedAt: freshnessContext.reviewProofUpdatedAt,
          }),
        }))
        .filter((row) => matchesSearch(row.link, searchQuery))
        .filter((row) => matchesFilter(row, filterMode))
        .sort((first, second) => compareRows(first, second, sortMode)),
    [filterMode, freshnessContext, projectLinks, searchQuery, sortMode],
  );
  const canAct = canManage && !disabled && !pendingId;

  const refresh = useCallback(async () => {
    const [nextLinks, projectReviews] = await Promise.all([listHostedProjectReviewLinks(), listProjectExportReviews(projectId)]);
    setLinks(nextLinks);
    setFreshnessContext(createFreshnessContext(projectId, projectReviews));
  }, [projectId]);

  useEffect(() => {
    setIsLoading(true);
    void refresh()
      .catch(() => setMessage("Hosted links are available after sign-in and project sync."))
      .finally(() => setIsLoading(false));
  }, [refresh]);

  async function createLink() {
    await runLinkAction("create", async () => {
      const link = await createHostedProjectReviewLink({
        projectId,
        permission: "comment-only",
        expiresInDays: 14,
        exportName,
      });
      setLinks((current) => [link, ...current.filter((item) => item.id !== link.id)]);
      await copyLink(link.url, "Hosted review link created and copied.");
    });
  }

  async function updatePermission(link: HostedReviewLinkSummary, permission: HostedReviewLinkPermission) {
    await runLinkAction(link.id, async () => {
      replaceLink(await updateHostedProjectReviewLink({ id: link.id, permission }));
      setMessage("Hosted link permission updated.");
    });
  }

  async function renewLink(link: HostedReviewLinkSummary) {
    await runLinkAction(link.id, async () => {
      replaceLink(await updateHostedProjectReviewLink({ id: link.id, enabled: true, expiresInDays: 30 }));
      setMessage("Hosted link renewed for 30 days.");
    });
  }

  async function revokeLink(link: HostedReviewLinkSummary) {
    await runLinkAction(link.id, async () => {
      replaceLink(await updateHostedProjectReviewLink({ id: link.id, enabled: false }));
      setMessage("Hosted link revoked.");
    });
  }

  async function copyLink(url: string, successMessage = "Hosted review link copied.") {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setMessage(successMessage);
        return;
      }
    } catch {
      setMessage("Copy failed. Use the visible link instead.");
      return;
    }

    setMessage("Copy is unavailable. Use the visible link instead.");
  }

  async function runLinkAction(id: string, action: () => Promise<void>) {
    setPendingId(id);
    setMessage(null);

    try {
      await action();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Hosted link action failed.");
    } finally {
      setPendingId(null);
    }
  }

  function replaceLink(nextLink: HostedReviewLinkSummary) {
    setLinks((current) => current.map((link) => (link.id === nextLink.id ? nextLink : link)));
  }

  return (
    <div className="space-y-3 rounded-md border border-border p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-medium">Hosted review links</div>
          <p className="text-xs text-muted-foreground">Manage public review access for synced project metadata.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={() => void refresh()} disabled={disabled || isLoading || Boolean(pendingId)}>
            <RefreshCw className="size-4" />
            Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={createLink} disabled={!canAct}>
            <Link2 className="size-4" />
            New hosted link
          </Button>
        </div>
      </div>

      {message ? <div className="rounded-md border border-border p-2 text-xs text-muted-foreground">{message}</div> : null}

      <div className="grid gap-2 md:grid-cols-[1fr_160px_160px]">
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search links, files, permissions"
          aria-label="Search hosted review links"
        />
        <Select value={sortMode} onValueChange={(value) => setSortMode(value as HostedReviewLinkSort)}>
          <SelectTrigger aria-label="Sort hosted review links">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="expires-soon">Expires soon</SelectItem>
            <SelectItem value="proof-attention">Proof attention</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterMode} onValueChange={(value) => setFilterMode(value as HostedReviewLinkFilter)}>
          <SelectTrigger aria-label="Filter hosted review links">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All links</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="attention">Needs attention</SelectItem>
            <SelectItem value="stale-proof">Stale proof</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="rounded-md border border-dashed border-border p-4 text-muted-foreground">Loading hosted links.</div>
      ) : projectLinks.length ? (
        <div className="space-y-2">
          {visibleLinks.map(({ link, report }) => (
            <div key={link.id} className="space-y-3 rounded-md border border-border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-all text-muted-foreground">{link.url}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge variant="outline">{permissionLabel(link.permission)}</Badge>
                    <Badge variant={link.enabled && !link.expired ? "secondary" : "destructive"}>
                      {link.enabled ? (link.expired ? "Expired" : "Active") : "Revoked"}
                    </Badge>
                    <Badge variant="outline">Expires {formatDate(link.expiresAt)}</Badge>
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="size-8" onClick={() => void copyLink(link.url)} disabled={disabled || Boolean(pendingId)}>
                  <Copy className="size-4" />
                </Button>
              </div>
              <HostedShareFreshnessWarning report={report} />
              <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                <Select
                  value={link.permission}
                  onValueChange={(value) => void updatePermission(link, value as HostedReviewLinkPermission)}
                  disabled={!canAct || pendingId === link.id}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {permissionOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={() => void renewLink(link)} disabled={!canAct || pendingId === link.id}>
                  <RotateCw className="size-4" />
                  Renew
                </Button>
                <Button size="sm" variant="outline" onClick={() => void revokeLink(link)} disabled={!canAct || pendingId === link.id || !link.enabled}>
                  <ShieldOff className="size-4" />
                  Revoke
                </Button>
              </div>
            </div>
          ))}
          {visibleLinks.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-4 text-muted-foreground">No hosted links match these filters.</div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border p-4 text-muted-foreground">No hosted links for this project yet.</div>
      )}
    </div>
  );
}

function matchesSearch(link: HostedReviewLinkSummary, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  return [link.url, link.title, link.exportName ?? "", link.permission, link.enabled ? "active" : "revoked", link.expired ? "expired" : ""]
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

function matchesFilter(row: HostedReviewLinkRow, filter: HostedReviewLinkFilter) {
  if (filter === "active") return row.link.enabled && !row.link.expired;
  if (filter === "attention") return !row.link.enabled || row.link.expired || row.report.status !== "ready";
  if (filter === "stale-proof") return row.report.status === "stale";
  return true;
}

function compareRows(first: HostedReviewLinkRow, second: HostedReviewLinkRow, sort: HostedReviewLinkSort) {
  if (sort === "oldest") return first.link.createdAt.localeCompare(second.link.createdAt);
  if (sort === "expires-soon") return first.link.expiresAt.localeCompare(second.link.expiresAt);
  if (sort === "proof-attention") {
    const proofRank = freshnessRank(second.report.status) - freshnessRank(first.report.status);
    if (proofRank !== 0) return proofRank;
  }

  return second.link.createdAt.localeCompare(first.link.createdAt);
}

function freshnessRank(status: HostedShareFreshnessReport["status"]) {
  if (status === "stale") return 3;
  if (status === "review") return 2;
  return 1;
}

function createFreshnessContext(projectId: string, projectReviews: ExportReviewPackage[]): HostedShareFreshnessContext {
  const releaseEvidence = loadReleaseEvidence();
  const latestDesktopEvidence = loadDesktopVerificationHistory()[0] ?? null;
  const proofBundleHistory = loadExportProofBundleHistory().filter((entry) => entry.bundle.projectId === projectId);

  return {
    releaseEvidenceUpdatedAt: releaseEvidence.updatedAt,
    desktopEvidenceCheckedAt: latestDesktopEvidence?.checkedAt ?? null,
    reviewProofUpdatedAt: newestEvidenceTimestamp([
      projectReviews[0]?.updatedAt,
      ...proofBundleHistory.flatMap((entry) => [entry.importedAt, entry.bundle.generatedAt]),
    ]),
  };
}

function permissionLabel(permission: HostedReviewLinkPermission) {
  if (permission === "download") return "Download";
  if (permission === "view") return "View only";
  return "Comment";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
