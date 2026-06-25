type ProjectDomainAttachStatus = "attached" | "manual" | "error";

type ProjectDomainAttachResult = {
  status: ProjectDomainAttachStatus;
  message: string | null;
};

type ProjectDomainAttachOptions = {
  env?: Record<string, string | undefined>;
  fetcher?: typeof fetch;
};

type VercelProjectDomainConfig = {
  token: string;
  projectId: string;
  query: string;
};

const missingConfigMessage =
  "Set VERCEL_API_TOKEN and VERCEL_PROJECT_ID to enable automatic platform attachment.";

export async function attachVercelProjectDomain(
  domain: string,
  options: ProjectDomainAttachOptions = {},
): Promise<ProjectDomainAttachResult> {
  const env = options.env ?? process.env;
  const config = getVercelProjectDomainConfig(env);

  if (!config) {
    return { status: "manual", message: missingConfigMessage };
  }

  const response = await (options.fetcher ?? fetch)(
    createProjectDomainsUrl(config, "v10"),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: domain }),
    },
  );

  if (response.ok) {
    return { status: "attached", message: null };
  }

  const message = await readVercelErrorMessage(response);

  if (
    response.status === 409 ||
    message.toLowerCase().includes("already")
  ) {
    return { status: "attached", message: null };
  }

  return {
    status: "error",
    message: message || `Vercel returned HTTP ${response.status}.`,
  };
}

export async function getVercelProjectDomainStatus(
  domain: string,
  options: ProjectDomainAttachOptions = {},
): Promise<ProjectDomainAttachResult> {
  const env = options.env ?? process.env;
  const config = getVercelProjectDomainConfig(env);

  if (!config) {
    return { status: "manual", message: missingConfigMessage };
  }

  const response = await (options.fetcher ?? fetch)(
    createProjectDomainUrl(config, domain, "v9"),
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (response.ok) {
    return { status: "attached", message: null };
  }

  const message = await readVercelErrorMessage(response);

  if (response.status === 404) {
    return {
      status: "manual",
      message: "Domain is not attached to the configured Vercel project yet.",
    };
  }

  return {
    status: "error",
    message: message || `Vercel returned HTTP ${response.status}.`,
  };
}

function getVercelProjectDomainConfig(
  env: Record<string, string | undefined>,
): VercelProjectDomainConfig | null {
  const token = env.VERCEL_API_TOKEN ?? env.VERCEL_TOKEN;
  const projectId =
    env.VERCEL_PROJECT_ID ?? env.VERCEL_PROJECT_NAME ?? env.VERCEL_PROJECT_SLUG;

  if (!token || !projectId) {
    return null;
  }

  const params = new URLSearchParams();
  const teamId = env.VERCEL_TEAM_ID;
  const teamSlug = env.VERCEL_TEAM_SLUG;

  if (teamId) params.set("teamId", teamId);
  if (teamSlug) params.set("slug", teamSlug);

  return { token, projectId, query: params.toString() };
}

function createProjectDomainsUrl(
  config: VercelProjectDomainConfig,
  apiVersion: "v9" | "v10",
) {
  return `https://api.vercel.com/${apiVersion}/projects/${encodeURIComponent(
    config.projectId,
  )}/domains${config.query ? `?${config.query}` : ""}`;
}

function createProjectDomainUrl(
  config: VercelProjectDomainConfig,
  domain: string,
  apiVersion: "v9" | "v10",
) {
  return `https://api.vercel.com/${apiVersion}/projects/${encodeURIComponent(
    config.projectId,
  )}/domains/${encodeURIComponent(domain)}${
    config.query ? `?${config.query}` : ""
  }`;
}

async function readVercelErrorMessage(response: Response) {
  try {
    const body = (await response.json()) as {
      error?: { message?: string };
      message?: string;
    };

    return body.error?.message ?? body.message ?? "";
  } catch {
    return "";
  }
}
