"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { evaluateAnimatedMaterial } from "../../animation/evaluate-animation";
import { getRuntimeNowSeconds, resolveRuntimeAnimationElapsed, type RuntimeAnimationPlayback } from "../../interactions/animation-actions";
import {
  resolveMaterial,
  type ResolvedMaterial,
  type ResolvedMaterialBumpMap,
  type ResolvedMaterialDepth,
  type ResolvedMaterialDisplacement,
  type ResolvedMaterialGradient,
  type ResolvedMaterialImage,
  type ResolvedMaterialMask,
  type ResolvedMaterialMatcap,
  type ResolvedMaterialNoise,
  type ResolvedMaterialNormal,
  type ResolvedMaterialPattern,
  type ResolvedMaterialRoughnessMap,
  type ResolvedMaterialVideo,
} from "../../materials/resolve-material";
import type { AnimationTrack, Material, TwoDBlendMode, TwoDPostProcessEffect } from "../../types";
import { applyTwoDBlendSettings, applyTwoDPostProcessEffectsToColor, resolveTwoDBlendSettings } from "./two-d-material-effects";

type SceneMaterialInstance = THREE.MeshPhysicalMaterial | THREE.MeshMatcapMaterial | THREE.ShaderMaterial;

const depthVertexShader = `
  varying float vViewDepth;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewDepth = max(0.0, -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const depthFragmentShader = `
  uniform vec3 uNearColor;
  uniform vec3 uFarColor;
  uniform float uRange;
  uniform float uIntensity;
  uniform float uOpacity;
  varying float vViewDepth;

  void main() {
    float depthAmount = clamp(vViewDepth / max(uRange, 0.0001), 0.0, 1.0);
    vec3 depthColor = mix(uNearColor, uFarColor, depthAmount);
    vec3 color = mix(uNearColor, depthColor, clamp(uIntensity, 0.0, 1.0));
    gl_FragColor = vec4(color, uOpacity);
  }
