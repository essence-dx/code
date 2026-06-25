"use client";

import { useEffect, useState } from "react";

export function useObjectUrl(blob?: Blob) {
  const [url, setUrl] = useState<string | undefined>();

  useEffect(() => {
    if (!blob) {
      setUrl(undefined);
      return;
    }

    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);

  return url;
}
