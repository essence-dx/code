import { Pin, PinOff, Trash2, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { CloudDeckSummary } from "../cloud-api"
import { cloudSyncTestIds } from "../cloud-sync-test-ids"

type CloudDeckRowProps = {
  deck: CloudDeckSummary
  disabled?: boolean
  pinned?: boolean
  muted?: boolean
  onDelete?: (deckId: string) => void
  onForget?: (deckId: string) => void
  onOpen: (deckId: string) => void
  onTogglePin?: (deckId: string) => void
}

export function CloudDeckRow({
  deck,
  disabled,
  pinned,
  muted,
  onDelete,
  onForget,
  onOpen,
  onTogglePin,
}: CloudDeckRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md border p-3",
        muted ? "bg-muted/30" : "bg-background",
      )}
      data-deck-id={deck.id}
      data-testid={cloudSyncTestIds.deckRow}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{deck.title}</div>
        <div className="text-xs text-muted-foreground">
          {deck.slideCount} slides - {new Date(deck.updatedAt).toLocaleString()}
        </div>
      </div>
      {deck.accessRole && deck.accessRole !== "owner" ? (
        <Badge variant="outline">{deck.accessRole}</Badge>
      ) : null}
      {onTogglePin ? (
        <Button
          aria-label={`${pinned ? "Unpin" : "Pin"} ${deck.title}`}
          title={`${pinned ? "Unpin" : "Pin"} ${deck.title}`}
          type="button"
          variant={pinned ? "secondary" : "ghost"}
          size="icon-sm"
          disabled={disabled}
          data-testid={cloudSyncTestIds.deckPinButton}
          onClick={() => onTogglePin(deck.id)}
        >
          {pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
        </Button>
      ) : null}
      <Button
        type="button"
        size="sm"
        disabled={disabled}
        data-testid={cloudSyncTestIds.deckOpenButton}
        onClick={() => onOpen(deck.id)}
      >
        Open
      </Button>
      {onDelete ? (
        <Button
          aria-label={`Delete ${deck.title}`}
          title={`Delete ${deck.title}`}
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled}
          data-testid={cloudSyncTestIds.deckDeleteButton}
          onClick={() => onDelete(deck.id)}
        >
          <Trash2 className="size-4" />
        </Button>
      ) : null}
      {onForget ? (
        <Button
          aria-label={`Remove ${deck.title} from recent decks`}
          title={`Remove ${deck.title} from recent decks`}
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled}
          data-testid={cloudSyncTestIds.deckForgetButton}
          onClick={() => onForget(deck.id)}
        >
          <X className="size-4" />
        </Button>
      ) : null}
    </div>
  )
}
