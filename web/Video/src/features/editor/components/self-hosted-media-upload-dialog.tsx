"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CloudUpload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SelfHostedUploadHistoryList } from "@/features/editor/components/self-hosted-upload-history-list";
import { SelfHostedUploadProfileReadinessHistory } from "@/features/editor/components/self-hosted-upload-profile-readiness-history";
import { SelfHostedUploadProfileReadinessPanel } from "@/features/editor/components/self-hosted-upload-profile-readiness-panel";
import type { MediaAsset } from "@/lib/editor/types";
import type { SelfHostedMediaUploadInput } from "@/lib/media/self-hosted-upload";
import { loadSelfHostedUploadHistory, type SelfHostedUploadHistoryEntry } from "@/lib/media/self-hosted-upload-history";
import {
  checkSelfHostedUploadProfileReadiness,
  loadSelfHostedUploadProfileReadinessHistory,
  saveSelfHostedUploadProfileReadinessReport,
  type SelfHostedUploadProfileReadinessReport,
} from "@/lib/media/self-hosted-upload-profile-readiness";
import {
  defaultSelfHostedUploadProviderId,
  getSelfHostedUploadProviderPreset,
  selfHostedUploadProviderPresets,
} from "@/lib/media/self-hosted-upload-provider-presets";
import {
  createSelfHostedPublicUrl,
  loadSelfHostedUploadProfiles,
  removeSelfHostedUploadProfile,
  saveSelfHostedUploadProfile,
  type SelfHostedUploadProfile,
} from "@/lib/media/self-hosted-upload-profiles";

type SelfHostedMediaUploadDialogProps = {
  asset: MediaAsset | null;
  isUploading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (input: SelfHostedMediaUploadInput) => Promise<boolean>;
};

