import { idCardTemplate } from "./template";
import { renderCard } from "./renderer";
import type { IdMakerState } from "./renderer";

/**
 * Triggers a file download from a data URL.
 */
function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export the card as a JPEG at a given scale factor.
 */
export function exportJPG(state: IdMakerState, scale = 1, quality = 0.95, filename?: string) {
  const template = state.template || idCardTemplate;
  const w = template.canvas.widthPx * scale;
  const h = template.canvas.heightPx * scale;

  const offscreen = document.createElement('canvas');
  offscreen.width = w;
  offscreen.height = h;
  const ctx = offscreen.getContext('2d');
  if (!ctx) return;

  // JPG white background base
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);

  ctx.scale(scale, scale);
  renderCard(ctx, state);

  const dataUrl = offscreen.toDataURL('image/jpeg', quality);
  const side = state.cardSide || 'front';
  const name = filename || `id-card-${side}-${scale}x.jpg`;
  downloadDataUrl(dataUrl, name);
}

/**
 * Export BOTH Front and Back of the ID Card in a single PDF / Print view in one go!
 */
export function exportPDF(state: IdMakerState) {
  const template = state.template || idCardTemplate;
  const scale = 2;
  const w = template.canvas.widthPx * scale;
  const h = template.canvas.heightPx * scale;

  // 1. Render Front Side
  const offscreenFront = document.createElement('canvas');
  offscreenFront.width = w;
  offscreenFront.height = h;
  const ctxFront = offscreenFront.getContext('2d');
  if (!ctxFront) return;
  ctxFront.fillStyle = '#FFFFFF';
  ctxFront.fillRect(0, 0, w, h);
  ctxFront.scale(scale, scale);
  renderCard(ctxFront, { ...state, cardSide: 'front' });
  const frontDataUrl = offscreenFront.toDataURL('image/jpeg', 0.95);

  // 2. Render Back Side
  const offscreenBack = document.createElement('canvas');
  offscreenBack.width = w;
  offscreenBack.height = h;
  const ctxBack = offscreenBack.getContext('2d');
  if (!ctxBack) return;
  ctxBack.fillStyle = '#FFFFFF';
  ctxBack.fillRect(0, 0, w, h);
  ctxBack.scale(scale, scale);
  renderCard(ctxBack, { ...state, cardSide: 'back' });
  const backDataUrl = offscreenBack.toDataURL('image/jpeg', 0.95);

  // Open single PDF print view with both Front and Back
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>ID Card — Front & Back Print PDF</title>
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          body {
            font-family: Inter, system-ui, sans-serif;
            margin: 0;
            padding: 24px;
            background: #0f172a;
            color: #ffffff;
            display: flex;
            flex-direction: column;
            align-items: center;
            min-height: 100vh;
          }
          h2 { margin-bottom: 24px; text-transform: uppercase; letter-spacing: 1px; color: #38bdf8; }
          .card-container {
            display: flex;
            flex-wrap: wrap;
            gap: 36px;
            justify-content: center;
            align-items: center;
          }
          .card-box {
            text-align: center;
          }
          .card-box p {
            margin-top: 12px;
            font-weight: 700;
            letter-spacing: 1px;
            color: #94a3b8;
          }
          img {
            width: 85.6mm;
            height: 114.1mm;
            border-radius: 4mm;
            box-shadow: 0 12px 30px rgba(0,0,0,0.6);
            background: #fff;
          }
          @media print {
            body { background: white; color: black; padding: 0; }
            h2 { display: none; }
            .card-box p { color: #333; }
            img { box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <h2>Hacker House Goa — ID Card (Front & Back)</h2>
        <div class="card-container">
          <div class="card-box">
            <img src="${frontDataUrl}" alt="ID Card Front" />
            <p>FRONT SIDE</p>
          </div>
          <div class="card-box">
            <img src="${backDataUrl}" alt="ID Card Back" />
            <p>BACK SIDE</p>
          </div>
        </div>
        <script>setTimeout(() => window.print(), 600);</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }
}
