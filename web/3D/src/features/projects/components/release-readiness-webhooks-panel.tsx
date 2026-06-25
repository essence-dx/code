import { CheckCircle2, Database, Download, MailCheck, Rocket, SatelliteDish, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  ReleaseReadinessWebhookProvider,
  ReleaseReadinessWebhookReport,
  ReleaseReadinessWebhookStatus,
} from "@/features/projects/release-readiness-webhooks";
import type { ReleaseReadinessWebhookHistoryReport } from "@/features/projects/release-readiness-webhook-history";

const providerIcon: Record<ReleaseReadinessWebhookProvider, typeof Rocket> = {
  brevo: MailCheck,
  "desktop-updater": SatelliteDish,
  turso: Database,
  vercel: Rocket,
};

function statusVariant(status: ReleaseReadinessWebhookStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: ReleaseReadinessWebhookStatus }) {
  return status === "ready" ? <CheckCircle2 className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
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

function formatTimestamp(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function ReleaseReadinessWebhooksPanel({ history, report }: { history?: ReleaseReadinessWebhookHistoryReport | null; report: ReleaseReadinessWebhookReport }) {
  const latestHistoryEntries = history?.entries.slice(0, 6) ?? [];

  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <SatelliteDish className="size-4" />
              Release readiness webhooks
            </CardTitle>
            <CardDescription>Provider event readiness for Vercel deploys, Turso migrations, Brevo delivery, and desktop updater promotions.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {report.summary.readinessScore}/100 webhook score
            </Badge>
            <a className={buttonVariants({ className: "gap-2", size: "sm", variant: "outline" })} download={report.csvFileName} href={report.csvDataUri}>
              <Download data-icon="inline-start" />
              CSV
            </a>
            {history ? (
              <a className={buttonVariants({ className: "gap-2", size: "sm", variant: "outline" })} download={history.csvFileName} href={history.csvDataUri}>
                <Download data-icon="inline-start" />
                History
              </a>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SummaryTile detail="deduped provider events" label="Events" value={`${report.summary.totalCount}`} />
          <SummaryTile detail="promotion-safe signals" label="Ready" value={`${report.summary.readyCount}`} />
          <SummaryTile detail="needs observation" label="Watch" value={`${report.summary.watchCount}`} />
          <SummaryTile detail="blocks promotion" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="vercel/turso/brevo/updater" label="Missing providers" value={`${report.summary.missingProviderCount}`} />
          <SummaryTile detail={formatTimestamp(report.generatedAt)} label="Generated" value={report.summary.status} />
        </div>
        {history ? (
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <SummaryTile detail="stored deliveries" label="History" value={`${history.summary.totalCount}`} />
            <SummaryTile detail="fresh provider deliveries" label="Accepted" value={`${history.summary.acceptedCount}`} />
            <SummaryTile detail="duplicate or stale events" label="Replay rejected" value={`${history.summary.replayRejectedCount}`} />
            <SummaryTile detail="HMAC trusted deliveries" label="Trusted" value={`${history.summary.trustedSignatureCount}`} />
            <SummaryTile detail="waiting for retry" label="Retrying" value={`${history.summary.retryingCount}`} />
            <SummaryTile detail="max attempts reached" label="Exhausted" value={`${history.summary.exhaustedRetryCount}`} />
          </div>
        ) : null}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Provider</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Evidence</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.rows.map((row) => {
              const Icon = providerIcon[row.provider];

              return (
                <TableRow key={row.dedupeKey}>
                  <TableCell className="max-w-[260px] whitespace-normal">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                        <Icon className="size-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium">{row.provider}</p>
                        <p className="truncate text-xs text-muted-foreground">{row.surface}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
                      <StatusIcon status={row.status} />
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[260px] whitespace-normal text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">{row.eventType}</p>
                    <p className="mt-1 truncate">{row.subject}</p>
                    <p className="mt-1">{formatTimestamp(row.receivedAt)}</p>
                  </TableCell>
                  <TableCell className="max-w-[340px] whitespace-normal text-xs text-muted-foreground">
                    <p className="line-clamp-3">{row.evidence}</p>
                    <p className="mt-1 truncate">Signature: {row.signatureState}</p>
                  </TableCell>
                  <TableCell className="max-w-[320px] whitespace-normal text-xs text-muted-foreground">
                    <p className="line-clamp-3">{row.nextAction}</p>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {history && latestHistoryEntries.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>History event</TableHead>
                <TableHead>Replay</TableHead>
                <TableHead>Delivery</TableHead>
                <TableHead>Signature</TableHead>
                <TableHead>Retry evidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {latestHistoryEntries.map((entry) => {
                const Icon = providerIcon[entry.provider];

                return (
                  <TableRow key={entry.id}>
                    <TableCell className="max-w-[280px] whitespace-normal">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                          <Icon className="size-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium">{entry.eventType}</p>
                          <p className="truncate text-xs text-muted-foreground">{formatTimestamp(entry.receivedAt)}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="rounded-md" variant={entry.replayState === "accepted" ? "outline" : "destructive"}>
                        {entry.replayState}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="rounded-md" variant={entry.deliveryState === "exhausted" ? "destructive" : entry.deliveryState === "retrying" ? "secondary" : "outline"}>
                        {entry.deliveryState}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[220px] whitespace-normal text-xs text-muted-foreground">
                      <p className="font-medium text-foreground">{entry.signatureState}</p>
                      <p className="truncate">{entry.signatureDigest ?? "No signature digest"}</p>
                    </TableCell>
                    <TableCell className="max-w-[340px] whitespace-normal text-xs text-muted-foreground">
                      <p>
                        Attempt {entry.deliveryAttempt?.attemptNumber ?? 0}/{entry.deliveryAttempt?.maxAttempts ?? 0}
                      </p>
                      <p className="mt-1 line-clamp-2">{entry.deliveryAttempt?.lastError ?? entry.replayReason ?? entry.readinessRow.nextAction}</p>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : null}
      </CardContent>
    </Card>
  );
}
