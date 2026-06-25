"use client";

import { useMemo } from "react";
import {
  Activity,
  Clock3,
  Download,
  FileSpreadsheet,
  Folder,
  Globe2,
  LayoutDashboard,
  LockKeyhole,
  Plus,
  ShieldCheck,
  Users,
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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TablecnDataTable } from "@/components/tablecn/data-table";
import { createWorkbookAction } from "@/features/workbooks/actions";
import {
  auditLogsToCsv,
  auditLogsToJson,
  createAuditActivityReview,
  createReportFileName,
} from "@/features/audit/audit-report-export";
import { ImportWorkbookButton } from "@/features/workbooks/components/import-workbook-button";
import { WorkbookCard } from "@/features/workbooks/components/workbook-card";
import type { WorkbookSummary } from "@/features/workbooks/types";
import type { DashboardData } from "@/features/dashboard/dashboard-service";
import { useDashboardColumns } from "@/features/dashboard/components/dashboard-columns";
import { MetricCard } from "@/features/dashboard/components/metric-card";
import { StatusBadge } from "@/features/dashboard/components/status-badge";
import { TemplateGallery } from "@/features/dashboard/components/template-gallery";

type DashboardShellProps = {
  currentUser: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
  };
  dashboard: DashboardData;
  workbooks: WorkbookSummary[];
};

