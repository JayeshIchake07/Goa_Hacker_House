import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export const Header: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="goa-header">
      {/* Top-right: Static studio stamp + Theme Toggle */}
      <div className="goa-topright-bar">
        <span className="goa-studio-stamp">2:47 PM STUDIO</span>
        <button
          onClick={toggleTheme}
          className="theme-toggle-btn"
          title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
          type="button"
        >
          {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </div>

      {/* Main Title: HACKER / [गोवा] / HOUSE */}
      <div className="goa-title-wrapper">
        <h1 className="goa-hero-title">
          <span className="goa-title-word">HACKER</span>
          <span className="goa-badge-container">
            <span className="goa-devanagari-badge">गोवा</span>
          </span>
          <span className="goa-title-word">HOUSE</span>
        </h1>
      </div>

      {/* Sub-Header Metadata Bar */}
      <div className="goa-meta-bar">
        {/* Desktop */}
        <div className="goa-meta-left goa-meta-desktop">
          GOA, INDIA &nbsp;•&nbsp; 28 - 31 OCT 2026
        </div>
        <div className="goa-meta-right goa-meta-desktop">
          Less Noise. More Signal.
        </div>

        {/* Mobile */}
        <div className="goa-meta-mobile">
          <div className="goa-meta-row">
            <span>GOA, INDIA</span>
            <span>28 - 31 OCT 2026</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
