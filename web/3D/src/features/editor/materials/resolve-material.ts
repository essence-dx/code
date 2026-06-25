import type { Material, MaterialLayer } from "../types";

export type ResolvedMaterial = {
  bumpMap: ResolvedMaterialBumpMap | null;
  bumpScale: number;
  clearcoat: number;
  clearcoatRoughness: number;
  color: string;
  depth: ResolvedMaterialDepth | null;
  displacement: ResolvedMaterialDisplacement | null;
  displacementBias: number;
  displacementScale: number;
  emissiveColor: string;
  emissiveIntensity: number;
  glass: boolean;
  gradient: ResolvedMaterialGradient | null;
  image: ResolvedMaterialImage | null;
  ior: number;
  iridescence: number;
  iridescenceIOR: number;
  iridescenceThicknessRange: [number, number];
  mask: ResolvedMaterialMask | null;
  matcap: ResolvedMaterialMatcap | null;
  metalness: number;
  noise: ResolvedMaterialNoise | null;
  normal: ResolvedMaterialNormal | null;
  opacity: number;
  outline: ResolvedMaterialOutline | null;
  pattern: ResolvedMaterialPattern | null;
  roughness: number;
  roughnessMap: ResolvedMaterialRoughnessMap | null;
  specularColor: string;
  specularIntensity: number;
  textureDataUrl: string | null;
  thickness: number;
  toon: boolean;
  toonIntensity: number;
  transmission: number;
  video: ResolvedMaterialVideo | null;
  wireframe: boolean;
};

export type ResolvedMaterialGradient = {
  angle: number;
  endColor: string;
  intensity: number;
  startColor: string;
};

export type ResolvedMaterialImage = {
  fileName: string | null;
  intensity: number;
  repeat: number;
  sourceDataUrl: string;
};

export type ResolvedMaterialVideo = {
  fileName: string | null;
  intensity: number;
  repeat: number;
  sourceDataUrl: string;
};

export type ResolvedMaterialNoise = {
  baseColor: string;
  color: string;
  intensity: number;
  scale: number;
};

export type ResolvedMaterialPattern = {
  baseColor: string;
  color: string;
  intensity: number;
  scale: number;
};

export type ResolvedMaterialNormal = {
  intensity: number;
  strength: number;
};

export type ResolvedMaterialBumpMap = {
  fileName: string | null;
  intensity: number;
  repeat: number;
  sourceDataUrl: string;
  strength: number;
};

export type ResolvedMaterialRoughnessMap = {
  fileName: string | null;
  intensity: number;
  repeat: number;
  sourceDataUrl: string;
};

export type ResolvedMaterialMask = {
  intensity: number;
  scale: number;
};

export type ResolvedMaterialDisplacement = {
  intensity: number;
  strength: number;
};

export type ResolvedMaterialDepth = {
  farColor: string;
  intensity: number;
  nearColor: string;
  range: number;
};

export type ResolvedMaterialOutline = {
  color: string;
  opacity: number;
  width: number;
};

