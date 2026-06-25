"use client";

import Link from "next/link";
import { WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AiWorkspaceCard() {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-lg">AI workspace</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3 rounded-md border border-border p-3">
          <WandSparkles className="mt-0.5 size-4 text-primary" />
          <p className="text-sm text-muted-foreground">Script, captions, B-roll, video-project, repurpose, and edit-plan actions are available when creative AI is configured.</p>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link href="/editor">Open AI panel</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
