"use client";

import * as THREE from "three";
import type { TwoDBlendMode, TwoDPostProcessEffect } from "../../types";

type BlendSettings = Pick<THREE.Material, "blendDst" | "blendEquation" | "blendSrc" | "blending">;

export function resolveTwoDBlendSettings(blendMode: TwoDBlendMode = "normal"): BlendSettings {
  if (blendMode === "add") {
    return {
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.SrcAlphaFactor,
      blending: THREE.AdditiveBlending,
    };
  }

  if (blendMode === "multiply") {
    return {
      blendDst: THREE.SrcColorFactor,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.DstColorFactor,
      blending: THREE.MultiplyBlending,
    };
  }

  if (blendMode === "screen") {
    return {
      blendDst: THREE.OneMinusSrcColorFactor,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blending: THREE.CustomBlending,
    };
  }

  if (blendMode === "subtract") {
    return {
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendEquation: THREE.SubtractEquation,
      blendSrc: THREE.SrcAlphaFactor,
      blending: THREE.SubtractiveBlending,
    };
  }

  return {
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.SrcAlphaFactor,
    blending: THREE.NormalBlending,
  };
}

export function applyTwoDBlendSettings(material: THREE.Material, blendMode?: TwoDBlendMode) {
  const settings = resolveTwoDBlendSettings(blendMode);

  material.blending = settings.blending;
  material.blendEquation = settings.blendEquation;
  material.blendSrc = settings.blendSrc;
  material.blendDst = settings.blendDst;
}

function clampUnit(value: number) {
  return Math.min(1, Math.max(0, value));
}

function applyContrast(value: number, amount: number) {
  return clampUnit((value - 0.5) * amount + 0.5);
}

export function applyTwoDPostProcessEffectsToColor(color: string, effects: TwoDPostProcessEffect[] = []) {
  const resolvedColor = new THREE.Color(color);

  for (const effect of effects) {
    if (!effect.enabled || effect.kind === "backdropBlur") {
      continue;
    }

    if (effect.kind === "brightness") {
      resolvedColor.multiplyScalar(Math.max(0, effect.amount));
    }

    if (effect.kind === "contrast") {
      resolvedColor.setRGB(applyContrast(resolvedColor.r, effect.amount), applyContrast(resolvedColor.g, effect.amount), applyContrast(resolvedColor.b, effect.amount));
    }

    if (effect.kind === "saturate") {
      const hsl = { h: 0, l: 0, s: 0 };
      resolvedColor.getHSL(hsl);
      resolvedColor.setHSL(hsl.h, clampUnit(hsl.s * effect.amount), hsl.l);
    }

    if (effect.kind === "hueRotate") {
      const hsl = { h: 0, l: 0, s: 0 };
      resolvedColor.getHSL(hsl);
      resolvedColor.setHSL(((hsl.h + effect.amount / 360) % 1 + 1) % 1, hsl.s, hsl.l);
    }

    if (effect.kind === "grayscale") {
      const amount = clampUnit(effect.amount);
      const luminance = resolvedColor.r * 0.2126 + resolvedColor.g * 0.7152 + resolvedColor.b * 0.0722;
      resolvedColor.setRGB(
        resolvedColor.r + (luminance - resolvedColor.r) * amount,
        resolvedColor.g + (luminance - resolvedColor.g) * amount,
        resolvedColor.b + (luminance - resolvedColor.b) * amount,
      );
    }
  }

  return `#${resolvedColor.getHexString()}`;
}
