import { createId, createProgressLayer, createProject, createShapeLayer, createTextLayer, cuesFromAi } from "@/lib/editor/factory";
import type { EditorProject, SubtitleCue, TimelineLayer } from "@/lib/editor/types";

export interface AiVideoProjectSceneInput {
  title: string;
  duration: number;
  headline: string;
  caption: string;
  visualPrompt: string;
  brollQuery?: string;
  backgroundColor: string;
  accentColor: string;
}

export interface AiVideoProjectInput {
  title: string;
  aspectRatio: "16:9" | "9:16" | "1:1" | "4:5";
  summary: string;
  exportPreset: "mp4-1080p" | "webm-1080p" | "gif-social" | "project-bundle";
  scenes: AiVideoProjectSceneInput[];
  notes: string[];
}

export function createAiVideoProject(input: AiVideoProjectInput): EditorProject {
  const project = createProject(cleanText(input.title, "AI video project"), input.aspectRatio);
  const now = new Date().toISOString();
  const scenes = input.scenes.slice(0, 12);
  const layers: TimelineLayer[] = [];
  const cues: Array<Omit<SubtitleCue, "id">> = [];
  let cursor = 0;

  scenes.forEach((scene, index) => {
    const duration = clampNumber(scene.duration, 1, 45);
    const sceneStart = cursor;
    layers.push(createSceneBackgroundLayer(scene, index, sceneStart, duration, project.width, project.height, now));
    layers.push(createSceneHeadlineLayer(scene, index, sceneStart, duration, project.width, now));
    layers.push(createSceneVisualNoteLayer(scene, index, sceneStart, duration, project.width, project.height, now));
    cues.push({
      start: sceneStart,
      end: sceneStart + duration,
      text: cleanText(scene.caption, scene.headline),
      emphasis: index === 0 ? "strong" : "normal",
    });
    cursor += duration;
  });

  const subtitleLayer = createSubtitleLayer(cuesFromAi(cues), cursor, project.width, project.height, now);
  const progressLayer = createProgressLayer(4);
  progressLayer.start = 0;
  progressLayer.duration = cursor;
  progressLayer.name = "Project progress";
  progressLayer.transform.y = 0.95;
  progressLayer.transform.width = Math.min(860, project.width * 0.75);

  project.layers = [...layers, subtitleLayer, progressLayer];
  project.duration = Math.max(1, cursor);
  project.markers = scenes.map((scene, index) => ({
    id: createId("marker"),
    time: scenes.slice(0, index).reduce((total, item) => total + clampNumber(item.duration, 1, 45), 0),
    label: cleanText(scene.title, `Scene ${index + 1}`),
    color: normalizeColor(scene.accentColor, "#ffffff"),
    createdAt: now,
    updatedAt: now,
  }));
  project.background = normalizeColor(scenes[0]?.backgroundColor, "#0a0a0a");
  project.updatedAt = now;

  return project;
}

function createSceneBackgroundLayer(
  scene: AiVideoProjectSceneInput,
  index: number,
  start: number,
  duration: number,
  projectWidth: number,
  projectHeight: number,
  now: string,
) {
  const layer = createShapeLayer(index * 3);
  layer.name = `Scene ${index + 1} background`;
  layer.start = start;
  layer.duration = duration;
  layer.transform.width = projectWidth;
  layer.transform.height = projectHeight;
  layer.style.background = normalizeColor(scene.backgroundColor, "#0a0a0a");
  layer.style.fill = layer.style.background;
  layer.style.radius = 0;
  layer.notes = scene.brollQuery
    ? `Visual: ${scene.visualPrompt}\nB-roll search: ${scene.brollQuery}`
    : `Visual: ${scene.visualPrompt}`;
  layer.transition = { in: index === 0 ? "fade" : "push", out: "fade", duration: 0.45 };
  layer.updatedAt = now;
  return layer;
}

function createSceneHeadlineLayer(scene: AiVideoProjectSceneInput, index: number, start: number, duration: number, projectWidth: number, now: string) {
  const layer = createTextLayer("text", index * 3 + 1);
  layer.name = `Scene ${index + 1} headline`;
  layer.start = start + Math.min(0.25, duration * 0.12);
  layer.duration = Math.max(1, duration - 0.35);
  layer.text = cleanText(scene.headline, scene.title);
  layer.transform.y = 0.34;
  layer.transform.width = Math.min(880, projectWidth * 0.82);
  layer.transform.height = 180;
  layer.motion = { preset: index % 2 === 0 ? "settle" : "slow-zoom", intensity: 1 };
  layer.style.fill = "#ffffff";
  layer.style.background = "transparent";
  layer.style.fontSize = projectWidth < 1200 ? 52 : 62;
  layer.style.fontWeight = 800;
  layer.style.shadowBlur = 24;
  layer.style.shadowColor = "#000000";
  layer.transition = { in: "pop", out: "fade", duration: 0.4 };
  layer.notes = scene.visualPrompt;
  layer.updatedAt = now;
  return layer;
}

function createSceneVisualNoteLayer(
  scene: AiVideoProjectSceneInput,
  index: number,
  start: number,
  duration: number,
  projectWidth: number,
  projectHeight: number,
  now: string,
) {
  const layer = createTextLayer("text", index * 3 + 2);
  layer.name = `Scene ${index + 1} visual direction`;
  layer.start = start + Math.min(0.55, duration * 0.18);
  layer.duration = Math.max(1, duration - 0.75);
  layer.text = cleanText(scene.visualPrompt, scene.title);
  layer.transform.y = 0.68;
  layer.transform.width = Math.min(760, projectWidth * 0.72);
  layer.transform.height = Math.min(150, projectHeight * 0.18);
  layer.style.fill = "#fafafa";
  layer.style.background = normalizeColor(scene.accentColor, "#171717");
  layer.style.fontSize = 30;
  layer.style.fontWeight = 650;
  layer.style.radius = 16;
  layer.style.opacity = 0.9;
  layer.transition = { in: "wipe-up", out: "fade", duration: 0.35 };
  layer.notes = scene.brollQuery ? `Use AI B-roll search: ${scene.brollQuery}` : undefined;
  layer.updatedAt = now;
  return layer;
}

function createSubtitleLayer(cues: SubtitleCue[], duration: number, projectWidth: number, projectHeight: number, now: string) {
  const layer = createTextLayer("subtitle", 99);
  layer.name = "Generated captions";
  layer.start = 0;
  layer.duration = duration;
  layer.cues = cues;
  layer.transform.y = 0.84;
  layer.transform.width = Math.min(860, projectWidth * 0.8);
  layer.transform.height = Math.min(150, projectHeight * 0.18);
  layer.style.fontSize = 38;
  layer.style.background = "#00000099";
  layer.style.radius = 12;
  layer.transition = { in: "none", out: "none", duration: 0 };
  layer.updatedAt = now;
  return layer;
}

function cleanText(value: string | undefined, fallback: string) {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

function normalizeColor(value: string | undefined, fallback: string) {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}
