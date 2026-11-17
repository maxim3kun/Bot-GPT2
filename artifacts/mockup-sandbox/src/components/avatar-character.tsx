import type { CSSProperties } from 'react';
import './avatar-character.css';

const characterSheet = '/__mockup/images/maxime-reference.jpeg';

export type AvatarMode = 'idle' | 'listening' | 'thinking' | 'speaking' | 'paused';

export interface AvatarCharacterProps {
  mode: AvatarMode;
  audioLevel?: number;
  accessibleLabel?: string;
}

const modeLabels: Record<AvatarMode, string> = {
  idle: 'prêt à discuter',
  listening: 'à ton écoute',
  thinking: 'en train de réfléchir',
  speaking: 'en train de parler',
  paused: 'en pause',
};

export function AvatarCharacter({
  mode,
  audioLevel,
  accessibleLabel,
}: AvatarCharacterProps) {
  const rawLevel = audioLevel ?? 0;
  const level = Number.isFinite(rawLevel) ? Math.min(1, Math.max(0, rawLevel)) : 0;
  const audioSource = audioLevel === undefined ? 'voice-status' : 'audio-meter';
  const label = accessibleLabel
    ? `${accessibleLabel} — ${modeLabels[mode]}`
    : `MaximeGPT, ${modeLabels[mode]}`;
  const style = {
    '--avatar-mouth-open': `${1.4 + level * 7.8}%`,
    '--avatar-mouth-width': `${5.5 + level * 4}%`,
    '--avatar-glow-opacity': `${0.72 + level * 0.28}`,
    '--avatar-glow-scale': `${0.96 + level * 0.12}`,
    '--avatar-status-glow': `${7 + level * 7}px`,
  } as CSSProperties;

  return (
    <div
      className="avatar-character"
      data-mode={mode}
      data-audio-source={audioSource}
      data-testid="avatar-character"
      role="img"
      aria-label={label}
      style={style}
    >
      <div className="avatar-character__halo" aria-hidden="true" />
      <div className="avatar-character__portrait" aria-hidden="true">
        <img
          className="avatar-character__art"
          src={characterSheet}
          alt=""
          data-testid="img-avatar-character"
          draggable={false}
        />
        <span className="avatar-character__mouth" />
        <span className="avatar-character__face-light" />
      </div>
      <span className="avatar-character__orbit avatar-character__orbit--one" aria-hidden="true" />
      <span className="avatar-character__orbit avatar-character__orbit--two" aria-hidden="true" />
      <span className="avatar-character__status" data-testid="status-avatar-mode" aria-hidden="true">
        <span className="avatar-character__status-dot" />
        <span>{modeLabels[mode]}</span>
      </span>
      <span className="avatar-character__think-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}
