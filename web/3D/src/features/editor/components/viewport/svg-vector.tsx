"use client";

import { useMemo } from "react";
import { Edges } from "@react-three/drei";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import type { SceneObject } from "../../types";

function decodeDataUrl(dataUrl: string) {
  const [header, payload] = dataUrl.split(",", 2);

  if (!payload) {
    return dataUrl;
  }

  return header.includes(";base64") ? atob(payload) : decodeURIComponent(payload);
}

export function SvgVector({ object, selected = false }: { object: SceneObject; selected?: boolean }) {
  const svg = object.svg;
  const paths = useMemo(() => {
    if (!svg?.sourceDataUrl) {
      return [];
    }

    try {
      return new SVGLoader().parse(decodeDataUrl(svg.sourceDataUrl)).paths;
    } catch {
      return [];
    }
  }, [svg?.sourceDataUrl]);
  const width = svg?.width ?? 2;
  const height = svg?.height ?? 2;
  const scaleX = width / (svg?.viewBoxWidth ?? 100);
  const scaleY = height / (svg?.viewBoxHeight ?? 100);

  return (
    <group>
      <group position={[-width / 2, height / 2, 0]} scale={[scaleX, -scaleY, 1]}>
        <group position={[-(svg?.viewBoxMinX ?? 0), -(svg?.viewBoxMinY ?? 0), 0]}>
          {paths.flatMap((path, pathIndex) =>
            SVGLoader.createShapes(path).map((shape, shapeIndex) => (
              <mesh key={`${pathIndex}-${shapeIndex}`}>
                <shapeGeometry args={[shape]} />
                <meshBasicMaterial color={object.material.color || path.color || "#ffffff"} opacity={object.material.opacity} side={THREE.DoubleSide} transparent wireframe={object.material.wireframe} />
              </mesh>
            )),
          )}
        </group>
      </group>
      {selected ? (
        <mesh>
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial opacity={0} transparent />
          <Edges color="#e8fff8" scale={1.02} threshold={15} />
        </mesh>
      ) : null}
    </group>
  );
}
