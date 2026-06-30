/**
 * Shell Game — GIF asset generator (v2)
 *
 * Generates:
 *   public/shellgame/{difficulty}/animation{N}/
 *     animation.gif   — combined intro + shuffle (single seamless GIF)
 *     final.png       — static image of final cup positions (shown during choice)
 *     reveal_win_{N}.gif
 *     reveal_lose_{N}.gif
 *     metadata.json   — { winningCup, durationMs }
 *
 *   public/shellgame/test/style{N}/
 *     animation.gif   — easy (3-cup) preview for !animation test
 *     metadata.json   — { styleId, name, description, durationMs }
 *
 * Run: node scripts/generate-shellgame-assets.mjs
 */

import sharp from "sharp";
import GIFEncoder from "gif-encoder-2";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../public/shellgame");

// ── Canvas dimensions ─────────────────────────────────────────────────────────

const SURFACE_Y = 210;
const CUP_TOP_W = 76;
const CUP_BOT_W = 48;
const CUP_H = 115;
const BALL_R = 17;

function getDims(numCups) {
  const W = Math.max(560, numCups * 140 + 80);
  return { W, H: 280 };
}

function cupPositions(numCups, W) {
  const spacing = W / (numCups + 1);
  return Array.from({ length: numCups }, (_, i) => (i + 1) * spacing);
}

// ── SVG rendering ─────────────────────────────────────────────────────────────

function cupSVG(cx, baseY, liftPx = 0, cupIdx, hasBall = false, ballGlow = null) {
  const ty = baseY - CUP_H - liftPx;
  const by = baseY - liftPx;
  const tw = CUP_TOP_W / 2;
  const bw = CUP_BOT_W / 2;
  const gradId = `cg${cupIdx}`;

  const ballSVG = hasBall && liftPx > 0
    ? (() => {
        const glowColor = ballGlow === "win" ? "#66ff44" : ballGlow === "lose" ? "#ff4444" : "#ffaa00";
        const bby = baseY - BALL_R;
        return `
        <defs>
          <radialGradient id="bg${cupIdx}" cx="35%" cy="30%">
            <stop offset="0%" stop-color="#ff9966"/>
            <stop offset="55%" stop-color="#cc2200"/>
            <stop offset="100%" stop-color="#880000"/>
          </radialGradient>
          <filter id="glow${cupIdx}">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <circle cx="${cx}" cy="${bby}" r="${BALL_R + 8}" fill="${glowColor}" opacity="0.4" filter="url(#glow${cupIdx})"/>
        <circle cx="${cx}" cy="${bby}" r="${BALL_R}" fill="url(#bg${cupIdx})" stroke="#660000" stroke-width="1.5"/>
        <ellipse cx="${cx - 6}" cy="${bby - 6}" rx="5" ry="3" fill="rgba(255,255,255,0.35)" transform="rotate(-30,${cx},${bby})"/>`;
      })()
    : "";

  return `
  ${ballSVG}
  <defs>
    <linearGradient id="${gradId}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="#6b3d10"/>
      <stop offset="25%"  stop-color="#b87328"/>
      <stop offset="60%"  stop-color="#d4952c"/>
      <stop offset="85%"  stop-color="#a06020"/>
      <stop offset="100%" stop-color="#4a2a08"/>
    </linearGradient>
  </defs>
  <ellipse cx="${cx}" cy="${by + 6}" rx="${bw + 8}" ry="5" fill="#000" opacity="0.35"/>
  <path d="M${cx - tw},${ty} L${cx + tw},${ty} L${cx + bw},${by} L${cx - bw},${by} Z"
        fill="url(#${gradId})" stroke="#2e1806" stroke-width="2" stroke-linejoin="round"/>
  <ellipse cx="${cx}" cy="${ty}" rx="${tw + 5}" ry="9" fill="#8a5010" stroke="#2e1806" stroke-width="1.5"/>
  <ellipse cx="${cx}" cy="${ty}" rx="${tw + 2}" ry="6" fill="#c88830" opacity="0.5"/>
  <path d="M${cx - tw * 0.6},${ty + 8} L${cx - bw * 0.55},${by - 5}" stroke="rgba(255,255,255,0.12)" stroke-width="8" stroke-linecap="round"/>
  <ellipse cx="${cx}" cy="${by}" rx="${bw + 3}" ry="5" fill="#6a3a0c" stroke="#2e1806" stroke-width="1"/>
  <text x="${cx}" y="${by + 32}" font-size="16" fill="#c8a060" text-anchor="middle"
        font-family="'Arial',sans-serif" font-weight="bold">${cupIdx + 1}</text>`;
}

