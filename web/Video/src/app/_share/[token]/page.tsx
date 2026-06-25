import Link from "next/link";
import { AlertCircle, CheckCircle2, Download, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HostedReviewComments } from "@/features/review/components/hosted-review-comments";
import { canHostedReviewComment } from "@/lib/projects/hosted-review-link-contracts";
import { getPublicHostedReviewLink } from "@/lib/projects/server-review-links";

export default async function HostedReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await getPublicHostedReviewLink(token);

  if (!link) {
    return (
      <ReviewShell>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="size-4" />
              Review link not found
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">This hosted review link does not exist or has been removed.</p>
            <Button asChild variant="outline">
              <Link href="/">Open Essence Studio</Link>
            </Button>
          </CardContent>
        </Card>
      </ReviewShell>
    );
  }

  const unavailable = !link.enabled || link.expired;
  const canComment = canHostedReviewComment(link.permission);
  const metadataHref = `data:application/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(
      {
        title: link.title,
        exportName: link.exportName,
        permission: link.permission,
        expiresAt: link.expiresAt,
        createdAt: link.createdAt,
      },
      null,
      2,
    ),
  )}`;

  return (
    <ReviewShell>
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-3 text-lg">
            <span className="flex min-w-0 items-center gap-2">
              {unavailable ? <AlertCircle className="size-4" /> : <CheckCircle2 className="size-4" />}
              <span className="truncate">{link.title}</span>
            </span>
            <Badge variant={unavailable ? "destructive" : "default"}>{unavailable ? "Unavailable" : "Review link"}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <ReviewMetric label="Access" value={permissionLabel(link.permission)} />
            <ReviewMetric label="Expires" value={formatDate(link.expiresAt)} />
            <ReviewMetric label="Export" value={link.exportName ?? "Project review"} />
          </div>
          <div className="rounded-md border border-border p-4 text-sm text-muted-foreground">
            {unavailable
              ? "This review link is no longer accepting feedback."
              : "This hosted link shares project review metadata only. Large media stays local-first until a storage adapter is connected."}
          </div>
          <div className="flex flex-wrap gap-2">
            {unavailable || !canComment ? (
              <Button disabled>
                <MessageSquare className="size-4" />
                Comment
              </Button>
            ) : (
              <Button asChild>
                <a href="#comments">
                  <MessageSquare className="size-4" />
                  Comment
                </a>
              </Button>
            )}
            {unavailable || link.permission !== "download" ? (
              <Button variant="outline" disabled>
                <Download className="size-4" />
                Download metadata
              </Button>
            ) : (
              <Button asChild variant="outline">
                <a href={metadataHref} download={`${safeFilename(link.title)}-review.json`}>
                  <Download className="size-4" />
                  Download metadata
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      <HostedReviewComments token={link.token} canComment={canComment} unavailable={unavailable} />
    </ReviewShell>
  );
}

function ReviewShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div>
          <p className="text-sm text-muted-foreground">Essence Studio</p>
          <h1 className="text-2xl font-semibold tracking-tight">Hosted review</h1>
        </div>
        {children}
      </section>
    </main>
  );
}

function ReviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-medium">{value}</div>
    </div>
  );
}

function permissionLabel(permission: string) {
  if (permission === "download") return "Download";
  if (permission === "view") return "View";
  return "Comment only";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function safeFilename(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "essence-review";
}