export function SelfHostedMediaUploadDialog({
  asset,
  isUploading,
  open,
  onOpenChange,
  onUpload,
}: SelfHostedMediaUploadDialogProps) {
  const [profiles, setProfiles] = useState<SelfHostedUploadProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState(noProfileValue);
  const [uploadUrl, setUploadUrl] = useState("");
  const [publicUrl, setPublicUrl] = useState("");
  const [selectedProviderId, setSelectedProviderId] = useState(defaultSelfHostedUploadProviderId);
  const [profileName, setProfileName] = useState("");
  const [profileBaseUrl, setProfileBaseUrl] = useState("");
  const [uploadHistory, setUploadHistory] = useState<SelfHostedUploadHistoryEntry[]>([]);
  const [readinessReport, setReadinessReport] = useState<SelfHostedUploadProfileReadinessReport | null>(null);
  const [readinessHistory, setReadinessHistory] = useState<SelfHostedUploadProfileReadinessReport[]>([]);
  const [isCheckingReadiness, setIsCheckingReadiness] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId) ?? null;
  const selectedProvider = getSelfHostedUploadProviderPreset(selectedProviderId);

  useEffect(() => {
    if (!open) return;
    setProfiles(loadSelfHostedUploadProfiles());
    setUploadHistory(loadSelfHostedUploadHistory());
    setReadinessHistory(loadSelfHostedUploadProfileReadinessHistory());
    setReadinessReport(null);
  }, [open]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!uploadUrl.trim() || !publicUrl.trim()) {
      setError("Enter both the signed upload URL and public media URL.");
      return;
    }

    const uploaded = await onUpload({ uploadUrl, publicUrl });
    if (!uploaded) return;

    setUploadUrl("");
    setPublicUrl("");
    setUploadHistory(loadSelfHostedUploadHistory());
    onOpenChange(false);
  }

  function selectProfile(profileId: string) {
    setSelectedProfileId(profileId);
    const profile = profiles.find((item) => item.id === profileId);
    if (!profile) return;
    setSelectedProviderId(profile.providerId);
    setReadinessReport(null);
    if (!asset) return;
    setPublicUrl(createSelfHostedPublicUrl(profile, asset.name));
  }

  function selectProvider(providerId: string) {
    const preset = getSelfHostedUploadProviderPreset(providerId);
    setSelectedProviderId(preset.id);
    setReadinessReport(null);
    if (!profileName.trim()) setProfileName(preset.profileName);
  }

  function saveProfile() {
    setError(null);

    try {
      const nextProfiles = saveSelfHostedUploadProfile({ name: profileName, providerId: selectedProviderId, publicBaseUrl: profileBaseUrl });
      const profile = nextProfiles[0] ?? null;
      setProfiles(nextProfiles);
      setProfileName("");
      setProfileBaseUrl("");
      if (profile) selectSavedProfile(profile, nextProfiles);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Storage profile could not be saved.");
    }
  }

  function removeProfile() {
    if (!selectedProfile) return;
    setProfiles(removeSelfHostedUploadProfile(selectedProfile.id));
    setSelectedProfileId(noProfileValue);
    setReadinessReport(null);
  }

  function selectSavedProfile(profile: SelfHostedUploadProfile, availableProfiles: SelfHostedUploadProfile[]) {
    setSelectedProfileId(profile.id);
    setSelectedProviderId(profile.providerId);
    const savedProfile = availableProfiles.find((item) => item.id === profile.id) ?? profile;
    if (asset) setPublicUrl(createSelfHostedPublicUrl(savedProfile, asset.name));
  }

  async function checkSelectedProfileReadiness() {
    if (!selectedProfile) return;
    setIsCheckingReadiness(true);
    setError(null);

    try {
      const report = await checkSelfHostedUploadProfileReadiness(selectedProfile, asset?.name);
      setReadinessReport(report);
      setReadinessHistory(saveSelfHostedUploadProfileReadinessReport(report));
    } finally {
      setIsCheckingReadiness(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload To Your Storage</DialogTitle>
          <DialogDescription>
            {asset ? `Upload ${asset.name} with a signed PUT URL, then keep the public file URL in this project.` : "Upload a media file you control."}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="self-hosted-upload-url">Signed upload URL</Label>
            <Input
              id="self-hosted-upload-url"
              value={uploadUrl}
              onChange={(event) => setUploadUrl(event.target.value)}
              placeholder={selectedProvider.uploadUrlPlaceholder}
              disabled={isUploading}
            />
          </div>
          <div className="grid gap-3 rounded-md border border-border p-3">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,0.9fr)_1fr_auto]">
              <div className="space-y-2">
                <Label>Provider preset</Label>
                <Select value={selectedProviderId} onValueChange={selectProvider} disabled={isUploading}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {selfHostedUploadProviderPresets.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id}>
                        {preset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Storage profile</Label>
                <Select value={selectedProfileId} onValueChange={selectProfile} disabled={isUploading || profiles.length === 0}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a profile" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={noProfileValue}>No profile</SelectItem>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" variant="outline" className="self-end" onClick={removeProfile} disabled={isUploading || !selectedProfile}>
                <Trash2 className="size-4" />
                Remove
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={checkSelectedProfileReadiness}
                disabled={isUploading || isCheckingReadiness || !selectedProfile}
              >
                {isCheckingReadiness ? "Checking..." : "Check profile"}
              </Button>
            </div>
            <SelfHostedUploadProfileReadinessPanel report={readinessReport} />
            <SelfHostedUploadProfileReadinessHistory
              activeProfileId={selectedProfile?.id ?? null}
              history={readinessHistory}
              onHistoryChange={setReadinessHistory}
            />
            <div className="grid gap-3 sm:grid-cols-[minmax(0,0.45fr)_1fr_auto]">
              <div className="space-y-2">
                <Label htmlFor="self-hosted-profile-name">Profile name</Label>
                <Input
                  id="self-hosted-profile-name"
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                  placeholder={selectedProvider.profileName}
                  disabled={isUploading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="self-hosted-profile-base-url">Public folder URL</Label>
                <Input
                  id="self-hosted-profile-base-url"
                  value={profileBaseUrl}
                  onChange={(event) => setProfileBaseUrl(event.target.value)}
                  placeholder={selectedProvider.publicBaseUrlPlaceholder}
                  disabled={isUploading}
                />
              </div>
              <Button type="button" variant="secondary" className="self-end" onClick={saveProfile} disabled={isUploading}>
                Save profile
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="self-hosted-public-url">Public media URL</Label>
            <Input
              id="self-hosted-public-url"
              value={publicUrl}
              onChange={(event) => setPublicUrl(event.target.value)}
              placeholder="https://media.example.com/clip.mp4"
              disabled={isUploading}
            />
          </div>
          <SelfHostedUploadHistoryList entries={uploadHistory} onEntriesChange={setUploadHistory} />
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUploading || !asset}>
              <CloudUpload className="size-4" />
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const noProfileValue = "__none__";
