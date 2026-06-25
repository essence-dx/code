import type { LocalSong } from "./types";
import { getSongRightsReadiness } from "@/lib/library/rights";

export type SongReadinessState = "ready" | "warning";

export type SongReadinessCheck = {
  detail: string;
  id: string;
  label: string;
  state: SongReadinessState;
};

export function getSongReadiness(song: LocalSong) {
  const rights = getSongRightsReadiness(song.rightsMetadata);
  const checks: SongReadinessCheck[] = [
    {
      id: "identity",
      label: "Identity",
      state: song.title.trim() && song.artist.trim() ? "ready" : "warning",
      detail:
        song.title.trim() && song.artist.trim()
          ? "Title and artist are set."
          : "Add a title and artist before sharing.",
    },
    {
      id: "audio",
      label: "Audio",
      state: song.durationMs > 0 && song.audioBlob.size > 0 ? "ready" : "warning",
      detail:
        song.durationMs > 0 && song.audioBlob.size > 0
          ? "Audio is available with a measured duration."
          : "Audio duration needs to be measured.",
    },
    {
      id: "lyrics",
      label: "Lyrics",
      state: song.lyrics.trim().length >= 80 ? "ready" : "warning",
      detail:
        song.lyrics.trim().length >= 80
          ? "Lyrics are substantial enough for a share page."
          : "Add more lyrics or a full hook before sharing.",
    },
    {
      id: "style",
      label: "Style",
      state: song.stylePrompt.trim().length >= 40 ? "ready" : "warning",
      detail:
        song.stylePrompt.trim().length >= 40
          ? "Style direction is clear."
          : "Add a richer style prompt for context.",
    },
    {
      id: "tags",
      label: "Tags",
      state: song.tags.length >= 3 ? "ready" : "warning",
      detail:
        song.tags.length >= 3
          ? "Tags are ready for browsing and playlists."
          : "Add at least three tags for organization.",
    },
    {
      id: "share",
      label: "Share Link",
      state:
        song.visibility === "private" || song.shareSlug ? "ready" : "warning",
      detail:
        song.visibility === "private" || song.shareSlug
          ? "Sharing state is consistent."
          : "Sync the track to create its share link.",
    },
    {
      id: "rights",
      label: "Rights",
      state: rights.ready ? "ready" : "warning",
      detail: rights.summary,
    },
  ];
  const ready = checks.filter((check) => check.state === "ready").length;

  return {
    checks,
    ready,
    score: Math.round((ready / checks.length) * 100),
    total: checks.length,
    warning: checks.length - ready,
  };
}
