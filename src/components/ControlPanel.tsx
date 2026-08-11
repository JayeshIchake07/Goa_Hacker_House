import React, { useRef, useState } from "react";
import type { BuilderInfo, CropState, PaletteColors, Charm } from "../types";
import { INITIAL_CROP_STATE } from "../types";
import { getRandomTitle, ROLES } from "../utils/roleTitles";
import {
  Upload, Loader2, ZoomIn, ZoomOut, RotateCw, RefreshCw,
  User, AtSign, Sparkles, Cpu, Image as ImageIcon,
  Settings, Palette, Dices, AlertTriangle, Check
} from "lucide-react";
import { convertHeicToJpeg, isHeicFile, readFileAsDataURL } from "../utils/heic";
import { assertHasHumanFace } from "../utils/faceCheck";
import { removeImageBackground } from "../utils/removeBackground";
import { palettePresets, getContrastRatio, meetsWCAG } from "../utils/palette";
import { moodPresets } from "../utils/moods";

interface ControlPanelProps {
  imageSrc: string | null;
  cutoutSrc: string | null;
  onImageSelected: (originalUrl: string, cutoutUrl: string | null) => void;
  crop: CropState;
  onCropChange: (c: CropState) => void;
  builderInfo: BuilderInfo;
  onBuilderInfoChange: (b: BuilderInfo) => void;

  eventName: string;
  onEventNameChange: (s: string) => void;
  teamName: string;
  onTeamNameChange: (s: string) => void;
  roleMode: "single" | "skills";
  onRoleModeChange: (m: "single" | "skills") => void;
  skillsList: string[];
  onSkillsListChange: (list: string[]) => void;
  socialPlatform: string;
  onSocialPlatformChange: (s: string) => void;
  socialHandle: string;
  onSocialHandleChange: (s: string) => void;

  mood: string;
  onMoodChange: (m: string) => void;
  palette: PaletteColors;
  onPaletteChange: (p: PaletteColors) => void;
  borderColor: string;
  onBorderColorChange: (s: string) => void;
  roleColor: string;
  onRoleColorChange: (s: string) => void;
  useChromeEffect: boolean;
  onUseChromeEffectChange: (b: boolean) => void;
  shapeSeed: number;
  onShapeSeedChange: (n: number) => void;

  charms: Charm[];
  onCharmsChange: (charms: Charm[]) => void;

  photoFrame: "rectangle" | "circle";
  onPhotoFrameChange: (f: "rectangle" | "circle") => void;

  useThemeBg: boolean;
  onUseThemeBgChange: (b: boolean) => void;

  onExportJpg: (scale: number) => void;
  onExportPdf: () => void;
}

const PRESETS = [
  { label: "Resident Builder", emoji: "🏠" },
  { label: "Devfolio Cover", emoji: "🎨" },
  { label: "2:47 Studio Sun", emoji: "☀️" },
];

