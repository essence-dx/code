"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  MonitorPlay,
  Pause,
  Play,
  RotateCcw,
  Smartphone,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { PresentationAudienceResults } from "@/features/editor/components/presentation-audience-results";
import { ElementRenderer } from "@/features/editor/components/element-renderer";
import { PresentationRemotePairing } from "@/features/editor/components/presentation-remote-pairing";
import { downloadTextFile } from "@/features/editor/download-text-file";
import {
  getNextSlideIndex,
  getPresentationChannelName,
  isPresentationChannelMessage,
} from "@/features/editor/presentation-channel";
import { createSpeakerNotesMarkdown } from "@/features/editor/presentation-notes";
import {
  createPresentationCaptionsVtt,
  createPresentationTranscript,
} from "@/features/editor/presentation-transcript";
import { getPageDimensions } from "@/features/editor/page-dimensions";
import type { PresentationRemoteCommand } from "@/features/editor/presentation-remote-types";
import type {
  DesignDocument,
  DesignElement,
  DesignPage,
  PageTransition,
} from "@/features/editor/types";
import { usePresentationRemoteSession } from "@/features/editor/use-presentation-remote-session";
import { cn } from "@/lib/utils";

type PresentationSpeakerViewProps = {
  projectId: string;
  projectName: string;
  publicShareId: string | null;
  document: DesignDocument;
};

