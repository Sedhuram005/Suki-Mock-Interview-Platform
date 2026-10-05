"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

interface GridDistortionProps {
  imageSrc: string;
  grid?: number;
  mouse?: number;
  strength?: number;
  relaxation?: number;
  className?: string;
}

const vertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform sampler2D uDataTexture;
uniform sampler2D uTexture;
uniform vec2 uUvScale;
varying vec2 vUv;

void main() {
  vec2 offset = texture2D(uDataTexture, vUv).rg;
  vec2 uv = (vUv - 0.5) * uUvScale + 0.5 - 0.02 * offset;
  gl_FragColor = texture2D(uTexture, uv);
}
`;

/** Mouse-reactive image background. Its canvas never captures page clicks. */
export default function GridDistortion({
  imageSrc,
  grid = 15,
  mouse = 0.1,
  strength = 0.15,
  relaxation = 0.9,
  className = "",
}: GridDistortionProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let animationFrame = 0;
    let texture: THREE.Texture | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.style.display = "block";
    container.replaceChildren(renderer.domElement);

    const camera = new THREE.OrthographicCamera(0, 0, 0, 0, -1000, 1000);
    camera.position.z = 2;

    const size = Math.max(2, Math.floor(grid));
    const data = new Float32Array(4 * size * size);
    const dataTexture = new THREE.DataTexture(
      data,
      size,
      size,
      THREE.RGBAFormat,
      THREE.FloatType,
    );
    dataTexture.needsUpdate = true;

    const uniforms = {
      uTexture: { value: null as THREE.Texture | null },
      uDataTexture: { value: dataTexture },
      // Crop the same way CSS background-size: cover does, preserving the image's aspect ratio.
      uUvScale: { value: new THREE.Vector2(1, 1) },
    };

    const material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
    });
    const geometry = new THREE.PlaneGeometry(1, 1, size - 1, size - 1);
    const plane = new THREE.Mesh(geometry, material);
    scene.add(plane);

    const resize = () => {
      if (disposed) return;
      const { width, height } = container.getBoundingClientRect();
      if (!width || !height) return;

      const containerAspect = width / height;
      renderer.setSize(width, height);
      plane.scale.set(containerAspect, 1, 1);
      camera.left = -containerAspect / 2;
      camera.right = containerAspect / 2;
      camera.top = 0.5;
      camera.bottom = -0.5;
      camera.updateProjectionMatrix();

      if (texture?.image) {
        const imageAspect = texture.image.width / texture.image.height;
        uniforms.uUvScale.value.set(
          imageAspect > containerAspect ? containerAspect / imageAspect : 1,
          imageAspect > containerAspect ? 1 : imageAspect / containerAspect,
        );
      }
    };

    const mouseState = { x: 0, y: 0, vx: 0, vy: 0, previousX: 0, previousY: 0 };
    const handlePointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      if (
        event.clientX < rect.left || event.clientX > rect.right ||
        event.clientY < rect.top || event.clientY > rect.bottom
      ) {
        mouseState.vx = 0;
        mouseState.vy = 0;
        return;
      }

      const x = (event.clientX - rect.left) / rect.width;
      const y = 1 - (event.clientY - rect.top) / rect.height;
      mouseState.vx = x - mouseState.previousX;
      mouseState.vy = y - mouseState.previousY;
      mouseState.x = x;
      mouseState.y = y;
      mouseState.previousX = x;
      mouseState.previousY = y;
    };
    const resetPointer = () => {
      mouseState.x = 0;
      mouseState.y = 0;
      mouseState.vx = 0;
      mouseState.vy = 0;
      mouseState.previousX = 0;
      mouseState.previousY = 0;
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("blur", resetPointer);
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);
    } else {
      window.addEventListener("resize", resize);
    }
    resize();

    const animate = () => {
      if (disposed) return;
      animationFrame = window.requestAnimationFrame(animate);

      for (let i = 0; i < size * size; i++) {
        data[i * 4] *= relaxation;
        data[i * 4 + 1] *= relaxation;
      }

      const gridMouseX = size * mouseState.x;
      const gridMouseY = size * mouseState.y;
      const maxDistance = size * mouse;
      for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
          const distance = Math.hypot(gridMouseX - x, gridMouseY - y);
          if (distance > 0 && distance < maxDistance) {
            const index = 4 * (x + size * y);
            const power = Math.min(maxDistance / distance, 10);
            data[index] += strength * 100 * mouseState.vx * power;
            data[index + 1] -= strength * 100 * mouseState.vy * power;
          }
        }
      }
      mouseState.vx *= 0.5;
      mouseState.vy *= 0.5;
      dataTexture.needsUpdate = true;
      if (uniforms.uTexture.value) renderer.render(scene, camera);
    };

    const loader = new THREE.TextureLoader();
    loader.load(
      imageSrc,
      (loadedTexture) => {
        if (disposed) {
          loadedTexture.dispose();
          return;
        }
        texture = loadedTexture;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        uniforms.uTexture.value = loadedTexture;
        resize();
        animationFrame = window.requestAnimationFrame(animate);
      },
      undefined,
      (error) => {
        console.error("Could not load the landing background image for GridDistortion.", error);
      },
    );

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("blur", resetPointer);
      window.removeEventListener("resize", resize);
      resizeObserver?.disconnect();
      texture?.dispose();
      dataTexture.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [grid, imageSrc, mouse, relaxation, strength]);

  return (
    <div
      ref={containerRef}
      className={`h-full w-full overflow-hidden ${className}`}
      aria-hidden="true"
    />
  );
}