`;

function clampUnit(value: number) {
  return Math.min(1, Math.max(0, value));
}

function createGradientTexture(gradient: ResolvedMaterialGradient) {
  if (typeof window === "undefined") {
    return null;
  }

  const size = 256;
  const canvas = window.document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = size;
  canvas.height = size;

  if (!context) {
    return null;
  }

  const radians = (gradient.angle * Math.PI) / 180;
  const x = Math.cos(radians) * size * 0.5;
  const y = Math.sin(radians) * size * 0.5;
  const fill = context.createLinearGradient(size / 2 - x, size / 2 - y, size / 2 + x, size / 2 + y);

  fill.addColorStop(0, gradient.startColor);
  fill.addColorStop(Math.max(0, Math.min(1, gradient.intensity)), gradient.endColor);
  fill.addColorStop(1, gradient.endColor);
  context.fillStyle = fill;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function parseHexColor(color: string) {
  const normalized = /^#[0-9a-f]{6}$/i.test(color) ? color.slice(1) : "ffffff";

  return {
    b: Number.parseInt(normalized.slice(4, 6), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    r: Number.parseInt(normalized.slice(0, 2), 16),
  };
}

function noiseUnit(x: number, y: number, scale: number) {
  const value = Math.sin((x * 12.9898 + y * 78.233) * (scale + 1)) * 43758.5453;
  return value - Math.floor(value);
}

function createNoiseTexture(noise: ResolvedMaterialNoise) {
  if (typeof window === "undefined") {
    return null;
  }

  const size = 256;
  const canvas = window.document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = size;
  canvas.height = size;

  if (!context) {
    return null;
  }

  const base = parseHexColor(noise.baseColor);
  const color = parseHexColor(noise.color);
  const imageData = context.createImageData(size, size);
  const cellSize = Math.max(1, Math.round(14 / Math.max(0.05, noise.scale)));

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = (y * size + x) * 4;
      const sampleX = Math.floor(x / cellSize);
      const sampleY = Math.floor(y / cellSize);
      const amount = noiseUnit(sampleX, sampleY, noise.scale) * noise.intensity;

      imageData.data[index] = Math.round(base.r + (color.r - base.r) * amount);
      imageData.data[index + 1] = Math.round(base.g + (color.g - base.g) * amount);
      imageData.data[index + 2] = Math.round(base.b + (color.b - base.b) * amount);
      imageData.data[index + 3] = 255;
    }
  }

  context.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

function createPatternTexture(pattern: ResolvedMaterialPattern) {
  if (typeof window === "undefined") {
    return null;
  }

  const size = 256;
  const canvas = window.document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = size;
  canvas.height = size;

  if (!context) {
    return null;
  }

  const base = parseHexColor(pattern.baseColor);
  const color = parseHexColor(pattern.color);
  const imageData = context.createImageData(size, size);
  const cellSize = Math.max(4, Math.round(32 / Math.max(0.05, pattern.scale)));

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = (y * size + x) * 4;
      const square = (Math.floor(x / cellSize) + Math.floor(y / cellSize)) % 2 === 0;
      const amount = square ? pattern.intensity : 0;

      imageData.data[index] = Math.round(base.r + (color.r - base.r) * amount);
      imageData.data[index + 1] = Math.round(base.g + (color.g - base.g) * amount);
      imageData.data[index + 2] = Math.round(base.b + (color.b - base.b) * amount);
      imageData.data[index + 3] = 255;
    }
  }

  context.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

function createNormalTexture(normal: ResolvedMaterialNormal) {
  if (typeof window === "undefined") {
    return null;
  }

  const size = 256;
  const canvas = window.document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = size;
  canvas.height = size;

  if (!context) {
    return null;
  }

  const imageData = context.createImageData(size, size);
  const frequency = 10;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = (y * size + x) * 4;
      const wave = Math.sin((x / size) * Math.PI * frequency) * Math.cos((y / size) * Math.PI * frequency);
      const micro = noiseUnit(Math.floor(x / 8), Math.floor(y / 8), normal.strength + 0.45) - 0.5;
      const value = Math.round(128 + (wave * 78 + micro * 72) * normal.intensity);

      imageData.data[index] = value;
      imageData.data[index + 1] = value;
      imageData.data[index + 2] = value;
      imageData.data[index + 3] = 255;
    }
  }

  context.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

function createMaskTexture(mask: ResolvedMaterialMask) {
  if (typeof window === "undefined") {
    return null;
  }

  const size = 256;
  const canvas = window.document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = size;
  canvas.height = size;

  if (!context) {
    return null;
  }

  const imageData = context.createImageData(size, size);
  const cellSize = Math.max(4, Math.round(30 / Math.max(0.05, mask.scale)));
  const maskedAlpha = Math.round(255 * (1 - mask.intensity));

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = (y * size + x) * 4;
      const cut = (Math.floor(x / cellSize) + Math.floor(y / cellSize)) % 2 === 0;
      const value = cut ? maskedAlpha : 255;

      imageData.data[index] = value;
      imageData.data[index + 1] = value;
      imageData.data[index + 2] = value;
      imageData.data[index + 3] = 255;
    }
  }

  context.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

function createDisplacementTexture(displacement: ResolvedMaterialDisplacement) {
  if (typeof window === "undefined") {
    return null;
  }

  const size = 256;
  const canvas = window.document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = size;
  canvas.height = size;

  if (!context) {
    return null;
  }

  const imageData = context.createImageData(size, size);
  const frequency = 6;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = (y * size + x) * 4;
      const wave = Math.sin((x / size) * Math.PI * frequency) * Math.sin((y / size) * Math.PI * frequency);
      const micro = noiseUnit(Math.floor(x / 10), Math.floor(y / 10), displacement.strength + 0.35);
      const value = Math.round(128 + (wave * 70 + (micro - 0.5) * 88) * displacement.intensity);

      imageData.data[index] = value;
      imageData.data[index + 1] = value;
      imageData.data[index + 2] = value;
      imageData.data[index + 3] = 255;
    }
  }

  context.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

function createMatcapTexture(matcap: ResolvedMaterialMatcap) {
  if (typeof window === "undefined") {
    return null;
  }

  const size = 256;
  const canvas = window.document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = size;
  canvas.height = size;

  if (!context) {
    return null;
  }

  const base = parseHexColor(matcap.color);
  const light = parseHexColor(matcap.lightColor);
  const imageData = context.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = (y * size + x) * 4;
      const nx = (x / (size - 1)) * 2 - 1;
      const ny = (y / (size - 1)) * 2 - 1;
      const radius = Math.sqrt(nx * nx + ny * ny);
      const centerLight = clampUnit(1 - radius);
      const highlight = clampUnit(1 - Math.sqrt((nx + 0.34) ** 2 + (ny - 0.44) ** 2) * 1.35);
      const shade = clampUnit((centerLight * 0.58 + highlight * 0.92) * matcap.contrast * matcap.intensity);
      const edgeShade = clampUnit(radius * 0.36);

      imageData.data[index] = Math.round(base.r * (1 - edgeShade) + light.r * shade);
      imageData.data[index + 1] = Math.round(base.g * (1 - edgeShade) + light.g * shade);
      imageData.data[index + 2] = Math.round(base.b * (1 - edgeShade) + light.b * shade);
      imageData.data[index + 3] = 255;
    }
  }

  context.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createDepthUniforms(depth: ResolvedMaterialDepth, opacity: number) {
  return {
    uFarColor: { value: new THREE.Color(depth.farColor) },
    uIntensity: { value: depth.intensity },
    uNearColor: { value: new THREE.Color(depth.nearColor) },
    uOpacity: { value: opacity },
    uRange: { value: depth.range },
  };
}

function applyMediaLayerTextureSettings(texture: THREE.Texture, media: ResolvedMaterialImage | ResolvedMaterialVideo) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(media.repeat, media.repeat);
  texture.needsUpdate = true;
}

function applyScalarLayerTextureSettings(texture: THREE.Texture, map: ResolvedMaterialBumpMap | ResolvedMaterialRoughnessMap) {
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(map.repeat, map.repeat);
  texture.needsUpdate = true;
}

export function SceneMaterial({
  animationDelay = 0,
  animationEnabled = false,
  animationTracks = [],
  clippingPlanes = [],
  material,
  runtimeAnimation,
  twoDBlendMode,
  twoDPostProcessEffects = [],
}: {
  animationDelay?: number;
  animationEnabled?: boolean;
  animationTracks?: AnimationTrack[];
  clippingPlanes?: THREE.Plane[];
  material: Material;
  runtimeAnimation?: RuntimeAnimationPlayback;
  twoDBlendMode?: TwoDBlendMode;
  twoDPostProcessEffects?: TwoDPostProcessEffect[];
}) {
  const materialRef = useRef<SceneMaterialInstance | null>(null);
  const playStartedAtRef = useRef<number | null>(null);
  const wasAnimatingRef = useRef(false);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [bumpLayerTexture, setBumpLayerTexture] = useState<THREE.Texture | null>(null);
  const [imageLayerTexture, setImageLayerTexture] = useState<THREE.Texture | null>(null);
  const [roughnessLayerTexture, setRoughnessLayerTexture] = useState<THREE.Texture | null>(null);
  const [videoLayerTexture, setVideoLayerTexture] = useState<THREE.VideoTexture | null>(null);
  const resolvedMaterial = resolveMaterial(material);
  const blendSettings = useMemo(() => resolveTwoDBlendSettings(twoDBlendMode), [twoDBlendMode]);
  const hasTwoDBlendMode = Boolean(twoDBlendMode && twoDBlendMode !== "normal");
  const bumpMap = resolvedMaterial.bumpMap;
  const textureDataUrl = resolvedMaterial.textureDataUrl;
  const depth = resolvedMaterial.depth;
  const displacement = resolvedMaterial.displacement;
  const gradient = resolvedMaterial.gradient;
  const image = resolvedMaterial.image;
  const mask = resolvedMaterial.mask;
  const matcap = resolvedMaterial.matcap;
  const noise = resolvedMaterial.noise;
  const normal = resolvedMaterial.normal;
  const pattern = resolvedMaterial.pattern;
  const roughnessMap = resolvedMaterial.roughnessMap;
  const video = resolvedMaterial.video;
  const displacementTexture = useMemo(() => (displacement ? createDisplacementTexture(displacement) : null), [displacement?.intensity, displacement?.strength]);
  const gradientTexture = useMemo(
    () => (gradient ? createGradientTexture(gradient) : null),
    [gradient?.angle, gradient?.endColor, gradient?.intensity, gradient?.startColor],
  );
  const maskTexture = useMemo(() => (mask ? createMaskTexture(mask) : null), [mask?.intensity, mask?.scale]);
  const matcapTexture = useMemo(() => (matcap ? createMatcapTexture(matcap) : null), [matcap?.color, matcap?.contrast, matcap?.intensity, matcap?.lightColor]);
  const noiseTexture = useMemo(() => (noise ? createNoiseTexture(noise) : null), [noise?.baseColor, noise?.color, noise?.intensity, noise?.scale]);
  const normalTexture = useMemo(() => (normal ? createNormalTexture(normal) : null), [normal?.intensity, normal?.strength]);
  const patternTexture = useMemo(() => (pattern ? createPatternTexture(pattern) : null), [pattern?.baseColor, pattern?.color, pattern?.intensity, pattern?.scale]);
  const depthUniforms = useMemo(() => (depth ? createDepthUniforms(depth, resolvedMaterial.opacity) : null), [depth?.farColor, depth?.intensity, depth?.nearColor, depth?.range, resolvedMaterial.opacity]);

  useEffect(() => () => displacementTexture?.dispose(), [displacementTexture]);
  useEffect(() => () => gradientTexture?.dispose(), [gradientTexture]);
  useEffect(() => () => maskTexture?.dispose(), [maskTexture]);
  useEffect(() => () => matcapTexture?.dispose(), [matcapTexture]);
  useEffect(() => () => noiseTexture?.dispose(), [noiseTexture]);
  useEffect(() => () => normalTexture?.dispose(), [normalTexture]);
  useEffect(() => () => patternTexture?.dispose(), [patternTexture]);

  useEffect(() => {
    let active = true;
    let loadedTexture: THREE.Texture | null = null;

    if (!textureDataUrl) {
      setTexture((currentTexture) => {
        currentTexture?.dispose();
        return null;
      });
      return;
    }

    const loader = new THREE.TextureLoader();
    loader.load(
      textureDataUrl,
      (nextTexture) => {
        nextTexture.colorSpace = THREE.SRGBColorSpace;
        nextTexture.wrapS = THREE.RepeatWrapping;
        nextTexture.wrapT = THREE.RepeatWrapping;
        nextTexture.needsUpdate = true;
        loadedTexture = nextTexture;

        if (!active) {
          nextTexture.dispose();
          return;
        }

        setTexture((currentTexture) => {
          currentTexture?.dispose();
          return nextTexture;
        });
      },
      undefined,
      () => {
        if (active) {
          setTexture((currentTexture) => {
            currentTexture?.dispose();
            return null;
          });
        }
      },
    );

    return () => {
      active = false;
      loadedTexture?.dispose();
    };
  }, [textureDataUrl]);

  useEffect(() => {
    let active = true;
    let loadedTexture: THREE.Texture | null = null;

    if (!image) {
      setImageLayerTexture((currentTexture) => {
        currentTexture?.dispose();
        return null;
      });
      return;
    }

    const loader = new THREE.TextureLoader();
    loader.load(
      image.sourceDataUrl,
      (nextTexture) => {
        applyMediaLayerTextureSettings(nextTexture, image);
        loadedTexture = nextTexture;

        if (!active) {
          nextTexture.dispose();
          return;
        }

        setImageLayerTexture((currentTexture) => {
          currentTexture?.dispose();
          return nextTexture;
        });
      },
      undefined,
      () => {
        if (active) {
          setImageLayerTexture((currentTexture) => {
            currentTexture?.dispose();
            return null;
          });
        }
      },
    );

    return () => {
      active = false;
      loadedTexture?.dispose();
    };
  }, [image?.sourceDataUrl, image?.repeat]);

  useEffect(() => {
    let active = true;
    let loadedTexture: THREE.Texture | null = null;

    if (!bumpMap) {
      setBumpLayerTexture((currentTexture) => {
        currentTexture?.dispose();
        return null;
      });
      return;
    }

    const loader = new THREE.TextureLoader();
    loader.load(
      bumpMap.sourceDataUrl,
      (nextTexture) => {
        applyScalarLayerTextureSettings(nextTexture, bumpMap);
        loadedTexture = nextTexture;

        if (!active) {
          nextTexture.dispose();
          return;
        }

        setBumpLayerTexture((currentTexture) => {
          currentTexture?.dispose();
          return nextTexture;
        });
      },
      undefined,
      () => {
        if (active) {
          setBumpLayerTexture((currentTexture) => {
            currentTexture?.dispose();
            return null;
          });
        }
      },
    );

    return () => {
      active = false;
      loadedTexture?.dispose();
    };
  }, [bumpMap?.sourceDataUrl, bumpMap?.repeat]);

  useEffect(() => {
    let active = true;
    let loadedTexture: THREE.Texture | null = null;

    if (!roughnessMap) {
      setRoughnessLayerTexture((currentTexture) => {
        currentTexture?.dispose();
        return null;
      });
      return;
    }

    const loader = new THREE.TextureLoader();
    loader.load(
      roughnessMap.sourceDataUrl,
      (nextTexture) => {
        applyScalarLayerTextureSettings(nextTexture, roughnessMap);
        loadedTexture = nextTexture;

        if (!active) {
          nextTexture.dispose();
          return;
        }

        setRoughnessLayerTexture((currentTexture) => {
          currentTexture?.dispose();
          return nextTexture;
        });
      },
      undefined,
      () => {
        if (active) {
          setRoughnessLayerTexture((currentTexture) => {
            currentTexture?.dispose();
            return null;
          });
        }
      },
    );

    return () => {
      active = false;
      loadedTexture?.dispose();
    };
  }, [roughnessMap?.sourceDataUrl, roughnessMap?.repeat]);

  useEffect(() => {
    if (!video || typeof document === "undefined") {
      setVideoLayerTexture((currentTexture) => {
        currentTexture?.dispose();
        return null;
      });
      return;
    }

    const videoElement = document.createElement("video");
    videoElement.src = video.sourceDataUrl;
    videoElement.loop = true;
    videoElement.muted = true;
    videoElement.playsInline = true;
    videoElement.autoplay = true;
    videoElement.crossOrigin = "anonymous";

    const nextTexture = new THREE.VideoTexture(videoElement);
    applyMediaLayerTextureSettings(nextTexture, video);
    setVideoLayerTexture((currentTexture) => {
      currentTexture?.dispose();
      return nextTexture;
    });

    void videoElement.play().catch(() => undefined);

    return () => {
      videoElement.pause();
      nextTexture.dispose();
      videoElement.removeAttribute("src");
      videoElement.load();
    };
  }, [video?.sourceDataUrl, video?.repeat]);

  const materialMap = videoLayerTexture ?? imageLayerTexture ?? texture ?? gradientTexture ?? noiseTexture ?? patternTexture ?? undefined;
  const activeClippingPlanes = clippingPlanes.length ? clippingPlanes : undefined;
  const isMediaLayerMap = materialMap === imageLayerTexture || materialMap === videoLayerTexture;
  const isProceduralMap = materialMap === gradientTexture || materialMap === noiseTexture || materialMap === patternTexture;
  const baseMaterialColor = isMediaLayerMap || isProceduralMap ? "#ffffff" : resolvedMaterial.color;
  const materialColor = applyTwoDPostProcessEffectsToColor(baseMaterialColor, twoDPostProcessEffects);
  const hasMaterialAnimation = animationTracks.some((track) => track.property === "material.opacity");

  const setMaterialRef = useCallback((nextMaterial: SceneMaterialInstance | null) => {
    materialRef.current = nextMaterial;
  }, []);

  function applyResolvedMaterial(target: SceneMaterialInstance, resolved: ResolvedMaterial) {
    if (target instanceof THREE.ShaderMaterial) {
      if (resolved.depth) {
        target.uniforms.uFarColor.value.set(resolved.depth.farColor);
        target.uniforms.uIntensity.value = resolved.depth.intensity;
        target.uniforms.uNearColor.value.set(resolved.depth.nearColor);
        target.uniforms.uRange.value = resolved.depth.range;
      }

      target.depthWrite = !hasTwoDBlendMode && resolved.opacity >= 1;
      target.clippingPlanes = activeClippingPlanes ?? null;
      target.uniforms.uOpacity.value = resolved.opacity;
      target.transparent = hasTwoDBlendMode || resolved.opacity < 1;
      target.wireframe = resolved.wireframe;
      applyTwoDBlendSettings(target, twoDBlendMode);
      target.needsUpdate = true;
      return;
    }

    target.color.set(applyTwoDPostProcessEffectsToColor(resolved.matcap ? resolved.matcap.color : isMediaLayerMap || isProceduralMap ? "#ffffff" : resolved.color, twoDPostProcessEffects));
    target.clippingPlanes = activeClippingPlanes ?? null;
    target.depthWrite = !hasTwoDBlendMode && !resolved.glass && resolved.opacity >= 1;
    target.opacity = resolved.opacity;
    target.transparent = hasTwoDBlendMode || resolved.opacity < 1 || resolved.glass || resolved.transmission > 0 || Boolean(resolved.mask);
    target.wireframe = resolved.wireframe;
    applyTwoDBlendSettings(target, twoDBlendMode);

    if (target instanceof THREE.MeshPhysicalMaterial) {
      target.bumpScale = resolved.bumpScale;
      target.clearcoat = resolved.clearcoat;
      target.clearcoatRoughness = resolved.clearcoatRoughness;
      target.displacementBias = resolved.displacementBias;
      target.displacementScale = resolved.displacementScale;
      target.emissive.set(resolved.emissiveColor);
      target.emissiveIntensity = resolved.emissiveIntensity;
      target.ior = resolved.ior;
      target.iridescence = resolved.iridescence;
      target.iridescenceIOR = resolved.iridescenceIOR;
      target.iridescenceThicknessRange = resolved.iridescenceThicknessRange;
      target.metalness = resolved.metalness;
      target.roughness = resolved.roughness;
      target.specularColor.set(resolved.specularColor);
      target.specularIntensity = resolved.specularIntensity;
      target.flatShading = resolved.toon;
      target.thickness = resolved.thickness;
      target.transmission = resolved.transmission;
    }

    target.needsUpdate = true;
  }

  useFrame(({ clock }) => {
    if (!materialRef.current) {
      return;
    }

    if (!animationEnabled || !hasMaterialAnimation) {
      if (wasAnimatingRef.current) {
        applyResolvedMaterial(materialRef.current, resolvedMaterial);
      }

      playStartedAtRef.current = null;
      wasAnimatingRef.current = false;
      return;
    }

    if (playStartedAtRef.current === null) {
      playStartedAtRef.current = clock.elapsedTime;
    }

    const elapsed = Math.max(0, resolveRuntimeAnimationElapsed(runtimeAnimation, clock.elapsedTime - playStartedAtRef.current, getRuntimeNowSeconds()) - animationDelay);
    applyResolvedMaterial(materialRef.current, resolveMaterial(evaluateAnimatedMaterial(material, animationTracks, elapsed)));
    wasAnimatingRef.current = true;
  });

  if (resolvedMaterial.depth && depthUniforms) {
    return (
      <shaderMaterial
        ref={setMaterialRef}
        clippingPlanes={activeClippingPlanes}
        {...blendSettings}
        depthWrite={!hasTwoDBlendMode && resolvedMaterial.opacity >= 1}
        fragmentShader={depthFragmentShader}
        side={THREE.DoubleSide}
        transparent={hasTwoDBlendMode || resolvedMaterial.opacity < 1}
        uniforms={depthUniforms}
        vertexShader={depthVertexShader}
        wireframe={resolvedMaterial.wireframe}
      />
    );
  }

  if (resolvedMaterial.matcap) {
    return (
      <meshMatcapMaterial
        ref={setMaterialRef}
        alphaMap={maskTexture ?? undefined}
        clippingPlanes={activeClippingPlanes}
        {...blendSettings}
        color={resolvedMaterial.matcap.color}
        depthWrite={!hasTwoDBlendMode && resolvedMaterial.opacity >= 1}
        matcap={matcapTexture ?? undefined}
        opacity={resolvedMaterial.opacity}
        side={THREE.DoubleSide}
        transparent={hasTwoDBlendMode || resolvedMaterial.opacity < 1 || Boolean(resolvedMaterial.mask)}
        wireframe={resolvedMaterial.wireframe}
      />
    );
  }

  return (
    <meshPhysicalMaterial
      ref={setMaterialRef}
      alphaMap={maskTexture ?? undefined}
      bumpMap={bumpLayerTexture ?? normalTexture ?? undefined}
      bumpScale={resolvedMaterial.bumpScale}
      clippingPlanes={activeClippingPlanes}
      {...blendSettings}
      clearcoat={resolvedMaterial.clearcoat}
      clearcoatRoughness={resolvedMaterial.clearcoatRoughness}
      color={materialColor}
      depthWrite={!hasTwoDBlendMode && !resolvedMaterial.glass && resolvedMaterial.opacity >= 1}
      displacementBias={resolvedMaterial.displacementBias}
      displacementMap={displacementTexture ?? undefined}
      displacementScale={resolvedMaterial.displacementScale}
      emissive={resolvedMaterial.emissiveColor}
      emissiveIntensity={resolvedMaterial.emissiveIntensity}
      ior={resolvedMaterial.ior}
      iridescence={resolvedMaterial.iridescence}
      iridescenceIOR={resolvedMaterial.iridescenceIOR}
      iridescenceThicknessRange={resolvedMaterial.iridescenceThicknessRange}
      map={materialMap}
      metalness={resolvedMaterial.metalness}
      opacity={resolvedMaterial.opacity}
      flatShading={resolvedMaterial.toon}
      roughness={resolvedMaterial.roughness}
      roughnessMap={roughnessLayerTexture ?? undefined}
      specularColor={resolvedMaterial.specularColor}
      specularIntensity={resolvedMaterial.specularIntensity}
      side={THREE.DoubleSide}
      thickness={resolvedMaterial.thickness}
      transmission={resolvedMaterial.transmission}
      transparent={hasTwoDBlendMode || resolvedMaterial.opacity < 1 || resolvedMaterial.glass || resolvedMaterial.transmission > 0 || Boolean(resolvedMaterial.mask)}
      wireframe={resolvedMaterial.wireframe}
    />
  );
}
