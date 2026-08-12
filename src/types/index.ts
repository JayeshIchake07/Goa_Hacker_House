export type FormatMode = 'front' | 'back';

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
  builderId: string;    // e.g. "#HH-GOA-7757"
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

// Generate a random 4-digit HH Goa builder ID e.g. "#HH-GOA-7757"
export function generateBuilderId(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `#HH-GOA-${num}`;
}

export const INITIAL_BUILDER_INFO: BuilderInfo = {
  name: "",
  handle: "",
  role: "Frontend",
  title: "TERMINAL WIZARD",
  techStack: "",
  builderId: generateBuilderId(),
};

// --- Generative ID Maker Types ---

export type MoodType = 'corporate' | 'creative' | 'elegant' | 'bold' | 'minimal';

export interface PaletteColors {
  [key: string]: string;
  primary: string;
  secondary: string;
  surface: string;
  text: string;
  background: string;
}

export interface PalettePreset {
  name: string;
  colors: PaletteColors;
}

export type SocialPlatform = 'instagram' | 'x' | 'discord' | 'custom';

export interface Charm {
  emoji: string;
  xPct: number;
  yPct: number;
  active: boolean;
  size: number; // scale multiplier, e.g. 0.7 to 1.5
  rotation?: number; // rotation in degrees, 0 to 360
}

export interface Shape {
  type: string;
  isOverlay: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  color: string;
  blur: number;
  useGradient?: boolean;
  gradientColor?: string;
  blobPoints?: number;
  blobIrregularity?: number;
  // Wiggle-specific
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  waveAmplitude?: number;
  waveFrequency?: number;
  waveLineWidth?: number;
  // Arc-specific
  arcRadius?: number;
  arcStartAngle?: number;
  arcSweep?: number;
  arcLineWidth?: number;
}

export interface IdCardTemplate {
  canvas: { widthPx: number; heightPx: number; bleedPx: number };
  cornerRadiusPx: number;
  border: { widthPx: number };
  header: { heightPct: number; hatchAngle: number; hatchSpacing: number; hatchOpacity: number };
  portrait: { xPct: number; yPct: number; widthPct: number; heightPct: number; borderRadiusPx: number };
  footer: { yPct: number; heightPct: number; hatchAngle: number; hatchSpacing: number; hatchOpacity: number };
  textFields: {
    eventName: { zone: string; relXPct: number; relYPct: number; font: string; fontSizePx: number; fontWeight: number; align: string };
    teamName: { zone: string; relXPct: number; relYPct: number; font: string; fontSizePx: number; fontWeight: number; align: string };
    memberName: { zone: string; relXPct: number; relYPct: number; font: string; fontSizePx: number; fontWeight: number; align: string };
    role: { zone: string; relXPct: number; relYPct: number; font: string; fontSizePx: number; fontWeight: number; align: string };
  };
  logo: { relXPct: number; relYPct: number; maxWidthPx: number; maxHeightPx: number };
  layers: string[];
}
