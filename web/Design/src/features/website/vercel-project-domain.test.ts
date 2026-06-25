import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  attachVercelProjectDomain,
  getVercelProjectDomainStatus,
} from "@/features/website/vercel-project-domain";

describe("Vercel project domain attachment", () => {
  test("returns manual status when env is not configured", async () => {
    const result = await attachVercelProjectDomain("example.com", {
      env: {},
    });

    assert.equal(result.status, "manual");
  });

  test("posts domain attachment to the configured project", async () => {
    let requestedUrl = "";
    let requestedBody = "";

    const result = await attachVercelProjectDomain("www.example.com", {
      env: {
        VERCEL_API_TOKEN: "token",
        VERCEL_PROJECT_ID: "project_123",
        VERCEL_TEAM_ID: "team_123",
      },
      fetcher: async (url, init) => {
        requestedUrl = String(url);
        requestedBody = String(init?.body);

        return new Response(JSON.stringify({ name: "www.example.com" }), {
          status: 200,
        });
      },
    });

    assert.equal(result.status, "attached");
    assert.equal(
      requestedUrl,
      "https://api.vercel.com/v10/projects/project_123/domains?teamId=team_123",
    );
    assert.equal(requestedBody, JSON.stringify({ name: "www.example.com" }));
  });

  test("checks whether a domain is already attached to the configured project", async () => {
    let requestedUrl = "";
    let requestedMethod = "";

    const result = await getVercelProjectDomainStatus("www.example.com", {
      env: {
        VERCEL_API_TOKEN: "token",
        VERCEL_PROJECT_ID: "project_123",
        VERCEL_TEAM_SLUG: "studio",
      },
      fetcher: async (url, init) => {
        requestedUrl = String(url);
        requestedMethod = String(init?.method);

        return new Response(JSON.stringify({ name: "www.example.com" }), {
          status: 200,
        });
      },
    });

    assert.equal(result.status, "attached");
    assert.equal(requestedMethod, "GET");
    assert.equal(
      requestedUrl,
      "https://api.vercel.com/v9/projects/project_123/domains/www.example.com?slug=studio",
    );
  });

  test("returns manual status when the configured project is missing the domain", async () => {
    const result = await getVercelProjectDomainStatus("missing.example.com", {
      env: {
        VERCEL_API_TOKEN: "token",
        VERCEL_PROJECT_ID: "project_123",
      },
      fetcher: async () =>
        new Response(JSON.stringify({ error: { message: "not found" } }), {
          status: 404,
        }),
    });

    assert.equal(result.status, "manual");
  });
});
