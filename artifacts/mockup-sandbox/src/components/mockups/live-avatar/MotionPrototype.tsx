import { useEffect, useState } from 'react';
import { LiveAvatarCall, type LiveVoiceStatus } from './_LiveAvatarCall';
import './_group.css';
import './motion-prototype.css';

const sequence: Array<{ status: LiveVoiceStatus; duration: number }> = [
  { status: 'ready', duration: 1900 },
  { status: 'listening', duration: 2300 },
  { status: 'thinking', duration: 1900 },
  { status: 'speaking', duration: 3400 },
];

const noop = () => undefined;

export function MotionPrototype() {
  const [status, setStatus] = useState<LiveVoiceStatus>(() => {
    const requested = new URLSearchParams(window.location.search).get('state');
    return sequence.some((step) => step.status === requested)
      ? requested as LiveVoiceStatus
      : 'ready';
  });
  const [automatic, setAutomatic] = useState(() => new URLSearchParams(window.location.search).get('auto') !== '0');
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    if (!automatic) return;
    const index = sequence.findIndex((step) => step.status === status);
    const next = sequence[(index + 1) % sequence.length];
    const timer = window.setTimeout(() => setStatus(next.status), sequence[index]?.duration ?? 1900);
    return () => window.clearTimeout(timer);
  }, [automatic, status]);

  useEffect(() => {
    if (status !== 'speaking') {
      setAudioLevel(0);
      return;
    }
    let tick = 0;
    const timer = window.setInterval(() => {
      tick += 1;
      setAudioLevel(0.035 + Math.abs(Math.sin(tick * 0.72)) * 0.22);
    }, 90);
    return () => window.clearInterval(timer);
  }, [status]);

  const chooseState = (next: LiveVoiceStatus) => {
    setAutomatic(false);
    setStatus(next);
  };

  return (
    <div className="motion-prototype">
      <div className="motion-prototype__bar">
        <div>
          <strong>Prototype animé</strong>
          <span>Animation de démonstration · micro inactif</span>
        </div>
        <button
          type="button"
          aria-pressed={automatic}
          onClick={() => setAutomatic((value) => !value)}
        >
          {automatic ? 'Pause' : 'Lecture'}
        </button>
      </div>
      <div className="avatar-preview-toolbar" role="group" aria-label="États du personnage">
        {sequence.map(({ status: state }) => (
          <button
            key={state}
            type="button"
            aria-pressed={!automatic && status === state}
            onClick={() => chooseState(state)}
          >
            {state === 'ready' ? 'Repos' : state === 'listening' ? 'Écoute' : state === 'thinking' ? 'Réflexion' : 'Parole'}
          </button>
        ))}
      </div>
      <LiveAvatarCall
        status={status}
        statusNote="Prototype visuel : aucune écoute micro"
        transcript=""
        answer={status === 'speaking' ? 'Salut ! Je suis là, on peut discuter.' : ''}
        error=""
        recording={false}
        listeningMode={status === 'listening'}
        starting={false}
        audioLevel={audioLevel}
        settingsOpen={false}
        inputs={[]}
        selectedDevice=""
        permission="Non demandée"
        onToggleListening={() => chooseState(status === 'listening' ? 'ready' : 'listening')}
        onReset={() => {
          setAutomatic(true);
          setStatus('ready');
        }}
        onStopSpeech={() => chooseState('ready')}
        onToggleSettings={noop}
        onCloseSettings={noop}
        onSelectDevice={noop}
        onDismissError={noop}
      />
    </div>
  );
}
