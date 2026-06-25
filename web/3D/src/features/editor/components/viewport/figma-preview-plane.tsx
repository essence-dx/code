"use client";

import { Edges, Html } from "@react-three/drei";
import * as THREE from "three";
import type { SceneObject } from "../../types";

const pixelsPerWorldUnit = 180;

export function FigmaPreviewPlane({ clippingPlanes = [], object, selected = false }: { clippingPlanes?: THREE.Plane[]; object: SceneObject; selected?: boolean }) {
  const figma = object.figma;
  const width = figma?.width ?? 3.2;
  const height = figma?.height ?? 2.1;
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

      {figma?.embedUrl ? (
        <Html center distanceFactor={1} occlude={false} position={[0, 0, 0.032]} transform zIndexRange={[80, 0]}>
          <div
            style={{
              background: "#ffffff",
              border: selected ? "2px solid #ffffff" : "1px solid rgba(255,255,255,0.28)",
              borderRadius: 10,
              boxShadow: "0 18px 48px rgba(0,0,0,0.28)",
              height: iframeHeight,
              overflow: "hidden",
              pointerEvents: "auto",
              width: iframeWidth,
            }}
          >
            <iframe
              allow="fullscreen"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
              src={figma.embedUrl}
              style={{ border: 0, display: "block", height: "100%", width: "100%" }}
              title={figma.name}
            />
          </div>
        </Html>
      ) : null}
    </group>
  );
}
