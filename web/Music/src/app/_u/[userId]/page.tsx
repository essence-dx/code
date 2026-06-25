import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { ListMusic, Music2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDb } from "@/db";
import { playlists, songs, user } from "@/db/schema";
import { formatDuration } from "@/features/audio/format";
import { EssenceLogoMark } from "@/features/suno/essence-logo";
import { PublicCommentsPanel } from "@/features/comments/public-comments-panel";
import { ReportContentButton } from "@/features/moderation/report-content-button";
import { PublicSocialActions } from "@/features/social/public-social-actions";
import { getCommentCounts, getPublicComments } from "@/lib/comments";
import { getSocialCounts } from "@/lib/social";

export const runtime = "nodejs";

type ProfilePageProps = {
  params: Promise<{ userId: string }>;
};

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const profile = await getPublicProfile((await params).userId);

  if (!profile) {
    return {
      title: "Profile not found | Essence Suno",
    };
  }

  return {
    title: `${profile.owner.name} | Essence Suno`,
    description: `Public songs by ${profile.owner.name}`,
  };
}

export default async function PublicProfilePage({ params }: ProfilePageProps) {
  const profile = await getPublicProfile((await params).userId);

  if (!profile) {
    notFound();
  }

  return (
    <main className="essence-public-page bg-[#080b12] text-foreground">
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        <header className="flex flex-col gap-3 border-b border-white/10 pb-5">
          <div className="flex items-center gap-2 text-sm text-emerald-200">
            <EssenceLogoMark className="size-5" />
            Essence Suno profile
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-normal md:text-5xl">
                {profile.owner.name}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {profile.publicSongs.length} public track
                {profile.publicSongs.length === 1 ? "" : "s"} /{" "}
                {profile.publicPlaylists.length} public playlist
                {profile.publicPlaylists.length === 1 ? "" : "s"}
              </p>
            </div>
            <ReportContentButton
              targetId={profile.owner.id}
              targetLabel={profile.owner.name}
              targetType="profile"
            />
            <PublicSocialActions
              counts={profile.counts}
              targetId={profile.owner.id}
              targetType="profile"
            />
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-2">
          {profile.featuredSong ? (
            <Link href={`/s/${profile.featuredSong.shareSlug}`} className="md:col-span-2">
              <Card className="border-emerald-300/20 bg-emerald-400/[0.06] transition-colors hover:bg-emerald-400/[0.09]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Music2 className="size-4 text-emerald-200" />
                    Featured track: {profile.featuredSong.title}
                  </CardTitle>
                </CardHeader>
              </Card>
            </Link>
          ) : null}
          {profile.publicSongs.map((song) => (
            <Link key={song.id} href={`/s/${song.shareSlug}`}>
              <Card className="h-full border-white/10 bg-white/[0.04] transition-colors hover:bg-white/[0.07]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Music2 className="size-4 text-emerald-200" />
                    {song.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span>{song.artist}</span>
                    <span>{formatDuration(song.durationMs)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {song.tags.slice(0, 8).map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                    <Badge variant="outline">{song.commentCount} comments</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </section>

        {!profile.publicSongs.length ? (
          <div className="rounded-md border border-white/10 bg-slate-950/50 p-8 text-center text-sm text-muted-foreground">
            No public songs yet.
          </div>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-emerald-200">
            <ListMusic className="size-4" />
            Public playlists
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {profile.featuredPlaylist ? (
              <Link key="featured-playlist" href={`/p/${profile.featuredPlaylist.id}`}>
                <Card className="h-full border-emerald-300/20 bg-emerald-400/[0.06] transition-colors hover:bg-emerald-400/[0.09]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ListMusic className="size-4 text-emerald-200" />
                      Featured playlist: {profile.featuredPlaylist.name}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </Link>
            ) : null}
            {profile.publicPlaylists.map((playlist) => (
              <Link key={playlist.id} href={`/p/${playlist.id}`}>
                <Card className="h-full border-white/10 bg-white/[0.04] transition-colors hover:bg-white/[0.07]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ListMusic className="size-4 text-emerald-200" />
                      {playlist.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {playlist.description || "No description"}
                    </p>
                    <Badge variant="outline" className="mt-3">
                      {playlist.commentCount} comments
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          {!profile.publicPlaylists.length ? (
            <div className="rounded-md border border-white/10 bg-slate-950/50 p-8 text-center text-sm text-muted-foreground">
              No public playlists yet.
            </div>
          ) : null}
        </section>
        {profile.owner.publicBio || profile.owner.publicSocialLinks.length ? (
          <Card className="border-white/10 bg-white/[0.04]">
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {profile.owner.publicBio ? (
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {profile.owner.publicBio}
                </p>
              ) : null}
              {profile.owner.publicSocialLinks.length ? (
                <div className="flex flex-wrap gap-2">
                  {profile.owner.publicSocialLinks.map((link) => (
                    <a
                      key={`${link.label}:${link.url}`}
                      href={link.url}
                      className="text-sm text-emerald-200 hover:text-emerald-100"
                      rel="noreferrer"
                      target="_blank"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
        {profile.owner.profileCommentsEnabled ? (
          <PublicCommentsPanel
            comments={profile.profileComments}
            targetId={profile.owner.id}
            targetOwnerId={profile.owner.id}
            targetType="profile"
          />
        ) : null}
      </div>
    </main>
  );
}

async function getPublicProfile(userId: string) {
  const [owner] = await getDb()
    .select({
      featuredPlaylistId: user.featuredPlaylistId,
      featuredSongId: user.featuredSongId,
      id: user.id,
      name: user.name,
      profileCommentsEnabled: user.profileCommentsEnabled,
      publicBio: user.publicBio,
      publicSocialLinks: user.publicSocialLinks,
    })
    .from(user)
    .where(and(eq(user.id, userId), eq(user.profileModerationStatus, "clean")))
    .limit(1);

  if (!owner) {
    return null;
  }

  const publicSongs = await getDb()
    .select({
      id: songs.id,
      title: songs.title,
      artist: songs.artist,
      durationMs: songs.durationMs,
      tags: songs.tags,
      shareSlug: songs.shareSlug,
      updatedAt: songs.updatedAt,
    })
    .from(songs)
    .where(
      and(
        eq(songs.userId, userId),
        eq(songs.visibility, "public"),
        eq(songs.moderationStatus, "clean"),
      ),
    )
    .orderBy(desc(songs.updatedAt));
  type PublicSong = (typeof publicSongs)[number];
  const visibleSongs = publicSongs.filter(
    (song): song is PublicSong & { shareSlug: string } =>
      Boolean(song.shareSlug),
  );
  const publicPlaylists = await getDb()
    .select({
      id: playlists.id,
      name: playlists.name,
      description: playlists.description,
      updatedAt: playlists.updatedAt,
    })
    .from(playlists)
    .where(
      and(
        eq(playlists.userId, userId),
        eq(playlists.visibility, "public"),
        eq(playlists.moderationStatus, "clean"),
      ),
    )
    .orderBy(desc(playlists.updatedAt));
  const songCommentCounts = await getCommentCounts(
    "song",
    visibleSongs.map((song) => song.id),
  );
  const playlistCommentCounts = await getCommentCounts(
    "playlist",
    publicPlaylists.map((playlist) => playlist.id),
  );

  return {
    counts: await getSocialCounts("profile", owner.id),
    featuredPlaylist: publicPlaylists.find(
      (playlist) => playlist.id === owner.featuredPlaylistId,
    ),
    featuredSong: visibleSongs.find((song) => song.id === owner.featuredSongId),
    owner,
    profileComments: owner.profileCommentsEnabled
      ? await getPublicComments("profile", owner.id)
      : [],
    publicPlaylists: publicPlaylists.map((playlist) => ({
      ...playlist,
      commentCount: playlistCommentCounts.get(playlist.id) ?? 0,
    })),
    publicSongs: visibleSongs.map((song) => ({
      ...song,
      commentCount: songCommentCounts.get(song.id) ?? 0,
    })),
  };
}
