import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";

const WASM_PATH =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODEL_PATH =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";

let detectorPromise: Promise<FaceDetector> | null = null;

function getFaceDetector(): Promise<FaceDetector> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
        return FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_PATH,
            delegate: "GPU",
          },
          runningMode: "IMAGE",
          minDetectionConfidence: 0.5,
        });
      } catch {
        detectorPromise = null;
        throw new Error(
          "Could not verify photo. Check your connection and try again."
        );
      }
    })();
  }
  return detectorPromise;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load photo for verification."));
    img.src = src;
  });
}

/**
 * Throws if the image does not contain a detectable human face.
 */
export async function assertHasHumanFace(imageSrc: string): Promise<void> {
  const detector = await getFaceDetector();
  const img = await loadImage(imageSrc);
  const result = detector.detect(img);

  if (!result.detections.length) {
    throw new Error(
      "Please upload a photo of a person. No face was detected."
    );
  }
}
