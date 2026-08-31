// @ts-nocheck — three types incomplete in local @types/three (same as Hyperspeed).
"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type Props = {
  /** subtle = soft ambient; rich = denser particles + stronger glow */
  intensity?: "subtle" | "rich";
  className?: string;
};

/**
 * Lightweight Three.js ambient field.
 * subtle: nebula glow + particle depth; rich: particles only on pure black (chat/products).
 */
export default function FuturisticCanvas({ intensity = "subtle", className = "" }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const rich = intensity === "rich";
    const particleCount = rich ? 900 : 420;
    const dprCap = rich ? 1.75 : 1.35;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, rich ? 0.045 : 0.055);

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 80);
    camera.position.set(0, 0.15, 6.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
    host.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, {
      width: "100%",
      height: "100%",
      display: "block",
    });

    // Soft nebula + horizon grid — subtle only.
    // Rich (/chat,/products): pure black + particles; no ambient planes/grid motion.
    const nebulaGroup = new THREE.Group();
    const nebulaMats: THREE.MeshBasicMaterial[] = [];
    let gridHelper: THREE.GridHelper | null = null;
    if (!rich) {
      scene.add(nebulaGroup);
      const nebulaColors = [0x2563eb, 0x0ea5e9, 0x6366f1];
      for (let i = 0; i < nebulaColors.length; i += 1) {
        const nMat = new THREE.MeshBasicMaterial({
          color: nebulaColors[i],
          transparent: true,
          opacity: 0.045,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        nebulaMats.push(nMat);
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), nMat);
        mesh.position.set((i - 1.2) * 1.8, (i % 2) * 0.6 - 0.2, -2.5 - i * 0.55);
        mesh.rotation.z = (i * 0.35) % Math.PI;
        nebulaGroup.add(mesh);
      }

      gridHelper = new THREE.GridHelper(24, 24, 0x1e3a5f, 0x0f172a);
      gridHelper.position.y = -3.2;
      const gridMats = Array.isArray(gridHelper.material)
        ? gridHelper.material
        : [gridHelper.material];
      for (const m of gridMats) {
        m.transparent = true;
        m.opacity = 0.16;
      }
      scene.add(gridHelper);
    }

    // Particle field — rich: larger ambient dots with Brownian X/Y drift
    const positions = new Float32Array(particleCount * 3);
    const velX = new Float32Array(particleCount);
    const velY = new Float32Array(particleCount);
    const driftPhase = new Float32Array(particleCount);
    const boundsX = 9;
    const boundsY = 6;
    for (let i = 0; i < particleCount; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 18;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 14 - 2;
      if (rich) {
        const speed = 0.08 + Math.random() * 0.22;
        const angle = Math.random() * Math.PI * 2;
        velX[i] = Math.cos(angle) * speed;
        velY[i] = Math.sin(angle) * speed;
        driftPhase[i] = Math.random() * Math.PI * 2;
      } else {
        velX[i] = 0;
        velY[i] = 0.15 + Math.random() * 0.55;
        driftPhase[i] = 0;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: rich ? 0xc8ecff : 0x93c5fd,
      size: rich ? 0.085 : 0.028,
      transparent: true,
      opacity: rich ? 0.88 : 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    let raf = 0;
    let running = true;
    let w = 1;
    let h = 1;
    const clock = new THREE.Clock();

    const resize = () => {
      w = host.clientWidth || 1;
      h = host.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    resize();

    const onVisibility = () => {
      running = document.visibilityState === "visible";
      if (running && !raf) raf = requestAnimationFrame(tick);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(host);
    document.addEventListener("visibilitychange", onVisibility);

    const tick = () => {
      raf = 0;
      if (!running) return;
      const t = clock.getElapsedTime();

      // Subtle only: nebula breath + scrolling grid (rich keeps static black)
      if (!rich) {
        const breath = 1 + Math.sin(t * 0.55) * 0.025;
        nebulaGroup.scale.setScalar(breath);
        nebulaGroup.rotation.z = Math.sin(t * 0.08) * 0.04;
        for (let i = 0; i < nebulaMats.length; i += 1) {
          nebulaMats[i].opacity = 0.035 + Math.sin(t * 0.4 + i) * 0.015;
        }
        if (gridHelper) {
          gridHelper.position.z = ((t * 0.35) % 1.2) - 0.6;
        }
      }

      const pos = geo.getAttribute("position") as THREE.BufferAttribute;
      if (rich) {
        for (let i = 0; i < particleCount; i += 1) {
          // Slow random walk: nudge velocity, then integrate
          const phase = driftPhase[i] + t * (0.35 + (i % 7) * 0.04);
          velX[i] += Math.sin(phase) * 0.0022 + (Math.random() - 0.5) * 0.0035;
          velY[i] += Math.cos(phase * 0.87) * 0.0022 + (Math.random() - 0.5) * 0.0035;
          // Soft speed cap so motion stays ambient
          const sp = Math.hypot(velX[i], velY[i]);
          const maxSp = 0.32;
          if (sp > maxSp) {
            velX[i] = (velX[i] / sp) * maxSp;
            velY[i] = (velY[i] / sp) * maxSp;
          }
          let x = pos.getX(i) + velX[i] * 0.012;
          let y = pos.getY(i) + velY[i] * 0.012;
          if (x > boundsX) {
            x = boundsX;
            velX[i] *= -1;
          } else if (x < -boundsX) {
            x = -boundsX;
            velX[i] *= -1;
          }
          if (y > boundsY) {
            y = boundsY;
            velY[i] *= -1;
          } else if (y < -boundsY) {
            y = -boundsY;
            velY[i] *= -1;
          }
          pos.setX(i, x);
          pos.setY(i, y);
        }
      } else {
        for (let i = 0; i < particleCount; i += 1) {
          let y = pos.getY(i) + velY[i] * 0.0045;
          if (y > 6) y = -6;
          pos.setY(i, y);
        }
        points.rotation.y = t * 0.02;
      }
      pos.needsUpdate = true;

      camera.position.x = 0;
      camera.position.y = 0.15;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      geo.dispose();
      mat.dispose();
      for (const m of nebulaMats) m.dispose();
      if (gridHelper) {
        const gMats = Array.isArray(gridHelper.material)
          ? gridHelper.material
          : [gridHelper.material];
        for (const m of gMats) m.dispose();
        gridHelper.geometry?.dispose?.();
      }
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, [intensity]);

  return (
    <div
      ref={hostRef}
      className={`absolute inset-0 ${className}`.trim()}
      aria-hidden
    />
  );
}
