"use client";

import {
  Gauge,
  FastForward,
  Pause,
  Play,
  Repeat,
  Rewind,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDuration } from "@/features/audio/format";
import type { LocalSong } from "@/features/library/types";
import { useObjectUrl } from "@/hooks/use-object-url";

type PlayerBarProps = {
  song?: LocalSong;
  onPrevious: () => void;
  onNext: () => void;
};

export function PlayerBar({ song, onPrevious, onNext }: PlayerBarProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const url = useObjectUrl(song?.audioBlob);
  const [playing, setPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [volume, setVolume] = useState(80);
  const [lastAudibleVolume, setLastAudibleVolume] = useState(80);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loopTrack, setLoopTrack] = useState(false);

  useEffect(() => {
    setPlaying(false);
    setPositionMs(0);
  }, [song?.id]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  async function toggle() {
    const audio = audioRef.current;
    if (!audio || !song) {
      return;
    }

    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }

    await audio.play();
    setPlaying(true);
  }

  function toggleMute() {
    if (volume > 0) {
      setLastAudibleVolume(volume);
      setVolume(0);
      return;
    }

    setVolume(lastAudibleVolume || 80);
  }

  function seekBy(deltaMs: number) {
    const audio = audioRef.current;
    if (!audio || !song) {
      return;
    }

    const nextPositionMs = clamp(
      Math.round(audio.currentTime * 1000) + deltaMs,
      0,
      durationMs,
    );
    audio.currentTime = nextPositionMs / 1000;
    setPositionMs(nextPositionMs);
  }

  const durationMs = song?.durationMs || 0;
  const muted = volume === 0;

  return (
    <div className="essence-player-safe sticky bottom-0 z-20 border-t border-white/10 bg-slate-950/95 pt-3 backdrop-blur">
      <audio
        ref={audioRef}
        src={url}
        loop={loopTrack}
        onTimeUpdate={(event) =>
          setPositionMs(Math.round(event.currentTarget.currentTime * 1000))
        }
        onEnded={() => setPlaying(false)}
      />
      <div className="mx-auto flex max-w-7xl min-w-0 flex-col gap-3 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {song?.title ?? "No track selected"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {song?.artist ?? "Import audio to begin"}
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center justify-center gap-1.5 sm:gap-2 lg:w-auto lg:flex-nowrap">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant={loopTrack ? "secondary" : "ghost"}
                aria-label={loopTrack ? "Disable track loop" : "Loop current track"}
                aria-pressed={loopTrack}
                onClick={() => setLoopTrack((current) => !current)}
                disabled={!song}
              >
                <Repeat className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Loop current track</TooltipContent>
          </Tooltip>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Previous track"
            onClick={onPrevious}
            disabled={!song}
          >
            <SkipBack className="size-4" />
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Seek back 10 seconds"
                onClick={() => seekBy(-10000)}
                disabled={!song}
              >
                <Rewind className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Back 10 seconds</TooltipContent>
          </Tooltip>
          <Button
            size="icon"
            aria-label={playing ? "Pause track" : "Play track"}
            onClick={toggle}
            disabled={!song}
          >
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Seek forward 10 seconds"
                onClick={() => seekBy(10000)}
                disabled={!song}
              >
                <FastForward className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Forward 10 seconds</TooltipContent>
          </Tooltip>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Next track"
            onClick={onNext}
            disabled={!song}
          >
            <SkipForward className="size-4" />
          </Button>
        </div>
        <div className="flex w-full min-w-0 items-center gap-2 sm:gap-3 lg:flex-[2]">
          <span className="w-10 text-right text-xs text-muted-foreground">
            {formatDuration(positionMs)}
          </span>
          <Slider
            value={[durationMs ? Math.min(positionMs, durationMs) : 0]}
            max={Math.max(1, durationMs)}
            step={500}
            disabled={!song}
            onValueChange={([value]) => {
              const audio = audioRef.current;
              if (audio) {
                audio.currentTime = value / 1000;
              }
              setPositionMs(value);
            }}
          />
          <span className="w-10 text-xs text-muted-foreground">
            {formatDuration(durationMs)}
          </span>
        </div>
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 lg:w-auto lg:flex-nowrap">
          <div className="flex items-center gap-2">
            <Gauge className="size-4 text-muted-foreground" aria-hidden="true" />
            <Select
              value={String(playbackRate)}
              onValueChange={(value) => setPlaybackRate(Number(value))}
              disabled={!song}
            >
              <SelectTrigger className="h-9 w-24">
                <SelectValue aria-label={`${playbackRate}x playback speed`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.75">0.75x</SelectItem>
                <SelectItem value="1">1x</SelectItem>
                <SelectItem value="1.25">1.25x</SelectItem>
                <SelectItem value="1.5">1.5x</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            size="icon"
            variant="ghost"
            aria-label={muted ? "Unmute player" : "Mute player"}
            onClick={toggleMute}
          >
            {muted ? (
              <VolumeX className="size-4 text-muted-foreground" />
            ) : (
              <Volume2 className="size-4 text-muted-foreground" />
            )}
          </Button>
          <Slider
            className="min-w-24 flex-[1_1_7rem] lg:w-32"
            value={[volume]}
            min={0}
            max={100}
            step={1}
            onValueChange={([value]) => {
              setVolume(value);
              if (value > 0) {
                setLastAudibleVolume(value);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