function sceneSVG(W, H, cupsState, title = "") {
  const cupsSVG = cupsState.map((c, i) =>
    cupSVG(c.cx, SURFACE_Y, c.liftPx ?? 0, i, c.hasBall ?? false, c.ballGlow ?? null)
  ).join("\n");

  const titleSVG = title
    ? `<text x="${W/2}" y="28" font-size="20" fill="#d4a060" text-anchor="middle" font-family="'Arial',sans-serif" font-weight="bold">${title}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" shape-rendering="geometricPrecision">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a0e1a"/>
      <stop offset="100%" stop-color="#141824"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bgGrad)"/>
  <ellipse cx="${W/2}" cy="${H * 0.4}" rx="${W * 0.6}" ry="${H * 0.3}" fill="#1a2040" opacity="0.5"/>
  ${titleSVG}
  <rect x="20" y="${SURFACE_Y}" width="${W - 40}" height="${H - SURFACE_Y - 10}" rx="6" fill="#1e0f06"/>
  <rect x="20" y="${SURFACE_Y}" width="${W - 40}" height="6" rx="3" fill="#3a1a0a"/>
  <rect x="22" y="${SURFACE_Y + 1}" width="${W - 44}" height="2" fill="#5a2a10" opacity="0.5"/>
  ${cupsSVG}
</svg>`;
}

// ── Frame helpers ─────────────────────────────────────────────────────────────

async function svgToRgba(svgStr, W, H) {
  const { data } = await sharp(Buffer.from(svgStr))
    .resize(W, H)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return data;
}

/** frames: Array<{ data: Buffer (raw RGBA), delay: number (ms) }> */
async function encodeGif(frames, W, H) {
  const encoder = new GIFEncoder(W, H, "neuquant", true);
  encoder.setRepeat(0);
  encoder.setQuality(15);
  encoder.start();
  for (const { data, delay } of frames) {
    encoder.setDelay(delay);
    encoder.addFrame(data);
  }
  encoder.finish();
  return Buffer.from(encoder.out.getData());
}

// ── 10 Animation Styles ───────────────────────────────────────────────────────
//
// Each style defines:
//   name, description
//   swapFrames  — frames of motion per swap
//   pauseFrames — frames of stillness between swaps
//   arcHeight   — how high cups arc (px)
//   baseDelayMs — baseline ms per frame
//   getPacing(swapIndex, totalSwaps) → multiplier (higher = slower)
//
// Total shuffle duration ≈ baseDelayMs × (swapFrames + pauseFrames) × Σ pacing[i]
// Plus ~1 s intro + ~1.2 s final section = 12–20 s total.

