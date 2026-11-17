import { useEffect } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
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
import portrait from '../../../../attached_assets/generated_images/maxime-stage-portrait-center.jpg';
import './live-avatar-call.css';

export type LiveVoiceStatus = 'ready' | 'listening' | 'thinking' | 'speaking' | 'error';

export interface LiveAvatarCallProps {
  status: LiveVoiceStatus;
  statusNote: string;
  transcript: string;
  answer: string;
  error: string;
  recording: boolean;
  canTalk: boolean;
  audioLevel: number;
  settingsOpen: boolean;
  inputs: MediaDeviceInfo[];
  selectedDevice: string;
  permission: string;
  onTalkStart: () => void;
  onTalkEnd: () => void;
  onTalkCancel: () => void;
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

const keyboardKeys = Array.from({ length: 36 }, (_, index) => index);

export function LiveAvatarCall({
  status,
  statusNote,
  transcript,
  answer,
  error,
  recording,
  canTalk,
  audioLevel,
  settingsOpen,
  inputs,
  selectedDevice,
  permission,
  onTalkStart,
  onTalkEnd,
  onTalkCancel,
  onReset,
  onStopSpeech,
  onToggleSettings,
  onCloseSettings,
  onSelectDevice,
  onDismissError,
}: LiveAvatarCallProps) {
  const mode: Exclude<LiveVoiceStatus, 'error'> = status === 'error' ? 'ready' : status;
  const currentLabel = modeLabel[status];
  const safeLevel = Number.isFinite(audioLevel) ? Math.max(0, Math.min(1, audioLevel)) : 0;
  const mouthStyle = {
    '--avatar-mouth-height': `${2.5 + safeLevel * 13}px`,
    '--avatar-mouth-width': `${25 + safeLevel * 18}px`,
    '--avatar-glow-opacity': `${0.22 + safeLevel * 0.42}`,
    '--avatar-bob': `${safeLevel * -4}px`,
  } as CSSProperties;

  useEffect(() => {
    if (!settingsOpen) return;
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseSettings();
    };
    window.addEventListener('keydown', dismissOnEscape);
    return () => window.removeEventListener('keydown', dismissOnEscape);
  }, [settingsOpen, onCloseSettings]);

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (!canTalk || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    onTalkStart();
  };

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
            <p className="live-call-settings-note">Le micro est demandé uniquement quand tu appuies pour parler.</p>
          </section>
        )}

        <section className="live-call-stage" aria-label="Appel vocal avec le personnage Maxime" data-status={status} data-testid="live-avatar-stage">
          <div className="live-call-stars" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
          <div className="live-call-stage-top">
            <span className="live-call-live-indicator"><i /> SESSION VOCALE</span>
            <span className={`live-call-mode-pill live-call-mode-pill--${status}`} role="status" aria-live="polite" data-testid="status-live-state">
              {mode === 'thinking' && <LoaderCircle size={13} className="animate-spin" />}
              {currentLabel}
            </span>
          </div>
          <div className={`live-avatar-scene live-avatar-scene--${mode}`} data-mode={mode} style={mouthStyle}>
            <div className="live-avatar-aura" aria-hidden="true" />
            <div className="live-avatar-video">
              <img className="live-avatar-art" src={portrait} alt="Maxime, personnage animé en tenue lumineuse cyan" draggable={false} data-testid="img-live-character" />
              <span className="live-avatar-light" aria-hidden="true" />
              <span className="live-avatar-mouth" aria-hidden="true" />
            </div>
            <div className={`live-avatar-desk${mode === 'thinking' ? ' live-avatar-desk--typing' : ''}`} aria-hidden="true">
              <div className="live-avatar-desk-top" />
              <div className="live-avatar-keyboard">
                <div className="live-avatar-keys">
                  {keyboardKeys.map((key) => <i key={key} />)}
                </div>
                <span className="live-avatar-spacebar" />
                <span className="live-avatar-caret" />
              </div>
              <div className="live-avatar-sleeves">
                <span /><span />
              </div>
              <span className="live-avatar-desk-glow" />
            </div>
            <div className="live-avatar-caption" aria-live="polite" data-testid="text-live-avatar-caption">
              {mode === 'speaking' && answer ? answer : mode === 'listening' ? 'Je t’écoute…' : mode === 'thinking' ? 'Je prépare ma réponse…' : 'Prends ton temps, je suis là.'}
            </div>
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
            <span className="live-call-eyebrow">{recording ? 'MICRO OUVERT' : mode === 'thinking' ? 'UN INSTANT' : mode === 'speaking' ? 'RÉPONSE VOCALE' : 'À TOI'}</span>
            <h1>{recording ? 'Je t’écoute.' : mode === 'thinking' ? 'Maxime réfléchit.' : mode === 'speaking' ? 'Maxime te répond.' : 'Parle-lui.'}</h1>
            <p>{recording ? 'Relâche pour envoyer, ou Échap pour annuler.' : mode === 'thinking' ? statusNote : mode === 'speaking' ? 'Tu peux l’interrompre quand tu veux.' : status === 'error' ? 'Vérifie le micro ou réessaie.' : 'Maintiens le bouton pour parler.'}</p>
          </div>
          <div className="live-call-console-controls">
            <button
              type="button"
              className={`live-call-talk${recording ? ' live-call-talk--active' : ''}`}
              disabled={!canTalk}
              aria-label={recording ? 'Relâcher pour envoyer, ou Échap pour annuler' : 'Maintenir pour parler'}
              onPointerDown={handlePointerDown}
              onPointerUp={() => onTalkEnd()}
              onPointerCancel={() => onTalkCancel()}
              onKeyDown={(event) => {
                if (event.key === 'Escape' && recording) {
                  event.preventDefault();
                  onTalkCancel();
                } else if ((event.key === ' ' || event.key === 'Enter') && !event.repeat && !recording && canTalk) {
                  event.preventDefault();
                  onTalkStart();
                }
              }}
              onKeyUp={(event) => {
                if ((event.key === ' ' || event.key === 'Enter') && recording) {
                  event.preventDefault();
                  onTalkEnd();
                }
              }}
              data-testid="button-hold-to-talk"
            >
              <span className="live-call-talk-icon">{recording ? <MicOff size={21} /> : <Mic size={21} />}</span>
              <span>{recording ? 'Relâche pour envoyer' : mode === 'thinking' ? 'Un instant…' : 'Maintenir pour parler'}</span>
              {!recording && <kbd>ESPACE</kbd>}
            </button>
            {recording && (
              <button type="button" className="live-call-cancel" onClick={onTalkCancel} data-testid="button-cancel-recording">
                <X size={16} /> Annuler
              </button>
            )}
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
          <summary><ShieldCheck size={16} /> Audio envoyé temporairement à Groq · contexte en mémoire vive 15 min · aucun historique durable</summary>
          <p>L’audio passe par le serveur puis Groq pour la transcription et la réponse. La voix utilise le service disponible (Piper ou Google TTS). La conversation n’est pas enregistrée dans MongoDB, le navigateur ou les journaux. Les règles de conservation des fournisseurs s’appliquent.</p>
        </details>
        <footer className="live-call-footer"><CircleHelp size={14} /> La page n’utilise pas ta caméra et reste séparée de Discord.</footer>
      </div>
    </main>
  );
}
