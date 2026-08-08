import React, { useEffect, useRef, useState, useMemo } from "react";
import type { BuilderInfo, CropState, FormatMode, PaletteColors, Charm } from "../types";
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

  charms: Charm[];
  onCharmsChange: (charms: Charm[]) => void;

  onBuilderInfoChange: (b: BuilderInfo) => void;
  onTeamNameChange: (s: string) => void;
  onSkillsListChange: (list: string[]) => void;

  photoFrame: "rectangle" | "circle";

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

  charms,
  onCharmsChange,

  onBuilderInfoChange,
  onTeamNameChange,
  onSkillsListChange,

  photoFrame,

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

  // drag-to-move charms state
  const draggedCharmIndex = useRef<number | null>(null);
  const lastValidPos = useRef<{ xPct: number; yPct: number } | null>(null);

  // inline editing states
  interface EditingField {
    name: "memberName" | "teamName" | "role" | "skills";
    value: string;
    y: number;
    fontSize: number;
    left: string;
    width: string;
    textAlign: "left" | "center" | "right";
  }
  const [editingField, setEditingField] = useState<EditingField | null>(null);

  // Click timing refs for rotation click detection
  const pointerDownTime = useRef<number>(0);
  const pointerDownPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

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

  // Pre-load studio logo image
  const [studioLogoImg, setStudioLogoImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setStudioLogoImg(img);
    img.src = "/studio-logo.png";
  }, []);

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
      template: idCardTemplate,
      charms,
      photoFrame,
      studioLogoImage: studioLogoImg
    };
  }, [
    palette, mood, loadedImg, crop, mode, roleMode, skillsList,
    socialPlatform, socialHandle, textFields,
    borderColor, roleColor, useChromeEffect, lightPos,
    shapeSeed, shapes, charms, photoFrame, studioLogoImg
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

  // Charm exclusion validation rule
  const isValidCharmPosition = (x: number, y: number) => {
    // 1. Header: yPct < 19 (Header rect heightPct is 18.75)
    if (y < 19) return false;
    // 2. Footer: yPct > 79 (Footer rect yPct is 79.17)
    if (y > 79) return false;
    // 3. Portrait photo area: exclusion snap
    if (photoFrame === "circle") {
      const dx = x - 50;
      const dy = (y - 48.96) * 1.33; // aspect ratio scaling
      const dist = Math.hypot(dx, dy);
      if (dist < 31) return false; // within circular frame boundary
    } else {
      if (x >= 25 && x <= 75 && y >= 28 && y <= 70) {
        return false;
      }
    }
    return true;
  };

  // Drag-to-pan / Drag-to-move charms pointer handlers
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // 0. Close active editor first
    setEditingField(null);

    // Record pointer down timing and position for click-to-rotate detection
    pointerDownTime.current = Date.now();
    pointerDownPos.current = { x: e.clientX, y: e.clientY };

    if (mode === "back") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    // Client click coordinates relative to canvas bounding box
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Convert client coordinates to percentage width and height of canvas preview (0 to 100)
    const clickXPct = (clientX / rect.width) * 100;
    const clickYPct = (clientY / rect.height) * 100;

    // 1. Text editing hit test in the footer area (X: 10% to 90%, Y: 79% to 99%)
    if (mode === "front" && clickXPct >= 10 && clickXPct <= 90 && clickYPct >= 79 && clickYPct <= 99) {
      if (clickYPct >= 79 && clickYPct <= 85.5) {
        setEditingField({
          name: "teamName",
          value: teamName,
          y: 84.8, // centered on absolute Y 1018
          fontSize: 14,
          left: "17%",
          width: "40%",
          textAlign: "left"
        });
        return;
      } else if (clickYPct > 85.5 && clickYPct <= 92.5) {
        setEditingField({
          name: "memberName",
          value: builderInfo.name,
          y: 89.0, // inside name box (absolute Y 1068)
          fontSize: 18,
          left: "17%",
          width: "66%",
          textAlign: "center"
        });
        return;
      } else if (clickYPct > 92.5 && clickYPct <= 99) {
        if (roleMode === "skills") {
          setEditingField({
            name: "skills",
            value: skillsList.join(" | "),
            y: 95.6, // below box (absolute Y 1148)
            fontSize: 13,
            left: "15%",
            width: "70%",
            textAlign: "center"
          });
        } else {
          setEditingField({
            name: "role",
            value: builderInfo.role,
            y: 95.6,
            fontSize: 14,
            left: "15%",
            width: "70%",
            textAlign: "center"
          });
        }
        return;
      }
    }

    // 2. Hit test active charms next
    let hitIndex: number | null = null;
    let minDistance = 7.5; // target radius threshold

    charms.forEach((charm, idx) => {
      if (!charm.active) return;
      const dist = Math.hypot(charm.xPct - clickXPct, charm.yPct - clickYPct);
      if (dist < minDistance) {
        minDistance = dist;
        hitIndex = idx;
      }
    });

    if (hitIndex !== null) {
      e.currentTarget.setPointerCapture(e.pointerId);
      draggedCharmIndex.current = hitIndex;
      lastValidPos.current = { xPct: charms[hitIndex].xPct, yPct: charms[hitIndex].yPct };
      return;
    }

    // 3. Fallback to image dragging if clicked in portrait bounds
    if (!imageSrc) return;
    const scaleX = idCardTemplate.canvas.widthPx / rect.width;
    const scaleY = idCardTemplate.canvas.heightPx / rect.height;
    const cx = clientX * scaleX;
    const cy = clientY * scaleY;

    const isCircleFrame = photoFrame === "circle";
    const pr = isCircleFrame ? {
      x: 190,
      y: 327.5,
      width: 520,
      height: 520
    } : getPortraitRect(idCardTemplate);

    let clickedPortrait = false;
    if (isCircleFrame) {
      const cxCenter = pr.x + pr.width / 2;
      const cyCenter = pr.y + pr.height / 2;
      clickedPortrait = Math.hypot(cx - cxCenter, cy - cyCenter) <= pr.width / 2;
    } else {
      clickedPortrait = cx >= pr.x && cx <= pr.x + pr.width && cy >= pr.y && cy <= pr.y + pr.height;
    }

    if (!clickedPortrait) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY };
    cropStart.current = { x: crop.x, y: crop.y };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    // 1. If dragging a charm badge
    if (draggedCharmIndex.current !== null) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const newXPct = Math.max(0, Math.min(100, (x / rect.width) * 100));
      const newYPct = Math.max(0, Math.min(100, (y / rect.height) * 100));

      const activeCharm = charms[draggedCharmIndex.current];
      let targetXPct = activeCharm.xPct;
      let targetYPct = activeCharm.yPct;

      // Restrict dragging boundaries strictly. Try to move both X and Y
      if (isValidCharmPosition(newXPct, newYPct)) {
        targetXPct = parseFloat(newXPct.toFixed(1));
        targetYPct = parseFloat(newYPct.toFixed(1));
      } else {
        // If joint move is invalid, try sliding: check X only
        if (isValidCharmPosition(newXPct, targetYPct)) {
          targetXPct = parseFloat(newXPct.toFixed(1));
        }
        // check Y only
        if (isValidCharmPosition(targetXPct, newYPct)) {
          targetYPct = parseFloat(newYPct.toFixed(1));
        }
      }

      const updated = [...charms];
      updated[draggedCharmIndex.current] = {
        ...activeCharm,
        xPct: targetXPct,
        yPct: targetYPct
      };
      onCharmsChange(updated);
      return;
    }

    // 2. If dragging portrait image crop position
    if (!dragStart.current || !cropStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    const mult = canvas.width / rect.width;
    onCropChange({ ...crop, x: cropStart.current.x + dx * mult, y: cropStart.current.y + dy * mult });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);

    // 1. If dragging charm badge
    if (draggedCharmIndex.current !== null) {
      const idx = draggedCharmIndex.current;
      draggedCharmIndex.current = null;

      // Click detection: if mouse down and up are quick and close, trigger rotation
      const elapsed = Date.now() - pointerDownTime.current;
      const dist = Math.hypot(e.clientX - pointerDownPos.current.x, e.clientY - pointerDownPos.current.y);

      if (elapsed < 250 && dist < 6) {
        const charm = charms[idx];
        const currentRotation = charm.rotation || 0;
        const nextRotation = (currentRotation + 30) % 360;

        const updated = [...charms];
        updated[idx] = {
          ...charm,
          rotation: nextRotation
        };
        onCharmsChange(updated);
      }

      lastValidPos.current = null;
      return;
    }

    // 2. Reset crop pan states
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
          cursor: imageSrc && mode === "front" ? "move" : "default",
          position: "relative",
          aspectRatio: "3 / 4",
          borderRadius: "24px",
          overflow: "hidden"
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

        {/* Inline editable input overlay */}
        {editingField && (
          <input
            type="text"
            autoFocus
            value={editingField.value}
            onChange={e => {
              const val = e.target.value;
              setEditingField({ ...editingField, value: val });
              if (editingField.name === "memberName") {
                onBuilderInfoChange({ ...builderInfo, name: val });
              } else if (editingField.name === "teamName") {
                onTeamNameChange(val);
              } else if (editingField.name === "role") {
                onBuilderInfoChange({ ...builderInfo, role: val });
              } else if (editingField.name === "skills") {
                const list = val.split("|").map(s => s.trim());
                onSkillsListChange(list);
              }
            }}
            onBlur={() => setEditingField(null)}
            onKeyDown={e => {
              if (e.key === "Enter" || e.key === "Escape") {
                setEditingField(null);
              }
            }}
            style={{
              position: "absolute",
              left: editingField.left,
              width: editingField.width,
              top: `${editingField.y}%`,
              transform: "translateY(-50%)",
              background: editingField.name === "memberName"
                ? "rgba(4, 47, 46, 0.98)"
                : editingField.name === "teamName"
                ? "rgba(10, 20, 15, 0.95)"
                : "#FFFDEB",
              border: editingField.name === "memberName"
                ? "1.5px solid #FFFDEB"
                : editingField.name === "teamName"
                ? "1.5px solid var(--accent-cyan)"
                : "1.5px solid rgba(4, 47, 46, 0.95)",
              borderRadius: "4px",
              color: editingField.name === "memberName"
                ? "#FFFDEB"
                : editingField.name === "teamName"
                ? "#FFE500"
                : "rgba(4, 47, 46, 0.95)",
              padding: "4px 8px",
              fontSize: `${editingField.fontSize}px`,
              textAlign: editingField.textAlign,
              fontFamily: "var(--font-sans)",
              fontWeight: 700,
              zIndex: 100,
              boxShadow: editingField.name === "memberName"
                ? "0 0 12px rgba(255, 253, 235, 0.25)"
                : "0 0 12px rgba(0, 240, 255, 0.35)",
              outline: "none"
            }}
          />
        )}
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
