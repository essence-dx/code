"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  MousePointerClick,
  RotateCcw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  PrototypePreviewHotspot,
  PrototypePreviewModel,
} from "@/features/editor/prototype-preview";

type PrototypePreviewProps = {
  fileName: string;
  model: PrototypePreviewModel;
};

export function PrototypePreview({ fileName, model }: PrototypePreviewProps) {
  const [currentPageId, setCurrentPageId] = useState(model.startPageId);
  const [history, setHistory] = useState<string[]>([]);
  const [overlay, setOverlay] = useState<OverlayState | null>(null);
  const [lastTransition, setLastTransition] = useState<PreviewTransition>({
    transition: "instant",
    durationMs: 0,
    deviceFrame: "none",
    smartAnimate: false,
  });
  const viewportRef = useRef<HTMLElement>(null);
  const currentPage = useMemo(
    () =>
      model.pages.find((page) => page.id === currentPageId) ?? model.pages[0],
    [currentPageId, model.pages],
  );
  const canGoBack = history.length > 0;
  const brokenHotspotCount =
    currentPage?.hotspots.filter((hotspot) => !hotspot.targetExists).length ?? 0;
  const overlayPage = overlay
    ? model.pages.find((page) => page.id === overlay.pageId)
    : undefined;

  const goToPage = useCallback(
    (targetPageId: string) => {
      if (targetPageId === currentPageId) {
        return;
      }

      setLastTransition({
        transition: "instant",
        durationMs: 0,
        deviceFrame: "none",
        smartAnimate: false,
      });
      setOverlay(null);
      setHistory((items) => [...items, currentPageId].slice(-30));
      setCurrentPageId(targetPageId);
    },
    [currentPageId],
  );

  const followHotspot = useCallback(
    (hotspot: PrototypePreviewHotspot) => {
      if (!hotspot.targetExists || hotspot.targetPageId === currentPageId) {
        return;
      }

      if (hotspot.action === "overlay") {
        setOverlay({
          pageId: hotspot.targetPageId,
          hotspot,
        });
        applyScrollBehavior(viewportRef.current, hotspot);
        return;
      }

      setLastTransition({
        transition: hotspot.transition,
        durationMs: hotspot.durationMs,
        deviceFrame: hotspot.deviceFrame,
        smartAnimate: hotspot.smartAnimate,
      });
      setOverlay(null);
      setHistory((items) => [...items, currentPageId].slice(-30));
      setCurrentPageId(hotspot.targetPageId);
      applyScrollBehavior(viewportRef.current, hotspot);
    },
    [currentPageId],
  );

  const goBack = useCallback(() => {
    setHistory((items) => {
      const previousPageId = items.at(-1);

      if (!previousPageId) {
        return items;
      }

      setLastTransition({
        transition: "instant",
        durationMs: 0,
        deviceFrame: "none",
        smartAnimate: false,
      });
      setOverlay(null);
      setCurrentPageId(previousPageId);
      return items.slice(0, -1);
    });
  }, []);

  const restart = useCallback(() => {
    setLastTransition({
      transition: "instant",
      durationMs: 0,
      deviceFrame: "none",
      smartAnimate: false,
    });
    setOverlay(null);
    setCurrentPageId(model.startPageId);
    setHistory([]);
  }, [model.startPageId]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft" || event.key === "Backspace") {
        event.preventDefault();
        goBack();
      }

      if (event.key === "Home") {
        event.preventDefault();
        restart();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goBack, restart]);

  if (!currentPage) {
    return (
      <main className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
        <div className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
          This shared file has no pages to preview.
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen grid-rows-[auto_minmax(0,1fr)] bg-background text-foreground">
      <header className="flex h-14 items-center justify-between gap-4 border-b border-border bg-card px-4">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-medium">{fileName}</h1>
          <p className="truncate text-xs text-muted-foreground">
            {currentPage.name}
            {currentPage.prototypeStart ? " / start" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!canGoBack}
            onClick={goBack}
          >
            <ChevronLeft className="size-4" />
            Back
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={restart}
          >
            <RotateCcw className="size-4" />
            Restart
          </Button>
          <Button asChild type="button" size="sm" variant="outline">
            <a href="../">
              <ArrowLeft className="size-4" />
              Inspect
            </a>
          </Button>
        </div>
      </header>
      <section
        ref={viewportRef}
        className={cn(
          "grid min-h-0 p-5",
          overlay?.hotspot.scrollBehavior === "lock"
            ? "overflow-hidden"
            : "overflow-auto",
        )}
      >
        <div className="m-auto w-full max-w-5xl">
          <div
            className={cn(
              "relative mx-auto overflow-hidden rounded-md border border-border bg-card shadow-2xl shadow-black/30",
              getDeviceFrameClass(lastTransition.deviceFrame),
            )}
          >
            <div
              key={currentPage.id}
              className={cn(
                "relative [&_svg]:block [&_svg]:h-full [&_svg]:w-full",
                getTransitionClass(lastTransition.transition),
                lastTransition.smartAnimate &&
                  "transition-[border-radius,transform,opacity] ease-out",
              )}
              style={{
                aspectRatio: `${currentPage.width} / ${currentPage.height}`,
                animationDuration: `${Math.max(0, lastTransition.durationMs)}ms`,
              }}
            >
              <div dangerouslySetInnerHTML={{ __html: currentPage.svg }} />
              {currentPage.hotspots.map((hotspot) => (
                <HotspotButton
                  key={hotspot.id}
                  hotspot={hotspot}
                  onNavigate={followHotspot}
                />
              ))}
            </div>
            {overlay && overlayPage ? (
              <PrototypeOverlay
                page={overlayPage}
                hotspot={overlay.hotspot}
                onClose={() => setOverlay(null)}
              />
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <MousePointerClick className="size-3.5" />
              <span>{currentPage.hotspots.length} clickable hotspots</span>
              {brokenHotspotCount > 0 ? (
                <>
                  <span>/</span>
                  <span>{brokenHotspotCount} broken</span>
                </>
              ) : null}
              <span>/</span>
              <span>{model.pages.length} pages</span>
            </div>
            <div className="flex max-w-full flex-wrap justify-end gap-1.5">
              {model.pages.map((page) => (
                <Button
                  key={page.id}
                  type="button"
                  size="sm"
                  variant={page.id === currentPage.id ? "secondary" : "outline"}
                  className="h-7 max-w-40 truncate px-2 text-xs"
                  onClick={() => goToPage(page.id)}
                >
                  {page.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

type PreviewTransition = {
  transition: string;
  durationMs: number;
  deviceFrame: string;
  smartAnimate: boolean;
};

type OverlayState = {
  pageId: string;
  hotspot: PrototypePreviewHotspot;
};

function HotspotButton({
  hotspot,
  onNavigate,
}: {
  hotspot: PrototypePreviewHotspot;
  onNavigate: (hotspot: PrototypePreviewHotspot) => void;
}) {
  return (
    <button
      type="button"
      disabled={!hotspot.targetExists}
      className={cn(
        "absolute rounded-sm border outline-none transition focus-visible:ring-2",
        hotspot.targetExists
          ? "border-cyan-300/70 bg-cyan-300/10 hover:bg-cyan-300/25 focus-visible:ring-cyan-200"
          : "cursor-not-allowed border-red-300/70 bg-red-400/15 focus-visible:ring-red-200",
      )}
      style={{
        left: `${hotspot.left}%`,
        top: `${hotspot.top}%`,
        width: `${hotspot.width}%`,
        height: `${hotspot.height}%`,
      }}
      title={
        hotspot.targetExists
          ? `${hotspot.name} -> ${hotspot.targetPageName}`
          : `${hotspot.name} has a missing target page`
      }
      aria-label={`${hotspot.name} opens ${hotspot.targetPageName}`}
      onClick={() => onNavigate(hotspot)}
    >
      <span className="sr-only">
        {hotspot.trigger} to {hotspot.targetPageName}
      </span>
    </button>
  );
}

function PrototypeOverlay({
  page,
  hotspot,
  onClose,
}: {
  page: PrototypePreviewModel["pages"][number];
  hotspot: PrototypePreviewHotspot;
  onClose: () => void;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-30 grid bg-black/50 p-5 backdrop-blur-sm",
        getOverlayPlacementClass(hotspot.overlayPosition),
      )}
      onClick={() => {
        if (hotspot.closeOnOutside) {
          onClose();
        }
      }}
    >
      <div
        className={cn(
          "relative max-h-full max-w-full overflow-hidden rounded-md border border-border bg-card shadow-2xl",
          getDeviceFrameClass(hotspot.deviceFrame),
        )}
        style={{
          aspectRatio: `${page.width} / ${page.height}`,
          width: getOverlayWidth(hotspot.overlayPosition),
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="h-full w-full [&_svg]:block [&_svg]:h-full [&_svg]:w-full">
          <div dangerouslySetInnerHTML={{ __html: page.svg }} />
        </div>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="absolute right-2 top-2 size-8"
          aria-label="Close overlay"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function getTransitionClass(transition: string) {
  if (transition === "dissolve") {
    return "animate-[prototype-dissolve_ease-out_both]";
  }

  if (transition === "slide-left") {
    return "animate-[prototype-slide-left_ease-out_both]";
  }

  if (transition === "slide-right") {
    return "animate-[prototype-slide-right_ease-out_both]";
  }

  if (transition === "slide-up") {
    return "animate-[prototype-slide-up_ease-out_both]";
  }

  if (transition === "slide-down") {
    return "animate-[prototype-slide-down_ease-out_both]";
  }

  return "";
}

function getOverlayPlacementClass(position: string) {
  if (position === "top") {
    return "items-start justify-items-center";
  }

  if (position === "bottom") {
    return "items-end justify-items-center";
  }

  if (position === "left") {
    return "items-center justify-items-start";
  }

  if (position === "right") {
    return "items-center justify-items-end";
  }

  return "place-items-center";
}

function getOverlayWidth(position: string) {
  if (position === "left" || position === "right") {
    return "min(34rem, 82vw)";
  }

  return "min(48rem, 88vw)";
}

function getDeviceFrameClass(deviceFrame: string) {
  if (deviceFrame === "phone") {
    return "max-w-sm rounded-[2rem] border-8 border-zinc-900";
  }

  if (deviceFrame === "tablet") {
    return "max-w-3xl rounded-[1.5rem] border-[10px] border-zinc-900";
  }

  if (deviceFrame === "desktop") {
    return "max-w-6xl rounded-lg border-4 border-zinc-800";
  }

  return "";
}

function applyScrollBehavior(
  viewport: HTMLElement | null,
  hotspot: PrototypePreviewHotspot,
) {
  if (!viewport || hotspot.scrollBehavior === "preserve") {
    return;
  }

  window.setTimeout(() => {
    viewport.scrollTo({ left: 0, top: 0, behavior: "smooth" });
  }, 0);
}
