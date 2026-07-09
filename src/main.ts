import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./style.css";

gsap.registerPlugin(ScrollTrigger);

const FRAME_COUNT = 180;
const framePath = (i: number) => `/egg/frame_${String(i).padStart(4, "0")}.jpg`;

// Scroll distance per frame, derived from the original 150-frame sequence
// pinned across 4 viewport heights. Kept constant so the scroll pacing
// (how far you scroll per frame change) doesn't shift when FRAME_COUNT does.
const SCROLL_VH_PER_FRAME = 4 / 150;

const canvas = document.getElementById("hero-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const mask = document.getElementById("hero-mask") as HTMLDivElement;
const textTop = document.querySelector(".text-top") as HTMLDivElement;
const textBottom = document.querySelector(".text-bottom") as HTMLDivElement;
const loader = document.getElementById("loader") as HTMLDivElement;
const loaderFill = document.getElementById("loader-fill") as HTMLDivElement;

const images: HTMLImageElement[] = [];

// The image scales continuously across the whole sequence (50% -> 1000%).
// The dissolve (blur / fade to section-2 color) kicks in starting at this frame.
const DISSOLVE_START_FRAME = 45;
const DISSOLVE_START = (DISSOLVE_START_FRAME - 1) / (FRAME_COUNT - 1);

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

const TEXT_COLOR_LIGHT: [number, number, number] = [255, 255, 255];
const TEXT_COLOR_DARK: [number, number, number] = [29, 29, 31]; // matches --ink

function mixColor(a: [number, number, number], b: [number, number, number], t: number) {
  const r = Math.round(lerp(a[0], b[0], t));
  const g = Math.round(lerp(a[1], b[1], t));
  const bl = Math.round(lerp(a[2], b[2], t));
  return `rgb(${r}, ${g}, ${bl})`;
}

function preloadImages(): Promise<void> {
  return new Promise((resolve) => {
    let loaded = 0;
    for (let i = 1; i <= FRAME_COUNT; i++) {
      const img = new Image();
      img.src = framePath(i);
      const onDone = () => {
        loaded++;
        loaderFill.style.width = `${(loaded / FRAME_COUNT) * 100}%`;
        if (loaded === FRAME_COUNT) resolve();
      };
      img.onload = onDone;
      img.onerror = onDone;
      images.push(img);
    }
  });
}

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawFrame(index: number) {
  const img = images[index];
  if (!img || !img.complete || img.naturalWidth === 0) return;

  const cw = window.innerWidth;
  const ch = window.innerHeight;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;

  const coverScale = Math.max(cw / iw, ch / ih);
  const dw = iw * coverScale;
  const dh = ih * coverScale;
  const dx = (cw - dw) / 2;
  const dy = (ch - dh) / 2;

  ctx.clearRect(0, 0, cw, ch);
  ctx.drawImage(img, dx, dy, dw, dh);
}

function updateHero(progress: number) {
  const frameIndex = clamp(Math.round(progress * (FRAME_COUNT - 1)), 0, FRAME_COUNT - 1);
  drawFrame(frameIndex);

  const scale = lerp(0.5, 10, progress);

  let blur = 0;
  let maskOpacity = 0;
  let canvasOpacity = 1;

  if (progress > DISSOLVE_START) {
    const t = (progress - DISSOLVE_START) / (1 - DISSOLVE_START);
    blur = lerp(0, 60, t);
    maskOpacity = lerp(0, 1, t);
    canvasOpacity = lerp(1, 0, clamp((t - 0.7) / 0.3, 0, 1));
  }

  canvas.style.transform = `translate(-50%, -50%) scale(${scale})`;
  canvas.style.filter = blur > 0 ? `blur(${blur}px)` : "none";
  canvas.style.opacity = `${canvasOpacity}`;
  mask.style.opacity = `${maskOpacity}`;

  // Text glides from screen-centered to left-aligned, landing at 1/8 of the
  // viewport width exactly when the sequence completes (progress === 1).
  const left = lerp(50, 12.5, progress);
  const xPercent = lerp(-50, 0, progress);
  const transform = `translate(${xPercent}%, 0)`;
  const textColor = mixColor(TEXT_COLOR_LIGHT, TEXT_COLOR_DARK, maskOpacity);
  textTop.style.left = `${left}%`;
  textTop.style.transform = transform;
  textTop.style.color = textColor;
  textBottom.style.left = `${left}%`;
  textBottom.style.transform = transform;
  textBottom.style.color = textColor;
}

async function init() {
  resizeCanvas();
  updateHero(0);

  await preloadImages();
  updateHero(0);
  loader.classList.add("is-hidden");

  ScrollTrigger.create({
    trigger: "#section1",
    start: "top top",
    end: `+=${window.innerHeight * SCROLL_VH_PER_FRAME * FRAME_COUNT}`,
    pin: true,
    scrub: 1,
    onUpdate: (self) => updateHero(self.progress),
  });

  window.addEventListener("resize", () => {
    resizeCanvas();
    ScrollTrigger.refresh();
  });
}

init();
