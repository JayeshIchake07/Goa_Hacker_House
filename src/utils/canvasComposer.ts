import type { BuilderInfo, CropState, FormatMode } from "../types";

export function drawGraphicToCanvas(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement | null,
  mode: FormatMode,
  crop: CropState,
  builderInfo: BuilderInfo,
  theme: "dark" | "light" = "dark"
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  if (mode === "profile") {
    renderProfileFrame(canvas, ctx, img, crop, theme);
  } else {
    renderBuilderCard(canvas, ctx, img, crop, builderInfo, theme);
  }
}

function renderProfileFrame(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  crop: CropState,
  theme: "dark" | "light"
) {
  const W = 1200;
  const H = 1200;
  canvas.width = W;
  canvas.height = H;

  const isLight = theme === "light";

  // Background fill
  ctx.fillStyle = isLight ? "#E2D5C3" : "#0c0c0e";
  ctx.fillRect(0, 0, W, H);

  // Tropical Ambient Radial Glow
  const grad = ctx.createRadialGradient(W / 2, H / 2 - 20, 100, W / 2, H / 2 - 20, 600);
  if (isLight) {
    grad.addColorStop(0, "rgba(224, 122, 95, 0.08)");
    grad.addColorStop(0.7, "rgba(255, 192, 0, 0.02)");
    grad.addColorStop(1, "rgba(226, 213, 195, 0)");
  } else {
    grad.addColorStop(0, "rgba(255, 158, 44, 0.12)");
    grad.addColorStop(0.7, "rgba(255, 94, 26, 0.04)");
    grad.addColorStop(1, "rgba(12, 12, 14, 0)");
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const centerX = W / 2;
  const centerY = H / 2 - 20;
  const radius = 420;

  // Concentric Radar Rings Overlay
  ctx.strokeStyle = isLight ? "rgba(15, 23, 42, 0.04)" : "rgba(255, 158, 44, 0.06)";
  ctx.lineWidth = 2;
  [150, 300, 480, 580].forEach((r) => {
    ctx.beginPath();
    ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
    ctx.stroke();
  });

  // User Photo inside Circular Aperture
  if (img) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = isLight ? "#e2e8f0" : "#16161a";
    ctx.fill();

    drawCroppedImage(ctx, img, centerX, centerY, radius * 2, radius * 2, crop);
    ctx.restore();
  } else {
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = isLight ? "#f1f5f9" : "#16161e";
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = isLight ? "#94A3B8" : "#8E8E9E";
    ctx.font = "600 34px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Upload Photo Below", centerX, centerY);
  }

  // Outer Ring Overlay
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + 10, 0, Math.PI * 2);
  const ringGrad = ctx.createLinearGradient(centerX - radius, centerY - radius, centerX + radius, centerY + radius);
  
  if (isLight) {
    ringGrad.addColorStop(0, "#E6A800"); // Light Gold
    ringGrad.addColorStop(1, "#00ACC1"); // Light Teal
  } else {
    ringGrad.addColorStop(0, "#FFB800"); // Cyber Gold
    ringGrad.addColorStop(1, "#00F0FF"); // Cyber Cyan
  }
  ctx.strokeStyle = ringGrad;
  ctx.lineWidth = 14;
  ctx.stroke();

  // Ambient Outer Ring Glow
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + 26, 0, Math.PI * 2);
  ctx.strokeStyle = isLight ? "rgba(0, 172, 193, 0.15)" : "rgba(0, 240, 255, 0.3)";
  ctx.lineWidth = 4;
  ctx.stroke();

  // Tropical Palm Silhouettes
  drawPalmSilhouette(ctx, centerX - radius + 15, centerY + 180, 0.9, false, isLight);
  drawPalmSilhouette(ctx, centerX + radius - 15, centerY + 180, 0.9, true, isLight);

  // Terminal Brackets (Corner Accents)
  const bOff = 65;
  const bLen = 60;
  ctx.strokeStyle = isLight ? "#00ACC1" : "#FFB800";
  ctx.lineWidth = 5;

  // Top-Left
  ctx.beginPath();
  ctx.moveTo(bOff, bOff + bLen);
  ctx.lineTo(bOff, bOff);
  ctx.lineTo(bOff + bLen, bOff);
  ctx.stroke();

  // Top-Right
  ctx.beginPath();
  ctx.moveTo(W - bOff - bLen, bOff);
  ctx.lineTo(W - bOff, bOff);
  ctx.lineTo(W - bOff, bOff + bLen);
  ctx.stroke();

  // Bottom-Left
  ctx.beginPath();
  ctx.moveTo(bOff, H - bOff - bLen);
  ctx.lineTo(bOff, H - bOff);
  ctx.lineTo(bOff + bLen, H - bOff);
  ctx.stroke();

  // Bottom-Right
  ctx.beginPath();
  ctx.moveTo(W - bOff - bLen, H - bOff);
  ctx.lineTo(W - bOff, H - bOff);
  ctx.lineTo(W - bOff, H - bOff - bLen);
  ctx.stroke();
  ctx.restore();

  // Brand Header
  ctx.save();
  ctx.fillStyle = isLight ? "#0F172A" : "#ffffff";
  ctx.font = "800 48px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("HH GOA 2026", centerX, 92);

  ctx.fillStyle = isLight ? "#00ACC1" : "#FFB800";
  ctx.font = "700 20px 'JetBrains Mono', monospace";
  ctx.fillText("GOA, INDIA · 28–31 OCT 2026", centerX, 128);
  ctx.restore();

  // Bottom Pill Badge Overlay
  ctx.save();
  const pillW = 560;
  const pillH = 76;
  const pillX = centerX - pillW / 2;
  const pillY = centerY + radius - 38;

  ctx.beginPath();
  drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 38);
  ctx.fillStyle = isLight ? "#FFFFFF" : "#0c0c0e";
  ctx.fill();
  ctx.strokeStyle = isLight ? "#00ACC1" : "#00F0FF";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = isLight ? "#0F172A" : "#ffffff";
  ctx.font = "800 26px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText("BUILDER ID · TASK #01", centerX, pillY + 46);
  ctx.restore();

  // Footer Credit Stamps
  ctx.save();
  ctx.fillStyle = isLight ? "#94A3B8" : "#58586A";
  ctx.font = "500 20px 'JetBrains Mono', monospace";
  ctx.textAlign = "left";
  ctx.fillText("2:47pm Studio", bOff + 10, H - 45);

  ctx.fillStyle = isLight ? "#00ACC1" : "#00F0FF";
  ctx.font = "600 20px 'JetBrains Mono', monospace";
  ctx.textAlign = "right";
  ctx.fillText("#FrameInGoa", W - bOff - 10, H - 45);
  ctx.restore();
}

