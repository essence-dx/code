"use client"

import { useState, type FormEvent } from "react"
import { Link2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

type GoogleSlidesImportDialogProps = {
  open: boolean
  onImport: (url: string) => Promise<boolean>
  onOpenChange: (open: boolean) => void
}

export function GoogleSlidesImportDialog({
  open,
  onImport,
  onOpenChange,
}: GoogleSlidesImportDialogProps) {
  const [url, setUrl] = useState("")
  const [working, setWorking] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const value = url.trim()

    if (!value || working) return

    setWorking(true)
    const imported = await onImport(value)
    setWorking(false)

    if (imported) {
      setUrl("")
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form className="grid gap-4" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Import Google Slides</DialogTitle>
            <DialogDescription>
              Paste a public Google Slides share link. Private decks should be
              downloaded as Microsoft PowerPoint (.pptx), then imported as a
              file.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Input
              aria-label="Google Slides share link"
              placeholder="https://docs.google.com/presentation/d/..."
              value={url}
              onChange={(event) => setUrl(event.currentTarget.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={working}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!url.trim() || working}>
              <Link2 className="size-4" />
              {working ? "Importing" : "Import as PPTX"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
