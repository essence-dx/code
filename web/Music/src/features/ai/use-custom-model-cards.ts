"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deleteCustomModelCard,
  listCustomModelCards,
  saveCustomModelCard,
  serializeCustomModelCards,
  subscribeToCustomModelCards,
  type CustomModelCard,
  type CustomModelCardInput,
} from "./custom-model-cards";

export function useCustomModelCards() {
  const [cards, setCards] = useState<CustomModelCard[]>([]);

  const refresh = useCallback(() => {
    setCards(listCustomModelCards());
  }, []);

  useEffect(() => {
    refresh();
    return subscribeToCustomModelCards(refresh);
  }, [refresh]);

  const save = useCallback(
    (input: CustomModelCardInput, existingId?: string) => {
      const card = saveCustomModelCard(input, existingId);
      refresh();
      return card;
    },
    [refresh],
  );

  const remove = useCallback(
    (id: string) => {
      deleteCustomModelCard(id);
      refresh();
    },
    [refresh],
  );

  return {
    cards,
    exportCards: serializeCustomModelCards,
    refresh,
    remove,
    save,
  };
}
