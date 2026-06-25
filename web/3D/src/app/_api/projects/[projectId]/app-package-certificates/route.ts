import { headers } from "next/headers";
import { z } from "zod";
import { appPackageCertificatePlatforms, createProjectAppPackageCertificateReport } from "@/features/projects/app-package-certificates";
import { getProjectArtifactRegistryReport } from "@/features/projects/server/project-artifact-registry-service";
import { listProjectAppPackageCertificates, saveProjectAppPackageCertificate } from "@/features/projects/server/app-package-certificate-service";
import { auth } from "@/lib/auth";

const appPackagePresetIds = ["web", "tauri", "signed-tauri", "capacitor", "android-apk", "android-aab", "visionos-preview"] as const;

const certificatePayloadSchema = z.object({
  bundleIdentifier: z.string().trim().min(1).max(160).nullable().optional(),
  expiresAt: z.string().datetime(),
  fingerprintSha256: z.string().trim().min(32).max(128),
  issuer: z.string().trim().min(1).max(220),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).nullable().optional(),
  platform: z.enum(appPackageCertificatePlatforms),
  presetId: z.enum(appPackagePresetIds).nullable().optional(),
  revokedAt: z.string().datetime().nullable().optional(),
  serialNumber: z.string().trim().min(1).max(160),
  sourceArtifactId: z.string().trim().min(1).max(220).nullable().optional(),
  subject: z.string().trim().min(1).max(220),
  teamId: z.string().trim().min(1).max(120).nullable().optional(),
  validFrom: z.string().datetime(),
  verifiedAt: z.string().datetime().nullable().optional(),
});

async function getSessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

export async function GET(_request: Request, context: { params: Promise<{ projectId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;
  const registryResult = await getProjectArtifactRegistryReport({
    currentUserId: userId,
    projectId,
  });

  if ("error" in registryResult) {
    return Response.json({ error: registryResult.error }, { status: registryResult.status });
  }

  const certificates = await listProjectAppPackageCertificates([projectId]);
  const report = createProjectAppPackageCertificateReport({
    artifactRegistryReport: registryResult.report,
    certificates,
  });

  return Response.json({ certificates, report });
}

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = certificatePayloadSchema.safeParse(await request.json());

  if (!payload.success) {
    return Response.json({ error: "Invalid certificate payload" }, { status: 400 });
  }

  const { projectId } = await context.params;
  const result = await saveProjectAppPackageCertificate({
    certificate: {
      ...payload.data,
      presetId: payload.data.presetId ?? null,
      verifiedAt: payload.data.verifiedAt ?? null,
    },
    currentUserId: userId,
    projectId,
  });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({ certificate: result.certificate });
}
