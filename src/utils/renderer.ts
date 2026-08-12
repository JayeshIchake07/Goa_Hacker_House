import type { CropState, IdCardTemplate, PaletteColors, Shape, Charm } from "../types";
import { idCardTemplate, getPortraitRect, getHeaderRect, getFooterRect } from "./template";
import { hexToRgba, getRenderPalette } from "./palette";
import { drawQRCode } from "./qrcode";
import { createPortraitThemeFill } from "./removeBackground";

export interface IdMakerState {
  palette: PaletteColors;
  mood: string;
  portraitImage: HTMLImageElement | null;
  crop: CropState;
  cardSide: 'front' | 'back';
  roleMode: 'single' | 'skills';
  skillsList: string[];
  socialPlatform: string;
  socialHandle: string;
  github?: string;
  linkedin?: string;
  instagram?: string;
  x?: string;
  shareInfoLink?: string;
  textFields: {
    eventName: string;
    teamName: string;
    memberName: string;
    role: string;
  };
  builderId?: string;
  borderColor: string;
  roleColor: string;
  useChromeEffect: boolean;
  lightPos: { x: number; y: number };
  shapeSeed: number;
  shapes: Shape[];
  template: IdCardTemplate;
  charms: Charm[];
  photoFrame?: 'rectangle' | 'circle';
  studioLogoImage?: HTMLImageElement | null;
  useThemeBg?: boolean;
}

/* ── Drawing Helpers ────────────────────────────────────────── */

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/** Draw cropped image with offset, scale, rotation. */
function drawCroppedImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  centerX: number,
  centerY: number,
  boxW: number,
  boxH: number,
  crop: CropState
) {
  ctx.save();
  ctx.translate(centerX + crop.x, centerY + crop.y);

  if (crop.rotation !== 0) {
    ctx.rotate((crop.rotation * Math.PI) / 180);
  }

  const imgRatio = img.width / img.height;
  const boxRatio = boxW / boxH;

  let drawW = boxW;
  let drawH = boxH;

  if (imgRatio > boxRatio) {
    drawH = boxH;
    drawW = boxH * imgRatio;
  } else {
    drawW = boxW;
    drawH = boxW / imgRatio;
  }

  drawW *= crop.scale;
  drawH *= crop.scale;

  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();
}

/** Colorized silhouette of the cutout at the same crop transform (for outline rings). */
function makeCroppedSilhouetteCanvas(
  img: HTMLImageElement,
  boxW: number,
  boxH: number,
  crop: CropState,
  color: string
): HTMLCanvasElement | null {
  const pad = 28;
  const tw = Math.ceil(boxW + pad * 2);
  const th = Math.ceil(boxH + pad * 2);
  const off = document.createElement("canvas");
  off.width = tw;
  off.height = th;
  const octx = off.getContext("2d");
  if (!octx) return null;

  drawCroppedImage(octx, img, tw / 2, th / 2, boxW, boxH, crop);
  octx.globalCompositeOperation = "source-in";
  octx.fillStyle = color;
  octx.fillRect(0, 0, tw, th);
  return off;
}

/**
 * Funky sticker-style boundary around the cutout person.
 * Layered irregular rings in palette colors + a bright inner rim.
 */
function drawFunkyPersonBoundary(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  centerX: number,
  centerY: number,
  boxW: number,
  boxH: number,
  crop: CropState,
  palette: PaletteColors,
  mood: string
) {
  const layers =
    mood === "bold" || mood === "creative"
      ? [
          { color: palette.secondary, radius: 14, steps: 20, wobble: 4 },
          { color: palette.primary, radius: 9, steps: 18, wobble: 3 },
          { color: "#FFFFFF", radius: 4, steps: 14, wobble: 1.5 },
        ]
      : mood === "elegant"
        ? [
            { color: palette.primary, radius: 10, steps: 18, wobble: 2 },
            { color: palette.secondary, radius: 6, steps: 16, wobble: 1.5 },
            { color: "#FFFFFF", radius: 3, steps: 12, wobble: 0.8 },
          ]
        : [
            { color: palette.secondary, radius: 11, steps: 16, wobble: 2.5 },
            { color: palette.primary, radius: 7, steps: 14, wobble: 1.5 },
            { color: "#FFFFFF", radius: 3.5, steps: 12, wobble: 1 },
          ];

  for (const layer of layers) {
    const sil = makeCroppedSilhouetteCanvas(img, boxW, boxH, crop, layer.color);
    if (!sil) continue;
    const tw = sil.width;
    const th = sil.height;
    for (let i = 0; i < layer.steps; i++) {
      const angle = (i / layer.steps) * Math.PI * 2;
      const wobble =
        Math.sin(angle * 3 + i) * layer.wobble * 0.55 +
        Math.cos(angle * 5) * layer.wobble * 0.35;
      const r = layer.radius + wobble;
      ctx.drawImage(
        sil,
        centerX + Math.cos(angle) * r - tw / 2,
        centerY + Math.sin(angle) * r - th / 2
      );
    }
  }
}

/** Draw a smooth organic blob. */
function drawBlobPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, avgRadius: number, numPoints: number, irregularity: number, rngValues: number[]) {
  const pts = [];
  const angleStep = (Math.PI * 2) / numPoints;
  for (let i = 0; i < numPoints; i++) {
    const angle = i * angleStep;
    const rVal = rngValues ? rngValues[i % rngValues.length] : Math.random();
    const r = avgRadius * (1 + (rVal - 0.5) * 2 * irregularity);
    pts.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
  }
  ctx.beginPath();
  const last = pts[pts.length - 1];
  const first = pts[0];
  ctx.moveTo((last.x + first.x) / 2, (last.y + first.y) / 2);
  for (let i = 0; i < pts.length; i++) {
    const curr = pts[i];
    const next = pts[(i + 1) % pts.length];
    ctx.quadraticCurveTo(curr.x, curr.y, (curr.x + next.x) / 2, (curr.y + next.y) / 2);
  }
  ctx.closePath();
}

