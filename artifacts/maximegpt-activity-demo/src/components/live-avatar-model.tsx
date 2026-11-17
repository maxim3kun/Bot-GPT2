import type { CSSProperties } from 'react';

export type LiveAvatarModelMode = 'ready' | 'listening' | 'thinking' | 'speaking';

interface LiveAvatarModelProps {
  mode: LiveAvatarModelMode;
  audioLevel: number;
  blinking: boolean;
}

export function LiveAvatarModel({ mode, audioLevel, blinking }: LiveAvatarModelProps) {
  const mouthOpen = mode === 'speaking'
    ? Math.min(1, Math.max(0.16, audioLevel * 2.2))
    : 0;
  const style = {
    '--avatar-mouth-open': mouthOpen,
    '--avatar-gaze-x': mode === 'thinking' ? '2px' : mode === 'listening' ? '1px' : '0px',
  } as CSSProperties;

  return (
    <svg
      className="live-avatar-model"
      viewBox="0 0 500 680"
      preserveAspectRatio="xMidYMax meet"
      role="img"
      aria-label="Maxime, avatar animé"
      data-testid="img-live-character"
      data-mode={mode}
      data-blinking={blinking}
      style={style}
    >
      <defs>
        <linearGradient id="avatar-jacket" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#37e9ff" />
          <stop offset=".48" stopColor="#0797d4" />
          <stop offset="1" stopColor="#07517f" />
        </linearGradient>
        <linearGradient id="avatar-skin" x1=".2" y1="0" x2=".8" y2="1">
          <stop offset="0" stopColor="#ffe0cb" />
          <stop offset="1" stopColor="#e8a994" />
        </linearGradient>
        <linearGradient id="avatar-hair" x1=".15" y1="0" x2=".85" y2="1">
          <stop offset="0" stopColor="#62483f" />
          <stop offset=".48" stopColor="#30262a" />
          <stop offset="1" stopColor="#171c2c" />
        </linearGradient>
        <radialGradient id="avatar-eye" cx=".35" cy=".3" r=".8">
          <stop offset="0" stopColor="#ffd875" />
          <stop offset=".52" stopColor="#cf761f" />
          <stop offset="1" stopColor="#673328" />
        </radialGradient>
        <filter id="avatar-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <g className="live-avatar-torso">
        <path d="M112 364Q145 333 199 333h102q55 0 87 31l79 78v238H33V442z" fill="url(#avatar-jacket)" stroke="#51edff" strokeWidth="5" />
        <path d="M180 354h140l52 70-49 74H180l-50-74z" fill="#087ba9" stroke="#71f5ff" strokeWidth="5" />
        <path d="M204 355h92l30 124H174z" fill="#101d31" stroke="#133a55" strokeWidth="5" />
        <path d="M247 357h8v136h-8z" fill="#37f4ff" filter="url(#avatar-glow)" />
        <path d="M94 435q31 5 63-9l32 19-22 47q-44 20-87 0zM406 435q-31 5-63-9l-32 19 22 47q44 20 87 0z" fill="#0a2741" stroke="#27cde8" strokeWidth="5" />
        <path d="M117 521q133 32 266 0v127H117z" fill="#087bb0" opacity=".75" />
        <path d="M244 491h12v157h-12z" fill="#31dff5" opacity=".8" />
        <circle cx="250" cy="551" r="34" fill="#0874a9" stroke="#45eaff" strokeWidth="8" />
        <circle cx="250" cy="551" r="22" fill="#b7fbff" filter="url(#avatar-glow)" />
        <path d="M92 475l46 7-30 166H58zM408 475l-46 7 30 166h50z" fill="#163149" stroke="#2acde8" strokeWidth="5" />
      </g>

      <g className="live-avatar-arm live-avatar-arm--left">
        <path d="M76 417q-42 18-58 76l-14 129q-2 29 21 33 21 3 29-25l38-116 40-42z" fill="url(#avatar-jacket)" stroke="#55eaff" strokeWidth="5" />
        <path d="M15 605q19 15 43 9l-8 34q-12 15-34 3-18-10-8-46z" fill="#101f32" stroke="#42dff3" strokeWidth="5" />
        <path d="M18 623l28 10" stroke="#38e6f5" strokeWidth="5" />
      </g>
      <g className="live-avatar-arm live-avatar-arm--right">
        <path d="M424 417q42 18 58 76l14 129q2 29-21 33-21 3-29-25l-38-116-40-42z" fill="url(#avatar-jacket)" stroke="#55eaff" strokeWidth="5" />
        <path d="M485 605q-19 15-43 9l8 34q12 15 34 3 18-10 8-46z" fill="#101f32" stroke="#42dff3" strokeWidth="5" />
        <path d="M482 623l-28 10" stroke="#38e6f5" strokeWidth="5" />
      </g>

      <g className="live-avatar-neck">
        <path d="M213 306h74v75q-36 35-74 0z" fill="url(#avatar-skin)" />
        <path d="M193 356q57 39 114 0l25 31q-80 64-164 0z" fill="#101d31" stroke="#127ca9" strokeWidth="5" />
      </g>

      <g className="live-avatar-hair-back">
        <path d="M163 196q-45-97 34-144l-14-39 66 27q43-50 88-2l38-27-5 62q72 45 31 145l-4 107q-18 55-69 58l-153-18q-56-34-32-169z" fill="url(#avatar-hair)" stroke="#171b2a" strokeWidth="7" strokeLinejoin="round" />
        <path d="M173 159q-28-56 9-91l-27 4 42 64M322 97q49-47 85-7l-33 4 28 32M352 250q53 9 62 56l-39-21" fill="#3d3033" stroke="#201d2a" strokeWidth="8" strokeLinejoin="round" />
      </g>

      <g className="live-avatar-head">
        <path d="M179 153q5-61 71-71 79-13 104 57l-6 130q-5 89-83 112-18 8-35 0-78-28-79-113z" fill="url(#avatar-skin)" stroke="#bd8279" strokeWidth="3" />
        <path d="M163 209q-29-37-16-69 20-48 69-39l-12 73-15 48z" fill="url(#avatar-skin)" />
        <path d="M343 195q36-37 21-69-17-34-49-27l11 74 5 39z" fill="url(#avatar-skin)" />
        <path d="M157 190q15 10 29 2M345 190q14-8 24-20" fill="none" stroke="#c87970" strokeWidth="5" strokeLinecap="round" />
        <ellipse cx="196" cy="267" rx="22" ry="9" fill="#f28d88" opacity=".28" />
        <ellipse cx="311" cy="267" rx="22" ry="9" fill="#f28d88" opacity=".28" />

        <g className="live-avatar-eye live-avatar-eye--left">
          <path d="M185 224q18-22 39-2l-2 20q-19 18-36 0z" fill="#fff8ed" />
          <ellipse cx="205" cy="231" rx="8" ry="12" fill="url(#avatar-eye)" />
          <ellipse cx="206" cy="232" rx="4" ry="8" fill="#281d25" />
          <circle cx="208" cy="227" r="3" fill="white" />
          <path d="M181 221q21-20 47-3" fill="none" stroke="#422d32" strokeWidth="7" strokeLinecap="round" />
          <path className="live-avatar-eye-closed" d="M184 232q20 12 39 0" />
        </g>
        <g className="live-avatar-eye live-avatar-eye--right">
          <path d="M277 222q21-21 41 1l-3 20q-18 16-36-1z" fill="#fff8ed" />
          <ellipse cx="298" cy="230" rx="9" ry="12" fill="url(#avatar-eye)" />
          <ellipse cx="299" cy="232" rx="4.5" ry="8" fill="#281d25" />
          <circle cx="302" cy="226" r="3.5" fill="white" />
          <path d="M274 219q22-19 48 1" fill="none" stroke="#422d32" strokeWidth="7" strokeLinecap="round" />
          <path className="live-avatar-eye-closed" d="M277 232q20 12 39 0" />
        </g>
        <path d="M249 231q-8 25-10 35 5 6 14 3" fill="none" stroke="#c98e80" strokeWidth="4" strokeLinecap="round" />
        <g className="live-avatar-mouth">
          <path className="live-avatar-mouth-closed" d="M233 296q17 13 35 0" fill="none" stroke="#a75559" strokeWidth="4" strokeLinecap="round" />
          <ellipse className="live-avatar-mouth-open" cx="250" cy="298" rx="13" ry="12" fill="#7e3444" />
          <path d="M241 296q9 5 18 0" fill="none" stroke="#ffb4ad" strokeWidth="3" strokeLinecap="round" />
        </g>
      </g>

      <g className="live-avatar-hair-front">
        <path d="M151 201q-29-52-2-101-18-54 33-70l-4-26 50 18q48-40 79 0l34-17 3 37q52 28 40 82l31 45-42-10q-12 32-35 48l-1-55q-35 6-55-23-18 46-73 65l10-43q-31 34-64 50z" fill="url(#avatar-hair)" stroke="#171b2a" strokeWidth="7" strokeLinejoin="round" />
        <path d="M173 85q39-39 81-31M202 121q41-55 95-57M279 81q33-12 62 9" fill="none" stroke="#806157" strokeWidth="8" strokeLinecap="round" opacity=".44" />
        <path d="M171 163q44-12 76-70-4 41-38 76M290 84q44 14 59 47-34-4-50-25" fill="#28232a" opacity=".9" />
      </g>
    </svg>
  );
}
