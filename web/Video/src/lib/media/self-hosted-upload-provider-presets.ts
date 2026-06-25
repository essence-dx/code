export type SelfHostedUploadProviderId = "generic-put" | "cloudflare-r2" | "s3-compatible" | "supabase-storage" | "firebase-storage" | "bunny-storage";

export interface SelfHostedUploadProviderPreset {
  id: SelfHostedUploadProviderId;
  name: string;
  profileName: string;
  uploadUrlPlaceholder: string;
  publicBaseUrlPlaceholder: string;
}

export const selfHostedUploadProviderPresets: SelfHostedUploadProviderPreset[] = [
  {
    id: "generic-put",
    name: "Generic signed PUT",
    profileName: "Main storage",
    uploadUrlPlaceholder: "https://storage.example.com/upload-token",
    publicBaseUrlPlaceholder: "https://media.example.com/projects/",
  },
  {
    id: "cloudflare-r2",
    name: "Cloudflare R2",
    profileName: "R2 bucket",
    uploadUrlPlaceholder: "https://account.r2.cloudflarestorage.com/bucket/file?X-Amz-Signature=...",
    publicBaseUrlPlaceholder: "https://media.example.com/projects/",
  },
  {
    id: "s3-compatible",
    name: "S3 compatible",
    profileName: "S3 bucket",
    uploadUrlPlaceholder: "https://bucket.s3.region.amazonaws.com/file?X-Amz-Signature=...",
    publicBaseUrlPlaceholder: "https://cdn.example.com/projects/",
  },
  {
    id: "supabase-storage",
    name: "Supabase Storage",
    profileName: "Supabase bucket",
    uploadUrlPlaceholder: "https://project.supabase.co/storage/v1/object/sign/bucket/file?token=...",
    publicBaseUrlPlaceholder: "https://project.supabase.co/storage/v1/object/public/bucket/projects/",
  },
  {
    id: "firebase-storage",
    name: "Firebase Storage",
    profileName: "Firebase bucket",
    uploadUrlPlaceholder: "https://firebasestorage.googleapis.com/v0/b/bucket/o/file?uploadType=media&...",
    publicBaseUrlPlaceholder: "https://firebasestorage.googleapis.com/v0/b/bucket/o/projects/",
  },
  {
    id: "bunny-storage",
    name: "Bunny Storage",
    profileName: "Bunny storage",
    uploadUrlPlaceholder: "https://storage.bunnycdn.com/zone/projects/file",
    publicBaseUrlPlaceholder: "https://cdn.example.com/projects/",
  },
];

export const defaultSelfHostedUploadProviderId: SelfHostedUploadProviderId = "generic-put";

export function getSelfHostedUploadProviderPreset(providerId: string | null | undefined) {
  return selfHostedUploadProviderPresets.find((preset) => preset.id === providerId) ?? selfHostedUploadProviderPresets[0];
}

export function normalizeSelfHostedUploadProviderId(value: unknown): SelfHostedUploadProviderId {
  return typeof value === "string" && selfHostedUploadProviderPresets.some((preset) => preset.id === value)
    ? (value as SelfHostedUploadProviderId)
    : defaultSelfHostedUploadProviderId;
}
