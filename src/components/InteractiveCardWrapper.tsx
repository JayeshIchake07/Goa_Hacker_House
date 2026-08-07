import React, { useRef, useState, useEffect } from "react";

interface InteractiveCardWrapperProps {
  children: React.ReactNode;
  isFlipping: boolean;
  isPunching: boolean;
}

export const InteractiveCardWrapper: React.FC<InteractiveCardWrapperProps> = ({
  children,
  isFlipping,
  isPunching,
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState<{ rx: number; ry: number }>({ rx: 0, ry: 0 });
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);

    const handleChange = () => setReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reducedMotion || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const offsetX = e.clientX - centerX;
    const offsetY = e.clientY - centerY;

    const maxTilt = 8; // Max 8 degrees tilt
    const ry = (offsetX / (rect.width / 2)) * maxTilt;
    const rx = -(offsetY / (rect.height / 2)) * maxTilt;

    setTilt({ rx, ry });
  };

  const handleMouseLeave = () => {
    setTilt({ rx: 0, ry: 0 });
  };

  const transformStyle = reducedMotion
    ? undefined
    : {
        transform: `perspective(1200px) rotateX(${tilt.rx.toFixed(2)}deg) rotateY(${tilt.ry.toFixed(2)}deg)`,
      };

  return (
    <div className="card-3d-perspective">
      <div
        ref={cardRef}
        className={`card-3d-container ${isFlipping ? "animating-flip" : ""} ${isPunching ? "animating-punch" : ""}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={transformStyle}
      >
        {children}
      </div>
    </div>
  );
};
