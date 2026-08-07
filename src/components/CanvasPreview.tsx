import React, { useEffect, useRef, useState } from "react";
import type { BuilderInfo, CropState, FormatMode } from "../types";
import { drawGraphicToCanvas } from "../utils/canvasComposer";
import { InteractiveCardWrapper } from "./InteractiveCardWrapper";
import { ShareActions } from "./ShareActions";
import { UserCheck, BadgeCheck } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

interface CanvasPreviewProps {
  imageSrc: string | null;
  mode: FormatMode;
  onModeChange: (mode: FormatMode) => void;
  crop: CropState;
  onCropChange: (crop: CropState) => void;
  builderInfo: BuilderInfo;
}

export const CanvasPreview: React.FC<CanvasPreviewProps> = ({
  imageSrc,
  mode,
  onModeChange,
  crop,
  onCropChange,
  builderInfo,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loadedImg, setLoadedImg] = useState<HTMLImageElement | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isPunching, setIsPunching] = useState(false);
  const { theme } = useTheme();

  // Drag states
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);

  // Trigger 3D flip animation on tab switch
  const handleTabChange = (newMode: FormatMode) => {
    if (newMode === mode) return;
    setIsFlipping(true);
    onModeChange(newMode);
    setTimeout(() => setIsFlipping(false), 550);
  };

  // Trigger tactile punch on download action
  const handleTriggerPunch = () => {
    setIsPunching(true);
    setTimeout(() => setIsPunching(false), 300);
  };

  // Load image object whenever imageSrc changes
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

  // Redraw canvas whenever loaded image, mode, crop, builderInfo or theme changes
  useEffect(() => {
    if (canvasRef.current) {
      drawGraphicToCanvas(canvasRef.current, loadedImg, mode, crop, builderInfo, theme);
    }
  }, [loadedImg, mode, crop, builderInfo, theme]);

  // Pointer drag event handlers for direct photo positioning
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!imageSrc) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragStart({ x: e.clientX, y: e.clientY });
    setCropStart({ x: crop.x, y: crop.y });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragStart || !cropStart) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    
    const canvasEl = canvasRef.current;
    if (canvasEl) {
      const rect = canvasEl.getBoundingClientRect();
      const scaleMultiplier = canvasEl.width / rect.width;
      onCropChange({
        ...crop,
        x: cropStart.x + dx * scaleMultiplier,
        y: cropStart.y + dy * scaleMultiplier,
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDragStart(null);
    setCropStart(null);
  };

  return (
    <div>
      {/* Tab Switcher */}
      <div className="tab-container">
        <button
          className={`tab-button ${mode === "profile" ? "active" : ""}`}
          onClick={() => handleTabChange("profile")}
          type="button"
        >
          <UserCheck size={16} />
          PROFILE FRAME (1:1)
        </button>
        <button
          className={`tab-button ${mode === "builder" ? "active" : ""}`}
          onClick={() => handleTabChange("builder")}
          type="button"
        >
          <BadgeCheck size={16} />
          BUILDER CARD (PASS)
        </button>
      </div>

      {/* 3D Interactive Card Preview Container */}
      <InteractiveCardWrapper isFlipping={isFlipping} isPunching={isPunching}>
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="canvas-preview-element"
          style={{
            maxHeight: mode === "profile" ? "440px" : "540px",
            cursor: imageSrc ? "move" : "default",
            touchAction: "none", // Prevent native scrolling when dragging
          }}
        />
      </InteractiveCardWrapper>

      {/* Download & Share Actions */}
      <ShareActions
        canvasRef={canvasRef}
        mode={mode}
        onDownloadTrigger={handleTriggerPunch}
      />
    </div>
  );
};

