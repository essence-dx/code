"use client";

import {
  FileSpreadsheet,
  FileText,
  Presentation,
  Sparkles,
} from "lucide-react";
import {
  type ChangeEvent,
  type ReactNode,
  type RefObject,
} from "react";

import { Button } from "@/components/ui/button";
import type { AssetPanelMessage } from "@/features/editor/components/asset-panel-types";
import { acceptedCsvMimeTypes } from "@/features/editor/csv-import";
import { acceptedPptxMimeTypes } from "@/features/editor/pptx-import";
import { acceptedDocxMimeTypes } from "@/features/editor/office-docx-import";
import { acceptedXlsxMimeTypes } from "@/features/editor/office-xlsx-import";
import { acceptedPdfImportMimeTypes } from "@/features/editor/pdf-import";

type FileInputRef = RefObject<HTMLInputElement | null>;
type FileImportHandler = (event: ChangeEvent<HTMLInputElement>) => void;

type AssetImportPanelProps = {
  csvInputRef: FileInputRef;
  docxInputRef: FileInputRef;
  xlsxInputRef: FileInputRef;
  pdfInputRef: FileInputRef;
  pptxInputRef: FileInputRef;
  lottieInputRef: FileInputRef;
  csvImportMessage: AssetPanelMessage | null;
  docxImportMessage: AssetPanelMessage | null;
  xlsxImportMessage: AssetPanelMessage | null;
  pdfImportMessage: AssetPanelMessage | null;
  pptxImportMessage: AssetPanelMessage | null;
  lottieImportMessage: AssetPanelMessage | null;
  isImportingCsv: boolean;
  isImportingDocx: boolean;
  isImportingXlsx: boolean;
  isImportingPdf: boolean;
  isImportingPptx: boolean;
  isImportingLottie: boolean;
  onCsvImport: FileImportHandler;
  onDocxImport: FileImportHandler;
  onXlsxImport: FileImportHandler;
  onPdfImport: FileImportHandler;
  onPptxImport: FileImportHandler;
  onLottieImport: FileImportHandler;
};

export function AssetImportPanel({
  csvInputRef,
  docxInputRef,
  xlsxInputRef,
  pdfInputRef,
  pptxInputRef,
  lottieInputRef,
  csvImportMessage,
  docxImportMessage,
  xlsxImportMessage,
  pdfImportMessage,
  pptxImportMessage,
  lottieImportMessage,
  isImportingCsv,
  isImportingDocx,
  isImportingXlsx,
  isImportingPdf,
  isImportingPptx,
  isImportingLottie,
  onCsvImport,
  onDocxImport,
  onXlsxImport,
  onPdfImport,
  onPptxImport,
  onLottieImport,
}: AssetImportPanelProps) {
  return (
    <details className="group rounded-md border border-border bg-background">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-xs font-semibold outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring">
        <span className="flex min-w-0 items-center gap-2">
          <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">Import files</span>
        </span>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground group-open:hidden">
          Open
        </span>
        <span className="hidden text-[10px] uppercase tracking-wide text-muted-foreground group-open:inline">
          Close
        </span>
      </summary>
      <div className="grid grid-cols-2 gap-1.5 border-t border-border p-3">
      <ImportControl
        inputRef={csvInputRef}
        accept={[...acceptedCsvMimeTypes, ".csv"].join(",")}
        icon={<FileSpreadsheet className="h-4 w-4" />}
        label="Import CSV"
        pendingLabel="Importing CSV..."
        isPending={isImportingCsv}
        message={csvImportMessage}
        onChange={onCsvImport}
      />
      <ImportControl
        inputRef={xlsxInputRef}
        accept={[...acceptedXlsxMimeTypes, ".xlsx"].join(",")}
        icon={<FileSpreadsheet className="h-4 w-4" />}
        label="Import XLSX"
        pendingLabel="Importing XLSX..."
        isPending={isImportingXlsx}
        message={xlsxImportMessage}
        onChange={onXlsxImport}
      />
      <ImportControl
        inputRef={docxInputRef}
        accept={[...acceptedDocxMimeTypes, ".docx"].join(",")}
        icon={<FileText className="h-4 w-4" />}
        label="Import DOCX"
        pendingLabel="Importing DOCX..."
        isPending={isImportingDocx}
        message={docxImportMessage}
        onChange={onDocxImport}
      />
      <ImportControl
        inputRef={pdfInputRef}
        accept={[...acceptedPdfImportMimeTypes, ".pdf"].join(",")}
        icon={<FileText className="h-4 w-4" />}
        label="Import PDF pages"
        pendingLabel="Importing PDF..."
        isPending={isImportingPdf}
        message={pdfImportMessage}
        onChange={onPdfImport}
      />
      <ImportControl
        inputRef={pptxInputRef}
        accept={[...acceptedPptxMimeTypes, ".pptx"].join(",")}
        icon={<Presentation className="h-4 w-4" />}
        label="Import PPTX"
        pendingLabel="Importing PPTX..."
        isPending={isImportingPptx}
        message={pptxImportMessage}
        onChange={onPptxImport}
      />
      <ImportControl
        inputRef={lottieInputRef}
        accept="application/json,.json"
        icon={<Sparkles className="h-4 w-4" />}
        label="Import Lottie"
        pendingLabel="Importing Lottie..."
        isPending={isImportingLottie}
        message={lottieImportMessage}
        onChange={onLottieImport}
      />
      </div>
    </details>
  );
}

type ImportControlProps = {
  inputRef: FileInputRef;
  accept: string;
  icon: ReactNode;
  label: string;
  pendingLabel: string;
  isPending: boolean;
  message: AssetPanelMessage | null;
  onChange: FileImportHandler;
};

function ImportControl({
  inputRef,
  accept,
  icon,
  label,
  pendingLabel,
  isPending,
  message,
  onChange,
}: ImportControlProps) {
  return (
    <>
      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept={accept}
        onChange={onChange}
      />
      <Button
        variant="outline"
        className="h-8 min-w-0 justify-start px-2 text-xs"
        disabled={isPending}
        onClick={() => inputRef.current?.click()}
      >
        {icon}
        {isPending ? pendingLabel : label}
      </Button>
      {message ? <PanelMessage message={message} /> : null}
    </>
  );
}

function PanelMessage({ message }: { message: AssetPanelMessage }) {
  return (
    <p
      className={
        message.tone === "error"
          ? "col-span-2 text-xs text-destructive"
          : "col-span-2 text-xs text-muted-foreground"
      }
    >
      {message.text}
    </p>
  );
}
