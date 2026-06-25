"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { LocalSong } from "@/features/library/types";
import {
  createStudioMarker,
  createTakeLane,
  createTrackFromSong,
  getPrimaryStudioProject,
  listStudioProjectVersions,
  saveStudioProject,
  restoreStudioProjectVersion,
} from "./local-studio-projects";
import type {
  LocalStudioProject,
  LocalStudioProjectVersion,
  LocalStudioTrack,
} from "./types";

export function useStudioProject(songs: LocalSong[]) {
  const [project, setProject] = useState<LocalStudioProject | undefined>();
  const [versions, setVersions] = useState<LocalStudioProjectVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const songMap = useMemo(
    () => new Map(songs.map((song) => [song.id, song])),
    [songs],
  );

  useEffect(() => {
    getPrimaryStudioProject()
      .then(async (nextProject) => {
        setProject(nextProject);
        setVersions(await listStudioProjectVersions(nextProject.id));
      })
      .catch((error) => {
        console.error(error);
        toast.error("Could not load the studio project.");
      })
      .finally(() => setLoading(false));
  }, []);

  const persist = useCallback(async (
    next: LocalStudioProject,
    options: { forceVersion?: boolean } = {},
  ) => {
    setProject(next);
    const saved = await saveStudioProject(next, options);
    setProject(saved);
    setVersions(await listStudioProjectVersions(saved.id));
    return saved;
  }, []);

  const addSong = useCallback(
    async (song: LocalSong) => {
      if (!project) {
        return;
      }

      if (project.tracks.some((track) => track.songId === song.id)) {
        toast.error("This track is already in the studio project.");
        return;
      }

      const nextTrack = createTrackFromSong(song, project.tracks.length);
      await persist({
        ...project,
        tracks: [...project.tracks, nextTrack],
      }, { forceVersion: true });
      toast.success("Track added to the studio project.");
    },
    [persist, project],
  );

  const updateTrack = useCallback(
    async (trackId: string, patch: Partial<LocalStudioTrack>) => {
      if (!project) {
        return;
      }

      await persist({
        ...project,
        tracks: project.tracks.map((track) =>
          track.id === trackId ? { ...track, ...patch } : track,
        ),
      });
    },
    [persist, project],
  );

  const removeTrack = useCallback(
    async (trackId: string) => {
      if (!project) {
        return;
      }

      await persist({
        ...project,
        takeLanes: project.takeLanes.filter((take) => take.trackId !== trackId),
        tracks: project.tracks.filter((track) => track.id !== trackId),
      }, { forceVersion: true });
    },
    [persist, project],
  );

  const updateProject = useCallback(
    async (patch: Partial<LocalStudioProject>) => {
      if (!project) {
        return;
      }

      await persist({
        ...project,
        ...patch,
      });
    },
    [persist, project],
  );

  const addMarker = useCallback(
    async (startMs: number) => {
      if (!project) {
        return;
      }

      await persist({
        ...project,
        markers: [...project.markers, createStudioMarker(startMs)],
      }, { forceVersion: true });
    },
    [persist, project],
  );

  const addTakeLane = useCallback(
    async (trackId: string) => {
      const track = project?.tracks.find((item) => item.id === trackId);

      if (!project || !track) {
        return;
      }

      await persist({
        ...project,
        takeLanes: [...project.takeLanes, createTakeLane(track)],
      }, { forceVersion: true });
    },
    [persist, project],
  );

  const restoreVersion = useCallback(async (versionId: string) => {
    const restored = await restoreStudioProjectVersion(versionId);
    setProject(restored);
    setVersions(await listStudioProjectVersions(restored.id));
    toast.success("Studio version restored.");
  }, []);

  return {
    project,
    versions,
    loading,
    songMap,
    addSong,
    addMarker,
    addTakeLane,
    updateTrack,
    updateProject,
    removeTrack,
    restoreVersion,
  };
}
