import { FilesetResolver } from "@mediapipe/tasks-vision";

export const MEDIAPIPE_WASM_PATH =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";

type VisionWasm = Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>;

let filesetPromise: Promise<VisionWasm> | null = null;

/** Shared lazy loader for MediaPipe vision WASM (face detect + segmenter). */
export function getVisionWasm(): Promise<VisionWasm> {
  if (!filesetPromise) {
    filesetPromise = FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_PATH).catch(
      (err) => {
        filesetPromise = null;
        throw err;
      }
    );
  }
  return filesetPromise;
}

export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error("Failed to load photo for verification."));
    img.src = src;
  });
}
