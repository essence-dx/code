import type { ObjectPropertyBinding, ObjectPropertyBindingTarget, SceneObject, SceneVariable, SceneVariableValue, Transform } from "../types";
import { evaluateNumericExpression } from "./variable-expressions";

const axisIndex = {
  x: 0,
  y: 1,
  z: 2,
} as const;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function readNumber(value: SceneVariableValue, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function readColor(value: SceneVariableValue, fallback: string) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

export function isNumericPropertyBindingTarget(property: ObjectPropertyBindingTarget) {
  return property !== "material.color" && property !== "text.content" && property !== "light.color";
}

function readPropertyNumber(object: SceneObject, property: ObjectPropertyBindingTarget) {
  switch (property) {
    case "transform.position.x":
      return object.transform.position[0];
    case "transform.position.y":
      return object.transform.position[1];
    case "transform.position.z":
      return object.transform.position[2];
    case "transform.rotation.x":
      return object.transform.rotation[0];
    case "transform.rotation.y":
      return object.transform.rotation[1];
    case "transform.rotation.z":
      return object.transform.rotation[2];
    case "transform.scale.x":
      return object.transform.scale[0];
    case "transform.scale.y":
      return object.transform.scale[1];
    case "transform.scale.z":
      return object.transform.scale[2];
    case "material.opacity":
      return object.material.opacity;
    case "material.roughness":
      return object.material.roughness;
    case "material.metalness":
      return object.material.metalness;
    case "text.fontSize":
      return object.text?.fontSize ?? 0.72;
    case "text.maxWidth":
      return object.text?.maxWidth ?? 6;
    case "light.intensity":
      return object.light?.intensity ?? 2.4;
    case "light.distance":
      return object.light?.distance ?? 12;
    case "light.angle":
      return object.light?.angle ?? 0.65;
    case "light.penumbra":
      return object.light?.penumbra ?? 0.35;
    default:
      return 0;
  }
}

function readBindingNumber(binding: ObjectPropertyBinding, variable: SceneVariable, variables: SceneVariable[], source: SceneObject) {
  const fallback = readNumber(variable.value, readPropertyNumber(source, binding.property));

  return binding.expression?.trim() ? evaluateNumericExpression(binding.expression, variables, fallback) : fallback;
}

function ensureRuntimeObject(current: SceneObject, source: SceneObject) {
  return current === source
    ? {
        ...source,
        material: { ...source.material },
        transform: {
          position: [...source.transform.position] as Transform["position"],
          rotation: [...source.transform.rotation] as Transform["rotation"],
          scale: [...source.transform.scale] as Transform["scale"],
        },
      }
    : current;
}

function writeTransformBinding(object: SceneObject, source: SceneObject, property: ObjectPropertyBindingTarget, value: number) {
  const [, group, axis] = property.split(".") as ["transform", keyof Transform, keyof typeof axisIndex];
  const nextObject = ensureRuntimeObject(object, source);
  const nextGroup = [...nextObject.transform[group]] as Transform[typeof group];

  nextGroup[axisIndex[axis]] = value;

  return {
    ...nextObject,
    transform: {
      ...nextObject.transform,
      [group]: nextGroup,
    },
  };
}

function writeTextBinding(object: SceneObject, source: SceneObject, property: ObjectPropertyBindingTarget, value: SceneVariableValue) {
  const nextObject = ensureRuntimeObject(object, source);
  const text = {
    content: source.text?.content ?? "Text",
    fontSize: source.text?.fontSize ?? 0.72,
    maxWidth: source.text?.maxWidth ?? 6,
    ...nextObject.text,
  };

  if (property === "text.content") {
    text.content = String(value);
  }

  if (property === "text.fontSize") {
    text.fontSize = clamp(readNumber(value, text.fontSize), 0.1, 8);
  }

  if (property === "text.maxWidth") {
    text.maxWidth = clamp(readNumber(value, text.maxWidth), 0.5, 24);
  }

  return {
    ...nextObject,
    text,
  };
}

function writeLightBinding(object: SceneObject, source: SceneObject, property: ObjectPropertyBindingTarget, value: SceneVariableValue) {
  const nextObject = ensureRuntimeObject(object, source);
  const light = {
    color: source.light?.color ?? "#ffffff",
    intensity: source.light?.intensity ?? 2.4,
    distance: source.light?.distance ?? 12,
    angle: source.light?.angle ?? 0.65,
    penumbra: source.light?.penumbra ?? 0.35,
    castShadow: source.light?.castShadow ?? true,
    shadowRadius: source.light?.shadowRadius ?? 2.2,
    shadowBias: source.light?.shadowBias ?? -0.0004,
    ...nextObject.light,
  };

  if (property === "light.color") {
    light.color = readColor(value, light.color);
  }

  if (property === "light.intensity") {
    light.intensity = clamp(readNumber(value, light.intensity), 0, 20);
  }

  if (property === "light.distance") {
    light.distance = clamp(readNumber(value, light.distance), 0, 100);
  }

  if (property === "light.angle") {
    light.angle = clamp(readNumber(value, light.angle), 0.05, Math.PI / 2);
  }

  if (property === "light.penumbra") {
    light.penumbra = clamp(readNumber(value, light.penumbra), 0, 1);
  }

  return {
    ...nextObject,
    light,
  };
}

function writeMaterialBinding(object: SceneObject, source: SceneObject, property: ObjectPropertyBindingTarget, value: SceneVariableValue) {
  const nextObject = ensureRuntimeObject(object, source);
  const material = { ...nextObject.material };

  if (property === "material.color") {
    material.color = readColor(value, material.color);
  }

  if (property === "material.opacity") {
    material.opacity = clamp(readNumber(value, material.opacity), 0, 1);
  }

  if (property === "material.roughness") {
    material.roughness = clamp(readNumber(value, material.roughness), 0, 1);
  }

  if (property === "material.metalness") {
    material.metalness = clamp(readNumber(value, material.metalness), 0, 1);
  }

  return {
    ...nextObject,
    material,
  };
}

export function resolveVariableBoundObject(object: SceneObject, variables: SceneVariable[]) {
  const bindings = object.variableBindings ?? [];

  if (bindings.length === 0 || variables.length === 0) {
    return object;
  }

  const variableById = new Map(variables.map((variable) => [variable.id, variable]));
  let nextObject = object;

  for (const binding of bindings) {
    if (!binding.variableId) {
      continue;
    }

    const variable = variableById.get(binding.variableId);

    if (!variable) {
      continue;
    }

    if (binding.property.startsWith("transform.")) {
      nextObject = writeTransformBinding(nextObject, object, binding.property, readBindingNumber(binding, variable, variables, object));
    } else if (binding.property.startsWith("text.")) {
      nextObject = writeTextBinding(
        nextObject,
        object,
        binding.property,
        isNumericPropertyBindingTarget(binding.property) ? readBindingNumber(binding, variable, variables, object) : variable.value,
      );
    } else if (binding.property.startsWith("light.")) {
      nextObject = writeLightBinding(
        nextObject,
        object,
        binding.property,
        isNumericPropertyBindingTarget(binding.property) ? readBindingNumber(binding, variable, variables, object) : variable.value,
      );
    } else if (binding.property.startsWith("material.")) {
      nextObject = writeMaterialBinding(
        nextObject,
        object,
        binding.property,
        isNumericPropertyBindingTarget(binding.property) ? readBindingNumber(binding, variable, variables, object) : variable.value,
      );
    }
  }

  return nextObject;
}
