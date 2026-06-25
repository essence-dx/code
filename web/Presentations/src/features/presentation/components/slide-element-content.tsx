"use client"

import type { DeckAsset, PresentationElement } from "../types"
import { ChartPreview } from "./chart-preview"
import { IconPreview } from "./icon-preview"
import { ShapePreview } from "./shape-preview"
import { TrimmedAudio, TrimmedVideo } from "./trimmed-media"
import { resolveElementImageSrc } from "../deck-assets"
import { imageFilterValue, imageOpacityValue } from "../image-corrections"
import { imageMaskStyle } from "../image-masks"
import { richTextSegmentStyle, richTextSegments } from "../rich-text"
import {
  elementListStyle,
  elementTextAlign,
  formattedTextRows,
  textColumnStyle,
} from "../text-formatting"
import {
  elementTableVerticalAlign,
  tableColumns,
  tableDisplayCells,
  tableRows,
} from "../table-formatting"

type SlideElementContentProps = {
  element: PresentationElement
  assets?: DeckAsset[]
  radiusScale?: number
  mediaControls?: boolean
  autoPlayMedia?: boolean
  showMediaCaptions?: boolean
}

export function SlideElementContent({
  element,
  assets,
  radiusScale = 1,
  mediaControls = true,
  autoPlayMedia = false,
  showMediaCaptions = true,
}: SlideElementContentProps) {
  function renderRichText(start: number, end: number) {
    return richTextSegments(element, start, end).map((segment, index) => (
      <span
        key={`${start}-${index}-${segment.text}`}
        style={richTextSegmentStyle(segment.style)}
      >
        {segment.text}
      </span>
    ))
  }

  if (element.type === "shape") {
    return <ShapePreview element={element} />
  }

  if (element.type === "icon") {
    return <IconPreview element={element} />
  }

  if (element.type === "image") {
    const imageSrc = resolveElementImageSrc(element, assets)
    const imageFilter = imageFilterValue(element)
    const imageOpacity = imageOpacityValue(element)

    return (
      <span
        className="block size-full overflow-hidden"
        style={{
          ...imageMaskStyle(element, radiusScale),
          background: element.background,
        }}
      >
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={element.alt}
            className="size-full select-none"
            draggable={false}
            src={imageSrc}
            style={{
              filter: imageFilter,
              opacity: imageOpacity,
              objectFit: element.fit === "fill" ? "fill" : element.fit,
              objectPosition: `${element.imagePositionX}% ${element.imagePositionY}%`,
            }}
          />
        ) : null}
      </span>
    )
  }

  if (element.type === "video") {
    const caption = element.mediaCaption.trim()

    return (
      <span
        className="relative flex size-full items-center justify-center overflow-hidden bg-slate-950 text-center text-white"
        style={{
          borderRadius: `${Math.max(0, element.radius * radiusScale)}px`,
          background: element.background || "#020617",
        }}
      >
        {element.src ? (
          <TrimmedVideo
            element={element}
            mediaControls={mediaControls}
            autoPlayMedia={autoPlayMedia}
          />
        ) : (
          <span className="px-3 text-xs text-slate-300">
            {element.alt || "Video"}
          </span>
        )}
        {showMediaCaptions && caption ? (
          <span className="pointer-events-none absolute inset-x-2 bottom-2 rounded bg-black/70 px-2 py-1 text-xs leading-snug text-white">
            {caption}
          </span>
        ) : null}
      </span>
    )
  }

  if (element.type === "audio") {
    const caption = element.mediaCaption.trim()

    return (
      <span
        className="flex size-full flex-col justify-center gap-2 overflow-hidden px-3 text-white"
        style={{
          borderRadius: `${Math.max(0, element.radius * radiusScale)}px`,
          background: element.background || "#0f172a",
        }}
      >
        <span className="truncate text-xs font-semibold">
          {element.alt || "Audio"}
        </span>
        {element.src ? (
          <TrimmedAudio
            element={element}
            mediaControls={mediaControls}
            autoPlayMedia={autoPlayMedia}
          />
        ) : null}
        {showMediaCaptions && caption ? (
          <span className="line-clamp-2 text-xs leading-snug text-slate-300">
            {caption}
          </span>
        ) : null}
      </span>
    )
  }

  if (element.type === "table") {
    const rows = tableRows(element)
    const columns = tableColumns(element)
    const textAlign = elementTextAlign(element)
    const verticalAlign = elementTableVerticalAlign(element)

    return (
      <span
        className="grid size-full overflow-hidden"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {tableDisplayCells(element).map((cell) => {
          return (
            <span
              key={`${cell.row}-${cell.column}`}
              className="flex min-w-0 items-center overflow-hidden whitespace-pre-wrap break-words px-2 py-1"
              style={{
                alignItems:
                  verticalAlign === "top"
                    ? "flex-start"
                    : verticalAlign === "bottom"
                      ? "flex-end"
                      : "center",
                justifyContent:
                  textAlign === "center"
                    ? "center"
                    : textAlign === "right"
                      ? "flex-end"
                      : "flex-start",
                textAlign,
                background: cell.format.background,
                borderBottom: `1px solid ${cell.format.borderBottomColor}`,
                borderLeft: `1px solid ${cell.format.borderLeftColor}`,
                borderRight: `1px solid ${cell.format.borderRightColor}`,
                borderTop: `1px solid ${cell.format.borderTopColor}`,
                color: cell.format.color,
                fontSize: "0.9em",
                fontWeight: cell.format.fontWeight,
                gridColumn: `${cell.column + 1} / span ${cell.columnSpan}`,
                gridRow: `${cell.row + 1} / span ${cell.rowSpan}`,
                lineHeight: 1.2,
              }}
            >
              {cell.text}
            </span>
          )
        })}
      </span>
    )
  }

  if (element.type === "chart") {
    return <ChartPreview element={element} />
  }

  const listStyle = elementListStyle(element)

  if (listStyle === "none") {
    return (
      <span
        className="block size-full whitespace-pre-wrap break-words"
        style={textColumnStyle(element)}
      >
        {renderRichText(0, element.content.length)}
      </span>
    )
  }

  return (
    <span
      className="block size-full break-words"
      style={textColumnStyle(element)}
    >
      {formattedTextRows(element).map((row, index) => (
        <span
          key={`${index}-${row.marker}-${row.text}`}
          className="grid grid-cols-[1.4em_1fr]"
        >
          <span>{row.marker}</span>
          <span className="whitespace-pre-wrap">
            {renderRichText(row.start, row.end)}
          </span>
        </span>
      ))}
    </span>
  )
}
