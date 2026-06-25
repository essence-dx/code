"use client";

import { useState, useTransition } from "react";
import { Clock3, Database, Globe2, Plug, RefreshCw, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getWorkbookQueryCredentialSummary } from "@/features/workbooks/query-definitions";
import { SpreadsheetQueryTransformEditor } from "@/features/spreadsheet/components/spreadsheet-query-transform-editor";
import type { ImportConnectorFormat } from "@/features/workbooks/import-connectors";
import type { ImportConnectorTransformStep } from "@/features/workbooks/import-connector-transforms";
import type { WorkbookQueryDefinition } from "@/features/workbooks/types";

export type UrlConnectorImportRequest = {
  format: ImportConnectorFormat;
  name: string;
  transformSteps: ImportConnectorTransformStep[];
  url: string;
};

export type TextConnectorImportRequest = {
  format: ImportConnectorFormat;
  name: string;
  text: string;
  transformSteps: ImportConnectorTransformStep[];
};

const urlFormats: ImportConnectorFormat[] = ["auto", "csv", "tsv", "json", "html"];
const textFormats: ImportConnectorFormat[] = ["auto", "csv", "tsv", "json"];

function createDefaultTransformSteps(): ImportConnectorTransformStep[] {
  return [
    {
      id: `query_step_${crypto.randomUUID()}`,
      type: "trimCells",
    },
    {
      id: `query_step_${crypto.randomUUID()}`,
      type: "removeEmptyRows",
    },
  ];
}

function ConnectorFormatSelect({
  formats,
  value,
  onChange,
}: {
  formats: ImportConnectorFormat[];
  value: ImportConnectorFormat;
  onChange: (value: ImportConnectorFormat) => void;
}) {
  return (
    <select
      value={value}
      aria-label="Connector format"
      className="h-8 rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onChange={(event) => onChange(event.target.value as ImportConnectorFormat)}
    >
      {formats.map((format) => (
        <option key={format} value={format}>
          {format === "auto" ? "Auto" : format.toUpperCase()}
        </option>
      ))}
    </select>
  );
}

function formatQueryDate(value?: string) {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Unknown"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function getQuerySourceLabel(query: WorkbookQueryDefinition) {
  if (query.source.type === "url") {
    return query.source.displayUrl;
  }

  return query.source.connectionName;
}

function getQueryRefreshLabel(query: WorkbookQueryDefinition) {
  return query.refreshMode === "url"
    ? "Refreshable URL"
    : "Manual refresh metadata";
}

function getRetryLabel(value?: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.getTime() <= Date.now()
    ? "Retry available"
    : `Retry after ${formatQueryDate(value)}`;
}

