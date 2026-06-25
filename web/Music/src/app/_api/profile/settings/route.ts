import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { playlists, songs, user as users, userBlocks } from "@/db/schema";
import { jsonError, normalizeRouteError } from "@/lib/api";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";

const socialLinkSchema = z.object({
  label: z.string().trim().min(1).max(40),
  url: z.string().trim().url().max(300),
});

const updateProfileSchema = z.object({
  featuredPlaylistId: z.string().max(160).nullable().optional(),
  featuredSongId: z.string().max(160).nullable().optional(),
  profileCommentsEnabled: z.boolean().optional(),
  publicBio: z.string().trim().max(700).optional(),
  publicSocialLinks: z.array(socialLinkSchema).max(5).optional(),
});

export async function GET(request: Request) {
  try {
    const signedInUser = await requireUser(request);
    const data = await getProfileSettings(signedInUser.id);

    return NextResponse.json(data);
  } catch (error) {
    return normalizeRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const signedInUser = await requireUser(request);
    const input = updateProfileSchema.parse(await request.json());
    const featuredSongId = await resolveOwnedPublicSong(
      signedInUser.id,
      input.featuredSongId,
    );
    const featuredPlaylistId = await resolveOwnedPublicPlaylist(
      signedInUser.id,
      input.featuredPlaylistId,
    );

    if (input.featuredSongId && !featuredSongId) {
      return jsonError("Featured track must be one of your public tracks.", 422);
    }

    if (input.featuredPlaylistId && !featuredPlaylistId) {
      return jsonError("Featured playlist must be one of your public playlists.", 422);
    }

    const updateValues: {
      featuredPlaylistId?: string | null;
      featuredSongId?: string | null;
      profileCommentsEnabled?: boolean;
      publicBio?: string;
      publicSocialLinks?: Array<{ label: string; url: string }>;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (input.featuredPlaylistId !== undefined) {
      updateValues.featuredPlaylistId = featuredPlaylistId;
    }

    if (input.featuredSongId !== undefined) {
      updateValues.featuredSongId = featuredSongId;
    }

    if (input.profileCommentsEnabled !== undefined) {
      updateValues.profileCommentsEnabled = input.profileCommentsEnabled;
    }

    if (input.publicBio !== undefined) {
      updateValues.publicBio = input.publicBio;
    }

    if (input.publicSocialLinks !== undefined) {
      updateValues.publicSocialLinks = input.publicSocialLinks;
    }

    await getDb()
      .update(users)
      .set(updateValues)
      .where(eq(users.id, signedInUser.id));

    return NextResponse.json(await getProfileSettings(signedInUser.id));
  } catch (error) {
    return normalizeRouteError(error);
  }
}

async function getProfileSettings(userId: string) {
  const [profile] = await getDb()
    .select({
      featuredPlaylistId: users.featuredPlaylistId,
      featuredSongId: users.featuredSongId,
      profileCommentsEnabled: users.profileCommentsEnabled,
      publicBio: users.publicBio,
      publicSocialLinks: users.publicSocialLinks,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!profile) {
    throw new Error("Profile not found.");
  }

  const publicSongs = await getDb()
    .select({
      id: songs.id,
      title: songs.title,
    })
    .from(songs)
    .where(
      and(
        eq(songs.userId, userId),
        eq(songs.visibility, "public"),
        eq(songs.moderationStatus, "clean"),
      ),
    );
  const publicPlaylists = await getDb()
    .select({
      id: playlists.id,
      name: playlists.name,
    })
    .from(playlists)
    .where(
      and(
        eq(playlists.userId, userId),
        eq(playlists.visibility, "public"),
        eq(playlists.moderationStatus, "clean"),
      ),
    );
  const blockedUsers = await getDb()
    .select({
      blockedAt: userBlocks.createdAt,
      id: users.id,
      name: users.name,
    })
    .from(userBlocks)
    .innerJoin(users, eq(userBlocks.blockedUserId, users.id))
    .where(eq(userBlocks.blockerUserId, userId))
    .orderBy(desc(userBlocks.createdAt));

  return {
    blockedUsers,
    profile,
    publicPlaylists,
    publicSongs,
  };
}

async function resolveOwnedPublicSong(userId: string, songId?: string | null) {
  if (!songId) {
    return null;
  }

  const [song] = await getDb()
    .select({ id: songs.id })
    .from(songs)
    .where(
      and(
        eq(songs.id, songId),
        eq(songs.userId, userId),
        eq(songs.visibility, "public"),
        eq(songs.moderationStatus, "clean"),
      ),
    )
    .limit(1);

  return song?.id ?? null;
}

async function resolveOwnedPublicPlaylist(
  userId: string,
  playlistId?: string | null,
) {
  if (!playlistId) {
    return null;
  }

  const [playlist] = await getDb()
    .select({ id: playlists.id })
    .from(playlists)
    .where(
      and(
        eq(playlists.id, playlistId),
        eq(playlists.userId, userId),
        eq(playlists.visibility, "public"),
        eq(playlists.moderationStatus, "clean"),
      ),
    )
    .limit(1);

  return playlist?.id ?? null;
}
