"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useId, useRef } from "react";

import { ChartRenderer } from "@/features/editor/components/chart-renderer";
import { EmbedRenderer } from "@/features/editor/components/embed-renderer";
import { FormRenderer } from "@/features/editor/components/form-renderer";
import { LottieRenderer } from "@/features/editor/components/lottie-renderer";
import { SvgFillDefinitions } from "@/features/editor/components/svg-fill-definitions";
import { TimerRenderer } from "@/features/editor/components/timer-renderer";
import { getConnectorPathGeometry } from "@/features/editor/connector-anchors";
import { getImageCropStyle } from "@/features/editor/image-crop";
import { getDrawSvgPath } from "@/features/editor/draw-strokes";
import { getCssFillStyle, getSvgFillPaint } from "@/features/editor/fill-styles";
import {
  getImageFrameOverlayStyle,
  getImageFrameStyle,
} from "@/features/editor/image-frame";
import {
  getDuotoneTables,
  getImageCssFilterStyle,
  getImageSvgFilterId,
  getSharpenKernelMatrix,
  hasImageSvgFilter,
} from "@/features/editor/image-effects";
import { getQrMatrixPath } from "@/features/editor/qr-code";
import { getVectorPathData } from "@/features/editor/vector-path";
import { getRenderableSvgMarkup } from "@/features/assets/svg-assets";
import {
  getMediaEffectiveVolume,
  getMediaSourceWithTrim,
  getMediaTimelineDuration,
  getMediaTrimEnd,
  getMediaTrimStart,
  getMediaVolume,
  getVideoTransitionDuration,
  getVideoTransitionIn,
} from "@/features/editor/media-timeline";
import { getLayerMotionStyle } from "@/features/editor/layer-motion";
import {
  getTimelineMediaPlaybackTime,
  getVideoTimelineContentStyle,
} from "@/features/editor/timeline-render-frame";
import { getVideoClipTransitionAnimation } from "@/features/editor/video-transitions";
import { clampTableColumns } from "@/features/editor/table";
import { getTableCellStyle } from "@/features/editor/table-cell-format";
import { getTableCellDisplayValue } from "@/features/editor/table-formulas";
import { getActiveTableSheet } from "@/features/editor/table-sheets";
import { createTableView } from "@/features/editor/table-view";
import type { DesignElement } from "@/features/editor/types";

type ElementRendererProps = {
  element: DesignElement;
  pageElements?: readonly DesignElement[];
  renderTimeSeconds?: number;
};

