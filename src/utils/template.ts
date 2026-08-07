import type { IdCardTemplate } from "../types";

export const idCardTemplate: IdCardTemplate = {
  canvas: { widthPx: 900, heightPx: 1200, bleedPx: 35 },
  cornerRadiusPx: 24,

  /* Colored border — role-specific */
  border: { widthPx: 6 },

  /* Header strip at top — increased by +25% (225px) */
  header: {
    heightPct: 18.75,       // 225px
    hatchAngle: -30,
    hatchSpacing: 10,
    hatchOpacity: 0.12
  },

  /* Portrait zone — passport-size, centered, equal 125px distance from header & footer */
  portrait: {
    xPct: 27, yPct: 29.17,        // starts at 350px (125px gap from 225px header)
    widthPct: 46, heightPct: 39.58, // 475px height (ends at 825px)
    borderRadiusPx: 14
  },

  /* Footer strip at bottom — increased by +25% (250px) for big text */
  footer: {
    yPct: 79.17, heightPct: 20.83, // starts at 950px (125px gap from 825px portrait)
    hatchAngle: -30,
    hatchSpacing: 10,
    hatchOpacity: 0.12
  },

  /* Text fields positioned relative to their zone (header or footer) */
  textFields: {
    eventName: {
      zone: 'header', relXPct: 94, relYPct: 55,
      font: 'Inter', fontSizePx: 24, fontWeight: 700, align: 'right'
    },
    teamName: {
      zone: 'footer', relXPct: 8, relYPct: 38,
      font: 'Inter', fontSizePx: 28, fontWeight: 700, align: 'left'
    },
    memberName: {
      zone: 'footer', relXPct: 92, relYPct: 38,
      font: 'Inter', fontSizePx: 22, fontWeight: 600, align: 'right'
    },
    role: {
      zone: 'footer', relXPct: 92, relYPct: 68,
      font: 'Inter', fontSizePx: 17, fontWeight: 500, align: 'right'
    }
  },

  /* Event logo position (relative to header) */
  logo: {
    relXPct: 3, relYPct: 10,
    maxWidthPx: 80, maxHeightPx: 80
  },

  layers: [
    'background', 'texture',
    'bg-shapes',            // decorative shapes BELOW portrait
    'portrait',
    'overlay-shapes',       // wiggly lines ABOVE portrait (semi-transparent)
    'header', 'footer',     // strips with hatching + text
    'border'
  ]
};

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Portrait zone as pixel rect. */
export function getPortraitRect(template = idCardTemplate): Rect {
  const { widthPx: w, heightPx: h } = template.canvas;
  const p = template.portrait;
  return {
    x: (p.xPct / 100) * w,
    y: (p.yPct / 100) * h,
    width: (p.widthPct / 100) * w,
    height: (p.heightPct / 100) * h
  };
}

/** Header strip as pixel rect (full width). */
export function getHeaderRect(template = idCardTemplate): Rect {
  const { widthPx: w, heightPx: h } = template.canvas;
  return {
    x: 0, y: 0,
    width: w,
    height: (template.header.heightPct / 100) * h
  };
}

/** Footer strip as pixel rect (full width). */
export function getFooterRect(template = idCardTemplate): Rect {
  const { widthPx: w, heightPx: h } = template.canvas;
  return {
    x: 0,
    y: (template.footer.yPct / 100) * h,
    width: w,
    height: (template.footer.heightPct / 100) * h
  };
}

/**
 * Soft exclusion zone for BACKGROUND shapes only.
 * Smaller padding than before — overlay shapes ignore this entirely.
 */
export function getSoftExclusionZone(template = idCardTemplate, paddingPct = 2): Rect {
  const { widthPx: w, heightPx: h } = template.canvas;
  const pr = getPortraitRect(template);
  const padX = (paddingPct / 100) * w;
  const padY = (paddingPct / 100) * h;
  return {
    x: pr.x - padX,
    y: pr.y - padY,
    width: pr.width + padX * 2,
    height: pr.height + padY * 2
  };
}

/** AABB overlap test. */
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return !(
    a.x + a.width  < b.x ||
    a.x            > b.x + b.width ||
    a.y + a.height < b.y ||
    a.y            > b.y + b.height
  );
}

/** Minimum distance from a point to the nearest edge of a rect. */
export function distToRect(px: number, py: number, rect: Rect): number {
  const cx = Math.max(rect.x, Math.min(px, rect.x + rect.width));
  const cy = Math.max(rect.y, Math.min(py, rect.y + rect.height));
  return Math.hypot(px - cx, py - cy);
}
