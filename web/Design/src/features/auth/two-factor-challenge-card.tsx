"use client";

import { KeyRound } from "lucide-react";

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

type TwoFactorChallengeCardProps = {
  next: string;
  hasError: boolean;
  action: (formData: FormData) => Promise<void>;
};

export function TwoFactorChallengeCard({
  next,
  hasError,
  action,
}: TwoFactorChallengeCardProps) {
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
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          {copy.twoFactor.title}
        </CardTitle>
        <CardDescription>{copy.twoFactor.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <div className="space-y-2">
            <Label htmlFor="two-factor-code">
              {copy.twoFactor.authenticatorCode}
            </Label>
            <Input
              id="two-factor-code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="123456"
              required
            />
          </div>
          {hasError ? (
            <Alert variant="destructive">
              <AlertDescription>{copy.twoFactor.mismatch}</AlertDescription>
            </Alert>
          ) : null}
          <Button type="submit" className="w-full">
            {copy.twoFactor.verify}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
