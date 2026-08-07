/**
 * renderer.js — Layer-by-Layer Canvas Rendering Pipeline (Sketch Revision)
 *
 * Render order:
 *   background → texture → bg-shapes → portrait → overlay-shapes
 *   → header (hatching + logo + event name)
 *   → footer (hatching + team/member/role text)
 *   → border
 *
 * Overlay shapes (wiggly lines) render ABOVE the portrait to create
 * the intentional overlap effect from the sketch.
 */

import {
  idCardTemplate, getPortraitRect, getHeaderRect, getFooterRect
} from './template.js';
import { hexToRgba } from './palette.js';
import { drawQRCode } from './qrcode.js';

/* ── Drawing Helpers ────────────────────────────────────────── */

function roundRectPath(ctx, x, y, w, h, r) {
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

/** Draw image with object-fit: cover into a rect. */
function drawImageCover(ctx, img, dx, dy, dw, dh, borderRadius = 0) {
  const imgW = img.naturalWidth || img.width;
  const imgH = img.naturalHeight || img.height;
  const imgAspect = imgW / imgH;
  const zoneAspect = dw / dh;
  let sx, sy, sw, sh;
  if (imgAspect > zoneAspect) {
    sh = imgH; sw = imgH * zoneAspect;
    sx = (imgW - sw) / 2; sy = 0;
  } else {
    sw = imgW; sh = imgW / zoneAspect;
    sx = 0; sy = (imgH - sh) / 2;
  }
  ctx.save();
  if (borderRadius > 0) {
    roundRectPath(ctx, dx, dy, dw, dh, borderRadius);
    ctx.clip();
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  ctx.restore();
}

/** Draw a smooth organic blob. */
function drawBlobPath(ctx, cx, cy, avgRadius, numPoints, irregularity, rngValues) {
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
function createChromeGradient(ctx, x, y, w, h, baseColor = '#0077B6', lightPos = null) {
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
 * Flows from (startX, startY) to (endX, endY) with a sine wave applied
 * perpendicular to the path direction.
 */
function drawWiggle(ctx, startX, startY, endX, endY, amplitude, frequency, lineWidth, color, opacity, useChromeEffect = false) {
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
    // Position along the straight path
    const px = startX + dx * t;
    const py = startY + dy * t;
    // Sine wave perpendicular to path direction
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

/**
 * Draw diagonal hatching pattern inside a clipped region.
 */
function drawHatching(ctx, x, y, w, h, angle, spacing, color, opacity) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  ctx.strokeStyle = color;
  ctx.globalAlpha = opacity;
  ctx.lineWidth = 1.2;

  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const maxDim = Math.hypot(w, h) * 1.5;

  for (let d = -maxDim; d < maxDim; d += spacing) {
    const x1 = x + w / 2 + cos * d - sin * maxDim;
    const y1 = y + h / 2 + sin * d + cos * maxDim;
    const x2 = x + w / 2 + cos * d + sin * maxDim;
    const y2 = y + h / 2 + sin * d - cos * maxDim;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  ctx.restore();
}

/* ── Layer Renderers ────────────────────────────────────────── */

/** 1. Background fill. */
function renderBackground(ctx, palette, template) {
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
function renderTexture(ctx, palette, template) {
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
function renderBgShapes(ctx, shapes, palette, template, useChromeEffect = false, lightPos = null) {
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

    let fillStyle;
    if (useChromeEffect) {
      fillStyle = createChromeGradient(ctx, -shape.width / 2, -shape.height / 2, shape.width, shape.height, shape.color, lightPos);
      ctx.shadowColor = 'rgba(248, 250, 252, 0.6)';
      ctx.shadowBlur = 12;
    } else if (shape.useGradient) {
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
        for (let i = 0; i < shape.blobPoints; i++) {
          seed = ((seed * 1103515245 + 12345) & 0x7fffffff);
          blobRng.push(seed / 0x7fffffff);
        }
        drawBlobPath(ctx, 0, 0, shape.width / 2, shape.blobPoints, shape.blobIrregularity, blobRng);
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

/** 4. Portrait image. */
function renderPortrait(ctx, portraitImage, template, useChromeEffect = false, lightPos = null) {
  const pr = getPortraitRect(template);
  const br = template.portrait.borderRadiusPx || 12;

  // If Chrome effect is ON, apply dark shiny metallic frame around the image box
  if (useChromeEffect) {
    ctx.save();
    ctx.strokeStyle = createChromeGradient(ctx, pr.x - 8, pr.y - 8, pr.width + 16, pr.height + 16, '#0077B6', lightPos);
    ctx.lineWidth = 6;
    ctx.shadowColor = 'rgba(248, 250, 252, 0.8)';
    ctx.shadowBlur = 16;
    roundRectPath(ctx, pr.x - 3, pr.y - 3, pr.width + 6, pr.height + 6, br + 3);
    ctx.stroke();
    ctx.restore();
  }

  if (portraitImage) {
    // Subtle shadow behind portrait
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    roundRectPath(ctx, pr.x, pr.y, pr.width, pr.height, br);
    ctx.fillStyle = 'rgba(0,0,0,0.01)';
    ctx.fill();
    ctx.restore();

    // Draw portrait
    drawImageCover(ctx, portraitImage, pr.x, pr.y, pr.width, pr.height, br);
  } else {
    // Placeholder
    ctx.save();
    roundRectPath(ctx, pr.x, pr.y, pr.width, pr.height, br);
    ctx.clip();
    ctx.fillStyle = 'rgba(128,128,128,0.06)';
    ctx.fillRect(pr.x, pr.y, pr.width, pr.height);

    // Dashed border
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = 'rgba(128,128,128,0.2)';
    ctx.lineWidth = 2;
    roundRectPath(ctx, pr.x + 4, pr.y + 4, pr.width - 8, pr.height - 8, br - 2);
    ctx.stroke();
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
function renderOverlayShapes(ctx, shapes, template, useChromeEffect = false, lightPos = null) {
  const { widthPx: w, heightPx: h } = template.canvas;
  ctx.save();
  roundRectPath(ctx, 0, 0, w, h, template.cornerRadiusPx);
  ctx.clip();

  for (const shape of shapes) {
    if (!shape.isOverlay) continue;

    if (shape.type === 'wiggle') {
      ctx.save();
      ctx.translate(0, 0);
      ctx.rotate((shape.rotation * Math.PI) / 180);
      drawWiggle(
        ctx,
        shape.startX, shape.startY,
        shape.endX, shape.endY,
        shape.waveAmplitude,
        shape.waveFrequency,
        shape.waveLineWidth,
        shape.color,
        shape.opacity,
        useChromeEffect,
        lightPos
      );
      ctx.restore();
    } else if (shape.type === 'arc') {
      ctx.save();
      ctx.globalAlpha = useChromeEffect ? Math.min(shape.opacity * 1.8, 0.95) : shape.opacity;
      ctx.strokeStyle = useChromeEffect ? createChromeGradient(ctx, shape.x - shape.arcRadius, shape.y - shape.arcRadius, shape.arcRadius * 2, shape.arcRadius * 2, shape.color, lightPos) : shape.color;
      ctx.lineWidth = shape.arcLineWidth || 2;
      ctx.lineCap = 'round';
      if (useChromeEffect) {
        ctx.shadowColor = 'rgba(248, 250, 252, 0.75)';
        ctx.shadowBlur = 10;
      }
      ctx.beginPath();
      ctx.arc(shape.x, shape.y, shape.arcRadius, shape.arcStartAngle, shape.arcStartAngle + shape.arcSweep);
      ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();
}

/** 6. Header strip — 3/4 height glassy logo (+25% size), green shadow glow, translucent glass panel. */
function renderHeader(ctx, palette, textFields, logoImage, template) {
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

  // Micro header tags (top left & top right)
  ctx.save();
  ctx.font = '600 14px monospace';
  ctx.fillStyle = '#A7F3D0';
  ctx.textBaseline = 'top';

  // Left tag
  ctx.textAlign = 'left';
  ctx.fillText('>_ task #01 — builder id generator', panelX + 24, panelY + 14);

  // Right tag
  ctx.textAlign = 'right';
  ctx.fillText('2:47PM STUDIO ☾', panelX + panelW - 24, panelY + 14);
  ctx.restore();

  // Centered main logo: HACKER [गोवा] HOUSE (+25% text size)
  const cy = panelY + panelH * 0.50;

  ctx.save();
  // 58px font (+25% increase)
  ctx.font = '900 58px "Playfair Display", serif';

  const hackerW = ctx.measureText('HACKER').width;
  const houseW = ctx.measureText('HOUSE').width;
  const badgeW = 96;
  const gap = 20;
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

  // Draw rotated Hot Pink (गोवा) Badge (+25% size)
  const badgeCenterX = startX + hackerW + gap + badgeW / 2;
  ctx.save();
  ctx.translate(badgeCenterX, cy);
  ctx.rotate((-6 * Math.PI) / 180); // Rotated -6deg

  roundRectPath(ctx, -48, -25, 96, 50, 25);
  ctx.fillStyle = '#FF007A'; // Hot Pink / Magenta
  ctx.shadowColor = 'rgba(255, 0, 122, 0.8)';
  ctx.shadowBlur = 18;
  ctx.fill();
  ctx.strokeStyle = '#FFE500';
  ctx.lineWidth = 3.5;
  ctx.stroke();

  ctx.fillStyle = '#FFE500';
  ctx.font = '900 24px "Rozha One", "Playfair Display", serif';
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

  // Centered Subtitle line at bottom of header panel
  ctx.save();
  ctx.font = '700 15px Inter, monospace';
  ctx.fillStyle = '#A7F3D0';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.shadowColor = 'rgba(34, 197, 94, 0.6)';
  ctx.shadowBlur = 10;
  ctx.fillText('GOA, INDIA   •   28 - 31 OCT 2026', panelCX, panelY + panelH - 12);
  ctx.restore();

  ctx.restore();
}

/**
 * Helper to limit string length to 20 characters maximum.
 */
function truncate20(str, maxLen = 20) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen).trim() + '…' : str;
}

/** 7. Footer strip — expanded glassy panel (+25% text sizes), centered Team, Member, and Skills (| separated), 20-char cap. */
function renderFooter(ctx, palette, textFields, roleColor, template) {
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

  // Line 1: Team Name (Top, centered, big 30px Playfair Display title)
  const rawTeam = truncate20(textFields.teamName || 'Team Alpha', 20);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 30px "Playfair Display", serif';
  ctx.fillStyle = '#FFE500'; // Vibrant Sun Yellow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 10;

  let teamFontSize = 30;
  while (ctx.measureText(rawTeam).width > panelW - 56 && teamFontSize > 20) {
    teamFontSize -= 2;
    ctx.font = `900 ${teamFontSize}px "Playfair Display", serif`;
  }
  ctx.fillText(rawTeam, panelCX, panelY + panelH * 0.25);
  ctx.restore();

  // Line 2: Member Name (Middle, centered, large bold 38px Inter font)
  const rawMember = truncate20(textFields.memberName || 'John Doe', 20);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 38px Inter, system-ui, sans-serif';
  ctx.fillStyle = palette.text;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 10;

  let memberFontSize = 38;
  while (ctx.measureText(rawMember).width > panelW - 56 && memberFontSize > 22) {
    memberFontSize -= 2;
    ctx.font = `800 ${memberFontSize}px Inter, system-ui, sans-serif`;
  }
  ctx.fillText(rawMember, panelCX, panelY + panelH * 0.56);
  ctx.restore();

  // Line 3: Skills / Role separated by " | " (Bottom, centered, 20px font)
  const rawRole = textFields.role || 'Developer | UI/UX';
  const formattedSkills = rawRole
    .split(/[,|]/)
    .map(s => truncate20(s.trim(), 14))
    .filter(Boolean)
    .join('  |  ');

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '600 20px Inter, monospace';
  ctx.fillStyle = roleColor || palette.secondary;
  ctx.shadowColor = 'rgba(34, 197, 94, 0.65)';
  ctx.shadowBlur = 12;

  let skillFontSize = 20;
  while (ctx.measureText(formattedSkills).width > panelW - 44 && skillFontSize > 14) {
    skillFontSize -= 1;
    ctx.font = `600 ${skillFontSize}px Inter, monospace`;
  }
  ctx.fillText(formattedSkills, panelCX, panelY + panelH * 0.82);
  ctx.restore();

  ctx.restore();
}

/** 8. Colored card border. */
function renderBorder(ctx, borderColor, template, useChromeEffect = false, lightPos = null) {
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
export function renderCardBack(ctx, state) {
  const template = state.template || idCardTemplate;
  const {
    palette, shapes, textFields, borderColor, roleColor,
    useChromeEffect, lightPos, socialPlatform, socialHandle
  } = state;

  // 1. Background
  renderBackground(ctx, palette, template);

  // Clip to card
  ctx.save();
  roundRectPath(ctx, 0, 0, template.canvas.widthPx, template.canvas.heightPx, template.cornerRadiusPx);
  ctx.clip();

  // 2. Texture
  renderTexture(ctx, palette, template);

  // 3. Decorative shapes (same theme as front!)
  renderBgShapes(ctx, shapes, palette, template, useChromeEffect, lightPos);

  // 4. Header strip ("HACKER [गोवा] HOUSE")
  renderHeader(ctx, palette, textFields || {}, null, template);

  // 5. Social Media QR Scanner Box (Center)
  const boxW = 520;
  const boxH = 580;
  const boxX = (template.canvas.widthPx - boxW) / 2;
  const boxY = 320;

  ctx.save();
  ctx.shadowColor = 'rgba(34, 197, 94, 0.85)'; // Vibrant green shadow
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 6;

  // Scanner container card (Clean high-contrast white/glass surface for scanner readability)
  roundRectPath(ctx, boxX, boxY, boxW, boxH, 24);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
  ctx.fill();

  ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();

  // Platform info & colors
  const platform = socialPlatform || 'instagram';
  const handleRaw = (socialHandle || 'hacker_house_goa').trim();
  const handleClean = handleRaw.replace(/^@/, '');

  let platformName = 'INSTAGRAM';
  let badgeBg = '#E1306C';
  let qrUrl = `https://instagram.com/${handleClean}`;
  let platformIcon = '📸';

  if (platform === 'x') {
    platformName = '𝕏 / TWITTER';
    badgeBg = '#000000';
    qrUrl = `https://x.com/${handleClean}`;
    platformIcon = '𝕏';
  } else if (platform === 'discord') {
    platformName = 'DISCORD';
    badgeBg = '#5865F2';
    qrUrl = handleClean.includes('http') ? handleClean : `https://discord.gg/${handleClean}`;
    platformIcon = '💬';
  } else if (platform === 'custom') {
    platformName = 'CONNECT LINK';
    badgeBg = '#042F2E';
    qrUrl = handleClean.includes('http') ? handleClean : `https://${handleClean}`;
    platformIcon = '🔗';
  }

  // Top Badge inside Scanner Box
  const badgeW = 280;
  const badgeH = 48;
  const badgeX = boxX + (boxW - badgeW) / 2;
  const badgeY = boxY + 30;

  ctx.save();
  roundRectPath(ctx, badgeX, badgeY, badgeW, badgeH, 24);
  ctx.fillStyle = badgeBg;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
  ctx.shadowBlur = 10;
  ctx.fill();

  ctx.font = '800 17px Inter, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${platformIcon}   ${platformName}`, badgeX + badgeW / 2, badgeY + badgeH / 2 + 1);
  ctx.restore();

  // QR Code Rendering
  const qrSize = 310;
  const qrX = boxX + (boxW - qrSize) / 2;
  const qrY = boxY + 98;

  ctx.save();
  drawQRCode(ctx, qrUrl, qrX, qrY, qrSize, { darkColor: '#0F172A', lightColor: '#FFFFFF' });
  ctx.restore();

  // Handle Label at Bottom of Scanner Box
  ctx.save();
  ctx.font = '800 22px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#0F172A';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const displayHandle = platform === 'custom' ? (handleClean.length > 24 ? handleClean.slice(0, 24) + '…' : handleClean) : `@${handleClean}`;
  ctx.fillText(displayHandle, boxX + boxW / 2, boxY + boxH - 50);

  ctx.font = '600 13px Inter, monospace';
  ctx.fillStyle = '#64748B';
  ctx.fillText(`SCAN TO CONNECT ON ${platformName.split('/')[0].trim()}`, boxX + boxW / 2, boxY + boxH - 24);
  ctx.restore();

  ctx.restore(); // end clip

  // 6. Border
  renderBorder(ctx, borderColor, template, useChromeEffect, lightPos);
}

/* ── Main Render Pipeline ───────────────────────────────────── */

/**
 * Renders the complete ID card (Front or Back).
 */
export function renderCard(ctx, state) {
  if (state.cardSide === 'back') {
    renderCardBack(ctx, state);
    return;
  }

  const template = state.template || idCardTemplate;
  const {
    palette, shapes, portraitImage,
    textFields, borderColor, roleColor, useChromeEffect, lightPos
  } = state;

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

  // 4. Portrait (with Chrome box frame if enabled)
  renderPortrait(ctx, portraitImage, template, useChromeEffect, lightPos);

  // 5. Overlay shapes — wiggly lines ABOVE portrait
  renderOverlayShapes(ctx, shapes, template, useChromeEffect, lightPos);

  // 6. Header strip
  renderHeader(ctx, palette, textFields || {}, null, template);

  // 7. Footer strip
  renderFooter(ctx, palette, textFields || {}, roleColor, template);

  ctx.restore();

  // 8. Border (outside the clip)
  renderBorder(ctx, borderColor, template, useChromeEffect, lightPos);
}
