"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Check, HardDrive, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import {
  desktopBridgeReadinessFromCapabilities,
  readDesktopBridgeReadiness,
  type DesktopBridgeReadiness,
} from "../desktop-bridge-readiness"
import { desktopRecentFileHandoffSummary } from "../desktop-file-command-payloads"
import {
  desktopMenuContractFromReadiness,
  type DesktopMenuCommandContract,
} from "../desktop-menu-contract"
import { desktopPackagingReadinessReport } from "../desktop-packaging-readiness"
import {
  desktopReleaseFileAssociations,
  desktopReleaseGates,
} from "../desktop-release-profile"
import { desktopReleaseRegistrationReport } from "../desktop-release-registration"
import { presentationSmokeTestIds } from "../presentation-smoke-test-ids"
import type { RecentLocalDeckFile } from "../recent-local-deck-files"

type DesktopBridgeStatusProps = {
  canExportSelectedSlide: boolean
  recentDecks?: RecentLocalDeckFile[]
}

function badgeVariant(readiness: DesktopBridgeReadiness) {
  return readiness.variant === "fallback" ? "secondary" : "outline"
}

function commandBadgeVariant(command: DesktopMenuCommandContract) {
  if (command.status === "blocked") return "destructive"
  if (command.status === "fallback") return "secondary"

  return "outline"
}

function commandIcon(command: DesktopMenuCommandContract) {
  if (command.status === "blocked") return X
  if (command.status === "fallback") return AlertTriangle

  return Check
}

function packagingBadgeVariant(
  status: ReturnType<typeof desktopPackagingReadinessReport>["status"],
) {
  if (status === "blocked") return "destructive"
  if (status === "attention") return "secondary"

  return "outline"
}

