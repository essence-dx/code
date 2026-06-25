import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import type { SceneDocument } from "../types";
import { createThreeExportScene } from "./gltf-export";

export async function createStlBlob(document: SceneDocument) {
  const scene = await createThreeExportScene(document);
  const dataView = new STLExporter().parse(scene, { binary: true });

  return new Blob([dataView], { type: "model/stl" });
}
