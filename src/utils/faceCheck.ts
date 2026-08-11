import { FaceDetector } from "@mediapipe/tasks-vision";
import { getVisionWasm, loadImageElement } from "./mediapipe";

const MODEL_PATH =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";

let detectorPromise: Promise<FaceDetector> | null = null;

function getFaceDetector(): Promise<FaceDetector> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      try {
        const vision = await getVisionWasm();
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

/**
 * Throws if the image does not contain a detectable human face.
 */
export async function assertHasHumanFace(imageSrc: string): Promise<void> {
  const detector = await getFaceDetector();
  const img = await loadImageElement(imageSrc);
  const result = detector.detect(img);

  if (!result.detections.length) {
    throw new Error(
      "Please upload a photo of a person. No face was detected."
    );
  }
}
