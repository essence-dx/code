import type { SceneDocument } from "@/features/editor/types";
import { escapeHtmlAttribute } from "./share-links";

export function getSelfHostedPackageHtml({ document, sceneName }: { document: SceneDocument; sceneName: string }) {
  const title = escapeHtmlAttribute(sceneName);
  const sceneJson = JSON.stringify(document).replaceAll("<", "\\u003c");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      :root { color-scheme: dark; }
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; overflow: hidden; background: #09090b; }
      canvas { display: block; width: 100vw; height: 100vh; }
      .runtime-fallback {
        display: grid;
        min-height: 100vh;
        place-items: center;
        padding: 24px;
        color: #f8fafc;
        font: 14px/1.5 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .runtime-fallback__panel {
        max-width: 420px;
        border: 1px solid rgba(148, 163, 184, 0.24);
        border-radius: 12px;
        background: rgba(15, 23, 42, 0.86);
        padding: 20px;
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
      }
      .runtime-fallback__title { margin: 0 0 8px; font-size: 16px; font-weight: 700; }
      .runtime-fallback__copy { margin: 0; color: #cbd5e1; }
      .runtime-fallback__detail {
        margin: 14px 0 0;
        border-radius: 8px;
        background: rgba(15, 23, 42, 0.9);
        padding: 10px;
        color: #94a3b8;
        font-size: 12px;
      }
    </style>
  </head>
  <body>
    <script type="application/json" id="essence-spline-scene">${sceneJson}</script>
    <script type="module">
      import * as THREE from "https://esm.sh/three@0.184.0";
      import { OrbitControls } from "https://esm.sh/three@0.184.0/examples/jsm/controls/OrbitControls.js";
      import { BokehPass } from "https://esm.sh/three@0.184.0/examples/jsm/postprocessing/BokehPass.js";
      import { EffectComposer } from "https://esm.sh/three@0.184.0/examples/jsm/postprocessing/EffectComposer.js";
      import { OutputPass } from "https://esm.sh/three@0.184.0/examples/jsm/postprocessing/OutputPass.js";
      import { RenderPass } from "https://esm.sh/three@0.184.0/examples/jsm/postprocessing/RenderPass.js";
      import { UnrealBloomPass } from "https://esm.sh/three@0.184.0/examples/jsm/postprocessing/UnrealBloomPass.js";

      const documentData = JSON.parse(document.getElementById("essence-spline-scene").textContent);
      const settings = Object.assign({
        backgroundColor: "#09090b",
        ambientColor: "#ffffff",
        ambientIntensity: 0.8,
        fogEnabled: false,
        fogColor: "#09090b",
        fogNear: 8,
        fogFar: 48,
        postProcessingEnabled: false,
        bloomEnabled: false,
        bloomIntensity: 0.35,
        bloomThreshold: 0.78,
        bloomRadius: 0.32,
        depthOfFieldEnabled: false,
        depthOfFieldFocus: 12,
        depthOfFieldAperture: 0.025,
        depthOfFieldMaxBlur: 0.012,
      }, documentData.sceneSettings || {});
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(settings.backgroundColor);

      if (settings.fogEnabled) {
        scene.fog = new THREE.Fog(settings.fogColor, settings.fogNear, settings.fogFar);
      }

      let renderer = null;

      try {
        renderer = new THREE.WebGLRenderer({ antialias: true });
      } catch (error) {
        renderWebGlUnavailable(error instanceof Error ? error.message : "The WebGL renderer could not start.");
      }

      if (renderer) {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.shadowMap.enabled = true;
      document.body.appendChild(renderer.domElement);

      const activeCameraObject = documentData.objects.find((object) => object.id === documentData.activeCameraId && object.kind === "camera");
      const camera = new THREE.PerspectiveCamera(
        activeCameraObject?.camera?.fov || 48,
        window.innerWidth / window.innerHeight,
        activeCameraObject?.camera?.near || 0.1,
        activeCameraObject?.camera?.far || 500
      );
      applyTransform(camera, activeCameraObject?.transform || { position: [5, 4, 6], rotation: [-0.55, 0.72, 0], scale: [1, 1, 1] });

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      const postProcessing = createPostProcessingPipeline();
      scene.add(new THREE.AmbientLight(settings.ambientColor, settings.ambientIntensity));
      const nodes = new Map();

      for (const object of documentData.objects) {
        const node = createNode(object);

        if (node) {
          nodes.set(object.id, node);
        }
      }

      for (const object of documentData.objects) {
        const node = nodes.get(object.id);

        if (!node) {
          continue;
        }

        const parent = object.parentId ? nodes.get(object.parentId) : null;
        (parent || scene).add(node);
      }

      window.addEventListener("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        postProcessing?.composer.setSize(window.innerWidth, window.innerHeight);
      });

      renderer.setAnimationLoop(() => {
        controls.update();
        animateParticles(performance.now() / 1000);
        if (postProcessing) {
          postProcessing.composer.render();
        } else {
          renderer.render(scene, camera);
        }
      });

      function createPostProcessingPipeline() {
        if (!settings.postProcessingEnabled || (!settings.bloomEnabled && !settings.depthOfFieldEnabled)) {
          return null;
        }

        const composer = new EffectComposer(renderer);
        composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        composer.setSize(window.innerWidth, window.innerHeight);
        composer.addPass(new RenderPass(scene, camera));

        if (settings.depthOfFieldEnabled) {
          composer.addPass(new BokehPass(scene, camera, {
            aperture: settings.depthOfFieldAperture,
            focus: settings.depthOfFieldFocus,
            maxblur: settings.depthOfFieldMaxBlur,
          }));
        }

        if (settings.bloomEnabled) {
          composer.addPass(new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            settings.bloomIntensity,
            settings.bloomRadius,
            settings.bloomThreshold
          ));
        }

        composer.addPass(new OutputPass());
        return { composer };
      }

      function applyTransform(node, transform) {
        node.position.set(...transform.position);
        node.rotation.set(...transform.rotation);
        node.scale.set(...transform.scale);
      }

      function clampUnit(value) {
        return Math.max(0, Math.min(1, value));
      }

      function createGradientTexture(gradient) {
        const size = 256;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.width = size;
        canvas.height = size;

        if (!context) return null;

        const radians = ((gradient.angle || 90) * Math.PI) / 180;
        const x = Math.cos(radians) * size * 0.5;
        const y = Math.sin(radians) * size * 0.5;
        const fill = context.createLinearGradient(size / 2 - x, size / 2 - y, size / 2 + x, size / 2 + y);
        const intensity = Math.max(0, Math.min(1, gradient.intensity ?? 1));

        fill.addColorStop(0, gradient.startColor || "#ffffff");
        fill.addColorStop(intensity, gradient.endColor || "#8b5cf6");
        fill.addColorStop(1, gradient.endColor || "#8b5cf6");
        context.fillStyle = fill;
        context.fillRect(0, 0, size, size);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;
        return texture;
      }

      function parseHexColor(color) {
        const normalized = /^#[0-9a-f]{6}$/i.test(color) ? color.slice(1) : "ffffff";

        return {
          b: Number.parseInt(normalized.slice(4, 6), 16),
          g: Number.parseInt(normalized.slice(2, 4), 16),
          r: Number.parseInt(normalized.slice(0, 2), 16),
        };
      }

      function noiseUnit(x, y, scale) {
        const value = Math.sin((x * 12.9898 + y * 78.233) * (scale + 1)) * 43758.5453;
        return value - Math.floor(value);
      }

      function createNoiseTexture(noise) {
        const size = 256;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.width = size;
        canvas.height = size;

        if (!context) return null;

        const base = parseHexColor(noise.baseColor);
        const color = parseHexColor(noise.color);
        const imageData = context.createImageData(size, size);
        const cellSize = Math.max(1, Math.round(14 / Math.max(0.05, noise.scale || 0.7)));

        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const index = (y * size + x) * 4;
            const sampleX = Math.floor(x / cellSize);
            const sampleY = Math.floor(y / cellSize);
            const amount = noiseUnit(sampleX, sampleY, noise.scale || 0.7) * (noise.intensity ?? 1);

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

      function createPatternTexture(pattern) {
        const size = 256;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.width = size;
        canvas.height = size;

        if (!context) return null;

        const base = parseHexColor(pattern.baseColor);
        const color = parseHexColor(pattern.color);
        const imageData = context.createImageData(size, size);
        const cellSize = Math.max(4, Math.round(32 / Math.max(0.05, pattern.scale || 0.72)));

        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const index = (y * size + x) * 4;
            const square = (Math.floor(x / cellSize) + Math.floor(y / cellSize)) % 2 === 0;
            const amount = square ? (pattern.intensity ?? 1) : 0;

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

      function createNormalTexture(normal) {
        const size = 256;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.width = size;
        canvas.height = size;

        if (!context) return null;

        const imageData = context.createImageData(size, size);
        const frequency = 10;

        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const index = (y * size + x) * 4;
            const wave = Math.sin((x / size) * Math.PI * frequency) * Math.cos((y / size) * Math.PI * frequency);
            const micro = noiseUnit(Math.floor(x / 8), Math.floor(y / 8), (normal.strength ?? 0.28) + 0.45) - 0.5;
            const value = Math.round(128 + (wave * 78 + micro * 72) * (normal.intensity ?? 1));

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

      function createMaskTexture(mask) {
        const size = 256;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.width = size;
        canvas.height = size;

        if (!context) return null;

        const imageData = context.createImageData(size, size);
        const cellSize = Math.max(4, Math.round(30 / Math.max(0.05, mask.scale || 0.8)));
        const maskedAlpha = Math.round(255 * (1 - (mask.intensity ?? 1)));

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

      function createDisplacementTexture(displacement) {
        const size = 256;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.width = size;
        canvas.height = size;

        if (!context) return null;

        const imageData = context.createImageData(size, size);
        const frequency = 6;

        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const index = (y * size + x) * 4;
            const wave = Math.sin((x / size) * Math.PI * frequency) * Math.sin((y / size) * Math.PI * frequency);
            const micro = noiseUnit(Math.floor(x / 10), Math.floor(y / 10), (displacement.strength ?? 0.16) + 0.35);
            const value = Math.round(128 + (wave * 70 + (micro - 0.5) * 88) * (displacement.intensity ?? 1));

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

      function createMatcapTexture(matcap) {
        const size = 256;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.width = size;
        canvas.height = size;

        if (!context) return null;

        const base = parseHexColor(matcap.color || "#9bdcff");
        const light = parseHexColor(matcap.lightColor || "#ffffff");
        const imageData = context.createImageData(size, size);
        const contrast = clampUnit(matcap.contrast ?? 0.72);
        const intensity = clampUnit(matcap.intensity ?? 1);

        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const index = (y * size + x) * 4;
            const nx = (x / (size - 1)) * 2 - 1;
            const ny = (y / (size - 1)) * 2 - 1;
            const radius = Math.sqrt(nx * nx + ny * ny);
            const centerLight = clampUnit(1 - radius);
            const highlight = clampUnit(1 - Math.sqrt((nx + 0.34) ** 2 + (ny - 0.44) ** 2) * 1.35);
            const shade = clampUnit((centerLight * 0.58 + highlight * 0.92) * contrast * intensity);
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

      function resolveMaterial(source) {
        const material = Object.assign({ color: "#8b5cf6", opacity: 1, roughness: 0.45, metalness: 0.1, wireframe: false, layers: [] }, source || {});
        const resolved = { bumpMap: null, bumpScale: 0, clearcoat: 0, clearcoatRoughness: 0, color: material.color, depth: null, displacement: null, displacementBias: 0, displacementScale: 0, gradient: null, image: null, mask: null, matcap: null, noise: null, normal: null, outline: null, pattern: null, opacity: material.opacity, roughness: material.roughness, roughnessMap: null, metalness: material.metalness, video: null, wireframe: material.wireframe, emissive: "#000000", emissiveIntensity: 0, glass: false, ior: 1.5, iridescence: 0, iridescenceIOR: 1.3, iridescenceThicknessRange: [100, 400], specularColor: "#ffffff", specularIntensity: 1, thickness: 0, toon: false, transmission: 0 };

        for (const layer of material.layers || []) {
          if (layer.enabled === false) continue;
          if (layer.kind === "color" && layer.color) resolved.color = layer.color;
          if (layer.kind === "gradient") {
            resolved.gradient = {
              angle: layer.angle ?? 90,
              endColor: layer.secondaryColor || resolved.color,
              intensity: layer.intensity ?? 1,
              startColor: layer.color || resolved.color,
            };
          }
          if (layer.kind === "image" && layer.sourceDataUrl) {
            const intensity = clampUnit(layer.intensity ?? 1);
            resolved.color = "#ffffff";
            resolved.depth = null;
            resolved.image = {
              intensity,
              repeat: Math.max(0.1, Math.min(2, layer.value ?? 1)),
              sourceDataUrl: layer.sourceDataUrl,
            };
            resolved.matcap = null;
            resolved.video = null;
          }
          if (layer.kind === "video" && layer.sourceDataUrl) {
            const intensity = clampUnit(layer.intensity ?? 1);
            resolved.color = "#ffffff";
            resolved.depth = null;
            resolved.image = null;
            resolved.matcap = null;
            resolved.video = {
              intensity,
              repeat: Math.max(0.1, Math.min(2, layer.value ?? 1)),
              sourceDataUrl: layer.sourceDataUrl,
            };
          }
          if (layer.kind === "noise") {
            const intensity = clampUnit(layer.intensity ?? 1);
            const color = layer.color || "#ffffff";
            const baseColor = resolved.color;
            resolved.color = color;
            resolved.noise = {
              baseColor,
              color,
              intensity,
              scale: Math.max(0.05, Math.min(2, layer.value ?? 0.7)),
            };
          }
          if (layer.kind === "pattern") {
            const intensity = clampUnit(layer.intensity ?? 1);
            const color = layer.color || "#111827";
            const baseColor = resolved.color;
            resolved.pattern = {
              baseColor,
              color,
              intensity,
              scale: Math.max(0.05, Math.min(2, layer.value ?? 0.72)),
            };
          }
          if (layer.kind === "normal") {
            const intensity = clampUnit(layer.intensity ?? 1);
            const strength = Math.max(0, Math.min(2, layer.value ?? 0.28));
            resolved.bumpScale = resolved.bumpScale + (strength - resolved.bumpScale) * intensity;
            resolved.normal = { intensity, strength };
            resolved.roughness = clampUnit(resolved.roughness + (Math.max(0.18, resolved.roughness) - resolved.roughness) * intensity * 0.25);
          }
          if (layer.kind === "bumpMap" && layer.sourceDataUrl) {
            const intensity = clampUnit(layer.intensity ?? 1);
            const strength = Math.max(0, Math.min(2, layer.value ?? 0.18));
            resolved.bumpMap = {
              intensity,
              repeat: 1,
              sourceDataUrl: layer.sourceDataUrl,
              strength,
            };
            resolved.bumpScale = resolved.bumpScale + (strength - resolved.bumpScale) * intensity;
            resolved.normal = null;
            resolved.roughness = clampUnit(resolved.roughness + (Math.max(0.22, resolved.roughness) - resolved.roughness) * intensity * 0.2);
          }
          if (layer.kind === "roughnessMap" && layer.sourceDataUrl) {
            const intensity = clampUnit(layer.intensity ?? 1);
            resolved.roughness = clampUnit(resolved.roughness + (Math.max(0.35, resolved.roughness) - resolved.roughness) * intensity * 0.35);
            resolved.roughnessMap = {
              intensity,
              repeat: Math.max(0.1, Math.min(2, layer.value ?? 1)),
              sourceDataUrl: layer.sourceDataUrl,
            };
          }
          if (layer.kind === "mask") {
            resolved.mask = {
              intensity: clampUnit(layer.intensity ?? 1),
              scale: Math.max(0.05, Math.min(2, layer.value ?? 0.8)),
            };
          }
          if (layer.kind === "displace") {
            const intensity = clampUnit(layer.intensity ?? 1);
            const strength = Math.max(0, Math.min(2, layer.value ?? 0.16));
            resolved.displacement = { intensity, strength };
            resolved.displacementBias = -strength * intensity * 0.5;
            resolved.displacementScale = resolved.displacementScale + (strength - resolved.displacementScale) * intensity;
            resolved.roughness = clampUnit(resolved.roughness + (Math.max(0.2, resolved.roughness) - resolved.roughness) * intensity * 0.2);
          }
          if (layer.kind === "outline") {
            resolved.outline = {
              color: layer.color || "#111827",
              opacity: Math.max(0.18, Math.min(1, layer.intensity ?? 1)),
              width: Math.max(0.005, Math.min(0.35, layer.value ?? 0.04)),
            };
          }
          if (layer.kind === "matcap") {
            const intensity = clampUnit(layer.intensity ?? 1);
            resolved.color = layer.color || "#9bdcff";
            resolved.matcap = {
              color: resolved.color,
              contrast: clampUnit(layer.value ?? 0.72),
              intensity,
              lightColor: layer.secondaryColor || "#ffffff",
            };
            resolved.depth = null;
            resolved.metalness = resolved.metalness + (0 - resolved.metalness) * intensity;
            resolved.roughness = clampUnit(resolved.roughness + (0.28 - resolved.roughness) * intensity);
          }
          if (layer.kind === "lighting") {
            const intensity = clampUnit(layer.intensity ?? 1);
            const boost = clampUnit(layer.value ?? 0.72);
            const color = layer.color || "#ffffff";
            resolved.clearcoat = clampUnit(resolved.clearcoat + (boost - resolved.clearcoat) * intensity);
            resolved.clearcoatRoughness = clampUnit(resolved.clearcoatRoughness + (0.06 - resolved.clearcoatRoughness) * intensity);
            resolved.emissive = color;
            resolved.emissiveIntensity = Math.max(0, Math.min(4, resolved.emissiveIntensity + boost * intensity * 0.35));
            resolved.roughness = clampUnit(resolved.roughness + (0.14 - resolved.roughness) * intensity * boost);
            resolved.specularColor = color;
            resolved.specularIntensity = Math.max(0, Math.min(2.5, resolved.specularIntensity + (1 + boost - resolved.specularIntensity) * intensity));
          }
          if (layer.kind === "depth") {
            const intensity = clampUnit(layer.intensity ?? 1);
            resolved.depth = {
              farColor: layer.secondaryColor || "#111827",
              intensity,
              nearColor: layer.color || "#f8fafc",
              range: Math.max(0.05, Math.min(1, layer.value ?? 0.65)) * 18,
            };
            resolved.matcap = null;
            resolved.metalness = resolved.metalness + (0 - resolved.metalness) * intensity;
            resolved.roughness = clampUnit(resolved.roughness + (1 - resolved.roughness) * intensity);
          }
          if (layer.kind === "opacity" && typeof layer.value === "number") resolved.opacity = Math.max(0, Math.min(1, layer.value));
          if (layer.kind === "roughness" && typeof layer.value === "number") resolved.roughness = Math.max(0, Math.min(1, layer.value));
          if (layer.kind === "metalness" && typeof layer.value === "number") resolved.metalness = Math.max(0, Math.min(1, layer.value));
          if (layer.kind === "rainbow") {
            const intensity = clampUnit(layer.intensity ?? 1);
            const film = clampUnit(layer.value ?? 0.68);
            resolved.color = layer.color || resolved.color;
            resolved.iridescence = clampUnit(resolved.iridescence + (intensity - resolved.iridescence) * intensity);
            resolved.iridescenceIOR = resolved.iridescenceIOR + (1.8 - resolved.iridescenceIOR) * intensity;
            resolved.iridescenceThicknessRange = [120 + film * 180, 420 + film * 520];
            resolved.metalness = clampUnit(resolved.metalness + (0 - resolved.metalness) * intensity * 0.6);
            resolved.roughness = clampUnit(resolved.roughness + (0.16 - resolved.roughness) * intensity);
          }
          if (layer.kind === "fresnel") {
            const intensity = clampUnit(layer.intensity ?? 1);
            const edgeStrength = clampUnit(layer.value ?? 0.85);
            resolved.clearcoat = clampUnit(resolved.clearcoat + (edgeStrength - resolved.clearcoat) * intensity);
            resolved.clearcoatRoughness = clampUnit(resolved.clearcoatRoughness + (0.04 - resolved.clearcoatRoughness) * intensity);
            resolved.roughness = clampUnit(resolved.roughness + (0.2 - resolved.roughness) * intensity * 0.6);
            resolved.specularColor = layer.color || resolved.specularColor;
            resolved.specularIntensity = Math.max(0, Math.min(2, resolved.specularIntensity + edgeStrength * intensity));
          }
          if (layer.kind === "glass") {
            const intensity = clampUnit(layer.intensity ?? 1);
            const transmission = clampUnit(layer.value ?? 0.72);
            resolved.color = layer.color || resolved.color;
            resolved.metalness = resolved.metalness + (0 - resolved.metalness) * intensity;
            resolved.opacity = clampUnit(resolved.opacity + (Math.max(0.18, 1 - transmission * 0.7) - resolved.opacity) * intensity);
            resolved.roughness = clampUnit(resolved.roughness + (0.02 - resolved.roughness) * intensity);
            resolved.glass = true;
            resolved.ior = resolved.ior + (1.45 - resolved.ior) * intensity;
            resolved.thickness = resolved.thickness + (0.8 - resolved.thickness) * intensity;
            resolved.transmission = clampUnit(resolved.transmission + (transmission - resolved.transmission) * intensity);
          }
          if (layer.kind === "toon") {
            const intensity = clampUnit(layer.intensity ?? 1);
            resolved.color = layer.color || resolved.color;
            resolved.metalness = resolved.metalness + (0 - resolved.metalness) * intensity;
            resolved.roughness = resolved.roughness + (1 - resolved.roughness) * intensity;
            resolved.toon = true;
          }
          if (layer.kind === "emissive" && layer.color) {
            resolved.emissive = layer.color;
            resolved.emissiveIntensity = layer.intensity ?? 0.5;
          }
        }

        const gradientTexture = resolved.gradient ? createGradientTexture(resolved.gradient) : null;
        const displacementTexture = resolved.displacement ? createDisplacementTexture(resolved.displacement) : null;
        const maskTexture = resolved.mask ? createMaskTexture(resolved.mask) : null;
        const noiseTexture = resolved.noise ? createNoiseTexture(resolved.noise) : null;
        const normalTexture = resolved.normal ? createNormalTexture(resolved.normal) : null;
        const patternTexture = resolved.pattern ? createPatternTexture(resolved.pattern) : null;
        const matcapTexture = resolved.matcap ? createMatcapTexture(resolved.matcap) : null;
        const imageTexture = resolved.image ? new THREE.TextureLoader().load(resolved.image.sourceDataUrl) : null;
        if (imageTexture && resolved.image) {
          imageTexture.colorSpace = THREE.SRGBColorSpace;
          imageTexture.wrapS = THREE.RepeatWrapping;
          imageTexture.wrapT = THREE.RepeatWrapping;
          imageTexture.repeat.set(resolved.image.repeat, resolved.image.repeat);
        }
        const bumpTexture = resolved.bumpMap ? new THREE.TextureLoader().load(resolved.bumpMap.sourceDataUrl) : null;
        if (bumpTexture && resolved.bumpMap) {
          bumpTexture.colorSpace = THREE.NoColorSpace;
          bumpTexture.wrapS = THREE.RepeatWrapping;
          bumpTexture.wrapT = THREE.RepeatWrapping;
          bumpTexture.repeat.set(resolved.bumpMap.repeat, resolved.bumpMap.repeat);
        }
        const roughnessTexture = resolved.roughnessMap ? new THREE.TextureLoader().load(resolved.roughnessMap.sourceDataUrl) : null;
        if (roughnessTexture && resolved.roughnessMap) {
          roughnessTexture.colorSpace = THREE.NoColorSpace;
          roughnessTexture.wrapS = THREE.RepeatWrapping;
          roughnessTexture.wrapT = THREE.RepeatWrapping;
          roughnessTexture.repeat.set(resolved.roughnessMap.repeat, resolved.roughnessMap.repeat);
        }
        let videoTexture = null;
        if (resolved.video) {
          const video = document.createElement("video");
          video.src = resolved.video.sourceDataUrl;
          video.loop = true;
          video.muted = true;
          video.playsInline = true;
          video.autoplay = true;
          video.crossOrigin = "anonymous";
          videoTexture = new THREE.VideoTexture(video);
          videoTexture.colorSpace = THREE.SRGBColorSpace;
          videoTexture.wrapS = THREE.RepeatWrapping;
          videoTexture.wrapT = THREE.RepeatWrapping;
          videoTexture.repeat.set(resolved.video.repeat, resolved.video.repeat);
          void video.play().catch(() => undefined);
        }
        const materialMap = videoTexture || imageTexture || gradientTexture || noiseTexture || patternTexture || undefined;

        const threeMaterial = resolved.depth ? new THREE.ShaderMaterial({
          depthWrite: resolved.opacity >= 1,
          fragmentShader: "uniform vec3 uNearColor;\nuniform vec3 uFarColor;\nuniform float uRange;\nuniform float uIntensity;\nuniform float uOpacity;\nvarying float vViewDepth;\nvoid main() {\n  float depthAmount = clamp(vViewDepth / max(uRange, 0.0001), 0.0, 1.0);\n  vec3 depthColor = mix(uNearColor, uFarColor, depthAmount);\n  vec3 color = mix(uNearColor, depthColor, clamp(uIntensity, 0.0, 1.0));\n  gl_FragColor = vec4(color, uOpacity);\n}",
          side: THREE.DoubleSide,
          transparent: resolved.opacity < 1,
          uniforms: {
            uFarColor: { value: new THREE.Color(resolved.depth.farColor) },
            uIntensity: { value: resolved.depth.intensity },
            uNearColor: { value: new THREE.Color(resolved.depth.nearColor) },
            uOpacity: { value: resolved.opacity },
            uRange: { value: resolved.depth.range },
          },
          vertexShader: "varying float vViewDepth;\nvoid main() {\n  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);\n  vViewDepth = max(0.0, -mvPosition.z);\n  gl_Position = projectionMatrix * mvPosition;\n}",
          wireframe: resolved.wireframe,
        }) : resolved.matcap ? new THREE.MeshMatcapMaterial({
          alphaMap: maskTexture || undefined,
          color: resolved.matcap.color,
          depthWrite: resolved.opacity >= 1,
          matcap: matcapTexture || undefined,
          opacity: resolved.opacity,
          side: THREE.DoubleSide,
          transparent: resolved.opacity < 1 || Boolean(resolved.mask),
          wireframe: resolved.wireframe,
        }) : new THREE.MeshPhysicalMaterial({
          alphaMap: maskTexture || undefined,
          bumpMap: bumpTexture || normalTexture || undefined,
          bumpScale: resolved.bumpScale,
          clearcoat: resolved.clearcoat,
          clearcoatRoughness: resolved.clearcoatRoughness,
          color: materialMap ? "#ffffff" : resolved.color,
          depthWrite: !resolved.glass && resolved.opacity >= 1,
          displacementBias: resolved.displacementBias,
          displacementMap: displacementTexture || undefined,
          displacementScale: resolved.displacementScale,
          emissive: resolved.emissive,
          emissiveIntensity: resolved.emissiveIntensity,
          ior: resolved.ior,
          iridescence: resolved.iridescence,
          iridescenceIOR: resolved.iridescenceIOR,
          iridescenceThicknessRange: resolved.iridescenceThicknessRange,
          map: materialMap,
          flatShading: resolved.toon,
          metalness: resolved.metalness,
          opacity: resolved.opacity,
          roughness: resolved.roughness,
          roughnessMap: roughnessTexture || undefined,
          specularColor: resolved.specularColor,
          specularIntensity: resolved.specularIntensity,
          side: THREE.DoubleSide,
          thickness: resolved.thickness,
          transmission: resolved.transmission,
          transparent: resolved.opacity < 1 || resolved.glass || resolved.transmission > 0 || Boolean(resolved.mask),
          wireframe: resolved.wireframe,
        });

        threeMaterial.userData.outline = resolved.outline;
        return threeMaterial;
      }

      function createOutlinedMesh(geometry, material) {
        const mesh = new THREE.Mesh(geometry, material);
        const outline = material.userData.outline;

        if (!outline) return mesh;

        const group = new THREE.Group();
        const outlineMaterial = new THREE.MeshBasicMaterial({
          color: outline.color,
          depthWrite: false,
          opacity: outline.opacity,
          side: THREE.BackSide,
          toneMapped: false,
          transparent: outline.opacity < 1,
        });
        const outlineMesh = new THREE.Mesh(geometry.clone(), outlineMaterial);
        const scale = 1 + outline.width;
        outlineMesh.scale.set(scale, scale, scale);
        outlineMesh.renderOrder = -1;
        group.add(outlineMesh, mesh);
        return group;
      }

      function createTwoDimensionalShape(kind, geometry) {
        const shape = new THREE.Shape();
        const width = geometry.width || 1.8;
        const height = geometry.height || 1.1;

        if (kind === "rectangle") {
          shape.moveTo(-width / 2, -height / 2);
          shape.lineTo(width / 2, -height / 2);
          shape.lineTo(width / 2, height / 2);
          shape.lineTo(-width / 2, height / 2);
          shape.closePath();
          return shape;
        }

        if (kind === "ellipse") {
          shape.absellipse(0, 0, width / 2, height / 2, 0, Math.PI * 2, false, 0);
          return shape;
        }

        if (kind === "triangle") {
          shape.moveTo(0, height / 2);
          shape.lineTo(width / 2, -height / 2);
          shape.lineTo(-width / 2, -height / 2);
          shape.closePath();
          return shape;
        }

        if (kind === "star") {
          const points = Math.max(3, Math.round(geometry.radialSegments || 5));
          const outerRadius = geometry.radius || 0.82;
          const innerRadius = Math.min(outerRadius - 0.01, Math.max(0.01, geometry.tubeRadius || 0.36));

          for (let index = 0; index < points * 2; index++) {
            const radius = index % 2 === 0 ? outerRadius : innerRadius;
            const angle = -Math.PI / 2 + (index * Math.PI) / points;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            if (index === 0) shape.moveTo(x, y);
            else shape.lineTo(x, y);
          }

          shape.closePath();
          return shape;
        }

        return null;
      }

      function createGeometry(object) {
        const geometry = object.geometry || {};

        if (object.kind === "box") return new THREE.BoxGeometry(geometry.width || 1, geometry.height || 1, geometry.depth || 1);
        if (object.kind === "sphere") return new THREE.SphereGeometry(geometry.radius || 0.65, geometry.radialSegments || 32, geometry.heightSegments || 16);
        if (object.kind === "cylinder") return new THREE.CylinderGeometry(geometry.radiusTop || 0.5, geometry.radiusBottom || 0.5, geometry.height || 1.4, geometry.radialSegments || 32, geometry.heightSegments || 1);
        if (object.kind === "cone") return new THREE.ConeGeometry(geometry.radius || 0.65, geometry.height || 1.4, geometry.radialSegments || 32, geometry.heightSegments || 1);
        if (object.kind === "torus") return new THREE.TorusGeometry(geometry.radius || 0.65, geometry.tubeRadius || 0.16, geometry.radialSegments || 16, geometry.tubularSegments || 64);
        if (object.kind === "plane") return new THREE.PlaneGeometry(geometry.width || 2, geometry.height || 2);
        if (object.kind === "rectangle" || object.kind === "ellipse" || object.kind === "triangle" || object.kind === "star") {
          const shape = createTwoDimensionalShape(object.kind, geometry);
          return shape ? (geometry.extrudeDepth > 0 ? new THREE.ExtrudeGeometry(shape, { bevelEnabled: false, depth: geometry.extrudeDepth, steps: 1 }) : new THREE.ShapeGeometry(shape)) : null;
        }
        return null;
      }

      function createTextSprite(object) {
        const text = object.text?.content || object.name;
        const fontSize = Math.max(32, Math.round((object.text?.fontSize || 1) * 64));
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.width = 1024;
        canvas.height = 256;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = object.material?.color || "#ffffff";
        context.font = "600 " + fontSize + "px system-ui, sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width - 48);
        const texture = new THREE.CanvasTexture(canvas);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
        sprite.scale.set(object.text?.maxWidth || 4, 1, 1);
        return sprite;
      }

      function createImagePlane(object) {
        const source = object.image?.sourceDataUrl || object.svg?.sourceDataUrl;
        if (!source) return null;
        const width = object.image?.width || object.svg?.width || 2;
        const height = object.image?.height || object.svg?.height || 2;
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ transparent: true }));
        new THREE.TextureLoader().load(source, (texture) => {
          mesh.material.map = texture;
          mesh.material.needsUpdate = true;
        });
        return mesh;
      }

      function createPathMesh(object) {
        const path = object.path;
        if (!path || path.points.length < 2) return null;
        const curve = createPathCurve(path);
        const geometry = new THREE.TubeGeometry(curve, path.tubularSegments || 48, path.tubeRadius || 0.04, path.radialSegments || 8, path.closed);
        const material = resolveMaterial(object.material);
        return createOutlinedMesh(geometry, material);
      }

      function createPathCurve(path) {
        const points = path.points.map((point) => new THREE.Vector3(...point));

        if (path.curveKind === "linear") {
          return createLinearPathCurve(points, path.closed);
        }

        if (path.curveKind === "bezier") {
          return createBezierPathCurve(points, path.closed);
        }

        return new THREE.CatmullRomCurve3(points, path.closed, "catmullrom", 0.5);
      }

      function createLinearPathCurve(points, closed) {
        const curve = new THREE.CurvePath();

        for (let index = 0; index < points.length - 1; index += 1) {
          curve.add(new THREE.LineCurve3(points[index], points[index + 1]));
        }

        if (closed && points.length > 2) {
          curve.add(new THREE.LineCurve3(points.at(-1), points[0]));
        }

        return curve;
      }

      function createBezierPathCurve(points, closed) {
        if (points.length < 4) {
          return createLinearPathCurve(points, closed);
        }

        const curve = new THREE.CurvePath();
        let index = 0;

        while (index + 3 < points.length) {
          curve.add(new THREE.CubicBezierCurve3(points[index], points[index + 1], points[index + 2], points[index + 3]));
          index += 3;
        }

        while (index + 1 < points.length) {
          curve.add(new THREE.LineCurve3(points[index], points[index + 1]));
          index += 1;
        }

        if (closed && points.length > 2) {
          curve.add(new THREE.LineCurve3(points.at(-1), points[0]));
        }

        return curve;
      }

      function createParticleCloud(object) {
        const settings = Object.assign({ count: 240, spread: 4, size: 0.04 }, object.particles || {});
        const positions = new Float32Array(settings.count * 3);

        for (let index = 0; index < settings.count; index++) {
          const seed = index + 1;
          positions[index * 3] = (Math.sin(seed * 12.9898) * 43758.5453 % 1 - 0.5) * settings.spread;
          positions[index * 3 + 1] = (Math.sin(seed * 78.233) * 23454.112 % 1 - 0.5) * settings.spread;
          positions[index * 3 + 2] = (Math.sin(seed * 37.719) * 12914.33 % 1 - 0.5) * settings.spread;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const points = new THREE.Points(geometry, new THREE.PointsMaterial({ color: object.material?.color || "#ffffff", size: settings.size }));
        points.userData.particleSpeed = object.particles?.speed || 0.2;
        return points;
      }

      function createLight(object) {
        const settings = object.light || {};
        if (object.kind === "pointLight") return new THREE.PointLight(settings.color || "#ffffff", settings.intensity || 2, settings.distance || 12);
        if (object.kind === "directionalLight") return new THREE.DirectionalLight(settings.color || "#ffffff", settings.intensity || 2);
        if (object.kind === "spotLight") return new THREE.SpotLight(settings.color || "#ffffff", settings.intensity || 2, settings.distance || 24, settings.angle || 0.7, settings.penumbra || 0.35);
        return null;
      }

      function createNode(object) {
        if (object.visible === false) return null;
        let node = null;
        const geometry = createGeometry(object);

        if (geometry) node = createOutlinedMesh(geometry, resolveMaterial(object.material));
        else if (object.kind === "text") node = createTextSprite(object);
        else if (object.kind === "image" || object.kind === "svg") node = createImagePlane(object);
        else if (object.kind === "path") node = createPathMesh(object);
        else if (object.kind === "particles") node = createParticleCloud(object);
        else if (object.kind.endsWith("Light")) node = createLight(object);
        else if (object.kind === "group") node = new THREE.Group();

        if (!node) return null;
        node.name = object.name;
        applyTransform(node, object.transform);
        return node;
      }

      function animateParticles(time) {
        scene.traverse((node) => {
          if (node.isPoints && node.userData.particleSpeed) {
            node.rotation.y = time * node.userData.particleSpeed;
          }
        });
      }
      }

      function escapeFallbackText(value) {
        return String(value).replace(/[&<>"']/g, (character) => {
          if (character === "&") return "&amp;";
          if (character === "<") return "&lt;";
          if (character === ">") return "&gt;";
          if (character === '"') return "&quot;";
          return "&#39;";
        });
      }

      function renderWebGlUnavailable(detail) {
        document.body.innerHTML =
          '<main class="runtime-fallback" role="status">' +
          '<section class="runtime-fallback__panel">' +
          '<h1 class="runtime-fallback__title">This scene needs WebGL</h1>' +
          '<p class="runtime-fallback__copy">Enable browser hardware acceleration or open this export in a WebGL-capable browser session.</p>' +
          '<pre class="runtime-fallback__detail">' + escapeFallbackText(detail) + '</pre>' +
          '</section>' +
          '</main>';
      }
    </script>
  </body>
</html>
`;
}
