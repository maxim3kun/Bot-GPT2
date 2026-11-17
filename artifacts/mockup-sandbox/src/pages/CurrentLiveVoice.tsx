import { useCallback, useEffect, useRef, useState, type AnchorHTMLAttributes } from 'react';
import {
  AlertCircle,
  AudioLines,
  ChevronDown,
  CircleHelp,
  Headphones,
  LoaderCircle,
  Mic,
  MicOff,
  MoreHorizontal,
  RotateCcw,
  ShieldCheck,
  Square,
  Volume2,
  X,
} from 'lucide-react';
import { AvatarCharacter, type AvatarMode } from '@/components/avatar-character';
import './live-voice.css';

function Link(props: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return <a {...props} />;
}

interface LiveVoiceTurnResponse {
  transcript: string;
  answer: string;
  language: string;
}

type VoiceStatus = 'ready' | 'listening' | 'thinking' | 'speaking' | 'error';
const API_BASE = (import.meta.env.VITE_ACTIVITY_API_URL ?? '').trim().replace(/\/+$/, '');
const MAX_RECORDING_MS = 12_000;
const apiUrl = (path: string) => `${API_BASE}${path}`;

async function readError(response: Response): Promise<Error> {
  const body = await response.json().catch(() => ({})) as { error?: string };
  return new Error(body.error || `http_${response.status}`);
}

async function sendTurn(blob: Blob, mimeType: string, sessionId: string, signal: AbortSignal): Promise<LiveVoiceTurnResponse> {
  const response = await fetch(apiUrl('/api/live/turn'), {
    method: 'POST',
    cache: 'no-store',
    credentials: 'omit',
    headers: { 'Content-Type': mimeType, 'X-Live-Session-ID': sessionId },
    body: blob,
    signal,
  });
  if (!response.ok) throw await readError(response);
  return await response.json() as LiveVoiceTurnResponse;
}

async function fetchSpeech(sessionId: string, text: string, language: string, signal: AbortSignal): Promise<Blob> {
  const response = await fetch(apiUrl('/api/live/speech'), {
    method: 'POST',
    cache: 'no-store',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, text, language }),
    signal,
  });
  if (!response.ok) throw await readError(response);
  return await response.blob();
}

function permissionMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Le micro est bloqué. Autorise son accès dans les réglages du navigateur, puis réessaie.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'Aucun microphone disponible. Branche ou sélectionne un autre appareil.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'Le microphone est déjà utilisé ou ne répond pas. Ferme l’autre application et réessaie.';
  }
  if (error instanceof Error && /failed to fetch|networkerror|load failed/i.test(error.message)) {
    return 'Impossible de joindre le service vocal. Vérifie ta connexion puis réessaie.';
  }
  return 'Le tour vocal n’a pas abouti. Réessaie dans un instant.';
}

