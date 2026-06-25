import type { SongRightsMetadata } from "@/lib/library/rights";

export type SongSource = "upload" | "edit" | "ai" | "recording" | "import";
export type SongVisibility = "private" | "link-only" | "public";

export type LocalSong = {
  id: string;
  title: string;
  artist: string;
  source: SongSource;
  visibility: SongVisibility;
  shareSlug?: string;
  audioBlob: Blob;
  audioType: string;
  durationMs: number;
  lyrics: string;
  stylePrompt: string;
  tags: string[];
  rightsMetadata: SongRightsMetadata;
  liked: boolean;
  createdAt: number;
  updatedAt: number;
};

export type EditableSongPatch = Partial<
  Pick<
    LocalSong,
    | "title"
    | "artist"
    | "durationMs"
    | "lyrics"
    | "stylePrompt"
    | "tags"
    | "rightsMetadata"
    | "liked"
    | "visibility"
    | "shareSlug"
  >
>;

export type GeneratedSongInput = {
  audioBlob: Blob;
  durationMs: number;
  lyrics: string;
  mediaType?: string;
  stylePrompt: string;
  tags: string[];
  title: string;
};

export type LibraryStats = {
  totalSongs: number;
  likedSongs: number;
  totalDurationMs: number;
};
