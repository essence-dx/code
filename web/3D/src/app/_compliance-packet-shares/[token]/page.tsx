import { Download, FileKey2, ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { recordWorkspaceCompliancePacketShareAccess } from "@/features/projects/server/compliance-packet-share-service";
import type { SignedCompliancePacketShareRecord, SignedCompliancePacketShareStatus } from "@/features/projects/compliance-packet-sharing";

export const dynamic = "force-dynamic";

function statusVariant(status: SignedCompliancePacketShareStatus) {
  if (status === "revoked") {
    return "destructive" as const;
  }

  return status === "expired" ? "secondary" : "outline";
}

function formatDateTime(value: string | null) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not recorded";
}

function statusIcon(status: SignedCompliancePacketShareStatus) {
  return status === "active" ? <ShieldCheck className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function ShareDetail({ share }: { share: SignedCompliancePacketShareRecord }) {
  return (
    <Card className="w-full max-w-5xl">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileKey2 className="size-4" />
              Compliance packet share
            </CardTitle>
            <CardDescription>{share.sourceLabel}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(share.status)}>
              {statusIcon(share.status)}
              {share.status}
            </Badge>
            <Badge className="rounded-md" variant={share.packetStatus === "ready" ? "outline" : "secondary"}>
              {share.verificationState}
            </Badge>
            {share.status === "active" ? (
              <a className={buttonVariants({ className: "h-8 gap-2", size: "sm" })} href={`${share.shareUrl}/download`}>
                <Download className="size-4" />
                Download
              </a>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        {share.status !== "active" ? (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            This share is {share.status}; the packet download is no longer available.
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Recipient</p>
            <p className="mt-2 text-sm font-medium">{share.recipientName ?? share.recipientEmail}</p>
            <p className="mt-1 text-xs text-muted-foreground">{share.recipientEmail}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Expires</p>
            <p className="mt-2 text-sm font-medium">{formatDateTime(share.expiresAt)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Created {formatDateTime(share.createdAt)}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Audit trail</p>
            <p className="mt-2 text-sm font-medium">
              {share.auditTrail.length} events, {share.downloadCount} downloads
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Last accessed {formatDateTime(share.lastAccessedAt)}</p>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Packet</TableHead>
              <TableHead>Signature</TableHead>
              <TableHead>Hash</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="whitespace-normal">
                <p className="font-medium">{share.packetId}</p>
                <p className="text-xs text-muted-foreground">{share.packetKind}</p>
              </TableCell>
              <TableCell className="whitespace-normal">
                <p className="font-medium">{share.keyId ?? "No signing key"}</p>
                <p className="text-xs text-muted-foreground">{share.signer ?? "No signer"} - {formatDateTime(share.signedAt)}</p>
              </TableCell>
              <TableCell className="max-w-[360px] break-all text-xs text-muted-foreground">{share.contentHash}</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {share.auditTrail.slice(-8).map((event) => (
              <TableRow key={`${event.action}:${event.occurredAt}`}>
                <TableCell className="whitespace-normal">{formatDateTime(event.occurredAt)}</TableCell>
                <TableCell>
                  <Badge className="rounded-md" variant="outline">
                    {event.action}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-normal text-xs text-muted-foreground">{event.detail}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default async function CompliancePacketSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await recordWorkspaceCompliancePacketShareAccess({
    action: "viewed",
    token,
  });

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/30 p-4 text-foreground">
      {"error" in result ? (
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="size-4" />
              Share unavailable
            </CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ShareDetail share={result.share} />
      )}
    </main>
  );
}
