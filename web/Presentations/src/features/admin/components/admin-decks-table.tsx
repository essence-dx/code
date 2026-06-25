"use client"

import { useMemo, useState } from "react"
import { FilePenLine, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { AdminDeckRow } from "@/features/admin/types"

type AdminDecksTableProps = {
  decks: AdminDeckRow[]
  onRefresh: () => void
}

export function AdminDecksTable({ decks, onRefresh }: AdminDecksTableProps) {
  const [query, setQuery] = useState("")
  const [busyDeckId, setBusyDeckId] = useState<string | null>(null)
  const filteredDecks = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    if (!normalized) return decks

    return decks.filter(
      (deck) =>
        deck.title.toLowerCase().includes(normalized) ||
        deck.ownerEmail?.toLowerCase().includes(normalized) ||
        deck.ownerName?.toLowerCase().includes(normalized),
    )
  }, [decks, query])

  async function deleteDeck(deckId: string) {
    setBusyDeckId(deckId)
    await fetch("/api/admin/decks", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deckId }),
    })
    setBusyDeckId(null)
    onRefresh()
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          className="h-8 max-w-sm"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search decks"
        />
        <Badge variant="outline">{filteredDecks.length} decks</Badge>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Deck</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Slides</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredDecks.map((deck) => (
            <TableRow key={deck.id}>
              <TableCell>
                <div className="grid gap-0.5">
                  <span className="font-medium">{deck.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {deck.theme}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="grid gap-0.5">
                  <span>{deck.ownerName || "No owner"}</span>
                  <span className="text-xs text-muted-foreground">
                    {deck.ownerEmail || "Local or deleted account"}
                  </span>
                </div>
              </TableCell>
              <TableCell>{deck.slideCount}</TableCell>
              <TableCell>
                {new Intl.DateTimeFormat(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(deck.updatedAt))}
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    title="Open editor"
                    aria-label="Open editor"
                    onClick={() => {
                      window.location.href = "/editor"
                    }}
                  >
                    <FilePenLine className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    title="Delete deck"
                    aria-label="Delete deck"
                    disabled={busyDeckId === deck.id}
                    onClick={() => void deleteDeck(deck.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
