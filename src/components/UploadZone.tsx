import React, { useState, useRef } from "react";
import { Upload, Loader2 } from "lucide-react";
import { convertHeicToJpeg, isHeicFile, readFileAsDataURL } from "../utils/heic";

interface UploadZoneProps {
  onImageSelected: (dataUrl: string) => void;
  hasImage: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  onImageSelected,
  hasImage,
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setErrorMsg(null);
    setIsLoading(true);

    try {
      let finalBlobOrFile: Blob | File = file;

      if (isHeicFile(file)) {
        finalBlobOrFile = await convertHeicToJpeg(file);
      }

      const dataUrl = await readFileAsDataURL(finalBlobOrFile);
      onImageSelected(dataUrl);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to process photo.";
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="form-group">
      <div className="terminal-tag" style={{ marginBottom: "0.75rem" }}>
        step 1 — upload photo
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
        style={{ display: "none" }}
      />

      <div
        className={`upload-dropzone ${isDragActive ? "drag-active" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        {isLoading ? (
          <>
            <Loader2 className="upload-icon spinning" size={32} style={{ animation: "spin 1s linear infinite" }} />
            <div className="upload-title">Processing photo...</div>
            <div className="upload-sub">Decoding HEIC / high-res image client-side</div>
          </>
        ) : (
          <>
            <Upload className="upload-icon" />
            <div className="upload-title">
              {hasImage ? "Change photo or drop a new file" : "Drag & drop your photo, or tap to browse"}
            </div>
            <div className="upload-sub">Supports JPG, PNG, WEBP & iPhone HEIC photos</div>
          </>
        )}
      </div>

      {errorMsg && (
        <p style={{ color: "#ff4d4d", fontSize: "0.85rem", marginTop: "0.5rem" }}>
          {errorMsg}
        </p>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