export function SpreadsheetImportConnectorsDialog({
  onImportDatabaseResult,
  onImportUrl,
  onDeleteQuery,
  onRefreshQuery,
  queries,
}: {
  onImportDatabaseResult: (request: TextConnectorImportRequest) => Promise<void>;
  onImportUrl: (request: UrlConnectorImportRequest) => Promise<void>;
  onDeleteQuery: (queryId: string) => void;
  onRefreshQuery: (queryId: string) => Promise<void>;
  queries: WorkbookQueryDefinition[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [url, setUrl] = useState("");
  const [urlName, setUrlName] = useState("");
  const [urlFormat, setUrlFormat] = useState<ImportConnectorFormat>("auto");
  const [databaseName, setDatabaseName] = useState("Database result");
  const [databaseFormat, setDatabaseFormat] =
    useState<ImportConnectorFormat>("auto");
  const [databaseText, setDatabaseText] = useState("");
  const [urlTransformSteps, setUrlTransformSteps] = useState(
    createDefaultTransformSteps,
  );
  const [databaseTransformSteps, setDatabaseTransformSteps] = useState(
    createDefaultTransformSteps,
  );

  function runImport(task: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await task();
        setOpen(false);
      } catch (importError) {
        setError(
          importError instanceof Error ? importError.message : "Connector import failed.",
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button type="button" variant="ghost" size="icon-sm">
              <Plug />
              <span className="sr-only">Connect data</span>
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Connect data</TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Connect data</DialogTitle>
          <DialogDescription>
            Import external tabular data into a new worksheet.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="url" className="gap-3">
          <TabsList>
            <TabsTrigger value="url">
              <Globe2 />
              URL
            </TabsTrigger>
            <TabsTrigger value="database">
              <Database />
              Database
            </TabsTrigger>
            <TabsTrigger value="saved">
              <Clock3 />
              Saved
            </TabsTrigger>
          </TabsList>
          <TabsContent value="url" className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_8rem]">
              <Input
                value={url}
                aria-label="Connector URL"
                placeholder="https://example.com/data.csv"
                onChange={(event) => setUrl(event.target.value)}
              />
              <ConnectorFormatSelect
                formats={urlFormats}
                value={urlFormat}
                onChange={setUrlFormat}
              />
            </div>
            <Input
              value={urlName}
              aria-label="URL connector sheet name"
              placeholder="Sheet name"
              onChange={(event) => setUrlName(event.target.value)}
            />
            <SpreadsheetQueryTransformEditor
              steps={urlTransformSteps}
              onChange={setUrlTransformSteps}
            />
            <Button
              type="button"
              disabled={isPending || !url.trim()}
              onClick={() =>
                runImport(() =>
                  onImportUrl({
                    format: urlFormat,
                    name: urlName.trim(),
                    transformSteps: urlTransformSteps,
                    url: url.trim(),
                  }),
                )
              }
            >
              Import URL
            </Button>
          </TabsContent>
          <TabsContent value="database" className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_8rem]">
              <Input
                value={databaseName}
                aria-label="Database result sheet name"
                placeholder="Sheet name"
                onChange={(event) => setDatabaseName(event.target.value)}
              />
              <ConnectorFormatSelect
                formats={textFormats}
                value={databaseFormat}
                onChange={setDatabaseFormat}
              />
            </div>
            <Textarea
              value={databaseText}
              aria-label="Database query result"
              placeholder="Paste CSV, TSV, or JSON query results"
              className="min-h-40"
              onChange={(event) => setDatabaseText(event.target.value)}
            />
            <SpreadsheetQueryTransformEditor
              steps={databaseTransformSteps}
              onChange={setDatabaseTransformSteps}
            />
            <Button
              type="button"
              disabled={isPending || !databaseText.trim()}
              onClick={() =>
                runImport(() =>
                  onImportDatabaseResult({
                    format: databaseFormat,
                    name: databaseName.trim() || "Database result",
                    text: databaseText,
                    transformSteps: databaseTransformSteps,
                  }),
                )
              }
            >
              Import result
            </Button>
          </TabsContent>
          <TabsContent value="saved" className="space-y-2">
            {queries.length === 0 ? (
              <p className="rounded-md border border-dashed bg-muted/20 p-3 text-sm text-muted-foreground">
                Saved connector queries will appear here after an import.
              </p>
            ) : (
              <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
                {queries.map((query) => (
                  <div
                    key={query.id}
                    className="grid gap-2 rounded-md border bg-background p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {query.name}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {getQuerySourceLabel(query)}
                        </div>
                      </div>
                      <span
                        className={
                          query.lastRefreshStatus === "error"
                            ? "rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive"
                            : "rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300"
                        }
                      >
                        {query.lastRefreshStatus === "error" ? "Error" : "Healthy"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary">
                        {getWorkbookQueryCredentialSummary(query)}
                      </Badge>
                      {query.lastRefreshDiagnosticCode ? (
                        <Badge variant="outline">
                          {query.lastRefreshDiagnosticCode}
                        </Badge>
                      ) : null}
                      {getRetryLabel(query.nextRetryAt) ? (
                        <Badge variant="outline">
                          {getRetryLabel(query.nextRetryAt)}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                      <div>Sheet: {query.sourceName}</div>
                      <div>Format: {query.format.toUpperCase()}</div>
                      <div>{getQueryRefreshLabel(query)}</div>
                      <div>Last refresh: {formatQueryDate(query.lastRefreshAt)}</div>
                      <div className="sm:col-span-2">
                        Credentials: {query.source.credential.label}
                      </div>
                      {query.lastRefreshMessage ? (
                        <div className="sm:col-span-2">
                          {query.lastRefreshMessage}
                        </div>
                      ) : null}
                    </div>
                    {query.refreshHistory.length > 0 ? (
                      <div className="rounded-md bg-muted/30 p-2 text-xs text-muted-foreground">
                        {query.refreshHistory.slice(0, 3).map((entry) => (
                          <div
                            key={entry.id}
                            className="flex flex-wrap justify-between gap-2"
                          >
                            <span>
                              {entry.status === "error" ? "Failed" : "Refreshed"}{" "}
                              #{entry.attempt} -{" "}
                              {formatQueryDate(entry.refreshedAt)}
                            </span>
                            <span>
                              {entry.rowCount}r x {entry.columnCount}c
                            </span>
                            {entry.status === "error" && entry.diagnosticCode ? (
                              <span className="basis-full text-muted-foreground">
                                {entry.diagnosticCode}
                                {entry.retryable ? " - retryable" : " - review needed"}
                              </span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isPending || query.refreshMode !== "url"}
                        onClick={() => runImport(() => onRefreshQuery(query.id))}
                      >
                        <RefreshCw />
                        Refresh
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteQuery(query.id)}
                      >
                        <Trash2 />
                        Forget
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
