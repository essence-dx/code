"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient } from "@/lib/auth/client";
import { assertClientApiRuntime, isClientApiUnavailableError, useHasClientApiRuntime } from "@/lib/runtime/client-api";

export function AuthPanel() {
  const [mode, setMode] = useState("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canUseAccount = useHasClientApiRuntime();

  async function submit() {
    if (!canUseAccount) {
      setMessage("Accounts are unavailable in this desktop build.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      assertClientApiRuntime();
      const result =
        mode === "sign-up"
          ? await authClient.signUp.email({ email, password, name: name || email.split("@")[0] })
          : await authClient.signIn.email({ email, password });

      if (result.error) {
        setMessage(authFailureMessage(mode));
        return;
      }

      setMessage(mode === "sign-up" ? "Account created. You are signed in." : "Signed in.");
    } catch (error) {
      setMessage(isClientApiUnavailableError(error) ? "Accounts are unavailable in this desktop build." : authFailureMessage(mode));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full border-border/70 bg-card/80 shadow-none">
      <CardHeader>
        <CardTitle className="text-lg">Account</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={mode} onValueChange={setMode}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sign-in">Sign in</TabsTrigger>
            <TabsTrigger value="sign-up">Create</TabsTrigger>
          </TabsList>
          <TabsContent value="sign-in" className="mt-4 space-y-3">
            <AuthFields email={email} password={password} setEmail={setEmail} setPassword={setPassword} />
          </TabsContent>
          <TabsContent value="sign-up" className="mt-4 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <AuthFields email={email} password={password} setEmail={setEmail} setPassword={setPassword} />
          </TabsContent>
        </Tabs>
        <Button className="mt-4 w-full" onClick={submit} disabled={isSubmitting || !email || !password || !canUseAccount}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : mode === "sign-up" ? "Create account" : "Sign in"}
        </Button>
        {!canUseAccount ? <p className="mt-3 text-sm text-muted-foreground">Accounts are unavailable in this desktop build.</p> : null}
        {message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
      </CardContent>
    </Card>
  );
}

function authFailureMessage(mode: string) {
  return mode === "sign-up"
    ? "Could not create the account. Check the email and password, then try again."
    : "Could not sign in. Check the email and password, then try again.";
}

function AuthFields({
  email,
  password,
  setEmail,
  setPassword,
}: {
  email: string;
  password: string;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
      </div>
    </>
  );
}
