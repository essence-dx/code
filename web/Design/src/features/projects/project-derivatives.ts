import type { ProjectSummary } from "@/features/editor/types";

export type ProjectDerivativeVariant = {
  project: ProjectSummary;
  sourceUpdatedAfterVariant: boolean;
};

export type ProjectDerivativeGroup = {
  sourceProjectId: string;
  source: ProjectSummary | null;
  variants: ProjectDerivativeVariant[];
  needsReviewCount: number;
  updatedAt: string;
};

export function buildProjectDerivativeGroups(
  projects: ProjectSummary[],
): ProjectDerivativeGroup[] {
  const activeProjects = projects.filter((project) => !project.deletedAt);
  const projectsById = new Map(
    activeProjects.map((project) => [project.id, project]),
  );
  const variantsBySource = new Map<string, ProjectSummary[]>();

  for (const project of activeProjects) {
    if (!project.sourceProjectId) continue;

    const variants = variantsBySource.get(project.sourceProjectId) ?? [];
    variants.push(project);
    variantsBySource.set(project.sourceProjectId, variants);
  }

  return [...variantsBySource.entries()]
    .map(([sourceProjectId, variants]) => {
      const source = projectsById.get(sourceProjectId) ?? null;
      const variantItems = variants
        .map((project) => ({
          project,
          sourceUpdatedAfterVariant: hasSourceChangedAfterVariant(
            source,
            project,
          ),
        }))
        .sort((a, b) => compareNewestFirst(a.project.updatedAt, b.project.updatedAt));
      const updatedAt = [
        source?.updatedAt,
        ...variants.map((item) => item.updatedAt),
      ]
        .filter((value): value is string => Boolean(value))
        .sort(compareNewestFirst)[0];

      return {
        sourceProjectId,
        source,
        variants: variantItems,
        needsReviewCount: variantItems.filter(
          (item) => item.sourceUpdatedAfterVariant,
        ).length,
        updatedAt: updatedAt ?? new Date(0).toISOString(),
      };
    })
    .sort((a, b) => compareNewestFirst(a.updatedAt, b.updatedAt));
}

function hasSourceChangedAfterVariant(
  source: ProjectSummary | null,
  variant: ProjectSummary,
) {
  if (!source) return false;

  return new Date(source.updatedAt).getTime() > new Date(variant.updatedAt).getTime();
}

function compareNewestFirst(a: string, b: string) {
  return new Date(b).getTime() - new Date(a).getTime();
}
