"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  ClipboardCopy,
  Download,
  FileJson2,
  Search,
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
  AdminReleaseArchiveItem,
  AdminReleaseArchiveItemKind,
  AdminReleaseArchivePackage,
  AdminReleaseArchiveRetentionReport,
  AdminReleaseArchiveRetentionStatus,
} from "@/features/admin/admin-release-archive-retention";
import {
  getAdminReleaseArchiveRetentionCsv,
  getAdminReleaseArchiveRetentionJson,
  getAdminReleaseArchiveRetentionMarkdown,
} from "@/features/admin/admin-release-archive-retention-export";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminReleaseArchiveRetentionPanelProps = {
  report: AdminReleaseArchiveRetentionReport;
};

export function AdminReleaseArchiveRetentionPanel({
  report,
}: AdminReleaseArchiveRetentionPanelProps) {
  const [query, setQuery] = useState("");
  const filteredPackages = useMemo(
    () => filterPackages(report.packages, query),
    [query, report.packages],
  );
  const visibleItemCount = filteredPackages.reduce(
    (total, archivePackage) => total + archivePackage.items.length,
    0,
  );

  function exportJson() {
    downloadTextFile({
      content: getAdminReleaseArchiveRetentionJson(report),
      filename: "admin-release-archive-retention.json",
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getAdminReleaseArchiveRetentionCsv(report),
      filename: "admin-release-archive-retention.csv",
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAdminReleaseArchiveRetentionMarkdown(report),
      filename: "admin-release-archive-retention.md",
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAdminReleaseArchiveRetentionMarkdown(report),
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Archive className="size-4" />
            Release archive retention
          </CardTitle>
          <CardDescription>
            Searchable release packages for approvals, smoke reports, privacy
            checklists, signed manifests, desktop updates, and rollback bundles.
          </CardDescription>
        </div>
        <Badge variant={getStatusVariant(report.status)}>
          {report.status} {report.score}
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Packages" value={report.packageCount} />
          <Metric label="Items" value={report.itemCount} />
          <Metric label="Searchable" value={report.searchableCount} />
          <Metric label="Retention" value={`${report.retentionDays}d`} />
          <Metric label="Review" value={report.reviewCount} />
          <Metric label="Blocked" value={report.blockedCount} />
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search release label, commit, package, deployment URL, smoke artifact, privacy surface, or rollback note"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <Badge variant="outline">
            {filteredPackages.length} packages shown
          </Badge>
          <Badge variant="outline">{visibleItemCount} items shown</Badge>
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {filteredPackages.map((archivePackage) => (
            <ArchivePackageCard
              key={archivePackage.id}
              archivePackage={archivePackage}
            />
          ))}
        </div>

        <div className="grid gap-2 text-xs">
          <div className="font-medium">Archive commands</div>
          <div className="grid gap-2 lg:grid-cols-2">
            {report.commands.map((command) => (
              <div
                key={command}
                className="rounded-md border border-border bg-muted/20 p-3 text-muted-foreground"
              >
                {command}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
      </CardContent>
    </Card>
  );
}

function ArchivePackageCard({
  archivePackage,
}: {
  archivePackage: AdminReleaseArchivePackage;
}) {
  const sortedItems = archivePackage.items
    .filter((item) => item.status !== "ready")
    .concat(archivePackage.items.filter((item) => item.status === "ready"));

  return (
    <div className="rounded-md border border-border bg-muted/20 p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-medium">{archivePackage.label}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Retain until {formatDate(archivePackage.retentionUntil)}
          </div>
        </div>
        <Badge variant={getStatusVariant(archivePackage.status)}>
          {archivePackage.status}
        </Badge>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
        <Metric label="Score" value={archivePackage.score} />
        <Metric label="Items" value={archivePackage.itemCount} />
        <Metric label="Created" value={formatShortDate(archivePackage.createdAt)} />
        <Metric label="Release" value={archivePackage.releaseLabel} />
      </div>
      <div className="mt-3 grid gap-2">
        {sortedItems.map((item) => (
          <ArchiveItemRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function ArchiveItemRow({ item }: { item: AdminReleaseArchiveItem }) {
  return (
    <div className="rounded-md border border-border bg-background/70 p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-medium">{item.label}</div>
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline">{formatKind(item.kind)}</Badge>
          <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
        </div>
      </div>
      <p className="mt-2 text-muted-foreground">{item.summary}</p>
      <p className="mt-2">{item.recommendation}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        <Badge variant="outline">{item.artifactCount} artifacts</Badge>
        <Badge variant="outline">until {formatShortDate(item.retentionUntil)}</Badge>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border bg-background/70 p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-mono text-sm text-foreground">
        {value}
      </div>
    </div>
  );
}

function filterPackages(
  packages: AdminReleaseArchivePackage[],
  query: string,
) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return packages;
  }

  return packages
    .map((archivePackage) => ({
      ...archivePackage,
      items: archivePackage.items.filter((item) =>
        `${archivePackage.searchableText} ${item.searchableText}`
          .toLowerCase()
          .includes(normalizedQuery),
      ),
    }))
    .filter(
      (archivePackage) =>
        archivePackage.items.length > 0 ||
        archivePackage.searchableText.toLowerCase().includes(normalizedQuery),
    );
}

function formatKind(kind: AdminReleaseArchiveItemKind) {
  return kind.replace("-", " ");
}

function getStatusVariant(status: AdminReleaseArchiveRetentionStatus) {
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

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "2-digit",
  }).format(new Date(value));
}
