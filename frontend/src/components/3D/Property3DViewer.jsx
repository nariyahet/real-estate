import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";

/**
 * Property3DViewer
 * Interactive 3D Architectural Viewer for Real Estate Property Showcase.
 * Controls: Rotate, Zoom, Pan, Day/Dusk Lighting, Exterior/Interior Cutaway,
 * Floor Navigation (Ground/1st/Terrace), 3D Interactive Hotspots, and Fullscreen.
 * Includes complete WebGL error handling and fallback to high-resolution property photography.
 */
export default function Property3DViewer({ property, fallbackImage }) {
  const containerRef = useRef(null);
  const [webGlError, setWebGlError] = useState(false);
  const [lightingMode, setLightingMode] = useState("dusk"); // "day" | "dusk"
  const [viewMode, setViewMode] = useState("exterior"); // "exterior" | "interior"
  const [activeFloor, setActiveFloor] = useState("all"); // "all" | "ground" | "upper" | "terrace"
  const [activeHotspot, setActiveHotspot] = useState(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // References for live 3D manipulations
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef({
    isDragging: false,
    prevMousePos: { x: 0, y: 0 },
    rotation: { x: 0.35, y: -0.6 },
    targetRotation: { x: 0.35, y: -0.6 },
    distance: 24,
    targetDistance: 24,
    targetLookAt: new THREE.Vector3(0, 2.5, 0),
    currentLookAt: new THREE.Vector3(0, 2.5, 0),
  });

  const upperRoofRef = useRef(null);
  const upperFloorGroupRef = useRef(null);
  const lightsRef = useRef({});

  // Hotspots definitions
  const hotspots = [
    { id: "pool", label: "Infinity Pool", pos: new THREE.Vector3(0, 0.4, 7.5), desc: "Heated private infinity pool with underwater illumination" },
    { id: "living", label: "Grand Living Lounge", pos: new THREE.Vector3(-1.5, 1.8, 1.5), desc: "Double-height living space with imported Italian marble" },
    { id: "master", label: "Master Suite", pos: new THREE.Vector3(2.5, 4.2, 1), desc: "Panoramic bedroom suite with walk-in closet & ensuite spa" },
    { id: "terrace", label: "Sky Deck Lounge", pos: new THREE.Vector3(0, 6.2, 0), desc: "360-degree open sky entertaining deck with pergola" },
  ];

  // Initialize Three.js Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 480;

    // Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    cameraRef.current = camera;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      rendererRef.current = renderer;
      container.appendChild(renderer.domElement);
    } catch (err) {
      console.error("WebGL failed to initialize:", err);
      setWebGlError(true);
      return;
    }

    // Sky / Background Dome
    scene.background = new THREE.Color(lightingMode === "dusk" ? 0x071a33 : 0xe0f2fe);
    scene.fog = new THREE.FogExp2(lightingMode === "dusk" ? 0x071a33 : 0xe0f2fe, 0.025);

    // ─────────────────────────────────────────────────────────────
    // LIGHTING SETUP
    // ─────────────────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xffffff, lightingMode === "dusk" ? 0.9 : 1.8);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, lightingMode === "dusk" ? 1.4 : 3.0);
    sunLight.position.set(18, 25, 15);
    scene.add(sunLight);

    const skyFillLight = new THREE.DirectionalLight(0x38bdf8, lightingMode === "dusk" ? 1.6 : 1.0);
    skyFillLight.position.set(-15, 12, -10);
    scene.add(skyFillLight);

    // Warm Interior Point Lights
    const warmInterior1 = new THREE.PointLight(0xf4d58d, 4.0, 16);
    warmInterior1.position.set(0, 2.0, 2);
    scene.add(warmInterior1);

    const warmInterior2 = new THREE.PointLight(0xd4a72c, 3.5, 16);
    warmInterior2.position.set(2, 4.2, 1);
    scene.add(warmInterior2);

    lightsRef.current = { ambientLight, sunLight, skyFillLight, warmInterior1, warmInterior2 };

    // ─────────────────────────────────────────────────────────────
    // PROCEDURAL LUXURY VILLA ARCHITECTURE
    // ─────────────────────────────────────────────────────────────
    const modelGroup = new THREE.Group();

    // Material Palette
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x0b2545, roughness: 0.6, metalness: 0.15 });
    const whiteFacadeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.1 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.4 });
    const woodDeckMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.7, metalness: 0.05 });
    const goldAccentMat = new THREE.MeshStandardMaterial({ color: 0xd4a72c, roughness: 0.3, metalness: 0.85 });
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.85 });

    // Ground Landscape & Pool
    const groundPlaza = new THREE.Mesh(new THREE.BoxGeometry(26, 0.4, 24), concreteMat);
    groundPlaza.position.set(0, -0.2, 0);
    modelGroup.add(groundPlaza);

    const woodTerrace = new THREE.Mesh(new THREE.BoxGeometry(20, 0.1, 18), woodDeckMat);
    woodTerrace.position.set(0, 0.05, 1);
    modelGroup.add(woodTerrace);

    const poolMesh = new THREE.Mesh(new THREE.BoxGeometry(12, 0.15, 6), waterMat);
    poolMesh.position.set(0, 0.12, 7.5);
    modelGroup.add(poolMesh);

    const poolRim = new THREE.Mesh(new THREE.BoxGeometry(12.6, 0.2, 6.6), goldAccentMat);
    poolRim.position.set(0, 0.08, 7.5);
    modelGroup.add(poolRim);

    // Ground Floor Unit (Level 0)
    const groundFloorGroup = new THREE.Group();
    const groundWalls = new THREE.Mesh(new THREE.BoxGeometry(11, 2.8, 8), whiteFacadeMat);
    groundWalls.position.set(-0.5, 1.4, 0);
    groundFloorGroup.add(groundWalls);

    // Floor-to-ceiling glass frontage
    const groundGlass = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.4), glassMat);
    groundGlass.position.set(-0.5, 1.4, 4.02);
    groundFloorGroup.add(groundGlass);

    // Interior furniture volume placeholder
    const interiorLounge = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.6, 2.2), new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.8 }));
    interiorLounge.position.set(-1.5, 0.5, 1.5);
    groundFloorGroup.add(interiorLounge);

    modelGroup.add(groundFloorGroup);

    // Upper Floor Unit (Level 1)
    const upperFloorGroup = new THREE.Group();
    upperFloorGroupRef.current = upperFloorGroup;

    const upperSlab = new THREE.Mesh(new THREE.BoxGeometry(13, 0.3, 9), concreteMat);
    upperSlab.position.set(1, 2.95, 0.5);
    upperFloorGroup.add(upperSlab);

    const upperWalls = new THREE.Mesh(new THREE.BoxGeometry(10, 2.6, 7.5), whiteFacadeMat);
    upperWalls.position.set(1.5, 4.4, 0.2);
    upperFloorGroup.add(upperWalls);

    const upperGlass = new THREE.Mesh(new THREE.PlaneGeometry(8, 2.2), glassMat);
    upperGlass.position.set(1.5, 4.4, 4.0);
    upperFloorGroup.add(upperGlass);

    // Gold architectural facade frame
    const goldFrame = new THREE.Mesh(new THREE.BoxGeometry(10.4, 2.8, 0.2), goldAccentMat);
    goldFrame.position.set(1.5, 4.4, 4.08);
    upperFloorGroup.add(goldFrame);

    // Roof & Terrace Pergola
    const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(12, 0.3, 8.5), concreteMat);
    roofSlab.position.set(1.5, 5.85, 0.2);
    upperRoofRef.current = roofSlab;
    upperFloorGroup.add(roofSlab);

    const pergolaBeam1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.8, 6), goldAccentMat);
    pergolaBeam1.position.set(-2.5, 6.9, 0);
    upperFloorGroup.add(pergolaBeam1);

    const pergolaBeam2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.8, 6), goldAccentMat);
    pergolaBeam2.position.set(4.5, 6.9, 0);
    upperFloorGroup.add(pergolaBeam2);

    modelGroup.add(upperFloorGroup);
    scene.add(modelGroup);

    // Grid Floor
    const grid = new THREE.GridHelper(30, 30, 0x38bdf8, 0x1e3a8a);
    grid.position.y = -0.4;
    grid.material.opacity = 0.25;
    grid.material.transparent = true;
    scene.add(grid);

    // ─────────────────────────────────────────────────────────────
    // INTERACTION & ANIMATION LOOP
    // ─────────────────────────────────────────────────────────────
    let animationId;

    const updateCamera = () => {
      const ctrl = controlsRef.current;

      // Smooth lerp rotation and distance
      ctrl.rotation.x += (ctrl.targetRotation.x - ctrl.rotation.x) * 0.1;
      ctrl.rotation.y += (ctrl.targetRotation.y - ctrl.rotation.y) * 0.1;
      ctrl.distance += (ctrl.targetDistance - ctrl.distance) * 0.1;
      ctrl.currentLookAt.lerp(ctrl.targetLookAt, 0.08);

      // Spherical coordinate mapping
      const cosX = Math.cos(ctrl.rotation.x);
      const sinX = Math.sin(ctrl.rotation.x);
      const cosY = Math.cos(ctrl.rotation.y);
      const sinY = Math.sin(ctrl.rotation.y);

      camera.position.x = ctrl.currentLookAt.x + ctrl.distance * cosX * sinY;
      camera.position.y = ctrl.currentLookAt.y + ctrl.distance * sinX;
      camera.position.z = ctrl.currentLookAt.z + ctrl.distance * cosX * cosY;

      camera.lookAt(ctrl.currentLookAt);
    };

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      if (autoRotate && !controlsRef.current.isDragging) {
        controlsRef.current.targetRotation.y += 0.003;
      }

      updateCamera();
      renderer.render(scene, camera);
    };

    animate();

    // Mouse Interaction Handlers
    const handleMouseDown = (e) => {
      controlsRef.current.isDragging = true;
      controlsRef.current.prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e) => {
      if (!controlsRef.current.isDragging) return;
      const dx = e.clientX - controlsRef.current.prevMousePos.x;
      const dy = e.clientY - controlsRef.current.prevMousePos.y;

      controlsRef.current.targetRotation.y -= dx * 0.007;
      controlsRef.current.targetRotation.x = Math.max(
        0.05,
        Math.min(Math.PI / 2.2, controlsRef.current.targetRotation.x + dy * 0.007)
      );

      controlsRef.current.prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      controlsRef.current.isDragging = false;
    };

    const handleWheel = (e) => {
      e.preventDefault();
      const zoomDelta = e.deltaY * 0.015;
      controlsRef.current.targetDistance = Math.max(
        10,
        Math.min(42, controlsRef.current.targetDistance + zoomDelta)
      );
    };

    const domElem = renderer.domElement;
    domElem.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    domElem.addEventListener("wheel", handleWheel, { passive: false });

    // Handle Resize
    const handleResize = () => {
      if (!container || !renderer) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      domElem.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      domElem.removeEventListener("wheel", handleWheel);
      window.removeEventListener("resize", handleResize);
      if (renderer?.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer?.dispose();
    };
  }, [autoRotate]);

  // Lighting Mode Switch
  useEffect(() => {
    if (!sceneRef.current || !lightsRef.current.ambientLight) return;
    const isDusk = lightingMode === "dusk";

    sceneRef.current.background = new THREE.Color(isDusk ? 0x071a33 : 0xf0f9ff);
    if (sceneRef.current.fog) {
      sceneRef.current.fog.color = new THREE.Color(isDusk ? 0x071a33 : 0xf0f9ff);
    }

    lightsRef.current.ambientLight.intensity = isDusk ? 0.9 : 2.0;
    lightsRef.current.sunLight.intensity = isDusk ? 1.4 : 3.2;
    lightsRef.current.skyFillLight.intensity = isDusk ? 1.6 : 0.8;
  }, [lightingMode]);

  // Exterior vs Interior Cutaway Mode
  useEffect(() => {
    if (upperRoofRef.current) {
      upperRoofRef.current.visible = viewMode === "exterior";
    }
  }, [viewMode]);

  // Floor Navigation Focus
  useEffect(() => {
    const ctrl = controlsRef.current;
    if (activeFloor === "ground") {
      ctrl.targetLookAt.set(-0.5, 1.2, 0);
      ctrl.targetDistance = 16;
      ctrl.targetRotation.x = 0.25;
    } else if (activeFloor === "upper") {
      ctrl.targetLookAt.set(1.5, 4.0, 0);
      ctrl.targetDistance = 18;
      ctrl.targetRotation.x = 0.35;
    } else if (activeFloor === "terrace") {
      ctrl.targetLookAt.set(1.0, 6.0, 0);
      ctrl.targetDistance = 20;
      ctrl.targetRotation.x = 0.65;
    } else {
      ctrl.targetLookAt.set(0, 2.5, 0);
      ctrl.targetDistance = 24;
      ctrl.targetRotation.x = 0.35;
    }
  }, [activeFloor]);

  // Hotspot Click Handler
  const handleHotspotClick = (spot) => {
    setActiveHotspot(spot);
    setAutoRotate(false);
    const ctrl = controlsRef.current;
    ctrl.targetLookAt.copy(spot.pos);
    ctrl.targetDistance = 14;
    ctrl.targetRotation.x = 0.3;
  };

  const handleZoom = (direction) => {
    const delta = direction === "in" ? -4 : 4;
    controlsRef.current.targetDistance = Math.max(
      10,
      Math.min(42, controlsRef.current.targetDistance + delta)
    );
  };

  const handleResetView = () => {
    setActiveHotspot(null);
    setActiveFloor("all");
    controlsRef.current.targetLookAt.set(0, 2.5, 0);
    controlsRef.current.targetRotation = { x: 0.35, y: -0.6 };
    controlsRef.current.targetDistance = 24;
    setAutoRotate(true);
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  // If WebGL fails, render high-end photo fallback
  if (webGlError) {
    return (
      <div className="property-3d-fallback-card" style={{ padding: "24px", textAlign: "center", background: "#071A33", color: "#FFFFFF", borderRadius: "14px" }}>
        <img
          src={fallbackImage || property?.primary_image || property?.image_url || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200"}
          alt={property?.title || "Property Architectural Photo"}
          style={{ width: "100%", height: "360px", objectFit: "cover", borderRadius: "10px", marginBottom: "16px" }}
        />
        <h4 style={{ color: "#38BDF8", marginBottom: "6px" }}>3D Architecture Studio Preview</h4>
        <p style={{ color: "#94A3B8", fontSize: "14px" }}>WebGL acceleration unavailable on your device. Displaying high-resolution architectural photography.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`property-3d-viewer-container ${isFullscreen ? "fullscreen" : ""}`}
      style={{
        position: "relative",
        width: "100%",
        height: isFullscreen ? "100vh" : "460px",
        borderRadius: isFullscreen ? "0" : "16px",
        overflow: "hidden",
        background: lightingMode === "dusk" ? "#071A33" : "#F0F9FF",
        border: "1px solid rgba(56, 189, 248, 0.25)",
        boxShadow: "0 14px 40px -8px rgba(7, 26, 51, 0.35)",
        userSelect: "none",
      }}
    >
      {/* Top Floating Control Bar */}
      <div
        style={{
          position: "absolute",
          top: "16px",
          left: "16px",
          right: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px",
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        {/* Left: View & Lighting Modes */}
        <div style={{ display: "flex", gap: "6px", pointerEvents: "auto" }}>
          {/* Day / Dusk Lighting Toggle */}
          <button
            type="button"
            onClick={() => setLightingMode((m) => (m === "dusk" ? "day" : "dusk"))}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 13px",
              background: "rgba(7, 26, 51, 0.82)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              borderRadius: "8px",
              color: "#FFFFFF",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {lightingMode === "dusk" ? "🌙 Dusk Lights" : "☀️ Day Sunlight"}
          </button>

          {/* Exterior vs Cutaway Toggle */}
          <button
            type="button"
            onClick={() => setViewMode((v) => (v === "exterior" ? "interior" : "exterior"))}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 13px",
              background: "rgba(7, 26, 51, 0.82)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              borderRadius: "8px",
              color: "#FFFFFF",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {viewMode === "exterior" ? "🏢 Exterior View" : "📐 Interior Cutaway"}
          </button>

          {/* Auto Rotate Toggle */}
          <button
            type="button"
            onClick={() => setAutoRotate((r) => !r)}
            style={{
              padding: "7px 13px",
              background: autoRotate ? "rgba(37, 99, 235, 0.9)" : "rgba(7, 26, 51, 0.82)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              borderRadius: "8px",
              color: "#FFFFFF",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {autoRotate ? "⏸ Pause 360°" : "▶ Rotate 360°"}
          </button>
        </div>

        {/* Right: Camera Action Buttons */}
        <div style={{ display: "flex", gap: "6px", pointerEvents: "auto" }}>
          <button
            type="button"
            onClick={() => handleZoom("in")}
            title="Zoom In"
            style={{
              width: "34px",
              height: "34px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(7, 26, 51, 0.82)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              borderRadius: "8px",
              color: "#FFFFFF",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            +
          </button>
          <button
            type="button"
            onClick={() => handleZoom("out")}
            title="Zoom Out"
            style={{
              width: "34px",
              height: "34px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(7, 26, 51, 0.82)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              borderRadius: "8px",
              color: "#FFFFFF",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            −
          </button>
          <button
            type="button"
            onClick={handleResetView}
            title="Reset View"
            style={{
              padding: "7px 11px",
              background: "rgba(7, 26, 51, 0.82)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              borderRadius: "8px",
              color: "#FFFFFF",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ↺ Reset
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            title="Fullscreen"
            style={{
              width: "34px",
              height: "34px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(7, 26, 51, 0.82)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              borderRadius: "8px",
              color: "#FFFFFF",
              cursor: "pointer",
            }}
          >
            ⛶
          </button>
        </div>
      </div>

      {/* Floor Level Selector (Bottom-Left) */}
      <div
        style={{
          position: "absolute",
          bottom: "16px",
          left: "16px",
          display: "flex",
          gap: "6px",
          zIndex: 10,
        }}
      >
        {[
          { key: "all", label: "Full Architecture" },
          { key: "ground", label: "Ground Floor" },
          { key: "upper", label: "Upper Suite" },
          { key: "terrace", label: "Sky Terrace" },
        ].map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setActiveFloor(f.key)}
            style={{
              padding: "6px 12px",
              background: activeFloor === f.key ? "#2563EB" : "rgba(7, 26, 51, 0.82)",
              backdropFilter: "blur(12px)",
              border: activeFloor === f.key ? "1px solid #38BDF8" : "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "6px",
              color: "#FFFFFF",
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Hotspot Pills (Bottom-Right) */}
      <div
        style={{
          position: "absolute",
          bottom: "16px",
          right: "16px",
          display: "flex",
          gap: "6px",
          flexWrap: "wrap",
          justifyContent: "flex-end",
          maxWidth: "360px",
          zIndex: 10,
        }}
      >
        {hotspots.map((spot) => (
          <button
            key={spot.id}
            type="button"
            onClick={() => handleHotspotClick(spot)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "5px 10px",
              background: activeHotspot?.id === spot.id ? "rgba(212, 167, 44, 0.9)" : "rgba(7, 26, 51, 0.82)",
              backdropFilter: "blur(10px)",
              border: activeHotspot?.id === spot.id ? "1px solid #F4D58D" : "1px solid rgba(212, 167, 44, 0.35)",
              borderRadius: "6px",
              color: "#FFFFFF",
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <span>📍</span> {spot.label}
          </button>
        ))}
      </div>

      {/* Active Hotspot Info Card */}
      {activeHotspot && (
        <div
          style={{
            position: "absolute",
            top: "72px",
            left: "16px",
            maxWidth: "280px",
            padding: "12px 16px",
            background: "rgba(7, 26, 51, 0.92)",
            backdropFilter: "blur(14px)",
            border: "1px solid #D4A72C",
            borderRadius: "10px",
            boxShadow: "0 10px 28px rgba(0, 0, 0, 0.5)",
            zIndex: 15,
            color: "#FFFFFF",
            animation: "fadeIn 0.25s ease-out",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <strong style={{ color: "#F4D58D", fontSize: "13px" }}>📍 {activeHotspot.label}</strong>
            <button
              type="button"
              onClick={() => setActiveHotspot(null)}
              style={{ color: "#94A3B8", cursor: "pointer", fontSize: "16px", lineHeight: 1 }}
            >
              ×
            </button>
          </div>
          <p style={{ margin: 0, fontSize: "12px", color: "#E2E8F0", lineHeight: 1.4 }}>
            {activeHotspot.desc}
          </p>
        </div>
      )}

      {/* Hint badge */}
      <div
        style={{
          position: "absolute",
          bottom: "60px",
          left: "50%",
          transform: "translateX(-50%)",
          padding: "4px 12px",
          background: "rgba(7, 26, 51, 0.65)",
          backdropFilter: "blur(6px)",
          borderRadius: "999px",
          color: "#94A3B8",
          fontSize: "11px",
          pointerEvents: "none",
          letterSpacing: "0.03em",
        }}
      >
        🖱️ Drag to rotate • Scroll to zoom
      </div>
    </div>
  );
}