export function ElementRenderer({
  element,
  pageElements,
  renderTimeSeconds,
}: ElementRendererProps) {
  const rendererId = useId();
  const baseStyle: CSSProperties = {
    width: "100%",
    height: "100%",
    opacity: element.opacity,
    ...(typeof renderTimeSeconds === "number"
      ? {}
      : getLayerMotionStyle(element)),
  };

  if (element.type === "text") {
    const textEffect = getTextEffectStyle(element);
    const textFill = getTextFillStyle(element);

    if (element.textCurveEnabled) {
      return (
        <CurvedTextRenderer
          element={element}
          rendererId={rendererId}
          baseStyle={baseStyle}
        />
      );
    }

    return (
      <div
        style={{
          ...baseStyle,
          ...textFill,
          ...textEffect,
          fontFamily: element.fontFamily,
          fontSize: element.fontSize,
          fontWeight: element.fontWeight,
          letterSpacing: element.letterSpacing,
          lineHeight: element.lineHeight,
          textAlign: element.textAlign,
          whiteSpace: "pre-wrap",
          overflow: "hidden",
        }}
      >
        {element.content}
      </div>
    );
  }

  if (element.type === "document") {
    return <DocumentRenderer element={element} baseStyle={baseStyle} />;
  }

  if (element.type === "image") {
    const svgFilterId = hasImageSvgFilter(element)
      ? getImageSvgFilterId(element, rendererId)
      : undefined;
    const imageFilter = getImageCssFilterStyle(element, svgFilterId);
    const imageCrop = getImageCropStyle(element);
    const imageFrame = getImageFrameStyle(element);
    const imageFrameOverlay = getImageFrameOverlayStyle(element);

    return (
      <div
        style={{
          ...baseStyle,
          ...imageFrame,
        }}
      >
        {svgFilterId ? (
          <ImageSvgFilter element={element} filterId={svgFilterId} />
        ) : null}
        <img
          src={element.src}
          alt={element.alt}
          draggable={false}
          style={{
            ...imageFilter,
            ...imageCrop,
          }}
        />
        <div style={imageFrameOverlay} />
      </div>
    );
  }

  if (element.type === "draw") {
    return <DrawStrokeRenderer element={element} baseStyle={baseStyle} />;
  }

  if (element.type === "path") {
    return (
      <VectorPathRenderer
        element={element}
        rendererId={rendererId}
        baseStyle={baseStyle}
      />
    );
  }

  if (element.type === "video") {
    return (
      <VideoRenderer
        element={element}
        baseStyle={baseStyle}
        renderTimeSeconds={renderTimeSeconds}
      />
    );
  }

  if (element.type === "audio") {
    return <AudioRenderer element={element} baseStyle={baseStyle} />;
  }

  if (element.type === "pdf") {
    return <PdfRenderer element={element} baseStyle={baseStyle} />;
  }

  if (element.type === "svg") {
    return <SvgRenderer element={element} baseStyle={baseStyle} />;
  }

  if (element.type === "lottie") {
    return <LottieRenderer element={element} baseStyle={baseStyle} />;
  }

  if (element.type === "qr") {
    return <QrCodeRenderer element={element} baseStyle={baseStyle} />;
  }

  if (element.type === "table") {
    return <TableRenderer element={element} baseStyle={baseStyle} />;
  }

  if (element.type === "chart") {
    return (
      <ChartRenderer
        element={element}
        baseStyle={baseStyle}
        pageElements={pageElements}
      />
    );
  }

  if (element.type === "form") {
    return <FormRenderer element={element} baseStyle={baseStyle} />;
  }

  if (element.type === "embed") {
    return <EmbedRenderer element={element} baseStyle={baseStyle} />;
  }

  if (element.type === "timer") {
    return <TimerRenderer element={element} baseStyle={baseStyle} />;
  }

  if (element.type === "sticky-note") {
    return <StickyNoteRenderer element={element} baseStyle={baseStyle} />;
  }

  if (element.type === "connector") {
    return (
      <ConnectorRenderer
        element={element}
        pageElements={pageElements}
        rendererId={rendererId}
        baseStyle={baseStyle}
      />
    );
  }

  if (element.type === "shape" && element.shape === "line") {
    return (
      <div
        style={{
          width: "100%",
          height: Math.max(1, element.strokeWidth),
          marginTop: Math.max(0, element.height / 2 - element.strokeWidth / 2),
          background: element.stroke || element.fill,
          opacity: element.opacity,
        }}
      />
    );
  }

  if (element.type === "shape") {
    return (
      <div
        style={{
          ...baseStyle,
          ...getCssFillStyle(element),
          border:
            element.strokeWidth > 0
              ? `${element.strokeWidth}px solid ${element.stroke}`
              : undefined,
          borderRadius: element.shape === "ellipse" ? "9999px" : element.radius,
        }}
      />
    );
  }

  return null;
}

