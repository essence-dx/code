import type {
  AdminFileRow,
  AdminShareRow,
  AdminUserRow,
} from "@/features/admin/admin-data";

export type UserReviewFilter = "all" | "pending" | "sessions" | "owners";
export type ShareReviewFilter =
  | "all"
  | "live"
  | "expired"
  | "risky"
  | "disabled";
export type FileReviewFilter =
  | "all"
  | "collaborative"
  | "editors"
  | "public"
  | "stale-shares"
  | "comments"
  | "prototypes";

export type AdminReviewFilterOption<TValue extends string> = {
  value: TValue;
  label: string;
  count: number;
};

export function filterUsers(
  rows: AdminUserRow[],
  filter: UserReviewFilter,
  query: string,
) {
  return rows.filter(
    (row) =>
      matchesUserFilter(row, filter) &&
      matchesQuery(query, [
        row.name,
        row.email,
        row.emailVerified ? "verified" : "pending",
        `${row.sessions} sessions`,
        `${row.files} files`,
      ]),
  );
}

export function filterShares(
  rows: AdminShareRow[],
  filter: ShareReviewFilter,
  query: string,
) {
  return rows.filter(
    (row) =>
      matchesShareFilter(row, filter) &&
      matchesQuery(query, [
        row.fileName,
        row.ownerEmail,
        row.permissionPreset,
        row.accessLevel,
        row.allowComments ? "comments" : "no comments",
        row.allowDownload ? "downloads" : "no downloads",
      ]),
  );
}

export function filterFiles(
  rows: AdminFileRow[],
  filter: FileReviewFilter,
  query: string,
) {
  return rows.filter(
    (row) =>
      matchesFileFilter(row, filter) &&
      matchesQuery(query, [
        row.name,
        row.ownerEmail,
        row.teamName,
        row.projectName,
        row.scope,
        `${row.collaboratorCount} collaborators`,
        `${row.editorCount} editors`,
        `${row.publicShareCount} public links`,
        `${row.staleShareCount} stale links`,
      ]),
  );
}

export function getUserFilterOptions(
  rows: AdminUserRow[],
): AdminReviewFilterOption<UserReviewFilter>[] {
  return [
    { value: "all", label: "All", count: rows.length },
    {
      value: "pending",
      label: "Pending",
      count: rows.filter((row) => !row.emailVerified).length,
    },
    {
      value: "sessions",
      label: "Sessions",
      count: rows.filter((row) => row.sessions > 0).length,
    },
    {
      value: "owners",
      label: "Owners",
      count: rows.filter((row) => row.files > 0).length,
    },
  ];
}

export function getShareFilterOptions(
  rows: AdminShareRow[],
): AdminReviewFilterOption<ShareReviewFilter>[] {
  return [
    { value: "all", label: "All", count: rows.length },
    { value: "live", label: "Live", count: rows.filter(isLiveShare).length },
    {
      value: "expired",
      label: "Expired",
      count: rows.filter(isExpiredShare).length,
    },
    { value: "risky", label: "Risk", count: rows.filter(isShareRisky).length },
    {
      value: "disabled",
      label: "Disabled",
      count: rows.filter((row) => row.disabledAt).length,
    },
  ];
}

export function getFileFilterOptions(
  rows: AdminFileRow[],
): AdminReviewFilterOption<FileReviewFilter>[] {
  return [
    { value: "all", label: "All", count: rows.length },
    {
      value: "collaborative",
      label: "Shared",
      count: rows.filter((row) => row.collaboratorCount > 0).length,
    },
    {
      value: "editors",
      label: "Editors",
      count: rows.filter((row) => row.editorCount > 0).length,
    },
    {
      value: "public",
      label: "Public",
      count: rows.filter((row) => row.publicShareCount > 0).length,
    },
    {
      value: "stale-shares",
      label: "Stale links",
      count: rows.filter((row) => row.staleShareCount > 0).length,
    },
    {
      value: "comments",
      label: "Comments",
      count: rows.filter((row) => row.openCommentCount > 0).length,
    },
    {
      value: "prototypes",
      label: "Prototype",
      count: rows.filter((row) => row.brokenPrototypeCount > 0).length,
    },
  ];
}

function matchesUserFilter(row: AdminUserRow, filter: UserReviewFilter) {
  if (filter === "pending") {
    return !row.emailVerified;
  }

  if (filter === "sessions") {
    return row.sessions > 0;
  }

  if (filter === "owners") {
    return row.files > 0;
  }

  return true;
}

function matchesShareFilter(row: AdminShareRow, filter: ShareReviewFilter) {
  if (filter === "live") {
    return isLiveShare(row);
  }

  if (filter === "expired") {
    return isExpiredShare(row);
  }

  if (filter === "risky") {
    return isShareRisky(row);
  }

  if (filter === "disabled") {
    return Boolean(row.disabledAt);
  }

  return true;
}

function matchesFileFilter(row: AdminFileRow, filter: FileReviewFilter) {
  if (filter === "collaborative") {
    return row.collaboratorCount > 0;
  }

  if (filter === "editors") {
    return row.editorCount > 0;
  }

  if (filter === "public") {
    return row.publicShareCount > 0;
  }

  if (filter === "stale-shares") {
    return row.staleShareCount > 0;
  }

  if (filter === "comments") {
    return row.openCommentCount > 0;
  }

  if (filter === "prototypes") {
    return row.brokenPrototypeCount > 0;
  }

  return true;
}

function isLiveShare(row: AdminShareRow) {
  return !row.disabledAt && !isExpiredShare(row);
}

function isExpiredShare(row: AdminShareRow) {
  return Boolean(
    !row.disabledAt &&
      row.expiresAt &&
      new Date(row.expiresAt).getTime() < Date.now(),
  );
}

function isShareRisky(row: AdminShareRow) {
  return Boolean(
    !row.disabledAt &&
      (isExpiredShare(row) ||
        row.allowDownload ||
        row.allowComments ||
        row.accessLevel === "review"),
  );
}

function matchesQuery(query: string, values: string[]) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return values.some((value) => value.toLowerCase().includes(normalized));
}
