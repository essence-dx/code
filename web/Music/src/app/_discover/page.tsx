import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { Film, ListMusic, MessageSquare, Music2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getDb } from "@/db";
import { playlists, songs, user } from "@/db/schema";
import { formatDuration } from "@/features/audio/format";
import { EssenceLogoMark } from "@/features/suno/essence-logo";
import { getCommentCounts } from "@/lib/comments";

export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Discover | Essence Suno",
  description: "Browse public tracks and playlists from Essence Suno creators.",
};

type DiscoverPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function DiscoverPage({ searchParams }: DiscoverPageProps) {
  const query = ((await searchParams).q ?? "").trim();
  const library = await getDiscoverLibrary(query);
  const featuredSongs = library.songs.filter(isFeaturedSong).slice(0, 6);
  const newSongs = library.songs.filter((song) => !featuredSongs.includes(song));

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
              Discover
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Public tracks and playlists from creators. Private and link-only
              work stays out of discovery.
            </p>
          </div>
          <form className="flex w-full gap-2 md:w-[360px]">
            <Input name="q" defaultValue={query} placeholder="Search public music" />
            <Button type="submit" className="gap-2">
              <Search className="size-4" />
              Search
            </Button>
            <Button asChild variant="secondary" className="gap-2">
              <Link href="/hooks">
                <Film className="size-4" />
                Hooks
              </Link>
            </Button>
          </form>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          <Metric label="Public tracks" value={library.songs.length} />
          <Metric label="Public playlists" value={library.playlists.length} />
          <Metric label="Featured eligible" value={featuredSongs.length} />
        </section>

        <DiscoverSection
          icon={<Music2 className="size-4 text-emerald-200" />}
          title={query ? "Matching Tracks" : "Featured Tracks"}
          empty="No public tracks match this search yet."
        >
          {(query ? library.songs : featuredSongs).map((song) => (
            <SongCard key={song.id} song={song} />
          ))}
        </DiscoverSection>

        {!query && newSongs.length ? (
          <DiscoverSection
            icon={<Music2 className="size-4 text-emerald-200" />}
            title="New Public Tracks"
            empty=""
          >
            {newSongs.slice(0, 8).map((song) => (
              <SongCard key={song.id} song={song} />
            ))}
          </DiscoverSection>
        ) : null}

        <DiscoverSection
          icon={<ListMusic className="size-4 text-emerald-200" />}
          title={query ? "Matching Playlists" : "Public Playlists"}
          empty="No public playlists match this search yet."
        >
          {library.playlists.map((playlist) => (
            <Card
              key={playlist.id}
              className="h-full border-white/10 bg-white/[0.04]"
            >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ListMusic className="size-4 text-emerald-200" />
                    <Link href={`/p/${playlist.id}`} className="hover:text-emerald-200">
                      {playlist.name}
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {playlist.description || "No description"}
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      href={`/u/${playlist.ownerId}`}
                      className="text-sm text-emerald-200 hover:text-emerald-100"
                    >
                      {playlist.ownerName}
                    </Link>
                    <CommentPill count={playlist.commentCount} />
                  </div>
                </CardContent>
            </Card>
          ))}
        </DiscoverSection>
      </div>
    </main>
  );
}

function DiscoverSection({
  children,
  empty,
  icon,
  title,
}: {
  children: ReactNode;
  empty: string;
  icon: ReactNode;
  title: string;
}) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children;
  const count = Array.isArray(items) ? items.length : items ? 1 : 0;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-emerald-200">
        {icon}
        {title}
      </div>
      {count ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{children}</div>
      ) : empty ? (
        <div className="rounded-md border border-white/10 bg-slate-950/50 p-8 text-center text-sm text-muted-foreground">
          {empty}
        </div>
      ) : null}
    </section>
  );
}

