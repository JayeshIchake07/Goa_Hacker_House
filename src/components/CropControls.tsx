import React from "react";
import type { CropState } from "../types";
import { INITIAL_CROP_STATE } from "../types";
import { ZoomIn, ZoomOut, RotateCw, RefreshCw, Move } from "lucide-react";

interface CropControlsProps {
  crop: CropState;
  onChange: (newCrop: CropState) => void;
}

export const CropControls: React.FC<CropControlsProps> = ({ crop, onChange }) => {
  const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...crop, scale: parseFloat(e.target.value) });
  };

  const handleZoomIn = () => {
    onChange({ ...crop, scale: Math.min(3.0, crop.scale + 0.15) });
  };

  const handleZoomOut = () => {
    onChange({ ...crop, scale: Math.max(0.4, crop.scale - 0.15) });
  };

  const handleRotate = () => {
    onChange({ ...crop, rotation: (crop.rotation + 90) % 360 });
  };

  const handleReset = () => {
    onChange({ ...INITIAL_CROP_STATE });
  };

  const handlePan = (dx: number, dy: number) => {
    onChange({ ...crop, x: crop.x + dx, y: crop.y + dy });
  };

  return (
    <div className="crop-controls" style={{ marginTop: "1.5rem" }}>
      <div className="terminal-tag" style={{ marginBottom: "0.75rem" }}>
        step 2 — adjust crop & position
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="form-label" style={{ margin: 0 }}>
            Zoom Level ({Math.round(crop.scale * 100)}%)
          </span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn-icon" type="button" onClick={handleZoomOut} title="Zoom Out">
              <ZoomOut size={16} />
            </button>
            <button className="btn-icon" type="button" onClick={handleZoomIn} title="Zoom In">
              <ZoomIn size={16} />
            </button>
            <button className="btn-icon" type="button" onClick={handleRotate} title="Rotate 90°">
              <RotateCw size={16} />
            </button>
            <button className="btn-icon" type="button" onClick={handleReset} title="Reset Position">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        <input
          type="range"
          min="0.4"
          max="3.0"
          step="0.05"
          value={crop.scale}
          onChange={handleScaleChange}
          className="range-slider"
        />

        {/* Nudge / Pan pad buttons */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="form-label" style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <Move size={13} style={{ color: "var(--accent-gold)" }} /> Nudge Position
          </span>
          <div style={{ display: "flex", gap: "0.25rem" }}>
            <button className="btn-icon" type="button" onClick={() => handlePan(-20, 0)} title="Left">
              ←
            </button>
            <button className="btn-icon" type="button" onClick={() => handlePan(0, -20)} title="Up">
              ↑
            </button>
            <button className="btn-icon" type="button" onClick={() => handlePan(0, 20)} title="Down">
              ↓
            </button>
            <button className="btn-icon" type="button" onClick={() => handlePan(20, 0)} title="Right">
              →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
