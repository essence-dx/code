import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { Film, MessageSquare, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getDb } from "@/db";
import { hookPosts, hookVideoFiles, user } from "@/db/schema";
import { formatDuration } from "@/features/audio/format";
import { EssenceLogoMark } from "@/features/suno/essence-logo";
import { getCommentCounts } from "@/lib/comments";

export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Hooks | Essence Suno",
  description: "Browse public short music hooks from Essence Suno creators.",
};

type HooksPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function HooksPage({ searchParams }: HooksPageProps) {
  const query = ((await searchParams).q ?? "").trim();
  const hooks = await getPublicHooks(query);

  return (
    <main className="essence-public-page bg-[#080b12] text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <Link
              href="/"
              className="mb-3 flex items-center gap-2 text-sm text-emerald-200"
            >
              <EssenceLogoMark className="size-5" />
              Essence Suno
            </Link>
            <h1 className="text-3xl font-semibold tracking-normal md:text-5xl">
              Hooks
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Public short-form music clips from creators. Private hook drafts
              stay local until synced.
            </p>
          </div>
          <form className="flex w-full gap-2 md:w-[360px]">
            <Input name="q" defaultValue={query} placeholder="Search hooks" />
            <Button type="submit" className="gap-2">
              <Search className="size-4" />
              Search
            </Button>
          </form>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          <Metric label="Public hooks" value={hooks.length} />
          <Metric
            label="With synced video"
            value={hooks.filter((hook) => Boolean(hook.videoUrl)).length}
          />
          <Metric
            label="Comments"
            value={hooks.reduce((sum, hook) => sum + hook.commentCount, 0)}
          />
        </section>

        {hooks.length ? (
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {hooks.map((hook) => (
              <HookCard key={hook.id} hook={hook} />
            ))}
          </section>
        ) : (
          <div className="rounded-md border border-white/10 bg-slate-950/50 p-8 text-center text-sm text-muted-foreground">
            No public hooks match this search yet.
          </div>
        )}
      </div>
    </main>
  );
}

function HookCard({ hook }: { hook: PublicHookCard }) {
  return (
    <Card className="h-full border-white/10 bg-white/[0.04]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Film className="size-4 text-emerald-200" />
          <Link href={`/h/${hook.id}`} className="hover:text-emerald-200">
            {hook.songTitle}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Link href={`/h/${hook.id}`} className="block overflow-hidden rounded-md">
          {hook.videoUrl ? (
            <video
              src={hook.videoUrl}
              className="aspect-[9/16] w-full bg-black object-cover"
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <div className="flex aspect-[9/16] items-center justify-center bg-slate-950 p-6 text-center text-sm text-muted-foreground">
              Video sync pending
            </div>
          )}
        </Link>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{hook.artist}</span>
          <span>{formatDuration(hook.durationMs)}</span>
        </div>
        <Link
          href={`/u/${hook.ownerId}`}
          className="block text-sm text-emerald-200 hover:text-emerald-100"
        >
          {hook.ownerName}
        </Link>
        {hook.overlayText ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {hook.overlayText}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <MessageSquare className="size-3.5" />
            {hook.commentCount}
          </span>
          <div className="flex flex-wrap gap-2">
            {hook.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.04] p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-normal">{value}</p>
    </div>
  );
}

async function getPublicHooks(query: string) {
  const rows = await getDb()
    .select({
      hook: hookPosts,
      ownerId: user.id,
      ownerName: user.name,
      videoHookId: hookVideoFiles.hookId,
    })
    .from(hookPosts)
    .innerJoin(user, eq(hookPosts.userId, user.id))
    .leftJoin(hookVideoFiles, eq(hookVideoFiles.hookId, hookPosts.id))
    .where(
      and(
        eq(hookPosts.visibility, "public"),
        eq(hookPosts.moderationStatus, "clean"),
        eq(user.profileModerationStatus, "clean"),
      ),
    )
    .orderBy(desc(hookPosts.updatedAt))
    .limit(72);
  const commentCounts = await getCommentCounts(
    "hook",
    rows.map((row) => row.hook.id),
  );
  const hooks = rows.map((row) => ({
    ...row.hook,
    commentCount: commentCounts.get(row.hook.id) ?? 0,
    ownerId: row.ownerId,
    ownerName: row.ownerName,
    videoUrl: getHookVideoUrl(
      row.hook.videoStorageKey,
      row.hook.id,
      Boolean(row.videoHookId),
    ),
  }));

  return filterByQuery(hooks, query);
}

function filterByQuery(rows: PublicHookCard[], query: string) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return rows;
  }

  return rows.filter((hook) =>
    [
      hook.songTitle,
      hook.artist,
      hook.ownerName,
      hook.overlayText,
      hook.stylePrompt,
      hook.lyrics,
      hook.tags.join(" "),
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalized),
  );
}

function getHookVideoUrl(
  storageKey: string | null,
  hookId: string,
  videoAvailable: boolean,
) {
  if (storageKey?.startsWith("blob:")) {
    return storageKey.slice("blob:".length);
  }

  return videoAvailable ? `/api/hooks/${hookId}/video` : null;
}

type PublicHookCard = {
  artist: string;
  commentCount: number;
  durationMs: number;
  id: string;
  lyrics: string;
  overlayText: string;
  ownerId: string;
  ownerName: string;
  songTitle: string;
  stylePrompt: string;
  tags: string[];
  videoUrl: string | null;
};
