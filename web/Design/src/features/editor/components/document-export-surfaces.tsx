"use client";

import { CanvasPrintMarks } from "@/features/editor/components/canvas-print-marks";
import { ElementRenderer } from "@/features/editor/components/element-renderer";
import {
  getTimelineElementTransform,
  getTimelineRenderFrame,
} from "@/features/editor/timeline-render-frame";
import { getPageDimensions } from "@/features/editor/page-dimensions";
import type { DesignDocument } from "@/features/editor/types";

type DocumentExportSurfacesProps = {
  document: DesignDocument;
  renderTimeSeconds?: number;
  showPrintMarks?: boolean;
  onPageNode: (pageId: string, node: HTMLDivElement | null) => void;
};

export function DocumentExportSurfaces({
  document,
  renderTimeSeconds,
  showPrintMarks = false,
  onPageNode,
}: DocumentExportSurfacesProps) {
  return (
    <div
      className="pointer-events-none fixed top-0 flex flex-col gap-6"
      style={{ left: -100_000 }}
      aria-hidden="true"
    >
      {document.pages.map((page) => {
        const pageSize = getPageDimensions(document, page);

        return (
          <div
            key={page.id}
            ref={(node) => onPageNode(page.id, node)}
            className="relative overflow-hidden"
            style={{
              width: pageSize.width,
              height: pageSize.height,
              background: page.background,
            }}
          >
            {page.elements.map((element) => {
              const frame = getTimelineRenderFrame(element, renderTimeSeconds);

              return element.hidden || !frame.visible ? null : (
                <div
                  key={element.id}
                  className="absolute"
                  style={{
                    left: frame.x,
                    top: frame.y,
                    width: frame.width,
                    height: frame.height,
                    opacity: frame.wrapperOpacity,
                    transform: getTimelineElementTransform(frame),
                    transformOrigin: "center",
                  }}
                >
                  <ElementRenderer
                    element={element}
                    pageElements={page.elements}
                    renderTimeSeconds={renderTimeSeconds}
                  />
                </div>
              );
            })}
            {showPrintMarks ? (
              <CanvasPrintMarks
                width={pageSize.width}
                height={pageSize.height}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