function DocumentRenderer({
  element,
  baseStyle,
}: {
  element: Extract<DesignElement, { type: "document" }>;
  baseStyle: CSSProperties;
}) {
  return (
    <article
      style={{
        ...baseStyle,
        boxSizing: "border-box",
        overflow: "hidden",
        padding: element.padding,
        color: element.textColor,
        background: element.surfaceColor,
        border:
          element.borderWidth > 0
            ? `${element.borderWidth}px solid ${element.borderColor}`
            : undefined,
        borderRadius: element.radius,
        fontFamily: element.fontFamily,
        lineHeight: element.lineHeight,
      }}
    >
      <div
        style={{
          columnCount: element.columns,
          columnGap: element.columnGap,
          height: "100%",
        }}
      >
        {element.blocks.map((block) => {
          if (block.kind === "page-break") {
            return (
              <div
                key={block.id}
                style={{
                  breakBefore: "column",
                  margin: "18px 0",
                  borderTop: `1px dashed ${element.borderColor}`,
                  color: element.borderColor,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                Page break
              </div>
            );
          }

          const isHeading = block.kind === "heading";
          const isSubheading = block.kind === "subheading";
          const isQuote = block.kind === "quote";

          return (
            <section
              key={block.id}
              style={{
                breakInside: "avoid",
                marginBottom: isHeading ? 16 : 12,
              }}
            >
              {isHeading ? (
                <h2
                  style={{
                    margin: 0,
                    color: element.headingColor,
                    fontSize: 30,
                    lineHeight: 1.08,
                    fontWeight: 800,
                  }}
                >
                  {block.content}
                </h2>
              ) : isSubheading ? (
                <h3
                  style={{
                    margin: 0,
                    color: element.headingColor,
                    fontSize: 18,
                    lineHeight: 1.18,
                    fontWeight: 750,
                  }}
                >
                  {block.content}
                </h3>
              ) : (
                <p
                  style={{
                    margin: 0,
                    paddingLeft: isQuote ? 14 : 0,
                    borderLeft: isQuote
                      ? `3px solid ${element.headingColor}`
                      : undefined,
                    fontSize: 14,
                    fontStyle: isQuote ? "italic" : undefined,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {block.content}
                </p>
              )}
              {block.comment ? (
                <p
                  style={{
                    margin: "6px 0 0",
                    color: element.headingColor,
                    fontSize: 11,
                    fontWeight: 650,
                  }}
                >
                  Comment: {block.comment}
                </p>
              ) : null}
            </section>
          );
        })}
      </div>
    </article>
  );
}

function DrawStrokeRenderer({
  element,
  baseStyle,
}: {
  element: Extract<DesignElement, { type: "draw" }>;
  baseStyle: CSSProperties;
}) {
  return (
    <svg
      viewBox={`0 0 ${element.width} ${element.height}`}
      preserveAspectRatio="none"
      style={{
        ...baseStyle,
        display: "block",
        overflow: "visible",
      }}
      aria-hidden="true"
    >
      <path
        d={getDrawSvgPath(element.points)}
        fill="none"
        stroke={element.stroke}
        strokeWidth={element.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity={element.strokeOpacity}
      />
    </svg>
  );
}

function VectorPathRenderer({
  element,
  rendererId,
  baseStyle,
}: {
  element: Extract<DesignElement, { type: "path" }>;
  rendererId: string;
  baseStyle: CSSProperties;
}) {
  if (element.booleanOperation && element.booleanSourcePaths?.length) {
    return (
      <BooleanVectorPathRenderer
        element={element}
        rendererId={rendererId}
        baseStyle={baseStyle}
      />
    );
  }

  const fillPaint = element.closed
    ? getSvgFillPaint(element, `${rendererId}-${element.id}-fill`)
    : null;

  return (
    <svg
      viewBox={`0 0 ${element.width} ${element.height}`}
      preserveAspectRatio="none"
      style={{
        ...baseStyle,
        display: "block",
        overflow: "visible",
      }}
      aria-hidden="true"
    >
      {fillPaint ? (
        <SvgFillDefinitions definitions={fillPaint.definitions} />
      ) : null}
      <path
        d={getVectorPathData(element)}
        fill={fillPaint ? fillPaint.fill : "none"}
        stroke={element.stroke}
        strokeWidth={element.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fillRule={element.fillRule ?? "nonzero"}
        clipRule={element.fillRule ?? "nonzero"}
      />
    </svg>
  );
}

function BooleanVectorPathRenderer({
  element,
  rendererId,
  baseStyle,
}: {
  element: Extract<DesignElement, { type: "path" }>;
  rendererId: string;
  baseStyle: CSSProperties;
}) {
  const paths = element.booleanSourcePaths?.length
    ? element.booleanSourcePaths
    : [getVectorPathData(element)];
  const fillPaint = getSvgFillPaint(element, `${rendererId}-${element.id}-fill`);
  const maskIdBase = rendererId.replace(/[^a-zA-Z0-9_-]/g, "");
  const sourcePath = paths[0] ?? getVectorPathData(element);
  const operation = element.booleanOperation ?? "union";

  return (
    <svg
      viewBox={`0 0 ${element.width} ${element.height}`}
      preserveAspectRatio="none"
      style={{
        ...baseStyle,
        display: "block",
        overflow: "visible",
      }}
      aria-hidden="true"
    >
      <SvgFillDefinitions definitions={fillPaint.definitions} />
      {operation === "subtract" ? (
        <SubtractBooleanShape
          element={element}
          paths={paths}
          sourcePath={sourcePath}
          fill={fillPaint.fill}
          maskId={`${maskIdBase}-${element.id}-subtract`}
        />
      ) : operation === "intersect" ? (
        <IntersectBooleanShape
          element={element}
          paths={paths}
          sourcePath={sourcePath}
          fill={fillPaint.fill}
          maskIdBase={`${maskIdBase}-${element.id}-intersect`}
        />
      ) : (
        <path
          d={paths.join(" ")}
          fill={fillPaint.fill}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fillRule={operation === "exclude" ? "evenodd" : "nonzero"}
          clipRule={operation === "exclude" ? "evenodd" : "nonzero"}
        />
      )}
    </svg>
  );
}

function SubtractBooleanShape({
  element,
  paths,
  sourcePath,
  fill,
  maskId,
}: {
  element: Extract<DesignElement, { type: "path" }>;
  paths: readonly string[];
  sourcePath: string;
  fill: string;
  maskId: string;
}) {
  return (
    <>
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse">
          <rect width={element.width} height={element.height} fill="black" />
          <path d={sourcePath} fill="white" />
          {paths.slice(1).map((path, index) => (
            <path key={`${maskId}-${index}`} d={path} fill="black" />
          ))}
        </mask>
      </defs>
      <path
        d={sourcePath}
        fill={fill}
        stroke={element.stroke}
        strokeWidth={element.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        mask={`url(#${maskId})`}
      />
    </>
  );
}

function IntersectBooleanShape({
  element,
  paths,
  sourcePath,
  fill,
  maskIdBase,
}: {
  element: Extract<DesignElement, { type: "path" }>;
  paths: readonly string[];
  sourcePath: string;
  fill: string;
  maskIdBase: string;
}) {
  const masks = paths.slice(1);
  const shape = (
    <path
      d={sourcePath}
      fill={fill}
      stroke={element.stroke}
      strokeWidth={element.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
  const maskedShape = masks.reduce<ReactNode>(
    (children, _path, index) => (
      <g key={`${maskIdBase}-group-${index}`} mask={`url(#${maskIdBase}-${index})`}>
        {children}
      </g>
    ),
    shape,
  );

  return (
    <>
      <defs>
        {masks.map((path, index) => (
          <mask
            key={`${maskIdBase}-${index}`}
            id={`${maskIdBase}-${index}`}
            maskUnits="userSpaceOnUse"
          >
            <rect width={element.width} height={element.height} fill="black" />
            <path d={path} fill="white" />
          </mask>
        ))}
      </defs>
      {maskedShape}
    </>
  );
}

function StickyNoteRenderer({
  element,
  baseStyle,
}: {
  element: Extract<DesignElement, { type: "sticky-note" }>;
  baseStyle: CSSProperties;
}) {
  return (
    <div
      style={{
        ...baseStyle,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: element.fill,
        border: `2px solid ${element.accentColor}`,
        borderRadius: element.radius,
        boxShadow: "0 14px 30px rgba(15, 23, 42, 0.14)",
      }}
    >
      <div
        style={{
          height: 10,
          flex: "0 0 auto",
          background: element.accentColor,
        }}
      />
      <div
        style={{
          flex: 1,
          padding: 18,
          color: element.textColor,
          fontFamily: element.fontFamily,
          fontSize: element.fontSize,
          fontWeight: element.fontWeight,
          lineHeight: 1.2,
          whiteSpace: "pre-wrap",
          overflow: "hidden",
        }}
      >
        {element.content}
      </div>
    </div>
  );
}

function ConnectorRenderer({
  element,
  pageElements,
  rendererId,
  baseStyle,
}: {
  element: Extract<DesignElement, { type: "connector" }>;
  pageElements?: readonly DesignElement[];
  rendererId: string;
  baseStyle: CSSProperties;
}) {
  const geometry = getConnectorPathGeometry(element, pageElements);
  const idBase = rendererId.replace(/[^a-zA-Z0-9_-]/g, "");
  const startMarkerId = `${idBase}-${element.id}-start`;
  const endMarkerId = `${idBase}-${element.id}-end`;
  const labelBox = element.label ? getConnectorLabelBox(element, geometry) : null;

  return (
    <svg
      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
      preserveAspectRatio="none"
      style={{
        ...baseStyle,
        display: "block",
        overflow: "visible",
      }}
    >
      <defs>
        <ConnectorMarkerDef
          id={startMarkerId}
          marker={element.startMarker}
          color={element.stroke}
          reverse
        />
        <ConnectorMarkerDef
          id={endMarkerId}
          marker={element.endMarker}
          color={element.stroke}
        />
      </defs>
      <path
        d={geometry.path}
        fill="none"
        stroke={element.stroke}
        strokeWidth={element.strokeWidth}
        strokeDasharray={getConnectorStrokeDashArray(element)}
        strokeLinecap="round"
        strokeLinejoin="round"
        markerStart={
          element.startMarker === "none" ? undefined : `url(#${startMarkerId})`
        }
        markerEnd={
          element.endMarker === "none" ? undefined : `url(#${endMarkerId})`
        }
      />
      {element.label ? (
        <>
          {labelBox ? (
            <rect
              x={labelBox.x}
              y={labelBox.y}
              width={labelBox.width}
              height={labelBox.height}
              rx={labelBox.radius}
              fill={labelBox.fill}
              fillOpacity={labelBox.fillOpacity}
              stroke={labelBox.stroke}
              strokeOpacity={labelBox.strokeOpacity}
            />
          ) : null}
          <text
            x={geometry.labelX}
            y={geometry.labelY}
            fill={element.labelColor}
            fontFamily="Geist, Arial, sans-serif"
            fontSize={element.labelFontSize}
            fontWeight={700}
            textAnchor="middle"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth={4}
            strokeLinejoin="round"
          >
            {element.label}
          </text>
        </>
      ) : null}
    </svg>
  );
}

function getConnectorStrokeDashArray(
  element: Extract<DesignElement, { type: "connector" }>,
) {
  if (element.strokeStyle === "dashed") {
    return `${element.strokeWidth * 3} ${element.strokeWidth * 2}`;
  }

  if (element.strokeStyle === "dotted") {
    return `0 ${element.strokeWidth * 2.2}`;
  }

  return undefined;
}

function getConnectorLabelBox(
  element: Extract<DesignElement, { type: "connector" }>,
  geometry: ReturnType<typeof getConnectorPathGeometry>,
) {
  if ((element.labelBackground ?? "none") === "none") return null;

  const paddingX = Math.max(8, element.labelFontSize * 0.45);
  const paddingY = Math.max(4, element.labelFontSize * 0.2);
  const width = element.label.length * element.labelFontSize * 0.58 + paddingX * 2;
  const height = element.labelFontSize * 1.2 + paddingY * 2;
  const background = element.labelBackground ?? "none";

  return {
    x: geometry.labelX - width / 2,
    y: geometry.labelY - height * 0.72,
    width,
    height,
    radius: Math.max(4, element.labelFontSize * 0.3),
    fill: background === "line" ? element.stroke : "#ffffff",
    fillOpacity: background === "line" ? 0.16 : 0.92,
    stroke: background === "line" ? element.stroke : "#e2e8f0",
    strokeOpacity: background === "line" ? 0.32 : 0.85,
  };
}

function ConnectorMarkerDef({
  id,
  marker,
  color,
  reverse = false,
}: {
  id: string;
  marker: "none" | "arrow" | "dot";
  color: string;
  reverse?: boolean;
}) {
  if (marker === "none") return null;

  if (marker === "dot") {
    return (
      <marker
        id={id}
        viewBox="0 0 10 10"
        refX="5"
        refY="5"
        markerWidth="4"
        markerHeight="4"
        orient="auto"
      >
        <circle cx="5" cy="5" r="4" fill={color} />
      </marker>
    );
  }

  return (
    <marker
      id={id}
      viewBox="0 0 10 10"
      refX={reverse ? "2" : "8"}
      refY="5"
      markerWidth="5"
      markerHeight="5"
      orient="auto-start-reverse"
    >
      <path d={reverse ? "M 8 1 L 1 5 L 8 9 z" : "M 1 1 L 9 5 L 1 9 z"} fill={color} />
    </marker>
  );
}

function VideoRenderer({
  element,
  baseStyle,
  renderTimeSeconds,
}: {
  element: Extract<DesignElement, { type: "video" }>;
  baseStyle: CSSProperties;
  renderTimeSeconds?: number;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaSource = getMediaSourceWithTrim(element);
  const transitionIn = getVideoTransitionIn(element);
  const transitionDuration = getVideoTransitionDuration(element);
  const exportPlaybackTime = getTimelineMediaPlaybackTime(
    element,
    renderTimeSeconds,
  );
  const isTimelineExportFrame = typeof renderTimeSeconds === "number";

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    video.volume = getMediaVolume(element);

    if (exportPlaybackTime !== null) {
      if (video.readyState === 0) {
        video.load();
      }

      if (Math.abs(video.currentTime - exportPlaybackTime) > 0.04) {
        try {
          video.currentTime = exportPlaybackTime;
        } catch {
          // Some browsers reject seeks before metadata is ready; the frame wait will retry on the next paint.
        }
      }
    }
  }, [element, exportPlaybackTime]);

  return (
    <video
      ref={videoRef}
      data-essence-export-video={isTimelineExportFrame ? "true" : undefined}
      src={mediaSource}
      controls={isTimelineExportFrame ? false : element.showControls}
      muted={element.muted}
      loop={element.loop}
      autoPlay={element.autoplay}
      playsInline
      preload="metadata"
      style={{
        ...baseStyle,
        ...(isTimelineExportFrame
          ? getVideoTimelineContentStyle(element, renderTimeSeconds)
          : {
              animation: getVideoClipTransitionAnimation(
                transitionIn,
                transitionDuration,
              ),
            }),
        objectFit: element.objectFit,
      }}
    />
  );
}

function AudioRenderer({
  element,
  baseStyle,
}: {
  element: Extract<DesignElement, { type: "audio" }>;
  baseStyle: CSSProperties;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaSource = getMediaSourceWithTrim(element);
  const trimStart = getMediaTrimStart(element);
  const trimEnd =
    getMediaTrimEnd(element) ?? trimStart + getMediaTimelineDuration(element);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) return;

    audio.volume = getMediaEffectiveVolume(
      element,
      audio.currentTime,
      trimStart,
      trimEnd,
    );
  }, [element, trimEnd, trimStart]);

  function updateAudioVolume(audio: HTMLAudioElement) {
    audio.volume = getMediaEffectiveVolume(
      element,
      audio.currentTime,
      trimStart,
      trimEnd,
    );
  }

  const metadataLabel = [element.licenseName, element.sourceProvider]
    .filter(Boolean)
    .join(" / ");

  return (
    <div
      style={{
        ...baseStyle,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: Math.max(8, element.padding / 2),
        padding: element.padding,
        color: element.textColor,
        background: element.surfaceColor,
        border:
          element.borderWidth > 0
            ? `${element.borderWidth}px solid ${element.borderColor}`
            : undefined,
        borderRadius: element.radius,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          minWidth: 0,
          fontFamily: "Geist, Arial, sans-serif",
          fontWeight: 700,
          fontSize: Math.max(14, Math.min(22, element.height * 0.16)),
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 14,
            height: 14,
            flex: "0 0 auto",
            borderRadius: 999,
            background: element.accentColor,
          }}
        />
        <span
          style={{
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            lineHeight: 1.15,
          }}
        >
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {element.title}
          </span>
          {metadataLabel ? (
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: "0.68em",
                fontWeight: 500,
                color: element.accentColor,
              }}
            >
              {metadataLabel}
            </span>
          ) : null}
        </span>
      </div>
      {element.showControls ? (
        <audio
          ref={audioRef}
          src={mediaSource}
          controls
          loop={element.loop}
          preload="metadata"
          onLoadedMetadata={(event) => updateAudioVolume(event.currentTarget)}
          onPlay={(event) => updateAudioVolume(event.currentTarget)}
          onTimeUpdate={(event) => updateAudioVolume(event.currentTarget)}
          style={{
            width: "100%",
            accentColor: element.accentColor,
          }}
        />
      ) : null}
    </div>
  );
}

function PdfRenderer({
  element,
  baseStyle,
}: {
  element: Extract<DesignElement, { type: "pdf" }>;
  baseStyle: CSSProperties;
}) {
  const pageNumber = Math.max(1, Math.round(element.pageNumber));
  const toolbarParam = element.showToolbar ? "1" : "0";
  const pdfSource = `${element.src}#page=${pageNumber}&toolbar=${toolbarParam}`;

  return (
    <div
      style={{
        ...baseStyle,
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr)",
        gap: Math.max(6, element.padding * 0.45),
        padding: element.padding,
        color: element.textColor,
        background: element.surfaceColor,
        border:
          element.borderWidth > 0
            ? `${element.borderWidth}px solid ${element.borderColor}`
            : undefined,
        borderRadius: element.radius,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          minWidth: 0,
          fontFamily: "Geist, Arial, sans-serif",
          fontSize: Math.max(12, Math.min(18, element.height * 0.04)),
          fontWeight: 700,
        }}
      >
        <span
          style={{
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {element.title}
        </span>
        <span
          style={{
            flex: "0 0 auto",
            color: element.accentColor,
            fontSize: "0.8em",
          }}
        >
          Page {pageNumber}
        </span>
      </div>
      <iframe
        src={pdfSource}
        title={element.title || "Imported PDF"}
        loading="lazy"
        style={{
          width: "100%",
          height: "100%",
          minHeight: 0,
          border: 0,
          borderRadius: Math.max(0, element.radius - element.padding * 0.4),
          background: "#f8fafc",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

function SvgRenderer({
  element,
  baseStyle,
}: {
  element: Extract<DesignElement, { type: "svg" }>;
  baseStyle: CSSProperties;
}) {
  const svgMarkup = getSafeSvgMarkup(element);

  if (!svgMarkup) {
    return (
      <div
        style={{
          ...baseStyle,
          display: "grid",
          placeItems: "center",
          background: "#f8fafc",
          color: "#71717a",
          fontSize: 14,
        }}
      >
        SVG unavailable
      </div>
    );
  }

  return (
    <div
      style={{
        ...baseStyle,
        color: element.fillColor,
        fill: element.fillColor,
        stroke: element.strokeColor,
        strokeWidth: element.preserveColors ? undefined : element.strokeWidth,
      }}
      dangerouslySetInnerHTML={{
        __html: svgMarkup,
      }}
    />
  );
}

function getSafeSvgMarkup(element: Extract<DesignElement, { type: "svg" }>) {
  try {
    return getRenderableSvgMarkup(element.svgText, element.preserveColors);
  } catch {
    return null;
  }
}

function TableRenderer({
  element,
  baseStyle,
}: {
  element: Extract<DesignElement, { type: "table" }>;
  baseStyle: CSSProperties;
}) {
  const activeSheet = getActiveTableSheet(element);
  const tableView = createTableView(element);
  const rows = Math.max(1, tableView.rows.length);
  const columns = clampTableColumns(activeSheet.columns);
  const border = `${Math.max(0, element.borderWidth)}px solid ${
    element.borderColor
  }`;
  const freezeHeader =
    Boolean(activeSheet.headerRow) && (activeSheet.freezeHeaderRow ?? true);

  return (
    <div
      style={{
        ...baseStyle,
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        border,
        background: element.bodyFill,
        color: element.textColor,
        fontFamily: element.fontFamily,
        fontSize: element.fontSize,
        fontWeight: element.fontWeight,
        overflow: freezeHeader ? "auto" : "hidden",
      }}
    >
      {Array.from({ length: rows * columns }, (_, index) => {
        const rowIndex = Math.floor(index / columns);
        const columnIndex = index % columns;
        const row = tableView.rows[rowIndex];
        const isHeader = Boolean(row?.isHeader);
        const cellValue = row?.cells[columnIndex] ?? "";
        const rawFormula =
          row?.sourceRowIndex !== null && row?.sourceRowIndex !== undefined
            ? getTableCellDisplayValue(
                element,
                row.sourceRowIndex,
                columnIndex,
              )
            : null;
        const cellStyle =
          row?.sourceRowIndex !== null && row?.sourceRowIndex !== undefined
            ? getTableCellStyle(element, row.sourceRowIndex, columnIndex)
            : {};
        const textAlign = cellStyle.textAlign ?? "left";

        return (
          <div
            key={`${rowIndex}-${columnIndex}`}
            title={rawFormula?.isFormula ? rawFormula.rawValue : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              minWidth: 0,
              minHeight: 0,
              overflow: "hidden",
              padding: element.cellPadding,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              background:
                cellStyle.fill ??
                (isHeader ? element.headerFill : element.bodyFill),
              color:
                rawFormula?.error ? "#dc2626" : (cellStyle.textColor ?? undefined),
              fontStyle: row?.isEmptyState ? "italic" : undefined,
              justifyContent:
                textAlign === "center"
                  ? "center"
                  : textAlign === "right"
                    ? "flex-end"
                    : "flex-start",
              textAlign,
              borderRight: columnIndex < columns - 1 ? border : undefined,
              borderBottom: rowIndex < rows - 1 ? border : undefined,
              position: freezeHeader && isHeader ? "sticky" : undefined,
              top: freezeHeader && isHeader ? 0 : undefined,
              zIndex: freezeHeader && isHeader ? 1 : undefined,
              fontWeight:
                cellStyle.fontWeight ??
                (isHeader ? Math.max(600, element.fontWeight) : undefined),
            }}
          >
            {cellValue}
          </div>
        );
      })}
    </div>
  );
}

function QrCodeRenderer({
  element,
  baseStyle,
}: {
  element: Extract<DesignElement, { type: "qr" }>;
  baseStyle: CSSProperties;
}) {
  const matrix = getQrMatrixPath(
    element.qrValue,
    element.qrErrorCorrection ?? "M",
  );
  const margin = Math.max(0, Math.min(8, element.qrMargin ?? 4));
  const viewBoxStart = -margin;
  const viewBoxSize = matrix.size + margin * 2;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`${viewBoxStart} ${viewBoxStart} ${viewBoxSize} ${viewBoxSize}`}
      preserveAspectRatio="xMidYMid meet"
      shapeRendering="crispEdges"
      style={baseStyle}
    >
      <rect
        x={viewBoxStart}
        y={viewBoxStart}
        width={viewBoxSize}
        height={viewBoxSize}
        fill={element.qrBackground}
      />
      <path d={matrix.path} fill={element.qrForeground} />
    </svg>
  );
}

function CurvedTextRenderer({
  element,
  rendererId,
  baseStyle,
}: {
  element: Extract<DesignElement, { type: "text" }>;
  rendererId: string;
  baseStyle: CSSProperties;
}) {
  const safeId = rendererId.replace(/[^a-z0-9-_]+/gi, "");
  const pathId = `${safeId}-curve-path`;
  const gradientId = `${safeId}-curve-gradient`;
  const curveAmount = element.textCurveAmount ?? 50;
  const path = getCurvedTextPath(element, curveAmount);
  const textAnchor =
    element.textAlign === "center"
      ? "middle"
      : element.textAlign === "right"
        ? "end"
        : "start";
  const startOffset =
    element.textAlign === "center"
      ? "50%"
      : element.textAlign === "right"
        ? "100%"
        : "0%";
  const effect = element.textEffect ?? "none";
  const strokeWidth =
    effect === "outline" ? Math.max(0, element.textOutlineWidth ?? 2) : 0;
  const visibleContent = element.content.replace(/\s*\r?\n\s*/g, " ") || " ";

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${element.width} ${element.height}`}
      preserveAspectRatio="none"
      style={baseStyle}
    >
      <defs>
        <path id={pathId} d={path} />
        {element.textGradientEnabled ? (
          <linearGradient
            id={gradientId}
            gradientTransform={`rotate(${element.textGradientAngle ?? 90})`}
          >
            <stop
              offset="0%"
              stopColor={element.textGradientFrom ?? "#0ea5e9"}
            />
            <stop
              offset="100%"
              stopColor={element.textGradientTo ?? "#a855f7"}
            />
          </linearGradient>
        ) : null}
      </defs>
      <text
        fill={
          element.textGradientEnabled ? `url(#${gradientId})` : element.color
        }
        stroke={
          strokeWidth > 0 ? (element.textEffectColor ?? "#0f172a") : "none"
        }
        strokeWidth={strokeWidth}
        paintOrder={strokeWidth > 0 ? "stroke fill" : undefined}
        textAnchor={textAnchor}
        dominantBaseline="middle"
        style={{
          fontFamily: element.fontFamily,
          fontSize: element.fontSize,
          fontWeight: element.fontWeight,
          letterSpacing: element.letterSpacing,
          filter: getCurvedTextFilter(element),
        }}
      >
        <textPath href={`#${pathId}`} startOffset={startOffset}>
          {visibleContent}
        </textPath>
      </text>
    </svg>
  );
}

function getCurvedTextPath(
  element: Extract<DesignElement, { type: "text" }>,
  curveAmount: number,
) {
  const padding = Math.max(8, element.fontSize * 0.25);
  const startX = padding;
  const endX = Math.max(startX + 1, element.width - padding);
  const baselineY = element.height / 2;
  const clampedCurveAmount = Math.max(-100, Math.min(100, curveAmount));
  const controlY =
    baselineY - (clampedCurveAmount / 100) * element.height * 0.45;

  if (Math.abs(curveAmount) < 1) {
    return `M ${startX} ${baselineY} L ${endX} ${baselineY}`;
  }

  return `M ${startX} ${baselineY} Q ${element.width / 2} ${controlY} ${endX} ${baselineY}`;
}

function getCurvedTextFilter(
  element: Extract<DesignElement, { type: "text" }>,
) {
  const effect = element.textEffect ?? "none";

  if (effect === "shadow" || effect === "glow") {
    const color = element.textEffectColor ?? "#0f172a";
    const blur = element.textEffectBlur ?? 8;
    const x = effect === "shadow" ? (element.textEffectOffsetX ?? 2) : 0;
    const y = effect === "shadow" ? (element.textEffectOffsetY ?? 2) : 0;

    return `drop-shadow(${x}px ${y}px ${blur}px ${color})`;
  }

  return undefined;
}

function getTextEffectStyle(
  element: Extract<DesignElement, { type: "text" }>,
): CSSProperties {
  const effect = element.textEffect ?? "none";
  const color = element.textEffectColor ?? "#0f172a";
  const blur = element.textEffectBlur ?? 8;

  if (effect === "shadow") {
    return {
      textShadow: `${element.textEffectOffsetX ?? 2}px ${
        element.textEffectOffsetY ?? 2
      }px ${blur}px ${color}`,
    };
  }

  if (effect === "glow") {
    return {
      textShadow: `0 0 ${blur}px ${color}`,
    };
  }

  if (effect === "outline") {
    return {
      WebkitTextStroke: `${element.textOutlineWidth ?? 2}px ${color}`,
      paintOrder: "stroke fill",
    };
  }

  return {};
}

function getTextFillStyle(
  element: Extract<DesignElement, { type: "text" }>,
): CSSProperties {
  if (!element.textGradientEnabled) {
    return {
      color: element.color,
    };
  }

  return {
    backgroundImage: `linear-gradient(${element.textGradientAngle ?? 90}deg, ${
      element.textGradientFrom ?? "#0ea5e9"
    }, ${element.textGradientTo ?? "#a855f7"})`,
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    color: "transparent",
    WebkitTextFillColor: "transparent",
  };
}

function ImageSvgFilter({
  element,
  filterId,
}: {
  element: Extract<DesignElement, { type: "image" }>;
  filterId: string;
}) {
  const duotoneEnabled = element.duotoneEnabled ?? false;
  const sharpen = element.filterSharpen ?? 0;
  const tables = getDuotoneTables(element);
  const sharpenInput = duotoneEnabled ? "duotoneResult" : "SourceGraphic";

  return (
    <svg aria-hidden="true" className="absolute h-0 w-0">
      <filter
        id={filterId}
        colorInterpolationFilters="sRGB"
        x="-10%"
        y="-10%"
        width="120%"
        height="120%"
      >
        {duotoneEnabled ? (
          <>
            <feColorMatrix
              in="SourceGraphic"
              result="duotoneLuma"
              type="matrix"
              values="0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0 0 0 1 0"
            />
            <feComponentTransfer in="duotoneLuma" result="duotoneColor">
              <feFuncR type="table" tableValues={tables.r} />
              <feFuncG type="table" tableValues={tables.g} />
              <feFuncB type="table" tableValues={tables.b} />
            </feComponentTransfer>
            <feColorMatrix
              in="duotoneColor"
              result="duotoneMix"
              type="matrix"
              values={`1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 ${tables.opacity} 0`}
            />
            <feComposite
              in="duotoneMix"
              in2="SourceGraphic"
              operator="over"
              result="duotoneResult"
            />
          </>
        ) : null}
        {sharpen > 0 ? (
          <feConvolveMatrix
            in={sharpenInput}
            order="3"
            kernelMatrix={getSharpenKernelMatrix(sharpen)}
            preserveAlpha
            edgeMode="duplicate"
          />
        ) : null}
      </filter>
    </svg>
  );
}
