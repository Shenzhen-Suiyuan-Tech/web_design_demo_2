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
const S2_SCROLL_MULTIPLIER = 3;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function frameToProgress(frame: number, frameCount: number) {
  return (frame - 1) / (frameCount - 1);
}

function preloadImages(
  basePath: string,
  count: number,
  onProgress: (loaded: number) => void,
  startFrame = 1,
): Promise<HTMLImageElement[]> {
  const images: HTMLImageElement[] = [];
  return new Promise((resolve) => {
    let loaded = 0;
    for (let i = 0; i < count; i++) {
      const img = new Image();
      img.src = `${basePath}/frame_${String(startFrame + i).padStart(4, "0")}.jpg`;
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

// ---------------------------------------------------------------------------
// Nav bar: dark/light theme follows whatever's currently behind it, and the
// active link follows scroll position (or an immediate click) with a
// crossfading underline.
// ---------------------------------------------------------------------------

const navEl = document.querySelector(".site-nav") as HTMLElement;
const navLinks = [...document.querySelectorAll<HTMLAnchorElement>(".nav-link")];

let navIsDark = false;
function setNavDark(isDark: boolean) {
  if (isDark === navIsDark) return;
  navIsDark = isDark;
  navEl.classList.toggle("site-nav--dark", isDark);
}

let activeNavHash = "";
function setActiveNavLink(hash: string) {
  if (hash === activeNavHash) return;
  activeNavHash = hash;
  for (const link of navLinks) {
    link.classList.toggle("is-active", link.getAttribute("href") === hash);
  }
}

for (const link of navLinks) {
  link.addEventListener("click", () => {
    const hash = link.getAttribute("href");
    if (hash) setActiveNavLink(hash);
  });
}

const textTop = document.querySelector(".text-top") as HTMLDivElement;
const heroContentLeft = document.querySelector(".hero-content-left") as HTMLParagraphElement;
const heroContentCenter = document.querySelector(".hero-content-center") as HTMLParagraphElement;
const heroContentRight = document.querySelector(".hero-content-right") as HTMLParagraphElement;
const heroContentEls = [heroContentLeft, heroContentCenter, heroContentRight] as const;
const navInnerEl = document.querySelector(".site-nav-inner") as HTMLElement;
const textSecond = document.querySelector(".text-second") as HTMLParagraphElement;
const textSecondRight = document.querySelector(".text-second-right") as HTMLParagraphElement;
const textThird = document.querySelector(".text-third") as HTMLParagraphElement;
const textFifthLeft = document.querySelector(".text-fifth-left") as HTMLParagraphElement;
const textFifthRight = document.querySelector(".text-fifth-right") as HTMLParagraphElement;
const textFifthLeftBlack = document.querySelector(".text-fifth-left-black") as HTMLParagraphElement;
const textFifthRightBlack = document.querySelector(".text-fifth-right-black") as HTMLParagraphElement;
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

  // The three content lines start spread across the bottom (left/center/
  // right, all at the same height) and converge on the title's landing x,
  // fanning out vertically into a stack as they arrive - left line ends up
  // on top, right line on the bottom.
  for (let i = 0; i < heroContentEls.length; i++) {
    const x = lerp(contentSpreadX[i], contentFinalXPx, progress);
    const y = lerp(contentInitialTopPx, contentInitialTopPx + contentRowOffsetPx[i], progress);
    heroContentEls[i].style.transform = `translate(${x}px, ${y}px)`;
  }
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
// Slower than the first batch's rise - takes twice as many frames to reach
// its vanish point.
const P_SECOND_MOVE_START = frameToProgress(70, S2_FRAME_COUNT);
const P_SECOND_MOVE_END = frameToProgress(90, S2_FRAME_COUNT);

const FIRST_BATCH_RISE_VH = 5;

const s2Canvas = document.getElementById("section2-canvas") as HTMLCanvasElement;
const s2Ctx = s2Canvas.getContext("2d")!;
let s2Images: HTMLImageElement[] = [];

// Pixel measurements for the text handoff, derived from static layout rules
// (title's top offset, the title/subtitle gap, content's resting height) so
// they stay correct across viewport sizes without depending on whatever
// mid-animation transform is currently applied.
let titleTopPx = 0;
let consolidatedContentTopPx = 0;
// Shared row height/baseline for the three hero-content lines (same
// font/line-height, short single-line phrases, so one measurement covers
// all three). contentInitialTopPx is that baseline's y - it's also exactly
// the center line's stacked position and section 2's starting top, so the
// handoff between section 1 and section 2 has no seam.
let contentRowHeightPx = 0;
let contentInitialTopPx = 0;
let contentRowOffsetPx: [number, number, number] = [0, 0, 0];
// Per-line x at rest (progress 0, spread across the nav bar's own content
// width) - all three converge on contentFinalXPx by the time section 1 ends.
let contentSpreadX: [number, number, number] = [0, 0, 0];
let contentFinalXPx = 0;
let vanishTopPx = 0;
let secondVanishTopPx = 0;
let secondInitialTopPx = 0;
let secondRightInitialTopPx = 0;

function measureTextLayout() {
  const titleRect = titleEl.getBoundingClientRect();
  const subtitleRect = subtitleEl.getBoundingClientRect();
  const secondHeight = textSecond.getBoundingClientRect().height;
  const secondRightHeight = textSecondRight.getBoundingClientRect().height;

  titleTopPx = titleRect.top;
  const titleSubtitleGapPx = subtitleRect.top - titleRect.bottom;
  consolidatedContentTopPx = subtitleRect.bottom + titleSubtitleGapPx;

  // Row 0 (top, left line) lands exactly at consolidatedContentTopPx once
  // section 2 consolidates the group under the subtitle - rows 1/2 stack
  // below it - rather than centering the stack on that point, which would
  // push the top row up into the subtitle.
  contentRowHeightPx = heroContentCenter.getBoundingClientRect().height;
  contentInitialTopPx = window.innerHeight - window.innerHeight / 9 - contentRowHeightPx;
  contentRowOffsetPx = [0, contentRowHeightPx, contentRowHeightPx * 2];

  // "50%"/"12.5%" for position:fixed elements resolve against the layout
  // viewport (clientWidth), which excludes the scrollbar - window.innerWidth
  // includes it, so using that here would drift these off the title/
  // subtitle's actual centered position by half the scrollbar's width.
  const viewportWidth = document.documentElement.clientWidth;
  const navRect = navInnerEl.getBoundingClientRect();
  const centerWidth = heroContentCenter.getBoundingClientRect().width;
  const rightWidth = heroContentRight.getBoundingClientRect().width;
  contentSpreadX = [navRect.left, viewportWidth / 2 - centerWidth / 2, navRect.right - rightWidth];
  contentFinalXPx = viewportWidth * 0.125;

  const risePx = (window.innerHeight * FIRST_BATCH_RISE_VH) / 100;
  vanishTopPx = titleTopPx - risePx;
  // A bit further down than the first batch's vanish point, purely so this
  // second line's resting spot doesn't end up crowding the nav bar.
  secondVanishTopPx = vanishTopPx + window.innerHeight * 0.04;

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

  // Phase 2 (frame 20-50): the whole group rises further and fades out together.
  const groupT = clamp((progress - P_CONSOLIDATE_END) / (P_GROUP_FADE_END - P_CONSOLIDATE_END), 0, 1);
  const groupOpacity = 1 - groupT;
  const groupRisePx = lerp(0, titleTopPx - vanishTopPx, groupT);
  const groupTransform = `translateY(-${groupRisePx}px)`;
  textTop.style.opacity = `${groupOpacity}`;
  textTop.style.transform = groupTransform;

  // The three lines keep their fixed stacked offsets throughout (baked into
  // contentRowOffsetPx), so the whole group consolidates, rises, and fades
  // as one rigid block rather than drifting apart.
  for (let i = 0; i < heroContentEls.length; i++) {
    const y = contentTop + contentRowOffsetPx[i] - groupRisePx;
    heroContentEls[i].style.transform = `translate(${contentFinalXPx}px, ${y}px)`;
    heroContentEls[i].style.opacity = `${groupOpacity}`;
  }

  // Phase 3: fades in, then rises to its vanish point and holds there at
  // full opacity for the rest of the section - it doesn't start fading out
  // until section 3's image is on its way in (see updateSection3), so the
  // whole handoff takes noticeably longer than before.
  const secondFadeInT = clamp((progress - P_SECOND_FADE_IN_START) / (P_SECOND_FADE_IN_END - P_SECOND_FADE_IN_START), 0, 1);
  const secondMoveT = clamp((progress - P_SECOND_MOVE_START) / (P_SECOND_MOVE_END - P_SECOND_MOVE_START), 0, 1);

  let secondOpacity = 0;
  if (progress < P_SECOND_FADE_IN_START) {
    secondOpacity = 0;
  } else if (progress < P_SECOND_FADE_IN_END) {
    secondOpacity = secondFadeInT;
  } else {
    secondOpacity = 1;
  }

  const secondTop = lerp(secondInitialTopPx, secondVanishTopPx, secondMoveT);
  textSecond.style.opacity = `${secondOpacity}`;
  textSecond.style.top = `${secondTop}px`;

  const secondRightTop = lerp(secondRightInitialTopPx, secondVanishTopPx, secondMoveT);
  textSecondRight.style.opacity = `${secondOpacity}`;
  textSecondRight.style.top = `${secondRightTop}px`;
}

// ---------------------------------------------------------------------------
// Section 3: white-eggs still image, scroll-scrubbed width + parallax text
// ---------------------------------------------------------------------------

// Pinned (unlike before) so the image can briefly hold fully in place once
// it's finished arriving: it slides in over one viewport height of scroll,
// holds for a short stretch - roughly two scroll-wheel notches - then slides
// back out over another viewport height. The hold is spliced into a
// separate progress value (imageSlideProgress) used only for the image's
// own on-screen position; the zoom (width) and text below keep tracking raw
// scroll the whole time, so neither one stalls alongside it.
const S3_SLIDE_VH = 100;
const S3_HOLD_VH = 24;
const S3_TOTAL_VH = S3_SLIDE_VH * 2 + S3_HOLD_VH;
const S3_SLIDE_IN_END = S3_SLIDE_VH / S3_TOTAL_VH;
const S3_HOLD_END = (S3_SLIDE_VH + S3_HOLD_VH) / S3_TOTAL_VH;

function imageSlideProgress(raw: number) {
  if (raw <= S3_SLIDE_IN_END) return (raw / S3_SLIDE_IN_END) * 0.5;
  if (raw <= S3_HOLD_END) return 0.5;
  return 0.5 + ((raw - S3_HOLD_END) / (1 - S3_HOLD_END)) * 0.5;
}

// "top reached" in the same idealized (hold-free) sense the text tracking
// below already used before the hold was introduced - kept as-is so that
// tracking stays exactly as it was, unaffected by the image's own pause.
const S3_TOP_REACHED = 0.5;

const S3_TEXT_FADE_IN_START = S3_TOP_REACHED * 0.5; // image 50% slid in
const S3_TEXT_FADE_IN_END = S3_TOP_REACHED * 0.75; // image 75% slid in

// Where, in raw progress, the (real, hold-aware) image is exactly half slid
// in - text-second/-right's long hold from section 2 finishes fading out to
// 0 by this point (see updateSection2), so it's fully gone by the time the
// image reaches that mark.
const S3_SECOND_TEXT_GONE_BY = S3_SLIDE_IN_END * 0.5;

const s3El = document.getElementById("section3") as HTMLElement;
const s3ImageWrap = document.getElementById("section3-image-wrap") as HTMLDivElement;

// section3's own backdrop - visible only in the sliver exposed behind the
// image while it's not fully covering the viewport (during the slide in/out,
// since the wrap holds a fixed 100vh height but its top offset moves).
// Black during the approach so it matches section 2's black tail; switched
// to section 4's own background right as the hold ends and the exit slide
// begins, so it's already the right color by the time that sliver starts
// growing again on the way out - the flip itself lands while the image is
// still fully covering the screen (progress === S3_HOLD_END is exactly full
// coverage), so it's invisible when it happens.
const S3_EXIT_BG = "rgb(244, 248, 250)";

let s3TextHeightPx = 0;

function measureSection3Layout() {
  s3TextHeightPx = textThird.getBoundingClientRect().height;
}

function updateSection3(progress: number) {
  s3El.style.backgroundColor = progress < S3_HOLD_END ? "#000" : S3_EXIT_BG;

  // Uniform scale for the whole pass through the section: 150% -> 100%.
  // Driven by raw scroll progress throughout, so it never stalls alongside
  // the image's hold below.
  s3ImageWrap.style.width = `${lerp(150, 100, progress)}vw`;

  const fadeT = clamp(
    (progress - S3_TEXT_FADE_IN_START) / (S3_TEXT_FADE_IN_END - S3_TEXT_FADE_IN_START),
    0,
    1,
  );
  textThird.style.opacity = `${fadeT}`;

  // Section 2's second text batch finishes disappearing here, also on raw
  // progress - unaffected by the image's hold, same as everything else in
  // this function apart from the image's own top below.
  const secondTextT = clamp(progress / S3_SECOND_TEXT_GONE_BY, 0, 1);
  const secondTextOpacity = 1 - secondTextT;
  textSecond.style.opacity = `${secondTextOpacity}`;
  textSecondRight.style.opacity = `${secondTextOpacity}`;

  // Idealized (hold-free) on-screen top/bottom edges, exactly as before the
  // hold was introduced: top runs from one viewport height below to one
  // above; bottom is always exactly a viewport height further down.
  // Clamping each to the viewport bounds gives the currently-visible slice,
  // and the text tracks its midpoint - i.e. it's always centered on
  // whatever portion of the image has (idealized-ly) revealed so far,
  // sliding from the bottom edge up through screen-center and on toward the
  // top edge, on its own schedule regardless of the image's real pause.
  const h = window.innerHeight;
  const imageTop = h * (1 - 2 * progress);
  const imageBottom = imageTop + h;
  const visibleTop = clamp(imageTop, 0, h);
  const visibleBottom = clamp(imageBottom, 0, h);
  const revealCenter = (visibleTop + visibleBottom) / 2;

  let top: number;
  if (progress <= S3_TOP_REACHED) {
    top = revealCenter;
  } else {
    // Past that point the image is on its way back out, and the reveal
    // center alone would never carry the text past the top edge (it's
    // mathematically bounded to stay on screen). Continue in a straight
    // line at a constant rate instead, past the top and fully out of view
    // by the time the section finishes scrolling by.
    const exitT = (progress - S3_TOP_REACHED) / (1 - S3_TOP_REACHED);
    top = lerp(h / 2, -s3TextHeightPx - 20, exitT);
  }
  textThird.style.top = `${top}px`;

  // The image's real on-screen position - unlike everything above, this one
  // does pause: it holds fully in view for a stretch once it arrives, via
  // the separately-paced imageSlideProgress so the pause only shows up here.
  const slideProgress = imageSlideProgress(progress);
  s3ImageWrap.style.top = `${h * (1 - 2 * slideProgress)}px`;
}

// ---------------------------------------------------------------------------
// Section 4: static light-flow image + copy (no canvas, no pin - it just
// scrolls into view like an ordinary block, same as section 3's image wrap).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Section 5: crack-egg sequence (pinned, appears whole, no entrance slide)
// ---------------------------------------------------------------------------

const S5_FRAME_COUNT = 300;
const S5_FRAME_START = 262; // source files are frame_0262.jpg .. frame_0561.jpg
const S5_REVEAL_END = frameToProgress(6, S5_FRAME_COUNT);

const S5_TEXT_FADE_IN_START = frameToProgress(90, S5_FRAME_COUNT);
const S5_TEXT_FADE_IN_END = frameToProgress(130, S5_FRAME_COUNT);
const S5_TEXT_FALL_END = frameToProgress(220, S5_FRAME_COUNT);

const s5El = document.getElementById("section5") as HTMLElement;
const s5Canvas = document.getElementById("section5-canvas") as HTMLCanvasElement;
const s5Ctx = s5Canvas.getContext("2d")!;
let s5Images: HTMLImageElement[] = [];

// How far the canvas has already faded in during section 5's pre-pin slide
// (see updateSection5PreEntry, driven by a plain scroll listener rather than
// another ScrollTrigger on this same pinned element - adding a second one
// was found to corrupt its pin-spacer sizing) - the post-pin reveal below
// continues from this instead of restarting at 0, so there's no opacity
// snap right as the pin engages.
let s5PreRevealOpacity = 0;

// The absolute scroll position at which section 5's pin would naturally
// engage (its top reaching the viewport top under normal document flow).
// Measured once via measureSection5PinStart(), after every earlier
// section's pin-spacer already exists, and then compared against raw
// window.scrollY during scroll rather than re-measuring s5El's own rect
// live - anticipatePin (see the pin trigger below) can start visually
// pinning section 5 slightly before the raw scroll position actually
// reaches this point, which made a live rect.top-based version of this
// ramp (the previous implementation) freeze partway through, leaving a
// dim, half-faded canvas right at the section 4/5 seam.
let s5PinStartScrollY = 0;
function measureSection5PinStart() {
  s5PinStartScrollY = s5El.getBoundingClientRect().top + window.scrollY;
}

// Whether section 5's own pin trigger currently considers itself active,
// based on the raw scroll position (set from onEnter/onEnterBack/onLeave/
// onLeaveBack in init()). Needed because with scrub easing, onUpdate can
// keep firing with a lagging, not-yet-settled progress value for a moment
// after the raw scroll position has already exited the pin range - without
// this guard, that lagging update can re-assert the dark theme right after
// section 4's marker correctly already switched it back to light.
// Section 5 slides up from below like any normal block before its own pin
// engages. During that slide the canvas would otherwise sit at opacity 0 (a
// plain black box) for a full viewport height of scrolling, reading as a
// long dead-black stretch, and the nav would only flip dark once section 5
// covers the *entire* viewport rather than just the nav's own strip at the
// top. Both are corrected here, driven off raw scroll position (via
// s5PinStartScrollY) on every scroll tick; once truly pinned this hands off
// entirely to updateSection5/updateSection6.
let s5PrevDistance = Infinity;
function updateSection5PreEntry() {
  const h = window.innerHeight;
  const distanceToTop = s5PinStartScrollY - window.scrollY;
  // Only while actually approaching (distance decreasing) - otherwise, right
  // after leaving the pin backward, distance starts at ~0 and briefly
  // satisfies the "close enough" check below while really just retreating,
  // which would wrongly re-flip the nav dark the instant section 4 correctly
  // set it back to light.
  const approaching = distanceToTop < s5PrevDistance;
  if (distanceToTop > 0) {
    const slideT = clamp(1 - distanceToTop / h, 0, 1);
    s5PreRevealOpacity = slideT * 0.6;
    s5Canvas.style.opacity = `${s5PreRevealOpacity}`;
    if (approaching && distanceToTop <= h * 0.05) setNavDark(true);
  } else if (s5PrevDistance > 0) {
    // Just crossed the threshold - possibly in one large jump if scroll
    // events were coalesced during a fast scroll, which would otherwise
    // leave s5PreRevealOpacity stuck at whatever partial value the last
    // event before the crossing had computed. Finish the ramp properly
    // instead, so the pin's own reveal (see updateSection5) always hands
    // off from the full 0.6 rather than an arbitrary lower value.
    s5PreRevealOpacity = 0.6;
    s5Canvas.style.opacity = `${s5PreRevealOpacity}`;
  }
  s5PrevDistance = distanceToTop;
}

let s5TextTopStartPx = 0;
let s5TextTopEndPx = 0;
// Measured separately - the left and right groups hold different numbers of
// lines, so they don't share a height.
let s5TextLeftHeightPx = 0;
let s5TextRightHeightPx = 0;

function measureSection5Layout() {
  s5TextTopStartPx = window.innerHeight / 3;
  // Slightly above the 2/3 mark - this is also where section 6's egg/title/
  // spec block ends up resting, so nudging it up here shifts that whole
  // group up too, with no seam since section 6 reuses this same value.
  s5TextTopEndPx = window.innerHeight * 0.63;
  s5TextLeftHeightPx = textFifthLeft.getBoundingClientRect().height;
  s5TextRightHeightPx = textFifthRight.getBoundingClientRect().height;
}

function updateSection5(progress: number) {
  const frameIndex = clamp(Math.round(progress * (S5_FRAME_COUNT - 1)), 0, S5_FRAME_COUNT - 1);
  drawFrame(s5Ctx, s5Images[frameIndex]);

  // Unlike section 3, the frame appears fully in place from the start (no
  // slide-in) - it just fades the rest of the way up over the first few
  // frames, continuing from wherever the pre-pin slide left it off.
  const revealT = clamp(progress / S5_REVEAL_END, 0, 1);
  s5Canvas.style.opacity = `${lerp(s5PreRevealOpacity, 1, revealT)}`;

  const fadeT = clamp(
    (progress - S5_TEXT_FADE_IN_START) / (S5_TEXT_FADE_IN_END - S5_TEXT_FADE_IN_START),
    0,
    1,
  );

  // Holds at the top-third mark while fading in, then falls to the
  // bottom-third mark between the fade-in completing and frame 220. The
  // black copies stay exactly stacked under the white ones throughout -
  // section 6 is what later pulls them apart via clip-path.
  const fallT = clamp(
    (progress - S5_TEXT_FADE_IN_END) / (S5_TEXT_FALL_END - S5_TEXT_FADE_IN_END),
    0,
    1,
  );
  const top = lerp(s5TextTopStartPx, s5TextTopEndPx, fallT);

  for (const el of [textFifthLeft, textFifthRight, textFifthLeftBlack, textFifthRightBlack]) {
    el.style.opacity = `${fadeT}`;
    el.style.top = `${top}px`;
  }
}

// ---------------------------------------------------------------------------
// Section 6: gray curtain rises over section 5's text, then two eggs fade in
//
// This rides section 5's own pin/scroll rather than getting a separate
// ScrollTrigger - GSAP's default pinSpacing reserves a full extra viewport
// height after any pinned section unpins, so two consecutive pins leave a
// "dead" gap where nothing animates. Folding this into one continuous pin
// (see the combined onUpdate in init()) makes the curtain start rising the
// instant section 5's reveal finishes, with no seam in between.
// ---------------------------------------------------------------------------

// Section 5's text ends its fall holding at the bottom-third mark and never
// moves again - section 6 reuses that same top/height rather than
// re-measuring, so the two sections agree on exactly where the text sits.
const S6_CURTAIN_END = 0.5;
const S6_EGG_FADE_START = 0.6;
const S6_EGG_FADE_END = 1;
const S6_EGG_RISE_PX = 24;

const s6Curtain = document.getElementById("section6-curtain") as HTMLDivElement;
const s6EggLeft = document.getElementById("section6-egg-left") as HTMLImageElement;
const s6EggRight = document.getElementById("section6-egg-right") as HTMLImageElement;
const s6TitleLeft = document.querySelector(".text-sixth-title-left") as HTMLParagraphElement;
const s6TitleRight = document.querySelector(".text-sixth-title-right") as HTMLParagraphElement;

let s6EggBottomPx = 0;
let s6TitleTopPx = 0;

function measureSection6Layout() {
  const titleGapPx = window.innerHeight * 0.02;
  const eggGapPx = window.innerHeight * 0.04;
  const titleHeightPx = s6TitleLeft.getBoundingClientRect().height;
  s6TitleTopPx = s5TextTopEndPx - titleGapPx - titleHeightPx;
  s6EggBottomPx = window.innerHeight - s6TitleTopPx + eggGapPx;
}

function updateSection6(progress: number, isActive: boolean) {
  // Curtain rises from fully below the viewport to fully covering it.
  const curtainT = clamp(progress / S6_CURTAIN_END, 0, 1);
  const curtainTranslateYPercent = lerp(100, 0, curtainT);
  s6Curtain.style.transform = `translateY(${curtainTranslateYPercent}%)`;

  // Where the curtain's top edge currently sits, in viewport pixels.
  const curtainTopPx = (curtainTranslateYPercent / 100) * window.innerHeight;

  // The white copies get clipped to only the portion still above the
  // curtain; the black copies beneath are always fully rendered, so they
  // show through wherever the white has been clipped away. Where the
  // curtain hasn't reached the text yet, the clip is a no-op (bottom: 0)
  // and the white copy covers the black one completely. Computed per column
  // since the two groups hold different numbers of lines (different heights).
  const leftSplitPx = clamp(curtainTopPx - s5TextTopEndPx, 0, s5TextLeftHeightPx);
  textFifthLeft.style.clipPath = `inset(0px 0px ${s5TextLeftHeightPx - leftSplitPx}px 0px)`;

  const rightSplitPx = clamp(curtainTopPx - s5TextTopEndPx, 0, s5TextRightHeightPx);
  textFifthRight.style.clipPath = `inset(0px 0px ${s5TextRightHeightPx - rightSplitPx}px 0px)`;

  // Once the background has fully turned gray, the two eggs gradually
  // surface just above the text.
  const eggT = clamp((progress - S6_EGG_FADE_START) / (S6_EGG_FADE_END - S6_EGG_FADE_START), 0, 1);
  // Starts slightly below the resting spot and settles upward into place.
  const eggRisePx = lerp(S6_EGG_RISE_PX, 0, eggT);
  s6EggLeft.style.opacity = `${eggT}`;
  s6EggRight.style.opacity = `${eggT}`;
  s6EggLeft.style.bottom = `${s6EggBottomPx - eggRisePx}px`;
  s6EggRight.style.bottom = `${s6EggBottomPx - eggRisePx}px`;

  // Titles fade in alongside the eggs, holding at their fixed spot between
  // the eggs and the spec lists.
  s6TitleLeft.style.opacity = `${eggT}`;
  s6TitleRight.style.opacity = `${eggT}`;
  s6TitleLeft.style.top = `${s6TitleTopPx}px`;
  s6TitleRight.style.top = `${s6TitleTopPx}px`;

  // The nav sits over black crack-egg canvas until the curtain's rising edge
  // passes behind it, at which point it's over the light curtain instead.
  // Guarded by isActive (GSAP's own ground truth for the raw scroll
  // position) because with scrub easing, onUpdate can keep firing with a
  // lagging, not-yet-settled progress value for a moment after the raw
  // scroll position has already exited the pin range - without this guard,
  // that lagging update can re-assert the dark theme right after section
  // 4's marker correctly already switched it back to light.
  if (isActive) {
    const navHeightPx = window.innerHeight * 0.05;
    setNavDark(curtainTopPx > navHeightPx);
  }
}

// Section 5 and 6 share one pin: the crack-egg sequence gets the same scroll
// distance it always had (S5_PHASE_SCROLL_VH), and the curtain/egg reveal
// gets its own stretch tacked on immediately after (S6_PHASE_SCROLL_VH).
const S5_PHASE_SCROLL_VH = SCROLL_VH_PER_FRAME * S5_FRAME_COUNT;
const S6_PHASE_SCROLL_VH = 2;
const S5_PHASE_END = S5_PHASE_SCROLL_VH / (S5_PHASE_SCROLL_VH + S6_PHASE_SCROLL_VH);

function updateSection5And6(progress: number, isActive = true) {
  updateSection5(clamp(progress / S5_PHASE_END, 0, 1));
  updateSection6(clamp((progress - S5_PHASE_END) / (1 - S5_PHASE_END), 0, 1), isActive);
}

// ---------------------------------------------------------------------------

async function init() {
  setActiveNavLink("#section1");
  setNavDark(true);

  resizeCanvas(s1Canvas, s1Ctx);
  resizeCanvas(s2Canvas, s2Ctx);
  resizeCanvas(s5Canvas, s5Ctx);
  measureTextLayout();
  measureSection3Layout();
  measureSection5Layout();
  measureSection6Layout();
  updateSection1(0);
  updateSection3(0);
  updateSection5And6(0);

  let s1Loaded = 0;
  let s2Loaded = 0;
  let s5Loaded = 0;
  const totalFrames = S1_FRAME_COUNT + S2_FRAME_COUNT + S5_FRAME_COUNT;
  const updateLoader = () => {
    loaderFill.style.width = `${((s1Loaded + s2Loaded + s5Loaded) / totalFrames) * 100}%`;
  };

  const [s1Result, s2Result, s5Result] = await Promise.all([
    preloadImages("/egg", S1_FRAME_COUNT, (loaded) => {
      s1Loaded = loaded;
      updateLoader();
    }),
    preloadImages("/egg_multiple", S2_FRAME_COUNT, (loaded) => {
      s2Loaded = loaded;
      updateLoader();
    }),
    preloadImages(
      "/crack_egg",
      S5_FRAME_COUNT,
      (loaded) => {
        s5Loaded = loaded;
        updateLoader();
      },
      S5_FRAME_START,
    ),
  ]);
  s1Images = s1Result;
  s2Images = s2Result;
  s5Images = s5Result;

  updateSection1(0);
  measureTextLayout();
  updateSection2(0);
  measureSection5Layout();
  measureSection6Layout();
  updateSection5And6(0);
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
    onEnter: () => {
      setActiveNavLink("#section1");
      setNavDark(true);
    },
    onEnterBack: () => {
      updateSection1(1);
      setActiveNavLink("#section1");
      setNavDark(true);
    },
  });

  ScrollTrigger.create({
    trigger: "#section2",
    start: "top top",
    end: `+=${window.innerHeight * SCROLL_VH_PER_FRAME * S2_FRAME_COUNT * S2_SCROLL_MULTIPLIER}`,
    pin: true,
    anticipatePin: 1,
    scrub: 0.4,
    onUpdate: (self) => updateSection2(self.progress),
    onEnter: () => {
      updateSection2(0);
      setActiveNavLink("#section2");
      setNavDark(true);
    },
    // Sections 1 and 2 are pinned, so a plain "bottom top" marker trigger on
    // them would only span their own unpinned natural height, not the full
    // pin duration - it'd fall out of range long before the pin actually
    // ends, and the nav's dark state would silently stop being reasserted
    // for the rest of the section. Hooking directly into each pin trigger's
    // own onEnter/onEnterBack instead guarantees the nav state is set over
    // that trigger's real, full-length active range.
    onEnterBack: () => {
      setActiveNavLink("#section2");
      setNavDark(true);
    },
  });

  ScrollTrigger.create({
    trigger: "#section3",
    start: "top top",
    end: `+=${window.innerHeight * (S3_TOTAL_VH / 100)}`,
    pin: true,
    anticipatePin: 1,
    scrub: 0.4,
    onUpdate: (self) => {
      updateSection3(self.progress);
      // Dark over the tail end of section 2's black backdrop while the
      // image is still arriving; light once it's fully in view.
      setNavDark(self.progress < S3_SLIDE_IN_END);
    },
    onLeave: () => updateSection3(1),
    onEnter: () => {
      setActiveNavLink("#section3");
      setNavDark(true);
    },
    onEnterBack: () => {
      updateSection3(1);
      setActiveNavLink("#section3");
      setNavDark(false);
    },
  });

  // Section 1/2/3's pin-spacers all exist by now, so section 5's natural
  // (unpinned) position already accounts for their reserved scroll height -
  // this has to happen after they're created, not up in the earlier
  // measure/update block above.
  measureSection5PinStart();
  updateSection5PreEntry();
  window.addEventListener("scroll", updateSection5PreEntry, { passive: true });

  ScrollTrigger.create({
    trigger: "#section5",
    start: "top top",
    end: `+=${window.innerHeight * (S5_PHASE_SCROLL_VH + S6_PHASE_SCROLL_VH)}`,
    pin: true,
    anticipatePin: 1,
    scrub: 0.4,
    onUpdate: (self) => updateSection5And6(self.progress, self.isActive),
    onEnter: () => {
      updateSection5And6(0);
      // There's no 5th/6th nav link, so this just keeps "About" active;
      // dark/light is instead driven every tick by updateSection6, based on
      // the curtain's position relative to the nav.
      setActiveNavLink("#section4");
    },
    onEnterBack: () => setActiveNavLink("#section4"),
  });

  // Section 4 is never pinned, so its natural "bottom" always matches its
  // real visual extent - a plain marker trigger works fine for it (unlike
  // the pinned sections, including section 3 above, which hook nav state
  // into their own pin trigger's onEnter/onEnterBack instead).
  const navMarkers: { trigger: string; hash: string; dark: boolean }[] = [
    { trigger: "#section4", hash: "#section4", dark: false },
  ];
  for (const marker of navMarkers) {
    const onCross = () => {
      setActiveNavLink(marker.hash);
      setNavDark(marker.dark);
    };
    ScrollTrigger.create({
      trigger: marker.trigger,
      start: "top top",
      end: "bottom top",
      onEnter: onCross,
      onEnterBack: onCross,
    });
  }

  window.addEventListener("resize", () => {
    resizeCanvas(s1Canvas, s1Ctx);
    resizeCanvas(s2Canvas, s2Ctx);
    resizeCanvas(s5Canvas, s5Ctx);
    measureTextLayout();
    measureSection3Layout();
    measureSection5Layout();
    measureSection6Layout();
    ScrollTrigger.refresh();
    // Refresh above may have shifted section 5's natural position (e.g. if
    // section 4's height reflowed), so this has to come after it.
    measureSection5PinStart();
  });

}

init();