function renderBuilderCard(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  crop: CropState,
  info: BuilderInfo,
  theme: "dark" | "light"
) {
  const W = 1200;
  const H = 1500;
  canvas.width = W;
  canvas.height = H;

  const pad = 40;
  const cardW = W - pad * 2;
  const cardH = H - pad * 2;

  const isLight = theme === "light";

  // Canvas background outside card
  ctx.fillStyle = isLight ? "#E2D5C3" : "#08080a";
  ctx.fillRect(0, 0, W, H);

  // Main Card Container
  ctx.save();
  ctx.beginPath();
  drawRoundedRect(ctx, pad, pad, cardW, cardH, 24);
  ctx.fillStyle = isLight ? "#F4EDE2" : "#121216";
  ctx.fill();
  ctx.strokeStyle = isLight ? "#D8CABA" : "#262632";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Top Accent Bar
  ctx.beginPath();
  drawRoundedRectTop(ctx, pad, pad, cardW, 18, 24);
  const barGrad = ctx.createLinearGradient(pad, pad, pad + cardW, pad);
  if (isLight) {
    barGrad.addColorStop(0, "#E6A800");
    barGrad.addColorStop(1, "#00ACC1");
  } else {
    barGrad.addColorStop(0, "#FFB800");
    barGrad.addColorStop(1, "#00F0FF");
  }
  ctx.fillStyle = barGrad;
  ctx.fill();

  // Card Header Information
  ctx.fillStyle = isLight ? "#0F172A" : "#ffffff";
  ctx.font = "900 46px 'Inter', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("HH GOA 2026", pad + 50, pad + 85);

  ctx.fillStyle = isLight ? "#00ACC1" : "#00F0FF";
  ctx.font = "700 20px 'JetBrains Mono', monospace";
  ctx.fillText("BUILDER PASS · TASK #01", pad + 50, pad + 118);

  ctx.fillStyle = isLight ? "#94A3B8" : "#9090A2";
  ctx.font = "500 20px 'JetBrains Mono', monospace";
  ctx.textAlign = "right";
  ctx.fillText("28–31 OCT 2026", W - pad - 50, pad + 85);
  ctx.fillText("GOA, INDIA", W - pad - 50, pad + 118);

  // Header Line Divider
  ctx.strokeStyle = isLight ? "#E2E8F0" : "#262632";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad + 50, pad + 145);
  ctx.lineTo(W - pad - 50, pad + 145);
  ctx.stroke();

  // Photo Container Area
  const photoW = cardW - 100;
  const photoH = 680;
  const photoX = pad + 50;
  const photoY = pad + 185;

  ctx.save();
  ctx.beginPath();
  drawRoundedRect(ctx, photoX, photoY, photoW, photoH, 16);
  ctx.clip();

  ctx.fillStyle = isLight ? "#F8FAFC" : "#181820";
  ctx.fill();

  if (img) {
    drawCroppedImage(ctx, img, photoX + photoW / 2, photoY + photoH / 2, photoW, photoH, crop);
  } else {
    ctx.fillStyle = isLight ? "#94A3B8" : "#58586A";
    ctx.font = "600 32px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Upload Photo Below", photoX + photoW / 2, photoY + photoH / 2);
  }
  ctx.restore();

  // Photo Outer Frame Border
  ctx.save();
  ctx.beginPath();
  drawRoundedRect(ctx, photoX, photoY, photoW, photoH, 16);
  ctx.strokeStyle = isLight ? "rgba(0, 172, 193, 0.4)" : "rgba(0, 240, 255, 0.5)";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();

  // Tropical Palm Accents in card background
  drawPalmSilhouette(ctx, photoX + 40, photoY + photoH - 20, 0.7, false, isLight);

  // Pass Details Below Photo
  const textX = pad + 50;
  let currentY = photoY + photoH + 75;

  // Name
  const nameText = (info.name.trim() || "SATOSHI NAKAMOTO").toUpperCase();
  ctx.fillStyle = isLight ? "#0F172A" : "#ffffff";
  ctx.font = "900 56px 'Inter', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(nameText, textX, currentY);

  // Handle
  const handleText = info.handle ? (info.handle.startsWith("@") ? info.handle : `@${info.handle}`) : "@builder";
  currentY += 44;
  ctx.fillStyle = isLight ? "#2563EB" : "#00F0FF";
  ctx.font = "600 28px 'JetBrains Mono', monospace";
  ctx.fillText(handleText, textX, currentY);

  currentY += 50;

  // Role Tag Pill & Builder Class Row
  const roleText = (info.role || "BUILDER").toUpperCase();
  ctx.font = "800 22px 'JetBrains Mono', monospace";
  const roleMetrics = ctx.measureText(roleText);
  const pillPadding = 20;
  const pillWidth = roleMetrics.width + pillPadding * 2;
  const pillHeight = 42;

  // Role Pill Background
  ctx.save();
  ctx.beginPath();
  drawRoundedRect(ctx, textX, currentY - 30, pillWidth, pillHeight, 6);
  ctx.fillStyle = isLight ? "#00ACC1" : "#00F0FF";
  ctx.fill();

  ctx.fillStyle = isLight ? "#FFFFFF" : "#000000";
  ctx.textAlign = "left";
  ctx.fillText(roleText, textX + pillPadding, currentY);
  ctx.restore();

  // Builder Class Title Text
  const titleText = (info.title || "TERMINAL WIZARD").toUpperCase();
  ctx.fillStyle = isLight ? "#E6A800" : "#FFB800";
  ctx.font = "700 28px 'JetBrains Mono', monospace";
  ctx.textAlign = "left";
  ctx.fillText(titleText, textX + pillWidth + 24, currentY);

  // Tech Stack
  if (info.techStack) {
    currentY += 52;
    ctx.fillStyle = isLight ? "#64748B" : "#8090A0";
    ctx.font = "500 24px 'JetBrains Mono', monospace";
    ctx.fillText(`⚡ ${info.techStack}`, textX, currentY);
  }

  // Footer Divider Line
  const footerY = H - pad - 55;
  ctx.strokeStyle = isLight ? "#E2E8F0" : "#262632";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(textX, footerY - 35);
  ctx.lineTo(W - pad - 50, footerY - 35);
  ctx.stroke();

  // Footer Meta & Credits
  ctx.fillStyle = isLight ? "#94A3B8" : "#58586A";
  ctx.font = "500 22px 'JetBrains Mono', monospace";
  ctx.textAlign = "left";
  ctx.fillText("2:47pm Studio · #FrameInGoa", textX, footerY);

  ctx.fillStyle = isLight ? "#E6A800" : "#FFB800";
  ctx.font = "700 22px 'JetBrains Mono', monospace";
  ctx.textAlign = "right";
  ctx.fillText("PASS #HHG26-8941", W - pad - 50, footerY);

  ctx.restore();
}

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

