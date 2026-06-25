import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowLeft, CheckCircle2, PackageCheck, Rocket, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createDesktopReleaseOperationsSnapshot } from "@/features/projects/server/desktop-release-source";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

function getRequestOrigin(requestHeaders: Headers) {
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");

  if (!host) {
    return "https://essence-spline.vercel.app";
  }

  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");

  return `${protocol}://${host}`;
}

function statusBadge(
  ready: boolean,
  labels: { ready: string; blocked: string } = {
    ready: "Ready",
    blocked: "Blocked",
  },
) {
  return (
    <Badge className="rounded-md" variant={ready ? "secondary" : "destructive"}>
      {ready ? labels.ready : labels.blocked}
    </Badge>
  );
}

function formatTarget(value: string) {
  return value === "darwin" ? "macOS" : value[0].toUpperCase() + value.slice(1);
}

export default async function ReleaseOperationsPage() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({
    headers: requestHeaders,
  });

  if (!session?.user.id) {
    redirect("/sign-in");
  }

  const origin = getRequestOrigin(requestHeaders);
  const { dashboard } = createDesktopReleaseOperationsSnapshot(origin);

  return (
    <main className="min-h-dvh bg-muted/30 p-4 text-foreground lg:p-6">
      <div className="mx-auto w-full max-w-[1400px] space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Rocket className="size-4" />
              <span>Release Operations</span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal">Desktop Update Channels</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Version {dashboard.metadata.version} generated from {dashboard.bundleDir}</p>
          </div>
          <Link className={buttonVariants({ className: "gap-2", variant: "secondary" })} href="/projects">
            <ArrowLeft className="size-4" />
            Dashboard
          </Link>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={<CheckCircle2 className="size-4" />} label="Ready channels" value={`${dashboard.readyChannelCount}/${dashboard.channelRows.length}`} />
          <MetricCard icon={<PackageCheck className="size-4" />} label="Selected artifacts" value={dashboard.selectedArtifactCount} />
          <MetricCard icon={<ShieldAlert className="size-4" />} label="Unsigned blockers" value={dashboard.unsignedArtifactCount} />
          <MetricCard icon={<TriangleAlert className="size-4" />} label="Blocked channels" value={dashboard.blockedChannelCount} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Promotion Readiness</CardTitle>
              <CardDescription>Stable, beta, and nightly gates from the signed desktop artifact scan.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Channel</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Artifacts</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Blockers</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboard.channelRows.map((row) => (
                      <TableRow key={row.channel}>
                        <TableCell className="capitalize">{row.channel}</TableCell>
                        <TableCell className="font-mono text-xs">{row.version}</TableCell>
                        <TableCell>{row.artifactCount}</TableCell>
                        <TableCell>{statusBadge(row.ready)}</TableCell>
                        <TableCell className="max-w-[520px] text-xs text-muted-foreground">
                          {row.report.issues.length > 0 ? row.report.issues.map((issue) => issue.detail).join(" ") : "No blockers"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Target Coverage</CardTitle>
              <CardDescription>Preferred signed artifacts selected for updater manifests.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Target</TableHead>
                      <TableHead>Arches</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboard.targetRows.map((row) => (
                      <TableRow key={row.target}>
                        <TableCell>{formatTarget(row.target)}</TableCell>
                        <TableCell className="font-mono text-xs">{row.arches.join(", ") || "none"}</TableCell>
                        <TableCell>
                          {statusBadge(!row.missing, {
                            ready: "Covered",
                            blocked: "Missing",
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Artifact History</CardTitle>
            <CardDescription>Artifacts discovered in the current desktop bundle directory.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Artifact</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Arch</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Signature</TableHead>
                    <TableHead>URL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard.artifactRows.length > 0 ? (
                    dashboard.artifactRows.map((artifact) => (
                      <TableRow key={`${artifact.target}:${artifact.arch}:${artifact.path}`}>
                        <TableCell className="font-mono text-xs">{artifact.path}</TableCell>
                        <TableCell>{formatTarget(artifact.target)}</TableCell>
                        <TableCell className="font-mono text-xs">{artifact.arch}</TableCell>
                        <TableCell>{artifact.priority}</TableCell>
                        <TableCell>
                          {statusBadge(artifact.signed, {
                            ready: "Signed",
                            blocked: "Missing",
                          })}
                        </TableCell>
                        <TableCell className="max-w-[360px] truncate font-mono text-xs text-muted-foreground">{artifact.url}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell className="text-muted-foreground" colSpan={6}>
                        No desktop artifacts found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Updater Environment</CardTitle>
            <CardDescription>Environment rows generated from the selected signed artifacts.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard.envRows.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell className="font-mono text-xs">{row.key}</TableCell>
                      <TableCell className="max-w-[760px] truncate font-mono text-xs text-muted-foreground">{row.value}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function MetricCard({ icon, label, value }: { icon: ReactNode; label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
        <div className="flex size-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">{icon}</div>
      </CardContent>
    </Card>
  );
}
