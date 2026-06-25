"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Link2,
  Plus,
  RefreshCw,
  Share2,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

import {
  createCloudDeckShare,
  deleteCloudDeckCollaborator,
  deleteCloudDeckShare,
  listCloudDeckCollaborators,
  listCloudDeckShares,
  updateCloudDeckShare,
  upsertCloudDeckCollaborator,
  type CloudDeckCollaboratorSummary,
  type CloudDeckShareSummary,
} from "../cloud-api"
import { presentationSmokeTestIds } from "../presentation-smoke-test-ids"
import { DeckShareRow } from "./deck-share-row"

type ShareState = "idle" | "working" | "error"

type DeckSharePanelProps = {
  deckId: string
  canShare: boolean
  disabled?: boolean
}

function shareLink(token: string) {
  if (typeof window === "undefined") return `/share/${token}`
  return `${window.location.origin}/share/${token}`
}

export function DeckSharePanel({
  deckId,
  canShare,
  disabled,
}: DeckSharePanelProps) {
  const [open, setOpen] = useState(false)
  const [shares, setShares] = useState<CloudDeckShareSummary[]>([])
  const [collaborators, setCollaborators] = useState<
    CloudDeckCollaboratorSummary[]
  >([])
  const [collaboratorEmail, setCollaboratorEmail] = useState("")
  const [collaboratorRole, setCollaboratorRole] =
    useState<CloudDeckCollaboratorSummary["role"]>("viewer")
  const [state, setState] = useState<ShareState>("idle")
  const [message, setMessage] = useState("")
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [generatedCodes, setGeneratedCodes] = useState<Record<string, string>>(
    {},
  )

  const activeShares = useMemo(
    () => shares.filter((share) => share.enabled && !share.expired),
    [shares],
  )

  async function refreshAccess() {
    if (!canShare) return

    setState("working")
    setMessage("")
    try {
      const [nextShares, nextCollaborators] = await Promise.all([
        listCloudDeckShares(deckId),
        listCloudDeckCollaborators(deckId),
      ])
      setShares(nextShares)
      setCollaborators(nextCollaborators)
      setState("idle")
    } catch (error) {
      setState("error")
      setMessage(
        error instanceof Error ? error.message : "Could not load sharing access",
      )
    }
  }

  async function createShare() {
    setState("working")
    setMessage("")
    try {
      const share = await createCloudDeckShare(deckId)
      setShares((items) => {
        const existing = items.filter((item) => item.id !== share.id)
        return [share, ...existing]
      })
      setState("idle")
      setMessage("Share link ready")
    } catch (error) {
      setState("error")
      setMessage(error instanceof Error ? error.message : "Could not create link")
    }
  }

  async function setShareEnabled(shareId: string, enabled: boolean) {
    setState("working")
    setMessage("")
    try {
      const result = await updateCloudDeckShare(shareId, { enabled })
      setShares((items) =>
        items.map((item) => (item.id === shareId ? result.share : item)),
      )
      setState("idle")
    } catch (error) {
      setState("error")
      setMessage(error instanceof Error ? error.message : "Could not update link")
    }
  }

  async function setShareExpiry(shareId: string, expiresAt: string | null) {
    setState("working")
    setMessage("")
    try {
      const result = await updateCloudDeckShare(shareId, { expiresAt })
      setShares((items) =>
        items.map((item) => (item.id === shareId ? result.share : item)),
      )
      setState("idle")
      setMessage(expiresAt ? "Expiry updated" : "Expiry removed")
    } catch (error) {
      setState("error")
      setMessage(error instanceof Error ? error.message : "Could not update link")
    }
  }

  async function setShareDownloads(shareId: string, allowDownloads: boolean) {
    setState("working")
    setMessage("")
    try {
      const result = await updateCloudDeckShare(shareId, { allowDownloads })
      setShares((items) =>
        items.map((item) => (item.id === shareId ? result.share : item)),
      )
      setState("idle")
      setMessage(allowDownloads ? "Downloads allowed" : "Downloads blocked")
    } catch (error) {
      setState("error")
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not update download access",
      )
    }
  }

  async function removeShare(shareId: string) {
    setState("working")
    setMessage("")
    try {
      await deleteCloudDeckShare(shareId)
      setShares((items) => items.filter((item) => item.id !== shareId))
      setGeneratedCodes((items) => {
        const next = { ...items }
        delete next[shareId]
        return next
      })
      setState("idle")
    } catch (error) {
      setState("error")
      setMessage(error instanceof Error ? error.message : "Could not delete link")
    }
  }

  async function copyShare(token: string) {
    try {
      await navigator.clipboard.writeText(shareLink(token))
      setCopiedToken(token)
      window.setTimeout(() => setCopiedToken(null), 1600)
    } catch {
      setMessage("Copy failed")
    }
  }

  async function generateAccessCode(shareId: string) {
    setState("working")
    setMessage("")
    try {
      const result = await updateCloudDeckShare(shareId, {
        accessCodeAction: "generate",
      })
      setShares((items) =>
        items.map((item) => (item.id === shareId ? result.share : item)),
      )
      const accessCode = result.accessCode
      if (accessCode) {
        setGeneratedCodes((items) => ({
          ...items,
          [shareId]: accessCode,
        }))
      }
      setState("idle")
      setMessage("Access code generated")
    } catch (error) {
      setState("error")
      setMessage(
        error instanceof Error ? error.message : "Could not generate code",
      )
    }
  }

  async function clearAccessCode(shareId: string) {
    setState("working")
    setMessage("")
    try {
      const result = await updateCloudDeckShare(shareId, {
        accessCodeAction: "clear",
      })
      setShares((items) =>
        items.map((item) => (item.id === shareId ? result.share : item)),
      )
      setGeneratedCodes((items) => {
        const next = { ...items }
        delete next[shareId]
        return next
      })
      setState("idle")
      setMessage("Access code removed")
    } catch (error) {
      setState("error")
      setMessage(error instanceof Error ? error.message : "Could not clear code")
    }
  }

  async function copyAccessCode(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      setMessage("Access code copied")
    } catch {
      setMessage("Copy failed")
    }
  }

  async function saveCollaborator() {
    const email = collaboratorEmail.trim()
    if (!email) {
      setState("error")
      setMessage("Enter an email address")
      return
    }

    setState("working")
    setMessage("")
    try {
      const collaborator = await upsertCloudDeckCollaborator(deckId, {
        email,
        role: collaboratorRole,
      })
      setCollaborators((items) => [
        collaborator,
        ...items.filter((item) => item.id !== collaborator.id),
      ])
      setCollaboratorEmail("")
      setState("idle")
      setMessage(
        collaborator.status === "pending"
          ? "Invitation saved"
          : collaborator.role === "editor"
          ? "Editor access saved"
          : "Viewer access saved",
      )
    } catch (error) {
      setState("error")
      setMessage(
        error instanceof Error ? error.message : "Could not save collaborator",
      )
    }
  }

  async function removeCollaborator(collaboratorId: string) {
    setState("working")
    setMessage("")
    try {
      await deleteCloudDeckCollaborator(deckId, collaboratorId)
      setCollaborators((items) =>
        items.filter((item) => item.id !== collaboratorId),
      )
      setState("idle")
      setMessage("Collaborator removed")
    } catch (error) {
      setState("error")
      setMessage(
        error instanceof Error ? error.message : "Could not remove collaborator",
      )
    }
  }

  useEffect(() => {
    if (open && canShare) {
      void refreshAccess()
    }
  }, [open, canShare, deckId])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-testid={presentationSmokeTestIds.shareTrigger}
            disabled={disabled}
          />
        }
      >
        <Share2 className="size-4" />
        Share
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-2xl"
        data-testid={presentationSmokeTestIds.shareDialog}
      >
        <DialogHeader>
          <DialogTitle>Share deck</DialogTitle>
          <DialogDescription>
            Manage private collaborators and read-only links for this deck.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={collaborators.length ? "secondary" : "outline"}>
              <Users className="size-3" />
              {collaborators.length} collaborators
            </Badge>
            <Badge variant={activeShares.length ? "secondary" : "outline"}>
              <Link2 className="size-3" />
              {activeShares.length} active links
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canShare || state === "working"}
              onClick={() => void refreshAccess()}
            >
              <RefreshCw className="size-4" />
              Refresh
            </Button>
            <Button
              type="button"
              size="sm"
              data-testid={presentationSmokeTestIds.shareCreateLinkButton}
              disabled={!canShare || state === "working"}
              onClick={() => void createShare()}
            >
              <Plus className="size-4" />
              Create link
            </Button>
          </div>
        </div>
        {!canShare ? (
          <div className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">
            Save this deck before creating a share link.
          </div>
        ) : (
          <ScrollArea className="max-h-[30rem] rounded-md border">
            <div className="grid gap-4 p-3">
              <section className="grid gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-medium">Collaborators</h3>
                    <p className="text-xs text-muted-foreground">
                      Editor access can save and merge; viewer access can review.
                    </p>
                  </div>
                  <Badge variant="outline">
                    <Users className="size-3" />
                    Private
                  </Badge>
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <Input
                    type="email"
                    value={collaboratorEmail}
                    placeholder="person@example.com"
                    disabled={state === "working"}
                    onChange={(event) => setCollaboratorEmail(event.target.value)}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        collaboratorRole === "viewer" ? "secondary" : "outline"
                      }
                      disabled={state === "working"}
                      onClick={() => setCollaboratorRole("viewer")}
                    >
                      Viewer
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        collaboratorRole === "editor" ? "secondary" : "outline"
                      }
                      disabled={state === "working"}
                      onClick={() => setCollaboratorRole("editor")}
                    >
                      Editor
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={state === "working"}
                      onClick={() => void saveCollaborator()}
                    >
                      <UserPlus className="size-4" />
                      Add
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2">
                  {collaborators.map((collaborator) => (
                    <div
                      key={collaborator.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {collaborator.name}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {collaborator.email}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            collaborator.role === "editor"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {collaborator.role}
                        </Badge>
                        {collaborator.status === "pending" ? (
                          <Badge variant="outline">pending</Badge>
                        ) : null}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={state === "working"}
                          onClick={() => void removeCollaborator(collaborator.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {!collaborators.length ? (
                    <div className="rounded-md border border-dashed p-5 text-center text-sm text-muted-foreground">
                      No private collaborators yet.
                    </div>
                  ) : null}
                </div>
              </section>
              <Separator />
              <section className="grid gap-3">
                <div>
                  <h3 className="text-sm font-medium">Share links</h3>
                  <p className="text-xs text-muted-foreground">
                    Links are read-only and can be protected or disabled.
                  </p>
                </div>
                {shares.map((share) => {
                  const link = shareLink(share.token)

                  return (
                    <DeckShareRow
                      key={share.id}
                      copied={copiedToken === share.token}
                      disabled={state === "working"}
                      generatedAccessCode={generatedCodes[share.id]}
                      link={link}
                      share={share}
                      onAccessCodeClear={(shareId) =>
                        void clearAccessCode(shareId)
                      }
                      onAccessCodeCopy={(code) => void copyAccessCode(code)}
                      onAccessCodeGenerate={(shareId) =>
                        void generateAccessCode(shareId)
                      }
                      onCopy={(token) => void copyShare(token)}
                      onDelete={(shareId) => void removeShare(shareId)}
                      onDownloadsChange={(shareId, allowDownloads) =>
                        void setShareDownloads(shareId, allowDownloads)
                      }
                      onExpiryChange={(shareId, expiresAt) =>
                        void setShareExpiry(shareId, expiresAt)
                      }
                      onToggle={(shareId, enabled) =>
                        void setShareEnabled(shareId, enabled)
                      }
                    />
                  )
                })}
                {!shares.length ? (
                  <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No share links yet.
                  </div>
                ) : null}
              </section>
            </div>
          </ScrollArea>
        )}
        {message ? (
          <div
            className={
              state === "error"
                ? "text-xs text-destructive"
                : "text-xs text-muted-foreground"
            }
          >
            {message}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
