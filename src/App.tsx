import { useState } from "react";
import { Header } from "./components/Header";
import { ControlPanel } from "./components/ControlPanel";
import { PreviewPanel } from "./components/PreviewPanel";
import { Background3D } from "./components/Background3D";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { INITIAL_BUILDER_INFO, INITIAL_CROP_STATE } from "./types";
import type { BuilderInfo, CropState, FormatMode } from "./types";

function AppContent() {
  const [imageSrc, setImageSrc]       = useState<string | null>(null);
  const [mode, setMode]               = useState<FormatMode>("profile");
  const [crop, setCrop]               = useState<CropState>(INITIAL_CROP_STATE);
  const [builderInfo, setBuilderInfo] = useState<BuilderInfo>(INITIAL_BUILDER_INFO);
  const { theme } = useTheme();

  const handleImageSelected = (dataUrl: string) => {
    setImageSrc(dataUrl);
    setCrop(INITIAL_CROP_STATE);
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
            mode={mode}
            onModeChange={setMode}
            imageSrc={imageSrc}
            onImageSelected={handleImageSelected}
            crop={crop}
            onCropChange={setCrop}
            builderInfo={builderInfo}
            onBuilderInfoChange={setBuilderInfo}
          />

          {/* RIGHT — Live Preview */}
          <PreviewPanel
            imageSrc={imageSrc}
            mode={mode}
            crop={crop}
            onCropChange={setCrop}
            builderInfo={builderInfo}
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
