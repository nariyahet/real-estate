import React, { useRef, useState, useCallback } from "react";

/**
 * Card3DTilt
 * Adds a subtle, high-end 3D perspective tilt (max 3-5 degrees)
 * on hover with specular lighting reflection.
 * Automatically disabled when prefers-reduced-motion is detected or on touch devices.
 */
export default function Card3DTilt({
  children,
  className = "",
  style = {},
  maxTilt = 4.5,
  scale = 1.015,
  onClick,
  ...props
}) {
  const cardRef = useRef(null);
  const [transformStyle, setTransformStyle] = useState("");
  const [sheenStyle, setSheenStyle] = useState({ opacity: 0, x: "50%", y: "50%" });

  const handleMouseMove = useCallback(
    (e) => {
      // Check reduced motion
      if (
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        return;
      }

      const card = cardRef.current;
      if (!card) return;

      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Calculate tilt within range [-maxTilt, maxTilt]
      const rotateX = (((y - centerY) / centerY) * -maxTilt).toFixed(2);
      const rotateY = (((x - centerX) / centerX) * maxTilt).toFixed(2);

      setTransformStyle(
        `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${scale}, ${scale}, ${scale})`
      );

      // Specular sheen position
      const sheenX = ((x / rect.width) * 100).toFixed(1);
      const sheenY = ((y / rect.height) * 100).toFixed(1);
      setSheenStyle({
        opacity: 0.12,
        x: `${sheenX}%`,
        y: `${sheenY}%`,
      });
    },
    [maxTilt, scale]
  );

  const handleMouseLeave = useCallback(() => {
    setTransformStyle(
      "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)"
    );
    setSheenStyle((prev) => ({ ...prev, opacity: 0 }));
  }, []);

  return (
    <div
      ref={cardRef}
      className={`card-3d-tilt-wrapper ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        transform: transformStyle,
        transition: transformStyle ? "transform 0.12s ease-out" : "transform 0.4s ease-out",
        transformStyle: "preserve-3d",
        position: "relative",
        willChange: "transform",
        ...style,
      }}
      {...props}
    >
      {children}
      <div
        className="card-3d-sheen"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: "inherit",
          pointerEvents: "none",
          background: `radial-gradient(circle 280px at ${sheenStyle.x} ${sheenStyle.y}, rgba(255, 255, 255, 0.4), transparent 70%)`,
          opacity: sheenStyle.opacity,
          transition: "opacity 0.25s ease-out",
          mixBlendMode: "overlay",
          zIndex: 2,
        }}
      />
    </div>
  );
}