/**
 * Creates a dark liquid chrome metallic linear gradient.
 * Calculates dynamic angle based on lightPos {x: 0..1, y: 0..1} if provided.
 */
function createChromeGradient(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, baseColor = '#0077B6', lightPos: { x: number; y: number } | null = null) {
  let angle = 45;
  if (lightPos) {
    const cx = x + (w || 100) / 2;
    const cy = y + (h || 100) / 2;
    const lx = lightPos.x * 900;
    const ly = lightPos.y * 1200;
    angle = (Math.atan2(ly - cy, lx - cx) * 180) / Math.PI;
  }

  const rad = (angle * Math.PI) / 180;
  const x1 = x;
  const y1 = y;
  const x2 = x + Math.cos(rad) * (w || 100);
  const y2 = y + Math.sin(rad) * (h || 100);

  const grad = ctx.createLinearGradient(x1, y1, x2, y2);
  grad.addColorStop(0.0, '#0F172A'); // Deep dark metallic base
  grad.addColorStop(0.18, '#334155');
  grad.addColorStop(0.35, '#F8FAFC'); // High-key specular glare
  grad.addColorStop(0.48, '#020617'); // Dark reflection line
  grad.addColorStop(0.65, baseColor || '#475569'); // Palette color sheen
  grad.addColorStop(0.82, '#FFFFFF'); // Secondary specular highlight
  grad.addColorStop(0.93, '#1E293B'); // Shadow edge
  grad.addColorStop(1.0, '#94A3B8');
  return grad;
}

/**
 * Draw a wiggly/wavy line — sine-wave distorted path.
 */
function drawWiggle(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  amplitude: number,
  frequency: number,
  lineWidth: number,
  color: string,
  opacity: number,
  useChromeEffect = false,
  _lightPos: { x: number; y: number } | null = null
) {
  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  const steps = Math.max(Math.ceil(length / 2), 50);

  ctx.save();
  ctx.globalAlpha = useChromeEffect ? Math.min(opacity * 1.8, 0.95) : opacity;

  if (useChromeEffect) {
    const grad = ctx.createLinearGradient(startX, startY, endX, endY);
    grad.addColorStop(0.0, '#FFFFFF');
    grad.addColorStop(0.25, '#CBD5E0');
    grad.addColorStop(0.5, '#1A202C');
    grad.addColorStop(0.75, '#F7FAFC');
    grad.addColorStop(1.0, color || '#0077B6');
    ctx.strokeStyle = grad;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.7)';
    ctx.shadowBlur = 8;
  } else {
    ctx.strokeStyle = color;
  }

  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = startX + dx * t;
    const py = startY + dy * t;
    const wave = Math.sin(t * Math.PI * 2 * frequency) * amplitude;
    const perpX = -Math.sin(angle) * wave;
    const perpY = Math.cos(angle) * wave;

    const fx = px + perpX;
    const fy = py + perpY;

    if (i === 0) ctx.moveTo(fx, fy);
    else ctx.lineTo(fx, fy);
  }
  ctx.stroke();
  ctx.restore();
}



/* ── Layer Renderers ────────────────────────────────────────── */

