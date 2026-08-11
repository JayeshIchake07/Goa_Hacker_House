import { ImageSegmenter } from "@mediapipe/tasks-vision";
import type { PaletteColors } from "../types";
import { getVisionWasm, loadImageElement } from "./mediapipe";

const SELFIE_MODEL_PATH =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";

let segmenterPromise: Promise<ImageSegmenter> | null = null;

function getImageSegmenter(): Promise<ImageSegmenter> {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      try {
        const vision = await getVisionWasm();
        return ImageSegmenter.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: SELFIE_MODEL_PATH,
            delegate: "GPU",
          },
          runningMode: "IMAGE",
          outputCategoryMask: true,
          outputConfidenceMasks: true,
        });
      } catch {
        segmenterPromise = null;
        throw new Error(
          "Could not remove background. Check your connection and try again."
        );
      }
    })();
  }
  return segmenterPromise;
}

/**
 * Returns a PNG data URL of the person with a transparent background.
 */
export async function removeImageBackground(imageSrc: string): Promise<string> {
  const segmenter = await getImageSegmenter();
  const img = await loadImageElement(imageSrc);
  const result = segmenter.segment(img);

  try {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      throw new Error("Could not process photo background.");
    }

    ctx.drawImage(img, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const pixels = imageData.data;

    const applyFloatMask = (
      maskData: Float32Array,
      mw: number,
      mh: number,
      invert: boolean
    ) => {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const mx = Math.min(mw - 1, Math.floor((x * mw) / w));
          const my = Math.min(mh - 1, Math.floor((y * mh) / h));
          let conf = Math.max(0, Math.min(1, maskData[my * mw + mx] ?? 0));
          if (invert) conf = 1 - conf;
          pixels[(y * w + x) * 4 + 3] = Math.round(conf * 255);
        }
      }
    };

    // Prefer a confidence mask. Portrait photos put the subject near the
    // upper-center — if that region is "low", the mask polarity is inverted.
    const confidenceMask =
      result.confidenceMasks?.[0] ?? result.confidenceMasks?.[1];

    if (confidenceMask) {
      const maskData = confidenceMask.getAsFloat32Array();
      const mw = confidenceMask.width;
      const mh = confidenceMask.height;
      const sampleX = Math.floor(mw / 2);
      const sampleY = Math.floor(mh * 0.35);
      const centerVal = maskData[sampleY * mw + sampleX] ?? 0;
      applyFloatMask(maskData, mw, mh, centerVal < 0.5);
    } else if (result.categoryMask) {
      const maskData = result.categoryMask.getAsUint8Array();
      const mw = result.categoryMask.width;
      const mh = result.categoryMask.height;
      const sampleX = Math.floor(mw / 2);
      const sampleY = Math.floor(mh * 0.35);
      const centerCategory = maskData[sampleY * mw + sampleX] ?? 0;
      // Whichever label is at the subject center is treated as "person"
      const personLabel = centerCategory;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const mx = Math.min(mw - 1, Math.floor((x * mw) / w));
          const my = Math.min(mh - 1, Math.floor((y * mh) / h));
          const category = maskData[my * mw + mx] ?? 0;
          pixels[(y * w + x) * 4 + 3] = category === personLabel ? 255 : 0;
        }
      }
    } else {
      throw new Error("Could not process photo background.");
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL("image/png");
  } finally {
    result.close();
  }
}

/**
 * Fills a portrait frame with a palette/mood-themed gradient.
 */
export function createPortraitThemeFill(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; width: number; height: number },
  palette: PaletteColors,
  mood: string
): void {
  const { x, y, width, height } = rect;
  let gradient: CanvasGradient;

  switch (mood) {
    case "creative":
    case "bold":
      gradient = ctx.createLinearGradient(x, y, x + width, y + height);
      gradient.addColorStop(0, palette.primary);
      gradient.addColorStop(0.45, palette.secondary);
      gradient.addColorStop(1, palette.background);
      break;
    case "elegant":
      gradient = ctx.createLinearGradient(x, y + height, x + width, y);
      gradient.addColorStop(0, palette.background);
      gradient.addColorStop(0.5, palette.secondary);
      gradient.addColorStop(1, palette.primary);
      break;
    case "minimal":
      gradient = ctx.createLinearGradient(x, y, x, y + height);
      gradient.addColorStop(0, palette.background);
      gradient.addColorStop(1, palette.secondary);
      break;
    case "corporate":
    default:
      gradient = ctx.createLinearGradient(x, y, x, y + height);
      gradient.addColorStop(0, palette.primary);
      gradient.addColorStop(1, palette.secondary);
      break;
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);
}
