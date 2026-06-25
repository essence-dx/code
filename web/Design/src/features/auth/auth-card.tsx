"use client";

import { LockKeyhole, Mail, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuthLocaleSelect } from "@/features/auth/auth-locale";
import type { AuthCopy } from "@/features/auth/auth-localization";
import type { EditorLocale } from "@/features/editor/editor-localization";
import { authClient } from "@/lib/auth-client";

type AuthMode = "sign-in" | "sign-up";

type AuthCardProps = {
  copy: AuthCopy;
  locale: EditorLocale;
  onLocaleChange: (value: string) => void;
  showLocaleSelect?: boolean;
};

export function AuthCard({
  copy,
  locale,
  onLocaleChange,
  showLocaleSelect = true,
}: AuthCardProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const title = useMemo(
    () =>
      mode === "sign-in"
        ? copy.authCard.title.signIn
        : copy.authCard.title.signUp,
    [copy.authCard.title.signIn, copy.authCard.title.signUp, mode],
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const name = String(
      formData.get("name") || email.split("@")[0] || copy.authCard.fallbackName,
    );

    startTransition(async () => {
      const result =
        mode === "sign-in"
          ? await authClient.signIn.email({ email, password })
          : await authClient.signUp.email({ email, password, name });

      if (result.error) {
        setError(result.error.message ?? copy.authCard.authenticationFailed);
        return;
      }

      router.refresh();
      router.push(
        mode === "sign-up"
          ? `/verify-email?email=${encodeURIComponent(email)}`
          : "/designs",
      );
    });
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="mb-2 flex items-center justify-between gap-3">
          <Badge variant="secondary">{copy.privateWorkspace}</Badge>
          {showLocaleSelect ? (
            <AuthLocaleSelect
              label={copy.language}
              locale={locale}
              onLocaleChange={onLocaleChange}
            />
          ) : null}
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{copy.authCard.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs
          value={mode}
          onValueChange={(value) => setMode(value as AuthMode)}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sign-in">{copy.authCard.tabs.signIn}</TabsTrigger>
            <TabsTrigger value="sign-up">{copy.authCard.tabs.signUp}</TabsTrigger>
          </TabsList>
          <TabsContent value={mode} className="mt-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "sign-up" ? (
                <div className="space-y-2">
                  <Label htmlFor="name">{copy.authCard.name}</Label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="name" name="name" className="pl-9" />
                  </div>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="email">{copy.authCard.email}</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{copy.authCard.password}</Label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete={
                      mode === "sign-in" ? "current-password" : "new-password"
                    }
                    className="pl-9"
                  />
                </div>
              </div>
              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending
                  ? copy.authCard.working
                  : mode === "sign-in"
                    ? copy.authCard.signIn
                    : copy.authCard.createAccount}
              </Button>
              {mode === "sign-in" ? (
                <Button asChild variant="ghost" className="w-full">
                  <Link href="/forgot-password">
                    {copy.authCard.forgotPassword}
                  </Link>
                </Button>
              ) : null}
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
