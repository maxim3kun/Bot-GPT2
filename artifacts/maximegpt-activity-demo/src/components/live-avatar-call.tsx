import { lazy, Suspense, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  AudioLines,
  CircleHelp,
  LoaderCircle,
  Mic,
  MicOff,
  MoreHorizontal,
  Pause,
  RotateCcw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { LiveAvatarModel } from './live-avatar-model';
import './live-avatar-call.css';

const LiveVrmAvatar = lazy(() =>
  import('./live-vrm-avatar').then((module) => ({ default: module.LiveVrmAvatar })),
);

export type LiveVoiceStatus = 'ready' | 'listening' | 'thinking' | 'speaking' | 'error';

export interface LiveAvatarCallProps {
  status: LiveVoiceStatus;
  statusNote: string;
  transcript: string;
  answer: string;
  error: string;
  recording: boolean;
  listeningMode: boolean;
  starting: boolean;
  audioLevel: number;
  settingsOpen: boolean;
  inputs: MediaDeviceInfo[];
  selectedDevice: string;
  permission: string;
  onToggleListening: () => void;
  onReset: () => void;
  onStopSpeech: () => void;
  onToggleSettings: () => void;
  onCloseSettings: () => void;
  onSelectDevice: (deviceId: string) => void;
  onDismissError: () => void;
}

const modeLabel: Record<LiveVoiceStatus, string> = {
  ready: 'Disponible',
  listening: 'À ton écoute',
  thinking: 'Il prépare sa réponse',
  speaking: 'Il te répond',
  error: 'Micro indisponible',
};

export function LiveAvatarCall({
  status,
  statusNote,
  transcript,
  answer,
  error,
  recording,
  listeningMode,
  starting,
  audioLevel,
  settingsOpen,
  inputs,
  selectedDevice,
  permission,
  onToggleListening,
  onReset,
  onStopSpeech,
  onToggleSettings,
  onCloseSettings,
  onSelectDevice,
  onDismissError,
}: LiveAvatarCallProps) {
  const mode: Exclude<LiveVoiceStatus, 'error'> = status === 'error' ? 'ready' : status;
  const [blinking, setBlinking] = useState(false);
  const [avatarStyle, setAvatarStyle] = useState<'vrm' | 'illustration'>('vrm');
  const currentLabel = starting ? 'Connexion au micro…' : modeLabel[status];
  const safeLevel = Number.isFinite(audioLevel) ? Math.max(0, Math.min(1, audioLevel)) : 0;
  const mouthStyle = {
    '--avatar-bob': `${safeLevel * -2.5}px`,
  } as CSSProperties;

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let motionAllowed = !reducedMotion.matches;
    let blinkTimer: number | undefined;
    let blinkEndTimer: number | undefined;

    const stopTimers = () => {
      if (blinkTimer !== undefined) window.clearTimeout(blinkTimer);
      if (blinkEndTimer !== undefined) window.clearTimeout(blinkEndTimer);
      blinkTimer = undefined;
      blinkEndTimer = undefined;
      setBlinking(false);
    };

    const scheduleBlink = () => {
      if (!motionAllowed) return;
      blinkTimer = window.setTimeout(() => {
        if (document.visibilityState === 'visible') {
          setBlinking(true);
          blinkEndTimer = window.setTimeout(() => setBlinking(false), 125);
        }
        scheduleBlink();
      }, 2600 + Math.random() * 2800);
    };

    const handleMotionPreference = () => {
      stopTimers();
      motionAllowed = !reducedMotion.matches;
      if (motionAllowed) scheduleBlink();
    };

    reducedMotion.addEventListener('change', handleMotionPreference);
    scheduleBlink();

    return () => {
      reducedMotion.removeEventListener('change', handleMotionPreference);
      stopTimers();
    };
  }, []);

  useEffect(() => {
    if (!settingsOpen) return;
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseSettings();
    };
    window.addEventListener('keydown', dismissOnEscape);
    return () => window.removeEventListener('keydown', dismissOnEscape);
  }, [settingsOpen, onCloseSettings]);

  return (
    <main className="live-call-page" data-status={status} data-testid="live-voice-page">
      <div className="live-call-shell">
        <header className="live-call-header">
          <a className="live-call-brand" href="/" aria-label="MaximeGPT, accueil" data-testid="link-live-home">
            <span className="live-call-brand-mark" aria-hidden="true"><AudioLines size={19} /></span>
            <span><strong>MaximeGPT</strong><small>Appel avec Maxime</small></span>
          </a>
          <div className="live-call-header-actions">
            <span className="live-call-session-badge"><i /> Sans connexion</span>
            <button
              type="button"
              className="live-call-icon-button"
              aria-label="Réglages du microphone"
              aria-expanded={settingsOpen}
              aria-controls="live-microphone-settings"
              onClick={onToggleSettings}
              data-testid="button-microphone-settings"
            ><MoreHorizontal size={21} /></button>
            <button type="button" className="live-call-icon-button" aria-label="Effacer la conversation" onClick={onReset} data-testid="button-reset-conversation">
              <RotateCcw size={17} />
            </button>
          </div>
        </header>

        {settingsOpen && (
          <section className="live-call-settings" id="live-microphone-settings" aria-label="Réglages du microphone" data-testid="panel-microphone-settings">
            <div className="live-call-settings-heading">
              <div><span>ENTRÉE AUDIO</span><h2>Réglages du micro</h2></div>
              <button type="button" className="live-call-close" aria-label="Fermer les réglages" onClick={onCloseSettings} data-testid="button-close-settings"><X size={17} /></button>
            </div>
            <label htmlFor="live-input-device">Microphone</label>
            <select id="live-input-device" value={selectedDevice} onChange={(event) => onSelectDevice(event.target.value)} data-testid="select-microphone">
              {inputs.length === 0 && <option value="">Microphone par défaut</option>}
              {inputs.map((device, index) => (
                <option key={device.deviceId || index} value={device.deviceId}>
                  {device.label || `Microphone ${index + 1}`}
                </option>
              ))}
            </select>
            <p className="live-call-permission"><i className={`permission-dot${permission === 'Autorisé' ? ' permission-dot--ok' : permission === 'Bloqué' ? ' permission-dot--blocked' : ''}`} /> Autorisation : <strong>{permission}</strong></p>
            <p className="live-call-settings-note">Le micro s’active après ton clic et reste ouvert jusqu’à ce que tu arrêtes l’écoute.</p>
          </section>
        )}

        <section className="live-call-stage" aria-label="Appel vocal avec le personnage Maxime" data-status={status} data-testid="live-avatar-stage">
          <div className="live-call-stage-top">
            <span className="live-call-live-indicator"><i /> SESSION VOCALE</span>
            <span className={`live-call-mode-pill live-call-mode-pill--${status}`} role="status" aria-live="polite" data-testid="status-live-state">
              {mode === 'thinking' && <LoaderCircle size={13} className="animate-spin" />}
              {currentLabel}
            </span>
          </div>
          <div className={`live-avatar-scene live-avatar-scene--${mode}`} data-mode={mode} data-style={avatarStyle} style={mouthStyle}>
            <div className="live-avatar-aura" aria-hidden="true" />
            <div
              className="live-avatar-video"
              data-blinking={blinking && mode !== 'thinking'}
              data-mode={mode}
              style={mouthStyle}
            >
              {avatarStyle === 'illustration' ? (
                <LiveAvatarModel mode={mode} audioLevel={safeLevel} blinking={blinking && mode !== 'thinking'} />
              ) : (
                <Suspense fallback={<div className="live-vrm-placeholder" role="status"><span className="live-vrm-progress-track"><i /></span><span>Préparation du personnage 3D…</span></div>}>
                  <LiveVrmAvatar
                    mode={mode}
                    audioLevel={safeLevel}
                    blinking={blinking && mode !== 'thinking'}
                    interactionActive={starting || recording || listeningMode}
                  />
                </Suspense>
              )}
            </div>
            <span className="live-avatar-aria" aria-live="polite">
              {mode === 'speaking' && answer ? `Maxime te répond : ${answer}` : currentLabel}
            </span>
          </div>
          <div className="live-call-identity">
            <span className="live-call-identity-avatar" aria-hidden="true">M</span>
            <span><strong>Maxime</strong><small>{currentLabel}</small></span>
            <span className="live-call-wave" aria-hidden="true"><i /><i /><i /><i /><i /></span>
          </div>
          {status === 'speaking' && (
            <button type="button" className="live-call-stop" onClick={onStopSpeech} data-testid="button-stop-speech">
              <Pause size={15} /> Arrêter sa voix
            </button>
          )}
        </section>

        <section className="live-call-console" aria-label="Commandes de l’appel vocal">
          <div className="live-call-console-copy">
            <span className="live-call-eyebrow">{starting ? 'DEMANDE DU MICRO' : recording ? 'PHRASE CAPTÉE' : listeningMode ? 'ÉCOUTE ACTIVÉE' : mode === 'thinking' ? 'UN INSTANT' : mode === 'speaking' ? 'RÉPONSE VOCALE' : 'À TOI'}</span>
            <h1>{starting ? 'Autorise le micro.' : recording ? 'Je t’écoute.' : mode === 'thinking' ? 'Maxime réfléchit.' : mode === 'speaking' ? 'Maxime te répond.' : listeningMode ? 'Parle naturellement.' : 'Parle-lui.'}</h1>
            <p>{starting ? statusNote : recording ? 'Je réponds dès que tu as fini ta phrase.' : listeningMode && mode === 'listening' ? 'Tu peux enchaîner; je réponds après une petite pause.' : listeningMode ? 'Le micro est actif. Clique sur Arrêter pour couper.' : mode === 'thinking' ? statusNote : mode === 'speaking' ? 'Tu peux interrompre sa voix à tout moment.' : status === 'error' ? 'Vérifie le micro ou réessaie.' : 'Clique une fois pour commencer à parler.'}</p>
          </div>
          <div className="live-call-console-controls">
            <button
              type="button"
              className={`live-call-talk${listeningMode ? ' live-call-talk--active' : ''}`}
              aria-label={starting ? 'Annuler l’activation du microphone' : listeningMode ? 'Arrêter la conversation et couper le micro' : 'Activer la conversation vocale'}
              aria-pressed={listeningMode}
              onClick={onToggleListening}
              data-testid="button-toggle-listening"
            >
              <span className="live-call-talk-icon">{listeningMode ? <MicOff size={21} /> : <Mic size={21} />}</span>
              <span>{starting ? 'Annuler' : listeningMode ? 'Arrêter la conversation' : status === 'error' ? 'Réessayer' : 'Commencer à parler'}</span>
              <kbd>CLIC</kbd>
            </button>
          </div>
          {error && (
            <div className="live-call-error" role="alert" data-testid="text-live-error">
              <CircleHelp size={17} /><span>{error}</span>
              <button type="button" onClick={onDismissError} aria-label="Fermer le message d’erreur" data-testid="button-dismiss-error"><X size={16} /></button>
            </div>
          )}
          {(transcript || answer) && (
            <div className="live-call-messages" aria-live="polite" data-testid="live-turn-content">
              {transcript && <p><span>TOI</span>{transcript}</p>}
              {answer && <p><span>MAXIME</span>{answer}</p>}
            </div>
          )}
        </section>

        <details className="live-call-privacy" data-testid="text-live-privacy">
          <summary><ShieldCheck size={16} /> Micro activé par toi · phrases envoyées temporairement · aucun historique durable</summary>
          <p>Le micro reste ouvert uniquement après ton clic et jusqu’à ce que tu arrêtes la conversation. La détection des pauses se fait sur ton appareil; seules les phrases parlées sont envoyées temporairement à Groq pour transcription et réponse. La voix utilise le service disponible (Piper ou Google TTS). La conversation n’est pas enregistrée dans MongoDB ou le navigateur. Les règles de conservation des fournisseurs s’appliquent.</p>
        </details>
        <footer className="live-call-footer"><CircleHelp size={14} /> La page n’utilise pas ta caméra et reste séparée de Discord.</footer>
      </div>
      <button
        type="button"
        className="live-avatar-style-toggle"
        aria-label={avatarStyle === 'vrm' ? 'Afficher le style illustration bleu' : 'Revenir au personnage 3D'}
        aria-pressed={avatarStyle === 'illustration'}
        onClick={() => setAvatarStyle((style) => style === 'vrm' ? 'illustration' : 'vrm')}
        data-testid="button-avatar-style"
      >
        <span className="live-avatar-style-dot" aria-hidden="true" />
        {avatarStyle === 'vrm' ? 'Style illustration' : 'Personnage 3D'}
      </button>
    </main>
  );
}
