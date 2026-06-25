"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PrintPreflightSummary } from "@/features/editor/components/print-preflight-summary";
import { PrintProofArtwork } from "@/features/editor/components/print-proof-artwork";
import { getPageDimensions } from "@/features/editor/page-dimensions";
import {
  getPrintProofProduct,
  getRecommendedPrintProofKind,
  printProofProducts,
  type PrintProofProductKind,
} from "@/features/editor/print-proof";
import type {
  DesignDocument,
  DesignPage,
} from "@/features/editor/types";
import { cn } from "@/lib/utils";

type PrintProofSheetProps = {
  open: boolean;
  document: DesignDocument;
  page: DesignPage;
  onOpenChange: (open: boolean) => void;
};

export function PrintProofSheet({
  open,
  document,
  page,
  onOpenChange,
}: PrintProofSheetProps) {
  const pageSize = getPageDimensions(document, page);
  const recommendedKind = useMemo(
    () =>
      getRecommendedPrintProofKind({
        format: page.format,
        width: pageSize.width,
        height: pageSize.height,
      }),
    [page.format, pageSize.height, pageSize.width],
  );
  const [proofKind, setProofKind] =
    useState<PrintProofProductKind>(recommendedKind);
  const product = getPrintProofProduct(proofKind);

  useEffect(() => {
    if (open) {
      setProofKind(recommendedKind);
    }
  }, [open, recommendedKind]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 p-0 sm:max-w-none md:w-[880px]">
        <SheetHeader className="pr-14">
          <div className="flex flex-wrap items-center gap-2">
            <SheetTitle>Print proof</SheetTitle>
            <Badge variant="secondary">{product.label}</Badge>
          </div>
          <SheetDescription>
            {page.name} / {pageSize.width} x {pageSize.height}px
          </SheetDescription>
        </SheetHeader>
        <PrintPreflightSummary document={document} page={page} />

        <Tabs
          value={proofKind}
          onValueChange={(value) =>
            setProofKind(value as PrintProofProductKind)
          }
          className="min-h-0 flex-1"
        >
          <div className="px-4 pb-4">
            <TabsList className="grid h-auto w-full grid-cols-5">
              {printProofProducts.map((item) => (
                <TabsTrigger
                  key={item.id}
                  value={item.id}
                  className="h-8 text-xs"
                >
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <ScrollArea className="min-h-0 flex-1 border-t bg-muted/30">
            {printProofProducts.map((item) => (
              <TabsContent
                key={item.id}
                value={item.id}
                className="m-0 min-h-[620px] p-6"
              >
                <PrintProofStage
                  kind={item.id}
                  document={document}
                  page={page}
                />
                <div className="mt-4 rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
                  {item.description}
                </div>
              </TabsContent>
            ))}
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function PrintProofStage({
  kind,
  document,
  page,
}: {
  kind: PrintProofProductKind;
  document: DesignDocument;
  page: DesignPage;
}) {
  if (kind === "card") {
    return (
      <ProofSurface className="items-center justify-center">
        <div className="relative h-[360px] w-[560px]">
          <CardShadow className="left-16 top-24 rotate-[-5deg]" />
          <CardShadow className="left-28 top-14 rotate-[4deg]" />
          <div className="absolute left-20 top-20 rounded-lg border border-border bg-background p-4 shadow-2xl">
            <PrintProofArtwork
              document={document}
              page={page}
              maxWidth={400}
              maxHeight={220}
              className="rounded-md ring-1 ring-border"
            />
          </div>
        </div>
      </ProofSurface>
    );
  }

  if (kind === "label") {
    return (
      <ProofSurface className="justify-center">
        <div className="flex w-full max-w-[720px] flex-col gap-5 rounded-lg border border-border bg-background p-5 shadow-xl">
          <div className="h-10 rounded-full border border-dashed border-muted-foreground/40 bg-muted" />
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="rounded-xl border border-dashed border-sky-500/50 bg-white p-3 shadow-sm"
              >
                <PrintProofArtwork
                  document={document}
                  page={page}
                  maxWidth={185}
                  maxHeight={116}
                  className="rounded-lg ring-1 ring-border"
                />
              </div>
            ))}
          </div>
          <div className="h-10 rounded-full border border-dashed border-muted-foreground/40 bg-muted" />
        </div>
      </ProofSurface>
    );
  }

  if (kind === "poster") {
    return (
      <ProofSurface className="items-center justify-center">
        <div className="relative grid h-[560px] w-[720px] place-items-center rounded-lg border border-border bg-[linear-gradient(90deg,#f8fafc_0,#ffffff_48%,#eef2f7_100%)] shadow-inner">
          <div className="absolute bottom-0 h-24 w-full bg-slate-200/70" />
          <div className="relative rounded-sm border-[10px] border-slate-900 bg-background p-3 shadow-2xl">
            <PrintProofArtwork
              document={document}
              page={page}
              maxWidth={300}
              maxHeight={420}
              className="ring-1 ring-slate-950/20"
            />
          </div>
        </div>
      </ProofSurface>
    );
  }

  if (kind === "sticker") {
    return (
      <ProofSurface className="items-center justify-center">
        <div className="grid grid-cols-2 gap-6 rounded-xl border border-border bg-background p-7 shadow-2xl">
          {[
            "rounded-full",
            "rounded-[32px]",
            "rounded-full",
            "rounded-[32px]",
          ].map((radiusClass, index) => (
            <div
              key={index}
              className={cn(
                "grid h-52 w-52 place-items-center overflow-hidden border-2 border-dashed border-sky-500/60 bg-white p-3 shadow-sm",
                radiusClass,
              )}
            >
              <PrintProofArtwork
                document={document}
                page={page}
                maxWidth={170}
                maxHeight={170}
                showPrintMarks={false}
              />
            </div>
          ))}
        </div>
      </ProofSurface>
    );
  }

  return (
    <ProofSurface className="items-center justify-center">
      <div className="grid grid-cols-[100px_220px_220px_100px] grid-rows-[96px_300px_96px] gap-2 rounded-xl border border-border bg-background p-6 shadow-2xl">
        <DielinePanel className="col-start-2 row-start-1" label="Top" />
        <DielinePanel className="col-start-2 row-start-3" label="Bottom" />
        <DielinePanel className="col-start-1 row-start-2" label="Glue" muted />
        <DielinePanel className="col-start-4 row-start-2" label="Side" />
        <DielinePanel className="col-start-2 row-start-2" label="Front">
          <PrintProofArtwork
            document={document}
            page={page}
            maxWidth={178}
            maxHeight={250}
            className="rounded-sm ring-1 ring-border"
          />
        </DielinePanel>
        <DielinePanel className="col-start-3 row-start-2" label="Back">
          <PrintProofArtwork
            document={document}
            page={page}
            maxWidth={178}
            maxHeight={250}
            className="rounded-sm opacity-80 ring-1 ring-border"
            showPrintMarks={false}
          />
        </DielinePanel>
      </div>
    </ProofSurface>
  );
}

function ProofSurface({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[560px] rounded-lg border border-border bg-slate-100 p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

function CardShadow({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "absolute h-[240px] w-[430px] rounded-lg border border-border bg-white shadow-xl",
        className,
      )}
    />
  );
}

function DielinePanel({
  className,
  label,
  muted = false,
  children,
}: {
  className?: string;
  label: string;
  muted?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative grid place-items-center rounded-md border border-dashed border-sky-500/60 bg-white p-4 text-xs font-medium text-muted-foreground",
        muted && "bg-muted/70",
        className,
      )}
    >
      {children ?? label}
      <span className="absolute left-2 top-2 text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
