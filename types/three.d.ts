/** Minimal declarations for the Three.js API surface used by GridDistortion. */
declare module "three" {
  export const SRGBColorSpace: string;
  export const DoubleSide: number;
  export const RGBAFormat: number;
  export const FloatType: number;
  export const LinearFilter: number;
  export const ClampToEdgeWrapping: number;

  export class Vector2 {
    constructor(x?: number, y?: number);
    set(x: number, y: number): this;
  }

  export class Vector3 {
    x: number;
    y: number;
    z: number;
    set(x: number, y: number, z: number): this;
  }

  export class Scene {
    add(object: Mesh): void;
  }

  export class OrthographicCamera {
    constructor(left: number, right: number, top: number, bottom: number, near: number, far: number);
    left: number;
    right: number;
    top: number;
    bottom: number;
    position: Vector3;
    updateProjectionMatrix(): void;
  }

  export class DataTexture {
    constructor(data: Float32Array, width: number, height: number, format: number, type: number);
    needsUpdate: boolean;
    dispose(): void;
  }

  export class Texture {
    image: { width: number; height: number };
    colorSpace: string;
    minFilter: number;
    magFilter: number;
    wrapS: number;
    wrapT: number;
    dispose(): void;
  }

  export class TextureLoader {
    load(
      url: string,
      onLoad: (texture: Texture) => void,
      onProgress?: (event: ProgressEvent<EventTarget>) => void,
      onError?: (error: unknown) => void,
    ): Texture;
  }

  export class ShaderMaterial {
    constructor(parameters: {
      side?: number;
      uniforms?: Record<string, { value: unknown }>;
      vertexShader?: string;
      fragmentShader?: string;
      transparent?: boolean;
    });
    dispose(): void;
  }

  export class PlaneGeometry {
    constructor(width: number, height: number, widthSegments?: number, heightSegments?: number);
    dispose(): void;
  }

  export class Mesh {
    constructor(geometry: PlaneGeometry, material: ShaderMaterial);
    scale: Vector3;
  }

  export class WebGLRenderer {
    constructor(parameters?: {
      antialias?: boolean;
      alpha?: boolean;
      powerPreference?: "high-performance" | "low-power" | "default";
    });
    outputColorSpace: string;
    domElement: HTMLCanvasElement;
    setPixelRatio(value: number): void;
    setClearColor(color: number, alpha?: number): void;
    setSize(width: number, height: number): void;
    render(scene: Scene, camera: OrthographicCamera): void;
    dispose(): void;
    forceContextLoss(): void;
  }
}
