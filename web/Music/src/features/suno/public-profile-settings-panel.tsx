"use client";

import { Globe2, Loader2, Save, UserX } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  getOnlineActionTitle,
  useOnlineActionGuard,
} from "@/features/system/online-action-guard";
import { authClient } from "@/lib/auth-client";

type ProfileSettingsResponse = {
  blockedUsers: Array<{ blockedAt: string | Date; id: string; name: string }>;
  profile: {
    featuredPlaylistId: string | null;
    featuredSongId: string | null;
    profileCommentsEnabled: boolean;
    publicBio: string;
    publicSocialLinks: Array<{ label: string; url: string }>;
  };
  publicPlaylists: Array<{ id: string; name: string }>;
  publicSongs: Array<{ id: string; title: string }>;
};

export function PublicProfileSettingsPanel() {
  const { data: session } = authClient.useSession();
  const onlineGuard = useOnlineActionGuard();
  const connectionDisabled = !onlineGuard.canUseConnectionActions;
  const accountActionTitle = (title: string) =>
    getOnlineActionTitle(onlineGuard, "account", title);
  const [bio, setBio] = useState("");
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [featuredPlaylistId, setFeaturedPlaylistId] = useState("none");
  const [featuredSongId, setFeaturedSongId] = useState("none");
  const [linksText, setLinksText] = useState("");
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<{
    blockedUsers: ProfileSettingsResponse["blockedUsers"];
    playlists: ProfileSettingsResponse["publicPlaylists"];
    songs: ProfileSettingsResponse["publicSongs"];
  }>({ blockedUsers: [], playlists: [], songs: [] });

  useEffect(() => {
    if (!session?.user) {
      return;
    }

    if (connectionDisabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch("/api/profile/settings")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Could not load profile settings.");
        }

        return (await response.json()) as ProfileSettingsResponse;
      })
      .then((data) => {
        setBio(data.profile.publicBio);
        setCommentsEnabled(data.profile.profileCommentsEnabled);
        setFeaturedPlaylistId(data.profile.featuredPlaylistId ?? "none");
        setFeaturedSongId(data.profile.featuredSongId ?? "none");
        setLinksText(
          data.profile.publicSocialLinks
            .map((link) => `${link.label} | ${link.url}`)
            .join("\n"),
        );
        setOptions({
          blockedUsers: data.blockedUsers,
          playlists: data.publicPlaylists,
          songs: data.publicSongs,
        });
      })
      .catch((error) => {
        toast.error(
          error instanceof Error ? error.message : "Could not load profile settings.",
        );
      })
      .finally(() => setLoading(false));
  }, [connectionDisabled, session?.user]);

  async function saveProfile() {
    if (connectionDisabled) {
      toast.error(onlineGuard.accountDisabledReason);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/profile/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          featuredPlaylistId:
            featuredPlaylistId === "none" ? null : featuredPlaylistId,
          featuredSongId: featuredSongId === "none" ? null : featuredSongId,
          profileCommentsEnabled: commentsEnabled,
          publicBio: bio,
          publicSocialLinks: parseLinks(linksText),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error || "Could not save profile.");
      }

      toast.success("Public profile updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save profile.");
    } finally {
      setLoading(false);
    }
  }

  async function unblockUser(blockedUserId: string) {
    if (connectionDisabled) {
      toast.error(onlineGuard.accountDisabledReason);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/profile/blocks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ blockedUserId }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error || "Could not unblock user.");
      }

      setOptions((current) => ({
        ...current,
        blockedUsers: current.blockedUsers.filter(
          (blockedUser) => blockedUser.id !== blockedUserId,
        ),
      }));
      toast.success("User unblocked.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not unblock user.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-white/10 bg-white/[0.04]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe2 className="size-4 text-emerald-200" />
          Public profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!session?.user ? (
          <p className="text-sm text-muted-foreground">
            Sign in to edit your public profile.
          </p>
        ) : (
          <>
            {connectionDisabled ? (
              <Badge variant="outline">{onlineGuard.accountDisabledReason}</Badge>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="public-bio">Bio</Label>
              <Textarea
                id="public-bio"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                placeholder="Short public bio"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <ProfileSelect
                label="Featured track"
                value={featuredSongId}
                onValueChange={setFeaturedSongId}
                items={options.songs.map((song) => ({
                  label: song.title,
                  value: song.id,
                }))}
              />
              <ProfileSelect
                label="Featured playlist"
                value={featuredPlaylistId}
                onValueChange={setFeaturedPlaylistId}
                items={options.playlists.map((playlist) => ({
                  label: playlist.name,
                  value: playlist.id,
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="public-links">Social links</Label>
              <Textarea
                id="public-links"
                value={linksText}
                onChange={(event) => setLinksText(event.target.value)}
                placeholder="YouTube | https://youtube.com/@you"
              />
              <p className="text-xs text-muted-foreground">
                One link per line using Label | URL.
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-slate-950/50 p-3">
              <div>
                <p className="text-sm font-medium">Profile comments</p>
                <p className="text-xs text-muted-foreground">
                  Let signed-in listeners comment on your profile.
                </p>
              </div>
              <Switch
                checked={commentsEnabled}
                onCheckedChange={setCommentsEnabled}
              />
            </div>
            <Button
              className="gap-2"
              disabled={loading || connectionDisabled}
              title={accountActionTitle("Save profile")}
              onClick={() => {
                void saveProfile();
              }}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save profile
            </Button>
            <div className="space-y-2 rounded-md border border-white/10 bg-slate-950/50 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <UserX className="size-4 text-emerald-200" />
                Blocked users
              </div>
              {options.blockedUsers.length ? (
                <div className="space-y-2">
                  {options.blockedUsers.map((blockedUser) => (
                    <div
                      key={blockedUser.id}
                      className="flex items-center justify-between gap-3 rounded-md bg-black/20 p-2"
                    >
                      <div>
                        <p className="text-sm font-medium">{blockedUser.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Blocked{" "}
                          {new Date(blockedUser.blockedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={loading || connectionDisabled}
                        title={accountActionTitle("Unblock user")}
                        onClick={() => {
                          void unblockUser(blockedUser.id);
                        }}
                      >
                        Unblock
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No blocked users.
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ProfileSelect({
  items,
  label,
  onValueChange,
  value,
}: {
  items: Array<{ label: string; value: string }>;
  label: string;
  onValueChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None</SelectItem>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function parseLinks(value: string) {
  return value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...urlParts] = line.split("|");

      return {
        label: label.trim(),
        url: urlParts.join("|").trim(),
      };
    });
}