export default function LiveVoice() {
  const [status, setStatus] = useState<VoiceStatus>('ready');
  const [statusNote, setStatusNote] = useState('Maintiens le bouton pour parler');
  const [transcript, setTranscript] = useState('');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [inputs, setInputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [permission, setPermission] = useState('Non demandée');
  const [recording, setRecording] = useState(false);
  const sessionRef = useRef<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cancelRecordingRef = useRef(false);
  const recordingTimerRef = useRef<number | null>(null);
  const captureGenerationRef = useRef(0);
  const capturePendingRef = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  const releaseAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    audioRef.current = null;
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
  }, []);

  const closeSession = useCallback((keepalive = false) => {
    const id = sessionRef.current;
    sessionRef.current = null;
    if (!id) return;
    const body = JSON.stringify({ sessionId: id });
    if (keepalive) {
      void fetch(apiUrl('/api/live/close'), {
        method: 'POST',
        cache: 'no-store',
        credentials: 'omit',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body,
      }).catch(() => undefined);
    } else {
      void fetch(apiUrl('/api/live/close'), {
        method: 'POST',
        cache: 'no-store',
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json' },
        body,
      }).catch(() => undefined);
    }
  }, []);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const clearRecordingTimer = useCallback(() => {
    if (recordingTimerRef.current !== null) window.clearTimeout(recordingTimerRef.current);
    recordingTimerRef.current = null;
  }, []);

  const refreshInputs = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const devices = await navigator.mediaDevices.enumerateDevices();
    const microphones = devices.filter((device) => device.kind === 'audioinput');
    setInputs(microphones);
    if (microphones[0]?.deviceId) setSelectedDevice((current) => current || microphones[0]!.deviceId);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if ('permissions' in navigator) {
      void navigator.permissions.query({ name: 'microphone' as PermissionName }).then((result) => {
        if (!mountedRef.current) return;
        setPermission(result.state === 'granted' ? 'Autorisé' : result.state === 'denied' ? 'Bloqué' : 'Non demandée');
        result.onchange = () => {
          if (mountedRef.current) setPermission(result.state === 'granted' ? 'Autorisé' : result.state === 'denied' ? 'Bloqué' : 'Non demandée');
        };
      }).catch(() => undefined);
    }
    void refreshInputs();
    const pageHide = () => closeSession(true);
    window.addEventListener('pagehide', pageHide);
    return () => {
      mountedRef.current = false;
      captureGenerationRef.current += 1;
      capturePendingRef.current = false;
      clearRecordingTimer();
      window.removeEventListener('pagehide', pageHide);
      controllerRef.current?.abort();
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        try { recorder.stop(); } catch { /* Stream teardown below is sufficient. */ }
      }
      stopTracks();
      releaseAudio();
      closeSession(true);
    };
  }, [clearRecordingTimer, closeSession, refreshInputs, releaseAudio, stopTracks]);

  const playSpeech = async (sessionId: string, text: string, language: string, signal: AbortSignal) => {
    const audioBlob = await fetchSpeech(sessionId, text, language, signal);
    if (signal.aborted || !mountedRef.current) return;
    releaseAudio();
    const url = URL.createObjectURL(audioBlob);
    audioUrlRef.current = url;
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => {
      if (audioRef.current !== audio) return;
      releaseAudio();
      setStatus('ready');
      setStatusNote('À toi de reprendre');
    };
    audio.onerror = () => {
      if (audioRef.current !== audio) return;
      releaseAudio();
      setStatus('ready');
      setStatusNote('La réponse est prête à lire');
    };
    setStatus('speaking');
    setStatusNote('Maxime te répond');
    try {
      await audio.play();
    } catch {
      setStatus('ready');
      setStatusNote('La réponse est prête à lire');
    }
  };

  const submitRecording = async (blob: Blob, mimeType: string) => {
    if (!blob.size) {
      setStatus('ready');
      setStatusNote('Je n’ai rien entendu. Réessaie.');
      return;
    }
    const sessionId = sessionRef.current ?? crypto.randomUUID();
    sessionRef.current = sessionId;
    const controller = new AbortController();
    controllerRef.current = controller;
    setStatus('thinking');
    setStatusNote('J’écoute ton message');
    setError('');
    try {
      const result = await sendTurn(blob, mimeType, sessionId, controller.signal);
      if (controller.signal.aborted || !mountedRef.current) return;
      setTranscript(result.transcript);
      setAnswer(result.answer);
      if (!result.answer) {
        setStatus('ready');
        setStatusNote('À toi de reprendre');
        return;
      }
       await playSpeech(sessionId, result.answer, result.language || 'fr', controller.signal);
    } catch (cause) {
      if (controller.signal.aborted || !mountedRef.current) return;
      setError(permissionMessage(cause));
      setStatus('error');
      setStatusNote('On réessaie ?');
    }
  };

  const beginRecording = async () => {
    if (recording || capturePendingRef.current || status === 'thinking') return;
    releaseAudio();
    setError('');
    setTranscript('');
    setAnswer('');
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError('La capture audio n’est pas disponible dans ce navigateur. Essaie une version récente en HTTPS.');
      setStatus('error');
      return;
    }
    const generation = ++captureGenerationRef.current;
    capturePendingRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: selectedDevice ? { deviceId: { exact: selectedDevice } } : true,
      });
      if (!mountedRef.current || generation !== captureGenerationRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      setPermission('Autorisé');
      await refreshInputs();
      if (!mountedRef.current || generation !== captureGenerationRef.current) {
        stopTracks();
        return;
      }
      const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
      const mimeType = candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      cancelRecordingRef.current = false;
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        clearRecordingTimer();
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || 'application/octet-stream' });
        chunksRef.current = [];
        recorderRef.current = null;
        stopTracks();
        setRecording(false);
        if (cancelRecordingRef.current) {
          setStatus('ready');
          setStatusNote('Message annulé');
          return;
        }
        void submitRecording(blob, blob.type);
      };
      recorder.start();
      capturePendingRef.current = false;
      setRecording(true);
      setStatus('listening');
      setStatusNote('Je t’écoute… relâche pour envoyer');
      clearRecordingTimer();
      recordingTimerRef.current = window.setTimeout(() => {
        if (recorderRef.current !== recorder || recorder.state === 'inactive') return;
        setStatusNote('Limite de 12 secondes atteinte, envoi…');
        try { recorder.stop(); } catch {
          stopTracks();
          setRecording(false);
          setStatus('ready');
        }
      }, MAX_RECORDING_MS);
    } catch (cause) {
      if (generation !== captureGenerationRef.current || !mountedRef.current) return;
      capturePendingRef.current = false;
      stopTracks();
      setRecording(false);
      setStatus('error');
      setStatusNote('Microphone indisponible');
      setError(permissionMessage(cause));
      if (cause instanceof DOMException && cause.name === 'NotAllowedError') setPermission('Bloqué');
    }
  };

  const finishRecording = (cancel = false) => {
    clearRecordingTimer();
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      if (capturePendingRef.current) {
        captureGenerationRef.current += 1;
        capturePendingRef.current = false;
        setStatus('ready');
        setStatusNote(cancel ? 'Message annulé' : 'Enregistrement annulé');
      }
      return;
    }
    cancelRecordingRef.current = cancel;
    if (cancel) {
      setStatusNote('Annulation…');
    } else {
      setStatusNote('Envoi du message…');
    }
    try { recorder.stop(); } catch {
      stopTracks();
      setRecording(false);
      setStatus('ready');
    }
  };

  const resetConversation = () => {
    clearRecordingTimer();
    captureGenerationRef.current += 1;
    capturePendingRef.current = false;
    controllerRef.current?.abort();
    controllerRef.current = null;
    cancelRecordingRef.current = true;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      try { recorder.stop(); } catch { /* Already stopped. */ }
    }
    recorderRef.current = null;
    stopTracks();
    releaseAudio();
    closeSession();
    chunksRef.current = [];
    setRecording(false);
    setTranscript('');
    setAnswer('');
    setError('');
    setStatus('ready');
    setStatusNote('Conversation réinitialisée');
  };

  const mode: AvatarMode = status === 'listening' ? 'listening'
    : status === 'thinking' ? 'thinking'
      : status === 'speaking' ? 'speaking'
        : 'idle';
  const canTalk = status !== 'thinking';

  return (
    <main className="live-page grain min-h-[100dvh] overflow-hidden px-4 pb-8 pt-5 text-[#302b3d] sm:px-8 sm:pt-7" data-testid="live-voice-page">
      <div className="live-shell mx-auto max-w-6xl">
        <header className="live-topbar flex items-center justify-between gap-4">
          <Link href="/" className="live-brand" data-testid="link-live-home" aria-label="MaximeGPT, accueil">
            <span className="live-brand-mark" aria-hidden="true"><AudioLines size={20} /></span>
            <span><strong>MaximeGPT</strong><small>Compagnon vocal</small></span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="live-public-badge"><span /> Public · navigateur</span>
            <button
              type="button"
              className="live-icon-button"
              aria-label="Réglages du microphone"
              aria-expanded={settingsOpen}
              onClick={() => setSettingsOpen((open) => !open)}
              data-testid="button-microphone-settings"
            ><MoreHorizontal size={21} /></button>
          </div>
        </header>

        {settingsOpen && (
          <section className="live-settings" aria-label="Réglages du microphone" data-testid="panel-microphone-settings">
            <div className="flex items-start justify-between gap-3">
              <div><p className="live-eyebrow">Entrée audio</p><h2>Réglages du micro</h2></div>
              <button type="button" className="live-close" aria-label="Fermer les réglages" onClick={() => setSettingsOpen(false)} data-testid="button-close-settings"><X size={17} /></button>
            </div>
            <label htmlFor="live-input-device">Microphone</label>
            <select id="live-input-device" value={selectedDevice} onChange={(event) => setSelectedDevice(event.target.value)} data-testid="select-microphone">
              {inputs.length === 0 && <option value="">Microphone par défaut</option>}
              {inputs.map((device, index) => <option key={device.deviceId || index} value={device.deviceId}>{device.label || `Microphone ${index + 1}`}</option>)}
            </select>
            <p className="live-permission"><span className={permission === 'Autorisé' ? 'permission-dot permission-dot--ok' : permission === 'Bloqué' ? 'permission-dot permission-dot--blocked' : 'permission-dot'} /> Autorisation : <strong>{permission}</strong></p>
            <p className="live-settings-note">Le navigateur peut masquer les noms des appareils avant l’autorisation du micro.</p>
          </section>
        )}

        <section className="live-stage" aria-label="Conversation vocale avec MaximeGPT">
          <div className="live-stage-copy">
            <p className="live-eyebrow"><span className="live-eyebrow-line" /> Une conversation, simplement</p>
            <h1>Une voix.<br /><em>Une vraie présence.</em></h1>
            <p className="live-intro">Parle comme tu es. Maxime écoute, réfléchit et te répond à voix haute. Le serveur garde le fil en mémoire vive pendant la courte session, puis l’efface.</p>
            <div className="live-avatar-wrap">
              <div className="live-orbit-label live-orbit-label--one">À l’écoute</div>
              <div className="live-avatar-halo" />
              <AvatarCharacter mode={mode} accessibleLabel="MaximeGPT dans le chat vocal public" />
              <div className="live-orbit-label live-orbit-label--two">En direct</div>
            </div>
            <div className="live-presence" role="status" aria-live="polite" data-testid="status-live-state">
              <span className={`live-state-dot live-state-dot--${status}`} />
              <span>{statusNote}</span>
              {status === 'thinking' && <LoaderCircle size={15} className="animate-spin" />}
            </div>
          </div>

          <div className="live-conversation">
            <div className="live-card-heading">
              <div>
                <p className="live-eyebrow">Salon vocal privé à cette page</p>
                <h2>Dis-moi ce qui te passe par la tête.</h2>
              </div>
              <button type="button" className="live-reset" onClick={resetConversation} data-testid="button-reset-conversation">
                <RotateCcw size={15} /><span>Effacer</span>
              </button>
            </div>

            <div className={`live-turn-card ${transcript || answer ? 'live-turn-card--filled' : ''}`} aria-live="polite" data-testid="live-turn-content">
              {transcript || answer ? (
                <>
                  {transcript && <div className="live-message live-message--you"><span>Toi</span><p data-testid="text-live-transcript">{transcript}</p></div>}
                  {answer && <div className="live-message live-message--maxime"><span>MaximeGPT</span><p data-testid="text-live-answer">{answer}</p></div>}
                </>
              ) : (
                <div className="live-empty">
                  <span className="live-empty-mark"><Headphones size={21} /></span>
                  <p>La prochaine phrase sera la première.</p>
                  <span>Ton échange reste ici, le temps de cette visite.</span>
                </div>
              )}
            </div>

            {error && (
              <div className="live-error" role="alert" data-testid="text-live-error">
                <AlertCircle size={18} /><span>{error}</span>
                <button type="button" onClick={() => setError('')} aria-label="Fermer le message d’erreur" data-testid="button-dismiss-error"><X size={16} /></button>
              </div>
            )}

            <div className="live-controls">
              <button
                type="button"
                className={`live-talk-button ${recording ? 'live-talk-button--active' : ''}`}
                disabled={!canTalk}
                aria-label={recording ? 'Relâcher pour envoyer, ou appuyer sur Échap pour annuler' : 'Maintenir pour parler'}
                onPointerDown={(event) => {
                  if (!canTalk || event.button !== 0) return;
                  event.preventDefault();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  void beginRecording();
                }}
                onPointerUp={() => finishRecording()}
                onPointerCancel={() => finishRecording(true)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape' && recording) { event.preventDefault(); finishRecording(true); return; }
                  if ((event.key === ' ' || event.key === 'Enter') && !event.repeat && !recording) {
                    event.preventDefault();
                    void beginRecording();
                  }
                }}
                onKeyUp={(event) => {
                  if ((event.key === ' ' || event.key === 'Enter') && recording) {
                    event.preventDefault();
                    finishRecording();
                  }
                }}
                data-testid="button-hold-to-talk"
              >
                <span className="live-talk-icon">{recording ? <MicOff size={22} /> : status === 'thinking' ? <LoaderCircle size={22} className="animate-spin" /> : <Mic size={22} />}</span>
                <span>{recording ? 'Relâcher pour envoyer' : status === 'thinking' ? 'Un instant…' : 'Maintenir pour parler'}</span>
              </button>
              {recording ? (
                <button type="button" className="live-cancel-button" onClick={() => finishRecording(true)} data-testid="button-cancel-recording"><Square size={15} /> Annuler</button>
              ) : audioRef.current ? (
                <button type="button" className="live-cancel-button" onClick={() => { releaseAudio(); setStatus('ready'); setStatusNote('Réponse arrêtée'); }} data-testid="button-stop-speech"><Square size={15} /> Arrêter la voix</button>
              ) : (
                <p className="live-hint"><Volume2 size={15} /> Relâche pour envoyer, Échap pour annuler</p>
              )}
            </div>
            <div className="live-privacy-note" data-testid="text-live-privacy">
              <ShieldCheck size={17} />
              <p><strong>Ta voix est envoyée temporairement.</strong> L’audio passe par le serveur et Groq pour la transcription et la réponse. Le français utilise Piper sur le serveur ; les autres langues, Google Traduction TTS. Le contexte reste en mémoire vive jusqu’à l’effacement ou 15 minutes d’inactivité. Aucun historique durable dans MongoDB, le navigateur ou les journaux. Les règles de conservation des fournisseurs s’appliquent. Ce chat est séparé de Discord.</p>
            </div>
          </div>
        </section>

        <footer className="live-footer">
          <span><CircleHelp size={15} /> Un accès microphone est demandé uniquement quand tu parles.</span>
          <Link href="/" data-testid="link-discord-activity">Séparé de l’Activity Discord <ChevronDown size={14} className="-rotate-90" /></Link>
        </footer>
      </div>
    </main>
  );
}
