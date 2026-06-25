"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Frame, Loader2, MailCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";

type AuthMode = "sign-in" | "sign-up" | "verify";

export function AuthPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const otp = String(formData.get("otp") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    startTransition(async () => {
      try {
        if (mode === "verify") {
          await verifyOtp(email, otp);
          return;
        }

        if (mode === "sign-up") {
          const response = await authClient.signUp.email({
            name,
            email,
            password,
          });

          if (response.error) {
            setError(response.error.message ?? "Account creation failed.");
            return;
          }

          setVerificationEmail(email);
          setMode("verify");
          setNotice("We sent a verification code to your email.");
          return;
        }

        const response = await authClient.signIn.email({ email, password });

        if (response.error) {
          const message = response.error.message ?? "Authentication failed.";

          if (isVerificationError(message)) {
            await sendVerificationOtp(email);
            setVerificationEmail(email);
            setMode("verify");
            setNotice("We sent a fresh verification code to your email.");
            return;
          }

          setError(message);
          return;
        }

        router.refresh();
      } catch (authError) {
        setError(getErrorMessage(authError));
      }
    });
  }

  function resendVerificationCode() {
    const email = verificationEmail.trim();

    if (!email) {
      setError("Enter your email before requesting a new code.");
      return;
    }

    setError(null);
    setNotice(null);

    startTransition(async () => {
      try {
        await sendVerificationOtp(email);
        setNotice("A new verification code is on its way.");
      } catch (authError) {
        setError(getErrorMessage(authError));
      }
    });
  }

  async function verifyOtp(email: string, otp: string) {
    if (!email || !otp) {
      setError("Enter your email and verification code.");
      return;
    }

    const response = await postAuthJson<{ status?: boolean }>(
      "/api/auth/email-otp/verify-email",
      {
        email,
        otp,
      },
    );

    if (!response.status) {
      setError("That verification code was not accepted.");
      return;
    }

    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <section className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-2xl shadow-black/30">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-md border border-border bg-primary text-primary-foreground">
            <Frame className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Essence Figma</h1>
            <p className="text-sm text-muted-foreground">
              Private design workspace
            </p>
          </div>
        </div>

        <Separator className="my-5" />

        <form className="space-y-4" onSubmit={handleSubmit}>
          {mode === "sign-up" ? (
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" autoComplete="name" required />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={mode === "verify" ? verificationEmail : undefined}
              onChange={
                mode === "verify"
                  ? (event) => setVerificationEmail(event.currentTarget.value)
                  : undefined
              }
              required
            />
          </div>

          {mode === "verify" ? (
            <div className="space-y-2">
              <Label htmlFor="otp">Verification code</Label>
              <Input
                id="otp"
                name="otp"
                inputMode="numeric"
                maxLength={6}
                pattern="[0-9]{6}"
                placeholder="000000"
                required
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={
                  mode === "sign-up" ? "new-password" : "current-password"
                }
                minLength={8}
                required
              />
            </div>
          )}

          {notice ? (
            <Alert>
              <MailCheck className="size-4" />
              <AlertDescription>{notice}</AlertDescription>
            </Alert>
          ) : null}

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Button className="w-full" type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {getSubmitLabel(mode)}
          </Button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {getModeHint(mode)}
          </span>
          <div className="flex items-center gap-1">
            {mode === "verify" ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resendVerificationCode}
                disabled={isPending}
              >
                Resend
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setError(null);
                setNotice(null);
                setMode((current) =>
                  current === "sign-in" ? "sign-up" : "sign-in",
                );
              }}
            >
              {mode === "sign-up" ? "Sign in" : "Create one"}
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

async function sendVerificationOtp(email: string) {
  await postAuthJson("/api/auth/email-otp/send-verification-otp", {
    email,
    type: "email-verification",
  });
}

async function postAuthJson<TResponse>(
  path: string,
  body: Record<string, string>,
) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getPayloadMessage(payload) ?? "Authentication request failed.");
  }

  const errorMessage = getNestedErrorMessage(payload);

  if (errorMessage) {
    throw new Error(errorMessage);
  }

  return payload as TResponse;
}

function getNestedErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const error = (payload as { error?: unknown }).error;

  if (error && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : null;
  }

  return null;
}

function getPayloadMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const message = (payload as { message?: unknown }).message;

  if (typeof message === "string") {
    return message;
  }

  return getNestedErrorMessage(payload);
}

function isVerificationError(message: string) {
  return /verif/i.test(message);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Authentication failed.";
}

function getSubmitLabel(mode: AuthMode) {
  if (mode === "sign-up") {
    return "Create account";
  }

  if (mode === "verify") {
    return "Verify email";
  }

  return "Sign in";
}

function getModeHint(mode: AuthMode) {
  if (mode === "sign-up") {
    return "Already registered?";
  }

  if (mode === "verify") {
    return "Need another code?";
  }

  return "Need an account?";
}
