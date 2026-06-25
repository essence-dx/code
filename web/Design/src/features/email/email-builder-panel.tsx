"use client";

import { useMemo, useState } from "react";
import { Download, Eye, Mail, Send } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { EditorLocale } from "@/features/editor/editor-localization";
import type { ProjectSummary } from "@/features/editor/types";
import { getEmailBuilderCopy } from "@/features/email/email-builder-localization";
import {
  emailBlockPacks,
  type EmailBlockPackId,
} from "@/features/email/email-block-library";

type ServerAction = (formData: FormData) => Promise<void> | void;

type EmailBuilderPanelProps = {
  locale: EditorLocale;
  sessionEmail: string;
  projects: ProjectSummary[];
  sendTestEmailAction: ServerAction;
};

export function EmailBuilderPanel({
  locale,
  sessionEmail,
  projects,
  sendTestEmailAction,
}: EmailBuilderPanelProps) {
  const copy = getEmailBuilderCopy(locale);
  const activeProjects = projects.filter((project) => !project.deletedAt);
  const defaultProject =
    activeProjects.find((project) => project.width === 1200) ??
    activeProjects[0] ??
    null;
  const [projectId, setProjectId] = useState(defaultProject?.id ?? "");
  const selectedProject = useMemo(
    () => activeProjects.find((project) => project.id === projectId) ?? null,
    [activeProjects, projectId],
  );
  const [subject, setSubject] = useState(
    selectedProject ? `${selectedProject.name}` : "",
  );
  const [previewText, setPreviewText] = useState("");
  const [blockPack, setBlockPack] = useState<EmailBlockPackId>("none");
  const encodedSubject = encodeURIComponent(subject);
  const encodedPreview = encodeURIComponent(previewText);
  const encodedBlockPack = encodeURIComponent(blockPack);
  const previewHref = projectId
    ? `/email/${projectId}?subject=${encodedSubject}&previewText=${encodedPreview}&blockPack=${encodedBlockPack}`
    : "#";
  const exportHref = projectId
    ? `/email/${projectId}/export?subject=${encodedSubject}&previewText=${encodedPreview}&blockPack=${encodedBlockPack}`
    : "#";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          {copy.title}
        </CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={sendTestEmailAction} className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email-project">{copy.design}</Label>
            <Select
              name="projectId"
              value={projectId}
              onValueChange={(nextProjectId) => {
                const nextProject = activeProjects.find(
                  (project) => project.id === nextProjectId,
                );

                setProjectId(nextProjectId);
                if (nextProject && !subject.trim()) {
                  setSubject(nextProject.name);
                }
              }}
              required
            >
              <SelectTrigger id="email-project" className="w-full">
                <SelectValue placeholder={copy.selectDesign} />
              </SelectTrigger>
              <SelectContent>
                {activeProjects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email-recipient">{copy.testRecipient}</Label>
            <Input
              id="email-recipient"
              name="recipient"
              type="email"
              defaultValue={sessionEmail}
              required
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="email-subject">{copy.subject}</Label>
            <Input
              id="email-subject"
              name="subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              maxLength={120}
              required
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="email-preview-text">{copy.previewText}</Label>
            <Textarea
              id="email-preview-text"
              name="previewText"
              value={previewText}
              onChange={(event) => setPreviewText(event.target.value)}
              maxLength={180}
              placeholder={copy.previewTextPlaceholder}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="email-block-pack">{copy.blockPack}</Label>
            <Select
              name="blockPack"
              value={blockPack}
              onValueChange={(value) => setBlockPack(value as EmailBlockPackId)}
            >
              <SelectTrigger id="email-block-pack" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {emailBlockPacks.map((pack) => (
                  <SelectItem key={pack.id} value={pack.id}>
                    {pack.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {emailBlockPacks.find((pack) => pack.id === blockPack)
                ?.description ?? copy.blockPackDescription}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button type="submit" disabled={!projectId}>
              <Send className="h-4 w-4" />
              {copy.sendTestEmail}
            </Button>
            <Button asChild variant="outline" aria-disabled={!projectId}>
              <a href={previewHref}>
                <Eye className="h-4 w-4" />
                {copy.preview}
              </a>
            </Button>
            <Button asChild variant="outline" aria-disabled={!projectId}>
              <a href={exportHref}>
                <Download className="h-4 w-4" />
                {copy.exportHtml}
              </a>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
