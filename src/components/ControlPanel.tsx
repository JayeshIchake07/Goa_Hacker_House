import React, { useRef, useState } from "react";
import type { BuilderInfo, CropState } from "../types";
import { INITIAL_CROP_STATE } from "../types";
import { getRandomTitle, ROLES } from "../utils/roleTitles";
import {
  Upload, Loader2, ZoomIn, ZoomOut, RotateCw, RefreshCw,
  User, AtSign, Sparkles, Dices, Cpu, Image as ImageIcon
} from "lucide-react";
import { convertHeicToJpeg, isHeicFile, readFileAsDataURL } from "../utils/heic";

interface ControlPanelProps {
  mode: "profile" | "builder";
  onModeChange: (m: "profile" | "builder") => void;
  imageSrc: string | null;
  onImageSelected: (dataUrl: string) => void;
  crop: CropState;
  onCropChange: (c: CropState) => void;
  builderInfo: BuilderInfo;
  onBuilderInfoChange: (b: BuilderInfo) => void;
}

const PRESETS = [
  { label: "Resident Builder", emoji: "🏠" },
  { label: "Devfolio Cover", emoji: "🎨" },
  { label: "2:47 Studio Sun", emoji: "☀️" },
];

export const ControlPanel: React.FC<ControlPanelProps> = ({
  mode,
  onModeChange,
  imageSrc,
  onImageSelected,
  crop,
  onCropChange,
  builderInfo,
  onBuilderInfoChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDrag, setIsDrag] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── File processing ────────────────────────────────────────────────────────
  const processFile = async (file: File) => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const blob = isHeicFile(file) ? await convertHeicToJpeg(file) : file;
      const url = await readFileAsDataURL(blob);
      onImageSelected(url);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to process photo.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDrag(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  };

  // ── Crop helpers ──────────────────────────────────────────────────────────
  const zoom   = (d: number) => onCropChange({ ...crop, scale: Math.min(3, Math.max(0.4, crop.scale + d)) });
  const rotate = ()          => onCropChange({ ...crop, rotation: (crop.rotation + 90) % 360 });
  const reset  = ()          => onCropChange({ ...INITIAL_CROP_STATE });
  const pan    = (dx: number, dy: number) => onCropChange({ ...crop, x: crop.x + dx, y: crop.y + dy });

  // ── Builder form helpers ──────────────────────────────────────────────────
  const set = (patch: Partial<BuilderInfo>) => onBuilderInfoChange({ ...builderInfo, ...patch });
  const shuffleTitle = () => set({ title: getRandomTitle(builderInfo.role, builderInfo.title) });

  return (
    <div className="control-panel">

      {/* ── Format Tabs ──────────────────────────────────────────────────── */}
      <div className="cp-tabs">
        <button
          className={`cp-tab ${mode === "profile" ? "cp-tab--active" : ""}`}
          onClick={() => onModeChange("profile")}
          type="button"
        >
          Single Builder Pass
        </button>
        <button
          className={`cp-tab ${mode === "builder" ? "cp-tab--active" : ""}`}
          onClick={() => onModeChange("builder")}
          type="button"
        >
          Squad / Team Pass
        </button>
      </div>

      {/* ── Section 1: Photo Controls ─────────────────────────────────── */}
      <div className="cp-section">
        <div className="cp-section-label">
          <ImageIcon size={13} />
          Builder Photo
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
          style={{ display: "none" }}
          onChange={e => e.target.files?.[0] && processFile(e.target.files[0])}
        />

        {/* Upload button / drop zone */}
        <div
          className={`cp-upload ${isDrag ? "cp-upload--drag" : ""}`}
          onDragOver={e => { e.preventDefault(); setIsDrag(true); }}
          onDragLeave={() => setIsDrag(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {isLoading
            ? <><Loader2 size={18} className="spin" /> Processing…</>
            : <><Upload size={18} /> {imageSrc ? "Change Photo" : "Upload Photo  (Supports HEIC / iPhone)"}</>
          }
        </div>
        {errorMsg && <p className="cp-error">{errorMsg}</p>}

        {/* Preset sample chips */}
        <div className="cp-presets">
          {PRESETS.map(p => (
            <button key={p.label} className="cp-preset-chip" type="button" title={p.label}>
              {p.emoji} {p.label}
            </button>
          ))}
        </div>

        {/* Precision controls — only shown after upload */}
        {imageSrc && (
          <div className="cp-precision">
            {/* Zoom slider */}
            <div className="cp-precision-row">
              <ZoomOut size={14} className="cp-icon-muted" />
              <input
                type="range" min="0.4" max="3.0" step="0.05"
                value={crop.scale}
                onChange={e => onCropChange({ ...crop, scale: parseFloat(e.target.value) })}
                className="range-slider"
              />
              <ZoomIn size={14} className="cp-icon-muted" />
              <span className="cp-zoom-label">{Math.round(crop.scale * 100)}%</span>
            </div>

            {/* Nudge pad */}
            <div className="cp-nudge">
              <div className="cp-nudge-center">
                <button className="cp-nudge-btn" type="button" onClick={() => pan(0, -20)}>↑</button>
                <div className="cp-nudge-row">
                  <button className="cp-nudge-btn" type="button" onClick={() => pan(-20, 0)}>←</button>
                  <button className="cp-nudge-btn" type="button" onClick={() => pan(0, 20)}>↓</button>
                  <button className="cp-nudge-btn" type="button" onClick={() => pan(20, 0)}>→</button>
                </div>
              </div>
              <div className="cp-quick-btns">
                <button className="cp-quick-btn" type="button" onClick={rotate}><RotateCw size={14}/> Rotate</button>
                <button className="cp-quick-btn" type="button" onClick={reset}><RefreshCw size={14}/> Reset</button>
                <button className="cp-quick-btn" type="button" onClick={() => zoom(0.15)}><ZoomIn size={14}/> Zoom +</button>
                <button className="cp-quick-btn" type="button" onClick={() => zoom(-0.15)}><ZoomOut size={14}/> Zoom −</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Section 2: Builder Profile Details ───────────────────────────── */}
      <div className="cp-section">
        <div className="cp-section-label">
          <User size={13} />
          Builder Profile
        </div>

        {/* Row 1: Name + Handle */}
        <div className="cp-form-row">
          <div className="cp-field">
            <label className="cp-field-label"><User size={11} /> Full Name / Alias</label>
            <input
              type="text"
              className="cp-input"
              placeholder="Satoshi Nakamoto"
              value={builderInfo.name}
              maxLength={28}
              onChange={e => set({ name: e.target.value })}
            />
          </div>
          <div className="cp-field">
            <label className="cp-field-label"><AtSign size={11} /> Twitter / X Handle</label>
            <input
              type="text"
              className="cp-input"
              placeholder="@satoshi"
              value={builderInfo.handle}
              maxLength={20}
              onChange={e => set({ handle: e.target.value })}
            />
          </div>
        </div>

        {/* Row 2: Builder Class + Randomize */}
        <div className="cp-field">
          <label className="cp-field-label"><Sparkles size={11} /> Generated Builder Class / Title</label>
          <div className="cp-field-row">
            <input
              type="text"
              className="cp-input cp-input--readonly"
              value={builderInfo.title}
              readOnly
            />
            <button className="cp-randomize-btn" type="button" onClick={shuffleTitle} title="Randomize">
              <Dices size={15}/> Randomize
            </button>
          </div>
        </div>

        {/* Row 3: Role + Tech Stack */}
        <div className="cp-form-row">
          <div className="cp-field">
            <label className="cp-field-label"><Cpu size={11} /> Role</label>
            <select
              className="cp-input cp-select"
              value={builderInfo.role}
              onChange={e => {
                const r = e.target.value;
                set({ role: r, title: getRandomTitle(r, builderInfo.title) });
              }}
            >
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="cp-field">
            <label className="cp-field-label"><Cpu size={11} /> Stack / Primary Tech</label>
            <input
              type="text"
              className="cp-input"
              placeholder="Rust / Next.js / AI"
              value={builderInfo.techStack}
              maxLength={32}
              onChange={e => set({ techStack: e.target.value })}
            />
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }`}</style>
    </div>
  );
};
