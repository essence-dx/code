import { Download, EyeOff, FileLock2, ShieldCheck, TriangleAlert, Users2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardApprovalRedactionAudience,
  BoardApprovalRedactionPolicyReport,
  BoardApprovalRedactionPolicyStatus,
  BoardApprovalRedactionRuleAction,
} from "@/features/projects/board-approval-redaction-policies";

function statusVariant(status: BoardApprovalRedactionPolicyStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function actionVariant(action: BoardApprovalRedactionRuleAction) {
  if (action === "remove") {
    return "destructive" as const;
  }

  return action === "mask" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardApprovalRedactionPolicyStatus }) {
  if (status === "ready") {
    return <ShieldCheck className="size-3.5" />;
  }

  return status === "watch" ? <EyeOff className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function audienceLabel(audience: BoardApprovalRedactionAudience) {
  if (audience === "internal-board") {
    return "Internal board";
  }

  return `${audience[0]?.toUpperCase() ?? ""}${audience.slice(1)}`;
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

export function BoardApprovalRedactionPoliciesPanel({ report }: { report: BoardApprovalRedactionPolicyReport }) {
  const highlightedRules = report.templates.flatMap((template) => template.rules.slice(0, 3).map((rule) => ({ ...rule, audience: template.audience }))).slice(0, 10);

  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileLock2 className="size-4" />
              Board redaction policies
            </CardTitle>
            <CardDescription>Audience-specific packet templates for investor, client, partner, and internal board circulation.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="gap-1 rounded-md" variant="outline">
              <Users2 className="size-3.5" />
              {report.summary.externalTemplateCount} external views
            </Badge>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={report.csvFileName} href={report.csvDataUri}>
              <Download className="size-4" />
              CSV
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SummaryTile detail="reviewer audiences" label="Templates" value={`${report.summary.templateCount}`} />
          <SummaryTile detail="outside workspace" label="External" value={`${report.summary.externalTemplateCount}`} />
          <SummaryTile detail="tokens masked or removed" label="Redactions" value={`${report.summary.totalRedactionCount}`} />
          <SummaryTile detail="fields retained" label="Retained" value={`${report.summary.retainedFieldCount}`} />
          <SummaryTile detail="fields removed" label="Removed" value={`${report.summary.removedFieldCount}`} />
          <SummaryTile detail="packet circulation state" label="Status" value={report.summary.status} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Policy next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Audience</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Allowed</TableHead>
              <TableHead>Removed</TableHead>
              <TableHead>Preview</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.templates.map((template) => (
              <TableRow key={template.id}>
                <TableCell className="max-w-[260px] whitespace-normal">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                      <EyeOff className="size-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium">{template.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {audienceLabel(template.audience)} · {template.strictness}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className="gap-1 rounded-md" variant={statusVariant(template.preview.status)}>
                    <StatusIcon status={template.preview.status} />
                    {template.preview.status}
                  </Badge>
                  <p className="mt-1 text-xs text-muted-foreground">{template.preview.redactionCount} redactions</p>
                </TableCell>
                <TableCell className="max-w-[280px] whitespace-normal text-xs text-muted-foreground">
                  <p className="line-clamp-3">{template.allowedSections.join(", ")}</p>
                </TableCell>
                <TableCell className="max-w-[260px] whitespace-normal text-xs text-muted-foreground">
                  <p className="line-clamp-3">{template.removedSections.join(", ")}</p>
                </TableCell>
                <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
                  <p className="line-clamp-2 font-medium text-foreground">{template.description}</p>
                  <p className="mt-1 line-clamp-2">{template.preview.redactedSummary}</p>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rule</TableHead>
              <TableHead>Audience</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {highlightedRules.map((rule) => (
              <TableRow key={`${rule.audience}:${rule.id}`}>
                <TableCell className="font-medium">{rule.label}</TableCell>
                <TableCell>{audienceLabel(rule.audience)}</TableCell>
                <TableCell>
                  <Badge className="rounded-md" variant={actionVariant(rule.action)}>
                    {rule.action}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[520px] whitespace-normal text-xs text-muted-foreground">
                  <p className="line-clamp-2">{rule.reason}</p>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
