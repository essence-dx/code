"use client";

import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";

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
import { getAuthCopy } from "@/features/auth/auth-localization";
import { productName } from "@/lib/product";

type ForgotPasswordCardProps = {
  sent: boolean;
  hasError: boolean;
  action: (formData: FormData) => Promise<void>;
};

export function ForgotPasswordCard({
  sent,
  hasError,
  action,
}: ForgotPasswordCardProps) {
  const { locale, updateLocale } = useAuthLocale();
  const copy = getAuthCopy(locale);

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
        <CardTitle>{copy.forgotPassword.title}</CardTitle>
        <CardDescription>
          {copy.forgotPassword.description(productName)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email">{copy.forgotPassword.email}</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="reset-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="pl-9"
              />
            </div>
          </div>

          {sent ? (
            <Alert>
              <AlertDescription>{copy.forgotPassword.sent}</AlertDescription>
            </Alert>
          ) : null}

          {hasError ? (
            <Alert variant="destructive">
              <AlertDescription>{copy.forgotPassword.error}</AlertDescription>
            </Alert>
          ) : null}

          <Button type="submit" className="w-full">
            {copy.forgotPassword.sendResetLink}
          </Button>
        </form>

        <Button asChild variant="ghost" className="w-full">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            {copy.forgotPassword.backToSignIn}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
