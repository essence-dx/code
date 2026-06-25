import { createCadConversionValidationReport, type CadConversionTarget, type CadConversionValidationReport } from "./cad-conversion-validation";

export type CadImportStatus = "importable" | "native-cad" | "unsupported";
export type CadConversionTool = "blender" | "freecad";
export type { CadConversionTarget };

export interface CadConversionCommand {
  command: string;
  label: string;
  target: CadConversionTarget;
  tool: CadConversionTool;
}

export interface CadConversionPlan {
  checklist: string[];
  commands: CadConversionCommand[];
  preferredTarget: CadConversionTarget;
  summary: string;
  targetDetail: string;
  validation: CadConversionValidationReport;
}

export interface CadImportPreflightReport {
  conversionPlan?: CadConversionPlan;
  detail: string;
  extension: string;
  status: CadImportStatus;
  title: string;
  validation?: CadConversionValidationReport;
}

const importableModelExtensions = new Set(["glb", "gltf", "obj", "stl"]);
const gaussianSplatExtensions = new Set(["splat"]);
const nativeCadExtensions = new Set(["step", "stp", "iges", "igs", "brep", "sat", "sab", "3dm"]);
const cadExchangeExtensions = new Set(["dae", "fbx", "ifc", "usd", "usdc", "3ds", "3mf"]);
const freeCadConversionScript = ".\\scripts\\cad\\freecad-mesh-export.py";
const blenderConversionScript = ".\\scripts\\cad\\blender-export-glb.py";

function formatMegabytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getOutputStem(fileName: string) {
  const baseName = fileName.replace(/\.[^.]+$/u, "").trim() || "cad-model";

  return baseName.replace(/[^\w.-]+/gu, "-").replace(/^-+|-+$/gu, "") || "cad-model";
}

function quoteCommandValue(value: string) {
  return JSON.stringify(value);
}

function createNativeCadConversionPlan(file: Pick<File, "name" | "size">, extension: string): CadConversionPlan {
  const outputStem = getOutputStem(file.name);
  const input = quoteCommandValue(file.name);
  const validation = createCadConversionValidationReport(file, "native-cad", "stl");
  const linearDeflection = validation.tessellationBudget.linearDeflection;
  const angularDeflection = validation.tessellationBudget.angularDeflection;

  return {
    checklist: [
      "Use STL for a single watertight solid or OBJ when separate faces/groups should remain inspectable.",
      validation.unitMetadata.sourceUnit === "unknown" ? "Set or confirm source units during conversion before publishing browser scenes." : `Source units were detected as ${validation.unitMetadata.sourceUnit}; verify scale after import.`,
      "Decimate or split very dense meshes before publishing browser scenes.",
    ],
    commands: [
      {
        command: `freecadcmd ${freeCadConversionScript} ${input} ${quoteCommandValue(`${outputStem}.stl`)} --linear-deflection ${linearDeflection} --angular-deflection ${angularDeflection}`,
        label: "FreeCAD mesh to STL",
        target: "stl",
        tool: "freecad",
      },
      {
        command: `freecadcmd ${freeCadConversionScript} ${input} ${quoteCommandValue(`${outputStem}.obj`)} --linear-deflection ${linearDeflection} --angular-deflection ${angularDeflection}`,
        label: "FreeCAD mesh to OBJ",
        target: "obj",
        tool: "freecad",
      },
    ],
    preferredTarget: "stl",
    summary: `${extension.toUpperCase()} can be meshed locally with FreeCAD, then imported here as STL or OBJ.`,
    targetDetail: `${formatMegabytes(file.size)} source. ${validation.summary} Generated STL/OBJ files import directly through the model pipeline.`,
    validation,
  };
}

function createExchangeConversionPlan(file: Pick<File, "name" | "size">, extension: string): CadConversionPlan {
  const outputStem = getOutputStem(file.name);
  const validation = createCadConversionValidationReport(file, "exchange", "glb");

  return {
    checklist: [
      "Use GLB when materials, transforms, object hierarchy, or animation clips matter.",
      validation.unitMetadata.sourceUnit === "unknown" ? "Apply transforms and confirm units during export so axes and scale match the browser viewport." : `Apply transforms using ${validation.unitMetadata.sourceUnit} units so axes and scale match the browser viewport.`,
      "Re-open the GLB locally before sharing if the source file used external textures.",
    ],
    commands: [
      {
        command: `blender --background --python ${blenderConversionScript} -- ${quoteCommandValue(file.name)} ${quoteCommandValue(`${outputStem}.glb`)}`,
        label: "Blender export to GLB",
        target: "glb",
        tool: "blender",
      },
    ],
    preferredTarget: "glb",
    summary: `${extension.toUpperCase()} can be normalized to GLB with Blender before import.`,
    targetDetail: `${formatMegabytes(file.size)} source. ${validation.summary} Generated GLB imports with the GLTF runtime path.`,
    validation,
  };
}

export function analyzeCadImportFile(file: Pick<File, "name" | "size">): CadImportPreflightReport {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (importableModelExtensions.has(extension)) {
    const heavy = file.size > 12 * 1024 * 1024;
    const target = extension === "stl" ? "stl" : extension === "obj" ? "obj" : "glb";
    const validation = createCadConversionValidationReport(file, "direct-model", target);

    return {
      detail: heavy ? `${formatMegabytes(file.size)} may be slow in browser scenes; decimate or split before publishing. ${validation.summary}` : `${extension.toUpperCase()} can be imported directly. ${validation.summary}`,
      extension,
      status: "importable",
      title: heavy ? "Large model import" : "Ready to import",
      validation,
    };
  }

  if (gaussianSplatExtensions.has(extension)) {
    const heavy = file.size > 32 * 1024 * 1024;
    const validation = createCadConversionValidationReport(file, "splat", "glb");

    return {
      detail: heavy ? `${formatMegabytes(file.size)} may be slow in browser scenes; crop or simplify before publishing. ${validation.summary}` : `SPLAT can be imported directly. ${validation.summary}`,
      extension,
      status: "importable",
      title: heavy ? "Large splat import" : "Ready to import",
      validation,
    };
  }

  if (nativeCadExtensions.has(extension)) {
    const conversionPlan = createNativeCadConversionPlan(file, extension);

    return {
      conversionPlan,
      detail: `${conversionPlan.summary} ${conversionPlan.targetDetail}`,
      extension,
      status: "native-cad",
      title: "Native CAD needs conversion",
      validation: conversionPlan.validation,
    };
  }

  if (cadExchangeExtensions.has(extension)) {
    const conversionPlan = createExchangeConversionPlan(file, extension);

    return {
      conversionPlan,
      detail: `${conversionPlan.summary} ${conversionPlan.targetDetail}`,
      extension,
      status: "native-cad",
      title: "Exchange file needs conversion",
      validation: conversionPlan.validation,
    };
  }

  return {
    detail: "Use GLB, GLTF, OBJ, STL, or SPLAT. Native CAD sources should be converted before import.",
    extension,
    status: "unsupported",
    title: "Unsupported model format",
  };
}
