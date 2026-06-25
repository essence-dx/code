import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { Clock, Film, Music2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDb } from "@/db";
import { hookPosts, hookVideoFiles, user } from "@/db/schema";
import { formatDuration } from "@/features/audio/format";
import { EssenceLogoMark } from "@/features/suno/essence-logo";
import { PublicCommentsPanel } from "@/features/comments/public-comments-panel";
import { ReportContentButton } from "@/features/moderation/report-content-button";
import { PublicSocialActions } from "@/features/social/public-social-actions";
import { getPublicComments } from "@/lib/comments";
import { getSocialCounts } from "@/lib/social";

export const runtime = "nodejs";

type HookPageProps = {
  params: Promise<{ hookId: string }>;
};

export async function generateMetadata({
  params,
}: HookPageProps): Promise<Metadata> {
  const share = await getSharedHook((await params).hookId);

  if (!share) {
    return {
      title: "Hook not found | Essence Suno",
    };
  }

  return {
    title: `${share.hook.songTitle} Hook | Essence Suno`,
    description: share.hook.overlayText || share.hook.stylePrompt,
  };
}

export default async function SharedHookPage({ params }: HookPageProps) {
  const share = await getSharedHook((await params).hookId);

  if (!share) {
    notFound();
  }

  const { comments, counts, hook, ownerId, ownerName, videoAvailable } = share;
  const videoUrl = getHookVideoUrl(hook.videoStorageKey, hook.id, videoAvailable);

  return (
    <main className="essence-public-page bg-[#080b12] text-foreground">
      <div className="mx-auto flex max-w-4xl flex-col gap-5">
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
              {hook.songTitle}
            </h1>
            <Link
              href={`/u/${ownerId}`}
              className="mt-2 block text-muted-foreground hover:text-foreground"
            >
              {ownerName}
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="w-fit bg-emerald-400/15 text-emerald-200">
              Hook
            </Badge>
            <ReportContentButton
              targetId={hook.id}
              targetLabel={hook.songTitle}
              targetType="hook"
            />
            <PublicSocialActions
              counts={counts}
              targetId={hook.id}
              targetType="hook"
              remixDraft={{
                artist: hook.artist,
                lyrics: hook.lyrics,
                stylePrompt: hook.stylePrompt,
                tags: hook.tags,
                title: hook.songTitle,
              }}
            />
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <FactCard label="Artist" value={hook.artist} icon={<Music2 className="size-4" />} />
          <FactCard
            label="Start"
            value={formatDuration(hook.startMs)}
            icon={<Clock className="size-4" />}
          />
          <FactCard
            label="Length"
            value={formatDuration(hook.durationMs)}
            icon={<Film className="size-4" />}
          />
        </section>

        <Card className="border-white/10 bg-white/[0.04]">
          <CardHeader>
            <CardTitle>Video</CardTitle>
          </CardHeader>
          <CardContent>
            {videoUrl ? (
              <video
                src={videoUrl}
                controls
                playsInline
                className="mx-auto aspect-[9/16] max-h-[720px] rounded-md border border-white/10 bg-black object-cover"
              />
            ) : (
              <div className="rounded-md border border-white/10 bg-slate-950/50 p-4 text-sm text-muted-foreground">
                Video is not synced for this hook yet.
              </div>
            )}
          </CardContent>
        </Card>

        {hook.overlayText ? (
          <Card className="border-white/10 bg-white/[0.04]">
            <CardHeader>
              <CardTitle>Hook text</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                {hook.overlayText}
              </p>
            </CardContent>
          </Card>
        ) : null}

        <Card className="border-white/10 bg-white/[0.04]">
          <CardHeader>
            <CardTitle>Tags</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {hook.tags.length ? (
              hook.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No tags yet.</p>
            )}
          </CardContent>
        </Card>

        <PublicCommentsPanel
          comments={comments}
          targetId={hook.id}
          targetOwnerId={ownerId}
          targetType="hook"
        />
      </div>
    </main>
  );
}

function FactCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <p className="text-xs uppercase tracking-normal">{label}</p>
      </div>
      <p className="mt-2 font-medium">{value}</p>
    </div>
  );
}

async function getSharedHook(hookId: string) {
  const [row] = await getDb()
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
        eq(hookPosts.id, hookId),
        eq(hookPosts.visibility, "public"),
        eq(hookPosts.moderationStatus, "clean"),
        eq(user.profileModerationStatus, "clean"),
      ),
    )
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    ...row,
    comments: await getPublicComments("hook", row.hook.id),
    counts: await getSocialCounts("hook", row.hook.id),
    videoAvailable: Boolean(row.videoHookId),
  };
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
