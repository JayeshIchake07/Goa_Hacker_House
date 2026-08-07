import React, { useEffect, useRef, useState, useMemo } from "react";
import type { BuilderInfo, CropState, FormatMode, PaletteColors } from "../types";
import { renderCard } from "../utils/renderer";
import { idCardTemplate, getPortraitRect, getSoftExclusionZone } from "../utils/template";
import { generateShapes } from "../utils/moods";
import { Download, Copy, Share2, Check, RefreshCw } from "lucide-react";
import confetti from "canvas-confetti";

interface PreviewPanelProps {
  imageSrc: string | null;
  mode: FormatMode; // front | back
  onModeChange: (m: FormatMode) => void;
  crop: CropState;
  onCropChange: (c: CropState) => void;
  builderInfo: BuilderInfo;

  eventName: string;
  teamName: string;
  roleMode: "single" | "skills";
  skillsList: string[];
  socialPlatform: string;
  socialHandle: string;

  mood: string;
  palette: PaletteColors;
  borderColor: string;
  roleColor: string;
  useChromeEffect: boolean;
  shapeSeed: number;
  lightPos: { x: number; y: number };
  onLightPosChange: (pos: { x: number; y: number }) => void;

  onExportJpg: (scale: number) => void;
  onExportPdf: () => void;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  imageSrc,
  mode,
  onModeChange,
  crop,
  onCropChange,
  builderInfo,

  eventName,
  teamName,
  roleMode,
  skillsList,
  socialPlatform,
  socialHandle,

  mood,
  palette,
  borderColor,
  roleColor,
  useChromeEffect,
  shapeSeed,
  lightPos,
  onLightPosChange,

