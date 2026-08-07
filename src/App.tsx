import { useState, useMemo } from "react";
import { Header } from "./components/Header";
import { ControlPanel } from "./components/ControlPanel";
import { PreviewPanel } from "./components/PreviewPanel";
import { Background3D } from "./components/Background3D";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { INITIAL_CROP_STATE } from "./types";
import type { BuilderInfo, CropState, FormatMode, PaletteColors } from "./types";
import { getDefaultPalette } from "./utils/palette";
import { getSoftExclusionZone } from "./utils/template";
import { idCardTemplate } from "./utils/template";
import { generateShapes } from "./utils/moods";
import { exportJPG, exportPDF } from "./utils/export";

function AppContent() {
  const { theme } = useTheme();

  // Photo state
  const [imageSrc, setImageSrc]       = useState<string | null>(null);
  const [crop, setCrop]               = useState<CropState>(INITIAL_CROP_STATE);

  // Card side (front or back)
  const [mode, setMode]               = useState<FormatMode>("front");

  // Profile details
  const [builderInfo, setBuilderInfo] = useState<BuilderInfo>({
    name: "John Doe",
    handle: "hacker_house_goa",
    role: "Developer",
    title: "TERMINAL WIZARD",
    techStack: "React / Node.js"
  });

  // Generative ID Maker details
  const [eventName, setEventName]     = useState<string>("HACKER HOUSE GOA");
  const [teamName, setTeamName]       = useState<string>("Team Alpha");
  const [roleMode, setRoleMode]       = useState<"single" | "skills">("single");
  const [skillsList, setSkillsList]   = useState<string[]>(['React', 'Node.js', 'UI/UX', 'Python', 'Docker']);
  const [socialPlatform, setSocialPlatform] = useState<string>("instagram");
  const [socialHandle, setSocialHandle] = useState<string>("hacker_house_goa");

  // Style states
  const [mood, setMood]               = useState<string>("corporate");
  const [palette, setPalette]         = useState<PaletteColors>(getDefaultPalette());
  const [borderColor, setBorderColor] = useState<string>("#0077B6");
  const [roleColor, setRoleColor] = useState<string>("#E63946");
  const [useChromeEffect, setUseChromeEffect] = useState<boolean>(false);
  const [shapeSeed, setShapeSeed]     = useState<number>(Date.now());
  const [lightPos, setLightPos]       = useState<{ x: number; y: number }>({ x: 0.5, y: 0.3 });

  // Generate background/overlay shapes reactively using memoization
  const shapes = useMemo(() => {
    const exclusion = getSoftExclusionZone(idCardTemplate);
    const { widthPx: cw, heightPx: ch } = idCardTemplate.canvas;
    return generateShapes(mood, palette, exclusion, cw, ch, shapeSeed);
  }, [mood, palette, shapeSeed]);

  // Compute textFields based on roleMode
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

  // Combined state object for the renderer/export routines
  const rendererState = useMemo(() => {
    return {
      palette,
      mood,
      portraitImage: null as HTMLImageElement | null, // loaded inside PreviewPanel/renderer
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
    palette, mood, crop, mode, roleMode, skillsList,
    socialPlatform, socialHandle, textFields,
    borderColor, roleColor, useChromeEffect, lightPos,
    shapeSeed, shapes
  ]);

  const handleImageSelected = (dataUrl: string) => {
    setImageSrc(dataUrl);
    setCrop(INITIAL_CROP_STATE);
  };

  const triggerExportJpg = (scale: number) => {
    // We need to resolve the image source to an HTMLImageElement
    if (!imageSrc) {
      exportJPG(rendererState, scale);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      exportJPG({ ...rendererState, portraitImage: img }, scale);
    };
    img.src = imageSrc;
  };

  const triggerExportPdf = () => {
    if (!imageSrc) {
      exportPDF(rendererState);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      exportPDF({ ...rendererState, portraitImage: img });
    };
    img.src = imageSrc;
  };

  return (
    <>
      <Background3D theme={theme} />

      <div className="app-shell">
        {/* Page Header */}
        <Header />

        {/* Side-by-side workspace */}
        <div className="workspace-grid">
          {/* LEFT — Control Panel */}
          <ControlPanel
            imageSrc={imageSrc}
            onImageSelected={handleImageSelected}
            crop={crop}
            onCropChange={setCrop}
            builderInfo={builderInfo}
            onBuilderInfoChange={setBuilderInfo}

            eventName={eventName}
            onEventNameChange={setEventName}
            teamName={teamName}
            onTeamNameChange={setTeamName}
            roleMode={roleMode}
            onRoleModeChange={setRoleMode}
            skillsList={skillsList}
            onSkillsListChange={setSkillsList}
            socialPlatform={socialPlatform}
            onSocialPlatformChange={setSocialPlatform}
            socialHandle={socialHandle}
            onSocialHandleChange={setSocialHandle}

            mood={mood}
            onMoodChange={setMood}
            palette={palette}
            onPaletteChange={setPalette}
            borderColor={borderColor}
            onBorderColorChange={setBorderColor}
            roleColor={roleColor}
            onRoleColorChange={setRoleColor}
            useChromeEffect={useChromeEffect}
            onUseChromeEffectChange={setUseChromeEffect}
            shapeSeed={shapeSeed}
            onShapeSeedChange={setShapeSeed}

            onExportJpg={triggerExportJpg}
            onExportPdf={triggerExportPdf}
          />

          {/* RIGHT — Live Preview */}
          <PreviewPanel
            imageSrc={imageSrc}
            mode={mode}
            onModeChange={setMode}
            crop={crop}
            onCropChange={setCrop}
            builderInfo={builderInfo}

            eventName={eventName}
            teamName={teamName}
            roleMode={roleMode}
            skillsList={skillsList}
            socialPlatform={socialPlatform}
            socialHandle={socialHandle}

            mood={mood}
            palette={palette}
            borderColor={borderColor}
            roleColor={roleColor}
            useChromeEffect={useChromeEffect}
            shapeSeed={shapeSeed}
            lightPos={lightPos}
            onLightPosChange={setLightPos}

            onExportJpg={triggerExportJpg}
            onExportPdf={triggerExportPdf}
          />
        </div>

        {/* Footer */}
        <footer className="app-footer">
          <span>GOA, INDIA · 28–31 OCT 2026 · HH GOA</span>
          <span>
            2:47pm Studio · Less Noise. More Signal. ·&nbsp;
            <span style={{ color: "var(--accent-cyan)" }}>#FrameInGoa</span>
          </span>
        </footer>
      </div>
    </>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
