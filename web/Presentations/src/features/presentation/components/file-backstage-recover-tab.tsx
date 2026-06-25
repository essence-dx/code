"use client"

import { History } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import type { LocalDeckRecoverySnapshot } from "../local-deck-recovery"
import { presentationSmokeTestIds } from "../presentation-smoke-test-ids"
import {
  fileBackstageActionClassName,
  recoveryBackstageLabel,
  type FileBackstageDialogProps,
} from "./file-backstage-types"

type FileBackstageRecoverTabProps = Pick<
  FileBackstageDialogProps,
  | "onClearCurrentRecoverySnapshots"
  | "onClearRecoverySnapshots"
  | "onOpenRecoverySnapshot"
> & {
  currentRecoverySnapshots: LocalDeckRecoverySnapshot[]
  olderRecoverySnapshots: LocalDeckRecoverySnapshot[]
}

export function FileBackstageRecoverTab({
  currentRecoverySnapshots,
  olderRecoverySnapshots,
  onClearCurrentRecoverySnapshots,
  onClearRecoverySnapshots,
  onOpenRecoverySnapshot,
}: FileBackstageRecoverTabProps) {
  return (
    <div
      className="grid gap-3"
      data-testid={presentationSmokeTestIds.backstageRecoverRoot}
    >
      <Card>
        <CardHeader>
          <CardTitle>Recovery snapshots</CardTitle>
          <CardDescription>
            Restore current-deck snapshots or inspect older deck snapshots.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          {currentRecoverySnapshots.map((snapshot) => (
            <Button
              key={snapshot.id}
              type="button"
              variant="ghost"
              className={fileBackstageActionClassName}
              onClick={() => onOpenRecoverySnapshot(snapshot.id)}
            >
              <History className="size-4" />
              {recoveryBackstageLabel(snapshot)}
            </Button>
          ))}
          {!currentRecoverySnapshots.length ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              No current deck recovery snapshots.
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClearCurrentRecoverySnapshots}
            >
              Clear current deck
            </Button>
            <Button type="button" variant="outline" onClick={onClearRecoverySnapshots}>
              Clear all snapshots
            </Button>
          </div>
        </CardContent>
      </Card>

      {olderRecoverySnapshots.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Older deck snapshots</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {olderRecoverySnapshots.slice(0, 6).map((snapshot) => (
              <Button
                key={snapshot.id}
                type="button"
                variant="ghost"
                className={fileBackstageActionClassName}
                onClick={() => onOpenRecoverySnapshot(snapshot.id)}
              >
                <History className="size-4" />
                {recoveryBackstageLabel(snapshot)}
              </Button>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
