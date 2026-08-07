import React, { useState } from "react";
import { Download, Copy, Share2, Check } from "lucide-react";
import confetti from "canvas-confetti";
import { DEFAULT_EVENT_CONFIG } from "../types";

interface ShareActionsProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  mode: string;
  onDownloadTrigger?: () => void;
}

export const ShareActions: React.FC<ShareActionsProps> = ({
  canvasRef,
  mode,
  onDownloadTrigger,
}) => {
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const fireConfetti = () => {
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.8 },
      colors: ["#FF9E2C", "#FF5E1A", "#ffffff"],
    });
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (onDownloadTrigger) {
      onDownloadTrigger();
    }

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `hh-goa-2026-${mode}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      fireConfetti();
      showToast("DOWNLOADED HIGH-RES PNG BADGE!");
    }, "image/png");
  };

  const handleShareX = () => {
    const config = DEFAULT_EVENT_CONFIG;
    const tweetText = `${config.xShareText}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

    window.open(twitterUrl, "_blank", "width=600,height=400");
  };

  const handleCopyImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          setCopied(true);
          showToast("IMAGE COPIED TO CLIPBOARD! PASTE DIRECTLY INTO X.");
          setTimeout(() => setCopied(false), 2500);
        } catch (err) {
          console.error("Copy error:", err);
          showToast("Clipboard copy not supported in this browser. Use DOWNLOAD!");
        }
      }, "image/png");
    } catch (err) {
      console.error(err);
    }
  };

  const handleNativeShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `hh-goa-2026-${mode}.png`, {
          type: "image/png",
        });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: "HH Goa 2026 Builder Pass",
            text: "Just generated my official HH Goa 2026 Builder ID! 🌴⚡ Less Noise. More Signal. #FrameInGoa",
            files: [file],
          });
        } else {
          handleShareX();
        }
      }, "image/png");
    } catch (err) {
      console.error(err);
      handleShareX();
    }
  };

  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <div style={{ marginTop: "1.5rem", width: "100%" }}>
      <div className="terminal-tag" style={{ marginBottom: "0.75rem" }}>
        step 4 — save & share
      </div>

      <button className="btn-primary" onClick={handleDownload} type="button">
        <Download size={18} />
        DOWNLOAD HIGH-RES PNG
      </button>

      <div className="actions-grid">
        <button className="btn-secondary" onClick={handleShareX} type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          SHARE TO X
        </button>

        <button className="btn-secondary" onClick={handleCopyImage} type="button">
          {copied ? <Check size={16} style={{ color: "#10b981" }} /> : <Copy size={16} />}
          {copied ? "COPIED!" : "COPY IMAGE"}
        </button>
      </div>

      {canNativeShare && (
        <button
          className="btn-secondary"
          onClick={handleNativeShare}
          type="button"
          style={{ width: "100%", marginTop: "0.75rem" }}
        >
          <Share2 size={16} />
          NATIVE MOBILE SHARE
        </button>
      )}

      {toast && <div className="toast-msg">{toast}</div>}
    </div>
  );
};
