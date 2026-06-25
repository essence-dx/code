import { CheckCircle2, Download, FileJson2, MailCheck, ShieldAlert, TriangleAlert, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseDistributionRecipientManifestEntry,
  BoardReleaseDistributionRecipientManifestReport,
  BoardReleaseDistributionRecipientManifestStatus,
} from "@/features/projects/board-release-distribution-recipient-manifests";

function statusVariant(status: BoardReleaseDistributionRecipientManifestStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseDistributionRecipientManifestStatus }) {
  if (status === "ready") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "blocked" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function SummaryTile({ detail, label, value }: { detail: string; label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function ManifestRow({ manifest }: { manifest: BoardReleaseDistributionRecipientManifestEntry }) {
  return (
    <TableRow>
      <TableCell className="max-w-[280px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <UsersRound className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{manifest.recipientName}</p>
            <p className="truncate text-xs text-muted-foreground">{manifest.recipientEmail ?? "No email on file"}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(manifest.status)}>
          <StatusIcon status={manifest.status} />
          {manifest.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{manifest.channel}</p>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <p>{manifest.recipientRole}</p>
        <p>{manifest.packetAccess}</p>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{manifest.acknowledgementRequirement}</TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{manifest.nextAction}</p>
        <p className="mt-1 truncate font-mono">{manifest.manifestHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseDistributionRecipientManifestsPanel({ report }: { report: BoardReleaseDistributionRecipientManifestReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MailCheck className="size-4" />
              Board release distribution recipient manifests
            </CardTitle>
            <CardDescription>Role, channel, packet access, and acknowledgement requirements for release distribution recipients.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {report.summary.manifestCount} recipients
            </Badge>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={report.csvFileName} href={report.csvDataUri}>
              <Download className="size-4" />
              CSV
            </a>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={report.jsonFileName} href={report.jsonDataUri}>
              <FileJson2 className="size-4" />
              JSON
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <SummaryTile detail="manifest rows" label="Recipients" value={`${report.summary.manifestCount}`} />
          <SummaryTile detail="needs repair" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="watch routes" label="Watch" value={`${report.summary.watchCount}`} />
          <SummaryTile detail="packet access" label="Granted" value={`${report.summary.grantedAccessCount}`} />
          <SummaryTile detail="ack required" label="Ack" value={`${report.summary.acknowledgementRequiredCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Recipient manifest next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recipient</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Access</TableHead>
              <TableHead>Acknowledgement</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.manifests.map((manifest) => <ManifestRow key={manifest.manifestId} manifest={manifest} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
