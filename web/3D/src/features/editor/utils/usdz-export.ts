import { USDZExporter } from "three/examples/jsm/exporters/USDZExporter.js";
import type { SceneDocument } from "../types";
import { createThreeExportScene } from "./gltf-export";

export async function createUsdzBlob(document: SceneDocument) {
  const scene = await createThreeExportScene(document);
  const usdz = await new USDZExporter().parseAsync(scene, {
    maxTextureSize: 2048,
    onlyVisible: true,
    quickLookCompatible: true,
  });

  return new Blob([usdz], { type: "model/vnd.usdz+zip" });
}
