import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import * as THREE from "three";
import { resolveMaterial } from "../materials/resolve-material";
import { createEvaluatedBooleanGeometry, createPathBufferGeometry, createPrimitiveBufferGeometry } from "../scene/three-primitive-geometry";
import type { Material, SceneDocument, SceneObject, Transform } from "../types";

function applyTransform(object: THREE.Object3D, transform: Transform) {
  object.position.set(...transform.position);
  object.rotation.set(...transform.rotation);
  object.scale.set(...transform.scale);
}

function loadTexture(sourceDataUrl: string, options: { colorSpace?: THREE.ColorSpace; repeat?: number } = {}) {
  return new Promise<THREE.Texture | null>((resolve) => {
    new THREE.TextureLoader().load(
      sourceDataUrl,
      (texture) => {
        texture.colorSpace = options.colorSpace ?? THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        if (options.repeat) {
          texture.repeat.set(options.repeat, options.repeat);
        }
        texture.needsUpdate = true;
        resolve(texture);
      },
      undefined,
      () => resolve(null),
    );
  });
}

async function createExportMaterial(material: Material) {
  const resolved = resolveMaterial(material);
  const textureSource = resolved.image?.sourceDataUrl ?? resolved.textureDataUrl;
  const texture = textureSource ? await loadTexture(textureSource, { repeat: resolved.image?.repeat }) : null;
  const bumpTexture = resolved.bumpMap ? await loadTexture(resolved.bumpMap.sourceDataUrl, { colorSpace: THREE.NoColorSpace, repeat: resolved.bumpMap.repeat }) : null;
  const roughnessTexture = resolved.roughnessMap ? await loadTexture(resolved.roughnessMap.sourceDataUrl, { colorSpace: THREE.NoColorSpace, repeat: resolved.roughnessMap.repeat }) : null;

  if (texture && resolved.image) {
    texture.repeat.set(resolved.image.repeat, resolved.image.repeat);
  }

  return new THREE.MeshPhysicalMaterial({
    bumpMap: bumpTexture ?? undefined,
    bumpScale: resolved.bumpScale,
    clearcoat: resolved.clearcoat,
    clearcoatRoughness: resolved.clearcoatRoughness,
    color: texture ? "#ffffff" : resolved.color,
    emissive: resolved.emissiveColor,
    emissiveIntensity: resolved.emissiveIntensity,
    ior: resolved.ior,
    map: texture ?? undefined,
    metalness: resolved.metalness,
    opacity: resolved.opacity,
    roughness: resolved.roughness,
    roughnessMap: roughnessTexture ?? undefined,
    side: THREE.DoubleSide,
    transparent: resolved.opacity < 1,
    transmission: resolved.transmission,
    wireframe: resolved.wireframe,
  });
}

async function createTextMesh(object: SceneObject) {
  const text = object.text?.content ?? object.name;
  const width = object.text?.maxWidth ?? 4;
  const height = object.text?.fontSize ?? 0.8;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = 1024;
  canvas.height = 256;

  if (!context) {
    return new THREE.Mesh(new THREE.PlaneGeometry(width, height), await createExportMaterial(object.material));
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = object.material.color;
  context.font = "700 96px sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width - 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
    }),
  );
}

async function createImageMesh(object: SceneObject) {
  const source = object.image?.sourceDataUrl ?? object.svg?.sourceDataUrl;
  const width = object.image?.width ?? object.svg?.width ?? 2;
  const height = object.image?.height ?? object.svg?.height ?? 2;
  const texture = source ? await loadTexture(source) : null;

  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      color: texture ? "#ffffff" : object.material.color,
      map: texture ?? undefined,
      transparent: true,
    }),
  );
}

function createCamera(object: SceneObject) {
  const camera = new THREE.PerspectiveCamera(object.camera?.fov ?? 48, 1, object.camera?.near ?? 0.1, object.camera?.far ?? 1000);
  return camera;
}

function createLight(object: SceneObject) {
  const light = object.light;

  if (object.kind === "pointLight") {
    return new THREE.PointLight(light?.color ?? "#ffffff", light?.intensity ?? 2.4, light?.distance ?? 12);
  }

  if (object.kind === "directionalLight") {
    return new THREE.DirectionalLight(light?.color ?? "#ffffff", light?.intensity ?? 1.4);
  }

  if (object.kind === "spotLight") {
    return new THREE.SpotLight(light?.color ?? "#ffffff", light?.intensity ?? 2.4, light?.distance ?? 12, light?.angle ?? 0.65, light?.penumbra ?? 0.35);
  }

  return null;
}

async function createNode(object: SceneObject, objects: SceneObject[]) {
  if (object.visible === false) {
    return null;
  }

  let node: THREE.Object3D | null = null;
  const geometry = createEvaluatedBooleanGeometry(object, objects) ?? createPrimitiveBufferGeometry(object, objects) ?? (object.kind === "path" ? createPathBufferGeometry(object) : null);

  if (geometry) {
    node = new THREE.Mesh(geometry, await createExportMaterial(object.material));
  } else if (object.kind === "text") {
    node = await createTextMesh(object);
  } else if (object.kind === "image" || object.kind === "svg") {
    node = await createImageMesh(object);
  } else if (object.kind === "camera") {
    node = createCamera(object);
  } else if (object.kind === "pointLight" || object.kind === "directionalLight" || object.kind === "spotLight") {
    node = createLight(object);
  } else if (object.kind === "group") {
    node = new THREE.Group();
  }

  if (!node) {
    return null;
  }

  node.name = object.name;
  node.userData.essenceSplineId = object.id;
  applyTransform(node, object.transform);
  return node;
}

export async function createThreeExportScene(document: SceneDocument) {
  const scene = new THREE.Scene();
  scene.name = document.name;

  const nodes = new Map<string, THREE.Object3D>();

  for (const object of document.objects) {
    const node = await createNode(object, document.objects);

    if (node) {
      nodes.set(object.id, node);
    }
  }

  for (const object of document.objects) {
    const node = nodes.get(object.id);

    if (!node) {
      continue;
    }

    const parent = object.parentId ? nodes.get(object.parentId) : null;
    (parent ?? scene).add(node);
  }

  return scene;
}

export async function createGlbBlob(document: SceneDocument) {
  const scene = await createThreeExportScene(document);
  const exporter = new GLTFExporter();
  const glb = await exporter.parseAsync(scene, {
    binary: true,
    embedImages: true,
    maxTextureSize: 2048,
    onlyVisible: true,
    trs: true,
  });

  if (!(glb instanceof ArrayBuffer)) {
    throw new Error("GLB export did not return binary data.");
  }

  return new Blob([glb], { type: "model/gltf-binary" });
}
