import React from "react";
import type { BuilderInfo } from "../types";
import { getRandomTitle, ROLES } from "../utils/roleTitles";
import { Dices, User, Briefcase, Sparkles } from "lucide-react";

interface BuilderFormProps {
  builderInfo: BuilderInfo;
  onChange: (newInfo: BuilderInfo) => void;
}

export const BuilderForm: React.FC<BuilderFormProps> = ({
  builderInfo,
  onChange,
}) => {
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...builderInfo, name: e.target.value });
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value;
    const newTitle = getRandomTitle(newRole, builderInfo.title);
    onChange({
      ...builderInfo,
      role: newRole,
      title: newTitle,
    });
  };

  const handleShuffleTitle = () => {
    const newTitle = getRandomTitle(builderInfo.role, builderInfo.title);
    onChange({
      ...builderInfo,
      title: newTitle,
    });
  };

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <div className="terminal-tag" style={{ marginBottom: "1rem" }}>
        step 3 — builder pass details
      </div>

      <div className="form-group">
        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <User size={13} style={{ color: "var(--accent-gold)" }} /> Full Name
        </label>
        <input
          type="text"
          value={builderInfo.name}
          onChange={handleNameChange}
          placeholder="e.g. Satoshi Nakamoto"
          className="form-input"
          maxLength={28}
        />
      </div>

      <div className="form-group">
        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <Briefcase size={13} style={{ color: "var(--accent-gold)" }} /> Primary Stack / Role
        </label>
        <select
          value={builderInfo.role}
          onChange={handleRoleChange}
          className="form-select"
        >
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <Sparkles size={13} style={{ color: "var(--accent-sunset)" }} /> Auto-Generated Builder Class
        </label>
        <div className="form-input-readonly-group">
          <input
            type="text"
            value={builderInfo.title}
            readOnly
            className="form-input form-input-readonly"
          />
          <button
            type="button"
            onClick={handleShuffleTitle}
            className="btn-icon"
            title="Shuffle Builder Class"
          >
            <Dices size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
