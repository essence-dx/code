import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { and, asc, eq, or } from "drizzle-orm";
import { Clock, ListMusic, LockKeyhole, Music2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDb } from "@/db";
import { playlistSongs, playlists, songAudioFiles, songs, user } from "@/db/schema";
import { formatDuration } from "@/features/audio/format";
import { EssenceLogoMark } from "@/features/suno/essence-logo";
import { PublicCommentsPanel } from "@/features/comments/public-comments-panel";
import { ReportContentButton } from "@/features/moderation/report-content-button";
import { PublicSocialActions } from "@/features/social/public-social-actions";
import { getPublicComments } from "@/lib/comments";
import { getSocialCounts } from "@/lib/social";

export const runtime = "nodejs";

type PublicPlaylistPageProps = {
  params: Promise<{ playlistId: string }>;
};

export async function generateMetadata({
  params,
}: PublicPlaylistPageProps): Promise<Metadata> {
  const share = await getPublicPlaylist((await params).playlistId);

  if (!share) {
    return {
      title: "Playlist not found | Essence Suno",
    };
  }

  return {
    title: `${share.playlist.name} | Essence Suno`,
    description:
      share.playlist.description ||
      `A playlist by ${share.ownerName} on Essence Suno.`,
  };
}

export default async function PublicPlaylistPage({
  params,
}: PublicPlaylistPageProps) {
  const share = await getPublicPlaylist((await params).playlistId);

  if (!share) {
    notFound();
  }

  return (
    <main className="essence-public-page bg-[#080b12] text-foreground">
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-2 text-sm text-emerald-200">
              <EssenceLogoMark className="size-5" />
              Essence Suno playlist
            </div>
            <h1 className="text-3xl font-semibold tracking-normal md:text-5xl">
              {share.playlist.name}
            </h1>
            <Link
              href={`/u/${share.ownerId}`}
              className="mt-2 block text-muted-foreground hover:text-foreground"
            >
              {share.ownerName}
            </Link>
            {share.playlist.description ? (
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
                {share.playlist.description}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="w-fit bg-emerald-400/15 text-emerald-200">
              {share.playlist.visibility === "public" ? "Public" : "Link only"}
            </Badge>
            <ReportContentButton
              targetId={share.playlist.id}
              targetLabel={share.playlist.name}
              targetType="playlist"
            />
            <PublicSocialActions
              counts={share.counts}
              targetId={share.playlist.id}
              targetType="playlist"
            />
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <FactCard
            icon={<Music2 className="size-4" />}
            label="Tracks"
            value={`${share.tracks.length}`}
          />
          <FactCard
            icon={<Clock className="size-4" />}
            label="Duration"
            value={formatDuration(
              share.tracks.reduce((sum, track) => sum + track.song.durationMs, 0),
            )}
          />
          <FactCard
            icon={<LockKeyhole className="size-4" />}
            label="Access"
            value={share.playlist.visibility === "public" ? "Public" : "Link only"}
          />
        </section>

        <section className="grid gap-3">
          {share.tracks.map((track, index) => {
            const blobAudioUrl = getBlobAudioUrl(track.song.audioStorageKey);
            const audioUrl =
              blobAudioUrl ??
              (track.audioSongId && track.song.shareSlug
                ? `/api/share/audio/${track.song.shareSlug}`
                : null);

            return (
              <Card key={track.song.id} className="border-white/10 bg-white/[0.04]">
                <CardHeader>
                  <CardTitle className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="flex min-w-0 items-center gap-2">
                      <Badge variant="secondary">{index + 1}</Badge>
                      <Link
                        href={`/s/${track.song.shareSlug}`}
                        className="truncate hover:text-emerald-200"
                      >
                        {track.song.title}
                      </Link>
                    </span>
                    <span className="text-sm font-normal text-muted-foreground">
                      {formatDuration(track.song.durationMs)}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {track.song.tags.slice(0, 8).map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  {audioUrl ? (
                    <audio controls className="w-full" src={audioUrl} />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Audio is not synced for this playlist track yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </section>

        {!share.tracks.length ? (
          <div className="rounded-md border border-white/10 bg-slate-950/50 p-8 text-center text-sm text-muted-foreground">
            This playlist has no public tracks yet.
          </div>
        ) : null}

        <PublicCommentsPanel
          comments={share.comments}
          targetId={share.playlist.id}
          targetOwnerId={share.ownerId}
          targetType="playlist"
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

async function getPublicPlaylist(playlistId: string) {
  const [playlistRow] = await getDb()
    .select({
      playlist: playlists,
      ownerId: user.id,
      ownerName: user.name,
    })
    .from(playlists)
    .innerJoin(user, eq(playlists.userId, user.id))
    .where(
      and(
        eq(playlists.id, playlistId),
        or(eq(playlists.visibility, "public"), eq(playlists.visibility, "link-only")),
        eq(playlists.moderationStatus, "clean"),
        eq(user.profileModerationStatus, "clean"),
      ),
    )
    .limit(1);

  if (!playlistRow) {
    return null;
  }

  const tracks = await getDb()
    .select({
      link: playlistSongs,
      song: songs,
      audioSongId: songAudioFiles.songId,
    })
    .from(playlistSongs)
    .innerJoin(songs, eq(playlistSongs.songId, songs.id))
    .leftJoin(songAudioFiles, eq(songAudioFiles.songId, songs.id))
    .where(
      and(
        eq(playlistSongs.playlistId, playlistId),
        or(eq(songs.visibility, "public"), eq(songs.visibility, "link-only")),
        eq(songs.moderationStatus, "clean"),
      ),
    )
    .orderBy(asc(playlistSongs.position));

  return {
    ...playlistRow,
    comments: await getPublicComments("playlist", playlistId),
    counts: await getSocialCounts("playlist", playlistId),
    tracks: tracks.filter((track) => Boolean(track.song.shareSlug)),
  };
}

function getBlobAudioUrl(storageKey: string | null) {
  if (!storageKey?.startsWith("blob:")) {
    return null;
  }

  return storageKey.slice("blob:".length);
}
