"use client"

import { FormEvent, useState } from "react"
import { KeyRound, LockKeyhole } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { unlockSharedDeck } from "../cloud-api"
import type { Deck } from "../types"
import { SharedDeckViewer } from "./shared-deck-viewer"

type SharedDeckAccessGateProps = {
  token: string
}

type UnlockState = "idle" | "working" | "error"

export function SharedDeckAccessGate({ token }: SharedDeckAccessGateProps) {
  const [accessCode, setAccessCode] = useState("")
  const [deck, setDeck] = useState<Deck | null>(null)
  const [allowDownloads, setAllowDownloads] = useState(false)
  const [state, setState] = useState<UnlockState>("idle")
  const [message, setMessage] = useState("")

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setState("working")
    setMessage("")
    try {
      const result = await unlockSharedDeck(token, accessCode)
      setAllowDownloads(result.allowDownloads)
      setDeck(result.deck)
      setState("idle")
    } catch (error) {
      setState("error")
      setMessage(
        error instanceof Error ? error.message : "Could not open this deck",
      )
    }
  }

  if (deck) {
    return <SharedDeckViewer allowDownloads={allowDownloads} deck={deck} />
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
      <form
        className="grid w-full max-w-sm gap-5 rounded-md border bg-card p-5 shadow-sm"
        onSubmit={(event) => void unlock(event)}
      >
        <div className="grid gap-2">
          <Badge variant="secondary" className="w-fit">
            <LockKeyhole className="size-3" />
            Protected share
          </Badge>
          <div className="grid gap-1">
            <h1 className="text-xl font-semibold">Enter access code</h1>
            <p className="text-sm text-muted-foreground">
              This deck owner requires a code before the deck opens.
            </p>
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="share-access-code">Access code</Label>
          <Input
            id="share-access-code"
            autoComplete="one-time-code"
            className="font-mono uppercase"
            disabled={state === "working"}
            value={accessCode}
            onChange={(event) => setAccessCode(event.target.value)}
          />
        </div>
        {message ? (
          <p
            className={
              state === "error"
                ? "text-sm text-destructive"
                : "text-sm text-muted-foreground"
            }
          >
            {message}
          </p>
        ) : null}
        <Button
          type="submit"
          disabled={state === "working" || !accessCode.trim()}
        >
          <KeyRound className="size-4" />
          Open deck
        </Button>
      </form>
    </main>
  )
}