const STYLES = [
  {
    id: 1,
    name: "Classic",
    description: "Smooth bell-curve pacing — starts slow, builds to a comfortable rhythm, fades gently",
    swapFrames: 12,
    pauseFrames: 5,
    arcHeight: 65,
    baseDelayMs: 55,
    getPacing(i, n) {
      const t = i / Math.max(n - 1, 1);
      // Slow → comfortable → slow (asymmetric: spends more time at comfortable pace)
      if (t < 0.18) return 2.2 - t / 0.18 * 1.0;   // 2.2 → 1.2
      if (t < 0.35) return 1.2 - (t - 0.18) / 0.17 * 0.35; // 1.2 → 0.85
      if (t < 0.72) return 0.85;                     // comfortable plateau
      return 0.85 + (t - 0.72) / 0.28 * 1.35;       // 0.85 → 2.2
    },
    // ~15 s with 10 swaps
  },
  {
    id: 2,
    name: "Allegro",
    description: "Brisk and energetic — quicker overall with a sharp burst in the middle",
    swapFrames: 10,
    pauseFrames: 3,
    arcHeight: 72,
    baseDelayMs: 68,
    getPacing(i, n) {
      const t = i / Math.max(n - 1, 1);
      // Moderate → fast → moderate
      if (t < 0.25) return 1.8 - t / 0.25 * 0.9;   // 1.8 → 0.9
      if (t < 0.65) return 0.7 + Math.sin(Math.PI * (t - 0.25) / 0.4) * 0.2; // 0.7–0.9 wave
      return 0.85 + (t - 0.65) / 0.35 * 0.95;       // 0.85 → 1.8
    },
    // ~13 s with 12 swaps
  },
  {
    id: 3,
    name: "Andante",
    description: "Slow and deliberate — every move is clearly visible; gentle all the way through",
    swapFrames: 9,
    pauseFrames: 3,
    arcHeight: 55,
    baseDelayMs: 62,
    getPacing(i, n) {
      const t = i / Math.max(n - 1, 1);
      // Symmetric arch — never truly fast, always readable
      return 1.4 + 0.8 * Math.abs(Math.cos(Math.PI * t));
    },
    // ~16 s with 10 swaps
  },
  {
    id: 4,
    name: "Vivace",
    description: "Many rapid swaps — high frequency, low arc, dizzying but fair",
    swapFrames: 9,
    pauseFrames: 3,
    arcHeight: 50,
    baseDelayMs: 96,
    getPacing(i, n) {
      const t = i / Math.max(n - 1, 1);
      // Quick throughout, slight rhythmic variation
      return 0.85 + 0.2 * Math.sin(Math.PI * t * 2.5 + 0.3);
    },
    // ~13 s with 16 swaps
  },
  {
    id: 5,
    name: "Waltz",
    description: "Three-beat rhythm — fast, slow, fast, in a hypnotic 3/4 cadence",
    swapFrames: 11,
    pauseFrames: 5,
    arcHeight: 68,
    baseDelayMs: 58,
    getPacing(i, n) {
      // Beat 1: medium, Beat 2: slow, Beat 3: medium-fast
      const beat = i % 3;
      const phase = Math.floor(i / 3) / Math.max(Math.ceil(n / 3) - 1, 1);
      const base = beat === 0 ? 1.4 : beat === 1 ? 2.2 : 0.9;
      // Slightly speed up over time
      return base * (1.1 - phase * 0.2);
    },
    // ~18 s with 12 swaps
  },
  {
    id: 6,
    name: "Accelerando",
    description: "Progressively faster — starts very slow, ends in a flurry",
    swapFrames: 10,
    pauseFrames: 3,
    arcHeight: 70,
    baseDelayMs: 60,
    getPacing(i, n) {
      const t = i / Math.max(n - 1, 1);
      return 2.8 * Math.pow(1 - t * 0.75, 1.8) + 0.65;
    },
    // ~17 s with 12 swaps
  },
  {
    id: 7,
    name: "Decelerando",
    description: "Progressively slower — starts quick, draws out to a majestic conclusion",
    swapFrames: 12,
    pauseFrames: 4,
    arcHeight: 70,
    baseDelayMs: 60,
    getPacing(i, n) {
      const t = i / Math.max(n - 1, 1);
      return 0.65 + 2.4 * Math.pow(t, 1.6);
    },
    // ~17 s with 10 swaps
  },
  {
    id: 8,
    name: "Rubato",
    description: "Expressive and unpredictable — sudden bursts and pauses keep you on your toes",
    swapFrames: 11,
    pauseFrames: 4,
    arcHeight: 75,
    baseDelayMs: 58,
    getPacing(i, n) {
      // Alternating fast/slow with an overall bell envelope
      const t = i / Math.max(n - 1, 1);
      const envelope = 0.85 + 1.2 * Math.pow(Math.abs(t - 0.5) * 2, 1.4);
      const ripple = 1 + 0.55 * Math.sin(i * 1.9);
      return envelope * ripple;
    },
    // ~16 s with 12 swaps
  },
  {
    id: 9,
    name: "Maestoso",
    description: "Grand and stately — wide arcs, long pauses, very slow and cinematic",
    swapFrames: 8,
    pauseFrames: 4,
    arcHeight: 90,
    baseDelayMs: 72,
    getPacing(i, n) {
      const t = i / Math.max(n - 1, 1);
      // Symmetric, never truly fast — high arch pausing at each end
      return 1.6 + 0.6 * (1 - Math.sin(Math.PI * t));
    },
    // ~19 s with 8 swaps
  },
  {
    id: 10,
    name: "Perpetuo",
    description: "Constant comfortable pace — many swaps at a steady, hypnotic rhythm",
    swapFrames: 10,
    pauseFrames: 3,
    arcHeight: 62,
    baseDelayMs: 88,
    getPacing(i, n) {
      // Mostly flat, gentle swell in the middle
      const t = i / Math.max(n - 1, 1);
      return 0.95 + 0.15 * Math.sin(Math.PI * t);
    },
    // ~16 s with 18 swaps
  },
];

