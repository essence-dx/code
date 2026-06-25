"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deleteVoiceProfile,
  listVoiceProfiles,
  saveVoiceProfile,
  serializeVoiceProfiles,
  subscribeToVoiceProfiles,
  type VoiceProfile,
  type VoiceProfileInput,
} from "./voice-profiles";

export function useVoiceProfiles() {
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);

  const refresh = useCallback(() => {
    setProfiles(listVoiceProfiles());
  }, []);

  useEffect(() => {
    refresh();
    return subscribeToVoiceProfiles(refresh);
  }, [refresh]);

  const save = useCallback(
    (input: VoiceProfileInput, existingId?: string) => {
      const profile = saveVoiceProfile(input, existingId);
      refresh();
      return profile;
    },
    [refresh],
  );

  const remove = useCallback(
    (id: string) => {
      deleteVoiceProfile(id);
      refresh();
    },
    [refresh],
  );

  return {
    exportProfiles: serializeVoiceProfiles,
    profiles,
    refresh,
    remove,
    save,
  };
}
