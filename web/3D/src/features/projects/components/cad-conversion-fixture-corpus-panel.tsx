import { BadgeCheck, CheckCircle2, Download, FileJson2, GitCompareArrows, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  CadConversionFixtureCorpusReport,
  CadConversionFixtureCorpusRow,
  CadConversionFixtureCorpusStatus,
} from "@/features/projects/cad-conversion-fixture-corpus";

function statusVariant(status: CadConversionFixtureCorpusStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "review" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: CadConversionFixtureCorpusStatus }) {
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

function FixtureRow({ row }: { row: CadConversionFixtureCorpusRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[280px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <GitCompareArrows className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.fixtureName}</p>
            <p className="text-xs text-muted-foreground">
              {row.format} via {row.adapterId.toUpperCase()}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[300px] whitespace-normal text-xs text-muted-foreground">
        <p>Triangles: {row.actualTriangleCount} / {row.expectedTriangleCount}</p>
        <p className="mt-1">Delta: {row.triangleDelta}</p>
        <p className="mt-1">Bounds delta: {row.boundsDeltaMm}mm</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="truncate font-mono">{row.sourceSha256}</p>
        <p className="mt-1 truncate font-mono">{row.fixtureHash}</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
      </TableCell>
    </TableRow>
  );
}

export function CadConversionFixtureCorpusPanel({ report }: { report: CadConversionFixtureCorpusReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BadgeCheck className="size-4" />
              CAD fixture corpus acceptance
            </CardTitle>
            <CardDescription>Deterministic STEP/IGES/SAT sample conversion acceptance with expected mesh stats and regression diff evidence.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.corpusScore < 80 ? "destructive" : "outline"}>
              {report.summary.corpusScore}/100 corpus
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
          <SummaryTile detail="fixture rows" label="Rows" value={`${report.summary.rowCount}`} />
          <SummaryTile detail="accepted fixtures" label="Ready" value={`${report.summary.readyCount}`} />
          <SummaryTile detail="drift review" label="Review" value={`${report.summary.reviewCount}`} />
          <SummaryTile detail="regression blockers" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="workspace" label="Corpus" value={report.workspaceId} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Fixture corpus action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.corpusHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fixture</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Mesh Diff</TableHead>
              <TableHead>Evidence</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <FixtureRow key={row.fixtureId} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
