"use client";

import { Archive, CheckCircle2, ClipboardList, Globe2, ShieldCheck, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PolicyAsCodeCheckId, PolicyAsCodeReport, PolicyAsCodeRuleStatus, PolicyAsCodeStatus } from "@/features/projects/policy-as-code-checks";

const checkIcon: Record<PolicyAsCodeCheckId, typeof ShieldCheck> = {
  "public-surface-guardrails": Globe2,
  "publish-permissions": ShieldCheck,
  "release-approvals": ClipboardList,
  "retention-windows": Archive,
};

function statusVariant(status: PolicyAsCodeStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function ruleVariant(status: PolicyAsCodeRuleStatus) {
  if (status === "fail") {
    return "destructive" as const;
  }

  return status === "warn" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: PolicyAsCodeStatus }) {
  if (status === "ready") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return <TriangleAlert className="size-3.5" />;
}

export function PolicyAsCodeChecksPanel({ report }: { report: PolicyAsCodeReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              Policy-as-code checks
            </CardTitle>
            <CardDescription>Executable governance rules for publish permissions, retention windows, release approvals, and public surfaces.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.worstStatus)}>
              <StatusIcon status={report.summary.worstStatus} />
              {report.summary.worstStatus}
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {report.summary.policyScore}/100 policy
            </Badge>
            <Badge className="rounded-md" variant={report.summary.failedRuleCount > 0 ? "destructive" : "outline"}>
              {report.summary.failedRuleCount} failed rules
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Policies</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.totalCount}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Ready</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.readyCount}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Watch</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.watchCount}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Blocked</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.blockedCount}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Rule warnings</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.warningRuleCount}</p>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Policy</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Rules</TableHead>
              <TableHead>Evidence</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.rows.map((row) => {
              const Icon = checkIcon[row.id];

              return (
                <TableRow key={row.id}>
                  <TableCell className="max-w-[280px] whitespace-normal">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                        <Icon className="size-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium">{row.label}</p>
                        <p className="text-xs text-muted-foreground">{row.ownerHint}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
                      <StatusIcon status={row.status} />
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[360px] whitespace-normal">
                    <div className="grid gap-2">
                      {row.rules.map((rule) => (
                        <div className="flex items-start gap-2" key={rule.id}>
                          <Badge className="mt-0.5 rounded-md text-[10px]" variant={ruleVariant(rule.status)}>
                            {rule.status}
                          </Badge>
                          <div className="min-w-0">
                            <p className="text-xs font-medium">{rule.label}</p>
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{rule.evidence}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[300px] whitespace-normal text-xs text-muted-foreground">
                    <p className="line-clamp-3">{row.evidence}</p>
                  </TableCell>
                  <TableCell className="max-w-[300px] whitespace-normal text-xs text-muted-foreground">
                    <p className="line-clamp-3">{row.nextAction}</p>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
