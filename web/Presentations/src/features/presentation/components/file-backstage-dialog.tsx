"use client"

import { Info } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { FileBackstageExportTab } from "./file-backstage-export-tab"
import { FileBackstageHomeTab } from "./file-backstage-home-tab"
import { FileBackstageInfoTab } from "./file-backstage-info-tab"
import { FileBackstageOpenTab } from "./file-backstage-open-tab"
import { FileBackstageRecoverTab } from "./file-backstage-recover-tab"
import { presentationSmokeTestIds } from "../presentation-smoke-test-ids"
import {
  deckBackstageByteSize,
  deckOpenCommentCount,
  type FileBackstageDialogProps,
} from "./file-backstage-types"

export function FileBackstageDialog({
  canExportSelectedSlide,
  currentFileStatus,
  deck,
  cloudDeckMessage,
  cloudDecks,
  cloudDecksWorking,
  cloudPinnedDeckIds,
  cloudSignedIn,
  imageSlideImportReport,
  odpImportReport,
  pptxWarningReportId,
  pptxWarningReports,
  pptxWarnings,
  recentDecks,
  recoverySnapshots,
  onClearCurrentRecoverySnapshots,
  onClearImageSlideImportReport,
  onClearOdpImportReport,
  onClearPptxWarningHistory,
  onClearPptxWarnings,
  onClearRecentDecks,
  onClearStaleRecentDecks,
  onClearRecoverySnapshots,
  onForgetRecentCloudDeck,
  onExportPdf,
  onExportPptx,
  onExportSlidePng,
  onExportSlideSvg,
  onImportGoogleSlides,
  onImportImageSlides,
  onImportOutline,
  onImportPptx,
  onOpenDeck,
  onOpenPptxWarningReport,
  onOpenRecentCloudDeck,
  onOpenRecentDeck,
  onOpenRecoverySnapshot,
  onForgetRecentDeck,
  onSaveDeck,
  onSaveDeckAs,
  onToggleCloudDeckPin,
  onToggleRecentDeckPin,
  onRefreshCloudDeckShortcuts,
}: FileBackstageDialogProps) {
  const currentRecoverySnapshots = recoverySnapshots.filter(
    (snapshot) => snapshot.deckId === deck.id,
  )
  const olderRecoverySnapshots = recoverySnapshots.filter(
    (snapshot) => snapshot.deckId !== deck.id,
  )
  const archivedReports = pptxWarningReports.filter(
    (report) => report.id !== pptxWarningReportId,
  )

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          onRefreshCloudDeckShortcuts()
        }
      }}
    >
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid={presentationSmokeTestIds.backstageTrigger}
          />
        }
      >
        <Info className="size-4" />
        Backstage
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-5xl"
        data-testid={presentationSmokeTestIds.backstageDialog}
      >
        <DialogHeader>
          <DialogTitle>File backstage</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="home" className="min-h-0">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="home">Home</TabsTrigger>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger
              value="export"
              data-testid={presentationSmokeTestIds.backstageExportTab}
            >
              Export
            </TabsTrigger>
            <TabsTrigger
              value="recover"
              data-testid={presentationSmokeTestIds.backstageRecoverTab}
            >
              Recover
            </TabsTrigger>
            <TabsTrigger
              value="info"
              data-testid={presentationSmokeTestIds.backstageInfoTab}
            >
              Info
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[32rem] rounded-md border">
            <div className="p-3">
              <TabsContent value="home" className="mt-0">
                <FileBackstageHomeTab
                  currentFileStatus={currentFileStatus}
                  deck={deck}
                  deckSize={deckBackstageByteSize(deck)}
                  openComments={deckOpenCommentCount(deck)}
                  onExportPptx={onExportPptx}
                  onImportGoogleSlides={onImportGoogleSlides}
                  onImportPptx={onImportPptx}
                  onOpenDeck={onOpenDeck}
                  onSaveDeck={onSaveDeck}
                />
              </TabsContent>
              <TabsContent value="open" className="mt-0">
                <FileBackstageOpenTab
                  cloudDeckMessage={cloudDeckMessage}
                  cloudDecks={cloudDecks}
                  cloudDecksWorking={cloudDecksWorking}
                  cloudPinnedDeckIds={cloudPinnedDeckIds}
                  cloudSignedIn={cloudSignedIn}
                  deck={deck}
                  recentDecks={recentDecks}
                  onClearRecentDecks={onClearRecentDecks}
                  onClearStaleRecentDecks={onClearStaleRecentDecks}
                  onForgetRecentCloudDeck={onForgetRecentCloudDeck}
                  onForgetRecentDeck={onForgetRecentDeck}
                  onImportGoogleSlides={onImportGoogleSlides}
                  onImportImageSlides={onImportImageSlides}
                  onImportOutline={onImportOutline}
                  onImportPptx={onImportPptx}
                  onOpenDeck={onOpenDeck}
                  onOpenRecentCloudDeck={onOpenRecentCloudDeck}
                  onOpenRecentDeck={onOpenRecentDeck}
                  onRefreshCloudDeckShortcuts={onRefreshCloudDeckShortcuts}
                  onToggleCloudDeckPin={onToggleCloudDeckPin}
                  onToggleRecentDeckPin={onToggleRecentDeckPin}
                />
              </TabsContent>
              <TabsContent value="export" className="mt-0">
                <FileBackstageExportTab
                  canExportSelectedSlide={canExportSelectedSlide}
                  deck={deck}
                  odpImportReport={odpImportReport}
                  onExportPdf={onExportPdf}
                  onExportPptx={onExportPptx}
                  onExportSlidePng={onExportSlidePng}
                  onExportSlideSvg={onExportSlideSvg}
                  onSaveDeckAs={onSaveDeckAs}
                />
              </TabsContent>
              <TabsContent value="recover" className="mt-0">
                <FileBackstageRecoverTab
                  currentRecoverySnapshots={currentRecoverySnapshots}
                  olderRecoverySnapshots={olderRecoverySnapshots}
                  onClearCurrentRecoverySnapshots={onClearCurrentRecoverySnapshots}
                  onClearRecoverySnapshots={onClearRecoverySnapshots}
                  onOpenRecoverySnapshot={onOpenRecoverySnapshot}
                />
              </TabsContent>
              <TabsContent value="info" className="mt-0">
                <FileBackstageInfoTab
                  archivedReports={archivedReports}
                  cloudDecks={cloudDecks}
                  cloudSignedIn={cloudSignedIn}
                  currentFileStatus={currentFileStatus}
                  deck={deck}
                  deckSize={deckBackstageByteSize(deck)}
                  imageSlideImportReport={imageSlideImportReport}
                  odpImportReport={odpImportReport}
                  openComments={deckOpenCommentCount(deck)}
                  pptxWarningReports={pptxWarningReports}
                  pptxWarnings={pptxWarnings}
                  recoverySnapshots={recoverySnapshots}
                  onClearImageSlideImportReport={onClearImageSlideImportReport}
                  onClearOdpImportReport={onClearOdpImportReport}
                  onClearPptxWarningHistory={onClearPptxWarningHistory}
                  onClearPptxWarnings={onClearPptxWarnings}
                  onOpenPptxWarningReport={onOpenPptxWarningReport}
                />
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