// ── Game animation swap sequences ─────────────────────────────────────────────
// Ball always starts at index 0. winningCup is computed from the swaps.
// Each difficulty has 5 sequences (used with Style 1 / Classic pacing).

const GAME_ANIMATIONS = {
  easy: [
    // 10 swaps each — diverse patterns
    { swaps: [[0,1],[1,2],[0,2],[0,1],[1,2],[0,2],[1,2],[0,1],[0,2],[0,1]] },
    { swaps: [[1,2],[0,1],[0,2],[1,2],[0,1],[1,2],[0,2],[0,1],[1,2],[0,2]] },
    { swaps: [[0,2],[0,1],[1,2],[0,2],[1,2],[0,1],[0,2],[1,2],[0,1],[1,2]] },
    { swaps: [[0,1],[0,2],[1,2],[0,1],[0,2],[1,2],[0,2],[0,1],[1,2],[0,1]] },
    { swaps: [[1,2],[0,2],[0,1],[0,2],[1,2],[0,1],[0,2],[0,1],[1,2],[0,2]] },
  ],
  medium: [
    { swaps: [[0,1],[2,3],[1,2],[0,3],[1,3],[0,2],[1,2],[0,1],[2,3],[0,3],[1,2],[0,1]] },
    { swaps: [[0,2],[1,3],[0,1],[2,3],[1,2],[0,3],[2,3],[0,1],[1,3],[0,2],[1,2],[2,3]] },
    { swaps: [[1,2],[0,3],[0,2],[1,3],[0,1],[2,3],[1,2],[0,3],[0,1],[1,3],[2,3],[0,2]] },
    { swaps: [[0,2],[0,1],[1,3],[2,3],[0,2],[1,2],[0,3],[1,3],[0,1],[2,3],[1,2],[0,2]] },
    { swaps: [[0,1],[1,2],[2,3],[0,3],[1,3],[0,2],[1,2],[0,1],[2,3],[0,3],[1,3],[0,2]] },
  ],
  hard: [
    { swaps: [[0,1],[3,4],[1,2],[2,4],[0,3],[1,3],[0,2],[1,4],[0,1],[3,4],[1,2],[2,3],[0,4],[1,3]] },
    { swaps: [[0,4],[1,3],[0,2],[2,4],[0,1],[3,4],[1,2],[0,3],[2,3],[1,4],[0,2],[3,4],[1,3],[0,4]] },
    { swaps: [[0,2],[1,4],[0,3],[2,4],[1,3],[0,4],[2,3],[0,1],[1,2],[3,4],[0,3],[1,4],[2,4],[0,2]] },
    { swaps: [[1,2],[0,4],[2,3],[0,2],[1,4],[3,4],[0,3],[1,3],[0,2],[2,4],[0,1],[1,4],[3,4],[0,3]] },
    { swaps: [[0,3],[1,2],[0,4],[2,3],[1,4],[0,1],[3,4],[0,2],[1,3],[2,4],[0,1],[3,4],[1,2],[0,3]] },
  ],
};

// ── Test swap sequence (easy, 10 swaps — same for all 10 styles) ──────────────
const TEST_SWAPS = [[0,1],[1,2],[0,2],[0,1],[1,2],[0,2],[1,2],[0,1],[0,2],[1,2]];

// ── Winning cup computation ───────────────────────────────────────────────────

function computeWinningCup(swaps) {
  let ball = 0;
  for (const [a, b] of swaps) {
    if (ball === a) ball = b;
    else if (ball === b) ball = a;
  }
  return ball + 1;
}

// ── Combined intro + shuffle GIF ──────────────────────────────────────────────

