import { useEffect, useMemo, useRef, useState } from "react";
import { LiquidGlassRenderer } from "./core/LiquidGlassRenderer";
import {
  resolveLiquidGlassSettings,
  type LiquidGlassSettings,
  type LiquidGlassVariant
} from "./core/types";

export interface LiquidGlassIconButtonProps {
  active?: boolean;
  defaultActive?: boolean;
  disabled?: boolean;
  backgroundImage: string;
  variant?: LiquidGlassVariant;
  shape?: "circle" | "squircle" | "rounded" | "capsule";
  size?: "regular" | "compact";
  settings?: Partial<LiquidGlassSettings>;
  onActiveChange?: (active: boolean) => void;
  className?: string;
  children?: React.ReactNode;
  "aria-label"?: string;
}

function FlashlightIcon() {
  return (
    <svg viewBox="0 0 32 48" aria-hidden="true">
      <path d="M7 2h18v5l-4 7v27c0 3-2 5-5 5s-5-2-5-5V14L7 7V2Z" fill="currentColor" />
      <path d="M7 8h18" fill="none" stroke="var(--lg-icon-cutout)" strokeWidth="2.6" />
      <circle cx="16" cy="29" r="3" fill="var(--lg-icon-cutout)" />
    </svg>
  );
}

export function LiquidGlassIconButton({
  active,
  defaultActive = false,
  disabled = false,
  backgroundImage,
  variant = "dark",
  shape = "circle",
  size = "regular",
  settings,
  onActiveChange,
  className = "",
  children,
  "aria-label": ariaLabel = "Liquid glass action"
}: LiquidGlassIconButtonProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<LiquidGlassRenderer | null>(null);
  const [internalActive, setInternalActive] = useState(defaultActive);
  const [pressed, setPressed] = useState(false);
  const currentActive = active ?? internalActive;
  const geometry = useMemo(() => {
    if (shape === "capsule" && size === "compact") {
      return { width: 88, height: 40, lensWidth: 84, lensHeight: 36, radius: 18 };
    }
    if (shape === "capsule") return { width: 132, height: 72, lensWidth: 124, lensHeight: 64, radius: 32 };
    if (shape === "squircle") return { width: 96, height: 96, lensWidth: 88, lensHeight: 88, radius: 28 };
    if (shape === "rounded") return { width: 96, height: 96, lensWidth: 88, lensHeight: 88, radius: 20 };
    return { width: 96, height: 96, lensWidth: 88, lensHeight: 88, radius: 44 };
  }, [shape, size]);
  const mergedSettings = useMemo(() => resolveLiquidGlassSettings(variant, {
    depth: 46,
    blur: .22,
    refraction: .46,
    chromaticAberration: .035,
    edgeHighlight: .12,
    specular: .18,
    fresnel: 1.05,
    darkTint: .22,
    tintStrength: .08,
    opacity: 1,
    bevel: 0,
    ...settings,
    lensWidth: geometry.lensWidth,
    lensHeight: geometry.lensHeight,
    radius: geometry.radius
  }), [geometry, settings, variant]);

  const commit = () => {
    const next = !currentActive;
    if (active === undefined) setInternalActive(next);
    onActiveChange?.(next);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const renderer = new LiquidGlassRenderer(canvas, backgroundImage, mergedSettings);
      renderer.setBackgroundSampling(true);
      renderer.resize(geometry.width, geometry.height);
      renderer.setTrack(-1000, -900, -1000, -950);
      renderer.setGeometry(geometry.width / 2, geometry.height / 2, 0, false, 1, 1, 0);
      rendererRef.current = renderer;
    } catch (error) {
      console.warn(error);
    }
    return () => {
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, [geometry.height, geometry.width]);

  useEffect(() => {
    rendererRef.current?.setImage(backgroundImage);
  }, [backgroundImage]);

  useEffect(() => {
    rendererRef.current?.setSettings(mergedSettings);
    rendererRef.current?.setGeometry(
      geometry.width / 2,
      geometry.height / 2,
      pressed ? .025 : 0,
      pressed,
      1,
      1,
      0
    );
  }, [geometry.height, geometry.width, mergedSettings, pressed]);

  return (
    <button
      type="button"
      className={`lg-icon-button lg-icon-button--${shape} lg-icon-button--${size} ${currentActive ? "is-active" : ""} ${pressed ? "is-pressed" : ""} ${className}`}
      aria-label={ariaLabel}
      aria-pressed={currentActive}
      disabled={disabled}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onClick={commit}
    >
      <canvas ref={canvasRef} className="lg-icon-button__glass" aria-hidden="true" />
      <span className="lg-icon-button__active-surface" aria-hidden="true" />
      <span className="lg-icon-button__icon">{children ?? <FlashlightIcon />}</span>
    </button>
  );
}
