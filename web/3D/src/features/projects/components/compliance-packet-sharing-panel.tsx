"use client";

import { useMemo, useState } from "react";
import { Copy, ExternalLink, Link2, Loader2, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type {
  SignedCompliancePacketShareReport,
  SignedCompliancePacketShareSource,
  SignedCompliancePacketShareStatus,
} from "@/features/projects/compliance-packet-sharing";

interface CompliancePacketSharingPanelProps {
  history?: SignedCompliancePacketShareReport | null;
  sources: SignedCompliancePacketShareSource[];
  workspaceId: string;
}

function shareStatusVariant(status: SignedCompliancePacketShareStatus) {
  if (status === "revoked") {
    return "destructive" as const;
  }

  return status === "expired" ? "secondary" : "outline";
}

function packetStatusVariant(status: SignedCompliancePacketShareSource["status"]) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function formatDateTime(value: string | null) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Never";
}

function sourceId(source: SignedCompliancePacketShareSource) {
  return `${source.packetKind}:${source.packetId}`;
}

function expiryFromDays(rawDays: string) {
  const parsedDays = Number.parseInt(rawDays, 10);
  const days = Number.isFinite(parsedDays) ? Math.min(Math.max(parsedDays, 1), 90) : 7;

  return new Date(Date.now() + days * 86_400_000).toISOString();
}

