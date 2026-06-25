import { nanoid } from "nanoid";
import type { AnimationProperty, AnimationTrack, SceneDocument, SceneState, Vec3 } from "../types";

const transformAnimationProperties = ["position", "rotation", "scale"] as const satisfies AnimationProperty[];

function cloneVec3(value: Vec3): Vec3 {
  return [value[0], value[1], value[2]];
}

function sameVec3(left: Vec3, right: Vec3) {
  return left.every((value, index) => Math.abs(value - right[index]) < 0.0001);
}

function createStateAnimationTrack(objectId: string, property: (typeof transformAnimationProperties)[number], from: Vec3, to: Vec3, duration: number): AnimationTrack {
  return {
    id: nanoid(),
    objectId,
    property,
    easing: "easeInOut",
    loop: false,
    keyframes: [
      {
        id: nanoid(),
        time: 0,
        value: cloneVec3(from),
      },
      {
        id: nanoid(),
        time: duration,
        value: cloneVec3(to),
      },
    ],
  };
}

export function createAnimationTracksFromSceneState(document: SceneDocument, sceneState: SceneState, duration: number): AnimationTrack[] {
  const currentTracks = document.animationTracks ?? [];
  const objectById = new Map(document.objects.map((object) => [object.id, object]));
  const stateObjectIds = new Set(sceneState.objects.map((objectState) => objectState.objectId));
  const generatedTracks: AnimationTrack[] = [];

  for (const objectState of sceneState.objects) {
    const object = objectById.get(objectState.objectId);

    if (!object || object.locked) {
      continue;
    }

    for (const property of transformAnimationProperties) {
      const from = object.transform[property];
      const to = objectState.transform[property];

      if (!sameVec3(from, to)) {
        generatedTracks.push(createStateAnimationTrack(object.id, property, from, to, duration));
      }
    }
  }

  if (generatedTracks.length === 0) {
    return currentTracks;
  }

  const preservedTracks = currentTracks.filter((track) => !stateObjectIds.has(track.objectId) || !transformAnimationProperties.includes(track.property as (typeof transformAnimationProperties)[number]));

  return [...preservedTracks, ...generatedTracks];
}
