"use client";

import { createAuthClient } from "better-auth/react";
import { clientApiOrigin } from "@/lib/runtime/client-api";

export const authClient = createAuthClient({
  baseURL: clientApiOrigin() ?? undefined,
});
