"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deletePersona,
  listPersonas,
  savePersona,
  serializePersonas,
  subscribeToPersonas,
  type PersonaInput,
  type PersonaProfile,
} from "./persona-library";

export function usePersonaLibrary() {
  const [personas, setPersonas] = useState<PersonaProfile[]>([]);

  const refresh = useCallback(() => {
    setPersonas(listPersonas());
  }, []);

  useEffect(() => {
    refresh();
    return subscribeToPersonas(refresh);
  }, [refresh]);

  const save = useCallback(
    (input: PersonaInput, existingId?: string) => {
      const persona = savePersona(input, existingId);
      refresh();
      return persona;
    },
    [refresh],
  );

  const remove = useCallback(
    (id: string) => {
      deletePersona(id);
      refresh();
    },
    [refresh],
  );

  return {
    exportPersonas: serializePersonas,
    personas,
    refresh,
    remove,
    save,
  };
}
