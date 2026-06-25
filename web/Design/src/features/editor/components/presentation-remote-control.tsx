"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  MonitorPlay,
  Smartphone,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  getNextSlideIndex,
  getPresentationChannelName,
  isPresentationChannelMessage,
  type PresentationCommandAction,
  type PresentationChannelMessage,
} from "@/features/editor/presentation-channel";
import type { PresentationRemoteController } from "@/features/editor/presentation-remote-types";
import type { DesignDocument } from "@/features/editor/types";
import { cn } from "@/lib/utils";

type PresentationRemoteControlProps = {
  projectId?: string;
  projectName: string;
  document?: DesignDocument;
  remoteToken?: string;
  initialRemoteSession?: PresentationRemoteController;
};

export function PresentationRemoteControl({
  projectId,
  projectName,
  document,
  remoteToken,
  initialRemoteSession,
}: PresentationRemoteControlProps) {
  const [remoteSession, setRemoteSession] = useState(initialRemoteSession);
  const slides = useMemo(
    () =>
      remoteSession?.slides ??
      document?.pages.map((page, index) => ({
        index,
        id: page.id,
        name: page.name,
        hasNotes: Boolean(page.notes?.trim()),
      })) ??
      [],
    [document?.pages, remoteSession?.slides],
  );
  const slideCount = Math.max(1, remoteSession?.slideCount ?? slides.length);
  const initialIndex =
    remoteSession?.activeIndex ??
    Math.max(
      0,
      document?.pages.findIndex((page) => page.id === document.activePageId) ??
        0,
    );
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [remotePageName, setRemotePageName] = useState(
    remoteSession?.pageName ?? slides[initialIndex]?.name ?? "Slide",
  );
  const [isConnected, setIsConnected] = useState(Boolean(initialRemoteSession));
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const channelName = useMemo(
    () => (projectId ? getPresentationChannelName(projectId) : null),
    [projectId],
  );
  const channelRef = useRef<BroadcastChannel | null>(null);
  const tokenPath = remoteToken ? encodeURIComponent(remoteToken) : null;

  useEffect(() => {
    if (remoteToken || !channelName || !("BroadcastChannel" in window)) {
      return;
    }

    const channel = new BroadcastChannel(channelName);
    channelRef.current = channel;

    channel.onmessage = (event) => {
      if (!isPresentationChannelMessage(event.data)) return;

      if (event.data.type === "state") {
        setIsConnected(true);
        setActiveIndex(event.data.activeIndex);
        setRemotePageName(event.data.pageName);
      }
    };

    return () => {
      channel.close();

      if (channelRef.current === channel) {
        channelRef.current = null;
      }
    };
  }, [channelName, remoteToken]);

  useEffect(() => {
    if (!tokenPath) return;

    let ignore = false;

    async function refreshRemoteState() {
      try {
        const response = await fetch(`/api/presentation-remote/${tokenPath}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Remote session expired");
        }

        const body = (await response.json()) as {
          session: PresentationRemoteController;
        };

        if (ignore) return;

        setRemoteSession(body.session);
        setActiveIndex(body.session.activeIndex);
        setRemotePageName(body.session.pageName);
        setIsConnected(true);
        setRemoteError(null);
      } catch (error) {
        if (ignore) return;

        setIsConnected(false);
        setRemoteError(
          error instanceof Error ? error.message : "Remote session unavailable",
        );
      }
    }

    void refreshRemoteState();
    const intervalId = window.setInterval(refreshRemoteState, 1500);

    return () => {
      ignore = true;
      window.clearInterval(intervalId);
    };
  }, [tokenPath]);

  const sendCommand = useCallback(
    async (action: PresentationCommandAction, slideIndex?: number) => {
      const nextIndex = getNextSlideIndex({
        currentIndex: activeIndex,
        slideCount,
        action,
        slideIndex,
      });

      setActiveIndex(nextIndex);
      setRemotePageName(slides[nextIndex]?.name ?? `Slide ${nextIndex + 1}`);

      if (tokenPath) {
        try {
          const response = await fetch(
            `/api/presentation-remote/${tokenPath}/commands`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action, slideIndex }),
            },
          );

          if (!response.ok) {
            throw new Error("Command was not accepted");
          }

          setIsConnected(true);
          setRemoteError(null);
        } catch (error) {
          setIsConnected(false);
          setRemoteError(
            error instanceof Error ? error.message : "Could not send command",
          );
        }

        return;
      }

      const message: PresentationChannelMessage = {
        type: "command",
        action,
        slideIndex,
      };

      channelRef.current?.postMessage(message);
    },
    [activeIndex, slideCount, slides, tokenPath],
  );

  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Smartphone className="h-5 w-5 text-muted-foreground" />
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold">
                {projectName}
              </h1>
              <p className="text-xs text-muted-foreground">
                Presentation remote
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? "secondary" : "outline"}>
              {isConnected ? "Paired" : remoteToken ? "Reconnecting" : "Local"}
            </Badge>
            {projectId ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/present/${projectId}`}>
                  <MonitorPlay className="h-4 w-4" />
                  Speaker
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-5">
        {remoteError ? (
          <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {remoteError}
          </div>
        ) : null}

        <div className="rounded-md border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Current slide
              </p>
              <h2 className="truncate text-2xl font-semibold">
                {activeIndex + 1}. {remotePageName}
              </h2>
            </div>
            <Badge variant="outline">
              {activeIndex + 1} / {slideCount}
            </Badge>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{
                width: `${
                  slideCount > 1
                    ? Math.round((activeIndex / (slideCount - 1)) * 100)
                    : 100
                }%`,
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            className="h-24 text-base"
            variant="outline"
            onClick={() => void sendCommand("previous")}
            disabled={activeIndex === 0}
          >
            <ChevronLeft className="h-5 w-5" />
            Previous
          </Button>
          <Button
            className="h-24 text-base"
            onClick={() => void sendCommand("next")}
            disabled={activeIndex >= slideCount - 1}
          >
            Next
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            onClick={() => void sendCommand("first")}
            disabled={activeIndex === 0}
          >
            <ChevronFirst className="h-4 w-4" />
            First
          </Button>
          <Button
            variant="outline"
            onClick={() => void sendCommand("last")}
            disabled={activeIndex >= slideCount - 1}
          >
            Last
            <ChevronLast className="h-4 w-4" />
          </Button>
        </div>

        <Separator />

        <div className="grid gap-2">
          {Array.from({ length: slideCount }, (_, index) => {
            const slide = slides[index];

            return (
              <button
                key={slide?.id ?? index}
                type="button"
                className={cn(
                  "flex items-center justify-between gap-3 rounded-md border px-4 py-3 text-left transition",
                  index === activeIndex
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card hover:bg-accent",
                )}
                onClick={() => void sendCommand("go-to", index)}
              >
                <span className="min-w-0 truncate font-medium">
                  {index + 1}. {slide?.name ?? `Slide ${index + 1}`}
                </span>
                <Badge
                  variant={index === activeIndex ? "secondary" : "outline"}
                >
                  {slide?.hasNotes ? "Notes" : "Slide"}
                </Badge>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
