import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { and, eq, or } from "drizzle-orm";
import { Clock, LockKeyhole, Music2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDb } from "@/db";
import { songAudioFiles, songs, user } from "@/db/schema";
import { formatDuration } from "@/features/audio/format";
import { EssenceLogoMark } from "@/features/suno/essence-logo";
import { PublicCommentsPanel } from "@/features/comments/public-comments-panel";
import { ReportContentButton } from "@/features/moderation/report-content-button";
import { PublicSocialActions } from "@/features/social/public-social-actions";
import { getPublicComments } from "@/lib/comments";
import { getSocialCounts } from "@/lib/social";

export const runtime = "nodejs";

type SharePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: SharePageProps): Promise<Metadata> {
  const share = await getSharedSong((await params).slug);

  if (!share) {
    return {
      title: "Song not found | Essence Suno",
    };
  }

  return {
    title: `${share.song.title} | Essence Suno`,
    description: share.song.stylePrompt || share.song.lyrics.slice(0, 160),
  };
}

export default async function SharedSongPage({ params }: SharePageProps) {
  const share = await getSharedSong((await params).slug);

  if (!share) {
    notFound();
  }

  const { audioSongId, comments, counts, ownerId, ownerName, song } = share;
  const blobAudioUrl = getBlobAudioUrl(song.audioStorageKey);

  return (
    <main className="essence-public-page bg-[#080b12] text-foreground">
      <div className="mx-auto flex max-w-4xl flex-col gap-5">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-2 text-sm text-emerald-200">
              <EssenceLogoMark className="size-5" />
              Essence Suno
            </div>
            <h1 className="text-3xl font-semibold tracking-normal md:text-5xl">
              {song.title}
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
              {song.visibility}
            </Badge>
            <ReportContentButton
              targetId={song.id}
              targetLabel={song.title}
              targetType="song"
            />
            <PublicSocialActions
              counts={counts}
              targetId={song.id}
              targetType="song"
              remixDraft={{
                artist: song.artist,
                lyrics: song.lyrics,
                stylePrompt: song.stylePrompt,
                tags: song.tags,
                title: song.title,
              }}
            />
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <FactCard
            icon={<Music2 className="size-4" />}
            label="Artist"
            value={song.artist}
          />
          <FactCard
            icon={<Clock className="size-4" />}
            label="Duration"
            value={formatDuration(song.durationMs)}
          />
          <FactCard
            icon={<LockKeyhole className="size-4" />}
            label="Access"
            value={song.visibility === "public" ? "Public" : "Link only"}
          />
        </section>

        {blobAudioUrl || audioSongId ? (
          <Card className="border-white/10 bg-white/[0.04]">
            <CardHeader>
              <CardTitle>Audio</CardTitle>
            </CardHeader>
            <CardContent>
              <audio
                controls
                className="w-full"
                src={blobAudioUrl ?? `/api/share/audio/${song.shareSlug}`}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-md border border-white/10 bg-slate-950/50 p-4 text-sm text-muted-foreground">
            Audio is not synced for this shared song yet.
          </div>
        )}

        <Card className="border-white/10 bg-white/[0.04]">
          <CardHeader>
            <CardTitle>Tags</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {song.tags.length ? (
              song.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No tags yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.04]">
          <CardHeader>
            <CardTitle>Style</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {song.stylePrompt || "No style prompt added."}
            </p>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.04]">
          <CardHeader>
            <CardTitle>Lyrics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
              {song.lyrics || "No lyrics added."}
            </p>
          </CardContent>
        </Card>

        <PublicCommentsPanel
          comments={comments}
          targetId={song.id}
          targetOwnerId={ownerId}
          targetType="song"
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

async function getSharedSong(shareSlug: string) {
  const [row] = await getDb()
    .select({
      song: songs,
      audioSongId: songAudioFiles.songId,
      ownerId: user.id,
      ownerName: user.name,
    })
    .from(songs)
    .innerJoin(user, eq(songs.userId, user.id))
    .leftJoin(songAudioFiles, eq(songAudioFiles.songId, songs.id))
    .where(
      and(
        eq(songs.shareSlug, shareSlug),
        or(eq(songs.visibility, "public"), eq(songs.visibility, "link-only")),
        eq(songs.moderationStatus, "clean"),
        eq(user.profileModerationStatus, "clean"),
      ),
    )
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    ...row,
    comments: await getPublicComments("song", row.song.id),
    counts: await getSocialCounts("song", row.song.id),
  };
}

function getBlobAudioUrl(storageKey: string | null) {
  if (!storageKey?.startsWith("blob:")) {
    return null;
  }

  return storageKey.slice("blob:".length);
}