export const ControlPanel: React.FC<ControlPanelProps> = ({
  imageSrc,
  cutoutSrc,
  onImageSelected,
  crop,
  onCropChange,
  builderInfo,
  onBuilderInfoChange,

  teamName,
  onTeamNameChange,
  roleMode,
  onRoleModeChange,
  skillsList,
  onSkillsListChange,
  socialPlatform,
  onSocialPlatformChange,
  socialHandle,
  onSocialHandleChange,

  mood,
  onMoodChange,
  palette,
  onPaletteChange,
  borderColor,
  onBorderColorChange,
  roleColor,
  onRoleColorChange,
  useChromeEffect,
  onUseChromeEffectChange,
  onShapeSeedChange,

  charms,
  onCharmsChange,

  photoFrame,
  onPhotoFrameChange,

  useThemeBg,
  onUseThemeBgChange,

  onExportJpg,
  onExportPdf,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDrag, setIsDrag] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("Processing…");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showCustomPalette, setShowCustomPalette] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenProgress, setRegenProgress] = useState(0);
  const [regenText, setRegenText] = useState("Regenerate Shapes");

  // File processing
  const processFile = async (file: File) => {
    setErrorMsg(null);
    setIsLoading(true);
    setLoadingLabel("Processing…");
    try {
      const blob = isHeicFile(file) ? await convertHeicToJpeg(file) : file;
      const url = await readFileAsDataURL(blob);
      setLoadingLabel("Checking photo…");
      await assertHasHumanFace(url);

      setLoadingLabel("Removing background…");
      try {
        const cutout = await removeImageBackground(url);
        onImageSelected(url, cutout);
      } catch (bgErr) {
        onImageSelected(url, null);
        setErrorMsg(
          bgErr instanceof Error
            ? `${bgErr.message} Using original photo.`
            : "Could not remove background. Using original photo."
        );
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to process photo.");
    } finally {
      setIsLoading(false);
      setLoadingLabel("Processing…");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDrag(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  };

  // Crop helpers
  const zoom   = (d: number) => onCropChange({ ...crop, scale: Math.min(3, Math.max(0.4, crop.scale + d)) });
  const rotate = ()          => onCropChange({ ...crop, rotation: (crop.rotation + 90) % 360 });
  const reset  = ()          => onCropChange({ ...INITIAL_CROP_STATE });
  const pan    = (dx: number, dy: number) => onCropChange({ ...crop, x: crop.x + dx, y: crop.y + dy });

  // Shuffle auto role class
  const shuffleTitle = () => {
    onBuilderInfoChange({
      ...builderInfo,
      title: getRandomTitle(builderInfo.role, builderInfo.title)
    });
  };

  // Regeneration of shapes with anti-spam timer
  const handleRegenerateShapes = () => {
    if (isRegenerating) return;
    setIsRegenerating(true);
    setRegenText("Generating...");
    setRegenProgress(0);
    onShapeSeedChange(Date.now());

    const startTime = Date.now();
    const duration = 2000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setRegenProgress(pct);

      if (elapsed >= duration) {
        clearInterval(interval);
        setRegenText("Changed!");
        setIsRegenerating(false);
        setTimeout(() => {
          setRegenText("Regenerate Shapes");
          setRegenProgress(0);
        }, 1000);
      }
    }, 20);
  };

  // Custom palette color input updater
  const handleCustomColorChange = (key: keyof PaletteColors, value: string) => {
    onPaletteChange({
      ...palette,
      [key]: value
    });
  };

  // Contrast Calculation
  const contrastRatio = getContrastRatio(palette.text, palette.background);
  const contrastPasses = meetsWCAG(palette.text, palette.background);

  return (
    <div className="control-panel">

      {/* ── Section 1: Portrait Photo ── */}
      <div className="cp-section">
        <div className="cp-section-label">
          <ImageIcon size={13} />
          Portrait Photo
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
          style={{ display: "none" }}
          onChange={e => e.target.files?.[0] && processFile(e.target.files[0])}
        />

        <div
          className={`cp-upload ${isDrag ? "cp-upload--drag" : ""}`}
          onDragOver={e => { e.preventDefault(); setIsDrag(true); }}
          onDragLeave={() => setIsDrag(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {isLoading
            ? <><Loader2 size={18} className="spin" /> {loadingLabel}</>
            : <><Upload size={18} /> {imageSrc ? "Change Photo" : "Upload Photo (Supports HEIC / iPhone)"}</>
          }
        </div>
        {errorMsg && <p className="cp-error">{errorMsg}</p>}

        {imageSrc && (
          <div className="toggle-group" style={{ marginTop: "0.75rem" }}>
            <label className="toggle-label" htmlFor="themeBgToggle">
              <input
                type="checkbox"
                id="themeBgToggle"
                checked={useThemeBg && !!cutoutSrc}
                disabled={!cutoutSrc}
                onChange={e => onUseThemeBgChange(e.target.checked)}
              />
              <span className="toggle-text">
                <strong className="toggle-title">Theme background</strong>
                <span className="toggle-subtitle">
                  {cutoutSrc
                    ? "Replace photo background with palette / mood colors"
                    : "Unavailable — background removal failed for this photo"}
                </span>
              </span>
            </label>
          </div>
        )}

        <div className="cp-presets">
          {PRESETS.map(p => (
            <button key={p.label} className="cp-preset-chip" type="button" title={p.label}>
              {p.emoji} {p.label}
            </button>
          ))}
        </div>

        {imageSrc && (
          <div className="cp-precision">
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

      {/* ── Section 2: Mood Generator ── */}
      <div className="cp-section">
        <div className="cp-section-label">
          <Sparkles size={13} />
          Mood & Shapes
        </div>

        <div className="field-group" style={{ marginBottom: "1.2rem" }}>
          <label>Photo Frame Shape</label>
          <div className="role-mode-toggle">
            <button
              type="button"
              className={`btn-mode ${photoFrame === 'rectangle' ? 'active' : ''}`}
              onClick={() => onPhotoFrameChange('rectangle')}
            >
              Rectangle
            </button>
            <button
              type="button"
              className={`btn-mode ${photoFrame === 'circle' ? 'active' : ''}`}
              onClick={() => onPhotoFrameChange('circle')}
            >
              Circle
            </button>
          </div>
        </div>

        <div className="mood-grid">
          {Object.entries(moodPresets).map(([key, item]) => (
            <button
              key={key}
              type="button"
              className={`mood-card ${mood === key ? "active" : ""}`}
              onClick={() => onMoodChange(key)}
            >
              <span className="mood-icon">{item.icon}</span>
              <span className="mood-name">{item.name}</span>
            </button>
          ))}
        </div>
        <button
          className="cp-quick-btn"
          type="button"
          onClick={handleRegenerateShapes}
          disabled={isRegenerating}
          style={{
            width: "100%",
            padding: "0.6rem",
            position: "relative",
            overflow: "hidden",
            background: isRegenerating 
              ? `linear-gradient(to right, rgba(0, 240, 255, 0.25) ${regenProgress}%, rgba(255, 255, 255, 0.08) ${regenProgress}%)`
              : "rgba(255, 255, 255, 0.08)",
            border: "1px solid var(--panel-border)",
            borderRadius: "var(--r-md)",
            color: "#FFF",
            cursor: isRegenerating ? "not-allowed" : "pointer",
            transition: "background 0.1s ease"
          }}
        >
          <span style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            <RefreshCw size={13} className={isRegenerating ? "spin" : ""} /> {regenText}
          </span>
        </button>
      </div>

      {/* ── Section 3: Palette & Colors ── */}
      <div className="cp-section">
        <div className="cp-section-label">
          <Palette size={13} />
          Color Palette
        </div>

        <div className="palette-grid">
          {palettePresets.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              className={`palette-swatch ${JSON.stringify(palette) === JSON.stringify(preset.colors) ? "active" : ""}`}
              onClick={() => onPaletteChange({ ...preset.colors })}
            >
              <div className="swatch-colors">
                <span className="swatch-dot" style={{ background: preset.colors.primary }}></span>
                <span className="swatch-dot" style={{ background: preset.colors.secondary }}></span>
                <span className="swatch-dot" style={{ background: preset.colors.surface, border: "1px solid rgba(255,255,255,0.15)" }}></span>
                <span className="swatch-dot" style={{ background: preset.colors.text }}></span>
                <span className="swatch-dot" style={{ background: preset.colors.background, border: "1px solid rgba(255,255,255,0.15)" }}></span>
              </div>
              <span className="swatch-name">{preset.name}</span>
            </button>
          ))}
        </div>

        <div className="custom-palette-toggle">
          <button
            type="button"
            className="cp-quick-btn"
            style={{ width: "100%" }}
            onClick={() => setShowCustomPalette(!showCustomPalette)}
          >
            <Settings size={13} /> Custom Palette Colors
          </button>
        </div>

        {showCustomPalette && (
          <div className="custom-palette">
            {(['primary', 'secondary', 'surface', 'text', 'background'] as const).map(key => (
              <div className="color-picker-group" key={key}>
                <label style={{ textTransform: "capitalize" }}>{key}</label>
                <input
                  type="color"
                  value={palette[key]}
                  onChange={e => handleCustomColorChange(key, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}

        <div className={`contrast-badge ${contrastPasses ? 'pass' : 'fail'}`}>
          <span className="contrast-icon">{contrastPasses ? <Check size={14} /> : <AlertTriangle size={14} />}</span>
          <span className="contrast-text">Contrast: {contrastRatio.toFixed(1)}:1 {contrastPasses ? '(WCAG AA ✓)' : '(Below 4.5:1)'}</span>
        </div>
      </div>

      {/* ── Section 4: Shiny Chrome Effect ── */}
      <div className="cp-section">
        <div className="cp-section-label">
          <Sparkles size={13} />
          Effects
        </div>
        <div className="toggle-group">
          <label className="toggle-label" htmlFor="chromeToggle">
            <input
              type="checkbox"
              id="chromeToggle"
              checked={useChromeEffect}
              onChange={e => onUseChromeEffectChange(e.target.checked)}
            />
            <span className="toggle-text">
              <strong className="toggle-title">Shiny Chrome Finish</strong>
              <span className="toggle-subtitle">Metallic reflections & liquid chrome gradients</span>
            </span>
          </label>
        </div>
      </div>

      {/* ── Section 5: Border & Role Color ── */}
      <div className="cp-section">
        <div className="cp-section-label">
          <Settings size={13} />
          Border & Role Colors
        </div>
        <div className="color-row">
          <div className="color-picker-group">
            <label htmlFor="borderColorPicker">Card Border</label>
            <input
              type="color"
              id="borderColorPicker"
              value={borderColor}
              onChange={e => onBorderColorChange(e.target.value)}
            />
          </div>
          <div className="color-picker-group">
            <label htmlFor="roleColorPicker">Role / Skills Text</label>
            <input
              type="color"
              id="roleColorPicker"
              value={roleColor}
              onChange={e => onRoleColorChange(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── Section 6: Text Fields ── */}
      <div className="cp-section">
        <div className="cp-section-label">
          <User size={13} />
          Text Fields
        </div>

        <div className="text-fields">

          <div className="cp-form-row">
            <div className="field-group">
              <label htmlFor="teamNameInput">Team Name</label>
              <input
                type="text"
                id="teamNameInput"
                value={teamName}
                onChange={e => onTeamNameChange(e.target.value)}
                placeholder="Team Name"
              />
            </div>
            <div className="field-group">
              <label htmlFor="memberNameInput">Member Name</label>
              <input
                type="text"
                id="memberNameInput"
                value={builderInfo.name}
                onChange={e => onBuilderInfoChange({ ...builderInfo, name: e.target.value })}
                placeholder="Full Name"
              />
            </div>
          </div>

          {/* Single Role vs Up to 5 Skills Toggle */}
          <div className="field-group">
            <label>Role / Skills Mode</label>
            <div className="role-mode-toggle">
              <button
                type="button"
                className={`btn-mode ${roleMode === 'single' ? 'active' : ''}`}
                onClick={() => onRoleModeChange('single')}
              >
                Single Role
              </button>
              <button
                type="button"
                className={`btn-mode ${roleMode === 'skills' ? 'active' : ''}`}
                onClick={() => onRoleModeChange('skills')}
              >
                Up to 5 Skills
              </button>
            </div>
          </div>

          {roleMode === 'single' ? (
            <div className="field-group">
              <label htmlFor="roleInput">Role Title</label>
              <div className="cp-field-row">
                <select
                  className="cp-input cp-select"
                  value={builderInfo.role}
                  onChange={e => {
                    const r = e.target.value;
                    onBuilderInfoChange({
                      ...builderInfo,
                      role: r,
                      title: getRandomTitle(r, builderInfo.title)
                    });
                  }}
                  style={{ flex: 1, padding: "0.6rem 0.8rem" }}
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <button className="cp-randomize-btn" type="button" onClick={shuffleTitle} title="Randomize Class">
                  <Dices size={14}/> Auto-Class
                </button>
              </div>
            </div>
          ) : (
            <div className="field-group">
              <label>Up to 5 Skills</label>
              <div className="skills-inputs">
                {skillsList.map((skill, index) => (
                  <input
                    key={index}
                    type="text"
                    className="skill-field"
                    value={skill}
                    placeholder={`Skill ${index + 1}`}
                    onChange={e => {
                      const updated = [...skillsList];
                      updated[index] = e.target.value;
                      onSkillsListChange(updated);
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Section 7: Social Media Scanner ── */}
      <div className="cp-section">
        <div className="cp-section-label">
          <AtSign size={13} />
          Social Media (Back Side)
        </div>
        <div className="text-fields">
          <div className="field-group">
            <label htmlFor="socialPlatformSelect">Social Platform</label>
            <select
              id="socialPlatformSelect"
              className="form-select"
              value={socialPlatform}
              onChange={e => onSocialPlatformChange(e.target.value)}
            >
              <option value="instagram">Instagram</option>
              <option value="x">𝕏 / Twitter</option>
              <option value="discord">Discord Invite</option>
              <option value="custom">Custom URL / Link</option>
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="socialHandleInput">Handle / URL</label>
            <input
              type="text"
              id="socialHandleInput"
              value={socialHandle}
              onChange={e => onSocialHandleChange(e.target.value)}
              placeholder="e.g. hacker_house_goa"
            />
          </div>
        </div>
      </div>

      {/* ── Section 7.5: Charms System ✦ ── */}
      <div className="cp-section">
        <div className="cp-section-label">
          <Sparkles size={13} />
          Charms System ✦
        </div>
        <p className="preview-hint" style={{ marginBottom: "12px", textAlign: "left" }}>
          Enable and drag stamps directly on the Card Preview to reposition them (valid outside header, name bar & photo area).
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {charms.map((charm, index) => {
            const presets = ["🌴", "⚡", "🚀", "🔥", "👾", "😎", "✨", "🧠"];
            return (
              <div key={index} style={{ background: "rgba(0,0,0,0.15)", padding: "10px", borderRadius: "8px", border: "1px solid var(--panel-border)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 700 }}>
                    <input
                      type="checkbox"
                      checked={charm.active}
                      onChange={e => {
                        const updated = [...charms];
                        updated[index] = { ...charm, active: e.target.checked };
                        onCharmsChange(updated);
                      }}
                      style={{ cursor: "pointer", accentColor: "var(--accent-cyan)" }}
                    />
                    Charm badge {index + 1}
                  </label>
                  {charm.active && (
                    <span style={{ fontSize: "1.1rem" }}>{charm.emoji}</span>
                  )}
                </div>
                {charm.active && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                      {presets.map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          className="cp-preset-chip"
                          style={{
                            borderColor: charm.emoji === emoji ? "var(--accent-cyan)" : "",
                            color: charm.emoji === emoji ? "var(--accent-cyan)" : "",
                            padding: "0.2rem 0.5rem"
                          }}
                          onClick={() => {
                            const updated = [...charms];
                            updated[index] = { ...charm, emoji };
                            onCharmsChange(updated);
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <div className="field-group">
                      <input
                        type="text"
                        className="cp-input"
                        placeholder="Custom emoji or symbol"
                        maxLength={2}
                        value={charm.emoji}
                        onChange={e => {
                          const updated = [...charms];
                          updated[index] = { ...charm, emoji: e.target.value };
                          onCharmsChange(updated);
                        }}
                        style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                      />
                    </div>
                    <div className="field-group" style={{ marginTop: "4px" }}>
                      <label style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", marginBottom: "4px" }}>
                        <span>Badge Size (Stage {Math.round(charm.size || 1)}/5)</span>
                        <span>{["Small", "Med-Small", "Medium", "Med-Large", "Large (1/7 ID)"][(Math.round(charm.size || 1)) - 1]}</span>
                      </label>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          step="1"
                          value={Math.round(charm.size || 1)}
                          onChange={e => {
                            const updated = [...charms];
                            updated[index] = { ...charm, size: parseInt(e.target.value, 10) };
                            onCharmsChange(updated);
                          }}
                          className="range-slider"
                          style={{ flex: 1 }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Section 8: Actions ── */}
      <div className="cp-section">
        <div className="cp-section-label">
          <Cpu size={13} />
          Export Card
        </div>
        <div className="export-group">
          <button className="btn btn-primary" type="button" onClick={() => onExportJpg(1)}>
            Export JPEG 1×
          </button>
          <button className="btn btn-primary" type="button" onClick={() => onExportJpg(2)}>
            Export JPEG 2×
          </button>
          <button className="btn btn-pdf-full" type="button" onClick={onExportPdf}>
            Export Front & Back PDF (Single Go)
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
};
export default ControlPanel;
