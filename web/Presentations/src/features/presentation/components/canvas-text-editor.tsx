"use client"

import { useEffect, useRef, type KeyboardEvent } from "react"

import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import type { PresentationElement } from "../types"

type CanvasTextEditorProps = {
  element: PresentationElement
  onCancel: () => void
  onChange: (content: string) => void
  onCommit: () => void
}

export function CanvasTextEditor({
  element,
  onCancel,
  onChange,
  onCommit,
}: CanvasTextEditorProps) {
  const editorRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    editor.focus()
    editor.setSelectionRange(editor.value.length, editor.value.length)
  }, [element.id])

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    event.stopPropagation()

    if (event.key === "Escape") {
      event.preventDefault()
      onCancel()
      return
    }

    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      onCommit()
    }
  }

  return (
    <Textarea
      ref={editorRef}
      aria-label="Edit slide text"
      className={cn(
        "size-full min-h-0 resize-none rounded-none border-0 bg-transparent p-0 text-inherit shadow-none",
        "focus-visible:border-transparent focus-visible:ring-0",
      )}
      spellCheck
      value={element.content}
      style={{
        font: "inherit",
        lineHeight: "inherit",
        textAlign: "inherit",
      }}
      onBlur={onCommit}
      onChange={(event) => onChange(event.currentTarget.value)}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => event.stopPropagation()}
    />
  )
}
