import { BadgeCheck, CheckCircle2, Cpu, Download, FileJson2, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  CadRuntimeAcceptancePacketReport,
  CadRuntimeAcceptanceRow,
  CadRuntimeAcceptanceStatus,
} from "@/features/projects/cad-runtime-acceptance-packet";

function statusVariant(status: CadRuntimeAcceptanceStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "review" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: CadRuntimeAcceptanceStatus }) {
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

function AcceptanceRow({ row }: { row: CadRuntimeAcceptanceRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[320px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Cpu className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.title}</p>
            <p className="text-xs text-muted-foreground">{row.kind}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[420px] whitespace-normal text-xs text-muted-foreground">{row.evidence}</TableCell>
      <TableCell className="max-w-[420px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate font-mono">{row.evidenceHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function CadRuntimeAcceptancePacketPanel({ report }: { report: CadRuntimeAcceptancePacketReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BadgeCheck className="size-4" />
              CAD runtime acceptance
            </CardTitle>
            <CardDescription>Capability matrix, conversion queue, runtime diagnostics, and export readiness recommendation for native CAD release acceptance.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.acceptanceScore < 80 ? "destructive" : "outline"}>
              {report.summary.acceptanceScore}/100 acceptance
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
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SummaryTile detail="acceptance rows" label="Rows" value={`${report.summary.rowCount}`} />
          <SummaryTile detail="release-ready evidence" label="Ready" value={`${report.summary.readyCount}`} />
          <SummaryTile detail="needs review" label="Review" value={`${report.summary.reviewCount}`} />
          <SummaryTile detail="runtime blockers" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="workspace" label="Packet" value={report.workspaceId} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">CAD runtime acceptance action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.acceptanceHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Section</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Evidence</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <AcceptanceRow key={row.id} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
