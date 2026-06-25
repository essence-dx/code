import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { EmailQaReport } from "@/features/email/email-qa";

export function EmailQaPanel({ report }: { report: EmailQaReport }) {
  const tone =
    report.score >= 90 ? "Ready" : report.score >= 70 ? "Review" : "Fix";

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            {report.issues.length ? (
              <AlertCircle className="h-5 w-5 text-amber-500" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            )}
            Email QA
          </CardTitle>
          <CardDescription>
            Client checks for inbox preview, hosted images, links, and HTML size.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={report.score >= 90 ? "secondary" : "outline"}>
            {report.score}/100
          </Badge>
          <Badge variant="outline">{tone}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <div className="grid grid-cols-2 gap-2 text-sm lg:grid-cols-1">
          <Metric label="Images" value={report.summary.images} />
          <Metric label="Hosted" value={report.summary.hostedImages} />
          <Metric label="Buttons" value={report.summary.buttons} />
          <Metric label="Text blocks" value={report.summary.textBlocks} />
        </div>
        <div className="space-y-2">
          {report.issues.length ? (
            report.issues.map((issue) => (
              <div
                key={issue.id}
                className="rounded-md border border-border bg-muted/30 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={issue.severity === "error" ? "destructive" : "outline"}
                  >
                    {issue.severity}
                  </Badge>
                  <span className="text-sm font-medium">{issue.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {issue.client}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {issue.detail}
                </p>
              </div>
            ))
          ) : (
            <p className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
              No client warnings found for this first-pass email check.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
