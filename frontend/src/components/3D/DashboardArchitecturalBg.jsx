import React, { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * DashboardArchitecturalBg
 * Subtle, luxury architectural 3D background behind the dashboard hero.
 * Features an isometric blueprint grid and minimalist architectural pavilion
 * with royal-blue/sky-blue ambient lighting and smooth continuous drift.
 * Completely lightweight, automatically disposed on unmount.
 */
export default function DashboardArchitecturalBg({ height = 180 }) {
  const containerRef = useRef(null);

  useEffect(() => {
    // Check reduced motion
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const h = container.clientHeight || height;

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / h, 0.1, 100);
    camera.position.set(12, 10, 14);
    camera.lookAt(0, 1, 0);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
      renderer.setSize(width, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      container.appendChild(renderer.domElement);
    } catch (e) {
      console.warn("WebGL not supported for background canvas", e);
      return;
    }

    // Grid Floor
    const gridHelper = new THREE.GridHelper(24, 24, 0x38bdf8, 0x1e3a8a);
    gridHelper.position.y = -0.5;
    gridHelper.material.opacity = 0.25;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

    // Architectural Building Group
    const buildingGroup = new THREE.Group();

    // High-contrast, premium materials
    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc, // Crisp Soft White
      roughness: 0.3,
      metalness: 0.15,
    });

    const darkAccentMat = new THREE.MeshStandardMaterial({
      color: 0x0b2545, // Deep Navy architectural contrast
      roughness: 0.5,
      metalness: 0.2,
    });

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8, // Sky Blue Glass
      transparent: true,
      opacity: 0.7,
      roughness: 0.05,
      metalness: 0.85,
    });

    const goldAccentMat = new THREE.MeshStandardMaterial({
      color: 0xd4a72c, // Rich Gold Accent
      roughness: 0.2,
      metalness: 0.9,
    });

    // Main Pavilion Volume (Crisp white modern facade)
    const mainBox = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.6, 3.2), concreteMat);
    mainBox.position.set(0, 1.3, 0);
    buildingGroup.add(mainBox);

    // Glass cantilever floor (Sky Blue glass with interior warm glow)
    const glassFloor = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.3, 3.6), glassMat);
    glassFloor.position.set(0.4, 2.95, 0.3);
    buildingGroup.add(glassFloor);

    // Balcony rails / gold edge
    const edgeBox = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.1, 3.7), goldAccentMat);
    edgeBox.position.set(0.4, 3.65, 0.3);
    buildingGroup.add(edgeBox);

    // Side annex (Navy foundation block)
    const annexBox = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.9, 2.6), darkAccentMat);
    annexBox.position.set(-3.4, 0.95, 0);
    buildingGroup.add(annexBox);

    // Gold decorative roof cap
    const roofCap = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.08, 2.7), goldAccentMat);
    roofCap.position.set(-3.4, 1.95, 0);
    buildingGroup.add(roofCap);

    // Wireframe edges on main structure for architectural CAD blueprint effect
    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(4.2, 2.6, 3.2));
    const lineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 });
    const lineMesh = new THREE.LineSegments(edges, lineMat);
    lineMesh.position.set(0, 1.3, 0);
    buildingGroup.add(lineMesh);

    scene.add(buildingGroup);

    // Vivid Lighting setup
    const ambientLight = new THREE.AmbientLight(0xe0f2fe, 1.8);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 3.0);
    dirLight1.position.set(12, 16, 10);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xd4a72c, 2.2);
    dirLight2.position.set(-10, 8, -6);
    scene.add(dirLight2);

    let animationId;
    let isVisible = true;

    // Intersection observer to pause rendering when offscreen
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        isVisible = entry.isIntersecting;
      });
    });
    observer.observe(container);

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      if (!isVisible) return;

      buildingGroup.rotation.y += 0.0035;
      gridHelper.rotation.y += 0.001;
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container || !renderer) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight || height;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      observer.disconnect();
      cancelAnimationFrame(animationId);
      if (renderer?.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer?.dispose();
    };
  }, [height]);

  return (
    <div
      ref={containerRef}
      className="dashboard-architectural-bg-container"
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        width: "60%",
        maxWidth: "600px",
        pointerEvents: "none",
        overflow: "hidden",
        opacity: 1,
        zIndex: 1,
      }}
    />
  );
}