export function CompliancePacketSharingPanel({ history, sources, workspaceId }: CompliancePacketSharingPanelProps) {
  const shareableSources = useMemo(() => sources.filter((source) => source.status !== "blocked"), [sources]);
  const [report, setReport] = useState(history ?? null);
  const [selectedSourceId, setSelectedSourceId] = useState(shareableSources[0] ? sourceId(shareableSources[0]) : "");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [expiryDays, setExpiryDays] = useState("7");
  const [accessPurpose, setAccessPurpose] = useState("External compliance review");
  const [latestShareUrl, setLatestShareUrl] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"copied" | "idle" | "unsupported">("idle");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [revokingShareId, setRevokingShareId] = useState<string | null>(null);
  const selectedSource = shareableSources.find((source) => sourceId(source) === selectedSourceId) ?? shareableSources[0] ?? null;

  async function createShare() {
    if (!selectedSource || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setCopyState("idle");

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/compliance-packet-shares`, {
        body: JSON.stringify({
          accessPurpose,
          expiresAt: expiryFromDays(expiryDays),
          packet: selectedSource,
          recipientEmail,
          recipientName,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; report?: SignedCompliancePacketShareReport; share?: { shareUrl: string } } | null;

      if (!response.ok || !payload?.report || !payload.share) {
        throw new Error(payload?.error ?? "Compliance packet share could not be created.");
      }

      setReport(payload.report);
      setLatestShareUrl(payload.share.shareUrl);
      setRecipientEmail("");
      setRecipientName("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Compliance packet share could not be created.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function revokeShare(shareId: string) {
    if (revokingShareId) {
      return;
    }

    setRevokingShareId(shareId);
    setError(null);

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/compliance-packet-shares/${shareId}`, {
        body: JSON.stringify({ reason: "Revoked from the workspace dashboard." }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; report?: SignedCompliancePacketShareReport } | null;

      if (!response.ok || !payload?.report) {
        throw new Error(payload?.error ?? "Compliance packet share could not be revoked.");
      }

      setReport(payload.report);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Compliance packet share could not be revoked.");
    } finally {
      setRevokingShareId(null);
    }
  }

  async function copyLatestShareUrl() {
    if (!latestShareUrl || !navigator.clipboard) {
      setCopyState("unsupported");
      return;
    }

    await navigator.clipboard.writeText(latestShareUrl);
    setCopyState("copied");
  }

  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="size-4" />
              Compliance packet sharing
            </CardTitle>
            <CardDescription>Signed packet links with expiry windows, recipient audit trails, download tracking, and revocation.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={report?.summary.status === "blocked" ? "destructive" : report?.summary.status === "watch" ? "secondary" : "outline"}>
              {report?.summary.status === "blocked" ? <ShieldAlert className="size-3.5" /> : <ShieldCheck className="size-3.5" />}
              {report?.summary.totalCount ?? 0} shares
            </Badge>
            {report ? (
              <a className={buttonVariants({ className: "h-8", size: "sm", variant: "outline" })} download={report.csvFileName} href={report.csvDataUri}>
                CSV
              </a>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        {error ? <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}

        <div className="grid gap-3 rounded-md border bg-background p-3 xl:grid-cols-[1fr_1fr_100px]">
          <div className="grid gap-2">
            <Label htmlFor="compliance-share-packet">Packet</Label>
            <Select value={selectedSourceId} onValueChange={(value) => value && setSelectedSourceId(value)}>
              <SelectTrigger id="compliance-share-packet" className="w-full">
                <SelectValue placeholder="Select packet" />
              </SelectTrigger>
              <SelectContent align="start">
                {shareableSources.map((source) => (
                  <SelectItem key={sourceId(source)} value={sourceId(source)}>
                    {source.sourceLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedSource ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge className="rounded-md" variant={packetStatusVariant(selectedSource.status)}>
                  {selectedSource.verificationState}
                </Badge>
                <span className="truncate">{selectedSource.packetId}</span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No shareable signed packets are available yet.</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="compliance-share-email">Recipient email</Label>
            <Input id="compliance-share-email" value={recipientEmail} placeholder="auditor@example.com" type="email" onChange={(event) => setRecipientEmail(event.target.value)} />
            <Input value={recipientName} placeholder="Recipient name" onChange={(event) => setRecipientName(event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="compliance-share-expiry">Days</Label>
            <Input id="compliance-share-expiry" min={1} max={90} value={expiryDays} type="number" onChange={(event) => setExpiryDays(event.target.value)} />
            <Button className="gap-2" disabled={!selectedSource || !recipientEmail || isSubmitting} type="button" onClick={createShare}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
              Share
            </Button>
          </div>
          <div className="grid gap-2 xl:col-span-3">
            <Label htmlFor="compliance-share-purpose">Purpose</Label>
            <Textarea id="compliance-share-purpose" value={accessPurpose} onChange={(event) => setAccessPurpose(event.target.value)} />
          </div>
        </div>

        {latestShareUrl ? (
          <div className="flex flex-col gap-2 rounded-md border bg-background p-3 md:flex-row md:items-center">
            <Input readOnly value={latestShareUrl} />
            <div className="flex gap-2">
              <Button className="gap-2" size="sm" type="button" variant="outline" onClick={copyLatestShareUrl}>
                <Copy className="size-4" />
                {copyState === "copied" ? "Copied" : copyState === "unsupported" ? "Copy unavailable" : "Copy"}
              </Button>
              <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} href={latestShareUrl} rel="noreferrer" target="_blank">
                <ExternalLink className="size-4" />
                Open
              </a>
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="mt-2 text-xl font-semibold">{report?.summary.activeCount ?? 0}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Expired</p>
            <p className="mt-2 text-xl font-semibold">{report?.summary.expiredCount ?? 0}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Revoked</p>
            <p className="mt-2 text-xl font-semibold">{report?.summary.revokedCount ?? 0}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Audit events</p>
            <p className="mt-2 text-xl font-semibold">{report?.summary.auditEventCount ?? 0}</p>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Share</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Activity</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report?.rows.length ? (
              report.rows.slice(0, 8).map((share) => (
                <TableRow key={share.id}>
                  <TableCell className="max-w-[300px] whitespace-normal">
                    <p className="font-medium">{share.sourceLabel}</p>
                    <p className="truncate text-xs text-muted-foreground">{share.packetId}</p>
                  </TableCell>
                  <TableCell>
                    <Badge className="rounded-md" variant={shareStatusVariant(share.status)}>
                      {share.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <p className="font-medium">{share.recipientName ?? share.recipientEmail}</p>
                    <p className="text-xs text-muted-foreground">{share.recipientEmail}</p>
                  </TableCell>
                  <TableCell className="whitespace-normal text-xs text-muted-foreground">
                    <p>{share.downloadCount} downloads, {share.auditTrail.length} events</p>
                    <p>Expires {formatDateTime(share.expiresAt)}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} href={share.shareUrl} rel="noreferrer" target="_blank">
                        <ExternalLink className="size-4" />
                        Open
                      </a>
                      {share.status === "active" ? (
                        <Button className="h-8 gap-2" disabled={revokingShareId === share.id} size="sm" type="button" variant="outline" onClick={() => revokeShare(share.id)}>
                          {revokingShareId === share.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                          Revoke
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={5}>
                  No compliance packet shares have been created yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
