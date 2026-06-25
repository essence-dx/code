"use client";

import * as THREE from "three";
import { resolveTwoDLayerSettings, twoDPixelsToWorldUnits } from "../../scene/two-d";
import type { SceneObject, TwoDPostProcessEffect } from "../../types";
import { PrimitiveGeometry } from "./primitive-geometry";
import { resolveTwoDBlendSettings } from "./two-d-material-effects";

const blurSteps = [0.45, 0.75, 1];
const backdropBlurSteps = [0.35, 0.65, 0.9, 1.15];

function PostProcessBackdropBlur({
  clipping,
  effect,
  heightWorld,
  object,
  widthWorld,
}: {
  clipping?: THREE.Plane[];
  effect: TwoDPostProcessEffect;
  heightWorld: number;
  object: SceneObject;
  widthWorld: number;
}) {
  const blurWorld = twoDPixelsToWorldUnits(effect.radius);

  if (effect.amount <= 0 || effect.radius <= 0) {
    return null;
  }

  return (
    <group>
      {backdropBlurSteps.map((step, index) => {
        const scaleX = widthWorld > 0 ? 1 + (blurWorld * step) / widthWorld : 1;
        const scaleY = heightWorld > 0 ? 1 + (blurWorld * step) / heightWorld : 1;

        return (
          <mesh key={`${effect.id}-${step}`} position={[0, 0, -0.014 - index * 0.003]} scale={[scaleX, scaleY, 1]}>
            <PrimitiveGeometry object={object} />
            <meshBasicMaterial
              blending={THREE.CustomBlending}
              blendDst={THREE.OneMinusSrcAlphaFactor}
              blendEquation={THREE.AddEquation}
              blendSrc={THREE.SrcAlphaFactor}
              clippingPlanes={clipping}
              color="#ffffff"
              depthWrite={false}
              opacity={Math.min(0.18, effect.amount * (0.055 - index * 0.007))}
              side={THREE.DoubleSide}
              toneMapped={false}
              transparent
            />
          </mesh>
        );
      })}
    </group>
  );
}

function PostProcessOverlay({
  clipping,
  effect,
  object,
}: {
  clipping?: THREE.Plane[];
  effect: TwoDPostProcessEffect;
  object: SceneObject;
}) {
  if (effect.amount <= 0) {
    return null;
  }

  const overlay =
    effect.kind === "brightness"
      ? { color: effect.amount >= 1 ? "#ffffff" : "#020617", opacity: Math.min(0.22, Math.abs(effect.amount - 1) * 0.22) }
      : effect.kind === "contrast"
        ? { color: object.material.color, opacity: Math.min(0.16, Math.abs(effect.amount - 1) * 0.18) }
        : effect.kind === "saturate"
          ? { color: object.material.color, opacity: Math.min(0.2, Math.abs(effect.amount - 1) * 0.18) }
          : effect.kind === "hueRotate"
            ? { color: new THREE.Color(object.material.color).offsetHSL(effect.amount / 360, 0, 0).getStyle(), opacity: Math.min(0.16, Math.abs(effect.amount) / 360) }
            : { color: "#f8fafc", opacity: Math.min(0.2, effect.amount * 0.16) };

  if (overlay.opacity <= 0) {
    return null;
  }

  return (
    <mesh position={[0, 0, 0.014]}>
      <PrimitiveGeometry object={object} />
      <meshBasicMaterial
        blending={THREE.NormalBlending}
        clippingPlanes={clipping}
        color={overlay.color}
        depthWrite={false}
        opacity={overlay.opacity}
        side={THREE.DoubleSide}
        toneMapped={false}
        transparent
      />
    </mesh>
  );
}

export function TwoDLayerFilter({ clippingPlanes = [], object }: { clippingPlanes?: THREE.Plane[]; object: SceneObject }) {
  const settings = resolveTwoDLayerSettings(object);

  if (!settings) {
    return null;
  }

  const postProcessEffects = settings.postProcessEffects.filter((effect) => effect.enabled);
  const showLegacyFilter = settings.filterKind !== "none" && settings.filterIntensity > 0;

  if (!showLegacyFilter && postProcessEffects.length === 0) {
    return null;
  }

  const widthWorld = twoDPixelsToWorldUnits(settings.width);
  const heightWorld = twoDPixelsToWorldUnits(settings.height);
  const blurWorld = twoDPixelsToWorldUnits(settings.filterBlur);
  const clipping = clippingPlanes.length ? clippingPlanes : undefined;

  const blendSettings = resolveTwoDBlendSettings(settings.blendMode);
  const overlayOpacity = settings.filterKind === "glass" ? settings.filterIntensity * 0.16 : settings.filterIntensity * 0.34;
  const overlayColor = settings.filterKind === "glass" ? "#ffffff" : settings.filterColor;

  return (
    <group>
      {showLegacyFilter && settings.filterKind === "blur" ? (
        <group>
          {blurSteps.map((step, index) => {
            const scaleX = widthWorld > 0 ? 1 + (blurWorld * step) / widthWorld : 1;
            const scaleY = heightWorld > 0 ? 1 + (blurWorld * step) / heightWorld : 1;

            return (
              <mesh key={step} position={[0, 0, -0.008 - index * 0.002]} scale={[scaleX, scaleY, 1]}>
                <PrimitiveGeometry object={object} />
                <meshBasicMaterial
                  blending={THREE.AdditiveBlending}
                  clippingPlanes={clipping}
                  color={settings.filterColor}
                  depthWrite={false}
                  opacity={settings.filterIntensity * (0.09 - index * 0.018)}
                  side={THREE.DoubleSide}
                  toneMapped={false}
                  transparent
                />
              </mesh>
            );
          })}
        </group>
      ) : null}
      {showLegacyFilter && settings.filterKind !== "blur" ? (
        <mesh position={[0, 0, 0.01]}>
          <PrimitiveGeometry object={object} />
          <meshBasicMaterial
            {...blendSettings}
            clippingPlanes={clipping}
            color={overlayColor}
            depthWrite={false}
            opacity={overlayOpacity}
            side={THREE.DoubleSide}
            toneMapped={false}
            transparent
          />
        </mesh>
      ) : null}
      {postProcessEffects.map((effect) =>
        effect.kind === "backdropBlur" ? (
          <PostProcessBackdropBlur key={effect.id} clipping={clipping} effect={effect} heightWorld={heightWorld} object={object} widthWorld={widthWorld} />
        ) : (
          <PostProcessOverlay key={effect.id} clipping={clipping} effect={effect} object={object} />
        ),
      )}
    </group>
  );
}
