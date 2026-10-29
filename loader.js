import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

const MODEL_URL = "models/sindicato-logo-opt.glb";
const MIN_MS = 2800;
const MIN_MS_REDUCED = 800;
const FADE_MS = 500;
const ROTATE_Y = 1.45;
const NAVY = 0x102b53;
const NAVY_DEEP = 0x0b1f3d;
const BLUE = 0x254b79;
const GOLD = 0xc7a15c;
const PAPER = 0xf8f7f3;

const overlay = document.querySelector("#boot-overlay");
const canvas = document.querySelector("#logo-3d");
const poster = document.querySelector(".logo-3d-poster");
const bar = document.querySelector(".boot-progress-bar");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const minVisible = reduceMotion ? MIN_MS_REDUCED : MIN_MS;
const startedAt = performance.now();
const modelBytesPromise = window.__STS_GLB || fetch(MODEL_URL).then(readBytes);

if (!overlay || !canvas) {
  document.documentElement.classList.remove("is-booting");
} else {
  boot();
}

function readBytes(response) {
  if (!response.ok) throw new Error(`No se pudo leer el emblema (${response.status})`);
  return response.arrayBuffer();
}

function easeOut(t) {
  return 1 - (1 - t) * (1 - t);
}

function setProgress(value) {
  if (!bar) return;
  const pct = Math.max(0, Math.min(100, value));
  bar.style.transform = `scaleX(${pct / 100})`;
  overlay?.setAttribute("aria-valuenow", String(Math.round(pct)));
}

function dismiss() {
  setProgress(100);
  overlay.classList.add("is-done");
  overlay.setAttribute("aria-busy", "false");
  const done = () => {
    overlay.remove();
    document.documentElement.classList.remove("is-booting");
  };
  overlay.addEventListener("transitionend", done, { once: true });
  window.setTimeout(done, FADE_MS + 80);
}

function waitForMinTime() {
  const elapsed = performance.now() - startedAt;
  return new Promise((resolve) => window.setTimeout(resolve, Math.max(0, minVisible - elapsed)));
}

async function boot() {
  const tickProgress = () => {
    const t = Math.min(1, (performance.now() - startedAt) / minVisible);
    setProgress(easeOut(t) * 100);
    if (t < 1 && overlay.isConnected) window.requestAnimationFrame(tickProgress);
  };
  tickProgress();

  const emblemReady = mountEmblem().catch((error) => {
    console.warn("No se pudo montar el emblema 3D.", error);
  });

  await waitForMinTime();
  await Promise.race([
    emblemReady,
    new Promise((resolve) => window.setTimeout(resolve, 120)),
  ]);
  dismiss();
}

function paintEmblem(mat) {
  mat.side = THREE.DoubleSide;
  mat.color?.set(NAVY);
  mat.map = null;
  mat.metalnessMap = null;
  mat.normalMap = null;
  mat.roughnessMap = null;
  mat.emissiveMap = null;
  if ("metalness" in mat) mat.metalness = 0.62;
  if ("roughness" in mat) mat.roughness = 0.38;
  if ("emissive" in mat) {
    mat.emissive.set(BLUE);
    mat.emissiveIntensity = 0.18;
  }
  mat.needsUpdate = true;
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(label)), ms);
    }),
  ]);
}

async function mountEmblem() {
  const rect = canvas.getBoundingClientRect();
  const cssSize = Math.round(rect.width) || 240;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.debug.checkShaderErrors = false;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(cssSize, cssSize, false);
  renderer.setClearColor(PAPER, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 20);

  scene.add(new THREE.HemisphereLight(PAPER, NAVY_DEEP, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(1.4, 1.8, 2.4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(BLUE, 0.85);
  fill.position.set(-2, 0.5, 1.5);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(GOLD, 0.55);
  rim.position.set(0.1, -0.4, -2);
  scene.add(rim);

  const buffer = await withTimeout(modelBytesPromise, 2500, "timeout-glb");
  if (MeshoptDecoder.ready) {
    await withTimeout(Promise.resolve(MeshoptDecoder.ready), 1500, "timeout-decoder").catch(() => {});
  }

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await withTimeout(loader.parseAsync(buffer, ""), 2500, "timeout-parse");

  const emblem = gltf.scene;
  emblem.traverse((node) => {
    if (!node.isMesh || !node.material) return;
    node.castShadow = false;
    node.receiveShadow = false;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach(paintEmblem);
  });

  const box = new THREE.Box3().setFromObject(emblem);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  emblem.position.sub(center);
  emblem.rotation.y = 0.55;
  scene.add(emblem);

  const span = Math.max(size.x, size.y);
  const dist = ((span * 0.5) / Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5))) * 1.18;
  camera.position.set(0, size.y * 0.02, dist);
  camera.lookAt(0, 0, 0);

  renderer.compile(scene, camera);
  renderer.render(scene, camera);
  canvas.classList.add("is-ready");
  window.setTimeout(() => {
    if (poster) poster.hidden = true;
  }, 280);

  let frame = 0;
  const clock = new THREE.Clock();
  const tick = () => {
    if (!overlay.isConnected) {
      renderer.dispose();
      return;
    }
    const delta = clock.getDelta();
    if (!reduceMotion) emblem.rotation.y += ROTATE_Y * delta;
    renderer.render(scene, camera);
    frame = window.requestAnimationFrame(tick);
  };
  frame = window.requestAnimationFrame(tick);

  return {
    dispose() {
      window.cancelAnimationFrame(frame);
      renderer.dispose();
    },
  };
}