export type ResolvedMaterialMatcap = {
  color: string;
  contrast: number;
  intensity: number;
  lightColor: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clampUnit(value: number) {
  return clamp(value, 0, 1);
}

function parseHexColor(color: string) {
  const normalized = /^#[0-9a-f]{6}$/i.test(color) ? color.slice(1) : "ffffff";

  return {
    b: Number.parseInt(normalized.slice(4, 6), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    r: Number.parseInt(normalized.slice(0, 2), 16),
  };
}

function toHex(value: number) {
  return Math.round(clamp(value, 0, 255)).toString(16).padStart(2, "0");
}

function mixHexColor(start: string, end: string, amount: number) {
  const progress = clampUnit(amount);
  const left = parseHexColor(start);
  const right = parseHexColor(end);

  return `#${toHex(left.r + (right.r - left.r) * progress)}${toHex(left.g + (right.g - left.g) * progress)}${toHex(left.b + (right.b - left.b) * progress)}`;
}

function mixNumber(start: number, end: number, amount: number) {
  return start + (end - start) * clampUnit(amount);
}

function applyLayer(resolved: ResolvedMaterial, layer: MaterialLayer): ResolvedMaterial {
  if (!layer.enabled) {
    return resolved;
  }

  const intensity = clampUnit(layer.intensity ?? 1);

  if (layer.kind === "color") {
    return {
      ...resolved,
      color: mixHexColor(resolved.color, layer.color ?? resolved.color, intensity),
    };
  }

  if (layer.kind === "gradient") {
    const startColor = layer.color ?? resolved.color;
    const endColor = layer.secondaryColor ?? resolved.color;

    return {
      ...resolved,
      color: mixHexColor(resolved.color, mixHexColor(startColor, endColor, 0.5), intensity),
      gradient: {
        angle: layer.angle ?? 90,
        endColor,
        intensity,
        startColor,
      },
    };
  }

  if (layer.kind === "image") {
    if (!layer.sourceDataUrl) {
      return resolved;
    }

    return {
      ...resolved,
      color: mixHexColor(resolved.color, "#ffffff", intensity * 0.2),
      depth: null,
      image: {
        fileName: layer.fileName ?? null,
        intensity,
        repeat: clamp(layer.value ?? 1, 0.1, 2),
        sourceDataUrl: layer.sourceDataUrl,
      },
      matcap: null,
      video: null,
    };
  }

  if (layer.kind === "video") {
    if (!layer.sourceDataUrl) {
      return resolved;
    }

    return {
      ...resolved,
      color: mixHexColor(resolved.color, "#ffffff", intensity * 0.2),
      depth: null,
      image: null,
      matcap: null,
      video: {
        fileName: layer.fileName ?? null,
        intensity,
        repeat: clamp(layer.value ?? 1, 0.1, 2),
        sourceDataUrl: layer.sourceDataUrl,
      },
    };
  }

  if (layer.kind === "noise") {
    const color = layer.color ?? "#ffffff";

    return {
      ...resolved,
      color: mixHexColor(resolved.color, color, intensity * 0.25),
      noise: {
        baseColor: resolved.color,
        color,
        intensity,
        scale: clamp(layer.value ?? 0.7, 0.05, 2),
      },
    };
  }

  if (layer.kind === "pattern") {
    const color = layer.color ?? "#111827";

    return {
      ...resolved,
      color: mixHexColor(resolved.color, color, intensity * 0.15),
      pattern: {
        baseColor: resolved.color,
        color,
        intensity,
        scale: clamp(layer.value ?? 0.72, 0.05, 2),
      },
    };
  }

  if (layer.kind === "normal") {
    const strength = clamp(layer.value ?? 0.28, 0, 2);

    return {
      ...resolved,
      bumpScale: mixNumber(resolved.bumpScale, strength, intensity),
      normal: {
        intensity,
        strength,
      },
      roughness: clampUnit(mixNumber(resolved.roughness, Math.max(0.18, resolved.roughness), intensity * 0.25)),
    };
  }

  if (layer.kind === "bumpMap") {
    if (!layer.sourceDataUrl) {
      return resolved;
    }

    const strength = clamp(layer.value ?? 0.18, 0, 2);

    return {
      ...resolved,
      bumpMap: {
        fileName: layer.fileName ?? null,
        intensity,
        repeat: 1,
        sourceDataUrl: layer.sourceDataUrl,
        strength,
      },
      bumpScale: mixNumber(resolved.bumpScale, strength, intensity),
      normal: null,
      roughness: clampUnit(mixNumber(resolved.roughness, Math.max(0.22, resolved.roughness), intensity * 0.2)),
    };
  }

  if (layer.kind === "roughnessMap") {
    if (!layer.sourceDataUrl) {
      return resolved;
    }

    return {
      ...resolved,
      roughness: clampUnit(mixNumber(resolved.roughness, Math.max(0.35, resolved.roughness), intensity * 0.35)),
      roughnessMap: {
        fileName: layer.fileName ?? null,
        intensity,
        repeat: clamp(layer.value ?? 1, 0.1, 2),
        sourceDataUrl: layer.sourceDataUrl,
      },
    };
  }

  if (layer.kind === "mask") {
    return {
      ...resolved,
      mask: {
        intensity,
        scale: clamp(layer.value ?? 0.8, 0.05, 2),
      },
    };
  }

  if (layer.kind === "displace") {
    const strength = clamp(layer.value ?? 0.16, 0, 2);

    return {
      ...resolved,
      displacement: {
        intensity,
        strength,
      },
      displacementBias: -strength * intensity * 0.5,
      displacementScale: mixNumber(resolved.displacementScale, strength, intensity),
      roughness: clampUnit(mixNumber(resolved.roughness, Math.max(0.2, resolved.roughness), intensity * 0.2)),
    };
  }

  if (layer.kind === "outline") {
    return {
      ...resolved,
      outline: {
        color: layer.color ?? "#111827",
        opacity: clamp(layer.intensity ?? 1, 0.18, 1),
        width: clamp(layer.value ?? 0.04, 0.005, 0.35),
      },
    };
  }

  if (layer.kind === "matcap") {
    const color = layer.color ?? "#9bdcff";
    const intensity = clampUnit(layer.intensity ?? 1);

    return {
      ...resolved,
      color: mixHexColor(resolved.color, color, intensity * 0.45),
      matcap: {
        color,
        contrast: clampUnit(layer.value ?? 0.72),
        intensity,
        lightColor: layer.secondaryColor ?? "#ffffff",
      },
      depth: null,
      metalness: clampUnit(mixNumber(resolved.metalness, 0, intensity)),
      roughness: clampUnit(mixNumber(resolved.roughness, 0.28, intensity)),
      video: null,
    };
  }

  if (layer.kind === "lighting") {
    const boost = clampUnit(layer.value ?? 0.72);
    const color = layer.color ?? "#ffffff";

    return {
      ...resolved,
      clearcoat: clampUnit(mixNumber(resolved.clearcoat, boost, intensity)),
      clearcoatRoughness: clampUnit(mixNumber(resolved.clearcoatRoughness, 0.06, intensity)),
      emissiveColor: mixHexColor(resolved.emissiveColor, color, intensity * boost * 0.35),
      emissiveIntensity: clamp(resolved.emissiveIntensity + boost * intensity * 0.35, 0, 4),
      roughness: clampUnit(mixNumber(resolved.roughness, 0.14, intensity * boost)),
      specularColor: mixHexColor(resolved.specularColor, color, intensity),
      specularIntensity: clamp(mixNumber(resolved.specularIntensity, 1 + boost, intensity), 0, 2.5),
    };
  }

  if (layer.kind === "depth") {
    return {
      ...resolved,
      depth: {
        farColor: layer.secondaryColor ?? "#111827",
        intensity,
        nearColor: layer.color ?? "#f8fafc",
        range: clamp(layer.value ?? 0.65, 0.05, 1) * 18,
      },
      matcap: null,
      metalness: clampUnit(mixNumber(resolved.metalness, 0, intensity)),
      roughness: clampUnit(mixNumber(resolved.roughness, 1, intensity)),
      video: null,
    };
  }

  if (layer.kind === "opacity") {
    return {
      ...resolved,
      opacity: clampUnit(mixNumber(resolved.opacity, layer.value ?? resolved.opacity, intensity)),
    };
  }

  if (layer.kind === "roughness") {
    return {
      ...resolved,
      roughness: clampUnit(mixNumber(resolved.roughness, layer.value ?? resolved.roughness, intensity)),
    };
  }

  if (layer.kind === "metalness") {
    return {
      ...resolved,
      metalness: clampUnit(mixNumber(resolved.metalness, layer.value ?? resolved.metalness, intensity)),
    };
  }

  if (layer.kind === "rainbow") {
    const film = clampUnit(layer.value ?? 0.68);

    return {
      ...resolved,
      color: mixHexColor(resolved.color, layer.color ?? "#b38cff", intensity * 0.2),
      iridescence: clampUnit(mixNumber(resolved.iridescence, intensity, intensity)),
      iridescenceIOR: mixNumber(resolved.iridescenceIOR, 1.8, intensity),
      iridescenceThicknessRange: [120 + film * 180, 420 + film * 520],
      metalness: clampUnit(mixNumber(resolved.metalness, 0, intensity * 0.6)),
      roughness: clampUnit(mixNumber(resolved.roughness, 0.16, intensity)),
    };
  }

  if (layer.kind === "fresnel") {
    const edgeStrength = clampUnit(layer.value ?? 0.85);

    return {
      ...resolved,
      clearcoat: clampUnit(mixNumber(resolved.clearcoat, edgeStrength, intensity)),
      clearcoatRoughness: clampUnit(mixNumber(resolved.clearcoatRoughness, 0.04, intensity)),
      roughness: clampUnit(mixNumber(resolved.roughness, 0.2, intensity * 0.6)),
      specularColor: mixHexColor(resolved.specularColor, layer.color ?? "#ffffff", intensity),
      specularIntensity: clamp(resolved.specularIntensity + edgeStrength * intensity, 0, 2),
    };
  }

  if (layer.kind === "glass") {
    const transmission = clampUnit(layer.value ?? 0.72);

    return {
      ...resolved,
      color: mixHexColor(resolved.color, layer.color ?? "#c8f4ff", intensity),
      glass: true,
      ior: mixNumber(resolved.ior, 1.45, intensity),
      metalness: clampUnit(mixNumber(resolved.metalness, 0, intensity)),
      opacity: clampUnit(mixNumber(resolved.opacity, Math.max(0.18, 1 - transmission * 0.7), intensity)),
      roughness: clampUnit(mixNumber(resolved.roughness, 0.02, intensity)),
      thickness: mixNumber(resolved.thickness, 0.8, intensity),
      transmission: clampUnit(mixNumber(resolved.transmission, transmission, intensity)),
    };
  }

  if (layer.kind === "toon") {
    return {
      ...resolved,
      color: mixHexColor(resolved.color, layer.color ?? resolved.color, intensity),
      metalness: clampUnit(mixNumber(resolved.metalness, 0, intensity)),
      roughness: clampUnit(mixNumber(resolved.roughness, 1, intensity)),
      toon: true,
      toonIntensity: intensity,
    };
  }

  return {
    ...resolved,
    emissiveColor: mixHexColor(resolved.emissiveColor, layer.color ?? resolved.color, intensity),
    emissiveIntensity: clamp(resolved.emissiveIntensity + (layer.value ?? intensity), 0, 4),
  };
}

export function resolveMaterial(material: Material): ResolvedMaterial {
  const base: ResolvedMaterial = {
    bumpMap: null,
    bumpScale: 0,
    clearcoat: 0,
    clearcoatRoughness: 0,
    color: material.color,
    depth: null,
    displacement: null,
    displacementBias: 0,
    displacementScale: 0,
    emissiveColor: "#000000",
    emissiveIntensity: 0,
    glass: false,
    gradient: null,
    image: null,
    ior: 1.5,
    iridescence: 0,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [100, 400],
    mask: null,
    matcap: null,
    metalness: clampUnit(material.metalness),
    noise: null,
    normal: null,
    opacity: clampUnit(material.opacity),
    outline: null,
    pattern: null,
    roughness: clampUnit(material.roughness),
    roughnessMap: null,
    specularColor: "#ffffff",
    specularIntensity: 1,
    textureDataUrl: material.textureDataUrl ?? null,
    thickness: 0,
    toon: false,
    toonIntensity: 0,
    transmission: 0,
    video: null,
    wireframe: material.wireframe,
  };

  return (material.layers ?? []).reduce(applyLayer, base);
}
