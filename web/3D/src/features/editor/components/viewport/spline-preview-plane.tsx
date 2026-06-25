"use client";

import { memo } from "react";
import { Edges, Html } from "@react-three/drei";
import * as THREE from "three";
import type { SceneObject } from "../../types";

const pixelsPerWorldUnit = 180;

const SplineEmbedFrame = memo(function SplineEmbedFrame({
  height,
  name,
  selected,
  url,
  width,
}: {
  height: number;
  name: string;
  selected: boolean;
  url: string;
  width: number;
}) {
  return (
    <div
      style={{
        background: "#09090b",
        border: selected
          ? "2px solid #ffffff"
          : "1px solid rgba(255,255,255,0.28)",
        borderRadius: 10,
        boxShadow: "0 18px 48px rgba(0,0,0,0.28)",
        height,
        overflow: "hidden",
        pointerEvents: "auto",
        width,
      }}
    >
      <iframe
        allow="accelerometer; fullscreen; gyroscope; xr-spatial-tracking"
        allowFullScreen
        loading="eager"
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
        src={url}
        style={{ border: 0, display: "block", height: "100%", width: "100%" }}
        title={name}
      />
    </div>
  );
});

export function SplinePreviewPlane({ clippingPlanes = [], object, selected = false }: { clippingPlanes?: THREE.Plane[]; object: SceneObject; selected?: boolean }) {
  const spline = object.spline;
  const width = spline?.width ?? 3.6;
  const height = spline?.height ?? 2.25;
  const iframeWidth = Math.round(width * pixelsPerWorldUnit);
  const iframeHeight = Math.round(height * pixelsPerWorldUnit);

  return (
    <group>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, height, 0.035]} />
        <meshStandardMaterial
          clippingPlanes={clippingPlanes.length ? clippingPlanes : undefined}
          color={object.material.color}
          metalness={0}
          opacity={Math.min(0.72, Math.max(0.12, object.material.opacity * 0.22))}
          roughness={0.78}
          side={THREE.DoubleSide}
          transparent
          wireframe={object.material.wireframe}
        />
        {selected ? <Edges color="#ffffff" scale={1.01} threshold={15} /> : null}
      </mesh>

      {spline?.embedUrl ? (
        <Html center distanceFactor={1} occlude={false} position={[0, 0, 0.032]} transform zIndexRange={[80, 0]}>
          <SplineEmbedFrame
            height={iframeHeight}
            name={spline.name}
            selected={selected}
            url={spline.embedUrl}
            width={iframeWidth}
          />
        </Html>
      ) : null}
    </group>
  );
}
