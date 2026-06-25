"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listHostedReviewComments, type HostedReviewComment } from "@/lib/projects/hosted-review-comment-client";
import {
  listExportPublishPreps,
  type ExportPublishPrep,
  type ExportReviewComment,
  type ExportReviewDownload,
  type ExportReviewPackage,
} from "@/lib/projects/collaboration-store";
import { createReviewerAuditPacket, downloadReviewerAuditPacket } from "@/lib/projects/reviewer-audit-packet";

interface ReviewerAuditPacketCardProps {
  review: ExportReviewPackage;
  comments: ExportReviewComment[];
  downloads: ExportReviewDownload[];
}

export function ReviewerAuditPacketCard({ review, comments, downloads }: ReviewerAuditPacketCardProps) {
  const [publishPreps, setPublishPreps] = useState<ExportPublishPrep[]>([]);
  const [hostedTokenInput, setHostedTokenInput] = useState("");
  const [hostedComments, setHostedComments] = useState<HostedReviewComment[]>([]);
  const [message, setMessage] = useState("");
  const [isLoadingHostedComments, setIsLoadingHostedComments] = useState(false);

  const refreshPublishPreps = useCallback(async () => {
    setPublishPreps(await listExportPublishPreps(review.id));
  }, [review.id]);

  useEffect(() => {
    void refreshPublishPreps().catch(() => setMessage("Publish-prep audit records could not be loaded."));
  }, [refreshPublishPreps]);

  async function loadHostedComments() {
    const token = extractHostedReviewToken(hostedTokenInput);
    if (!token) {
      setMessage("Paste a hosted review URL or token before loading hosted comments.");
      return;
    }

    setIsLoadingHostedComments(true);
    setMessage("");

    try {
      const nextComments = await listHostedReviewComments(token);
      setHostedComments(nextComments);
      setMessage(`Loaded ${nextComments.length} hosted ${nextComments.length === 1 ? "comment" : "comments"} for audit export.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Hosted comments could not be loaded.");
    } finally {
      setIsLoadingHostedComments(false);
    }
  }

  async function exportAuditPacket() {
    const nextPublishPreps = await listExportPublishPreps(review.id);
    setPublishPreps(nextPublishPreps);
    const packet = createReviewerAuditPacket({
      review,
      hostedComments,
      localComments: comments,
      downloads,
      publishPreps: nextPublishPreps,
    });
    setMessage(downloadReviewerAuditPacket(packet) ? "Reviewer audit packet exported." : "Reviewer audit export is unavailable in this runtime.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-muted-foreground" />
            Reviewer audit
          </span>
          <Badge variant={review.reviewStatus === "approved" ? "default" : "secondary"}>{approvalLabel(review.reviewStatus)}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <AuditMetric label="Hosted comments" value={String(hostedComments.length)} />
          <AuditMetric label="Local comments" value={String(comments.length)} />
          <AuditMetric label="Downloads" value={String(downloads.length)} />
          <AuditMetric label="Publish prep" value={String(publishPreps.length)} />
        </div>
        <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
          <Input
            value={hostedTokenInput}
            onChange={(event) => setHostedTokenInput(event.target.value)}
            placeholder="Hosted review URL or token"
            aria-label="Hosted review URL or token"
          />
          <Button type="button" variant="outline" onClick={loadHostedComments} disabled={isLoadingHostedComments}>
            <RefreshCw className="size-4" />
            Load hosted comments
          </Button>
          <Button type="button" onClick={exportAuditPacket}>
            <Download className="size-4" />
            Export audit
          </Button>
        </div>
        {message ? <div className="rounded-md border border-border p-2 text-xs text-muted-foreground">{message}</div> : null}
        {hostedComments.length > 0 ? (
          <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
            Hosted reviewer identities: {hostedComments.map((comment) => comment.reviewerEmail || comment.reviewerName).join(" / ")}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function AuditMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-medium">{value}</div>
    </div>
  );
}

function approvalLabel(status: ExportReviewPackage["reviewStatus"]) {
  if (status === "approved") return "Approved";
  if (status === "changes-requested") return "Changes requested";
  return "Needs review";
}

function extractHostedReviewToken(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    return decodeURIComponent(url.pathname.split("/").filter(Boolean).at(-1) ?? "");
  } catch {
    return trimmed;
  }
}