/** 1. Background fill. */
function renderBackground(ctx: CanvasRenderingContext2D, palette: PaletteColors, template: IdCardTemplate) {
  const { widthPx: w, heightPx: h } = template.canvas;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  roundRectPath(ctx, 0, 0, w, h, template.cornerRadiusPx);
  ctx.clip();
  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** 2. Subtle texture. */
function renderTexture(ctx: CanvasRenderingContext2D, palette: PaletteColors, template: IdCardTemplate) {
  const { widthPx: w, heightPx: h } = template.canvas;
  ctx.save();
  roundRectPath(ctx, 0, 0, w, h, template.cornerRadiusPx);
  ctx.clip();
  ctx.fillStyle = hexToRgba(palette.primary, 0.012);
  const step = 28;
  for (let x = 0; x < w; x += step) {
    for (let y = 0; y < h; y += step) {
      const ox = ((x * 7 + y * 13) % 17) - 8;
      const oy = ((x * 11 + y * 3) % 13) - 6;
      ctx.beginPath();
      ctx.arc(x + ox, y + oy, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** 3. Background shapes (below portrait). */
function renderBgShapes(
  ctx: CanvasRenderingContext2D,
  shapes: Shape[],
  _palette: PaletteColors,
  template: IdCardTemplate,
  useChromeEffect = false,
  lightPos: { x: number; y: number } | null = null
) {
  const { widthPx: w, heightPx: h } = template.canvas;
  ctx.save();
  roundRectPath(ctx, 0, 0, w, h, template.cornerRadiusPx);
  ctx.clip();

  for (const shape of shapes) {
    if (shape.isOverlay) continue;
    ctx.save();
    ctx.globalAlpha = useChromeEffect ? Math.min(shape.opacity * 1.6, 0.9) : shape.opacity;
    if (shape.blur > 0) ctx.filter = `blur(${shape.blur}px)`;
    ctx.translate(shape.x, shape.y);
    ctx.rotate((shape.rotation * Math.PI) / 180);

    let fillStyle: string | CanvasGradient;
    if (useChromeEffect) {
      fillStyle = createChromeGradient(ctx, -shape.width / 2, -shape.height / 2, shape.width, shape.height, shape.color, lightPos);
      ctx.shadowColor = 'rgba(248, 250, 252, 0.6)';
      ctx.shadowBlur = 12;
    } else if (shape.useGradient && shape.gradientColor) {
      const grad = ctx.createLinearGradient(-shape.width / 2, -shape.height / 2, shape.width / 2, shape.height / 2);
      grad.addColorStop(0, shape.color);
      grad.addColorStop(1, shape.gradientColor);
      fillStyle = grad;
    } else {
      fillStyle = shape.color;
    }

    switch (shape.type) {
      case 'rect':
        ctx.fillStyle = fillStyle;
        roundRectPath(ctx, -shape.width / 2, -shape.height / 2, shape.width, shape.height, 8);
        ctx.fill();
        break;
      case 'circle':
        ctx.fillStyle = fillStyle;
        ctx.beginPath();
        ctx.arc(0, 0, shape.width / 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'blob': {
        ctx.fillStyle = fillStyle;
        const blobRng = [];
        let seed = Math.round(shape.x * 100 + shape.y * 37);
        const points = shape.blobPoints || 8;
        for (let i = 0; i < points; i++) {
          seed = ((seed * 1103515245 + 12345) & 0x7fffffff);
          blobRng.push(seed / 0x7fffffff);
        }
        drawBlobPath(ctx, 0, 0, shape.width / 2, points, shape.blobIrregularity || 0.3, blobRng);
        ctx.fill();
        break;
      }
      case 'triangle':
        ctx.fillStyle = fillStyle;
        ctx.beginPath();
        ctx.moveTo(0, -shape.height / 2);
        ctx.lineTo(shape.width / 2, shape.height / 2);
        ctx.lineTo(-shape.width / 2, shape.height / 2);
        ctx.closePath();
        ctx.fill();
        break;
      case 'line':
        ctx.strokeStyle = shape.color;
        ctx.lineWidth = shape.height || 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-shape.width / 2, 0);
        ctx.lineTo(shape.width / 2, 0);
        ctx.stroke();
        break;
      case 'dot':
        ctx.fillStyle = shape.color;
        ctx.beginPath();
        ctx.arc(0, 0, shape.height / 2, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
    ctx.restore();
  }
  ctx.restore();
}

/** 4. Portrait image with crop controls. */
function renderPortrait(
  ctx: CanvasRenderingContext2D,
  portraitImage: HTMLImageElement | null,
  crop: CropState,
  template: IdCardTemplate,
  useChromeEffect = false,
  lightPos: { x: number; y: number } | null = null,
  photoFrame?: 'rectangle' | 'circle',
  useThemeBg = false,
  palette?: PaletteColors,
  mood = "corporate"
) {
  const isCircleFrame = photoFrame === 'circle';
  const br = template.portrait.borderRadiusPx || 12;

  // Circular frame is 520x520px (centered), rectangular frame is 414x475px (standard template)
  const pr = isCircleFrame ? {
    x: 190,
    y: 327.5,
    width: 520,
    height: 520
  } : getPortraitRect(template);

  // If Chrome effect is ON, apply dark shiny metallic frame around the image box
  if (useChromeEffect) {
    ctx.save();
    if (isCircleFrame) {
      ctx.strokeStyle = createChromeGradient(ctx, pr.x - 8, pr.y - 8, pr.width + 16, pr.height + 16, '#0077B6', lightPos);
      ctx.lineWidth = 6;
      ctx.shadowColor = 'rgba(248, 250, 252, 0.8)';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(pr.x + pr.width / 2, pr.y + pr.height / 2, pr.width / 2 + 3, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeStyle = createChromeGradient(ctx, pr.x - 8, pr.y - 8, pr.width + 16, pr.height + 16, '#0077B6', lightPos);
      ctx.lineWidth = 6;
      ctx.shadowColor = 'rgba(248, 250, 252, 0.8)';
      ctx.shadowBlur = 16;
      roundRectPath(ctx, pr.x - 3, pr.y - 3, pr.width + 6, pr.height + 6, br + 3);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (portraitImage) {
    // Subtle shadow behind portrait
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    if (isCircleFrame) {
      ctx.beginPath();
      ctx.arc(pr.x + pr.width / 2, pr.y + pr.height / 2, pr.width / 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.01)';
      ctx.fill();
    } else {
      roundRectPath(ctx, pr.x, pr.y, pr.width, pr.height, br);
      ctx.fillStyle = 'rgba(0,0,0,0.01)';
      ctx.fill();
    }
    ctx.restore();

    // Draw portrait with crop values
    ctx.save();
    if (isCircleFrame) {
      ctx.beginPath();
      ctx.arc(pr.x + pr.width / 2, pr.y + pr.height / 2, pr.width / 2, 0, Math.PI * 2);
      ctx.clip();
    } else {
      roundRectPath(ctx, pr.x, pr.y, pr.width, pr.height, br);
      ctx.clip();
    }
    if (useThemeBg && palette) {
      createPortraitThemeFill(ctx, pr, palette, mood);
      drawFunkyPersonBoundary(
        ctx,
        portraitImage,
        pr.x + pr.width / 2,
        pr.y + pr.height / 2,
        pr.width,
        pr.height,
        crop,
        palette,
        mood
      );
    }
    drawCroppedImage(ctx, portraitImage, pr.x + pr.width / 2, pr.y + pr.height / 2, pr.width, pr.height, crop);
    ctx.restore();
  } else {
    // Placeholder
    ctx.save();
    if (isCircleFrame) {
      ctx.beginPath();
      ctx.arc(pr.x + pr.width / 2, pr.y + pr.height / 2, pr.width / 2, 0, Math.PI * 2);
      ctx.clip();
    } else {
      roundRectPath(ctx, pr.x, pr.y, pr.width, pr.height, br);
      ctx.clip();
    }
    ctx.fillStyle = 'rgba(128,128,128,0.06)';
    ctx.fillRect(pr.x, pr.y, pr.width, pr.height);

    // Dashed border
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = 'rgba(128,128,128,0.2)';
    ctx.lineWidth = 2;
    if (isCircleFrame) {
      ctx.beginPath();
      ctx.arc(pr.x + pr.width / 2, pr.y + pr.height / 2, pr.width / 2 - 4, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      roundRectPath(ctx, pr.x + 4, pr.y + 4, pr.width - 8, pr.height - 8, br - 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Silhouette
    const cx = pr.x + pr.width / 2;
    const cy = pr.y + pr.height * 0.38;
    const headR = pr.width * 0.12;
    ctx.fillStyle = 'rgba(128,128,128,0.12)';
    ctx.beginPath();
    ctx.arc(cx, cy, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx, cy + headR * 2.3, headR * 1.6, headR * 1.2, 0, Math.PI, 0);
    ctx.fill();

    ctx.fillStyle = 'rgba(128,128,128,0.25)';
    ctx.font = '500 16px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Upload Photo', cx, pr.y + pr.height * 0.72);
    ctx.restore();
  }
}

/** 5. Overlay shapes — wiggly lines & arcs ABOVE the portrait. */
function renderOverlayShapes(
  ctx: CanvasRenderingContext2D,
  shapes: Shape[],
  template: IdCardTemplate,
  useChromeEffect = false,
  lightPos: { x: number; y: number } | null = null
) {
  const { widthPx: w, heightPx: h } = template.canvas;
  ctx.save();
  roundRectPath(ctx, 0, 0, w, h, template.cornerRadiusPx);
  ctx.clip();

  for (const shape of shapes) {
    if (!shape.isOverlay) continue;

    if (shape.type === 'wiggle') {
      ctx.save();
      ctx.translate(0, 0);
      if (shape.rotation) ctx.rotate((shape.rotation * Math.PI) / 180);
      drawWiggle(
        ctx,
        shape.startX || 0, shape.startY || 0,
        shape.endX || w, shape.endY || h,
        shape.waveAmplitude || 10,
        shape.waveFrequency || 4,
        shape.waveLineWidth || 2,
        shape.color,
        shape.opacity,
        useChromeEffect,
        lightPos
      );
      ctx.restore();
    } else if (shape.type === 'arc') {
      ctx.save();
      ctx.globalAlpha = useChromeEffect ? Math.min(shape.opacity * 1.8, 0.95) : shape.opacity;
      const radius = shape.arcRadius || 100;
      ctx.strokeStyle = useChromeEffect ? createChromeGradient(ctx, shape.x - radius, shape.y - radius, radius * 2, radius * 2, shape.color, lightPos) : shape.color;
      ctx.lineWidth = shape.arcLineWidth || 2;
      ctx.lineCap = 'round';
      if (useChromeEffect) {
        ctx.shadowColor = 'rgba(248, 250, 252, 0.75)';
        ctx.shadowBlur = 10;
      }
      ctx.beginPath();
      ctx.arc(shape.x, shape.y, radius, shape.arcStartAngle || 0, (shape.arcStartAngle || 0) + (shape.arcSweep || Math.PI));
      ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();
}

/** 6. Header strip — 3/4 height glassy logo (+25% size), green shadow glow, translucent glass panel. */
function renderHeader(ctx: CanvasRenderingContext2D, _palette: PaletteColors, _textFields: Record<string, string>, template: IdCardTemplate) {
  const { widthPx: w, heightPx: h } = template.canvas;
  const hr = getHeaderRect(template);

  ctx.save();
  roundRectPath(ctx, 0, 0, w, h, template.cornerRadiusPx);
  ctx.clip();

  // Glassy header panel container with green shadow glow (+25% height)
  ctx.save();
  ctx.shadowColor = 'rgba(34, 197, 94, 0.85)'; // Vibrant green shadow
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 4;

  const panelX = hr.x + 16;
  const panelY = hr.y + 10;
  const panelW = hr.width - 32;
  const panelH = hr.height - 20;
  const panelCX = panelX + panelW / 2;

  roundRectPath(ctx, panelX, panelY, panelW, panelH, 18);
  ctx.fillStyle = 'rgba(4, 47, 46, 0.65)'; // Translucent dark emerald glass
  ctx.fill();

  // Translucent glass border highlight
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();



  // Centered main logo: HACKER [गोवा] HOUSE (+25% text size)
  const cy = panelY + panelH * 0.50;

  ctx.save();
  ctx.font = '900 72px "Playfair Display", serif';

  const hackerW = ctx.measureText('HACKER').width;
  const houseW = ctx.measureText('HOUSE').width;
  const badgeW = 120;
  const gap = 24;
  const totalW = hackerW + gap + badgeW + gap + houseW;
  const startX = panelCX - totalW / 2;

  // Vibrant Green Shadow / Glow around title
  ctx.shadowColor = 'rgba(34, 197, 94, 0.95)';
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 0;

  // Draw HACKER
  ctx.fillStyle = '#FFE500'; // Vibrant Sun Yellow
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('HACKER', startX, cy);

  // Draw rotated Hot Pink (गोवा) Badge (scaled to match)
  const badgeCenterX = startX + hackerW + gap + badgeW / 2;
  ctx.save();
  ctx.translate(badgeCenterX, cy);
  ctx.rotate((-6 * Math.PI) / 180); // Rotated -6deg

  roundRectPath(ctx, -60, -31, 120, 62, 31);
  ctx.fillStyle = '#FF007A'; // Hot Pink / Magenta
  ctx.shadowColor = 'rgba(255, 0, 122, 0.8)';
  ctx.shadowBlur = 18;
  ctx.fill();
  ctx.strokeStyle = '#FFE500';
  ctx.lineWidth = 3.5;
  ctx.stroke();

  ctx.fillStyle = '#FFE500';
  ctx.font = '900 30px "Rozha One", "Playfair Display", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowBlur = 0;
  ctx.fillText('गोवा', 0, 1);
  ctx.restore();

  // Draw HOUSE
  const houseX = startX + hackerW + gap + badgeW + gap;
  ctx.fillStyle = '#FFE500';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('HOUSE', houseX, cy);
  ctx.restore();

  ctx.restore();
}

/** Helper to limit string length to 20 characters maximum. */
function truncate20(str: string, maxLen = 20): string {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen).trim() + '…' : str;
}

/** 7. Footer strip — expanded glassy panel (+25% text sizes), centered Team, Member, and Skills. */
/** Helper to draw a four-pointed golden sparkle star. */
function drawSparkle(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color = '#FFE500') {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.quadraticCurveTo(cx, cy, cx + size, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy + size);
  ctx.quadraticCurveTo(cx, cy, cx - size, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy - size);
  ctx.fill();
  ctx.restore();
}

/** 7. Footer strip — expanded glassy panel (+25% text sizes), centered Team, Member, and Skills. */
function renderFooter(ctx: CanvasRenderingContext2D, _palette: PaletteColors, textFields: Record<string, string>, _roleColor: string, template: IdCardTemplate) {
  const { widthPx: w, heightPx: h } = template.canvas;
  const fr = getFooterRect(template);

  ctx.save();
  roundRectPath(ctx, 0, 0, w, h, template.cornerRadiusPx);
  ctx.clip();

  // Glassy panel container with green shadow/glow (+25% height: 250px)
  ctx.save();
  ctx.shadowColor = 'rgba(34, 197, 94, 0.85)'; // Vibrant green shadow
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 4;

  const panelX = fr.x + 16;
  const panelY = fr.y + 10;
  const panelW = fr.width - 32;
  const panelH = fr.height - 20;
  const panelCX = panelX + panelW / 2;

  roundRectPath(ctx, panelX, panelY, panelW, panelH, 20);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)'; // Frosted translucent glass
  ctx.fill();

  // Translucent glass border highlight
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  const rawTeam = truncate20(textFields.teamName || 'Team Alpha', 20);
  const rawMember = truncate20(textFields.memberName || 'Satoshi Nakamoto', 20);
  const rawRole = textFields.role || 'Developer | UI/UX';
  const formattedSkills = rawRole
    .split(/[,|]/)
    .map(s => truncate20(s.trim(), 14))
    .filter(Boolean)
    .join('  |  ');

  // Name Box Configuration (Background matching Header Green)
  const boxW = 600;
  const boxH = 76;
  const boxX = panelCX - boxW / 2;
  const boxY = 960 + 65; // 1025
  const headerGreen = 'rgba(4, 47, 46, 0.95)'; // Exact matching header emerald green

  // 1. Draw Name Box
  ctx.save();
   ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
   ctx.shadowBlur = 12;
   ctx.shadowOffsetY = 4;

   // Draw translucent emerald name box with subtle inner gradient
   const nameBoxGrad = ctx.createLinearGradient(boxX, boxY, boxX, boxY + boxH);
   nameBoxGrad.addColorStop(0, 'rgba(4, 47, 46, 0.7)');
   nameBoxGrad.addColorStop(1, 'rgba(4, 47, 46, 0.5)');
   roundRectPath(ctx, boxX, boxY, boxW, boxH, 18);
   ctx.fillStyle = nameBoxGrad;
   ctx.fill();

   ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; // subtle cream border
   ctx.lineWidth = 2.5;
   ctx.stroke();
   ctx.restore();

  // 2. Draw Left & Right Sparkles (Stars) inside the box in cream color
  drawSparkle(ctx, boxX + 35, boxY + boxH / 2, 12, '#FFFDEB');
  drawSparkle(ctx, boxX + boxW - 35, boxY + boxH / 2, 12, '#FFFDEB');

  // 3. Draw Centered Member Name inside the box in Cream
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
   ctx.font = '800 38px Inter, system-ui, sans-serif';
   ctx.fillStyle = 'rgba(255,255,255,0.9)'; // Near-white for contrast
   ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
   ctx.shadowBlur = 12;

  let memberFontSize = 38;
  while (ctx.measureText(rawMember).width > boxW - 120 && memberFontSize > 22) {
    memberFontSize -= 2;
    ctx.font = `800 ${memberFontSize}px Inter, system-ui, sans-serif`;
  }
  ctx.fillText(rawMember, panelCX, boxY + boxH / 2);
  ctx.restore();

  // 4. Draw Left-aligned Team Name text just above the name box
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.font = '800 32px Inter, monospace';
  ctx.fillStyle = '#FFE500'; // Gold text
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 8;

  let teamFontSize = 32;
  while (ctx.measureText(rawTeam).width > boxW && teamFontSize > 18) {
    teamFontSize -= 1;
    ctx.font = `800 ${teamFontSize}px Inter, monospace`;
  }
  ctx.fillText(rawTeam, boxX + 4, boxY - 10);
  ctx.restore();

  // 5. Draw Cream Box for Role / Skills content
  const roleBoxW = 460;
  const roleBoxH = 52;
  const roleBoxX = panelCX - roleBoxW / 2;
  const roleBoxY = boxY + boxH + 18; // 1119

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;

  roundRectPath(ctx, roleBoxX, roleBoxY, roleBoxW, roleBoxH, 12);
  ctx.fillStyle = '#FFFDEB'; // Cream background
  ctx.fill();

  ctx.strokeStyle = headerGreen; // Green border matching header green
  ctx.lineWidth = 2.0;
  ctx.stroke();
  ctx.restore();

  // 6. Draw Centered Role / Skills text inside the cream box in Header Green
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 18px Inter, monospace';
  ctx.fillStyle = 'rgba(4, 47, 46, 0.95)'; // Green text color
  ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
  ctx.shadowBlur = 4;

  let skillFontSize = 18;
  while (ctx.measureText(formattedSkills).width > roleBoxW - 44 && skillFontSize > 13) {
    skillFontSize -= 1;
    ctx.font = `700 ${skillFontSize}px Inter, monospace`;
  }
  ctx.fillText(formattedSkills, panelCX, roleBoxY + roleBoxH / 2);
  ctx.restore();

  ctx.restore();
}

function drawSocialLogo(
  ctx: CanvasRenderingContext2D,
  platform: string,
  cx: number,
  cy: number,
  size: number
) {
  const p = platform.toLowerCase();
  if (p === 'instagram') {
    ctx.save();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = size * 0.08;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Rounded outer square
    roundRectPath(ctx, cx - size / 2, cy - size / 2, size, size, size * 0.28);
    ctx.stroke();
    // Inner camera circle
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.24, 0, Math.PI * 2);
    ctx.stroke();
    // Small lens flash dot
    ctx.beginPath();
    ctx.arc(cx + size * 0.24, cy - size * 0.24, size * 0.07, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.restore();
  } else if (p === 'linkedin') {
    ctx.save();
    // LinkedIn Blue-ish square
    ctx.fillStyle = '#FFFFFF';
    roundRectPath(ctx, cx - size / 2, cy - size / 2, size, size, size * 0.18);
    ctx.fill();

    ctx.font = `bold ${Math.round(size * 0.72)}px Inter, sans-serif`;
    ctx.fillStyle = '#0F172A';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('in', cx, cy + size * 0.04);
    ctx.restore();
  } else if (p === 'github') {
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw a minimalist cat head cutout inside the white circle
    ctx.beginPath();
    ctx.fillStyle = '#0F172A';
    // Cat head circle
    ctx.arc(cx, cy + size * 0.08, size * 0.28, 0, Math.PI * 2);
    ctx.fill();
    // Cat ears
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.14, cy - size * 0.04);
    ctx.lineTo(cx - size * 0.24, cy - size * 0.26);
    ctx.lineTo(cx - size * 0.05, cy - size * 0.13);
    ctx.closePath();
    ctx.moveTo(cx + size * 0.14, cy - size * 0.04);
    ctx.lineTo(cx + size * 0.24, cy - size * 0.26);
    ctx.lineTo(cx + size * 0.05, cy - size * 0.13);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else if (p === 'x') {
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    const scale = size / 24;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    // Main thick diagonal bar
    ctx.beginPath();
    ctx.moveTo(-8, -8);
    ctx.lineTo(-3, -8);
    ctx.lineTo(8, 8);
    ctx.lineTo(3, 8);
    ctx.closePath();
    ctx.fill();

    // Thin diagonal line
    ctx.beginPath();
    ctx.moveTo(3, -8);
    ctx.lineTo(-8, 8);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.restore();
  }
}

/** 8. Colored card border. */
function renderBorder(ctx: CanvasRenderingContext2D, borderColor: string, template: IdCardTemplate, useChromeEffect = false, lightPos: { x: number; y: number } | null = null) {
  const { widthPx: w, heightPx: h } = template.canvas;
  const bw = template.border.widthPx;
  const r = template.cornerRadiusPx;

  ctx.save();
  if (useChromeEffect) {
    ctx.strokeStyle = createChromeGradient(ctx, 0, 0, w, h, borderColor || '#0077B6', lightPos);
    ctx.shadowColor = 'rgba(248, 250, 252, 0.85)';
    ctx.shadowBlur = 16;
  } else {
    ctx.strokeStyle = borderColor || '#0077B6';
  }
  ctx.lineWidth = bw * 2; // doubled because half is clipped outside
  roundRectPath(ctx, 0, 0, w, h, r);
  ctx.stroke();
  ctx.restore();
}

/** 9. Render Back Side of Card with Social Media Scanner. */
export function renderCardBack(ctx: CanvasRenderingContext2D, state: IdMakerState) {
  const template = state.template || idCardTemplate;
  const {
    palette: rawPalette, shapes, textFields, borderColor,
    useChromeEffect, lightPos,
    github, linkedin, instagram, x, shareInfoLink
  } = state;

  const palette = getRenderPalette(rawPalette, useChromeEffect);

  // 1. Background
  renderBackground(ctx, palette, template);

  // Clip to card
  ctx.save();
  roundRectPath(ctx, 0, 0, template.canvas.widthPx, template.canvas.heightPx, template.cornerRadiusPx);
  ctx.clip();

  // 3. Decorative shapes (same theme as front!)
  renderBgShapes(ctx, shapes, palette, template, useChromeEffect, lightPos);

  // 4. Header strip ("HACKER [गोवा] HOUSE")
  renderHeader(ctx, palette, textFields || {}, template);

  // --- Single Scanner (Primary Social Connect → hhgoa.com) ---
  // Photo portrait on front: width=414px (46% of 900). Scanner is slightly bigger.
  const scanW = 460;
  const scanH = 560;   // portrait aspect (~1.35 tall)
  const qrSize = 380;

  // Position: horizontally centered, start just below header
  const headerBottom = 155;
  const scanY = headerBottom + 30;
  const scanX = (template.canvas.widthPx - scanW) / 2;

  // Fixed QR URL
  const qrUrl = 'https://hhgoa.com/';

  // Scanner background — clean white rectangle
  ctx.save();
  ctx.shadowColor = rawPalette.primary;
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 6;
  roundRectPath(ctx, scanX, scanY, scanW, scanH, 20);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.07)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // QR Code — fills most of white card
  const qrX = scanX + (scanW - qrSize) / 2;
  const qrY = scanY + 24;
  ctx.save();
  drawQRCode(ctx, qrUrl, qrX, qrY, qrSize, { darkColor: '#0F172A', lightColor: '#FFFFFF' });
  ctx.restore();

  // Labels below QR
  ctx.save();
  ctx.font = '700 18px Inter, monospace';
  ctx.fillStyle = '#0F172A';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('hhgoa.com', scanX + scanW / 2, scanY + scanH - 44);

  ctx.font = '600 12px Inter, monospace';
  ctx.fillStyle = '#64748B';
  ctx.fillText('SCAN TO VISIT', scanX + scanW / 2, scanY + scanH - 22);
  ctx.restore();


  // --- Socials Window — shifted down, below scanner ---
  const scanBottom = scanY + scanH;
  const winW = 820;
  const winH = 300;
  const winX = (template.canvas.widthPx - winW) / 2;
  const winY = scanBottom + 28;

  // Collect active socials
  const activeSocials: Array<{ platform: string; url: string; glowColor: string; bgColor: string }> = [];
  if (github && github.trim()) {
    activeSocials.push({
      platform: 'github',
      url: github.trim(),
      glowColor: 'rgba(0, 240, 255, 0.8)',
      bgColor: '#1a1a2e',
    });
  }
  if (linkedin && linkedin.trim()) {
    activeSocials.push({
      platform: 'linkedin',
      url: linkedin.trim(),
      glowColor: 'rgba(0, 119, 181, 0.9)',
      bgColor: '#0077B5',
    });
  }
  if (instagram && instagram.trim()) {
    activeSocials.push({
      platform: 'instagram',
      url: instagram.trim(),
      glowColor: 'rgba(225, 48, 108, 0.9)',
      bgColor: '#833AB4',
    });
  }
  if (x && x.trim()) {
    activeSocials.push({
      platform: 'x',
      url: x.trim(),
      glowColor: 'rgba(255, 255, 255, 0.8)',
      bgColor: '#000000',
    });
  }

  ctx.save();
  ctx.shadowColor = rawPalette.primary;
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 4;
  roundRectPath(ctx, winX, winY, winW, winH, 24);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Social Dock title
  ctx.save();
  ctx.font = '800 13px Inter, monospace';
  ctx.fillStyle = rawPalette.primary;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CONNECT FOR FUN', winX + winW / 2, winY + 28);
  ctx.restore();

  const hasShareButton = !!(shareInfoLink && shareInfoLink.trim());

  if (activeSocials.length === 0) {
    ctx.save();
    ctx.font = '600 15px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Your social profiles will appear here', winX + winW / 2, hasShareButton ? winY + 115 : winY + 145);
    ctx.restore();
  } else {
    // Horizontal layout — icon in glowing bordered circle
    const count = activeSocials.length;
    const colW = winW / count;
    const iconSize = 38;
    const circleR = 52;

    activeSocials.forEach((social, idx) => {
      const itemCenterX = winX + idx * colW + colW / 2;
      const itemCenterY = hasShareButton ? winY + 100 : winY + 148;

      // Glowing circle background
      ctx.save();
      ctx.shadowColor = social.glowColor;
      ctx.shadowBlur = 22;
      ctx.beginPath();
      ctx.arc(itemCenterX, itemCenterY - 10, circleR, 0, Math.PI * 2);
      ctx.fillStyle = social.bgColor;
      ctx.fill();
      // White glowing border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();

      // Logo inside circle
      ctx.save();
      ctx.shadowColor = social.glowColor;
      ctx.shadowBlur = 10;
      drawSocialLogo(ctx, social.platform, itemCenterX, itemCenterY - 10, iconSize);
      ctx.restore();

      // URL label below
      ctx.save();
      ctx.font = '700 13px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const displayUrl = social.url.replace(/^(https?:\/\/)?(www\.)?/, '');
      const truncatedText = displayUrl.length > 20 ? displayUrl.slice(0, 18) + '…' : displayUrl;
      ctx.fillText(truncatedText, itemCenterX, itemCenterY + circleR + 4);
      ctx.restore();
    });
  }

  // Draw Glowing Share Info Button if present
  if (hasShareButton) {
    const btnW = 280;
    const btnH = 44;
    const btnX = winX + (winW - btnW) / 2;
    const btnY = winY + 195;

    ctx.save();
    ctx.shadowColor = rawPalette.primary;
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 2;
    roundRectPath(ctx, btnX, btnY, btnW, btnH, 22);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.font = '700 13px Inter, monospace';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔗  SHARE INFO BUTTON', btnX + btnW / 2, btnY + btnH / 2 + 1);
    ctx.restore();
  }

  // --- Builder ID row — inside the socials window at the very bottom ---
  if (state.builderId) {
    const cardW = template.canvas.widthPx;
    // winY=773 winH=300 → window bottom = 1073. Place ID centred at y=1110
    const idY = 1110;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Pill background
    const pillW = 360;
    const pillH = 44;
    const pillX = cardW / 2 - pillW / 2;
    const pillY = idY - pillH / 2;
    roundRectPath(ctx, pillX, pillY, pillW, pillH, 22);
    ctx.fillStyle = 'rgba(0, 229, 255, 0.09)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Credit card icon
    ctx.font = '500 20px Inter, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('\ud83e\udeaa', cardW / 2 - 120, idY);

    // "Builder ID:" label
    ctx.font = '600 20px Inter, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.textAlign = 'left';
    const label = 'Builder ID: ';
    ctx.fillText(label, cardW / 2 - 94, idY);
    const labelW = ctx.measureText(label).width;

    // ID value — glowing cyan
    ctx.font = '700 20px Inter, monospace';
    ctx.fillStyle = '#00E5FF';
    ctx.shadowColor = 'rgba(0, 229, 255, 0.85)';
    ctx.shadowBlur = 14;
    ctx.fillText(state.builderId, cardW / 2 - 94 + labelW, idY);
    ctx.restore();
  }

  ctx.restore(); // end clip

  // 6. Border
  renderBorder(ctx, borderColor, template, useChromeEffect, lightPos);
}

/** Draw stamps/badges as glassy circular pins on the card. */
function renderCharms(ctx: CanvasRenderingContext2D, charms: Charm[], template: IdCardTemplate) {
  if (!charms || charms.length === 0) return;
  const w = template.canvas.widthPx;
  const h = template.canvas.heightPx;

  for (const charm of charms) {
    if (!charm.active) continue;
    const cx = (charm.xPct / 100) * w;
    const cy = (charm.yPct / 100) * h;

    // Draw Emoji directly with a text drop shadow and rotation
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((charm.rotation || 0) * Math.PI / 180);

    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;
    
    // Five size stages: max size (stage 5) is 128px (exactly 1/7 of card 900px width)
    const fontSizes = [46, 66, 86, 106, 128];
    const stage = Math.max(1, Math.min(5, Math.round(charm.size || 1)));
    const finalFontSize = fontSizes[stage - 1];

    ctx.font = `${finalFontSize}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(charm.emoji, 0, 0);
    ctx.restore();
  }
}

/**
 * Renders the complete ID card (Front or Back).
 */
export function renderCard(ctx: CanvasRenderingContext2D, state: IdMakerState) {
  if (state.cardSide === 'back') {
    renderCardBack(ctx, state);
    return;
  }

  const template = state.template || idCardTemplate;
  const {
    palette: rawPalette, shapes, portraitImage, crop,
    textFields, borderColor, roleColor, useChromeEffect, lightPos, charms, photoFrame,
    mood, useThemeBg
  } = state;

  const palette = getRenderPalette(rawPalette, useChromeEffect);

  // 1. Background
  renderBackground(ctx, palette, template);

  // Clip to card for all subsequent layers
  ctx.save();
  roundRectPath(ctx, 0, 0, template.canvas.widthPx, template.canvas.heightPx, template.cornerRadiusPx);
  ctx.clip();

  // 2. Texture
  renderTexture(ctx, palette, template);

  // 3. Background shapes (below portrait)
  renderBgShapes(ctx, shapes, palette, template, useChromeEffect, lightPos);

  // 4. Portrait (with Chrome box frame if enabled and crop parameters)
  renderPortrait(
    ctx,
    portraitImage,
    crop,
    template,
    useChromeEffect,
    lightPos,
    photoFrame,
    !!useThemeBg,
    palette,
    mood
  );

  // 5. Overlay shapes — wiggly lines ABOVE portrait
  renderOverlayShapes(ctx, shapes, template, useChromeEffect, lightPos);

  // 5.5 Charms badges on front side
  renderCharms(ctx, charms, template);

  // 5.8 Custom "2:47PM STUDIO" hand-drawn logo at the top right below the header
  if (state.studioLogoImage) {
    drawChromaKeyedImage(ctx, state.studioLogoImage, 690, 240, 185, 115);
  }

  // 5.9 #FrameInGoa hashtag — gap between portrait (ends ~825px) and footer (~950px)
  {
    const cardW = template.canvas.widthPx;
    const tagY = 887; // vertical center of the gap
    const tagText = '#FrameInGoa';
    const dash = '——';

    ctx.save();
    // Green glow shadow
    ctx.shadowColor = '#00C853';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.font = '700 26px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFE500';

    // Draw dashes and hashtag as one centered line
    ctx.fillText(`${dash}  ${tagText}  ${dash}`, cardW / 2, tagY);
    ctx.restore();
  }

  // 6. Header strip
  renderHeader(ctx, palette, textFields || {}, template);

  // 7. Footer strip
  renderFooter(ctx, palette, { ...(textFields || {}), builderId: state.builderId || '' }, roleColor, template);

  ctx.restore();

  // 8. Border (outside the clip)
  renderBorder(ctx, borderColor, template, useChromeEffect, lightPos);
}

/** Extracts the yellow text logo by green chroma-keying its background canvas pixels. */
function drawChromaKeyedImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
) {
  try {
    const offscreen = document.createElement('canvas');
    offscreen.width = img.naturalWidth || img.width || 300;
    offscreen.height = img.naturalHeight || img.height || 200;
    const octx = offscreen.getContext('2d');
    if (!octx) {
      ctx.drawImage(img, x, y, width, height);
      return;
    }

    octx.drawImage(img, 0, 0, offscreen.width, offscreen.height);

    const imgData = octx.getImageData(0, 0, offscreen.width, offscreen.height);
    const data = imgData.data;

    // Remove the rich forest green background (#006736) dynamically
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Saturated green filter bounds
      if (g > 60 && g > r * 1.4 && g > b * 1.4) {
        data[i + 3] = 0; // key to transparent
      }
    }

    octx.putImageData(imgData, 0, 0);
    ctx.drawImage(offscreen, x, y, width, height);
  } catch (e) {
    // Fallback directly to image draw if CORS or canvas reads fail
    ctx.drawImage(img, x, y, width, height);
  }
}

