import type { DesignFileSummary } from "@/features/files/actions";

export type FileFilter =
  | "recent"
  | "drafts"
  | "handoff"
  | "collaboration"
  | "favorite"
  | "trash";

export type CollaborationQueueFilter =
  | "all"
  | "editable"
  | "review"
  | "view-only"
  | "team";

export type FileSort =
  | "updated"
  | "name"
  | "role"
  | "comments"
  | "handoff";

export type FileWorkspacePreset = {
  id: string;
  label: string;
  filter: FileFilter;
  sort: FileSort;
  collaborationQueue: CollaborationQueueFilter;
};

export type FileBrowserGroup = {
  id: string;
  label: string;
  detail: string;
  files: DesignFileSummary[];
};

export type FileQueueStats = {
  drafts: number;
  handoff: number;
  collaboration: number;
  openComments: number;
};

export type FileWorkspaceSummary = {
  id: string;
  teamName: string;
  projectName: string;
  fileCount: number;
  draftCount: number;
  handoffCount: number;
  sharedCount: number;
  openCommentCount: number;
  latestUpdatedAt: string;
};

export const fileFilters: Array<{ id: FileFilter; label: string }> = [
  { id: "recent", label: "Recent" },
  { id: "drafts", label: "Drafts" },
  { id: "handoff", label: "Handoff" },
  { id: "collaboration", label: "Shared" },
  { id: "favorite", label: "Starred" },
  { id: "trash", label: "Trash" },
];

export const collaborationQueueFilters: Array<{
  id: CollaborationQueueFilter;
  label: string;
}> = [
  { id: "all", label: "All" },
  { id: "editable", label: "Can edit" },
  { id: "review", label: "Review" },
  { id: "view-only", label: "View only" },
  { id: "team", label: "Team" },
];

export const fileSortOptions: Array<{ id: FileSort; label: string }> = [
  { id: "updated", label: "Updated" },
  { id: "name", label: "Name" },
  { id: "role", label: "Role" },
  { id: "comments", label: "Comments" },
  { id: "handoff", label: "Handoff" },
];

export const fileWorkspacePresets: FileWorkspacePreset[] = [
  {
    id: "my-drafts",
    label: "My drafts",
    filter: "drafts",
    sort: "updated",
    collaborationQueue: "all",
  },
  {
    id: "review-queue",
    label: "Review",
    filter: "collaboration",
    sort: "comments",
    collaborationQueue: "review",
  },
  {
    id: "handoff-ready",
    label: "Handoff",
    filter: "handoff",
    sort: "handoff",
    collaborationQueue: "all",
  },
  {
    id: "shared-edit",
    label: "Can edit",
    filter: "collaboration",
    sort: "updated",
    collaborationQueue: "editable",
  },
];

export function getVisibleFiles(
  files: DesignFileSummary[],
  filter: FileFilter,
  query: string,
  collaborationQueue: CollaborationQueueFilter = "all",
  sort: FileSort = "updated",
) {
  const normalized = query.trim().toLowerCase();
  const scoped = files.filter(
    (file) =>
      matchesFileFilter(file, filter) &&
      matchesCollaborationQueueFilter(file, filter, collaborationQueue),
  );

  if (!normalized) {
    return sortFiles(scoped, sort);
  }

  return sortFiles(
    scoped.filter((file) => getFileSearchText(file).includes(normalized)),
    sort,
  );
}

export function getFileBrowserGroups(files: DesignFileSummary[]) {
  const groups = new Map<string, FileBrowserGroup>();

  for (const file of files) {
    const key = `${file.teamName}::${file.projectName}`;
    const current = groups.get(key);

    if (current) {
      current.files.push(file);
      continue;
    }

    groups.set(key, {
      id: key,
      label: file.projectName,
      detail: file.teamName,
      files: [file],
    });
  }

  return Array.from(groups.values());
}

export function getFileQueueStats(files: DesignFileSummary[]): FileQueueStats {
  const activeFiles = files.filter((file) => !file.trashedAt);

  return {
    drafts: activeFiles.filter(isDraftFile).length,
    handoff: activeFiles.filter(isHandoffFile).length,
    collaboration: activeFiles.filter(isCollaborationFile).length,
    openComments: activeFiles.reduce(
      (total, file) => total + file.openCommentCount,
      0,
    ),
  };
}

