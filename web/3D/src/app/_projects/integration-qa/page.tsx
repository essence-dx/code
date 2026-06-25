import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Code2, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createEmbedCodeQaReport } from "@/features/projects/embed-code-qa";
import { auth } from "@/lib/auth";

function getRequestOrigin(requestHeaders: Headers) {
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");

  if (!host) {
    return "https://essence-spline.vercel.app";
  }

  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");

  return `${protocol}://${host}`;
}

export default async function IntegrationQaPage() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({
    headers: requestHeaders,
  });

  if (!session?.user.id) {
    redirect("/sign-in");
  }

  const report = createEmbedCodeQaReport(getRequestOrigin(requestHeaders));

  return (
    <main className="min-h-dvh bg-muted/30 p-4 text-foreground lg:p-6">
      <div className="mx-auto w-full max-w-[1280px] space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Code2 className="size-4" />
              <span>Integration QA</span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal">Embed and Code Presets</h1>
          </div>
          <Link className={buttonVariants({ className: "gap-2", variant: "secondary" })} href="/projects">
            <ArrowLeft className="size-4" />
            Dashboard
          </Link>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Card>
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="text-sm text-muted-foreground">Generated presets</p>
                <p className="mt-1 text-2xl font-semibold">{report.rows.length}</p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                <Code2 className="size-4" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="text-sm text-muted-foreground">Passing</p>
                <p className="mt-1 text-2xl font-semibold">{report.passed}</p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                <CheckCircle2 className="size-4" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="text-sm text-muted-foreground">Failing</p>
                <p className="mt-1 text-2xl font-semibold">{report.failed}</p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                <TriangleAlert className="size-4" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Preset Coverage</CardTitle>
            <CardDescription>Every generated snippet is checked against the sample share, embed, and public scene API URLs.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Preset</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Preview</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="font-medium">{row.label}</div>
                      <div className="max-w-80 truncate font-mono text-xs text-muted-foreground">{row.targetUrl}</div>
                    </TableCell>
                    <TableCell className="capitalize">{row.kind}</TableCell>
                    <TableCell>
                      {row.lines} lines, {row.characters} chars
                    </TableCell>
                    <TableCell>
                      <Badge className="rounded-md" variant={row.status === "pass" ? "secondary" : "destructive"}>
                        {row.status === "pass" ? "Pass" : "Fail"}
                      </Badge>
                      {row.issues.length > 0 ? <div className="mt-1 text-xs text-destructive">{row.issues.join(", ")}</div> : null}
                    </TableCell>
                    <TableCell className="max-w-[380px] truncate font-mono text-xs text-muted-foreground">{row.preview}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
