import { NextResponse } from "next/server";

import {
  createScimListResponse,
  parseEnterpriseScimUserResource,
  validateScimBearerToken,
} from "@/features/security/enterprise-sso-scim-enforcement";

export async function GET(request: Request) {
  const auth = authorizeScimRequest(request);

  if (!auth.ok) return createScimError(auth.error, auth.status);

  return NextResponse.json(createScimListResponse({ resources: [] }));
}

export async function POST(request: Request) {
  const auth = authorizeScimRequest(request);

  if (!auth.ok) return createScimError(auth.error, auth.status);

  const user = parseEnterpriseScimUserResource(await request.json());

  if (!user) return createScimError("Invalid SCIM user resource.", 400);

  return NextResponse.json(
    {
      schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
      id: user.id,
      userName: user.email,
      displayName: user.displayName,
      active: user.active,
      emails: [{ value: user.email, primary: true }],
      groups: user.groups.map((group) => ({ display: group, value: group })),
    },
    { status: 201 },
  );
}

function authorizeScimRequest(request: Request) {
  return validateScimBearerToken({
    authorization: request.headers.get("authorization"),
    expectedToken:
      process.env.ESSENCE_SCIM_BEARER_TOKEN ?? process.env.SCIM_BEARER_TOKEN,
  });
}

function createScimError(error: string, status: number) {
  return NextResponse.json(
    {
      schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
      detail: error,
      status: String(status),
    },
    { status },
  );
}
