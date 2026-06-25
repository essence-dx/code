"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MailCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient } from "@/lib/auth-client";

type Mode = "sign-in" | "sign-up";
type AuthView = Mode | "verify";

async function postAuthEndpoint(path: string, body: Record<string, string>) {
  const response = await fetch(`/api/auth${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof payload?.message === "string" ? payload.message : "The request could not be completed.";
    throw new Error(message);
  }

  return payload;
}

function isEmailVerificationError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as Record<string, unknown>;
  const code = String(record.code ?? "").toUpperCase();
  const message = String(record.message ?? "").toLowerCase();

  return code.includes("EMAIL_NOT_VERIFIED") || message.includes("email not verified");
}

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [view, setView] = useState<AuthView>("sign-in");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateMode(value: Mode) {
    setMode(value);
    setView(value);
    setError(null);
    setNotice(null);
  }

  async function sendVerificationCode(email: string) {
    await postAuthEndpoint("/email-otp/send-verification-otp", {
      email,
      type: "email-verification",
    });
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    setNotice(null);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const name = String(formData.get("name") ?? "Spreadsheet user");

    startTransition(async () => {
      const result =
        mode === "sign-up"
          ? await authClient.signUp.email({
              email,
              password,
              name,
              callbackURL: "/workbooks",
            })
          : await authClient.signIn.email({
              email,
              password,
              callbackURL: "/workbooks",
            });

      if (result.error) {
        if (isEmailVerificationError(result.error)) {
          setVerificationEmail(email);
          setView("verify");
          setNotice("A confirmation code was sent to this email.");
          return;
        }

        setError(result.error.message ?? "Authentication failed.");
        return;
      }

      if (mode === "sign-up") {
        setVerificationEmail(email);
        setView("verify");
        setNotice("A confirmation code was sent to this email.");
        return;
      }

      router.replace("/workbooks");
      router.refresh();
    });
  }

  function handleVerify(formData: FormData) {
    setError(null);
    setNotice(null);
    const email = String(formData.get("verificationEmail") ?? verificationEmail);
    const otp = String(formData.get("otp") ?? "").replace(/\D/g, "");

    startTransition(async () => {
      try {
        await postAuthEndpoint("/email-otp/verify-email", { email, otp });
        router.replace("/workbooks");
        router.refresh();
      } catch (verifyError) {
        setError(
          verifyError instanceof Error
            ? verifyError.message
            : "The confirmation code could not be verified.",
        );
      }
    });
  }

  function handleResendCode() {
    setError(null);
    setNotice(null);

    startTransition(async () => {
      try {
        await sendVerificationCode(verificationEmail);
        setNotice("A fresh confirmation code was sent.");
      } catch (sendError) {
        setError(
          sendError instanceof Error
            ? sendError.message
            : "A new confirmation code could not be sent.",
        );
      }
    });
  }

  if (view === "verify") {
    return (
      <form action={handleVerify} className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border bg-background p-3">
          <span className="mt-0.5 grid size-8 place-items-center rounded-md bg-primary/10 text-primary">
            <MailCheck className="size-4" />
          </span>
          <div className="space-y-1">
            <h2 className="text-sm font-semibold">Confirm your email</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Enter the six-digit code sent to your inbox.
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="verificationEmail">Email</Label>
          <Input
            id="verificationEmail"
            name="verificationEmail"
            type="email"
            autoComplete="email"
            value={verificationEmail}
            onChange={(event) => setVerificationEmail(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="otp">Confirmation code</Label>
          <Input
            id="otp"
            name="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="000000"
            required
          />
        </div>
        {notice ? (
          <Alert>
            <AlertTitle>Check your inbox</AlertTitle>
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        ) : null}
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Could not confirm email</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <div className="grid gap-2">
          <Button className="w-full" type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" /> : null}
            Confirm email
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleResendCode}
            disabled={isPending || verificationEmail.length === 0}
          >
            Send another code
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => updateMode("sign-in")}
          >
            Back to sign in
          </Button>
        </div>
      </form>
    );
  }

  return (
    <Tabs value={mode} onValueChange={(value) => updateMode(value as Mode)}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="sign-in">Sign in</TabsTrigger>
        <TabsTrigger value="sign-up">Create account</TabsTrigger>
      </TabsList>
      <TabsContent value={mode} className="mt-6">
        <form action={handleSubmit} className="space-y-4">
          {mode === "sign-up" ? (
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" autoComplete="name" placeholder="essencefromexistence" />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              defaultValue={verificationEmail}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
              minLength={8}
              required
            />
          </div>
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Could not continue</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {notice ? (
            <Alert>
              <AlertTitle>Check your inbox</AlertTitle>
              <AlertDescription>{notice}</AlertDescription>
            </Alert>
          ) : null}
          <Button className="w-full" type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" /> : null}
            {mode === "sign-up" ? "Create free workspace" : "Open workspace"}
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  );
}
