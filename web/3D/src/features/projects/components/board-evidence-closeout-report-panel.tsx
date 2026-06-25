import { CheckCircle2, Download, FileArchive, FileJson2, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardEvidenceCloseoutReport,
  BoardEvidenceCloseoutSection,
  BoardEvidenceCloseoutStatus,
} from "@/features/projects/board-evidence-closeout-report";

function statusVariant(status: BoardEvidenceCloseoutStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardEvidenceCloseoutStatus }) {
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

function SectionRow({ section }: { section: BoardEvidenceCloseoutSection }) {
  return (
    <TableRow>
      <TableCell className="max-w-[280px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <FileArchive className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{section.title}</p>
            <p className="font-mono text-xs text-muted-foreground">{section.id}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(section.status)}>
          <StatusIcon status={section.status} />
          {section.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{section.score}/100</p>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <p>{section.recordCount} records</p>
        <p>{section.fileCount} files</p>
      </TableCell>
      <TableCell className="max-w-[240px] whitespace-normal text-xs text-muted-foreground">
        <p className="truncate font-mono">{section.sourceHash}</p>
      </TableCell>
      <TableCell className="max-w-[340px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{section.nextAction}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardEvidenceCloseoutReportPanel({ report }: { report: BoardEvidenceCloseoutReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileArchive className="size-4" />
              Board evidence closeout report
            </CardTitle>
            <CardDescription>Exportable closeout packet merging readiness, acceptance, verification, attachment, and lock evidence.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.closeoutScore < 70 ? "destructive" : "outline"}>
              {report.summary.closeoutScore}/100 closeout
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
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SummaryTile detail="packet sections" label="Sections" value={`${report.summary.sectionCount}`} />
          <SummaryTile detail="ready sections" label="Ready" value={`${report.summary.readySectionCount}`} />
          <SummaryTile detail="blocked" label="Blocked" value={`${report.summary.blockedSectionCount}`} />
          <SummaryTile detail="manifest files" label="Files" value={`${report.summary.attachmentFileCount}`} />
          <SummaryTile detail="acceptance trail" label="Audit" value={`${report.summary.auditTrailCount}`} />
          <SummaryTile detail="verification issues" label="Checks" value={`${report.summary.verificationCheckCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Closeout next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Section</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Hash</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.sections.map((section) => <SectionRow key={section.id} section={section} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
