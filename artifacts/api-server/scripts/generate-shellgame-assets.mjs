/**
 * Generates all Shell Game GIF assets into artifacts/api-server/public/shellgame/
 *
 * Structure:
 *   public/shellgame/{difficulty}/animation{N}/
 *     intro.gif       — ball visible under cup 1 (raised)
 *     shuffle.gif     — cups shuffling
 *     reveal_win_{N}.gif  — cup N lifted, ball found (win)
 *     reveal_lose_{N}.gif — cup N lifted, ball found (loss version)
 *     metadata.json   — { winningCup: N }
 *
 * Uses: sharp (already in deps) + gif-encoder-2 (already in deps)
 * Run:  node scripts/generate-shellgame-assets.mjs
 */

import sharp from "sharp";
import GIFEncoder from "gif-encoder-2";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../public/shellgame");

// ── Animation definitions ─────────────────────────────────────────────────────
// Each entry: { swaps: [[a,b], ...] }
// Ball always starts at index 0 (cup 1). winningCup is computed automatically.

const ANIMATIONS = {
  easy: [
    { swaps: [[0,1],[1,2],[0,1],[0,2]] },
    { swaps: [[1,2],[0,1],[0,2],[1,2],[0,1]] },
    { swaps: [[0,2],[0,1],[1,2],[0,2]] },
    { swaps: [[0,1],[0,2],[1,2],[0,1],[1,2]] },
    { swaps: [[1,2],[0,2],[0,1],[1,2],[0,2],[0,1]] },
  ],
  medium: [
    { swaps: [[0,1],[2,3],[1,2],[0,3],[1,2],[0,1]] },
    { swaps: [[0,2],[1,3],[0,1],[2,3],[1,2]] },
    { swaps: [[1,2],[0,3],[0,2],[1,3],[0,1],[2,3]] },
    { swaps: [[0,2],[0,1],[1,3],[2,3],[0,2],[1,2]] },
    { swaps: [[0,1],[1,2],[2,3],[0,3],[1,3],[0,2],[1,2]] },
  ],
  hard: [
    { swaps: [[0,1],[3,4],[1,2],[2,4],[0,3],[1,3],[0,2],[1,4]] },
    { swaps: [[0,4],[1,3],[0,2],[2,4],[0,1],[3,4],[1,2],[0,3],[2,3]] },
    { swaps: [[0,2],[1,4],[0,3],[2,4],[1,3],[0,4],[2,3],[0,1],[1,2]] },
    { swaps: [[1,2],[0,4],[2,3],[0,2],[1,4],[3,4],[0,3],[1,3],[0,2],[2,4]] },
    { swaps: [[0,3],[1,2],[0,4],[2,3],[1,4],[0,1],[3,4],[0,2],[1,3],[2,4],[0,1]] },
  ],
};

const NUM_CUPS = { easy: 3, medium: 4, hard: 5 };

// ── Cup math ──────────────────────────────────────────────────────────────────

function computeWinningCup(swaps) {
  let ball = 0;
  for (const [a, b] of swaps) {
    if (ball === a) ball = b;
    else if (ball === b) ball = a;
  }
  return ball + 1; // 1-indexed
}

// ── Canvas dimensions ─────────────────────────────────────────────────────────

function getDims(numCups) {
  const W = Math.max(560, numCups * 140 + 80);
  const H = 280;
  return { W, H };
}

function cupPositions(numCups, W) {
  const spacing = W / (numCups + 1);
  return Array.from({ length: numCups }, (_, i) => (i + 1) * spacing);
}

// ── SVG cup drawing ───────────────────────────────────────────────────────────

const SURFACE_Y = 210;
const CUP_TOP_W = 76;
const CUP_BOT_W = 48;
const CUP_H = 115;
const BALL_R = 17;