function SongCard({ song }: { song: DiscoverSong }) {
  return (
    <Card className="h-full border-white/10 bg-white/[0.04]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music2 className="size-4 text-emerald-200" />
            <Link href={`/s/${song.shareSlug}`} className="hover:text-emerald-200">
              {song.title}
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{song.artist}</span>
            <span>{formatDuration(song.durationMs)}</span>
          </div>
          <Link
            href={`/u/${song.ownerId}`}
            className="block text-sm text-emerald-200 hover:text-emerald-100"
          >
            {song.ownerName}
          </Link>
          <CommentPill count={song.commentCount} />
          <div className="flex flex-wrap gap-2">
            {song.tags.slice(0, 8).map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
    </Card>
  );
}

function CommentPill({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <MessageSquare className="size-3.5" />
      {count}
    </span>
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

async function getDiscoverLibrary(query: string) {
  const db = getDb();
  const publicSongs = await db
    .select({
      id: songs.id,
      title: songs.title,
      artist: songs.artist,
      durationMs: songs.durationMs,
      tags: songs.tags,
      shareSlug: songs.shareSlug,
      lyrics: songs.lyrics,
      stylePrompt: songs.stylePrompt,
      updatedAt: songs.updatedAt,
      ownerId: user.id,
      ownerName: user.name,
    })
    .from(songs)
    .innerJoin(user, eq(songs.userId, user.id))
    .where(
      and(
        eq(songs.visibility, "public"),
        eq(songs.moderationStatus, "clean"),
        eq(user.profileModerationStatus, "clean"),
        isNotNull(songs.shareSlug),
      ),
    )
    .orderBy(desc(songs.updatedAt))
    .limit(72);

  const publicPlaylists = await db
    .select({
      id: playlists.id,
      name: playlists.name,
      description: playlists.description,
      updatedAt: playlists.updatedAt,
      ownerId: user.id,
      ownerName: user.name,
    })
    .from(playlists)
    .innerJoin(user, eq(playlists.userId, user.id))
    .where(
      and(
        eq(playlists.visibility, "public"),
        eq(playlists.moderationStatus, "clean"),
        eq(user.profileModerationStatus, "clean"),
      ),
    )
    .orderBy(desc(playlists.updatedAt))
    .limit(48);
  const discoverSongs = publicSongs.flatMap((song) =>
    song.shareSlug ? [{ ...song, shareSlug: song.shareSlug }] : [],
  );
  const songCommentCounts = await getCommentCounts(
    "song",
    discoverSongs.map((song) => song.id),
  );
  const playlistCommentCounts = await getCommentCounts(
    "playlist",
    publicPlaylists.map((playlist) => playlist.id),
  );
  const songsWithCounts = discoverSongs.map((song) => ({
    ...song,
    commentCount: songCommentCounts.get(song.id) ?? 0,
  }));
  const playlistsWithCounts = publicPlaylists.map((playlist) => ({
    ...playlist,
    commentCount: playlistCommentCounts.get(playlist.id) ?? 0,
  }));

  return {
    playlists: filterByQuery(playlistsWithCounts, query, (playlist) => [
      playlist.name,
      playlist.description,
      playlist.ownerName,
    ]),
    songs: filterByQuery(songsWithCounts, query, (song) => [
      song.title,
      song.artist,
      song.ownerName,
      song.stylePrompt,
      song.lyrics,
      song.tags.join(" "),
    ]),
  };
}

function filterByQuery<T>(
  rows: T[],
  query: string,
  getText: (row: T) => string[],
) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return rows;
  }

  return rows.filter((row) =>
    getText(row).join(" ").toLowerCase().includes(normalized),
  );
}

function isFeaturedSong(song: DiscoverSong) {
  return (
    song.tags.length >= 3 &&
    song.stylePrompt.trim().length >= 40 &&
    song.lyrics.trim().length >= 80
  );
}

type DiscoverSong = {
  artist: string;
  commentCount: number;
  durationMs: number;
  id: string;
  lyrics: string;
  ownerId: string;
  ownerName: string;
  shareSlug: string;
  stylePrompt: string;
  tags: string[];
  title: string;
  updatedAt: Date;
};
