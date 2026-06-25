"use client";

import { Download, FileJson, Search, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  createDefaultProjectAuditSearchFilters,
  createProjectAuditExportBody,
  createProjectAuditExportFileName,
  createProjectAuditSearchResult,
  projectAuditExportPresets,
  projectAuditSearchCategories,
  projectAuditSearchStatuses,
  type ProjectAuditExportFormat,
  type ProjectAuditSearchFilters,
  type ProjectAuditSearchRow,
} from "@/features/projects/project-audit-search";
import type { ProjectAuditCategory, ProjectAuditStatus } from "@/features/projects/types";

const categoryLabels: Record<ProjectAuditCategory, string> = {
  comments: "Comments",
  exports: "Exports",
  permissions: "Permissions",
  publishing: "Publishing",
  releases: "Releases",
  versions: "Versions",
};

const statusLabels: Record<ProjectAuditStatus, string> = {
  danger: "Blocked",
  info: "Info",
  success: "Passed",
  warning: "Review",
};

function formatDate(value: string | null) {
  if (!value) {
    return "No timestamp";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function downloadTextFile(fileName: string, body: string, mimeType: string) {
  const blob = new Blob([body], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function projectOptions(rows: ProjectAuditSearchRow[]) {
  return Array.from(new Map(rows.map((row) => [row.projectId, row.projectName])).entries()).sort((first, second) => first[1].localeCompare(second[1]));
}

function setSingleCategory(filters: ProjectAuditSearchFilters, value: string | null): ProjectAuditSearchFilters {
  return {
    ...filters,
    categories: value && value !== "all" ? [value as ProjectAuditCategory] : [],
  };
}

function setSingleStatus(filters: ProjectAuditSearchFilters, value: string | null): ProjectAuditSearchFilters {
  return {
    ...filters,
    statuses: value && value !== "all" ? [value as ProjectAuditStatus] : [],
  };
}

function statusVariant(status: ProjectAuditStatus) {
  if (status === "danger") {
    return "destructive";
  }

  return status === "success" ? "secondary" : "outline";
}

export function ProjectAuditSearchPanel({ rows }: { rows: ProjectAuditSearchRow[] }) {
  const [filters, setFilters] = useState<ProjectAuditSearchFilters>(() => createDefaultProjectAuditSearchFilters());
  const result = useMemo(() => createProjectAuditSearchResult(rows, filters), [filters, rows]);
  const projects = useMemo(() => projectOptions(rows), [rows]);
  const visibleRows = result.rows.slice(0, 14);
  const selectedCategory = filters.categories[0] ?? "all";
  const selectedStatus = filters.statuses[0] ?? "all";

  function exportRows(format: ProjectAuditExportFormat, exportFilters = filters, label = "audit-search") {
    const body = createProjectAuditExportBody(rows, exportFilters, format);
    const fileName = createProjectAuditExportFileName(label, format);
    const mimeType = format === "json" ? "application/json;charset=utf-8" : "text/csv;charset=utf-8";

    downloadTextFile(fileName, body, mimeType);
  }

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              Audit search
            </CardTitle>
            <CardDescription>Filter workspace audit events and export reviewer-ready evidence.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-md">{result.summary.total} events</Badge>
            <Badge className="rounded-md" variant="secondary">
              {result.summary.projectCount} projects
            </Badge>
            <Badge className="rounded-md" variant={result.summary.statusCounts.danger > 0 ? "destructive" : "outline"}>
              {result.summary.statusCounts.danger} blocked
            </Badge>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_1fr]">
          <div className="grid gap-2">
            <Label htmlFor="audit-search-query">Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="audit-search-query" className="pl-8" value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="audit-search-project">Project</Label>
            <Select value={filters.projectId} onValueChange={(projectId) => setFilters((current) => ({ ...current, projectId: projectId ?? "all" }))}>
              <SelectTrigger id="audit-search-project" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="all">All projects</SelectItem>
                {projects.map(([projectId, projectName]) => (
                  <SelectItem key={projectId} value={projectId}>
                    {projectName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="audit-search-category">Category</Label>
            <Select value={selectedCategory} onValueChange={(value) => setFilters((current) => setSingleCategory(current, value))}>
              <SelectTrigger id="audit-search-category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="all">All categories</SelectItem>
                {projectAuditSearchCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {categoryLabels[category]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="audit-search-status">Status</Label>
            <Select value={selectedStatus} onValueChange={(value) => setFilters((current) => setSingleStatus(current, value))}>
              <SelectTrigger id="audit-search-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="all">All statuses</SelectItem>
                {projectAuditSearchStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {statusLabels[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="audit-search-from">From</Label>
            <Input id="audit-search-from" type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="audit-search-to">To</Label>
            <Input id="audit-search-to" type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button className="gap-2" disabled={result.rows.length === 0} onClick={() => exportRows("json")} size="sm">
            <FileJson className="size-4" />
            Export JSON
          </Button>
          <Button className="gap-2" disabled={result.rows.length === 0} onClick={() => exportRows("csv")} size="sm" variant="secondary">
            <Download className="size-4" />
            Export CSV
          </Button>
          <Button onClick={() => setFilters(createDefaultProjectAuditSearchFilters())} size="sm" variant="outline">
            Reset
          </Button>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4">
        <div className="grid gap-2 lg:grid-cols-4">
          {projectAuditExportPresets.map((preset) => (
            <div className="rounded-md border border-border p-3" key={preset.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{preset.label}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{preset.description}</p>
                </div>
                <Badge className="rounded-md uppercase" variant="outline">
                  {preset.format}
                </Badge>
              </div>
              <div className="mt-3 flex gap-2">
                <Button className="gap-2" onClick={() => setFilters(preset.filters)} size="sm" variant="secondary">
                  <SlidersHorizontal className="size-3.5" />
                  Apply
                </Button>
                <Button className="gap-2" onClick={() => exportRows(preset.format, preset.filters, preset.label)} size="sm" variant="outline">
                  <Download className="size-3.5" />
                  Export
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.length > 0 ? (
              visibleRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="max-w-[380px] whitespace-normal">
                    <p className="font-medium">{row.title}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{row.description}</p>
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate">{row.projectName}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Badge className="rounded-md" variant={statusVariant(row.status)}>
                        {statusLabels[row.status]}
                      </Badge>
                      <Badge className="rounded-md" variant="outline">
                        {categoryLabels[row.category]}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{row.actorName || row.actorEmail || "System"}</TableCell>
                  <TableCell>{formatDate(row.occurredAt)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={5}>
                  No audit events match the current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {result.rows.length > visibleRows.length ? (
          <p className="text-xs text-muted-foreground">
            Showing {visibleRows.length} of {result.rows.length}. Export includes every matching row.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