/** Draw a single cup at (cx, baseY), optionally lifted by liftPx. */
function cupSVG(cx, baseY, liftPx = 0, cupIdx, numCups, hasBall = false, ballGlow = null) {
  const ty = baseY - CUP_H - liftPx;
  const by = baseY - liftPx;
  const tw = CUP_TOP_W / 2;
  const bw = CUP_BOT_W / 2;
  const gradId = `cg${cupIdx}`;

  // Ball visible under a lifted cup
  const ballSVG = (hasBall && liftPx > 0)
    ? (() => {
        const glowColor = ballGlow === "win" ? "#66ff44" : ballGlow === "lose" ? "#ff4444" : "#ffaa00";
        const bx = cx;
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
        <circle cx="${bx}" cy="${bby}" r="${BALL_R + 8}" fill="${glowColor}" opacity="0.4" filter="url(#glow${cupIdx})"/>
        <circle cx="${bx}" cy="${bby}" r="${BALL_R}" fill="url(#bg${cupIdx})" stroke="#660000" stroke-width="1.5"/>
        <ellipse cx="${bx - 6}" cy="${bby - 6}" rx="5" ry="3" fill="rgba(255,255,255,0.35)" transform="rotate(-30,${bx},${bby})"/>`;
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
  <!-- Cup shadow -->
  <ellipse cx="${cx}" cy="${by + 6}" rx="${bw + 8}" ry="5" fill="#000" opacity="0.35"/>
  <!-- Cup body -->
  <path d="M${cx - tw},${ty} L${cx + tw},${ty} L${cx + bw},${by} L${cx - bw},${by} Z"
        fill="url(#${gradId})" stroke="#2e1806" stroke-width="2" stroke-linejoin="round"/>
  <!-- Top rim -->
  <ellipse cx="${cx}" cy="${ty}" rx="${tw + 5}" ry="9" fill="#8a5010" stroke="#2e1806" stroke-width="1.5"/>
  <!-- Top rim shine -->
  <ellipse cx="${cx}" cy="${ty}" rx="${tw + 2}" ry="6" fill="#c88830" opacity="0.5"/>
  <!-- Body highlight -->
  <path d="M${cx - tw * 0.6},${ty + 8} L${cx - bw * 0.55},${by - 5}" stroke="rgba(255,255,255,0.12)" stroke-width="8" stroke-linecap="round"/>
  <!-- Bottom rim -->
  <ellipse cx="${cx}" cy="${by}" rx="${bw + 3}" ry="5" fill="#6a3a0c" stroke="#2e1806" stroke-width="1"/>
  <!-- Cup number label -->
  <text x="${cx}" y="${by + 32}" font-size="16" fill="#c8a060" text-anchor="middle"
        font-family="'Arial',sans-serif" font-weight="bold">${cupIdx + 1}</text>`;
}

/** Draw the ball on the surface (hidden = at surface, shown = in open cup). */
function ballOnSurfaceSVG(cx, glowColor = null) {
  const bx = cx;
  const by = SURFACE_Y - BALL_R;
  const gc = glowColor ?? "#ffaa00";
  return `
  <defs>
    <radialGradient id="ballGrad" cx="35%" cy="30%">
      <stop offset="0%" stop-color="#ff9966"/>
      <stop offset="55%" stop-color="#cc2200"/>
      <stop offset="100%" stop-color="#880000"/>
    </radialGradient>
    <filter id="ballGlow">
      <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <circle cx="${bx}" cy="${by}" r="${BALL_R + 10}" fill="${gc}" opacity="0.45" filter="url(#ballGlow)"/>
  <circle cx="${bx}" cy="${by}" r="${BALL_R}" fill="url(#ballGrad)" stroke="#660000" stroke-width="1.5"/>
  <ellipse cx="${bx - 6}" cy="${by - 6}" rx="5" ry="3" fill="rgba(255,255,255,0.35)" transform="rotate(-30,${bx},${by})"/>`;
}

/** Full scene SVG. cupsState: array of {cx, liftPx, hasBall, ballGlow} */
function sceneSVG(W, H, cupsState, title = "") {
  const cupsSVG = cupsState.map((c, i) =>
    cupSVG(c.cx, SURFACE_Y, c.liftPx ?? 0, i, cupsState.length, c.hasBall ?? false, c.ballGlow ?? null)
  ).join("\n");

  const titleSVG = title
    ? `<text x="${W/2}" y="28" font-size="20" fill="#d4a060" text-anchor="middle" font-family="'Arial',sans-serif" font-weight="bold">${title}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" shape-rendering="geometricPrecision">
  <!-- Background -->
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a0e1a"/>
      <stop offset="100%" stop-color="#141824"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bgGrad)"/>
  <!-- Subtle background glow -->
  <ellipse cx="${W/2}" cy="${H * 0.4}" rx="${W * 0.6}" ry="${H * 0.3}" fill="#1a2040" opacity="0.5"/>
  ${titleSVG}
  <!-- Surface / table -->
  <rect x="20" y="${SURFACE_Y}" width="${W - 40}" height="${H - SURFACE_Y - 10}" rx="6" fill="#1e0f06"/>
  <rect x="20" y="${SURFACE_Y}" width="${W - 40}" height="6" rx="3" fill="#3a1a0a"/>
  <!-- Table edge highlight -->
  <rect x="22" y="${SURFACE_Y + 1}" width="${W - 44}" height="2" fill="#5a2a10" opacity="0.5"/>
  ${cupsSVG}
</svg>`;
}

// ── Frame → GIF helpers ───────────────────────────────────────────────────────

async function svgToRgba(svgStr, W, H) {
  const { data } = await sharp(Buffer.from(svgStr))
    .resize(W, H)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return data;
}

async function encodeGif(frames, W, H, delay) {
  const encoder = new GIFEncoder(W, H, "neuquant", true);
  encoder.setDelay(delay);
  encoder.setRepeat(0);
  encoder.setQuality(10);
  encoder.start();
  for (const frame of frames) {
    encoder.addFrame(frame);
  }
  encoder.finish();
  return Buffer.from(encoder.out.getData());
}

// ── Intro GIF ─────────────────────────────────────────────────────────────────
// Cup 0 (leftmost, where ball starts) is lifted. Ball is visible.
// 8 frames × 300ms each = 2.4s total, then loops (bot edits after 2.5s)

async function generateIntroGif(numCups, W, H, positions) {
  const LIFT_MAX = 90;
  const FRAMES = 5;
  const frames = [];
  for (let f = 0; f < FRAMES; f++) {
    // Pulse: lift amount oscillates slightly for visual interest
    const t = f / (FRAMES - 1);
    const lift = LIFT_MAX + Math.sin(t * Math.PI * 2) * 6;
    const cupsState = positions.map((cx, i) => ({
      cx,
      liftPx: i === 0 ? lift : 0,
      hasBall: i === 0,   // ball under cup 0 (shown because lifted)
      ballGlow: null,
    }));
    const svg = sceneSVG(W, H, cupsState, "Where is the ball?");
    frames.push(await svgToRgba(svg, W, H));
  }
  return encodeGif(frames, W, H, 300);
}

// ── Shuffle GIF ───────────────────────────────────────────────────────────────
// Animates the cup swaps from the animation definition.
// Each swap takes SWAP_FRAMES frames at FRAME_DELAY ms.

const SWAP_FRAMES = 9;
const FRAME_DELAY = 50;
const ARC_HEIGHT = 65;

async function generateShuffleGif(numCups, W, H, positions, swaps) {
  const frames = [];
  // Track which index the ball is at
  let ballAt = 0;
  // Cup positions (mutable during animation)
  let cupXs = [...positions];

  for (let si = 0; si < swaps.length; si++) {
    const [a, b] = swaps[si];
    const startA = cupXs[a];
    const startB = cupXs[b];
    // Alternate which cup goes over the other
    const aGoesOver = si % 2 === 0;

    for (let f = 0; f < SWAP_FRAMES; f++) {
      const t = f / (SWAP_FRAMES - 1);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // ease-in-out
      const arcA = aGoesOver ? -ARC_HEIGHT * Math.sin(Math.PI * ease) : 0;
      const arcB = aGoesOver ? 0 : -ARC_HEIGHT * Math.sin(Math.PI * ease);

      // Build cup state
      const cupsState = cupXs.map((cx, i) => ({ cx, liftPx: 0, hasBall: false }));
      cupsState[a].cx = startA + (startB - startA) * ease;
      cupsState[b].cx = startB + (startA - startB) * ease;
      cupsState[a].liftPx = -arcA; // negative because liftPx goes up
      cupsState[b].liftPx = -arcB;

      frames.push(await svgToRgba(sceneSVG(W, H, cupsState, "Follow the ball!"), W, H));
    }

    // Finalize positions after swap
    const tmp = cupXs[a];
    cupXs[a] = cupXs[b];
    cupXs[b] = tmp;
    if (ballAt === a) ballAt = b;
    else if (ballAt === b) ballAt = a;

    // Brief pause between swaps
    const pauseSvg = sceneSVG(W, H, cupXs.map(cx => ({ cx, liftPx: 0, hasBall: false })), "Follow the ball!");
    const pauseFrame = await svgToRgba(pauseSvg, W, H);
    for (let p = 0; p < 3; p++) frames.push(pauseFrame);
  }

  // Final static frame — cups settled
  const finalSvg = sceneSVG(W, H, cupXs.map(cx => ({ cx, liftPx: 0, hasBall: false })), "Which cup?");
  const finalFrame = await svgToRgba(finalSvg, W, H);
  for (let p = 0; p < 5; p++) frames.push(finalFrame);

  return encodeGif(frames, W, H, FRAME_DELAY);
}

// ── Reveal GIF ────────────────────────────────────────────────────────────────
// Cup `revealCup` (0-indexed) rises to reveal the ball (if hasBall).
// `glowType`: "win" (green) | "lose" (red)

async function generateRevealGif(numCups, W, H, positions, revealCupIdx, hasBall, glowType) {
  const LIFT_FRAMES = 10;
  const HOLD_FRAMES = 6;
  const frames = [];

  const glowColor = glowType === "win" ? "#44ff66" : "#ff4444";

  // Rise phase
  for (let f = 0; f < LIFT_FRAMES; f++) {
    const t = f / (LIFT_FRAMES - 1);
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    const lift = ease * 100;
    const cupsState = positions.map((cx, i) => ({
      cx,
      liftPx: i === revealCupIdx ? lift : 0,
      hasBall: i === revealCupIdx && hasBall,
      ballGlow: i === revealCupIdx && hasBall ? glowType : null,
    }));
    frames.push(await svgToRgba(sceneSVG(W, H, cupsState), W, H));
  }

  // Hold phase (cup lifted, ball visible)
  const holdState = positions.map((cx, i) => ({
    cx,
    liftPx: i === revealCupIdx ? 100 : 0,
    hasBall: i === revealCupIdx && hasBall,
    ballGlow: i === revealCupIdx && hasBall ? glowType : null,
  }));
  const holdSvg = sceneSVG(W, H, holdState);
  const holdFrame = await svgToRgba(holdSvg, W, H);
  for (let p = 0; p < HOLD_FRAMES; p++) frames.push(holdFrame);

  return encodeGif(frames, W, H, FRAME_DELAY);
}

// ── Main generator ────────────────────────────────────────────────────────────

async function generateAll() {
  console.log("🎲 Generating Shell Game assets...");

  for (const [diff, animList] of Object.entries(ANIMATIONS)) {
    const numCups = NUM_CUPS[diff];
    const { W, H } = getDims(numCups);
    const positions = cupPositions(numCups, W);

    for (let animIdx = 0; animIdx < animList.length; animIdx++) {
      const { swaps } = animList[animIdx];
      const winningCup = computeWinningCup(swaps);
      const animDir = path.join(OUT_DIR, diff, `animation${String(animIdx + 1).padStart(3, "0")}`);
      await mkdir(animDir, { recursive: true });

      console.log(`  [${diff}] animation${animIdx + 1} → winningCup=${winningCup}`);

      // intro.gif
      const introGif = await generateIntroGif(numCups, W, H, positions);
      await writeFile(path.join(animDir, "intro.gif"), introGif);

      // shuffle.gif
      const shuffleGif = await generateShuffleGif(numCups, W, H, positions, swaps);
      await writeFile(path.join(animDir, "shuffle.gif"), shuffleGif);

      // reveal GIFs for each cup position
      for (let c = 0; c < numCups; c++) {
        // reveal_win_{c+1}.gif  — cup c+1 lifted, ball there, green glow
        const winGif = await generateRevealGif(numCups, W, H, positions, c, true, "win");
        await writeFile(path.join(animDir, `reveal_win_${c + 1}.gif`), winGif);

        // reveal_lose_{c+1}.gif — cup c+1 lifted, ball there, red glow
        const loseGif = await generateRevealGif(numCups, W, H, positions, c, true, "lose");
        await writeFile(path.join(animDir, `reveal_lose_${c + 1}.gif`), loseGif);
      }

      // metadata.json
      await writeFile(
        path.join(animDir, "metadata.json"),
        JSON.stringify({ winningCup }),
      );
    }
  }

  console.log("✅ Shell Game assets generated successfully.");
}

generateAll().catch(err => {
  console.error("❌ Shell Game asset generation failed:", err);
  process.exit(1);
});
