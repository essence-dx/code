"use client";

import {
  Copy,
  Folder,
  Info,
  LayoutTemplate,
  MoreHorizontal,
  Pencil,
  Share2,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteWorkbookAction,
  duplicateWorkbookAction,
  moveWorkbookToFolderAction,
  renameWorkbookAction,
  toggleWorkbookTemplateAction,
  updateWorkbookPropertiesAction,
} from "@/features/workbooks/actions";
import { WorkbookSharingDialog } from "@/features/workbooks/components/workbook-sharing-dialog";
import { canManageWorkbookSharing } from "@/features/workbooks/sharing-permissions";
import type { WorkbookSummary } from "@/features/workbooks/types";

export function WorkbookOwnerActions({
  workbook,
}: {
  workbook: WorkbookSummary;
}) {
  const canManage = canManageWorkbookSharing(workbook.accessRole);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm">
          <MoreHorizontal />
          <span className="sr-only">Workbook actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canManage ? (
          <WorkbookSharingDialog workbook={workbook}>
            <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
              <Share2 />
              Share
            </DropdownMenuItem>
          </WorkbookSharingDialog>
        ) : null}
        <Dialog>
          <DialogTrigger asChild>
            <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
              <Pencil />
              Rename
            </DropdownMenuItem>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename workbook</DialogTitle>
            </DialogHeader>
            <form action={renameWorkbookAction} className="space-y-4">
              <input type="hidden" name="workbookId" value={workbook.id} />
              <div className="space-y-2">
                <Label htmlFor={`rename-${workbook.id}`}>Name</Label>
                <Input
                  id={`rename-${workbook.id}`}
                  name="name"
                  defaultValue={workbook.name}
                  required
                  maxLength={120}
                />
              </div>
              <Button type="submit">Save name</Button>
            </form>
          </DialogContent>
        </Dialog>
        <form action={duplicateWorkbookAction}>
          <input type="hidden" name="workbookId" value={workbook.id} />
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <Copy />
              Duplicate
            </button>
          </DropdownMenuItem>
        </form>
        <form action={toggleWorkbookTemplateAction}>
          <input type="hidden" name="workbookId" value={workbook.id} />
          <input
            type="hidden"
            name="isTemplate"
            value={workbook.isTemplate ? "false" : "true"}
          />
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <LayoutTemplate />
              {workbook.isTemplate ? "Remove template" : "Save as template"}
            </button>
          </DropdownMenuItem>
        </form>
        <Dialog>
          <DialogTrigger asChild>
            <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
              <Folder />
              Move to folder
            </DropdownMenuItem>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Move workbook</DialogTitle>
            </DialogHeader>
            <form action={moveWorkbookToFolderAction} className="space-y-4">
              <input type="hidden" name="workbookId" value={workbook.id} />
              <div className="space-y-2">
                <Label htmlFor={`folder-${workbook.id}`}>Folder</Label>
                <Input
                  id={`folder-${workbook.id}`}
                  name="folderName"
                  defaultValue={workbook.folderName}
                  maxLength={80}
                  placeholder="Finance, clients, archive..."
                />
              </div>
              <Button type="submit">Save folder</Button>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog>
          <DialogTrigger asChild>
            <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
              <Info />
              Properties
            </DropdownMenuItem>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Workbook properties</DialogTitle>
            </DialogHeader>
            <form action={updateWorkbookPropertiesAction} className="space-y-4">
              <input type="hidden" name="workbookId" value={workbook.id} />
              <div className="space-y-2">
                <Label htmlFor={`description-${workbook.id}`}>
                  Description
                </Label>
                <Textarea
                  id={`description-${workbook.id}`}
                  name="description"
                  defaultValue={workbook.description}
                  maxLength={240}
                  placeholder="Purpose, owner notes, or workbook context"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`tags-${workbook.id}`}>Tags</Label>
                <Input
                  id={`tags-${workbook.id}`}
                  name="tags"
                  defaultValue={workbook.tags.join(", ")}
                  placeholder="finance, planning, client"
                />
              </div>
              <Button type="submit">Save properties</Button>
            </form>
          </DialogContent>
        </Dialog>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem
              className="text-destructive"
              onSelect={(event) => event.preventDefault()}
            >
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this workbook?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes the workbook from your workspace.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <form action={deleteWorkbookAction}>
                <input type="hidden" name="workbookId" value={workbook.id} />
                <AlertDialogAction asChild>
                  <button type="submit">Delete</button>
                </AlertDialogAction>
              </form>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
