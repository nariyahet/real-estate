import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

/**
 * CinematicTransition
 * High-end, smooth 1.8s architectural flythrough following successful login.
 * Renders a modern luxury villa with royal/sky-blue dusk lighting, warm gold interior accents,
 * smooth camera dolly-in, and seamless fade to the dashboard.
 * Has instantaneous fallback if WebGL is unsupported or reduced motion is active.
 */
export default function CinematicTransition({ onComplete }) {
  const mountRef = useRef(null);
  const [fadingOut, setFadingOut] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const fadingOutRef = useRef(false);
  const completedRef = useRef(false);

  const handleFinish = useRef(onComplete);
  handleFinish.current = onComplete;

  const triggerComplete = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    fadingOutRef.current = true;
    setFadingOut(true);
    setTimeout(() => {
      if (handleFinish.current) handleFinish.current();
    }, 200);
  };

  useEffect(() => {
    // Check reduced motion
    const prefersReducedMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setUseFallback(true);
      const timer = setTimeout(triggerComplete, 500);
      return () => clearTimeout(timer);
    }

    const mount = mountRef.current;
    if (!mount) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x071a33); // Deep Navy sky
    scene.fog = new THREE.FogExp2(0x071a33, 0.032);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 3.5, 23);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      mount.appendChild(renderer.domElement);
    } catch (err) {
      console.warn("WebGL initialization failed, using cinematic CSS fallback:", err);
      setUseFallback(true);
      const fallbackTimer = setTimeout(triggerComplete, 800);
      return () => clearTimeout(fallbackTimer);
    }

    // ─────────────────────────────────────────────────────────────
    // ARCHITECTURAL VILLA SCENE
    // ─────────────────────────────────────────────────────────────
    const villaGroup = new THREE.Group();

    // Materials
    const darkConcreteMat = new THREE.MeshStandardMaterial({
      color: 0x0b2545,
      roughness: 0.7,
      metalness: 0.1,
    });

    const lightFacadeMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.3,
      metalness: 0.2,
    });

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.05,
      metalness: 0.9,
      transparent: true,
      opacity: 0.45,
    });

    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xd4a72c,
      roughness: 0.25,
      metalness: 0.85,
    });

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.1,
      metalness: 0.8,
    });

    // 1. Ground Plateau / Terrace
    const terrace = new THREE.Mesh(new THREE.BoxGeometry(28, 0.6, 24), darkConcreteMat);
    terrace.position.set(0, -0.3, 0);
    villaGroup.add(terrace);

    // Architectural Ground Grid
    const gridHelper = new THREE.GridHelper(30, 20, 0x38bdf8, 0x0e2f56);
    gridHelper.position.set(0, 0.02, 0);
    villaGroup.add(gridHelper);

    // 2. Infinity Pool
    const pool = new THREE.Mesh(new THREE.BoxGeometry(14, 0.2, 7), waterMat);
    pool.position.set(0, 0.05, 7.5);
    villaGroup.add(pool);

    // Pool border (Gold & White)
    const poolRim = new THREE.Mesh(new THREE.BoxGeometry(14.6, 0.25, 7.6), goldTrimMat);
    poolRim.position.set(0, 0.02, 7.5);
    villaGroup.add(poolRim);

    // 3. Ground Floor Main Pavilion (White & Glass)
    const groundFloor = new THREE.Mesh(new THREE.BoxGeometry(12, 3.2, 8), lightFacadeMat);
    groundFloor.position.set(0, 1.6, 0);
    villaGroup.add(groundFloor);

    // Large Front Glass Glazing
    const frontGlass = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.6), glassMat);
    frontGlass.position.set(0, 1.6, 4.02);
    villaGroup.add(frontGlass);

    // 4. Upper Cantilevered Floor (Midnight Blue & Gold Accents)
    const upperFloor = new THREE.Mesh(new THREE.BoxGeometry(14, 2.8, 9), darkConcreteMat);
    upperFloor.position.set(1.5, 4.4, 0.5);
    villaGroup.add(upperFloor);

    // Upper Balcony Glass Railing
    const upperGlass = new THREE.Mesh(new THREE.PlaneGeometry(11, 1.1), glassMat);
    upperGlass.position.set(1.5, 3.9, 5.02);
    villaGroup.add(upperGlass);

    // Gold Architectural Ribbon
    const goldRibbon = new THREE.Mesh(new THREE.BoxGeometry(14.4, 0.15, 9.4), goldTrimMat);
    goldRibbon.position.set(1.5, 5.85, 0.5);
    villaGroup.add(goldRibbon);

    // Entrance Portal (Royal Blue Glow Pillar)
    const portalColumn = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 3.2, 16), goldTrimMat);
    portalColumn.position.set(-4.5, 1.6, 4.2);
    villaGroup.add(portalColumn);

    scene.add(villaGroup);

    // ─────────────────────────────────────────────────────────────
    // LIGHTING: Royal/Sky Blue Atmosphere + Warm Gold Interior
    // ─────────────────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0x0e2f56, 1.6);
    scene.add(ambientLight);

    // Sky-Blue Key Light
    const skyLight = new THREE.DirectionalLight(0x38bdf8, 3.0);
    skyLight.position.set(15, 20, 15);
    scene.add(skyLight);

    // Royal Blue Rim Light
    const rimLight = new THREE.DirectionalLight(0x2563eb, 2.5);
    rimLight.position.set(-18, 12, -10);
    scene.add(rimLight);

    // Warm Gold Interior Light (Shining out from entrance)
    const interiorPointLight = new THREE.PointLight(0xf4d58d, 4.0, 20);
    interiorPointLight.position.set(0, 2, 2.5);
    scene.add(interiorPointLight);

    const goldAccentLight = new THREE.PointLight(0xd4a72c, 3.0, 14);
    goldAccentLight.position.set(2, 4.5, 3);
    scene.add(goldAccentLight);

    // ─────────────────────────────────────────────────────────────
    // SMOOTH CAMERA FLYTHROUGH ANIMATION (1.8s Target)
    // ─────────────────────────────────────────────────────────────
    let animationFrameId;
    const startTime = performance.now();
    const durationMs = 1800; // 1.8 seconds

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / durationMs, 1);

      // Smooth ease-in-out curve
      const ease = progress < 0.5
        ? 2 * progress * progress
        : -1 + (4 - 2 * progress) * progress;

      // Dolly forward toward the building
      camera.position.z = 23 - ease * 13.5;
      camera.position.y = 3.5 - ease * 1.3;
      camera.position.x = Math.sin(ease * Math.PI * 0.4) * 1.2;
      camera.lookAt(0, 2.2, 0);

      renderer.render(scene, camera);

      if (progress >= 0.85 && !fadingOutRef.current) {
        fadingOutRef.current = true;
        setFadingOut(true);
      }

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        triggerComplete();
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    // Handle Window Resize
    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      if (renderer?.domElement && mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      renderer?.dispose();
    };
  }, []);

  return (
    <div
      className={`cinematic-transition-overlay ${fadingOut ? "fade-out" : ""}`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "#071A33",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: fadingOut ? 0 : 1,
        transition: "opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        pointerEvents: fadingOut ? "none" : "all",
      }}
    >
      {/* 3D WebGL Canvas Container */}
      <div
        ref={mountRef}
        style={{
          position: "absolute",
          inset: 0,
          display: useFallback ? "none" : "block",
        }}
      />

      {/* Lightweight CSS Architectural Fallback */}
      {useFallback && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(ellipse at 50% 40%, #0B2545 0%, #071A33 100%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              border: "2px solid #38BDF8",
              boxShadow: "0 0 30px rgba(56, 189, 248, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "44px",
              animation: "pulse 1.2s infinite ease-in-out",
            }}
          >
            🏢
          </div>
        </div>
      )}

      {/* Floating HUD Overlay Banner */}
      <div
        style={{
          position: "absolute",
          bottom: "48px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px",
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            padding: "8px 20px",
            background: "rgba(7, 26, 51, 0.8)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(56, 189, 248, 0.35)",
            borderRadius: "999px",
            color: "#38BDF8",
            fontSize: "13px",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            boxShadow: "0 8px 25px rgba(0, 0, 0, 0.4)",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#38BDF8",
              boxShadow: "0 0 10px #38BDF8",
            }}
          />
          Entering Real Estate Workspace
        </div>
      </div>

      {/* Skip button if user wants immediate access */}
      <button
        type="button"
        onClick={triggerComplete}
        style={{
          position: "absolute",
          top: "28px",
          right: "28px",
          padding: "6px 14px",
          background: "rgba(255, 255, 255, 0.08)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          borderRadius: "8px",
          color: "#E2E8F0",
          fontSize: "12px",
          fontWeight: 500,
          cursor: "pointer",
          zIndex: 20,
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => (e.target.style.background = "rgba(255, 255, 255, 0.16)")}
        onMouseLeave={(e) => (e.target.style.background = "rgba(255, 255, 255, 0.08)")}
      >
        Skip ➔
      </button>
    </div>
  );
}