export function DashboardShell({
  currentUser,
  dashboard,
  workbooks,
}: DashboardShellProps) {
  const openedCount = workbooks.filter((workbook) => workbook.lastOpenedAt).length;
  const customTemplates = workbooks.filter(
    (workbook) => workbook.isTemplate && workbook.accessRole === "owner",
  );
  const folderCount = new Set(
    workbooks
      .map((workbook) => workbook.folderName)
      .filter((folderName) => folderName.length > 0),
  ).size;
  const { auditColumns, workbookColumns, userColumns, settingColumns } =
    useDashboardColumns({
      currentUserId: currentUser.id,
      isAdmin: dashboard.isAdmin,
    });
  const auditReview = useMemo(
    () => createAuditActivityReview(dashboard.auditLogs),
    [dashboard.auditLogs],
  );

  function downloadAuditCsv() {
    downloadTextFile(
      auditLogsToCsv(dashboard.auditLogs),
      createReportFileName({
        extension: "csv",
        prefix: dashboard.isAdmin ? "admin-audit-log" : "my-audit-log",
      }),
      "text/csv;charset=utf-8",
    );
  }

  function downloadAuditJson() {
    downloadTextFile(
      auditLogsToJson(dashboard.auditLogs),
      createReportFileName({
        extension: "json",
        prefix: dashboard.isAdmin ? "admin-audit-log" : "my-audit-log",
      }),
      "application/json;charset=utf-8",
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
      <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <Badge variant="secondary" className="font-mono">
            {workbooks.length} workbooks
          </Badge>
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Create spreadsheets, manage accounts, and keep the workspace ready.
            </p>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 lg:max-w-xl sm:flex-row">
          <form action={createWorkbookAction} className="flex flex-1 gap-2">
            <Input name="name" placeholder="Budget, tracker, model..." />
            <Button type="submit">
              <Plus />
              New
            </Button>
          </form>
          <ImportWorkbookButton />
        </div>
      </section>

      <Tabs defaultValue="overview" orientation="vertical" className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-lg border bg-card p-3 lg:sticky lg:top-4 lg:self-start">
          <div className="px-2 py-2">
            <p className="text-sm font-medium">{currentUser.name}</p>
            <p className="truncate text-xs text-muted-foreground">{currentUser.email}</p>
          </div>
          <Separator className="my-2" />
          <TabsList variant="line" className="flex w-full flex-wrap justify-start gap-1 lg:flex-col">
            <TabsTrigger value="overview" className="justify-start">
              <LayoutDashboard />
              Overview
            </TabsTrigger>
            <TabsTrigger value="workbooks" className="justify-start">
              <FileSpreadsheet />
              Workbooks
            </TabsTrigger>
            <TabsTrigger value="users" className="justify-start">
              <Users />
              Users
            </TabsTrigger>
            <TabsTrigger value="website" className="justify-start">
              <Globe2 />
              Website
            </TabsTrigger>
            <TabsTrigger value="auth" className="justify-start">
              <LockKeyhole />
              Auth
            </TabsTrigger>
            <TabsTrigger value="audit" className="justify-start">
              <Activity />
              Audit
            </TabsTrigger>
          </TabsList>
        </aside>

        <div className="min-w-0 space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              label="Workbooks"
              value={dashboard.stats.workbooks}
              detail={`${openedCount} opened in this workspace`}
              icon={FileSpreadsheet}
            />
            <MetricCard
              label="Users"
              value={dashboard.stats.users}
              detail={`${dashboard.stats.verifiedUsers} verified accounts`}
              icon={Users}
            />
            <MetricCard
              label="Sessions"
              value={dashboard.stats.activeSessions}
              detail="Currently active sign-ins"
              icon={Activity}
            />
            <MetricCard
              label="Audit"
              value={dashboard.stats.auditEvents}
              detail="Recent logged events"
              icon={ShieldCheck}
            />
            <MetricCard
              label="Folders"
              value={folderCount}
              detail={`${customTemplates.length} saved templates`}
              icon={Folder}
            />
          </div>

          <TabsContent value="overview" className="space-y-6">
            <TemplateGallery customTemplates={customTemplates} />
            {workbooks.length === 0 ? (
              <section className="grid min-h-80 place-items-center rounded-lg border border-dashed bg-card/40 p-8 text-center">
                <div className="max-w-sm space-y-3">
                  <FileSpreadsheet className="mx-auto size-10 text-muted-foreground" />
                  <h2 className="text-lg font-medium">No workbooks yet</h2>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Name your first spreadsheet above and the app will create an editable starter
                    workbook with formulas.
                  </p>
                </div>
              </section>
            ) : (
              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Clock3 className="size-4 text-primary" />
                    <h2 className="text-sm font-semibold">Recent workbooks</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="font-mono">
                      {openedCount} opened
                    </Badge>
                    <Badge variant="secondary" className="font-mono">
                      <Folder className="size-3" />
                      {folderCount} folders
                    </Badge>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {workbooks.map((workbook) => (
                    <WorkbookCard key={workbook.id} workbook={workbook} />
                  ))}
                </div>
              </section>
            )}
          </TabsContent>

          <TabsContent value="workbooks">
            <Card>
              <CardHeader>
                <CardTitle>Workbook management</CardTitle>
                <CardDescription>Search, sort, and open saved spreadsheets.</CardDescription>
              </CardHeader>
              <CardContent>
                <TablecnDataTable
                  columns={workbookColumns}
                  data={dashboard.workbooks}
                  emptyText="No workbooks match this view."
                  searchPlaceholder="Search workbooks..."
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User management</CardTitle>
                <CardDescription>
                  Review accounts, email confirmation status, and active sessions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TablecnDataTable
                  columns={userColumns}
                  data={dashboard.users}
                  emptyText="No users match this view."
                  searchPlaceholder="Search users..."
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="website" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Website view</CardTitle>
                <CardDescription>
                  Keep public URLs and email delivery settings visible without exposing secrets.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TablecnDataTable
                  columns={settingColumns}
                  data={dashboard.settings}
                  emptyText="No settings are available."
                  searchPlaceholder="Search settings..."
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="auth" className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Current account</CardTitle>
                <CardDescription>Your signed-in account state.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <span className="text-sm font-medium">{currentUser.email}</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <span className="text-sm text-muted-foreground">Confirmation</span>
                  <StatusBadge
                    active={currentUser.emailVerified}
                    activeLabel="Confirmed"
                    inactiveLabel="Pending"
                  />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <span className="text-sm text-muted-foreground">Role</span>
                  <Badge variant="secondary" className="gap-1">
                    <ShieldCheck className="size-3" />
                    {dashboard.isAdmin ? "Admin" : "User"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Admin seed</CardTitle>
                <CardDescription>The seeded owner account for this workspace.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <span className="text-sm font-medium">{dashboard.adminEmail}</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <span className="text-sm text-muted-foreground">Password</span>
                  <span className="text-sm font-medium">Configured by seed script</span>
                </div>
                <div className="rounded-lg border p-3 text-sm leading-6 text-muted-foreground">
                  Run the admin seed command after database envs are present to create or repair the
                  owner login.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <Card>
              <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>Audit log</CardTitle>
                  <CardDescription>
                    Review auth, admin, import, export, and workbook events.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={downloadAuditCsv}
                    disabled={dashboard.auditLogs.length === 0}
                  >
                    <Download />
                    CSV
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={downloadAuditJson}
                    disabled={dashboard.auditLogs.length === 0}
                  >
                    <Download />
                    JSON
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 lg:grid-cols-2">
                  <section className="rounded-lg border p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold">Category review</h3>
                      <Badge variant="secondary" className="font-mono">
                        {auditReview.total}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {auditReview.categoryCounts.slice(0, 5).map((item) => (
                        <div
                          key={item.category}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <span className="capitalize text-muted-foreground">
                            {item.category}
                          </span>
                          <span className="font-mono">{item.count}</span>
                        </div>
                      ))}
                      {auditReview.categoryCounts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No activity has been logged yet.
                        </p>
                      ) : null}
                    </div>
                  </section>
                  <section className="rounded-lg border p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold">Actor review</h3>
                      <Badge variant="secondary" className="font-mono">
                        {auditReview.actorCounts.length}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {auditReview.actorCounts.slice(0, 5).map((item) => (
                        <div
                          key={item.actorEmail}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <span className="truncate text-muted-foreground">
                            {item.actorEmail}
                          </span>
                          <span className="font-mono">{item.count}</span>
                        </div>
                      ))}
                      {auditReview.actorCounts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No actors have audit events yet.
                        </p>
                      ) : null}
                    </div>
                  </section>
                </div>
                <TablecnDataTable
                  columns={auditColumns}
                  data={dashboard.auditLogs}
                  emptyText="No audit events are available yet."
                  searchPlaceholder="Search audit log..."
                />
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </main>
  );
}

function downloadTextFile(content: string, fileName: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
