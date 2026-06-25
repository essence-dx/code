"use client";

import {
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  Lock,
  Plus,
  Search,
  Trash2,
  Unlock,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { DesignLayer, DesignPage } from "@/features/editor/types";
import { cn } from "@/lib/utils";

type LayersPanelProps = {
  pages: DesignPage[];
  activePageId: string;
  layers: DesignLayer[];
  selectedLayerId: string | null;
  selectedLayerIds: string[];
  onSelectPage: (pageId: string) => void;
  onRenamePage: (pageId: string, name: string) => void;
  onMovePage: (pageId: string, direction: "up" | "down") => void;
  onAddPage: () => void;
  onDuplicatePage: () => void;
  onDeletePage: () => void;
  onSelectLayer: (layerId: string) => void;
  onSelectLayers: (layerIds: string[]) => void;
  onUpdateLayer: (layerId: string, patch: Partial<DesignLayer>) => void;
};

export function LayersPanel({
  pages,
  activePageId,
  layers,
  selectedLayerId,
  selectedLayerIds,
  onSelectPage,
  onRenamePage,
  onMovePage,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
  onSelectLayer,
  onSelectLayers,
  onUpdateLayer,
}: LayersPanelProps) {
  const [renamingLayerId, setRenamingLayerId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [layerSearch, setLayerSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [renamingPageId, setRenamingPageId] = useState<string | null>(null);
  const [draftPageName, setDraftPageName] = useState("");
  const pageRenameInputRef = useRef<HTMLInputElement>(null);
  const activePageIndex = pages.findIndex((page) => page.id === activePageId);
  const activePage = pages[activePageIndex] ?? pages[0] ?? null;
  const canMoveActivePageUp = activePageIndex > 0;
  const canMoveActivePageDown =
    activePageIndex >= 0 && activePageIndex < pages.length - 1;
  const layerSearchQuery = layerSearch.trim().toLowerCase();
  const filteredLayers = useMemo(() => {
    const orderedLayers = [...layers].reverse();

    if (!layerSearchQuery) {
      return orderedLayers;
    }

    return orderedLayers.filter((layer) =>
      getLayerSearchText(layer).includes(layerSearchQuery),
    );
  }, [layers, layerSearchQuery]);

  useEffect(() => {
    if (!renamingLayerId) {
      return;
    }

    renameInputRef.current?.focus();
    renameInputRef.current?.select();
  }, [renamingLayerId]);

  useEffect(() => {
    if (!renamingPageId) {
      return;
    }

    pageRenameInputRef.current?.focus();
    pageRenameInputRef.current?.select();
  }, [renamingPageId]);

  function startRename(layer: DesignLayer) {
    setRenamingLayerId(layer.id);
    setDraftName(layer.name || layer.type);
    onSelectLayer(layer.id);
  }

  function commitRename(layer: DesignLayer) {
    const nextName = draftName.trim();

    if (nextName && nextName !== layer.name) {
      onUpdateLayer(layer.id, { name: nextName });
    }

    setRenamingLayerId(null);
  }

  function cancelRename() {
    setRenamingLayerId(null);
    setDraftName("");
  }

  function startPageRename(page: DesignPage) {
    setRenamingPageId(page.id);
    setDraftPageName(page.name);
    onSelectPage(page.id);
  }

  function commitPageRename(page: DesignPage) {
    const nextName = draftPageName.trim();

    if (nextName && nextName !== page.name) {
      onRenamePage(page.id, nextName);
    }

    setRenamingPageId(null);
  }

  function cancelPageRename() {
    setRenamingPageId(null);
    setDraftPageName("");
  }

  function handleRowKeyDown(
    event: KeyboardEvent<HTMLDivElement>,
    layer: DesignLayer,
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      onSelectLayer(layer.id);
    }

    if (event.key === "F2") {
      event.preventDefault();
      startRename(layer);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border p-2">
        <div className="mb-2 flex h-7 items-center justify-between">
          <span className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Pages
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={!canMoveActivePageUp}
              aria-label="Move active page up"
              onClick={() => onMovePage(activePageId, "up")}
            >
              <ArrowUp className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={!canMoveActivePageDown}
              aria-label="Move active page down"
              onClick={() => onMovePage(activePageId, "down")}
            >
              <ArrowDown className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Add page"
              onClick={onAddPage}
            >
              <Plus className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Duplicate active page"
              onClick={onDuplicatePage}
            >
              <Copy className="size-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  disabled={pages.length <= 1}
                  aria-label="Delete active page"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete page?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {activePage
                      ? `"${activePage.name}" and its ${activePage.layers.length} layers will be removed from this file.`
                      : "The active page will be removed from this file."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={onDeletePage}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <div className="space-y-1">
          {pages.map((page) => (
            <div
              key={page.id}
              role="button"
              tabIndex={0}
              className={cn(
                "flex h-8 w-full items-center justify-between gap-2 rounded-md px-2 text-left text-sm",
                page.id === activePageId
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              onClick={() => {
                if (!renamingPageId) {
                  onSelectPage(page.id);
                }
              }}
              onDoubleClick={() => startPageRename(page)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onSelectPage(page.id);
                }

                if (event.key === "F2") {
                  event.preventDefault();
                  startPageRename(page);
                }
              }}
            >
              {renamingPageId === page.id ? (
                <Input
                  ref={pageRenameInputRef}
                  value={draftPageName}
                  className="h-7 min-w-0 flex-1 rounded-md px-2 text-sm"
                  onClick={(event) => event.stopPropagation()}
                  onDoubleClick={(event) => event.stopPropagation()}
                  onChange={(event) => setDraftPageName(event.target.value)}
                  onBlur={() => commitPageRename(page)}
                  onKeyDown={(event) => {
                    event.stopPropagation();

                    if (event.key === "Enter") {
                      event.preventDefault();
                      commitPageRename(page);
                    }

                    if (event.key === "Escape") {
                      event.preventDefault();
                      cancelPageRename();
                    }
                  }}
                />
              ) : (
                <span className="min-w-0 flex-1 truncate">{page.name}</span>
              )}
              <span className="font-mono text-[10px] text-muted-foreground">
                {page.layers.length}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex h-10 items-center px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span>Layers</span>
        <span className="ml-auto font-mono text-[10px]">
          {filteredLayers.length}/{layers.length}
        </span>
      </div>
      <div className="px-2 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            value={layerSearch}
            placeholder="Search layers"
            className="h-8 pl-8 pr-8 text-sm"
            onChange={(event) => setLayerSearch(event.target.value)}
            onKeyDown={(event) => {
              event.stopPropagation();

              if (event.key === "Escape") {
                setLayerSearch("");
                searchInputRef.current?.blur();
              }
            }}
          />
          {layerSearch ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0.5 top-1/2 size-7 -translate-y-1/2"
              aria-label="Clear layer search"
              onClick={() => {
                setLayerSearch("");
                searchInputRef.current?.focus();
              }}
            >
              <X className="size-3.5" />
            </Button>
          ) : null}
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-1 p-2">
          {filteredLayers.map((layer) => (
            <div
              key={layer.id}
              role="button"
              tabIndex={0}
              className={cn(
                "group flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm",
                selectedLayerIds.includes(layer.id)
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                selectedLayerId === layer.id && "ring-1 ring-primary/40",
              )}
              onClick={(event) => {
                if (renamingLayerId) {
                  return;
                }

                if (event.shiftKey) {
                  onSelectLayers(
                    selectedLayerIds.includes(layer.id)
                      ? selectedLayerIds.filter((id) => id !== layer.id)
                      : [...selectedLayerIds, layer.id],
                  );
                  return;
                }

                onSelectLayer(layer.id);
              }}
              onDoubleClick={() => startRename(layer)}
              onKeyDown={(event) => handleRowKeyDown(event, layer)}
            >
              {renamingLayerId === layer.id ? (
                <Input
                  ref={renameInputRef}
                  value={draftName}
                  className="h-7 min-w-0 flex-1 rounded-md px-2 text-sm"
                  onClick={(event) => event.stopPropagation()}
                  onDoubleClick={(event) => event.stopPropagation()}
                  onChange={(event) => setDraftName(event.target.value)}
                  onBlur={() => commitRename(layer)}
                  onKeyDown={(event) => {
                    event.stopPropagation();

                    if (event.key === "Enter") {
                      event.preventDefault();
                      commitRename(layer);
                    }

                    if (event.key === "Escape") {
                      event.preventDefault();
                      cancelRename();
                    }
                  }}
                />
              ) : (
                <span className="min-w-0 flex-1 truncate">
                  {layer.name || layer.type}
                </span>
              )}
              {layer.groupId ? (
                <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  Group
                </span>
              ) : null}
              {layer.componentId ? (
                <span className="rounded-sm bg-primary/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-primary">
                  Instance
                </span>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 opacity-70"
                onClick={(event) => {
                  event.stopPropagation();
                  onUpdateLayer(layer.id, { visible: !layer.visible });
                }}
                aria-label={layer.visible ? "Hide layer" : "Show layer"}
              >
                {layer.visible ? (
                  <Eye className="size-3.5" />
                ) : (
                  <EyeOff className="size-3.5" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 opacity-70"
                onClick={(event) => {
                  event.stopPropagation();
                  onUpdateLayer(layer.id, { locked: !layer.locked });
                }}
                aria-label={layer.locked ? "Unlock layer" : "Lock layer"}
              >
                {layer.locked ? (
                  <Lock className="size-3.5" />
                ) : (
                  <Unlock className="size-3.5" />
                )}
              </Button>
            </div>
          ))}
          {filteredLayers.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
              {layers.length === 0 ? "No layers on this page." : "No matching layers."}
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
}

function getLayerSearchText(layer: DesignLayer) {
  return [
    layer.name,
    layer.type,
    layer.groupId ? "group" : "",
    layer.componentId ? "component instance asset" : "",
    layer.visible ? "visible" : "hidden",
    layer.locked ? "locked" : "unlocked",
    layer.readyForDev ? "ready for dev handoff" : "",
    layer.prototype ? "prototype hotspot interaction link" : "",
  ]
    .join(" ")
    .toLowerCase();
}
