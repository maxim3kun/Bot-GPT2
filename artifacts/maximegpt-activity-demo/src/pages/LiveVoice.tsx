import { useCallback, useEffect, useRef, useState } from 'react';
import { LiveAvatarCall } from '@/components/live-avatar-call';

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
  const [audioLevel, setAudioLevel] = useState(0);
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
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioFrameRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const stopAudioMeter = useCallback((resetVisual = true) => {
    if (audioFrameRef.current !== null) window.cancelAnimationFrame(audioFrameRef.current);
    audioFrameRef.current = null;
    analyserRef.current = null;
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context && context.state !== 'closed') void context.close().catch(() => undefined);
    if (resetVisual && mountedRef.current) setAudioLevel(0);
  }, []);

  const releaseAudio = useCallback(() => {
    stopAudioMeter();
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
  }, [stopAudioMeter]);

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
    try {
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      const source = context.createMediaElementSource(audio);
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      source.connect(analyser);
      analyser.connect(context.destination);
      audioContextRef.current = context;
      analyserRef.current = analyser;
      const samples = new Uint8Array(analyser.fftSize);
      const readAudioLevel = () => {
        if (audioRef.current !== audio || analyserRef.current !== analyser) return;
        analyser.getByteTimeDomainData(samples);
        let energy = 0;
        for (const sample of samples) {
          const amplitude = (sample - 128) / 128;
          energy += amplitude * amplitude;
        }
        const rms = Math.sqrt(energy / samples.length);
        if (mountedRef.current) setAudioLevel(Math.min(1, Math.max(0, (rms - 0.012) * 6)));
        audioFrameRef.current = window.requestAnimationFrame(readAudioLevel);
      };
      audioFrameRef.current = window.requestAnimationFrame(readAudioLevel);
      void context.resume().catch(() => undefined);
    } catch {
      stopAudioMeter();
    }
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
    setStatusNote('Je prépare ma réponse');
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

  const canTalk = status !== 'thinking';

  const stopSpeech = () => {
    releaseAudio();
    setStatus('ready');
    setStatusNote('Réponse arrêtée');
  };

  return (
    <LiveAvatarCall
      status={status}
      statusNote={statusNote}
      transcript={transcript}
      answer={answer}
      error={error}
      recording={recording}
      canTalk={canTalk}
      audioLevel={audioLevel}
      settingsOpen={settingsOpen}
      inputs={inputs}
      selectedDevice={selectedDevice}
      permission={permission}
      onTalkStart={() => { void beginRecording(); }}
      onTalkEnd={() => finishRecording()}
      onTalkCancel={() => finishRecording(true)}
      onReset={resetConversation}
      onStopSpeech={stopSpeech}
      onToggleSettings={() => setSettingsOpen((open) => !open)}
      onCloseSettings={() => setSettingsOpen(false)}
      onSelectDevice={setSelectedDevice}
      onDismissError={() => setError('')}
    />
  );
}
