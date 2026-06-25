import { strict as assert } from "node:assert";
import { analyzeCadImportFile } from "../src/features/editor/utils/cad-import-preflight";
import { createModelImportDiagnostics } from "../src/features/editor/utils/cad-conversion-validation";
import { modelSettingsSchema } from "../src/features/editor/types";

function file(name: string, size = 2 * 1024 * 1024): Pick<File, "name" | "size"> {
  return { name, size };
}

const nativeCad = analyzeCadImportFile(file("servo bracket.step", 14 * 1024 * 1024));

assert.equal(nativeCad.status, "native-cad");
assert.equal(nativeCad.conversionPlan?.preferredTarget, "stl");
assert.equal(nativeCad.conversionPlan?.commands.length, 2);
assert.equal(nativeCad.validation?.unitMetadata.sourceUnit, "unknown");
assert.equal(nativeCad.validation?.unitMetadata.confidence, "metadata-required");
assert.equal(nativeCad.validation?.tessellationBudget.linearDeflection, 0.1);
assert.ok((nativeCad.validation?.meshDiagnostics.estimatedTriangleCount ?? 0) > 100000);
assert.ok(nativeCad.validation?.issues.some((issue) => issue.id === "missing-unit-metadata"));
assert.match(nativeCad.conversionPlan?.commands[0]?.command ?? "", /freecad-mesh-export\.py/);
assert.match(nativeCad.conversionPlan?.commands[0]?.command ?? "", /"servo-bracket\.stl"/);

const detectedUnits = analyzeCadImportFile(file("servo bracket_mm.step", 4 * 1024 * 1024));

assert.equal(detectedUnits.validation?.unitMetadata.sourceUnit, "millimeter");
assert.equal(detectedUnits.validation?.unitMetadata.scaleToMeters, 0.001);

const exchange = analyzeCadImportFile(file("gallery scene.fbx", 42 * 1024 * 1024));

assert.equal(exchange.status, "native-cad");
assert.equal(exchange.conversionPlan?.preferredTarget, "glb");
assert.equal(exchange.conversionPlan?.commands.length, 1);
assert.equal(exchange.validation?.meshDiagnostics.complexity, "extreme");
assert.ok(exchange.validation?.issues.some((issue) => issue.id === "tessellation-budget"));
assert.ok(exchange.validation?.issues.some((issue) => issue.id === "external-asset-risk"));
assert.match(exchange.conversionPlan?.commands[0]?.command ?? "", /blender-export-glb\.py/);
assert.match(exchange.conversionPlan?.commands[0]?.command ?? "", /"gallery-scene\.glb"/);

const importable = analyzeCadImportFile(file("ready.glb"));

assert.equal(importable.status, "importable");
assert.equal(importable.conversionPlan, undefined);
assert.equal(importable.validation?.unitMetadata.sourceUnit, "meter");

const diagnostics = createModelImportDiagnostics("gltf", importable.validation!);

assert.equal(diagnostics.sourceFormat, "gltf");
assert.equal(diagnostics.sourceUnit, "meter");
assert.equal(diagnostics.scaleToMeters, 1);

const model = modelSettingsSchema.parse({
  animationAutoPlay: true,
  animationLoop: true,
  animationSpeed: 1,
  fileName: "ready.glb",
  format: "gltf",
  importDiagnostics: diagnostics,
  morphTargetAutoPlay: false,
  morphTargetIndex: 0,
  morphTargetSpeed: 1,
  morphTargetWeight: 0,
  sourceDataUrl: "data:model/gltf-binary;base64,AAAA",
  splatAlphaHash: false,
  splatAlphaTest: 0,
  splatPointScale: 1,
  splatToneMapped: false,
});

assert.equal(model.importDiagnostics?.estimatedTriangleCount, diagnostics.estimatedTriangleCount);

const unsupported = analyzeCadImportFile(file("archive.zip"));

assert.equal(unsupported.status, "unsupported");
assert.equal(unsupported.conversionPlan, undefined);
assert.equal(unsupported.validation, undefined);

console.log("cad conversion smoke passed");