export function PresentationSpeakerView({
  projectId,
  projectName,
  publicShareId,
  document,
}: PresentationSpeakerViewProps) {
  const pages = document.pages;
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(
      0,
      pages.findIndex((page) => page.id === document.activePageId),
    ),
  );
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null);
  const [elapsedBaseMs, setElapsedBaseMs] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const activePage = pages[activeIndex] ?? pages[0];
  const nextPage = pages[activeIndex + 1] ?? null;
  const slideCount = pages.length;
  const channelName = useMemo(
    () => getPresentationChannelName(projectId),
    [projectId],
  );
  const channelRef = useRef<BroadcastChannel | null>(null);
  const progress = slideCount > 1 ? activeIndex / (slideCount - 1) : 1;
  const elapsedMs = elapsedBaseMs + (timerStartedAt ? now - timerStartedAt : 0);
  const elapsedTime = formatElapsedTime(Math.max(0, elapsedMs));

  const goToSlide = useCallback(
    (index: number) => {
      setActiveIndex(Math.max(0, Math.min(index, slideCount - 1)));
    },
    [slideCount],
  );
  const goToPreviousSlide = useCallback(() => {
    goToSlide(activeIndex - 1);
  }, [activeIndex, goToSlide]);
  const goToNextSlide = useCallback(() => {
    goToSlide(activeIndex + 1);
  }, [activeIndex, goToSlide]);
  const handleRemoteCommand = useCallback(
    (command: PresentationRemoteCommand) => {
      setActiveIndex((currentIndex) =>
        getNextSlideIndex({
          currentIndex,
          slideCount,
          action: command.action,
          slideIndex: command.slideIndex ?? undefined,
        }),
      );
    },
    [slideCount],
  );
  const remotePairing = usePresentationRemoteSession({
    projectId,
    activeIndex,
    slideCount,
    pageName: activePage.name,
    onCommand: handleRemoteCommand,
  });

  useEffect(() => {
    if (!("BroadcastChannel" in window)) return;

    const channel = new BroadcastChannel(channelName);
    channelRef.current = channel;

    channel.onmessage = (event) => {
      if (!isPresentationChannelMessage(event.data)) return;
      if (event.data.type !== "command") return;

      setActiveIndex((currentIndex) =>
        getNextSlideIndex({
          currentIndex,
          slideCount,
          action: event.data.action,
          slideIndex: event.data.slideIndex,
        }),
      );
    };

    return () => {
      channel.close();

      if (channelRef.current === channel) {
        channelRef.current = null;
      }
    };
  }, [channelName, slideCount]);

  useEffect(() => {
    channelRef.current?.postMessage({
      type: "state",
      activeIndex,
      slideCount,
      pageName: activePage.name,
    });
  }, [activeIndex, activePage.name, slideCount]);

  useEffect(() => {
    if (!timerStartedAt) return;

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 500);

    return () => window.clearInterval(intervalId);
  }, [timerStartedAt]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return;

      if (
        event.key === "ArrowRight" ||
        event.key === "PageDown" ||
        event.key === " "
      ) {
        event.preventDefault();
        goToNextSlide();
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        goToPreviousSlide();
        return;
      }

      if (event.key === "Home") {
        event.preventDefault();
        goToSlide(0);
        return;
      }

      if (event.key === "End") {
        event.preventDefault();
        goToSlide(slideCount - 1);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNextSlide, goToPreviousSlide, goToSlide, slideCount]);

  function toggleTimer() {
    const timestamp = Date.now();

    if (timerStartedAt) {
      setElapsedBaseMs(elapsedMs);
      setTimerStartedAt(null);
      return;
    }

    setNow(timestamp);
    setTimerStartedAt(timestamp);
  }

  function resetTimer() {
    const timestamp = Date.now();

    setElapsedBaseMs(0);
    setNow(timestamp);
    setTimerStartedAt(timerStartedAt ? timestamp : null);
  }

  function exportSpeakerNotes() {
    downloadTextFile({
      fileName: `${projectName}-speaker-notes.md`,
      text: createSpeakerNotesMarkdown({ projectName, document }),
      type: "text/markdown;charset=utf-8",
    });
  }

  function exportTranscript() {
    downloadTextFile({
      fileName: `${projectName}-transcript.md`,
      text: createPresentationTranscript({ projectName, document }),
      type: "text/markdown;charset=utf-8",
    });
  }

  function exportCaptions() {
    downloadTextFile({
      fileName: `${projectName}-captions.vtt`,
      text: createPresentationCaptionsVtt({ projectName, document }),
      type: "text/vtt;charset=utf-8",
    });
  }

  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <style>{presentationTransitionStyles}</style>
      <header className="border-b border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href={`/editor/${projectId}`}>Editor</Link>
            </Button>
            <MonitorPlay className="h-5 w-5 text-muted-foreground" />
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold">
                {projectName}
              </h1>
              <p className="text-xs text-muted-foreground">{activePage.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              Slide {activeIndex + 1} of {slideCount}
            </Badge>
            <Badge variant={timerStartedAt ? "secondary" : "outline"}>
              <Clock3 className="h-3.5 w-3.5" />
              {elapsedTime}
            </Badge>
            <Button asChild variant="outline" size="sm">
              <Link href={`/present/${projectId}/remote`}>
                <Smartphone className="h-4 w-4" />
                Remote
              </Link>
            </Button>
            {publicShareId ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/audience/${publicShareId}`}>
                  <Smartphone className="h-4 w-4" />
                  Audience
                </Link>
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={exportSpeakerNotes}>
              <Download className="h-4 w-4" />
              Notes
            </Button>
            <Button variant="outline" size="sm" onClick={exportTranscript}>
              <Download className="h-4 w-4" />
              Transcript
            </Button>
          </div>
        </div>
      </header>

      <section className="grid min-h-0 flex-1 gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-h-0 flex-col gap-3">
          <ScaledPagePreview
            key={activePage.id}
            className="min-h-[360px] flex-1 bg-zinc-950 p-4"
            document={document}
            page={activePage}
            transition={activePage.transition ?? "none"}
          />
          <SlideRail
            pages={pages}
            activeIndex={activeIndex}
            onSelectSlide={goToSlide}
          />
        </div>

        <aside className="flex min-h-0 flex-col rounded-md border border-border bg-card">
          <div className="space-y-3 p-4">
            <div className="grid grid-cols-4 gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => goToSlide(0)}
                disabled={activeIndex === 0}
                aria-label="First slide"
              >
                <ChevronFirst className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={goToPreviousSlide}
                disabled={activeIndex === 0}
                aria-label="Previous slide"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={goToNextSlide}
                disabled={activeIndex >= slideCount - 1}
                aria-label="Next slide"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => goToSlide(slideCount - 1)}
                disabled={activeIndex >= slideCount - 1}
                aria-label="Last slide"
              >
                <ChevronLast className="h-4 w-4" />
              </Button>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{Math.round(progress * 100)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Button variant="secondary" onClick={toggleTimer}>
                {timerStartedAt ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {timerStartedAt ? "Pause" : "Start"}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={resetTimer}
                aria-label="Reset timer"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={exportCaptions}
            >
              <Download className="h-4 w-4" />
              Captions
            </Button>
          </div>

          <Separator />

          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col gap-4 p-4">
              <PresentationRemotePairing
                session={remotePairing.session}
                controlUrl={remotePairing.controlUrl}
                status={remotePairing.status}
                error={remotePairing.error}
                onCopy={remotePairing.copyControlUrl}
              />

              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Speaker Notes</h2>
                  <Badge variant="outline">{activePage.name}</Badge>
                </div>
                <div className="min-h-40 whitespace-pre-wrap rounded-md border border-border bg-background p-3 text-sm leading-6">
                  {activePage.notes?.trim() ||
                    "No speaker notes for this slide."}
                </div>
              </section>

              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Audience</h2>
                  <Badge variant={publicShareId ? "secondary" : "outline"}>
                    {publicShareId ? "Live" : "No link"}
                  </Badge>
                </div>
                <PresentationAudienceResults
                  shareId={publicShareId}
                  pageId={activePage.id}
                  interaction={activePage.audienceInteraction}
                />
              </section>

              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Next Slide</h2>
                  {nextPage ? (
                    <Badge variant="outline">{nextPage.name}</Badge>
                  ) : (
                    <Badge variant="secondary">End</Badge>
                  )}
                </div>
                {nextPage ? (
                  <ScaledPagePreview
                    className="h-56 bg-muted p-2"
                    document={document}
                    page={nextPage}
                  />
                ) : (
                  <div className="grid h-56 place-items-center rounded-md border border-dashed border-border bg-muted text-sm text-muted-foreground">
                    Final slide
                  </div>
                )}
              </section>
            </div>
          </ScrollArea>
        </aside>
      </section>
    </main>
  );
}

function SlideRail({
  pages,
  activeIndex,
  onSelectSlide,
}: {
  pages: DesignPage[];
  activeIndex: number;
  onSelectSlide: (index: number) => void;
}) {
  return (
    <ScrollArea
      className="rounded-md border border-border bg-card"
      showHorizontalScrollBar
    >
      <div className="flex gap-2 p-2">
        {pages.map((page, index) => (
          <button
            key={page.id}
            type="button"
            className={cn(
              "flex h-16 min-w-32 items-center gap-2 rounded-md border px-3 text-left transition",
              index === activeIndex
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background hover:bg-accent",
            )}
            onClick={() => onSelectSlide(index)}
          >
            <span className="text-sm font-semibold">{index + 1}</span>
            <span className="min-w-0 truncate text-xs">{page.name}</span>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}

function ScaledPagePreview({
  className,
  document,
  page,
  transition = "none",
}: {
  className?: string;
  document: DesignDocument;
  page: DesignPage;
  transition?: PageTransition;
}) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const pageSize = getPageDimensions(document, page);
  const visibleElements = useMemo(
    () => page.elements.filter((element) => !element.hidden),
    [page.elements],
  );

  useEffect(() => {
    const frame = frameRef.current;

    if (!frame) return;

    function updateScale() {
      const frameNode = frameRef.current;

      if (!frameNode) return;

      const rect = frameNode.getBoundingClientRect();
      const nextScale = Math.min(
        rect.width / pageSize.width,
        rect.height / pageSize.height,
      );

      setScale(Number.isFinite(nextScale) ? Math.max(0.05, nextScale) : 1);
    }

    const observer = new ResizeObserver(updateScale);
    observer.observe(frame);
    updateScale();

    return () => observer.disconnect();
  }, [pageSize.height, pageSize.width]);

  return (
    <div
      ref={frameRef}
      className={cn(
        "relative grid min-h-0 place-items-center overflow-hidden rounded-md border border-border",
        className,
      )}
    >
      <div
        className="shrink-0 shadow-2xl"
        style={{
          width: pageSize.width * scale,
          height: pageSize.height * scale,
          animation: getPresentationTransitionAnimation(transition),
        }}
      >
        <div
          className="relative overflow-hidden"
          style={{
            width: pageSize.width,
            height: pageSize.height,
            background: page.background,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {visibleElements.map((element) => (
            <PositionedElement
              key={element.id}
              element={element}
              pageElements={page.elements}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const presentationTransitionStyles = `
@keyframes essence-presentation-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes essence-presentation-slide {
  from { opacity: 0; transform: translateX(28px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes essence-presentation-zoom {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}
`;

function getPresentationTransitionAnimation(transition: PageTransition) {
  if (transition === "fade") return "essence-presentation-fade 240ms ease-out";
  if (transition === "slide")
    return "essence-presentation-slide 260ms ease-out";
  if (transition === "zoom") return "essence-presentation-zoom 260ms ease-out";

  return undefined;
}

function PositionedElement({
  element,
  pageElements,
}: {
  element: DesignElement;
  pageElements: readonly DesignElement[];
}) {
  return (
    <div
      className="absolute"
      style={{
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        transform: `rotate(${element.rotation}deg)`,
        transformOrigin: "center",
        pointerEvents: "none",
      }}
    >
      <ElementRenderer element={element} pageElements={pageElements} />
    </div>
  );
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

function formatElapsedTime(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const segments = hours > 0 ? [hours, minutes, seconds] : [minutes, seconds];

  return segments.map((segment) => String(segment).padStart(2, "0")).join(":");
}
