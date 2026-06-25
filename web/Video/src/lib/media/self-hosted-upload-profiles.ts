"use client";

import { createId } from "@/lib/editor/factory";
import { normalizeSelfHostedMediaUrl } from "@/lib/media/self-hosted-media";
import {
  defaultSelfHostedUploadProviderId,
  normalizeSelfHostedUploadProviderId,
  type SelfHostedUploadProviderId,
} from "@/lib/media/self-hosted-upload-provider-presets";

export interface SelfHostedUploadProfile {
  id: string;
  name: string;
  providerId: SelfHostedUploadProviderId;
  publicBaseUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface SelfHostedUploadProfileInput {
  name: string;
  providerId?: string;
  publicBaseUrl: string;
}

const uploadProfilesStorageKey = "essence.selfHostedUploadProfiles.v1";
const maxProfileCount = 12;

export function loadSelfHostedUploadProfiles(): SelfHostedUploadProfile[] {
  if (!hasBrowserStorage()) return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(uploadProfilesStorageKey) ?? "[]");
    return normalizeProfiles(parsed);
  } catch {
    return [];
  }
}

export function saveSelfHostedUploadProfile(input: SelfHostedUploadProfileInput): SelfHostedUploadProfile[] {
  const current = loadSelfHostedUploadProfiles();
  const now = new Date().toISOString();
  const name = cleanProfileName(input.name);
  const publicBaseUrl = normalizePublicBaseUrl(input.publicBaseUrl);
  const providerId = normalizeSelfHostedUploadProviderId(input.providerId ?? defaultSelfHostedUploadProviderId);
  const existing = current.find((profile) => profile.name.toLowerCase() === name.toLowerCase());
  const nextProfile: SelfHostedUploadProfile = {
    id: existing?.id ?? createId("storage_profile"),
    name,
    providerId,
    publicBaseUrl,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  const next = [nextProfile, ...current.filter((profile) => profile.id !== nextProfile.id)].slice(0, maxProfileCount);

  saveProfiles(next);
  return next;
}

export function removeSelfHostedUploadProfile(profileId: string): SelfHostedUploadProfile[] {
  const next = loadSelfHostedUploadProfiles().filter((profile) => profile.id !== profileId);
  saveProfiles(next);
  return next;
}

export function createSelfHostedPublicUrl(profile: SelfHostedUploadProfile, fileName: string) {
  const base = profile.publicBaseUrl.endsWith("/") ? profile.publicBaseUrl : `${profile.publicBaseUrl}/`;
  return new URL(encodeURIComponent(cleanPublicFilename(fileName)), base).toString();
}

function saveProfiles(profiles: SelfHostedUploadProfile[]) {
  if (!hasBrowserStorage()) return;
  window.localStorage.setItem(uploadProfilesStorageKey, JSON.stringify(profiles));
}

function normalizeProfiles(value: unknown): SelfHostedUploadProfile[] {
  if (!Array.isArray(value)) return [];
  const profiles: SelfHostedUploadProfile[] = [];

  for (const item of value) {
    const profile = normalizeProfile(item);
    if (profile && !profiles.some((existing) => existing.id === profile.id)) {
      profiles.push(profile);
    }
  }

  return profiles.slice(0, maxProfileCount);
}

function normalizeProfile(value: unknown): SelfHostedUploadProfile | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<SelfHostedUploadProfile>;
  if (!candidate.id || !candidate.name || !candidate.publicBaseUrl || !candidate.createdAt || !candidate.updatedAt) return null;

  try {
    return {
      id: cleanProfileId(candidate.id),
      name: cleanProfileName(candidate.name),
      providerId: normalizeSelfHostedUploadProviderId(candidate.providerId),
      publicBaseUrl: normalizePublicBaseUrl(candidate.publicBaseUrl),
      createdAt: candidate.createdAt,
      updatedAt: candidate.updatedAt,
    };
  } catch {
    return null;
  }
}

function cleanProfileId(value: string) {
  return value.trim().replace(/[^\w-]/g, "").slice(0, 96) || createId("storage_profile");
}

function cleanProfileName(value: string) {
  const name = value.trim().replace(/\s+/g, " ").slice(0, 80);
  if (!name) throw new Error("Enter a storage profile name.");
  return name;
}

function normalizePublicBaseUrl(value: string) {
  const url = normalizeSelfHostedMediaUrl(value);
  return url.endsWith("/") ? url : `${url}/`;
}

function cleanPublicFilename(value: string) {
  return value
    .trim()
    .replace(/[\\/]/g, "-")
    .replace(/[^\w. -]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 140) || "media";
}

function hasBrowserStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}
