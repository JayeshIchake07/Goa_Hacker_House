import heic2any from "heic2any";

export function isHeicFile(file: File): boolean {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return (
    name.endsWith(".heic") ||
    name.endsWith(".heif") ||
    type === "image/heic" ||
    type === "image/heif"
  );
}

export async function convertHeicToJpeg(file: File): Promise<Blob> {
  try {
    const result = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.92,
    });

    if (Array.isArray(result)) {
      return result[0];
    }
    return result;
  } catch (error) {
    console.error("HEIC conversion failed:", error);
    throw new Error("Could not convert HEIC image. Please try uploading a JPG or PNG.");
  }
}

export function readFileAsDataURL(fileOrBlob: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read image as data URL"));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(fileOrBlob);
  });
}
