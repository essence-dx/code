export async function readMediaFile(file: File) {
  const dataUrl = await readAsDataUrl(file);

  if (file.type.startsWith("video/")) {
    const dimensions = await readVideoDimensions(dataUrl);

    return {
      dataUrl,
      ...dimensions,
    };
  }

  return {
    dataUrl,
    width: null,
    height: null,
  };
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Could not read media file."));
    };
    reader.onerror = () => reject(new Error("Could not read media file."));
    reader.readAsDataURL(file);
  });
}

function readVideoDimensions(dataUrl: string) {
  return new Promise<{ width: number | null; height: number | null }>(
    (resolve) => {
      const video = document.createElement("video");

      video.preload = "metadata";
      video.onloadedmetadata = () => {
        resolve({
          width: video.videoWidth || null,
          height: video.videoHeight || null,
        });
      };
      video.onerror = () => resolve({ width: null, height: null });
      video.src = dataUrl;
    },
  );
}
