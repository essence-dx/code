"use client";

import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { AuthLocaleSelect, useAuthLocale } from "@/features/auth/auth-locale";
import { getAuthCopy, type AuthCopy } from "@/features/auth/auth-localization";

type ResetPasswordCardProps = {
  token: string;
  error: string | null;
  action: (formData: FormData) => Promise<void>;
};

export function ResetPasswordCard({
  token,
  error,
  action,
}: ResetPasswordCardProps) {
  const { locale, updateLocale } = useAuthLocale();
  const copy = getAuthCopy(locale);
  const hasToken = Boolean(token);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="mb-2 flex justify-end">
          <AuthLocaleSelect
            label={copy.language}
            locale={locale}
            onLocaleChange={updateLocale}
          />
        </div>
        <CardTitle>{copy.resetPassword.title}</CardTitle>
        <CardDescription>{copy.resetPassword.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={action} className="space-y-4">
          <input type="hidden" name="token" value={token} />
          <div className="space-y-2">
            <Label htmlFor="new-password">
              {copy.resetPassword.newPassword}
            </Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="new-password"
                name="newPassword"
                type="password"
                minLength={8}
                autoComplete="new-password"
                required
                disabled={!hasToken}
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">
              {copy.resetPassword.confirmPassword}
            </Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                minLength={8}
                autoComplete="new-password"
                required
                disabled={!hasToken}
                className="pl-9"
              />
            </div>
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>
                {getResetErrorMessage(error, copy)}
              </AlertDescription>
            </Alert>
          ) : null}

          <Button type="submit" className="w-full" disabled={!hasToken}>
            {copy.resetPassword.resetPassword}
          </Button>
        </form>

        <Button asChild variant="ghost" className="w-full">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            {copy.resetPassword.backToSignIn}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function getResetErrorMessage(error: string, copy: AuthCopy) {
  if (error === "password") {
    return copy.resetPassword.errors.password;
  }

  if (error === "missing-token") {
    return copy.resetPassword.errors.missingToken;
  }

  return copy.resetPassword.errors.invalid;
}