async function generateCombinedGif(numCups, W, H, positions, swaps, style) {
  const frames = []; // { data: Buffer, delay: number }
  let cupXs = [...positions];
  let ballAt = 0;

  // — Intro section: ball visible under cup 0 (lifted), pulsing —
  const INTRO_FRAMES = 9;
  const INTRO_DELAY = 115;
  const LIFT_MAX = 90;
  for (let f = 0; f < INTRO_FRAMES; f++) {
    const t = f / (INTRO_FRAMES - 1);
    const lift = LIFT_MAX + Math.sin(t * Math.PI * 1.5) * 8;
    const cupsState = positions.map((cx, i) => ({
      cx, liftPx: i === 0 ? lift : 0, hasBall: i === 0, ballGlow: null,
    }));
    frames.push({ data: await svgToRgba(sceneSVG(W, H, cupsState, "Watch carefully!"), W, H), delay: INTRO_DELAY });
  }

  // — Transition pause: cup lowers —
  for (let f = 0; f < 4; f++) {
    const lift = LIFT_MAX * (1 - f / 3);
    const cupsState = positions.map((cx, i) => ({
      cx, liftPx: i === 0 ? lift : 0, hasBall: i === 0 && f < 3, ballGlow: null,
    }));
    frames.push({ data: await svgToRgba(sceneSVG(W, H, cupsState, "Watch carefully!"), W, H), delay: 90 });
  }

  // — Shuffle section —
  const { swapFrames, pauseFrames, arcHeight, baseDelayMs, getPacing } = style;
  const n = swaps.length;

  for (let si = 0; si < n; si++) {
    const [a, b] = swaps[si];
    const startA = cupXs[a];
    const startB = cupXs[b];
    const aGoesOver = si % 2 === 0;
    const pacingMul = getPacing(si, n);
    const frameDelay = Math.max(20, Math.round(baseDelayMs * pacingMul));

    for (let f = 0; f < swapFrames; f++) {
      const t = f / (swapFrames - 1);
      // Smooth ease-in-out
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      const arcLift = arcHeight * Math.sin(Math.PI * ease);

      const cupsState = cupXs.map((cx, i) => ({ cx, liftPx: 0, hasBall: false, ballGlow: null }));
      cupsState[a].cx = startA + (startB - startA) * ease;
      cupsState[b].cx = startB + (startA - startB) * ease;
      cupsState[a].liftPx = aGoesOver ? arcLift : 0;
      cupsState[b].liftPx = aGoesOver ? 0 : arcLift;

      frames.push({ data: await svgToRgba(sceneSVG(W, H, cupsState, "Follow the ball!"), W, H), delay: frameDelay });
    }

    // Finalize swap
    [cupXs[a], cupXs[b]] = [cupXs[b], cupXs[a]];
    if (ballAt === a) ballAt = b;
    else if (ballAt === b) ballAt = a;

    // Pause frames between swaps
    const pauseSvg = sceneSVG(W, H, cupXs.map(cx => ({ cx, liftPx: 0, hasBall: false })), "Follow the ball!");
    const pauseFrame = await svgToRgba(pauseSvg, W, H);
    for (let p = 0; p < pauseFrames; p++) {
      frames.push({ data: pauseFrame, delay: frameDelay });
    }
  }

  // — Final section: cups settled, "Which cup?" hint —
  const finalSvg = sceneSVG(W, H, cupXs.map(cx => ({ cx, liftPx: 0, hasBall: false })), "Which cup?");
  const finalFrame = await svgToRgba(finalSvg, W, H);
  const FINAL_FRAMES = 7;
  const FINAL_DELAY = 180;
  for (let f = 0; f < FINAL_FRAMES; f++) {
    frames.push({ data: finalFrame, delay: FINAL_DELAY });
  }

  const totalMs = frames.reduce((s, f) => s + f.delay, 0);
  const gif = await encodeGif(frames, W, H);
  return { gif, totalMs, finalCupXs: cupXs, ballAt };
}

// ── Final static PNG ──────────────────────────────────────────────────────────

async function generateFinalPng(W, H, finalCupXs) {
  const cupsState = finalCupXs.map(cx => ({ cx, liftPx: 0, hasBall: false }));
  const svg = sceneSVG(W, H, cupsState, "Which cup?");
  return sharp(Buffer.from(svg)).resize(W, H).png().toBuffer();
}

// ── Reveal GIF ────────────────────────────────────────────────────────────────