export function getFileWorkspaceSummaries(
  files: DesignFileSummary[],
): FileWorkspaceSummary[] {
  const groups = new Map<string, DesignFileSummary[]>();

  for (const file of files.filter((item) => !item.trashedAt)) {
    const key = `${file.teamName}::${file.projectName}`;
    groups.set(key, [...(groups.get(key) ?? []), file]);
  }

  return Array.from(groups.entries())
    .map(([id, groupFiles]) => {
      const [firstFile] = groupFiles;

      return {
        id,
        teamName: firstFile?.teamName ?? "Personal",
        projectName: firstFile?.projectName ?? "Drafts",
        fileCount: groupFiles.length,
        draftCount: groupFiles.filter(isDraftFile).length,
        handoffCount: groupFiles.filter(isHandoffFile).length,
        sharedCount: groupFiles.filter(isCollaborationFile).length,
        openCommentCount: groupFiles.reduce(
          (total, file) => total + file.openCommentCount,
          0,
        ),
        latestUpdatedAt: groupFiles
          .map(getFileTime)
          .reduce((latest, time) => Math.max(latest, time), 0)
          .toString(),
      };
    })
    .sort((first, second) => Number(second.latestUpdatedAt) - Number(first.latestUpdatedAt));
}

export function getFileWorkspaceInventoryCsv(files: DesignFileSummary[]) {
  const summaryHeader: Array<keyof FileWorkspaceSummary> = [
    "id",
    "teamName",
    "projectName",
    "fileCount",
    "draftCount",
    "handoffCount",
    "sharedCount",
    "openCommentCount",
    "latestUpdatedAt",
  ];
  const fileHeader: Array<keyof DesignFileSummary> = [
    "id",
    "name",
    "scope",
    "teamName",
    "projectName",
    "accessRole",
    "favorite",
    "pageCount",
    "layerCount",
    "openCommentCount",
    "readyForDevCount",
    "prototypeHotspotCount",
    "updatedAt",
    "lastOpenedAt",
    "trashedAt",
  ];

  return [
    "section,workspace",
    summaryHeader.join(","),
    ...getFileWorkspaceSummaries(files).map((summary) =>
      summaryHeader.map((key) => escapeCsvCell(summary[key])).join(","),
    ),
    "",
    "section,files",
    fileHeader.join(","),
    ...files.map((file) =>
      fileHeader.map((key) => escapeCsvCell(file[key])).join(","),
    ),
  ].join("\n");
}

function matchesFileFilter(file: DesignFileSummary, filter: FileFilter) {
  if (filter === "trash") {
    return file.trashedAt !== null;
  }

  if (file.trashedAt !== null) {
    return false;
  }

  if (filter === "drafts") {
    return isDraftFile(file);
  }

  if (filter === "handoff") {
    return isHandoffFile(file);
  }

  if (filter === "collaboration") {
    return isCollaborationFile(file);
  }

  if (filter === "favorite") {
    return file.favorite;
  }

  return true;
}

function isDraftFile(file: DesignFileSummary) {
  return (
    file.scope === "private" ||
    file.projectName.toLowerCase().includes("draft")
  );
}

function isHandoffFile(file: DesignFileSummary) {
  return file.readyForDevCount > 0 || file.prototypeHotspotCount > 0;
}

function isCollaborationFile(file: DesignFileSummary) {
  return file.accessRole !== "owner" || file.scope !== "private";
}

function matchesCollaborationQueueFilter(
  file: DesignFileSummary,
  filter: FileFilter,
  collaborationQueue: CollaborationQueueFilter,
) {
  if (filter !== "collaboration" || collaborationQueue === "all") {
    return true;
  }

  if (collaborationQueue === "editable") {
    return file.accessRole === "owner" || file.accessRole === "editor";
  }

  if (collaborationQueue === "review") {
    return file.accessRole === "commenter" || file.openCommentCount > 0;
  }

  if (collaborationQueue === "view-only") {
    return file.accessRole === "viewer";
  }

  return file.scope !== "private";
}

function getFileSearchText(file: DesignFileSummary) {
  return [
    file.name,
    file.scope,
    file.teamName,
    file.projectName,
    file.accessRole,
  ]
    .join(" ")
    .toLowerCase();
}

function sortFiles(files: DesignFileSummary[], sort: FileSort) {
  return [...files].sort((first, second) => {
    if (sort === "name") {
      return first.name.localeCompare(second.name);
    }

    if (sort === "role") {
      return first.accessRole.localeCompare(second.accessRole);
    }

    if (sort === "comments") {
      return (
        second.openCommentCount - first.openCommentCount ||
        compareUpdated(second, first)
      );
    }

    if (sort === "handoff") {
      return (
        getHandoffScore(second) - getHandoffScore(first) ||
        compareUpdated(second, first)
      );
    }

    return compareUpdated(second, first);
  });
}

function compareUpdated(first: DesignFileSummary, second: DesignFileSummary) {
  return getFileTime(first) - getFileTime(second);
}

function getFileTime(file: DesignFileSummary) {
  return new Date(
    file.trashedAt ?? file.lastOpenedAt ?? file.updatedAt,
  ).getTime();
}

function getHandoffScore(file: DesignFileSummary) {
  return file.readyForDevCount + file.prototypeHotspotCount;
}

function escapeCsvCell(value: boolean | number | string | null) {
  if (value === null) {
    return "";
  }

  const text = String(value);

  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}
