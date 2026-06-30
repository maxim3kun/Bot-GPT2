/**
 * Shell Game — GIF asset generator (v3)
 *
 * 10 VISUAL THEMES — each with a completely different look:
 *   background, table, cup colors, ball color, lighting
 *
 * Generates:
 *   public/shellgame/{difficulty}/animation{N}/
 *     animation.gif, final.png, reveal_win_{N}.gif, reveal_lose_{N}.gif, metadata.json
 *   public/shellgame/test/style{N}/
 *     animation.gif, metadata.json
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

// ── 10 Visual Themes ──────────────────────────────────────────────────────────

const THEMES = [
  // 1 — Casino Classic: warm red velvet, golden cups
  {
    name: "Casino Classic",
    bg1: "#1a0808", bg2: "#2d1010",
    bgAccent: "#2d1010", bgAccentOpacity: 0.5,
    tableColor: "#1c0404", tableEdge: "#4a0a0a", tableHighlight: "#6a1010",
    cupG: ["#6b3d10","#b87328","#d4952c","#a06020","#4a2a08"],
    cupRim: "#8a5010", cupRimShine: "#c88830", cupBot: "#6a3a0c", cupLabel: "#c8a060", cupStroke: "#2e1806",
    shadowColor: "#000", shadowOpacity: 0.45,
    ballG: ["#ff9966","#cc2200","#880000"], ballGlowColor: "#ffaa00",
    revealWinGlow: "#66ff44", revealLoseGlow: "#ff4444",
    titleColor: "#d4a060",
    extra: (W, H) => ``, // no extra decoration
  },
  // 2 — Neon Cyber: pure black bg, electric blue cups, magenta ball
  {
    name: "Neon Cyber",
    bg1: "#030308", bg2: "#07050f",
    bgAccent: "#110033", bgAccentOpacity: 0.7,
    tableColor: "#080018", tableEdge: "#2200bb", tableHighlight: "#4400ff",
    cupG: ["#001055","#0033cc","#1155ff","#0033aa","#001044"],
    cupRim: "#0044dd", cupRimShine: "#55aaff", cupBot: "#002299", cupLabel: "#55ccff", cupStroke: "#001188",
    shadowColor: "#0022ff", shadowOpacity: 0.5,
    ballG: ["#ff88ff","#cc00cc","#880088"], ballGlowColor: "#ff00ff",
    revealWinGlow: "#00ffaa", revealLoseGlow: "#ff3333",
    titleColor: "#00ffff",
    extra: (W, H) => {
      // Neon scan-lines effect
      const lines = Array.from({length: 14}, (_, i) => {
        const y = 20 + i * 18;
        return `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#4400ff" stroke-width="0.5" opacity="0.12"/>`;
      }).join("");
      // Corner glow dots
      return `${lines}
      <circle cx="30" cy="30" r="4" fill="#ff00ff" opacity="0.6"/>
      <circle cx="${W-30}" cy="30" r="4" fill="#00ffff" opacity="0.6"/>
      <circle cx="30" cy="${H-30}" r="4" fill="#00ffff" opacity="0.4"/>
      <circle cx="${W-30}" cy="${H-30}" r="4" fill="#ff00ff" opacity="0.4"/>`;
    },
  },
  // 3 — Medieval Tavern: rough wood, candlelight, dark brown
  {
    name: "Medieval Tavern",
    bg1: "#1a0e04", bg2: "#0e0802",
    bgAccent: "#2a1206", bgAccentOpacity: 0.6,
    tableColor: "#2a1404", tableEdge: "#5a2e0a", tableHighlight: "#7a3e10",
    cupG: ["#3a1f08","#7a3e14","#9a5020","#6a3410","#2a1006"],
    cupRim: "#6a3410", cupRimShine: "#9a5a20", cupBot: "#4a2408", cupLabel: "#d4884a", cupStroke: "#1a0a04",
    shadowColor: "#000", shadowOpacity: 0.5,
    ballG: ["#ffcc44","#ff8800","#cc4400"], ballGlowColor: "#ff8800",
    revealWinGlow: "#ffcc00", revealLoseGlow: "#ff4400",
    titleColor: "#d4884a",
    extra: (W, H) => {
      // Wood grain lines on background
      const grains = Array.from({length:8}, (_,i) => {
        const y = 30 + i*28;
        return `<path d="M0,${y} Q${W*0.3},${y+4} ${W*0.6},${y-3} Q${W*0.8},${y+5} ${W},${y+2}" stroke="#2a1206" stroke-width="1.5" fill="none" opacity="0.35"/>`;
      }).join("");
      // Candle glow at corners
      return `${grains}
      <radialGradient id="candle1" cx="0%" cy="0%"><stop offset="0%" stop-color="#ff8800" stop-opacity="0.25"/><stop offset="100%" stop-color="#ff8800" stop-opacity="0"/></radialGradient>
      <radialGradient id="candle2" cx="100%" cy="0%"><stop offset="0%" stop-color="#ff8800" stop-opacity="0.2"/><stop offset="100%" stop-color="#ff8800" stop-opacity="0"/></radialGradient>
      <rect width="${W*0.35}" height="${H*0.5}" fill="url(#candle1)" opacity="0.8"/>
      <rect x="${W*0.65}" width="${W*0.35}" height="${H*0.5}" fill="url(#candle2)" opacity="0.8"/>`;
    },
  },
  // 4 — Deep Space: starfield, metallic silver cups, blue plasma ball
  {
    name: "Deep Space",
    bg1: "#000008", bg2: "#000014",
    bgAccent: "#00001a", bgAccentOpacity: 0.3,
    tableColor: "#0a0a14", tableEdge: "#1a1a30", tableHighlight: "#2a2a44",
    cupG: ["#444455","#888899","#aaaacc","#777788","#333344"],
    cupRim: "#6666aa", cupRimShine: "#aaaadd", cupBot: "#4444aa", cupLabel: "#aaaaff", cupStroke: "#222233",
    shadowColor: "#0000ff", shadowOpacity: 0.3,
    ballG: ["#88aaff","#2244dd","#001188"], ballGlowColor: "#4488ff",
    revealWinGlow: "#44ffaa", revealLoseGlow: "#ff4444",
    titleColor: "#88aaff",
    extra: (W, H) => {
      // Stars
      const stars = Array.from({length:55}, (_, i) => {
        const x = (i * 97 + 13) % W;
        const y = (i * 61 + 7) % (H - 30);
        const r = (i % 3 === 0) ? 1.5 : 0.8;
        const op = 0.4 + (i % 5) * 0.12;
        return `<circle cx="${x}" cy="${y}" r="${r}" fill="white" opacity="${op.toFixed(2)}"/>`;
      }).join("");
      // Nebula glow
      return `${stars}
      <radialGradient id="nebula" cx="70%" cy="30%"><stop offset="0%" stop-color="#4422aa" stop-opacity="0.3"/><stop offset="100%" stop-color="#4422aa" stop-opacity="0"/></radialGradient>
      <ellipse cx="${W*0.7}" cy="${H*0.3}" rx="${W*0.4}" ry="${H*0.35}" fill="url(#nebula)"/>`;
    },
  },
  // 5 — Emerald Forest: deep green felt, natural wood cups, golden ball
  {
    name: "Emerald Forest",
    bg1: "#041a06", bg2: "#061408",
    bgAccent: "#0a2210", bgAccentOpacity: 0.6,
    tableColor: "#052210", tableEdge: "#0a4420", tableHighlight: "#0e5525",
    cupG: ["#3a2808","#6a4e18","#8a6825","#5a3e14","#2a1a06"],
    cupRim: "#5a3e14", cupRimShine: "#8a6825", cupBot: "#3a2808", cupLabel: "#b8a050", cupStroke: "#1a1006",
    shadowColor: "#001800", shadowOpacity: 0.5,
    ballG: ["#ffee88","#ddaa22","#aa7700"], ballGlowColor: "#ffcc44",
    revealWinGlow: "#88ff44", revealLoseGlow: "#ff4444",
    titleColor: "#88dd66",
    extra: (W, H) => {
      // Subtle leaf pattern and moss texture on sides
      const leaves = [
        `<ellipse cx="25" cy="50" rx="18" ry="9" fill="#0a3318" opacity="0.5" transform="rotate(-30,25,50)"/>`,
        `<ellipse cx="40" cy="35" rx="14" ry="7" fill="#0d4420" opacity="0.4" transform="rotate(20,40,35)"/>`,
        `<ellipse cx="${W-25}" cy="60" rx="18" ry="9" fill="#0a3318" opacity="0.5" transform="rotate(30,${W-25},60)"/>`,
        `<ellipse cx="${W-40}" cy="40" rx="14" ry="7" fill="#0d4420" opacity="0.4" transform="rotate(-20,${W-40},40)"/>`,
      ].join("");
      // Subtle light rays
      return `${leaves}
      <radialGradient id="sunray" cx="50%" cy="-10%"><stop offset="0%" stop-color="#88ff44" stop-opacity="0.1"/><stop offset="100%" stop-color="#88ff44" stop-opacity="0"/></radialGradient>
      <ellipse cx="${W/2}" cy="0" rx="${W*0.5}" ry="${H*0.6}" fill="url(#sunray)"/>`;
    },
  },
  // 6 — Arctic Ice: white/blue gradient, crystal cups, cold white ball
  {
    name: "Arctic Ice",
    bg1: "#e8f4ff", bg2: "#c8e4ff",
    bgAccent: "#d0eaff", bgAccentOpacity: 0.6,
    tableColor: "#b0d8ff", tableEdge: "#80b8ee", tableHighlight: "#a0ccff",
    cupG: ["#c8e8ff","#88bbee","#aad4ff","#80b0dd","#b0d0ee"],
    cupRim: "#88bbee", cupRimShine: "#ddeeff", cupBot: "#70aad8", cupLabel: "#2266aa", cupStroke: "#5599cc",
    shadowColor: "#4488cc", shadowOpacity: 0.25,
    ballG: ["#ffffff","#ccddff","#8899cc"], ballGlowColor: "#aaccff",
    revealWinGlow: "#44ffcc", revealLoseGlow: "#ff4466",
    titleColor: "#1155aa",
    extra: (W, H) => {
      // Ice crack lines
      const cracks = [
        `<path d="M${W*0.15},0 L${W*0.18},${H*0.25} L${W*0.22},${H*0.15} L${W*0.25},${H*0.35}" stroke="#88bbdd" stroke-width="0.8" fill="none" opacity="0.4"/>`,
        `<path d="M${W*0.75},0 L${W*0.73},${H*0.2} L${W*0.78},${H*0.3} L${W*0.72},${H*0.45}" stroke="#88bbdd" stroke-width="0.8" fill="none" opacity="0.3"/>`,
      ].join("");
      // Snow particles
      const snow = Array.from({length:20}, (_,i) => {
        const x = (i * 113 + 20) % W;
        const y = (i * 67 + 10) % (H*0.7);
        return `<circle cx="${x}" cy="${y}" r="${1 + (i%2)}" fill="white" opacity="${0.5 + (i%3)*0.15}"/>`;
      }).join("");
      return `${cracks}${snow}`;
    },
  },
  // 7 — Volcanic: obsidian table, dark red cups with orange glow, lava ball
  {
    name: "Volcanic",
    bg1: "#0a0200", bg2: "#150400",
    bgAccent: "#200800", bgAccentOpacity: 0.7,
    tableColor: "#100400", tableEdge: "#440a00", tableHighlight: "#660e00",
    cupG: ["#1a0800","#4a1400","#6a2000","#3a1000","#120600"],
    cupRim: "#5a1a00", cupRimShine: "#aa3300", cupBot: "#3a0e00", cupLabel: "#ff5522", cupStroke: "#0e0400",
    shadowColor: "#ff2200", shadowOpacity: 0.35,
    ballG: ["#ff8833","#ff4400","#cc1100"], ballGlowColor: "#ff4400",
    revealWinGlow: "#ffcc00", revealLoseGlow: "#ff2200",
    titleColor: "#ff6633",
    extra: (W, H) => {
      // Lava crack glow lines
      const cracks = [
        `<path d="M${W*0.1},${H} L${W*0.15},${H*0.65} L${W*0.2},${H*0.8} L${W*0.25},${H*0.55}" stroke="#ff4400" stroke-width="2" fill="none" opacity="0.4"/>`,
        `<path d="M${W*0.6},${H} L${W*0.65},${H*0.7} L${W*0.7},${H*0.85} L${W*0.78},${H*0.6}" stroke="#ff4400" stroke-width="1.5" fill="none" opacity="0.35"/>`,
        `<path d="M${W*0.4},${H} L${W*0.42},${H*0.75}" stroke="#ff6600" stroke-width="1" fill="none" opacity="0.3"/>`,
      ].join("");
      // Bottom heat glow
      return `${cracks}
      <radialGradient id="lavatop" cx="50%" cy="100%"><stop offset="0%" stop-color="#ff2200" stop-opacity="0.5"/><stop offset="100%" stop-color="#ff2200" stop-opacity="0"/></radialGradient>
      <ellipse cx="${W/2}" cy="${H}" rx="${W*0.6}" ry="${H*0.3}" fill="url(#lavatop)"/>`;
    },
  },
  // 8 — Golden Kingdom: rich dark bg, ornate gold-trimmed cups, diamond ball
  {
    name: "Golden Kingdom",
    bg1: "#10080a", bg2: "#180c10",
    bgAccent: "#20100a", bgAccentOpacity: 0.5,
    tableColor: "#1a0c08", tableEdge: "#8a6020", tableHighlight: "#c89040",
    cupG: ["#2a1a04","#c89040","#ffe060","#b07830","#1a1002"],
    cupRim: "#d09040", cupRimShine: "#fff0a0", cupBot: "#a07020", cupLabel: "#fff0a0", cupStroke: "#1a0c04",
    shadowColor: "#884400", shadowOpacity: 0.4,
    ballG: ["#eeffff","#aaccee","#6688aa"], ballGlowColor: "#ccddff",
    revealWinGlow: "#ffee44", revealLoseGlow: "#ff4444",
    titleColor: "#ffe060",
    extra: (W, H) => {
      // Ornate border decoration
      const border = `
      <rect x="8" y="8" width="${W-16}" height="${H-16}" rx="4" fill="none" stroke="#c89040" stroke-width="1.5" opacity="0.5"/>
      <rect x="12" y="12" width="${W-24}" height="${H-24}" rx="3" fill="none" stroke="#ffe060" stroke-width="0.5" opacity="0.3"/>`;
      // Corner ornaments
      const corners = [
        `<circle cx="20" cy="20" r="5" fill="none" stroke="#c89040" stroke-width="1" opacity="0.6"/>`,
        `<circle cx="${W-20}" cy="20" r="5" fill="none" stroke="#c89040" stroke-width="1" opacity="0.6"/>`,
        `<circle cx="20" cy="${H-20}" r="5" fill="none" stroke="#c89040" stroke-width="1" opacity="0.6"/>`,
        `<circle cx="${W-20}" cy="${H-20}" r="5" fill="none" stroke="#c89040" stroke-width="1" opacity="0.6"/>`,
      ].join("");
      // Central glow
      return `${border}${corners}
      <radialGradient id="goldglow" cx="50%" cy="50%"><stop offset="0%" stop-color="#c89040" stop-opacity="0.15"/><stop offset="100%" stop-color="#c89040" stop-opacity="0"/></radialGradient>
      <ellipse cx="${W/2}" cy="${H/2}" rx="${W*0.4}" ry="${H*0.35}" fill="url(#goldglow)"/>`;
    },
  },
  // 9 — Ocean Depths: dark blue bg, teal cups, pearl ball
  {
    name: "Ocean Depths",
    bg1: "#010e1a", bg2: "#021422",
    bgAccent: "#031830", bgAccentOpacity: 0.6,
    tableColor: "#041a2e", tableEdge: "#0a3a5a", tableHighlight: "#0e4a6e",
    cupG: ["#082244","#104888","#1a6aaa","#0e3a6e","#061828"],
    cupRim: "#1a6aaa", cupRimShine: "#44aadd", cupBot: "#0e4488", cupLabel: "#66ccee", cupStroke: "#041222",
    shadowColor: "#002244", shadowOpacity: 0.5,
    ballG: ["#f0f8ff","#ccddee","#8899aa"], ballGlowColor: "#aaccdd",
    revealWinGlow: "#44ffcc", revealLoseGlow: "#ff4466",
    titleColor: "#44aadd",
    extra: (W, H) => {
      // Bubble particles
      const bubbles = Array.from({length:18}, (_,i) => {
        const x = 20 + (i * 107 + 15) % (W - 40);
        const y = 10 + (i * 73 + 5) % (H * 0.55);
        const r = 2 + (i % 3) * 1.5;
        return `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#44aadd" stroke-width="0.8" opacity="${0.25 + (i%4)*0.1}"/>`;
      }).join("");
      // Caustic light rays from top
      const rays = Array.from({length:6}, (_,i) => {
        const x = W*0.1 + i * W*0.14;
        return `<line x1="${x}" y1="0" x2="${x + W*0.05}" y2="${H*0.6}" stroke="#1a6aaa" stroke-width="8" opacity="0.08"/>`;
      }).join("");
      return `${rays}${bubbles}`;
    },
  },
  // 10 — Midnight Purple: dark velvet, deep purple cups, violet glow
  {
    name: "Midnight Purple",
    bg1: "#080410", bg2: "#0e0620",
    bgAccent: "#140830", bgAccentOpacity: 0.6,
    tableColor: "#0e0620", tableEdge: "#3a1a6a", tableHighlight: "#4a2288",
    cupG: ["#180a30","#4422aa","#6633cc","#3311aa","#100824"],
    cupRim: "#5533bb", cupRimShine: "#9966dd", cupBot: "#3311aa", cupLabel: "#bb88ff", cupStroke: "#100828",
    shadowColor: "#4400aa", shadowOpacity: 0.45,
    ballG: ["#ee88ff","#cc44ee","#880099"], ballGlowColor: "#cc44ff",
    revealWinGlow: "#88ffcc", revealLoseGlow: "#ff4488",
    titleColor: "#bb88ff",
    extra: (W, H) => {
      // Magical sparkles
      const sparks = Array.from({length:25}, (_,i) => {
        const x = (i * 83 + 17) % W;
        const y = (i * 61 + 11) % (H * 0.8);
        const size = 1.5 + (i % 3) * 1;
        const op = 0.3 + (i % 5) * 0.12;
        // Diamond shape sparkle
        return `<polygon points="${x},${y-size} ${x+size*0.5},${y} ${x},${y+size} ${x-size*0.5},${y}" fill="#cc88ff" opacity="${op.toFixed(2)}"/>`;
      }).join("");
      // Mystical glow rings
      return `${sparks}
      <radialGradient id="mystic" cx="50%" cy="40%"><stop offset="0%" stop-color="#6633cc" stop-opacity="0.25"/><stop offset="100%" stop-color="#6633cc" stop-opacity="0"/></radialGradient>
      <ellipse cx="${W/2}" cy="${H*0.4}" rx="${W*0.45}" ry="${H*0.38}" fill="url(#mystic)"/>`;
    },
  },
];

// ── Pacing configs (same 10 — one per theme) ─────────────────────────────────
const PACING = [
  { swapFrames:12, pauseFrames:5, arcHeight:65, baseDelayMs:55,
    getPacing(i,n){ const t=i/Math.max(n-1,1); return t<0.18?2.2-t/0.18:t<0.35?1.2-(t-0.18)/0.17*0.35:t<0.72?0.85:0.85+(t-0.72)/0.28*1.35; }},
  { swapFrames:10, pauseFrames:3, arcHeight:72, baseDelayMs:68,
    getPacing(i,n){ const t=i/Math.max(n-1,1); return t<0.25?1.8-t/0.25*0.9:t<0.65?0.7+Math.sin(Math.PI*(t-0.25)/0.4)*0.2:0.85+(t-0.65)/0.35*0.95; }},
  { swapFrames:9, pauseFrames:3, arcHeight:55, baseDelayMs:62,
    getPacing(i,n){ const t=i/Math.max(n-1,1); return 1.4+0.8*Math.abs(Math.cos(Math.PI*t)); }},
  { swapFrames:9, pauseFrames:3, arcHeight:50, baseDelayMs:96,
    getPacing(i,n){ const t=i/Math.max(n-1,1); return 0.85+0.2*Math.sin(Math.PI*t*2.5+0.3); }},
  { swapFrames:11, pauseFrames:5, arcHeight:68, baseDelayMs:58,
    getPacing(i,n){ const b=i%3; const p=Math.floor(i/3)/Math.max(Math.ceil(n/3)-1,1); const base=b===0?1.4:b===1?2.2:0.9; return base*(1.1-p*0.2); }},
  { swapFrames:10, pauseFrames:3, arcHeight:70, baseDelayMs:60,
    getPacing(i,n){ const t=i/Math.max(n-1,1); return 2.8*Math.pow(1-t*0.75,1.8)+0.65; }},
  { swapFrames:12, pauseFrames:4, arcHeight:70, baseDelayMs:60,
    getPacing(i,n){ const t=i/Math.max(n-1,1); return 0.65+2.4*Math.pow(t,1.6); }},
  { swapFrames:11, pauseFrames:4, arcHeight:75, baseDelayMs:58,
    getPacing(i,n){ const t=i/Math.max(n-1,1); const env=0.85+1.2*Math.pow(Math.abs(t-0.5)*2,1.4); return env*(1+0.55*Math.sin(i*1.9)); }},
  { swapFrames:8, pauseFrames:4, arcHeight:90, baseDelayMs:72,
    getPacing(i,n){ const t=i/Math.max(n-1,1); return 1.6+0.6*(1-Math.sin(Math.PI*t)); }},
  { swapFrames:10, pauseFrames:3, arcHeight:62, baseDelayMs:88,
    getPacing(i,n){ const t=i/Math.max(n-1,1); return 0.95+0.15*Math.sin(Math.PI*t); }},
];

// Merge themes and pacing into STYLES array
const STYLES = THEMES.map((th, i) => ({ ...th, ...PACING[i], id: i+1, description: th.name }));

// ── SVG rendering (theme-aware) ───────────────────────────────────────────────

// Cup is INVERTED (shell game) — wide opening face-down on the table, narrow top
function cupSVG(cx, baseY, liftPx = 0, cupIdx, hasBall = false, ballGlow = null, theme) {
  const ty = baseY - CUP_H - liftPx;   // top of cup — narrow knob
  const by = baseY - liftPx;            // bottom of cup — wide rim, rests on table
  const tw = CUP_BOT_W / 2;            // narrow at top (was bottom width)
  const bw = CUP_TOP_W / 2;            // wide at bottom (was top width)
  const gradId = `cg${cupIdx}_${theme.id}`;

  // Ball sits on the table at a fixed Y — the cup lifts to reveal it
  const ballSVG = hasBall && liftPx > 0
    ? (() => {
        const glowColor = ballGlow === "win" ? theme.revealWinGlow : ballGlow === "lose" ? theme.revealLoseGlow : theme.ballGlowColor;
        const bby = baseY - BALL_R;   // always table level, never moves with liftPx
        return `
        <defs>
          <radialGradient id="bg${cupIdx}t${theme.id}" cx="35%" cy="30%">
            <stop offset="0%" stop-color="${theme.ballG[0]}"/>
            <stop offset="55%" stop-color="${theme.ballG[1]}"/>
            <stop offset="100%" stop-color="${theme.ballG[2]}"/>
          </radialGradient>
          <filter id="bglow${cupIdx}t${theme.id}">
            <feGaussianBlur stdDeviation="5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <circle cx="${cx}" cy="${bby}" r="${BALL_R+10}" fill="${glowColor}" opacity="0.45" filter="url(#bglow${cupIdx}t${theme.id})"/>
        <circle cx="${cx}" cy="${bby}" r="${BALL_R}" fill="url(#bg${cupIdx}t${theme.id})" stroke="${theme.ballG[2]}" stroke-width="1.5"/>
        <ellipse cx="${cx-6}" cy="${bby-6}" rx="5" ry="3" fill="rgba(255,255,255,0.35)" transform="rotate(-30,${cx},${bby})"/>`;
      })()
    : "";

  const [c0,c1,c2,c3,c4] = theme.cupG;
  return `
  ${ballSVG}
  <defs>
    <linearGradient id="${gradId}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="${c0}"/>
      <stop offset="25%"  stop-color="${c1}"/>
      <stop offset="60%"  stop-color="${c2}"/>
      <stop offset="85%"  stop-color="${c3}"/>
      <stop offset="100%" stop-color="${c4}"/>
    </linearGradient>
  </defs>
  <!-- Shadow under the wide opening -->
  <ellipse cx="${cx}" cy="${by+5}" rx="${bw+10}" ry="6" fill="${theme.shadowColor}" opacity="${theme.shadowOpacity}"/>
  <!-- Cup body: narrow top, wide bottom (inverted) -->
  <path d="M${cx-tw},${ty} L${cx+tw},${ty} L${cx+bw},${by} L${cx-bw},${by} Z"
        fill="url(#${gradId})" stroke="${theme.cupStroke}" stroke-width="2" stroke-linejoin="round"/>
  <!-- Flat knob at the top (narrow end) -->
  <ellipse cx="${cx}" cy="${ty}" rx="${tw+3}" ry="5" fill="${theme.cupBot}" stroke="${theme.cupStroke}" stroke-width="1.5"/>
  <ellipse cx="${cx}" cy="${ty}" rx="${tw}" ry="3" fill="${theme.cupRimShine}" opacity="0.4"/>
  <!-- Rim at the bottom (wide opening, face-down on table) -->
  <ellipse cx="${cx}" cy="${by}" rx="${bw+4}" ry="7" fill="${theme.cupRim}" stroke="${theme.cupStroke}" stroke-width="1.5"/>
  <ellipse cx="${cx}" cy="${by}" rx="${bw}" ry="4" fill="${theme.cupRimShine}" opacity="0.3"/>
  <!-- Highlight stripe on the side -->
  <path d="M${cx-tw*0.5},${ty+6} L${cx-bw*0.45},${by-8}" stroke="rgba(255,255,255,0.14)" stroke-width="9" stroke-linecap="round"/>`;
}

// slotPositions: fixed X coords for numbered slots — labels never move with cups
function sceneSVG(W, H, cupsState, slotPositions, title = "", theme) {
  const cupsSVG = cupsState.map((c, i) =>
    cupSVG(c.cx, SURFACE_Y, c.liftPx??0, i, c.hasBall??false, c.ballGlow??null, theme)
  ).join("\n");

  const titleSVG = title
    ? `<text x="${W/2}" y="28" font-size="20" fill="${theme.titleColor}" text-anchor="middle" font-family="'Arial',sans-serif" font-weight="bold">${title}</text>`
    : "";

  const extraSVG = theme.extra ? theme.extra(W, H) : "";

  // Fixed slot numbers — they NEVER move, only the cups move above them
  const labelsSVG = slotPositions.map((x, i) =>
    `<text x="${x}" y="${H - 12}" font-size="22" fill="${theme.cupLabel}" text-anchor="middle"
      font-family="'Arial',sans-serif" font-weight="bold" opacity="0.75">${i + 1}</text>`
  ).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" shape-rendering="geometricPrecision">
  <defs>
    <linearGradient id="bgGrad${theme.id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${theme.bg1}"/>
      <stop offset="100%" stop-color="${theme.bg2}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bgGrad${theme.id})"/>
  <ellipse cx="${W/2}" cy="${H*0.4}" rx="${W*0.6}" ry="${H*0.3}" fill="${theme.bgAccent}" opacity="${theme.bgAccentOpacity}"/>
  ${extraSVG}
  ${titleSVG}
  <rect x="20" y="${SURFACE_Y}" width="${W-40}" height="${H-SURFACE_Y-10}" rx="6" fill="${theme.tableColor}"/>
  <rect x="20" y="${SURFACE_Y}" width="${W-40}" height="6" rx="3" fill="${theme.tableEdge}"/>
  <rect x="22" y="${SURFACE_Y+1}" width="${W-44}" height="2" fill="${theme.tableHighlight}" opacity="0.5"/>
  ${cupsSVG}
  ${labelsSVG}
</svg>`;
}

// ── Frame helpers ─────────────────────────────────────────────────────────────

async function svgToRgba(svgStr, W, H) {
  const { data } = await sharp(Buffer.from(svgStr))
    .resize(W, H).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  return data;
}

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

// ── Combined intro + shuffle GIF ──────────────────────────────────────────────

async function generateCombinedGif(numCups, W, H, positions, swaps, style) {
  const frames = [];
  let cupXs = [...positions];
  let ballAt = 0;

  // Intro: cup 0 raised, ball visible
  const INTRO_FRAMES = 9, INTRO_DELAY = 115, LIFT_MAX = 90;
  for (let f = 0; f < INTRO_FRAMES; f++) {
    const t = f / (INTRO_FRAMES - 1);
    const lift = LIFT_MAX + Math.sin(t * Math.PI * 1.5) * 8;
    const cupsState = positions.map((cx, i) => ({ cx, liftPx: i===0?lift:0, hasBall: i===0, ballGlow: null }));
    frames.push({ data: await svgToRgba(sceneSVG(W, H, cupsState, positions, "Watch carefully!", style), W, H), delay: INTRO_DELAY });
  }
  // Cup lowers transition
  for (let f = 0; f < 4; f++) {
    const lift = LIFT_MAX * (1 - f / 3);
    const cupsState = positions.map((cx, i) => ({ cx, liftPx: i===0?lift:0, hasBall: i===0&&f<3, ballGlow: null }));
    frames.push({ data: await svgToRgba(sceneSVG(W, H, cupsState, positions, "Watch carefully!", style), W, H), delay: 90 });
  }

  // Shuffle
  const { swapFrames, pauseFrames, arcHeight, baseDelayMs, getPacing } = style;
  const n = swaps.length;
  for (let si = 0; si < n; si++) {
    const [a, b] = swaps[si];
    const startA = cupXs[a], startB = cupXs[b];
    const aGoesOver = si % 2 === 0;
    const frameDelay = Math.max(20, Math.round(baseDelayMs * getPacing(si, n)));

    for (let f = 0; f < swapFrames; f++) {
      const t = f / (swapFrames - 1);
      const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
      const arc = arcHeight * Math.sin(Math.PI * ease);
      const cupsState = cupXs.map((cx, i) => ({ cx, liftPx: 0, hasBall: false, ballGlow: null }));
      cupsState[a].cx = startA + (startB - startA) * ease;
      cupsState[b].cx = startB + (startA - startB) * ease;
      cupsState[a].liftPx = aGoesOver ? arc : 0;
      cupsState[b].liftPx = aGoesOver ? 0 : arc;
      frames.push({ data: await svgToRgba(sceneSVG(W, H, cupsState, positions, "Follow the ball!", style), W, H), delay: frameDelay });
    }

    [cupXs[a], cupXs[b]] = [cupXs[b], cupXs[a]];
    if (ballAt === a) ballAt = b; else if (ballAt === b) ballAt = a;

    const pauseSvg = sceneSVG(W, H, cupXs.map(cx => ({ cx, liftPx: 0, hasBall: false })), positions, "Follow the ball!", style);
    const pauseFrame = await svgToRgba(pauseSvg, W, H);
    for (let p = 0; p < pauseFrames; p++) frames.push({ data: pauseFrame, delay: frameDelay });
  }

  // Final static section
  const finalSvg = sceneSVG(W, H, cupXs.map(cx => ({ cx, liftPx: 0, hasBall: false })), positions, "Which cup?", style);
  const finalFrame = await svgToRgba(finalSvg, W, H);
  for (let f = 0; f < 7; f++) frames.push({ data: finalFrame, delay: 180 });

  const totalMs = frames.reduce((s, f) => s + f.delay, 0);
  const gif = await encodeGif(frames, W, H);
  return { gif, totalMs, finalCupXs: cupXs, ballAt };
}

// ── Final static PNG ──────────────────────────────────────────────────────────

async function generateFinalPng(W, H, finalCupXs, slotPositions, style) {
  const cupsState = finalCupXs.map(cx => ({ cx, liftPx: 0, hasBall: false }));
  const svg = sceneSVG(W, H, cupsState, slotPositions, "Which cup?", style);
  return sharp(Buffer.from(svg)).resize(W, H).png().toBuffer();
}

// ── Reveal GIF ────────────────────────────────────────────────────────────────

// positions here are the FINAL cup X positions (after shuffle) — also used as slot labels
async function generateRevealGif(numCups, W, H, positions, revealCupIdx, hasBall, glowType, style) {
  const LIFT_FRAMES = 10, HOLD_FRAMES = 6, FRAME_DELAY = 50;
  // Slot positions for the reveal = the final resting positions of the cups
  const slotPositions = positions;
  const frames = [];
  for (let f = 0; f < LIFT_FRAMES; f++) {
    const t = f / (LIFT_FRAMES - 1);
    const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
    const lift = ease * 100;
    const cupsState = positions.map((cx, i) => ({
      cx, liftPx: i===revealCupIdx ? lift : 0,
      hasBall: i===revealCupIdx && hasBall,
      ballGlow: i===revealCupIdx && hasBall ? glowType : null,
    }));
    frames.push({ data: await svgToRgba(sceneSVG(W, H, cupsState, slotPositions, "", style), W, H), delay: FRAME_DELAY });
  }
  const holdState = positions.map((cx, i) => ({
    cx, liftPx: i===revealCupIdx ? 100 : 0,
    hasBall: i===revealCupIdx && hasBall,
    ballGlow: i===revealCupIdx && hasBall ? glowType : null,
  }));
  const holdFrame = await svgToRgba(sceneSVG(W, H, holdState, slotPositions, "", style), W, H);
  for (let p = 0; p < HOLD_FRAMES; p++) frames.push({ data: holdFrame, delay: FRAME_DELAY });
  return encodeGif(frames, W, H);
}

// ── Game animation swap sequences ─────────────────────────────────────────────

const GAME_ANIMATIONS = {
  easy: [
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

const TEST_SWAPS = [[0,1],[1,2],[0,2],[0,1],[1,2],[0,2],[1,2],[0,1],[0,2],[1,2]];

function computeWinningCup(swaps) {
  let ball = 0;
  for (const [a, b] of swaps) {
    if (ball === a) ball = b; else if (ball === b) ball = a;
  }
  return ball + 1;
}

// ── Main generator ────────────────────────────────────────────────────────────

async function generateAll() {
  const NUM_CUPS = { easy: 3, medium: 4, hard: 5 };
  const gameStyle = STYLES[0]; // Casino Classic as default

  console.log("🎨 Generating Shell Game assets (v3 — 10 visual themes)...\n");

  // Game animations (Style 1 / Casino Classic for all)
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

      const { gif, totalMs, finalCupXs } = await generateCombinedGif(numCups, W, H, positions, swaps, gameStyle);
      await writeFile(path.join(animDir, "animation.gif"), gif);

      const finalPng = await generateFinalPng(W, H, finalCupXs, positions, gameStyle);
      await writeFile(path.join(animDir, "final.png"), finalPng);

      for (let c = 0; c < numCups; c++) {
        const winGif = await generateRevealGif(numCups, W, H, finalCupXs, c, true, "win", gameStyle);
        await writeFile(path.join(animDir, `reveal_win_${c+1}.gif`), winGif);
        const loseGif = await generateRevealGif(numCups, W, H, finalCupXs, c, true, "lose", gameStyle);
        await writeFile(path.join(animDir, `reveal_lose_${c+1}.gif`), loseGif);
      }

      await writeFile(path.join(animDir, "metadata.json"),
        JSON.stringify({ winningCup, durationMs: totalMs, style: gameStyle.name }));
      console.log(`    ✅ ${(totalMs/1000).toFixed(1)}s — theme: ${gameStyle.name}`);
    }
  }

  // Test animations — 10 visual themes, all with same swap sequence (easy, 3 cups)
  console.log("\n  🎨 Generating test animations (10 visual themes)...");
  const numCups = 3;
  const { W, H } = getDims(numCups);
  const positions = cupPositions(numCups, W);
  const winningCup = computeWinningCup(TEST_SWAPS);

  for (const style of STYLES) {
    const testDir = path.join(OUT_DIR, "test", `style${style.id}`);
    await mkdir(testDir, { recursive: true });
    const { gif, totalMs } = await generateCombinedGif(numCups, W, H, positions, TEST_SWAPS, style);
    await writeFile(path.join(testDir, "animation.gif"), gif);
    await writeFile(path.join(testDir, "metadata.json"),
      JSON.stringify({ styleId: style.id, name: style.name, description: style.description, durationMs: totalMs, winningCup }));
    console.log(`  [test] Style ${style.id} — ${style.name} — ${(totalMs/1000).toFixed(1)}s`);
  }

  console.log("\n✅ All assets generated.");
}

generateAll().catch(err => { console.error("❌ Failed:", err); process.exit(1); });
