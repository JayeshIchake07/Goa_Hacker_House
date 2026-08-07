/**
 * moods.js — Mood-Based Shape Grammar System (Sketch Revision)
 *
 * Each mood generates TWO layers of shapes:
 *   bg (background) — render below portrait, respect soft exclusion zone
 *   overlay          — render above portrait (wiggly lines, arcs), no exclusion
 *
 * New shape type: 'wiggle' — a sine-wave distorted line that flows across the card.
 */

import { rectsOverlap, distToRect } from './template.js';

/* ── Seeded PRNG (Mulberry32) ───────────────────────────────── */

export function createRNG(seed) {
  let s = seed | 0;
  return function () {
    s |= 0;
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rngRange(rng, min, max) { return min + rng() * (max - min); }
function rngInt(rng, min, max) { return Math.floor(min + rng() * (max - min + 1)); }
function rngChoice(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

/* ── Placement Zones ────────────────────────────────────────── */

function getZonePosition(zoneName, cw, ch, rng) {
  const margin = 60;
  const zones = {
    'top-left':     { x: [0, cw * 0.3], y: [ch * 0.1, ch * 0.3] },
    'top-right':    { x: [cw * 0.7, cw], y: [ch * 0.1, ch * 0.3] },
    'bottom-left':  { x: [0, cw * 0.3], y: [ch * 0.6, ch * 0.7] },
    'bottom-right': { x: [cw * 0.7, cw], y: [ch * 0.6, ch * 0.7] },
    'left-edge':    { x: [0, cw * 0.15], y: [ch * 0.12, ch * 0.7] },
    'right-edge':   { x: [cw * 0.85, cw], y: [ch * 0.12, ch * 0.7] },
    'mid-area':     { x: [cw * 0.1, cw * 0.9], y: [ch * 0.15, ch * 0.65] },
    'anywhere':     { x: [0, cw], y: [ch * 0.1, ch * 0.7] },
    'bleed':        { x: [-cw * 0.1, cw * 1.1], y: [ch * 0.05, ch * 0.75] }
  };

  if (zoneName === 'golden') {
    const phi = 0.618;
    const positions = [
      { x: cw * phi, y: ch * 0.35 },
      { x: cw * (1 - phi), y: ch * 0.35 },
      { x: cw * phi, y: ch * 0.55 },
      { x: cw * (1 - phi), y: ch * 0.55 }
    ];
    const pos = rngChoice(rng, positions);
    return { x: pos.x + rngRange(rng, -30, 30), y: pos.y + rngRange(rng, -30, 30) };
  }

  const zone = zones[zoneName] || zones['anywhere'];
  return {
    x: rngRange(rng, zone.x[0], zone.x[1]),
    y: rngRange(rng, zone.y[0], zone.y[1])
  };
}

/* ── Mood Presets ────────────────────────────────────────────── */

export const moodPresets = {
  corporate: {
    name: 'Corporate',
    icon: '▦',
    description: 'Clean & structured',
    bg: {
      shapeTypes: ['rect', 'line'],
      count: { min: 3, max: 5 },
      sizeRange: { minPct: 5, maxPct: 22 },
      opacityRange: [0.06, 0.14],
      placementZones: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      rotationRange: [0, 0],
      usesGradient: false,
      blurRange: [0, 0]
    },
    overlay: {
      shapeTypes: ['wiggle'],
      count: { min: 2, max: 4 },
      sizeRange: { minPct: 40, maxPct: 80 },
      opacityRange: [0.10, 0.20],
      rotationRange: [-5, 5],
      wiggleAmplitude: [8, 18],
      wiggleFrequency: [3, 6],
      wiggleLineWidth: [1.5, 3]
    }
  },

  creative: {
    name: 'Creative',
    icon: '◎',
    description: 'Artistic & flowing',
    bg: {
      shapeTypes: ['blob', 'circle', 'circle'],
      count: { min: 4, max: 7 },
      sizeRange: { minPct: 8, maxPct: 28 },
      opacityRange: [0.08, 0.20],
      placementZones: ['anywhere', 'left-edge', 'right-edge', 'top-left', 'bottom-right'],
      rotationRange: [-30, 30],
      usesGradient: true,
      blurRange: [0, 5]
    },
    overlay: {
      shapeTypes: ['wiggle', 'wiggle', 'arc'],
      count: { min: 3, max: 6 },
      sizeRange: { minPct: 30, maxPct: 90 },
      opacityRange: [0.10, 0.25],
      rotationRange: [-20, 20],
      wiggleAmplitude: [12, 30],
      wiggleFrequency: [2, 5],
      wiggleLineWidth: [1.5, 4]
    }
  },

  elegant: {
    name: 'Elegant',
    icon: '◇',
    description: 'Luxurious & sparse',
    bg: {
      shapeTypes: ['line', 'dot'],
      count: { min: 2, max: 3 },
      sizeRange: { minPct: 3, maxPct: 15 },
      opacityRange: [0.05, 0.10],
      placementZones: ['golden', 'top-right', 'bottom-left'],
      rotationRange: [-10, 10],
      usesGradient: false,
      blurRange: [0, 0]
    },
    overlay: {
      shapeTypes: ['wiggle', 'arc'],
      count: { min: 1, max: 3 },
      sizeRange: { minPct: 25, maxPct: 60 },
      opacityRange: [0.06, 0.14],
      rotationRange: [-8, 8],
      wiggleAmplitude: [5, 12],
      wiggleFrequency: [4, 8],
      wiggleLineWidth: [1, 2.5]
    }
  },

  bold: {
    name: 'Bold',
    icon: '△',
    description: 'Confident & loud',
    bg: {
      shapeTypes: ['rect', 'triangle', 'circle'],
      count: { min: 4, max: 7 },
      sizeRange: { minPct: 12, maxPct: 38 },
      opacityRange: [0.12, 0.26],
      placementZones: ['bleed', 'top-left', 'top-right', 'bottom-left', 'bottom-right'],
      rotationRange: [-45, 45],
      usesGradient: true,
      blurRange: [0, 6]
    },
    overlay: {
      shapeTypes: ['wiggle', 'wiggle'],
      count: { min: 3, max: 6 },
      sizeRange: { minPct: 50, maxPct: 100 },
      opacityRange: [0.12, 0.28],
      rotationRange: [-25, 25],
      wiggleAmplitude: [15, 35],
      wiggleFrequency: [2, 4],
      wiggleLineWidth: [2, 5]
    }
  },

  minimal: {
    name: 'Minimal',
    icon: '○',
    description: 'Almost invisible',
    bg: {
      shapeTypes: ['circle', 'line'],
      count: { min: 1, max: 2 },
      sizeRange: { minPct: 5, maxPct: 15 },
      opacityRange: [0.04, 0.08],
      placementZones: ['top-right', 'bottom-left'],
      rotationRange: [0, 0],
      usesGradient: false,
      blurRange: [0, 0]
    },
    overlay: {
      shapeTypes: ['wiggle'],
      count: { min: 1, max: 2 },
      sizeRange: { minPct: 30, maxPct: 50 },
      opacityRange: [0.05, 0.10],
      rotationRange: [-3, 3],
      wiggleAmplitude: [4, 10],
      wiggleFrequency: [3, 5],
      wiggleLineWidth: [1, 2]
    }
  }
};

/* ── Shape Generation ───────────────────────────────────────── */

/**
 * Generate a single background shape.
 */
function generateBgShape(bgConfig, palette, exclusionZone, cw, ch, rng, existingShapes) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const type = rngChoice(rng, bgConfig.shapeTypes);
    const zone = rngChoice(rng, bgConfig.placementZones);
    const pos = getZonePosition(zone, cw, ch, rng);
    const baseDim = Math.min(cw, ch);
    const size = rngRange(rng, bgConfig.sizeRange.minPct, bgConfig.sizeRange.maxPct) / 100 * baseDim;

    const shape = {
      type,
      isOverlay: false,
      x: pos.x,
      y: pos.y,
      width: type === 'line' ? size * 2 : size,
      height: type === 'line' ? 3 : (type === 'dot' ? size * 0.3 : size),
      rotation: rngRange(rng, bgConfig.rotationRange[0], bgConfig.rotationRange[1]),
      opacity: rngRange(rng, bgConfig.opacityRange[0], bgConfig.opacityRange[1]),
      color: rng() > 0.5 ? palette.primary : palette.secondary,
      blur: rngRange(rng, bgConfig.blurRange[0], bgConfig.blurRange[1]),
      useGradient: bgConfig.usesGradient && rng() > 0.4,
      gradientColor: palette.secondary,
      blobPoints: rngInt(rng, 6, 10),
      blobIrregularity: rngRange(rng, 0.2, 0.45)
    };

    // Bounding box
    const bbox = {
      x: shape.x - shape.width / 2,
      y: shape.y - shape.height / 2,
      width: shape.width,
      height: shape.height
    };

    // Soft exclusion check for bg shapes
    if (exclusionZone && rectsOverlap(bbox, exclusionZone)) {
      continue;
    }

    // Opacity fade near portrait
    if (exclusionZone) {
      const dist = distToRect(shape.x, shape.y, exclusionZone);
      const softPad = baseDim * 0.04;
      if (dist < softPad && dist > 0) {
        shape.opacity *= 0.5 * (dist / softPad);
      }
    }

    return shape;
  }
  return null;
}

/**
 * Generate a single overlay shape (wiggly line or arc).
 * These flow across the card and intentionally overlap the portrait.
 */
function generateOverlayShape(overlayConfig, palette, cw, ch, rng) {
  const type = rngChoice(rng, overlayConfig.shapeTypes);
  const baseDim = Math.min(cw, ch);
  const lengthPct = rngRange(rng, overlayConfig.sizeRange.minPct, overlayConfig.sizeRange.maxPct);
  const length = (lengthPct / 100) * cw;

  // Wiggly lines flow horizontally across the card, crossing the portrait area
  const startX = rngRange(rng, -length * 0.1, cw * 0.3);
  const startY = rngRange(rng, ch * 0.13, ch * 0.65);
  const endX = startX + length;
  const endY = startY + rngRange(rng, -ch * 0.05, ch * 0.05);

  const shape = {
    type,
    isOverlay: true,
    startX, startY,
    endX, endY,
    x: (startX + endX) / 2,
    y: (startY + endY) / 2,
    width: length,
    height: 0,
    rotation: rngRange(rng, overlayConfig.rotationRange[0], overlayConfig.rotationRange[1]),
    opacity: rngRange(rng, overlayConfig.opacityRange[0], overlayConfig.opacityRange[1]),
    color: rng() > 0.5 ? palette.primary : palette.secondary,
    // Wiggle-specific
    waveAmplitude: rngRange(rng, overlayConfig.wiggleAmplitude[0], overlayConfig.wiggleAmplitude[1]),
    waveFrequency: rngRange(rng, overlayConfig.wiggleFrequency[0], overlayConfig.wiggleFrequency[1]),
    waveLineWidth: rngRange(rng, overlayConfig.wiggleLineWidth[0], overlayConfig.wiggleLineWidth[1]),
    // Arc-specific
    arcRadius: rngRange(rng, baseDim * 0.15, baseDim * 0.35),
    arcStartAngle: rngRange(rng, 0, Math.PI),
    arcSweep: rngRange(rng, Math.PI * 0.3, Math.PI * 1.2),
    arcLineWidth: rngRange(rng, 1.5, 3.5)
  };

  return shape;
}

/**
 * Generates all shapes for a given mood — both background and overlay layers.
 *
 * @returns {Array<object>} Combined array of shape descriptors, each tagged with isOverlay
 */
export function generateShapes(moodName, palette, softExclusionZone, cw, ch, seed) {
  const mood = moodPresets[moodName];
  if (!mood) return [];

  const rng = createRNG(seed);
  const shapes = [];

  // Background shapes
  const bgCount = rngInt(rng, mood.bg.count.min, mood.bg.count.max);
  for (let i = 0; i < bgCount; i++) {
    const shape = generateBgShape(mood.bg, palette, softExclusionZone, cw, ch, rng, shapes);
    if (shape) shapes.push(shape);
  }

  // Overlay shapes (wiggly lines that cross over portrait)
  const overlayCount = rngInt(rng, mood.overlay.count.min, mood.overlay.count.max);
  for (let i = 0; i < overlayCount; i++) {
    const shape = generateOverlayShape(mood.overlay, palette, cw, ch, rng);
    if (shape) shapes.push(shape);
  }

  return shapes;
}
