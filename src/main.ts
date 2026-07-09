import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./style.css";

gsap.registerPlugin(ScrollTrigger);

// Scroll distance per frame, derived from an original 150-frame sequence
// pinned across 4 viewport heights. Kept constant so the scroll pacing
// (how far you scroll per frame change) stays the same across sections
// regardless of how many frames a given sequence actually has.
const SCROLL_VH_PER_FRAME = 4 / 150;

// Section 2 gets twice as much scroll distance per frame as section 1 -
// same frame sequence, but the viewer spends twice as long moving through it.
const S2_SCROLL_MULTIPLIER = 2;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function frameToProgress(frame: number, frameCount: number) {
  return (frame - 1) / (frameCount - 1);
}

function preloadImages(basePath: string, count: number, onProgress: (loaded: number) => void): Promise<HTMLImageElement[]> {
  const images: HTMLImageElement[] = [];
  return new Promise((resolve) => {
    let loaded = 0;
    for (let i = 1; i <= count; i++) {
      const img = new Image();
      img.src = `${basePath}/frame_${String(i).padStart(4, "0")}.jpg`;
      const onDone = () => {
        loaded++;
        onProgress(loaded);
        if (loaded === count) resolve(images);
      };
      img.onload = onDone;
      img.onerror = onDone;
      images.push(img);
    }
  });
}

function resizeCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawFrame(ctx: CanvasRenderingContext2D, img: HTMLImageElement | undefined) {
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

const loader = document.getElementById("loader") as HTMLDivElement;
const loaderFill = document.getElementById("loader-fill") as HTMLDivElement;

const textTop = document.querySelector(".text-top") as HTMLDivElement;
const textBottom = document.querySelector(".text-bottom") as HTMLDivElement;
const textSecond = document.querySelector(".text-second") as HTMLParagraphElement;
const textSecondRight = document.querySelector(".text-second-right") as HTMLParagraphElement;
const textThird = document.querySelector(".text-third") as HTMLParagraphElement;
const titleEl = textTop.querySelector(".hero-title") as HTMLElement;
const subtitleEl = textTop.querySelector(".hero-subtitle") as HTMLElement;

// ---------------------------------------------------------------------------
// Section 1: single-egg sequence (canvas scrub + continuous scale + dissolve)
// ---------------------------------------------------------------------------

const S1_FRAME_COUNT = 180;
const S1_DISSOLVE_START_FRAME = 45;
const S1_DISSOLVE_START = frameToProgress(S1_DISSOLVE_START_FRAME, S1_FRAME_COUNT);

const s1Canvas = document.getElementById("hero-canvas") as HTMLCanvasElement;
const s1Ctx = s1Canvas.getContext("2d")!;
const s1Mask = document.getElementById("hero-mask") as HTMLDivElement;
let s1Images: HTMLImageElement[] = [];

function updateSection1(progress: number) {
  const frameIndex = clamp(Math.round(progress * (S1_FRAME_COUNT - 1)), 0, S1_FRAME_COUNT - 1);
  drawFrame(s1Ctx, s1Images[frameIndex]);

  const scale = lerp(0.5, 10, progress);

  let blur = 0;
  let maskOpacity = 0;
  let canvasOpacity = 1;

  if (progress > S1_DISSOLVE_START) {
    const t = (progress - S1_DISSOLVE_START) / (1 - S1_DISSOLVE_START);
    blur = lerp(0, 60, t);
    maskOpacity = lerp(0, 1, t);
    canvasOpacity = lerp(1, 0, clamp((t - 0.7) / 0.3, 0, 1));
  }

  s1Canvas.style.transform = `translate(-50%, -50%) scale(${scale})`;
  s1Canvas.style.filter = blur > 0 ? `blur(${blur}px)` : "none";
  s1Canvas.style.opacity = `${canvasOpacity}`;
  s1Mask.style.opacity = `${maskOpacity}`;

  // Text glides from screen-centered to left-aligned, landing at 1/8 of the
  // viewport width exactly when the sequence completes (progress === 1).
  const left = lerp(50, 12.5, progress);
  const xPercent = lerp(-50, 0, progress);
  const transform = `translate(${xPercent}%, 0)`;
  textTop.style.left = `${left}%`;
  textTop.style.transform = transform;
  textBottom.style.left = `${left}%`;
  textBottom.style.transform = transform;
}

// ---------------------------------------------------------------------------
// Section 2: many-eggs sequence (canvas scrub + focus pull) + text handoff
// ---------------------------------------------------------------------------

const S2_FRAME_COUNT = 150;
const S2_MAX_BLUR = 28;
const S2_CLEAR_BY = frameToProgress(51, S2_FRAME_COUNT);
const S2_REVEAL_END = frameToProgress(20, S2_FRAME_COUNT);
const S2_FADE_TO_BLACK_START = frameToProgress(131, S2_FRAME_COUNT);

// Text choreography frame marks (see spec: content text consolidates under
// the subtitle, the whole first-batch group rises and fades, then a second
// line fades in on the left, rises to where the first batch vanished, and
// fades out).
const P_CONSOLIDATE_END = frameToProgress(20, S2_FRAME_COUNT);
const P_GROUP_FADE_END = frameToProgress(50, S2_FRAME_COUNT);
const P_SECOND_FADE_IN_START = frameToProgress(55, S2_FRAME_COUNT);
const P_SECOND_FADE_IN_END = frameToProgress(65, S2_FRAME_COUNT);
const P_SECOND_MOVE_START = frameToProgress(70, S2_FRAME_COUNT);
const P_SECOND_MOVE_END = frameToProgress(80, S2_FRAME_COUNT);
const P_SECOND_FADE_OUT_START = frameToProgress(120, S2_FRAME_COUNT);
const P_SECOND_FADE_OUT_END = frameToProgress(150, S2_FRAME_COUNT);

const FIRST_BATCH_RISE_VH = 10;

const s2Canvas = document.getElementById("section2-canvas") as HTMLCanvasElement;
const s2Ctx = s2Canvas.getContext("2d")!;
let s2Images: HTMLImageElement[] = [];

// Pixel measurements for the text handoff, derived from static layout rules
// (title's top offset, the title/subtitle gap, content's resting height) so
// they stay correct across viewport sizes without depending on whatever
// mid-animation transform is currently applied.
let titleTopPx = 0;
let consolidatedContentTopPx = 0;
let contentInitialTopPx = 0;
let vanishTopPx = 0;
let secondInitialTopPx = 0;
let secondRightInitialTopPx = 0;

function measureTextLayout() {
  const titleRect = titleEl.getBoundingClientRect();
  const subtitleRect = subtitleEl.getBoundingClientRect();
  const contentHeight = textBottom.getBoundingClientRect().height;
  const secondHeight = textSecond.getBoundingClientRect().height;
  const secondRightHeight = textSecondRight.getBoundingClientRect().height;

  titleTopPx = titleRect.top;
  const titleSubtitleGapPx = subtitleRect.top - titleRect.bottom;
  consolidatedContentTopPx = subtitleRect.bottom + titleSubtitleGapPx;
  contentInitialTopPx = window.innerHeight - window.innerHeight / 9 - contentHeight;

  const risePx = (window.innerHeight * FIRST_BATCH_RISE_VH) / 100;
  vanishTopPx = titleTopPx - risePx;

  secondInitialTopPx = (window.innerHeight - secondHeight) / 2;
  secondRightInitialTopPx = (window.innerHeight - secondRightHeight) / 2;
}

function updateSection2(progress: number) {
  const frameIndex = clamp(Math.round(progress * (S2_FRAME_COUNT - 1)), 0, S2_FRAME_COUNT - 1);
  drawFrame(s2Ctx, s2Images[frameIndex]);

  const clarityT = clamp(progress / S2_CLEAR_BY, 0, 1);
  const blur = lerp(S2_MAX_BLUR, 0, clarityT);
  s2Canvas.style.filter = blur > 0.1 ? `blur(${blur}px)` : "none";

  // Section 2 is already fully "arrived" the instant section 1 ends - it
  // doesn't need extra scrolling to reveal itself. It just starts as pure
  // black (matching section 1's dissolved end state) and fades in over the
  // first 20 frames, independent of the longer focus-pull blur above. It
  // then fades back to black over the last 20 frames to close the sequence.
  const revealT = clamp(progress / S2_REVEAL_END, 0, 1);
  const fadeToBlackT = clamp((progress - S2_FADE_TO_BLACK_START) / (1 - S2_FADE_TO_BLACK_START), 0, 1);
  s2Canvas.style.opacity = `${revealT * (1 - fadeToBlackT)}`;

  // Phase 1 (frame 1-20): content text rises to sit just under the subtitle.
  const consolidateT = clamp(progress / P_CONSOLIDATE_END, 0, 1);
  const contentTop = lerp(contentInitialTopPx, consolidatedContentTopPx, consolidateT);
  textBottom.style.bottom = "auto";
  textBottom.style.top = `${contentTop}px`;

  // Phase 2 (frame 20-50): the whole group rises further and fades out together.
  const groupT = clamp((progress - P_CONSOLIDATE_END) / (P_GROUP_FADE_END - P_CONSOLIDATE_END), 0, 1);
  const groupOpacity = 1 - groupT;
  const groupRisePx = lerp(0, titleTopPx - vanishTopPx, groupT);
  const groupTransform = `translateY(-${groupRisePx}px)`;
  textTop.style.opacity = `${groupOpacity}`;
  textTop.style.transform = groupTransform;
  textBottom.style.opacity = `${groupOpacity}`;
  textBottom.style.transform = groupTransform;

  // Phase 3 (frame 60-70 fade in, 75-90 move up, 90-120 fade out).
  const secondFadeInT = clamp((progress - P_SECOND_FADE_IN_START) / (P_SECOND_FADE_IN_END - P_SECOND_FADE_IN_START), 0, 1);
  const secondMoveT = clamp((progress - P_SECOND_MOVE_START) / (P_SECOND_MOVE_END - P_SECOND_MOVE_START), 0, 1);
  const secondFadeOutT = clamp((progress - P_SECOND_FADE_OUT_START) / (P_SECOND_FADE_OUT_END - P_SECOND_FADE_OUT_START), 0, 1);

  let secondOpacity = 0;
  if (progress < P_SECOND_FADE_IN_START) {
    secondOpacity = 0;
  } else if (progress < P_SECOND_FADE_IN_END) {
    secondOpacity = secondFadeInT;
  } else if (progress < P_SECOND_MOVE_END) {
    secondOpacity = 1;
  } else {
    secondOpacity = 1 - secondFadeOutT;
  }

  const secondTop = lerp(secondInitialTopPx, vanishTopPx, secondMoveT);
  textSecond.style.opacity = `${secondOpacity}`;
  textSecond.style.top = `${secondTop}px`;

  const secondRightTop = lerp(secondRightInitialTopPx, vanishTopPx, secondMoveT);
  textSecondRight.style.opacity = `${secondOpacity}`;
  textSecondRight.style.top = `${secondRightTop}px`;
}

// ---------------------------------------------------------------------------
// Section 3: white-eggs still image, scroll-scrubbed width + parallax text
// ---------------------------------------------------------------------------

// The wrap is a normal (unpinned) 100vh block, so its own entrance and exit
// come for free from ordinary document flow: scrolling it from fully below
// the viewport to top-at-top takes exactly one viewport height, and from
// top-at-top to fully above takes another. A single ScrollTrigger spanning
// "top bottom" -> "bottom top" therefore gives one continuous 0-1 progress
// where 0.5 lands exactly on "top reaches the top of the screen".
const S3_TOP_REACHED = 0.5;
// "90% exited": 90% of a further one-viewport-height exit, i.e. 0.5 + 0.9 * 0.5.
const S3_MOSTLY_EXITED = S3_TOP_REACHED + 0.9 * (1 - S3_TOP_REACHED);

const S3_TEXT_FADE_IN_START = S3_TOP_REACHED * 0.5; // image 50% slid in
const S3_TEXT_FADE_IN_END = S3_TOP_REACHED * 0.75; // image 75% slid in

const s3ImageWrap = document.getElementById("section3-image-wrap") as HTMLDivElement;

let s3TextInitialTopPx = 0;
let s3TextTargetTopPx = 0;

function measureSection3Layout() {
  const textHeight = textThird.getBoundingClientRect().height;
  s3TextInitialTopPx = window.innerHeight - window.innerHeight / 4 - textHeight;
  s3TextTargetTopPx = (window.innerHeight * 2) / 5;
}

function updateSection3(progress: number) {
  let widthVw: number;
  if (progress <= S3_TOP_REACHED) {
    widthVw = lerp(130, 120, progress / S3_TOP_REACHED);
  } else {
    const t = clamp((progress - S3_TOP_REACHED) / (S3_MOSTLY_EXITED - S3_TOP_REACHED), 0, 1);
    widthVw = lerp(120, 100, t);
  }
  s3ImageWrap.style.width = `${widthVw}vw`;

  const fadeT = clamp(
    (progress - S3_TEXT_FADE_IN_START) / (S3_TEXT_FADE_IN_END - S3_TEXT_FADE_IN_START),
    0,
    1,
  );
  textThird.style.opacity = `${fadeT}`;

  // Constant speed throughout: the same per-progress rate established while
  // sliding up to the target continues unchanged as it slides back out.
  const top = lerp(s3TextInitialTopPx, s3TextTargetTopPx, progress / S3_TOP_REACHED);
  textThird.style.top = `${top}px`;
}

// ---------------------------------------------------------------------------

async function init() {
  resizeCanvas(s1Canvas, s1Ctx);
  resizeCanvas(s2Canvas, s2Ctx);
  measureTextLayout();
  measureSection3Layout();
  updateSection1(0);
  updateSection3(0);

  let s1Loaded = 0;
  let s2Loaded = 0;
  const totalFrames = S1_FRAME_COUNT + S2_FRAME_COUNT;
  const updateLoader = () => {
    loaderFill.style.width = `${((s1Loaded + s2Loaded) / totalFrames) * 100}%`;
  };

  const [s1Result, s2Result] = await Promise.all([
    preloadImages("/egg", S1_FRAME_COUNT, (loaded) => {
      s1Loaded = loaded;
      updateLoader();
    }),
    preloadImages("/egg_multiple", S2_FRAME_COUNT, (loaded) => {
      s2Loaded = loaded;
      updateLoader();
    }),
  ]);
  s1Images = s1Result;
  s2Images = s2Result;

  updateSection1(0);
  measureTextLayout();
  updateSection2(0);
  loader.classList.add("is-hidden");

  ScrollTrigger.create({
    trigger: "#section1",
    start: "top top",
    end: `+=${window.innerHeight * SCROLL_VH_PER_FRAME * S1_FRAME_COUNT}`,
    pin: true,
    anticipatePin: 1,
    scrub: 0.4,
    onUpdate: (self) => updateSection1(self.progress),
    // Pinning itself is tied to the raw scroll position, not the scrubbed
    // (eased) progress value, so a fast scroll can cross the unpin point
    // before the dissolve has visually finished catching up - producing a
    // one-frame seam where section 1 hasn't fully faded to black yet.
    // Forcing the end state here closes that gap.
    onLeave: () => updateSection1(1),
    onEnterBack: () => updateSection1(1),
  });

  ScrollTrigger.create({
    trigger: "#section2",
    start: "top top",
    end: `+=${window.innerHeight * SCROLL_VH_PER_FRAME * S2_FRAME_COUNT * S2_SCROLL_MULTIPLIER}`,
    pin: true,
    anticipatePin: 1,
    scrub: 0.4,
    onUpdate: (self) => updateSection2(self.progress),
    onEnter: () => updateSection2(0),
  });

  ScrollTrigger.create({
    trigger: "#section3",
    start: "top bottom",
    end: "bottom top",
    scrub: 0.4,
    onUpdate: (self) => updateSection3(self.progress),
  });

  window.addEventListener("resize", () => {
    resizeCanvas(s1Canvas, s1Ctx);
    resizeCanvas(s2Canvas, s2Ctx);
    measureTextLayout();
    measureSection3Layout();
    ScrollTrigger.refresh();
  });

}

init();
