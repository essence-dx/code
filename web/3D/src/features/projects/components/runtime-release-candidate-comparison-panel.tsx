import { ArrowDownRight, ArrowUpRight, CheckCircle2, FileJson2, GitCompare, PlusCircle, Table2, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  RuntimeReleaseCandidateChange,
  RuntimeReleaseCandidateComparison,
  RuntimeReleaseCandidateComparisonStatus,
} from "@/features/projects/runtime-release-candidate-comparison";

function statusVariant(status: RuntimeReleaseCandidateComparisonStatus) {
  return status === "ready" ? "outline" : "destructive";
}

function changeVariant(change: RuntimeReleaseCandidateChange) {
  return change === "unchanged" || change === "improved" ? "outline" : "destructive";
}

function ChangeIcon({ change }: { change: RuntimeReleaseCandidateChange }) {
  if (change === "improved") {
    return <ArrowUpRight className="size-3.5" />;
  }

  if (change === "new") {
    return <PlusCircle className="size-3.5" />;
  }

  if (change === "unchanged") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return <ArrowDownRight className="size-3.5" />;
}

export function RuntimeReleaseCandidateComparisonPanel({ comparison }: { comparison: RuntimeReleaseCandidateComparison }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GitCompare className="size-4" />
              Release candidate comparison
            </CardTitle>
            <CardDescription>Diff current runtime evidence against the last approved release candidate before operator approval.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(comparison.summary.status)}>
              {comparison.summary.status === "ready" ? <CheckCircle2 className="size-3.5" /> : <TriangleAlert className="size-3.5" />}
              {comparison.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={comparison.summary.comparisonScore < 100 ? "destructive" : "outline"}>
              {comparison.summary.comparisonScore}/100 comparison
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {comparison.rows.map((row) => (
            <div key={row.id} className="rounded-md border bg-background p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{row.nextAction}</p>
                  <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{row.rowHash}</p>
                </div>
                <Badge className="shrink-0 gap-1 rounded-md" variant={changeVariant(row.change)}>
                  <ChangeIcon change={row.change} />
                  {row.change}
                </Badge>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button render={<a download={comparison.csvFileName} href={comparison.csvDataUri} />} className="gap-2" size="sm" variant="outline">
            <Table2 className="size-4" />
            CSV
          </Button>
          <Button render={<a download={comparison.jsonFileName} href={comparison.jsonDataUri} />} className="gap-2" size="sm" variant="outline">
            <FileJson2 className="size-4" />
            JSON
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
