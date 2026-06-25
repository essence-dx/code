import { CheckCircle2, Download, FileJson2, ShieldAlert, TriangleAlert, ScrollText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseCloseoutExecutivePacketReport,
  BoardReleaseCloseoutExecutivePacketSection,
} from "@/features/projects/board-release-closeout-executive-packet";
import type { BoardReleaseCloseoutReadinessGateStatus } from "@/features/projects/board-release-closeout-readiness-gates";

function statusVariant(status: BoardReleaseCloseoutReadinessGateStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseCloseoutReadinessGateStatus }) {
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

function SectionRow({ section }: { section: BoardReleaseCloseoutExecutivePacketSection }) {
  return (
    <TableRow>
      <TableCell className="max-w-[280px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <ScrollText className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{section.title}</p>
            <p className="truncate text-xs text-muted-foreground">{section.sectionKind}</p>
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
      <TableCell className="max-w-[360px] whitespace-normal text-sm text-muted-foreground">
        <p className="line-clamp-3">{section.summary}</p>
      </TableCell>
      <TableCell className="max-w-[320px] whitespace-normal text-xs text-muted-foreground">
        <p className="truncate font-mono">{section.evidenceHash}</p>
        <p className="mt-1 truncate font-mono">{section.sectionHash}</p>
      </TableCell>
      <TableCell className="max-w-[320px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-3">{section.nextAction}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseCloseoutExecutivePacketPanel({ report }: { report: BoardReleaseCloseoutExecutivePacketReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="size-4" />
              Board release closeout executive packet
            </CardTitle>
            <CardDescription>Final closeout packet with gate, acknowledgement, archive, remediation, and decision evidence.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.decision}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.packetScore < 80 ? "destructive" : "outline"}>
              {report.summary.packetScore}/100
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
          <SummaryTile detail="packet sections" label="Sections" value={`${report.summary.sectionCount}`} />
          <SummaryTile detail="release decision" label="Decision" value={report.summary.decision} />
          <SummaryTile detail="blocked sections" label="Blocked" value={`${report.summary.blockedSectionCount}`} />
          <SummaryTile detail="watched sections" label="Watch" value={`${report.summary.watchSectionCount}`} />
          <SummaryTile detail="packet hash" label="Hash" value={report.summary.packetHash.slice(7, 15)} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Executive packet next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.packetHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Section</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Summary</TableHead>
              <TableHead>Hashes</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.sections.map((section) => (
              <SectionRow key={section.sectionId} section={section} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
