import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface Background3DProps {
  theme: "dark" | "light";
}

// ── tuning ────────────────────────────────────────────────────────────────────
const COLS = 80;
const ROWS = 60;
const WORLD_W = 2800;
const WORLD_D = 2200;
const WAVE_FREQ  = 0.0075;
const WAVE_AMP   = 32;
const WAVE_SPEED = 0.5;
const RIPPLE_R     = 350;
const RIPPLE_FORCE = 65;
const RIPPLE_DECAY = 0.85;

// module-level ripple energy buffer (survives StrictMode double-mount)
const rippleE = new Float32Array(COLS * ROWS);

// ─────────────────────────────────────────────────────────────────────────────
const Background3D: React.FC<Background3DProps> = ({ theme }) => {
  const mountRef  = useRef<HTMLDivElement>(null);
  const themeRef  = useRef(theme);
  const matRef    = useRef<THREE.PointsMaterial | null>(null);
  const rendRef   = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef  = useRef<THREE.Scene | null>(null);
  const aliveRef  = useRef(false);

  // ── hot-swap theme colours without rebuilding renderer ────────────────────
  useEffect(() => {
    themeRef.current = theme;
    const dark = theme === "dark";

    if (matRef.current) {
      matRef.current.color.set(dark ? 0x00ff87 : 0x00e676);
      matRef.current.opacity   = dark ? 0.90 : 0.75;
      matRef.current.blending  = THREE.NormalBlending;
      matRef.current.needsUpdate = true;
    }
    if (rendRef.current) {
      rendRef.current.setClearColor(dark ? 0x071d12 : 0xe2d5c3, 1);
    }
    if (sceneRef.current) {
      sceneRef.current.fog = dark
        ? new THREE.FogExp2(0x071d12, 0.0009)
        : new THREE.FogExp2(0xe2d5c3, 0.0011);
    }
  }, [theme]);

  // ── one-time Three.js scene setup ─────────────────────────────────────────
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const W = window.innerWidth;
    const H = window.innerHeight;
    const dark = themeRef.current === "dark";

    // Scene & fog
    const scene = new THREE.Scene();
    scene.fog = dark
      ? new THREE.FogExp2(0x071d12, 0.0009)
      : new THREE.FogExp2(0xe2d5c3, 0.0011);
    sceneRef.current = scene;

    // Camera — tilted so the grid fills the screen and extends to top header
    const camera = new THREE.PerspectiveCamera(55, W / H, 1, 4000);
    camera.position.set(0, 520, 500);
    camera.lookAt(0, -60, -200);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(W, H);
    renderer.setClearColor(dark ? 0x071d12 : 0xe2d5c3, 1);
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.top      = "0";
    renderer.domElement.style.left     = "0";
    renderer.domElement.style.width    = "100%";
    renderer.domElement.style.height   = "100%";
    el.appendChild(renderer.domElement);
    rendRef.current = renderer;

    // PlaneGeometry grid, rotated flat onto XZ plane and translated backward so it covers top header
    const geo = new THREE.PlaneGeometry(WORLD_W, WORLD_D, COLS - 1, ROWS - 1);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, -300);

    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    const N = posAttr.count;

    // Bake rest XZ positions once
    const bx = new Float32Array(N);
    const bz = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      bx[i] = posAttr.getX(i);
      bz[i] = posAttr.getZ(i);
    }

    // Soft-circle sprite
    const c2d = document.createElement("canvas");
    c2d.width = c2d.height = 32;
    const cx = c2d.getContext("2d")!;
    const grad = cx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0,    "rgba(255,255,255,1)");
    grad.addColorStop(0.4,  "rgba(255,255,255,0.55)");
    grad.addColorStop(1,    "rgba(255,255,255,0)");
    cx.fillStyle = grad;
    cx.fillRect(0, 0, 32, 32);
    const sprite = new THREE.CanvasTexture(c2d);

    // Material
    const mat = new THREE.PointsMaterial({
      color:       dark ? 0x00ff87 : 0x00e676,
      size:        dark ? 6.5 : 5.5,
      map:         sprite,
      transparent: true,
      opacity:     dark ? 0.90 : 0.75,
      depthWrite:  false,
      blending:    THREE.NormalBlending,
    });
    matRef.current = mat;
    scene.add(new THREE.Points(geo, mat));

    // Mouse / touch → world XZ projection via raycaster
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const xzP = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hit = new THREE.Vector3();
    let cX = 99999, cZ = 99999;
    let prevCX = 99999, prevCZ = 99999;
    let mouseSpeed = 0;

    const project = (nx: number, ny: number) => {
      ndc.set(nx, ny);
      ray.setFromCamera(ndc, camera);
      if (ray.ray.intersectPlane(xzP, hit)) { cX = hit.x; cZ = hit.z; }
    };
    const onMouse = (e: MouseEvent) =>
      project((e.clientX / W) * 2 - 1, -(e.clientY / H) * 2 + 1);
    const onTouch = (e: TouchEvent) => {
      if (!e.touches.length) return;
      project(
        (e.touches[0].clientX / W) * 2 - 1,
       -(e.touches[0].clientY / H) * 2 + 1
      );
    };
    window.addEventListener("mousemove", onMouse);
    window.addEventListener("touchmove", onTouch, { passive: true });

    // Resize
    const onResize = () => {
      const w = window.innerWidth, h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // Animation loop
    const arr = posAttr.array as Float32Array;
    let rafId = 0;
    let t = 0;
    aliveRef.current = true;

    const tick = () => {
      if (!aliveRef.current) return;
      rafId = requestAnimationFrame(tick);
      t += 0.016;

      // Track mouse movement speed for dynamic motion ripples
      if (prevCX !== 99999 && cX !== 99999) {
        const mdx = cX - prevCX;
        const mdz = cZ - prevCZ;
        const distMoved = Math.sqrt(mdx * mdx + mdz * mdz);
        mouseSpeed = mouseSpeed * 0.75 + distMoved * 0.25;
      } else {
        mouseSpeed = 0;
      }
      prevCX = cX;
      prevCZ = cZ;

      for (let i = 0; i < N; i++) {
        const x = bx[i], z = bz[i];

        // Ambient sine/cosine wave on Y axis
        const wave =
          Math.sin(x * WAVE_FREQ + t * WAVE_SPEED) * WAVE_AMP +
          Math.cos(z * WAVE_FREQ * 0.72 + t * WAVE_SPEED * 0.85) * (WAVE_AMP * 0.5);

        // Distance from cursor
        const dx = x - cX, dz = z - cZ;
        const d  = Math.sqrt(dx * dx + dz * dz);

        let popUp = 0;
        if (d < RIPPLE_R) {
          const p = 1 - d / RIPPLE_R;
          // Smooth pop-up dome under cursor (static elevation, no time oscillation)
          popUp = (p * p * (3 - 2 * p)) * RIPPLE_FORCE;

          // Motion ripple impulse ONLY when mouse is actively moving
          if (mouseSpeed > 0.8) {
            const motionImpulse = Math.sin(d * 0.04 - t * 5) * Math.min(mouseSpeed, 35) * 0.35 * (p * p);
            rippleE[i] = Math.max(rippleE[i], motionImpulse);
          }
        }

        // Decay motion ripples quickly so bouncing stops immediately when mouse stops
        rippleE[i] *= RIPPLE_DECAY;

        arr[i * 3 + 1] = wave + popUp + rippleE[i];
      }

      posAttr.needsUpdate = true;
      renderer.render(scene, camera);
    };

    // Pause when tab hidden
    const onVis = () => {
      if (document.visibilityState === "visible") {
        aliveRef.current = true;
        tick();
      } else {
        aliveRef.current = false;
        cancelAnimationFrame(rafId);
      }
    };
    document.addEventListener("visibilitychange", onVis);

    tick();

    // Cleanup
    return () => {
      aliveRef.current = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
      geo.dispose();
      mat.dispose();
      sprite.dispose();
      renderer.dispose();
      matRef.current   = null;
      rendRef.current  = null;
      sceneRef.current = null;
      if (el.contains(renderer.domElement)) {
        el.removeChild(renderer.domElement);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally runs once; theme handled above

  return (
    <div
      ref={mountRef}
      style={{
        position: "fixed",
        top:      0,
        left:     0,
        width:    "100vw",
        height:   "100vh",
        zIndex:   -1,
        overflow: "hidden",
        pointerEvents: "none",
        backgroundColor: theme === "dark" ? "#071d12" : "#e2d5c3",
        transition: "background-color 0.35s ease",
      }}
    />
  );
};

export default Background3D;
export { Background3D };