export function DesktopBridgeStatus({
  canExportSelectedSlide,
  recentDecks = [],
}: DesktopBridgeStatusProps) {
  const [readiness, setReadiness] = useState(() =>
    desktopBridgeReadinessFromCapabilities({}),
  )
  const menuContract = desktopMenuContractFromReadiness(readiness, {
    canExportSelectedSlide,
  })
  const recentHandoff = desktopRecentFileHandoffSummary(recentDecks)
  const packagingReport = desktopPackagingReadinessReport(readiness, {
    recentFiles: recentDecks,
    runtime: { canExportSelectedSlide },
  })
  const releaseRegistrationReport = desktopReleaseRegistrationReport({
    fileAssociations: [...desktopReleaseFileAssociations],
    hasNativeRecentPathMetadata: packagingReport.recentDocuments.osEligibleCount > 0,
    hasNotarizationInputs: false,
    hasOsRecentDocumentWriter: readiness.variant === "shell",
    hasSigningInputs: false,
    recentDocumentWriterCommandCount:
      packagingReport.recentDocuments.writerCommandCount,
    releaseGates: [...desktopReleaseGates],
  })
  const visibleCommands = menuContract.commands.slice(0, 8)
  const hiddenCommandCount = menuContract.commands.length - visibleCommands.length
  const visibleRecentFiles = recentHandoff.items.slice(0, 3)
  const releaseAttentionChecks = releaseRegistrationReport.checks.filter(
    (check) => check.status !== "ready",
  )

  useEffect(() => {
    setReadiness(readDesktopBridgeReadiness())
  }, [])

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-testid={presentationSmokeTestIds.desktopBridgeTrigger}
          />
        }
      >
        <HardDrive className="size-4" />
        Local files
        <Badge variant={badgeVariant(readiness)} className="ml-1">
          {readiness.readyCount}/{readiness.totalCount}
        </Badge>
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-xl"
        data-testid={presentationSmokeTestIds.desktopBridgeDialog}
      >
        <DialogHeader>
          <DialogTitle>Local file status</DialogTitle>
        </DialogHeader>
        <div className="rounded-md border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-medium">{readiness.label}</div>
              <div className="text-sm text-muted-foreground">
                {readiness.detail}
              </div>
            </div>
            <Badge variant={badgeVariant(readiness)}>
              {readiness.readyCount} of {readiness.totalCount}
            </Badge>
          </div>
        </div>
        <div className="rounded-md border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-medium">{menuContract.label}</div>
              <div className="text-sm text-muted-foreground">
                {menuContract.readyCount} ready, {menuContract.fallbackCount}{" "}
                fallback, {menuContract.blockedCount} blocked.
              </div>
            </div>
            <Badge variant={menuContract.blockedCount ? "secondary" : "outline"}>
              {menuContract.readyCount}/{menuContract.totalCount}
            </Badge>
          </div>
        </div>
        <div
          className="rounded-md border p-3"
          data-testid={presentationSmokeTestIds.desktopFileHandoffPanel}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-medium">Recent file handoff</div>
              <div className="text-sm text-muted-foreground">
                {recentHandoff.label}
                {recentHandoff.staleCount
                  ? `, ${recentHandoff.staleCount} need reopen`
                  : ""}
              </div>
            </div>
            <Badge variant={recentHandoff.staleCount ? "secondary" : "outline"}>
              {recentHandoff.nativeReadyCount}/{recentHandoff.totalCount}
            </Badge>
          </div>
          {visibleRecentFiles.length ? (
            <div className="mt-3 grid gap-2">
              {visibleRecentFiles.map((recent) => (
                <div
                  key={recent.id}
                  className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2 py-1.5 text-xs"
                >
                  <span className="min-w-0 truncate">{recent.name}</span>
                  <Badge
                    variant={recent.nativeRecentEligible ? "outline" : "secondary"}
                    className="shrink-0"
                  >
                    {recent.nativeRecentEligible ? "Ready" : "Reopen"}
                  </Badge>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div
          className="rounded-md border p-3"
          data-testid={presentationSmokeTestIds.desktopPackagingPanel}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-medium">{packagingReport.label}</div>
              <div className="text-sm text-muted-foreground">
                {packagingReport.summary}
              </div>
            </div>
            <Badge variant={packagingBadgeVariant(packagingReport.status)}>
              {packagingReport.status}
            </Badge>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-md bg-muted/40 px-2 py-1.5 text-xs">
              {packagingReport.fileAssociations.filter(
                (item) => item.status === "ready",
              ).length}{" "}
              of {packagingReport.fileAssociations.length} associations ready
            </div>
            <div className="rounded-md bg-muted/40 px-2 py-1.5 text-xs">
              {packagingReport.recentDocuments.writerCommandCount} OS writer
              commands
            </div>
            <div className="rounded-md bg-muted/40 px-2 py-1.5 text-xs">
              {packagingReport.signedPackageChecks.filter(
                (item) => item.status === "ready",
              ).length}{" "}
              signing checks ready
            </div>
          </div>
        </div>
        <div
          className="rounded-md border p-3"
          data-testid={presentationSmokeTestIds.desktopReleasePanel}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-medium">{releaseRegistrationReport.label}</div>
              <div className="text-sm text-muted-foreground">
                {releaseRegistrationReport.summary}
              </div>
            </div>
            <Badge
              variant={packagingBadgeVariant(releaseRegistrationReport.status)}
            >
              {releaseRegistrationReport.status}
            </Badge>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-md bg-muted/40 px-2 py-1.5 text-xs">
              {
                releaseRegistrationReport.checks.filter(
                  (check) => check.status === "ready",
                ).length
              }{" "}
              release checks ready
            </div>
            <div className="rounded-md bg-muted/40 px-2 py-1.5 text-xs">
              {releaseAttentionChecks.length} release inputs pending
            </div>
            <div className="rounded-md bg-muted/40 px-2 py-1.5 text-xs">
              {desktopReleaseGates.length} release gates tracked
            </div>
          </div>
        </div>
        <div className="grid gap-2">
          {readiness.capabilities.map((capability) => (
            <div
              key={capability.id}
              className="flex items-start gap-3 rounded-md border bg-background p-3"
            >
              {capability.ready ? (
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              ) : (
                <X className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0">
                <div className="font-medium">{capability.label}</div>
                <div className="text-sm text-muted-foreground">
                  {capability.detail}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-2">
          {visibleCommands.map((command) => {
            const Icon = commandIcon(command)

            return (
              <div
                key={command.id}
                className="flex items-start gap-3 rounded-md border bg-background p-3"
              >
                <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate font-medium">{command.label}</div>
                    <Badge variant={commandBadgeVariant(command)}>
                      {command.channel}
                    </Badge>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {command.detail}
                  </div>
                  {command.shortcut ? (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {command.shortcut}
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })}
          {hiddenCommandCount > 0 ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              {hiddenCommandCount} more menu commands use the same contract.
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
