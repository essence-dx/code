export async function readImageFile(file: File) {
  const dataUrl = await readAsDataUrl(file);
  const dimensions = await readImageDimensions(dataUrl);

  return {
    dataUrl,
    ...dimensions,
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

      reject(new Error("Could not read image file."));
    };
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

function readImageDimensions(dataUrl: string) {
  return new Promise<{ width: number | null; height: number | null }>(
    (resolve) => {
      const image = new Image();

      image.onload = () =>
        resolve({
          width: image.naturalWidth || null,
          height: image.naturalHeight || null,
        });
      image.onerror = () => resolve({ width: null, height: null });
      image.src = dataUrl;
    },
  );
}
