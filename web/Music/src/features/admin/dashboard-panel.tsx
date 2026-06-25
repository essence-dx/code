"use client";

import {
  Activity,
  Globe2,
  LayoutDashboard,
  Loader2,
  ShieldCheck,
  Users,
  WandSparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuthPanel } from "@/features/auth/auth-panel";
import { authClient } from "@/lib/auth-client";
import {
  ModerationReportTable,
  type AdminReportRow,
} from "./moderation-report-table";
import { UserAdminTable, type AdminUserRow } from "./user-admin-table";

type AdminOverview = {
  admin: {
    email: string;
    name: string;
  };
  stats: {
    aiJobs: number;
    playlists: number;
    reportsOpen: number;
    songs: number;
    users: number;
  };
  reports: AdminReportRow[];
  users: AdminUserRow[];
};

type ReadinessSummary = {
  coreBlocked: number;
  coreScore: number;
  fullScore: number;
  warning: number;
};

type ReadinessResponse = {
  summary: ReadinessSummary;
};

export function DashboardPanel() {
  const { data: session, isPending } = authClient.useSession();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [readiness, setReadiness] = useState<ReadinessSummary | null>(null);
  const [adminDenied, setAdminDenied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      const readinessPromise = fetch("/api/readiness")
        .then(async (response): Promise<ReadinessSummary | null> => {
          if (!response.ok) {
            return null;
          }

          const payload = (await response.json()) as ReadinessResponse;
          return payload.summary;
        })
        .catch(() => null);
      const overviewPromise = session?.user
        ? fetch("/api/admin/overview")
            .then(async (response) => {
              if (response.status === 403) {
                setAdminDenied(true);
                return null;
              }
              if (!response.ok) {
                throw new Error("Could not load dashboard.");
              }
              setAdminDenied(false);
              return response.json();
            })
            .catch(() => null)
        : Promise.resolve(null);

      const [nextReadiness, nextOverview] = await Promise.all([
        readinessPromise,
        overviewPromise,
      ]);

      if (!alive) {
        return;
      }

      setReadiness(nextReadiness);
      setOverview(nextOverview);
      setLoading(false);
    }

    if (!isPending) {
      void load();
    }

    return () => {
      alive = false;
    };
  }, [isPending, session?.user]);

  const adminUsers = useMemo(() => overview?.users ?? [], [overview?.users]);
  const moderationReports = useMemo(
    () => overview?.reports ?? [],
    [overview?.reports],
  );

  if (!session?.user && !isPending) {
    return (
      <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
        <DashboardIntro readiness={readiness} />
        <AuthPanel />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card className="border-white/10 bg-white/[0.04]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LayoutDashboard className="size-4 text-emerald-200" />
              Command dashboard
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="Users" value={overview?.stats.users ?? 0} />
            <MetricCard label="Tracks" value={overview?.stats.songs ?? 0} />
            <MetricCard label="Playlists" value={overview?.stats.playlists ?? 0} />
            <MetricCard label="AI jobs" value={overview?.stats.aiJobs ?? 0} />
            <MetricCard label="Reports" value={overview?.stats.reportsOpen ?? 0} />
          </CardContent>
        </Card>
        <WebsiteStatusCard readiness={readiness} loading={loading || isPending} />
      </div>

      <Tabs defaultValue={overview ? "reports" : "account"}>
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-4 lg:w-[640px]">
          <TabsTrigger value="account">User</TabsTrigger>
          <TabsTrigger value="website">Website</TabsTrigger>
          <TabsTrigger value="reports" disabled={!overview}>
            Reports
          </TabsTrigger>
          <TabsTrigger value="users" disabled={!overview}>
            Admin
          </TabsTrigger>
        </TabsList>
        <TabsContent value="account" className="pt-4">
          <Card className="border-white/10 bg-white/[0.04]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="size-4 text-emerald-200" />
                Account
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AuthPanel />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="website" className="pt-4">
          <DashboardIntro readiness={readiness} />
        </TabsContent>
        <TabsContent value="reports" className="pt-4">
          <Card className="border-white/10 bg-white/[0.04]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="size-4 text-emerald-200" />
                Moderation reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              {overview ? (
                <ModerationReportTable
                  reports={moderationReports}
                  onReportUpdated={(updatedReport) => {
                    setOverview((current) =>
                      current
                        ? {
                            ...current,
                            reports: current.reports.map((item) =>
                              item.id === updatedReport.id ? updatedReport : item,
                            ),
                            stats: {
                              ...current.stats,
                              reportsOpen: current.reports
                                .map((item) =>
                                  item.id === updatedReport.id
                                    ? updatedReport
                                    : item,
                                )
                                .filter((item) => item.status === "open").length,
                            },
                          }
                        : current,
                    );
                  }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {adminDenied
                    ? "This account does not have admin access."
                    : "Sign in with the seeded admin account to review reports."}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="users" className="pt-4">
          <Card className="border-white/10 bg-white/[0.04]">
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="size-4 text-emerald-200" />
                  User management
                </CardTitle>
                {overview ? (
                  <Badge className="bg-emerald-400/15 text-emerald-200">
                    {overview.admin.email}
                  </Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              {overview ? (
                <UserAdminTable
                  users={adminUsers}
                  onUserUpdated={(updatedUser) => {
                    setOverview((current) =>
                      current
                        ? {
                            ...current,
                            users: current.users.map((item) =>
                              item.id === updatedUser.id ? updatedUser : item,
                            ),
                          }
                        : current,
                    );
                  }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {adminDenied
                    ? "This account does not have admin access."
                    : "Sign in with the seeded admin account to manage users."}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DashboardIntro({ readiness }: { readiness: ReadinessSummary | null }) {
  return (
    <Card className="border-white/10 bg-white/[0.04]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe2 className="size-4 text-emerald-200" />
          Website view
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        <StatusTile
          icon={Activity}
          label="Core release"
          value={readiness ? `${readiness.coreScore}/100` : "checking"}
        />
        <StatusTile
          icon={WandSparkles}
          label="Upgrade coverage"
          value={readiness ? `${readiness.fullScore}/100` : "checking"}
        />
        <StatusTile
          icon={ShieldCheck}
          label="State"
          value={readiness ? readinessLabel(readiness) : "checking"}
        />
      </CardContent>
    </Card>
  );
}

function WebsiteStatusCard({
  loading,
  readiness,
}: {
  loading: boolean;
  readiness: ReadinessSummary | null;
}) {
  return (
    <Card className="border-white/10 bg-white/[0.04]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {loading ? (
            <Loader2 className="size-4 animate-spin text-emerald-200" />
          ) : (
            <Globe2 className="size-4 text-emerald-200" />
          )}
          Live readiness
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <MetricCard
          label="Core"
          value={readiness ? `${readiness.coreScore}/100` : "checking"}
        />
        <MetricCard
          label="Full"
          value={readiness ? `${readiness.fullScore}/100` : "checking"}
        />
      </CardContent>
    </Card>
  );
}

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-white/10 bg-slate-950/55 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-normal">{value}</p>
    </div>
  );
}

function readinessLabel(readiness: ReadinessSummary) {
  if (readiness.coreBlocked > 0) {
    return "blocked";
  }

  if (readiness.warning > 0) {
    return "needs upgrades";
  }

  return "ready";
}

function StatusTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-slate-950/55 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="size-4 text-emerald-200" />
      </div>
      <p className="mt-3 text-xl font-semibold tracking-normal">{value}</p>
    </div>
  );
}