function drawPalmSilhouette(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  flip: boolean,
  isLight: boolean
) {
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-scale, scale);
  else ctx.scale(scale, scale);

  ctx.fillStyle = isLight ? "rgba(0, 172, 193, 0.12)" : "rgba(255, 158, 44, 0.22)";
  ctx.beginPath();
  // Trunk
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-15, -60, -30, -120);
  ctx.quadraticCurveTo(-22, -60, 0, 0);
  ctx.fill();

  // Fronds
  ctx.beginPath();
  ctx.moveTo(-30, -120);
  ctx.quadraticCurveTo(-70, -150, -110, -130);
  ctx.quadraticCurveTo(-70, -135, -30, -120);

  ctx.moveTo(-30, -120);
  ctx.quadraticCurveTo(-50, -180, -75, -200);
  ctx.quadraticCurveTo(-45, -160, -30, -120);

  ctx.moveTo(-30, -120);
  ctx.quadraticCurveTo(0, -190, 25, -205);
  ctx.quadraticCurveTo(-5, -165, -30, -120);

  ctx.moveTo(-30, -120);
  ctx.quadraticCurveTo(30, -160, 65, -145);
  ctx.quadraticCurveTo(15, -140, -30, -120);
  ctx.fill();

  ctx.restore();
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawRoundedRectTop(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
