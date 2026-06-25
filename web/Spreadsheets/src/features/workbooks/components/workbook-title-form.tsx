"use client";

import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { renameWorkbookAction } from "@/features/workbooks/actions";

export function WorkbookTitleForm({
  workbookId,
  defaultName,
  disabled = false,
}: {
  workbookId: string;
  defaultName: string;
  disabled?: boolean;
}) {
  return (
    <form action={renameWorkbookAction} className="flex min-w-0 items-center gap-2">
      <input type="hidden" name="workbookId" value={workbookId} />
      <Input
        name="name"
        defaultValue={defaultName}
        aria-label="Workbook name"
        className="h-8 min-w-0 border-transparent bg-transparent px-0 text-sm font-semibold shadow-none focus-visible:border-input focus-visible:px-2"
        maxLength={120}
        required
        disabled={disabled}
      />
      <Button type="submit" variant="ghost" size="icon-sm" disabled={disabled}>
        <Save />
        <span className="sr-only">Rename workbook</span>
      </Button>
    </form>
  );
}
