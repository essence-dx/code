"use client";

import { useMemo, useState } from "react";
import {
  ClipboardCopy,
  Download,
  FileJson2,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  AdminCommandCenterSearchCategory,
  AdminCommandCenterSearchReport,
  AdminCommandCenterSearchStatus,
} from "@/features/admin/admin-command-center-search";
import {
  filterAdminCommandCenterSearchRows,
  getAdminCommandCenterSearchCsv,
  getAdminCommandCenterSearchJson,
  getAdminCommandCenterSearchMarkdown,
} from "@/features/admin/admin-command-center-search";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminCommandCenterSearchPanelProps = {
  report: AdminCommandCenterSearchReport;
};

const categoryOptions: Array<AdminCommandCenterSearchCategory | "all"> = [
  "all",
  "governance",
  "release",
  "runbook",
  "evidence",
  "user",
  "file",
  "share",
];

const statusOptions: Array<AdminCommandCenterSearchStatus | "all"> = [
  "all",
  "blocked",
  "review",
  "ready",
];

export function AdminCommandCenterSearchPanel({
  report,
}: AdminCommandCenterSearchPanelProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] =
    useState<(typeof categoryOptions)[number]>("all");
  const [status, setStatus] = useState<(typeof statusOptions)[number]>("all");
  const rows = useMemo(
    () =>
      filterAdminCommandCenterSearchRows(report.rows, query, {
        category,
        status,
      }).slice(0, 30),
    [category, query, report.rows, status],
  );

  function exportJson() {
    downloadTextFile({
      content: getAdminCommandCenterSearchJson(report),
      filename: "admin-command-center-search.json",
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getAdminCommandCenterSearchCsv(report),
      filename: "admin-command-center-search.csv",
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAdminCommandCenterSearchMarkdown(report),
      filename: "admin-command-center-search.md",
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAdminCommandCenterSearchMarkdown(report),
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Search className="size-4" />
            Command-center search
          </CardTitle>
          <CardDescription>
            Governance reports, operators, files, shares, runbooks, and evidence
            bundles in one review index.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={getStatusVariant(report.status)}>
            {report.status} {report.score}
          </Badge>
          <Badge variant="outline">{report.rowCount} rows</Badge>
          <Badge variant="outline">{report.commandCount} commands</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 text-xs md:grid-cols-4">
          <Metric label="Blocked" value={report.blockedCount} />
          <Metric label="Review" value={report.reviewCount} />
          <Metric label="Ready" value={report.readyCount} />
          <Metric label="Sources" value={report.summaries.length} />
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search owner, file, DLP, route smoke, runbook, evidence bundle..."
              className="pl-8"
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            <Button type="button" size="sm" variant="outline" onClick={exportJson}>
              <FileJson2 className="size-3.5" />
              JSON
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={exportCsv}>
              <Download className="size-3.5" />
              CSV
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={exportMarkdown}
            >
              <Download className="size-3.5" />
              MD
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={copyMarkdown}
            >
              <ClipboardCopy className="size-3.5" />
              Copy
            </Button>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <FilterGroup
            label="Categories"
            values={categoryOptions}
            value={category}
            onValueChange={setCategory}
          />
          <FilterGroup
            label="Status"
            values={statusOptions}
            value={status}
            onValueChange={setStatus}
          />
        </div>

        {report.suggestedQueries.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {report.suggestedQueries.map((suggestion) => (
              <Button
                key={suggestion}
                type="button"
                size="xs"
                variant="secondary"
                onClick={() => setQuery(suggestion)}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        ) : null}

        <div className="grid gap-2 text-xs md:grid-cols-2 xl:grid-cols-4">
          {report.summaries.map((summary) => (
            <div
              key={summary.category}
              className="rounded-md border border-border bg-muted/20 p-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium capitalize">{summary.category}</span>
                <Badge variant="outline">{summary.count}</Badge>
              </div>
              <div className="mt-1 text-muted-foreground">
                {summary.blockedCount} blocked / {summary.reviewCount} review
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="font-medium">Matching command-center rows</div>
            <Badge variant="outline">{rows.length} shown</Badge>
          </div>
          {rows.length > 0 ? (
            <div className="grid gap-2 xl:grid-cols-2">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="rounded-md border border-border bg-muted/20 p-3 text-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 font-medium">
                        <ShieldCheck className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{row.label}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge variant="outline">{row.category}</Badge>
                        <Badge variant={getStatusVariant(row.status)}>
                          {row.status}
                        </Badge>
                        <Badge variant="outline">{row.source}</Badge>
                        {row.score !== null ? (
                          <Badge variant="outline">score {row.score}</Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {row.detail}
                  </p>
                  <p className="mt-2 text-xs">{row.evidence}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge variant="outline">{row.owner}</Badge>
                    {row.latestAt ? (
                      <Badge variant="outline">{formatDate(row.latestAt)}</Badge>
                    ) : null}
                  </div>
                  {row.command ? (
                    <div className="mt-2 rounded-md border border-border bg-background p-2 font-mono text-[11px] text-muted-foreground">
                      {row.command}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              No matching command-center rows.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FilterGroup<TValue extends string>({
  label,
  onValueChange,
  value,
  values,
}: {
  label: string;
  onValueChange: (value: TValue) => void;
  value: TValue;
  values: TValue[];
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-2">
      <div className="mb-2 text-xs font-medium text-muted-foreground">
        {label}
      </div>
      <div className="flex flex-wrap gap-1">
        {values.map((option) => (
          <Button
            key={option}
            type="button"
            size="xs"
            variant={option === value ? "default" : "ghost"}
            onClick={() => onValueChange(option)}
          >
            {option}
          </Button>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-sm text-foreground">{value}</div>
    </div>
  );
}

function getStatusVariant(status: AdminCommandCenterSearchStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