  onExportJpg,
  onExportPdf,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loadedImg, setLoadedImg] = useState<HTMLImageElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isPunch, setIsPunch] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  // drag-to-pan state
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const cropStart = useRef<{ x: number; y: number } | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  // Load image
  useEffect(() => {
    if (!imageSrc) {
      setLoadedImg(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setLoadedImg(img);
    img.src = imageSrc;
  }, [imageSrc]);

  // Compute shapes and textFields
  const shapes = useMemo(() => {
    const exclusion = getSoftExclusionZone(idCardTemplate);
    const { widthPx: cw, heightPx: ch } = idCardTemplate.canvas;
    return generateShapes(mood, palette, exclusion, cw, ch, shapeSeed);
  }, [mood, palette, shapeSeed]);

  const textFields = useMemo(() => {
    let finalRole = builderInfo.role;
    if (roleMode === 'skills') {
      const validSkills = skillsList.map(s => s.trim()).filter(Boolean);
      finalRole = validSkills.join(' | ');
    }
    return {
      eventName,
      teamName,
      memberName: builderInfo.name,
      role: finalRole
    };
  }, [eventName, teamName, builderInfo.name, builderInfo.role, roleMode, skillsList]);

  // Combined state object for the renderer
  const rendererState = useMemo(() => {
    return {
      palette,
      mood,
      portraitImage: loadedImg,
      crop,
      cardSide: mode,
      roleMode,
      skillsList,
      socialPlatform,
      socialHandle,
      textFields,
      borderColor,
      roleColor,
      useChromeEffect,
      lightPos,
      shapeSeed,
      shapes,
      template: idCardTemplate
    };
  }, [
    palette, mood, loadedImg, crop, mode, roleMode, skillsList,
    socialPlatform, socialHandle, textFields,
    borderColor, roleColor, useChromeEffect, lightPos,
    shapeSeed, shapes
  ]);

  // Redraw on any state change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = idCardTemplate.canvas.widthPx;
    canvas.height = idCardTemplate.canvas.heightPx;

    renderCard(ctx, rendererState);
  }, [rendererState]);

  // Interactive mouse handlers for 3D tilt & Chrome light position
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    onLightPosChange({
      x: Math.max(0, Math.min(1, x / rect.width)),
      y: Math.max(0, Math.min(1, y / rect.height))
    });

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const offsetX = x - centerX;
    const offsetY = y - centerY;

    const maxTilt = 12; // Tilted in 3D up to 12 degrees
    const ry = (offsetX / centerX) * maxTilt;
    const rx = -(offsetY / centerY) * maxTilt;
    setTilt({ rx, ry });
  };

  const handleMouseLeave = () => {
    setTilt({ rx: 0, ry: 0 });
    onLightPosChange({ x: 0.5, y: 0.3 });
  };

  // Flip card handler
  const handleFlipCard = () => {
    setIsFlipping(true);
    onModeChange(mode === "front" ? "back" : "front");
    setTimeout(() => setIsFlipping(false), 500);
  };

  // Drag-to-pan handlers
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!imageSrc || mode === "back") return;

    // Check if clicked inside portrait bounds
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = idCardTemplate.canvas.widthPx / rect.width;
    const scaleY = idCardTemplate.canvas.heightPx / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;

    const pr = getPortraitRect(idCardTemplate);
    const clickedPortrait = cx >= pr.x && cx <= pr.x + pr.width && cy >= pr.y && cy <= pr.y + pr.height;

    if (!clickedPortrait) return;

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
    setIsPunch(true);
    setTimeout(() => setIsPunch(false), 300);
    onExportJpg(2); // Export high res 2x JPEG
    confetti({ particleCount: 55, spread: 70, origin: { y: 0.75 }, colors: ["#FFE600", "#FF9E2C", "#ffffff"] });
    showToast("DOWNLOADED HIGH-RES BADGE! 🎉");
  };

  const shareX = () => {
    const text = `Just generated my official HH Goa 2026 Builder ID! 🌴⚡ Less Noise. More Signal. #FrameInGoa`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
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
      const text = `Just generated my official HH Goa 2026 Builder ID! 🌴⚡ Less Noise. More Signal. #FrameInGoa`;
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: "HH Goa 2026 Builder Pass", text, files: [file] });
      } else {
        shareX();
      }
    }, "image/png");
  };

  return (
    <div className="preview-panel">
      {/* Flip card toolbar */}
      <div className="preview-toolbar">
        <button className="btn-flip" onClick={handleFlipCard} type="button">
          <span className="flip-icon">↺</span> Flip Card (<span id="flipSideText">{mode.toUpperCase()}</span>)
        </button>
      </div>

      {/* Canvas frame card container */}
      <div
        className={`preview-frame ${isPunch ? "preview-frame--punch" : ""} preview-frame--builder`}
        style={{
          transform: `perspective(1000px) rotateX(${tilt.rx.toFixed(2)}deg) rotateY(${tilt.ry.toFixed(2)}deg) scale3d(1.01, 1.01, 1.01)`,
          transformStyle: "preserve-3d",
          transition: isFlipping ? "transform 0.5s ease" : "transform 0.08s ease-out",
          cursor: imageSrc && mode === "front" ? "move" : "default"
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Card Flip Transition Animation class wrapper */}
        <div className={`canvas-wrapper ${isFlipping ? "flipping" : ""}`} style={{ width: "100%", height: "100%" }}>
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
              touchAction: "none",
              width: "100%",
              height: "100%"
            }}
          />
        </div>
      </div>

      {/* Drag hint */}
      {imageSrc && mode === "front" && (
        <p className="preview-hint">Drag on portrait area to reposition photo</p>
      )}

      {/* Side-by-side Action Buttons */}
      <div className="preview-actions">
        <button className="pa-btn pa-btn--primary" onClick={download} type="button">
          <Download size={16} /> Download JPEG
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

      <div style={{ marginTop: "1rem" }}>
        <button className="btn-pdf-full" type="button" onClick={onExportPdf}>
          <RefreshCw size={14} /> Export Front & Back PDF
        </button>
      </div>

      {toast && <div className="toast-msg">{toast}</div>}
    </div>
  );
};
export default PreviewPanel;
