"use client"

import { FileDown, FileInput, FileUp, Link2, Save } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import {
  fileBackstageActionClassName,
  formatBackstageBytes,
  type FileBackstageDialogProps,
} from "./file-backstage-types"

type FileBackstageHomeTabProps = Pick<
  FileBackstageDialogProps,
  | "currentFileStatus"
  | "deck"
  | "onExportPptx"
  | "onImportGoogleSlides"
  | "onImportPptx"
  | "onOpenDeck"
  | "onSaveDeck"
> & {
  deckSize: number
  openComments: number
}

export function FileBackstageHomeTab({
  currentFileStatus,
  deck,
  deckSize,
  openComments,
  onExportPptx,
  onImportGoogleSlides,
  onImportPptx,
  onOpenDeck,
  onSaveDeck,
}: FileBackstageHomeTabProps) {
  return (
    <div className="grid gap-3 md:grid-cols-[1.15fr_0.85fr]">
      <Card>
        <CardHeader>
          <CardTitle>{deck.title || "Untitled deck"}</CardTitle>
          <CardDescription>
            {currentFileStatus.label} - {currentFileStatus.fileName}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            className={fileBackstageActionClassName}
            onClick={onOpenDeck}
          >
            <FileInput className="size-4" />
            Open deck
          </Button>
          <Button
            type="button"
            variant="outline"
            className={fileBackstageActionClassName}
            onClick={onSaveDeck}
          >
            <Save className="size-4" />
            Save current file
          </Button>
          <Button
            type="button"
            variant="outline"
            className={fileBackstageActionClassName}
            onClick={onImportPptx}
          >
            <FileUp className="size-4" />
            Import PPTX or ODP
          </Button>
          <Button
            type="button"
            variant="outline"
            className={fileBackstageActionClassName}
            onClick={onImportGoogleSlides}
          >
            <Link2 className="size-4" />
            Import Slides link as PPTX
          </Button>
          <Button
            type="button"
            variant="outline"
            className={fileBackstageActionClassName}
            onClick={onExportPptx}
          >
            <FileDown className="size-4" />
            Export PowerPoint PPTX
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deck status</CardTitle>
          <CardDescription>
            Production readiness snapshot for the active deck.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          <Badge variant="outline">{deck.slides.length} slides</Badge>
          <Badge variant="outline">{deck.assets.length} assets</Badge>
          <Badge variant={openComments ? "secondary" : "outline"}>
            {openComments} open comments
          </Badge>
          <Badge variant="outline">{formatBackstageBytes(deckSize)}</Badge>
        </CardContent>
      </Card>
    </div>
  )
}