async function generateRevealGif(numCups, W, H, positions, revealCupIdx, hasBall, glowType) {
  const LIFT_FRAMES = 10;
  const HOLD_FRAMES = 6;
  const FRAME_DELAY = 50;
  const frames = [];

  for (let f = 0; f < LIFT_FRAMES; f++) {
    const t = f / (LIFT_FRAMES - 1);
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    const lift = ease * 100;
    const cupsState = positions.map((cx, i) => ({
      cx, liftPx: i === revealCupIdx ? lift : 0,
      hasBall: i === revealCupIdx && hasBall,
      ballGlow: i === revealCupIdx && hasBall ? glowType : null,
    }));
    frames.push({ data: await svgToRgba(sceneSVG(W, H, cupsState), W, H), delay: FRAME_DELAY });
  }

  const holdState = positions.map((cx, i) => ({
    cx, liftPx: i === revealCupIdx ? 100 : 0,
    hasBall: i === revealCupIdx && hasBall,
    ballGlow: i === revealCupIdx && hasBall ? glowType : null,
  }));
  const holdFrame = await svgToRgba(sceneSVG(W, H, holdState), W, H);
  for (let p = 0; p < HOLD_FRAMES; p++) frames.push({ data: holdFrame, delay: FRAME_DELAY });

  return encodeGif(frames, W, H);
}

// ── Main generator ────────────────────────────────────────────────────────────

async function generateAll() {
  const NUM_CUPS = { easy: 3, medium: 4, hard: 5 };
  // All game animations use Style 1 (Classic) — user can switch after testing
  const gameStyle = STYLES[0];

  console.log("🎲 Generating Shell Game assets (v2)...\n");

  // ── Game animations ──────────────────────────────────────────────────────────
  for (const [diff, animList] of Object.entries(GAME_ANIMATIONS)) {
    const numCups = NUM_CUPS[diff];
    const { W, H } = getDims(numCups);
    const positions = cupPositions(numCups, W);

    for (let animIdx = 0; animIdx < animList.length; animIdx++) {
      const { swaps } = animList[animIdx];
      const winningCup = computeWinningCup(swaps);
      const animDir = path.join(OUT_DIR, diff, `animation${String(animIdx + 1).padStart(3, "0")}`);
      await mkdir(animDir, { recursive: true });

      console.log(`  [${diff}] animation${animIdx + 1} → winningCup=${winningCup}`);

      // Combined animation.gif
      const { gif, totalMs, finalCupXs } = await generateCombinedGif(numCups, W, H, positions, swaps, gameStyle);
      await writeFile(path.join(animDir, "animation.gif"), gif);

      // final.png (static choice image)
      const finalPng = await generateFinalPng(W, H, finalCupXs);
      await writeFile(path.join(animDir, "final.png"), finalPng);

      // reveal GIFs for each cup
      for (let c = 0; c < numCups; c++) {
        // Note: reveal uses the FINAL cup positions after shuffle
        const winGif = await generateRevealGif(numCups, W, H, finalCupXs, c, true, "win");
        await writeFile(path.join(animDir, `reveal_win_${c + 1}.gif`), winGif);
        const loseGif = await generateRevealGif(numCups, W, H, finalCupXs, c, true, "lose");
        await writeFile(path.join(animDir, `reveal_lose_${c + 1}.gif`), loseGif);
      }

      // metadata.json
      await writeFile(
        path.join(animDir, "metadata.json"),
        JSON.stringify({ winningCup, durationMs: totalMs, style: gameStyle.name }),
      );

      const seconds = (totalMs / 1000).toFixed(1);
      console.log(`    ✅ animation.gif generated — ${seconds}s`);
    }
  }

  // ── Test animations (10 styles, easy/3-cup only) ──────────────────────────
  console.log("\n  Generating test animations...");
  const numCups = 3;
  const { W, H } = getDims(numCups);
  const positions = cupPositions(numCups, W);
  const winningCup = computeWinningCup(TEST_SWAPS);

  for (const style of STYLES) {
    const testDir = path.join(OUT_DIR, "test", `style${style.id}`);
    await mkdir(testDir, { recursive: true });

    const { gif, totalMs } = await generateCombinedGif(numCups, W, H, positions, TEST_SWAPS, style);
    await writeFile(path.join(testDir, "animation.gif"), gif);
    await writeFile(
      path.join(testDir, "metadata.json"),
      JSON.stringify({ styleId: style.id, name: style.name, description: style.description, durationMs: totalMs, winningCup }),
    );

    const seconds = (totalMs / 1000).toFixed(1);
    console.log(`  [test] Style ${style.id} — ${style.name} — ${seconds}s`);
  }

  console.log("\n✅ Shell Game assets generated successfully.");
}

generateAll().catch(err => {
  console.error("❌ Shell Game asset generation failed:", err);
  process.exit(1);
});
