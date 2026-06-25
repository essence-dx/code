export function readFileAsDataUrl(file: File, label = "File") {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error(`${label} could not be read.`));
      }
    };
    reader.onerror = () => reject(new Error(`${label} could not be read.`));
    reader.readAsDataURL(file);
  });
}

export function getFileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}
