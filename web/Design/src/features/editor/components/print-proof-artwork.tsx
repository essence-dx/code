"use client";

import { CanvasPrintMarks } from "@/features/editor/components/canvas-print-marks";
import { ElementRenderer } from "@/features/editor/components/element-renderer";
import { getPageDimensions } from "@/features/editor/page-dimensions";
import { getPrintProofFit } from "@/features/editor/print-proof";
import type {
  DesignDocument,
  DesignPage,
} from "@/features/editor/types";
import { cn } from "@/lib/utils";

type PrintProofArtworkProps = {
  document: DesignDocument;
  page: DesignPage;
  maxWidth: number;
  maxHeight: number;
  className?: string;
  showPrintMarks?: boolean;
};

export function PrintProofArtwork({
  document,
  page,
  maxWidth,
  maxHeight,
  className,
  showPrintMarks = true,
}: PrintProofArtworkProps) {
  const pageSize = getPageDimensions(document, page);
  const fit = getPrintProofFit({
    width: pageSize.width,
    height: pageSize.height,
    maxWidth,
    maxHeight,
  });

  return (
    <div
      className={cn("relative overflow-hidden bg-background", className)}
      style={{
        width: fit.width,
        height: fit.height,
      }}
    >
      <div
        className="relative origin-top-left overflow-hidden"
        style={{
          width: pageSize.width,
          height: pageSize.height,
          background: page.background,
          transform: `scale(${fit.scale})`,
        }}
      >
        {page.elements.map((element) =>
          element.hidden ? null : (
            <div
              key={element.id}
              className="absolute"
              style={{
                left: element.x,
                top: element.y,
                width: element.width,
                height: element.height,
                transform: `rotate(${element.rotation}deg)`,
                transformOrigin: "center",
              }}
            >
              <ElementRenderer element={element} pageElements={page.elements} />
            </div>
          ),
        )}
        {showPrintMarks ? (
          <CanvasPrintMarks width={pageSize.width} height={pageSize.height} />
        ) : null}
        <div
          className="pointer-events-none absolute border-2 border-dashed border-emerald-500/70"
          style={{
            left: pageSize.width * 0.06,
            top: pageSize.height * 0.06,
            width: pageSize.width * 0.88,
            height: pageSize.height * 0.88,
          }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
