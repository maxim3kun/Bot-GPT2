import { useState } from 'react';
import { LiveAvatarCall, type LiveVoiceStatus } from './_LiveAvatarCall';
import './_group.css';

const states: Array<{ value: LiveVoiceStatus; label: string }> = [
  { value: 'ready', label: 'Repos' },
  { value: 'listening', label: 'Écoute' },
  { value: 'thinking', label: 'Réflexion' },
  { value: 'speaking', label: 'Parole' },
];

const noop = () => undefined;

export function Current() {
  const [status, setStatus] = useState<LiveVoiceStatus>(() => {
    const initial = new URLSearchParams(window.location.search).get('state');
    return states.find((state) => state.value === initial)?.value ?? 'speaking';
  });
  const isSpeaking = status === 'speaking';

  return (
    <>
      <div className="avatar-preview-toolbar" role="group" aria-label="Aperçu des expressions">
        <span>Aperçu des expressions</span>
        {states.map((state) => (
          <button
            key={state.value}
            type="button"
            aria-pressed={status === state.value}
            onClick={() => setStatus(state.value)}
          >
            {state.label}
          </button>
        ))}
      </div>
      <LiveAvatarCall
        status={status}
        statusNote="Aperçu visuel, sans microphone"
        transcript=""
        answer={isSpeaking ? 'Salut ! Je suis là.' : ''}
        error=""
        recording={false}
        listeningMode={status === 'listening'}
        starting={false}
        audioLevel={isSpeaking ? 0.16 : 0}
        settingsOpen={false}
        inputs={[]}
        selectedDevice=""
        permission="Non demandée"
        onToggleListening={() => setStatus((value) => value === 'listening' ? 'ready' : 'listening')}
        onReset={() => setStatus('ready')}
        onStopSpeech={() => setStatus('ready')}
        onToggleSettings={noop}
        onCloseSettings={noop}
        onSelectDevice={noop}
        onDismissError={noop}
      />
    </>
  );
}
