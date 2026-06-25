"use client"

import { Clock3, Copy, Download, Eye, KeyRound, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

import type { CloudDeckShareSummary } from "../cloud-api"
import { presentationSmokeTestIds } from "../presentation-smoke-test-ids"

type DeckShareRowProps = {
  copied: boolean
  disabled: boolean
  generatedAccessCode?: string
  link: string
  share: CloudDeckShareSummary
  onAccessCodeClear: (shareId: string) => void
  onAccessCodeCopy: (code: string) => void
  onAccessCodeGenerate: (shareId: string) => void
  onCopy: (token: string) => void
  onDelete: (shareId: string) => void
  onDownloadsChange: (shareId: string, allowDownloads: boolean) => void
  onExpiryChange: (shareId: string, expiresAt: string | null) => void
  onToggle: (shareId: string, enabled: boolean) => void
}

const expiryOptions = [
  { label: "Never", days: null },
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
] as const

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function formatOptionalDate(value: string | null) {
  return value ? formatDate(value) : "Not viewed yet"
}

function expiryLabel(share: CloudDeckShareSummary) {
  if (share.expired) return "Expired"
  return share.expiresAt ? `Expires ${formatDate(share.expiresAt)}` : "No expiry"
}

function statusVariant(share: CloudDeckShareSummary) {
  if (share.expired) return "destructive"
  return share.enabled ? "secondary" : "outline"
}

function statusLabel(share: CloudDeckShareSummary) {
  if (share.expired) return "Expired"
  return share.enabled ? "Active" : "Off"
}

function expiryDate(days: number | null) {
  if (days === null) return null

  const next = new Date()
  next.setDate(next.getDate() + days)
  return next.toISOString()
}

export function DeckShareRow({
  copied,
  disabled,
  generatedAccessCode,
  link,
  share,
  onAccessCodeClear,
  onAccessCodeCopy,
  onAccessCodeGenerate,
  onCopy,
  onDelete,
  onDownloadsChange,
  onExpiryChange,
  onToggle,
}: DeckShareRowProps) {
  return (
    <div className="grid gap-3 rounded-md border bg-background p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="grid gap-1">
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
            <Badge variant={statusVariant(share)}>{statusLabel(share)}</Badge>
            View only
          </div>
          <span className="text-xs text-muted-foreground">
            Created {formatDate(share.createdAt)}
          </span>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Eye className="size-3" />
              {share.viewCount} views
            </span>
            <span className="inline-flex min-w-0 items-center gap-1">
              <Clock3 className="size-3" />
              {formatOptionalDate(share.lastViewedAt)}
            </span>
            <span>{expiryLabel(share)}</span>
            <span className="inline-flex items-center gap-1">
              <KeyRound className="size-3" />
              {share.requiresAccessCode ? "Code required" : "No code"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Download className="size-3" />
              {share.allowDownloads ? "Downloads on" : "Downloads off"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            size="sm"
            checked={share.enabled}
            disabled={disabled}
            onCheckedChange={(enabled) => onToggle(share.id, enabled)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onCopy(share.token)}
          >
            <Copy className="size-4" />
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            onClick={() => onDelete(share.id)}
          >
            <Trash2 className="size-4" />
            <span className="sr-only">Delete link</span>
          </Button>
        </div>
      </div>
      <div className="grid gap-2">
        <Input value={link} readOnly className="font-mono text-xs" />
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/35 px-3 py-2">
          <span className="inline-flex items-center gap-2 text-xs font-medium">
            <Download className="size-3.5" />
            Allow viewer downloads
          </span>
          <Switch
            size="sm"
            checked={share.allowDownloads}
            data-testid={presentationSmokeTestIds.shareDownloadPermissionToggle}
            disabled={disabled}
            onCheckedChange={(allowDownloads) =>
              onDownloadsChange(share.id, allowDownloads)
            }
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {expiryOptions.map((option) => (
            <Button
              key={option.label}
              type="button"
              variant="outline"
              size="xs"
              disabled={disabled}
              onClick={() => onExpiryChange(share.id, expiryDate(option.days))}
            >
              {option.label}
            </Button>
          ))}
          <Button
            type="button"
            variant="outline"
            size="xs"
            disabled={disabled}
            onClick={() => onAccessCodeGenerate(share.id)}
          >
            <KeyRound className="size-3" />
            {share.requiresAccessCode ? "Reset code" : "Add code"}
          </Button>
          {share.requiresAccessCode ? (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={disabled}
              onClick={() => onAccessCodeClear(share.id)}
            >
              Clear code
            </Button>
          ) : null}
        </div>
        {generatedAccessCode ? (
          <div className="grid gap-2 rounded-md border bg-muted/40 p-2 sm:grid-cols-[1fr_auto]">
            <Input
              value={generatedAccessCode}
              readOnly
              className="font-mono text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => onAccessCodeCopy(generatedAccessCode)}
            >
              <Copy className="size-4" />
              Copy code
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
