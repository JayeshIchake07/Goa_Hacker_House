export type FormatMode = 'profile' | 'builder';

export interface CropState {
  x: number; // offset X in pixels
  y: number; // offset Y in pixels
  scale: number; // 0.4 to 3.0
  rotation: number; // 0, 90, 180, 270 degrees
}

export interface BuilderInfo {
  name: string;
  handle: string;       // Twitter/X handle
  role: string;
  title: string;
  techStack: string;    // e.g. "Rust / Next.js / AI"
}

export interface EventConfig {
  name: string;
  dates: string;
  location: string;
  studio: string;
  tagline: string;
  subtagline: string;
  hashtag: string;
  xShareText: string;
}

export const DEFAULT_EVENT_CONFIG: EventConfig = {
  name: "HH GOA 2026",
  dates: "28–31 OCT 2026",
  location: "GOA, INDIA",
  studio: "2:47pm Studio",
  tagline: "Get your HH Goa 2026 build card. Upload a photo, get your graphic, share it.",
  subtagline: "Less Noise. More Signal. 500 elite builders under one roof.",
  hashtag: "FrameInGoa",
  xShareText: "Just generated my official HH Goa 2026 Builder ID! 🌴⚡ Less Noise. More Signal. #FrameInGoa"
};

export const INITIAL_CROP_STATE: CropState = {
  x: 0,
  y: 0,
  scale: 1,
  rotation: 0,
};

export const INITIAL_BUILDER_INFO: BuilderInfo = {
  name: "",
  handle: "",
  role: "Frontend",
  title: "TERMINAL WIZARD",
  techStack: "",
};

