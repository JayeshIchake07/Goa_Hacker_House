import React, { useEffect, useRef, useState } from "react";
import type { BuilderInfo, CropState, FormatMode } from "../types";
import { drawGraphicToCanvas } from "../utils/canvasComposer";
import { useTheme } from "../context/ThemeContext";
import { DEFAULT_EVENT_CONFIG } from "../types";
import { Download, Copy, Share2, Check } from "lucide-react";
import confetti from "canvas-confetti";

interface PreviewPanelProps {
  imageSrc: string | null;
  mode: FormatMode;
  crop: CropState;
  onCropChange: (c: CropState) => void;
  builderInfo: BuilderInfo;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  imageSrc, mode, crop, onCropChange, builderInfo,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loadedImg, setLoadedImg] = useState<HTMLImageElement | null>(null);
  const [copied, setCopied]       = useState(false);
  const [toast, setToast]         = useState<string | null>(null);
  const [isPunch, setIsPunch]     = useState(false);
  const { theme } = useTheme();

  // drag-to-pan state
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const cropStart = useRef<{ x: number; y: number } | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  // Load image
  useEffect(() => {
    if (!imageSrc) { setLoadedImg(null); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setLoadedImg(img);
    img.src = imageSrc;
  }, [imageSrc]);

  // Redraw on any change
  useEffect(() => {
    if (canvasRef.current) {
      drawGraphicToCanvas(canvasRef.current, loadedImg, mode, crop, builderInfo, theme);
    }
  }, [loadedImg, mode, crop, builderInfo, theme]);

  // Drag-to-pan handlers
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!imageSrc) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY };
    cropStart.current = { x: crop.x, y: crop.y };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragStart.current || !cropStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    const el = canvasRef.current;
    if (!el) return;
    const mult = el.width / el.getBoundingClientRect().width;
    onCropChange({ ...crop, x: cropStart.current.x + dx * mult, y: cropStart.current.y + dy * mult });
  };
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    dragStart.current = null;
    cropStart.current = null;
  };

  // Actions
  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsPunch(true);
    setTimeout(() => setIsPunch(false), 300);
    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a   = document.createElement("a");
      a.href     = url;
      a.download = `hh-goa-2026-${mode}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      confetti({ particleCount: 55, spread: 70, origin: { y: 0.75 }, colors: ["#FFE600","#FF9E2C","#ffffff"] });
      showToast("DOWNLOADED HIGH-RES PNG BADGE! 🎉");
    }, "image/png");
  };

  const shareX = () => {
    const cfg = DEFAULT_EVENT_CONFIG;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(cfg.xShareText)}`,
      "_blank", "width=600,height=400"
    );
  };

  const copyImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async blob => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setCopied(true);
        showToast("IMAGE COPIED! Paste directly into X.");
        setTimeout(() => setCopied(false), 2500);
      } catch {
        showToast("Clipboard not supported — use Download instead.");
      }
    }, "image/png");
  };

  const nativeShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async blob => {
      if (!blob) return;
      const file = new File([blob], `hh-goa-2026-${mode}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: "HH Goa 2026 Builder Pass", text: DEFAULT_EVENT_CONFIG.xShareText, files: [file] });
      } else {
        shareX();
      }
    }, "image/png");
  };

  const isProfile = mode === "profile";

  return (
    <div className="preview-panel">
      {/* Canvas frame card container */}
      <div className={`preview-frame ${isPunch ? "preview-frame--punch" : ""} ${isProfile ? "preview-frame--profile" : "preview-frame--builder"}`}>
        {/* Cyber terminal corner brackets */}
        <span className="pf-bracket pf-bracket--tl" />
        <span className="pf-bracket pf-bracket--tr" />
        <span className="pf-bracket pf-bracket--bl" />
        <span className="pf-bracket pf-bracket--br" />

        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="preview-canvas"
          style={{
            cursor: imageSrc ? "move" : "default",
            touchAction: "none",
          }}
        />
      </div>

      {/* Drag hint */}
      {imageSrc && (
        <p className="preview-hint">Drag on canvas to reposition photo</p>
      )}

      {/* Side-by-side Action Buttons */}
      <div className="preview-actions">
        <button className="pa-btn pa-btn--primary" onClick={download} type="button">
          <Download size={16} /> Download PNG
        </button>
        <button className="pa-btn pa-btn--outline" onClick={shareX} type="button">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Share on X
        </button>
      </div>

      {/* Secondary Quick Utilities */}
      <div className="preview-secondary-actions">
        <button className="pa-btn-sub" onClick={copyImage} type="button">
          {copied ? <Check size={13} style={{ color: "#10b981" }} /> : <Copy size={13} />}
          {copied ? "Copied to Clipboard!" : "Copy Image"}
        </button>
        {typeof navigator !== "undefined" && !!navigator.share && (
          <button className="pa-btn-sub" onClick={nativeShare} type="button">
            <Share2 size={13} /> Mobile Share
          </button>
        )}
      </div>

      {toast && <div className="toast-msg">{toast}</div>}
    </div>
  );
};
