"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  createImportedWorkbookAction,
  createWorkbookImportReservationAction,
} from "@/features/workbooks/actions";
import { getImportRateLimitMessage } from "@/features/workbooks/import-rate-limit-message";
import {
  odsToWorkbookDocument,
  xlsmToWorkbookDocument,
  xlsToWorkbookDocument,
  xltmToWorkbookDocument,
  xltxToWorkbookDocument,
  xlsxToWorkbookDocument,
} from "@/features/workbooks/xlsx";

export function ImportWorkbookButton() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleFile(file: File) {
    setError(null);
    const reservation = await createWorkbookImportReservationAction();

    if (!reservation.ok) {
      setError(getImportRateLimitMessage(reservation.retryAfterSeconds));
      return;
    }

    const buffer = await file.arrayBuffer();
    const document = /\.ods$/i.test(file.name)
      ? odsToWorkbookDocument(buffer)
      : /\.xltx$/i.test(file.name)
        ? xltxToWorkbookDocument(buffer)
      : /\.xltm$/i.test(file.name)
        ? xltmToWorkbookDocument(buffer)
      : /\.xlsm$/i.test(file.name)
        ? xlsmToWorkbookDocument(buffer)
      : /\.xls$/i.test(file.name)
        ? xlsToWorkbookDocument(buffer)
        : xlsxToWorkbookDocument(buffer);
    const name =
      file.name.replace(/\.(ods|xltx|xltm|xlsm|xls|xlsx)$/i, "") ||
      "Imported workbook";

    startTransition(async () => {
      try {
        const result = await createImportedWorkbookAction(
          name,
          document,
          reservation.reservationId,
        );

        if (!result.ok) {
          setError(getImportRateLimitMessage(result.retryAfterSeconds));
          return;
        }

        router.push(`/workbooks/${result.workbookId}`);
        router.refresh();
      } catch {
        setError("Could not import this workbook.");
      }
    });
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        onClick={() => inputRef.current?.click()}
      >
        {isPending ? <Loader2 className="animate-spin" /> : <FileUp />}
        Import XLSX/XLSM/XLTX/XLTM/XLS/ODS
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xlsm,.xltx,.xltm,.xls,.ods,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.macroEnabled.12,application/vnd.openxmlformats-officedocument.spreadsheetml.template,application/vnd.ms-excel.template.macroEnabled.12,application/vnd.ms-excel,application/vnd.oasis.opendocument.spreadsheet"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (file) {
            handleFile(file).catch(() => {
              setError("Could not read this workbook.");
            });
          }

          event.currentTarget.value = "";
        }}
      />
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
