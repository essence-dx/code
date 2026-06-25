import { CheckCircle2, ClipboardCheck, Download, FileJson2, ShieldAlert, Table2, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  NativeReleaseFulfillmentFileFormat,
  NativeReleaseFulfillmentLedger,
  NativeReleaseFulfillmentLedgerRow,
  NativeReleaseFulfillmentStatus,
} from "@/features/projects/native-release-fulfillment-ledger";

function statusVariant(status: NativeReleaseFulfillmentStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "review" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: NativeReleaseFulfillmentStatus }) {
  if (status === "ready") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "blocked" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function FileIcon({ format }: { format: NativeReleaseFulfillmentFileFormat }) {
  return format === "json" ? <FileJson2 className="size-4" /> : <Table2 className="size-4" />;
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

function LedgerRow({ row }: { row: NativeReleaseFulfillmentLedgerRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[320px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <ClipboardCheck className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.title}</p>
            <p className="truncate text-xs text-muted-foreground">{row.kind}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[280px] whitespace-normal text-xs text-muted-foreground">
        <p>{row.decision}</p>
        <p className="mt-1">{row.score}/100</p>
      </TableCell>
      <TableCell className="max-w-[420px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.detail}</p>
        <p className="mt-1 truncate font-mono">{row.sourceHash}</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate font-mono">{row.ledgerHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function NativeReleaseFulfillmentLedgerPanel({ ledger }: { ledger: NativeReleaseFulfillmentLedger }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="size-4" />
              Native release fulfillment ledger
            </CardTitle>
            <CardDescription>Release-candidate decision packet tying signed artifacts, install rehearsals, exception routes, and approval renewal evidence.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(ledger.summary.status)}>
              <StatusIcon status={ledger.summary.status} />
              {ledger.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={ledger.summary.fulfillmentScore < 80 ? "destructive" : "outline"}>
              {ledger.summary.fulfillmentScore}/100 fulfillment
            </Badge>
            {ledger.files.map((file) => (
              <Button key={file.format} render={<a download={file.download} href={file.href} />} className="h-8 gap-2" size="sm" variant="outline">
                <FileIcon format={file.format} />
                {file.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SummaryTile detail="ledger rows" label="Rows" value={`${ledger.summary.rowCount}`} />
          <SummaryTile detail="ready evidence" label="Ready" value={`${ledger.summary.readyCount}`} />
          <SummaryTile detail="needs review" label="Review" value={`${ledger.summary.reviewCount}`} />
          <SummaryTile detail="release blockers" label="Blocked" value={`${ledger.summary.blockedCount}`} />
          <SummaryTile detail="decision" label="Decision" value={ledger.summary.decision} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Fulfillment action</p>
          <p className="mt-1 text-sm text-muted-foreground">{ledger.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{ledger.summary.ledgerHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Evidence</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Decision</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{ledger.rows.map((row) => <LedgerRow key={row.fulfillmentId} row={row} />)}</TableBody>
        </Table>

        <Badge className="w-fit gap-1 rounded-md" variant="outline">
          <Download className="size-3.5" />
          {ledger.summary.ledgerHash}
        </Badge>
      </CardContent>
    </Card>
  );
}
