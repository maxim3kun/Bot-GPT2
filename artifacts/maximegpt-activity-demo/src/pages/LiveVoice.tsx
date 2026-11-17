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
const SPEECH_LEVEL_THRESHOLD = 0.025;
const SPEECH_START_FRAMES = 3;
const SILENCE_DURATION_MS = 900;
const MIN_SPEECH_DURATION_MS = 350;
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
  const [statusNote, setStatusNote] = useState('Clique pour commencer une conversation');
  const [transcript, setTranscript] = useState('');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [inputs, setInputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [permission, setPermission] = useState('Non demandée');
  const [recording, setRecording] = useState(false);
  const [listeningMode, setListeningMode] = useState(false);
  const [starting, setStarting] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const statusRef = useRef<VoiceStatus>('ready');
  const listeningModeRef = useRef(false);
  const sessionRef = useRef<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const captureGenerationRef = useRef(0);
  const capturePendingRef = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioFrameRef = useRef<number | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const inputAudioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const inputFrameRef = useRef<number | null>(null);
  const speechCandidateFramesRef = useRef(0);
  const silenceStartedAtRef = useRef<number | null>(null);
  const phraseStartedAtRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const setLiveStatus = useCallback((next: VoiceStatus) => {
    statusRef.current = next;
    if (mountedRef.current) setStatus(next);
  }, []);

  const stopAudioMeter = useCallback((resetVisual = true, closeContext = false) => {
    if (audioFrameRef.current !== null) window.cancelAnimationFrame(audioFrameRef.current);
    audioFrameRef.current = null;
    const analyser = analyserRef.current;
    analyserRef.current = null;
    try { audioSourceRef.current?.disconnect(); } catch { /* The playback graph may already be closed. */ }
    audioSourceRef.current = null;
    try { analyser?.disconnect(); } catch { /* The playback graph may already be closed. */ }
    if (closeContext) {
      const context = audioContextRef.current;
      audioContextRef.current = null;
      if (context && context.state !== 'closed') void context.close().catch(() => undefined);
    }
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

  const closeAudioContext = useCallback(() => {
    stopAudioMeter(true, true);
  }, [stopAudioMeter]);

  const stopVoiceActivityMonitor = useCallback(() => {
    if (inputFrameRef.current !== null) window.cancelAnimationFrame(inputFrameRef.current);
    inputFrameRef.current = null;
    speechCandidateFramesRef.current = 0;
    silenceStartedAtRef.current = null;
  }, []);

  const closeInputAudioContext = useCallback(() => {
    stopVoiceActivityMonitor();
    try { inputAudioSourceRef.current?.disconnect(); } catch { /* The microphone graph may already be closed. */ }
    try { inputAnalyserRef.current?.disconnect(); } catch { /* The microphone graph may already be closed. */ }
    inputAudioSourceRef.current = null;
    inputAnalyserRef.current = null;
    const context = inputAudioContextRef.current;
    inputAudioContextRef.current = null;
    if (context && context.state !== 'closed') void context.close().catch(() => undefined);
  }, [stopVoiceActivityMonitor]);

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

  const stopConversation = useCallback((note = 'Micro désactivé', keepalive = false) => {
    listeningModeRef.current = false;
    captureGenerationRef.current += 1;
    capturePendingRef.current = false;
    if (mountedRef.current) setListeningMode(false);
    if (mountedRef.current) setStarting(false);
    clearRecordingTimer();
    stopVoiceActivityMonitor();
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder && recorder.state !== 'inactive') {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      try { recorder.stop(); } catch { /* The recorder may already be stopped. */ }
    }
    chunksRef.current = [];
    phraseStartedAtRef.current = null;
    if (mountedRef.current) setRecording(false);
    controllerRef.current?.abort();
    controllerRef.current = null;
    stopTracks();
    closeInputAudioContext();
    releaseAudio();
    closeAudioContext();
    closeSession(keepalive);
    setLiveStatus('ready');
    if (mountedRef.current) setStatusNote(note);
  }, [
    clearRecordingTimer,
    closeAudioContext,
    closeInputAudioContext,
    closeSession,
    releaseAudio,
    setLiveStatus,
    stopTracks,
    stopVoiceActivityMonitor,
  ]);

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
    const pageHide = () => stopConversation('Micro désactivé', true);
    window.addEventListener('pagehide', pageHide);
    return () => {
      mountedRef.current = false;
      window.removeEventListener('pagehide', pageHide);
      stopConversation('Micro désactivé', true);
    };
  }, [refreshInputs, stopConversation]);

  function resumeListening() {
    if (!listeningModeRef.current || !streamRef.current) {
      setLiveStatus('ready');
      return;
    }
    setLiveStatus('listening');
    setStatusNote('Parle naturellement; je réponds après une pause.');
    startVoiceActivityMonitor();
  }

  function startRecordingSegment() {
    const stream = streamRef.current;
    if (!stream || !listeningModeRef.current || recorderRef.current || statusRef.current !== 'listening') return;
    try {
      const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
      const mimeType = candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      phraseStartedAtRef.current = performance.now();
      silenceStartedAtRef.current = null;
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        clearRecordingTimer();
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || mimeType || 'application/octet-stream',
        });
        chunksRef.current = [];
        recorderRef.current = null;
        phraseStartedAtRef.current = null;
        if (mountedRef.current) setRecording(false);
        if (!listeningModeRef.current) return;
        if (blob.size) {
          void submitRecording(blob, blob.type);
        } else {
          resumeListening();
        }
      };
      recorder.start();
      setRecording(true);
      setStatusNote('Je t’écoute. Tu peux parler.');
      clearRecordingTimer();
      recordingTimerRef.current = window.setTimeout(() => {
        if (recorderRef.current !== recorder || recorder.state === 'inactive') return;
        setStatusNote('J’analyse ta phrase…');
        finishRecording();
      }, MAX_RECORDING_MS);
    } catch {
      setError('La capture audio n’a pas pu démarrer. Arrête puis réactive le micro.');
      stopConversation('Micro désactivé après une erreur.');
      setLiveStatus('error');
    }
  }

  function finishRecording() {
    clearRecordingTimer();
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    stopVoiceActivityMonitor();
    setLiveStatus('thinking');
    setStatusNote('Je prépare ma réponse…');
    try {
      recorder.stop();
    } catch {
      recorderRef.current = null;
      if (mountedRef.current) setRecording(false);
      resumeListening();
    }
  }

  function startVoiceActivityMonitor() {
    const analyser = inputAnalyserRef.current;
    if (!analyser || inputFrameRef.current !== null || !listeningModeRef.current) return;
    const samples = new Float32Array(analyser.fftSize);

    const detectSpeech = () => {
      inputFrameRef.current = null;
      if (!listeningModeRef.current || statusRef.current !== 'listening') {
        speechCandidateFramesRef.current = 0;
        silenceStartedAtRef.current = null;
        return;
      }

      analyser.getFloatTimeDomainData(samples);
      let energy = 0;
      for (const sample of samples) energy += sample * sample;
      const level = Math.sqrt(energy / samples.length);
      const now = performance.now();
      const recorder = recorderRef.current;

      if (recorder?.state === 'recording') {
        if (level >= SPEECH_LEVEL_THRESHOLD) {
          silenceStartedAtRef.current = null;
        } else {
          silenceStartedAtRef.current ??= now;
          const phraseStartedAt = phraseStartedAtRef.current ?? now;
          if (
            now - silenceStartedAtRef.current >= SILENCE_DURATION_MS
            && now - phraseStartedAt >= MIN_SPEECH_DURATION_MS
          ) {
            finishRecording();
            return;
          }
        }
      } else if (level >= SPEECH_LEVEL_THRESHOLD) {
        speechCandidateFramesRef.current += 1;
        if (speechCandidateFramesRef.current >= SPEECH_START_FRAMES) {
          speechCandidateFramesRef.current = 0;
          startRecordingSegment();
        }
      } else {
        speechCandidateFramesRef.current = 0;
      }

      inputFrameRef.current = window.requestAnimationFrame(detectSpeech);
    };

    inputFrameRef.current = window.requestAnimationFrame(detectSpeech);
  }

  async function playSpeech(sessionId: string, text: string, language: string, signal: AbortSignal) {
    const audioBlob = await fetchSpeech(sessionId, text, language, signal);
    if (signal.aborted || !mountedRef.current) return;
    releaseAudio();
    const url = URL.createObjectURL(audioBlob);
    audioUrlRef.current = url;
    const audio = new Audio(url);
    audioRef.current = audio;
    try {
      const existingContext = audioContextRef.current;
      const context = existingContext && existingContext.state !== 'closed' ? existingContext : new AudioContext();
      audioContextRef.current = context;
      const analyser = context.createAnalyser();
      const source = context.createMediaElementSource(audio);
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      source.connect(context.destination);
      source.connect(analyser);
      analyserRef.current = analyser;
      audioSourceRef.current = source;
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
      stopAudioMeter(false);
    }
    audio.onended = () => {
      if (audioRef.current !== audio) return;
      releaseAudio();
      resumeListening();
    };
    audio.onerror = () => {
      if (audioRef.current !== audio) return;
      releaseAudio();
      if (listeningModeRef.current) {
        setError('La réponse vocale a échoué. Je reprends l’écoute.');
        resumeListening();
      } else {
        setLiveStatus('ready');
        setStatusNote('La réponse est prête à lire');
      }
    };
    setLiveStatus('speaking');
    setStatusNote('Maxime te répond');
    try {
      await audio.play();
    } catch {
      releaseAudio();
      if (listeningModeRef.current) {
        setError('La lecture audio a été bloquée par le navigateur. Tu peux continuer à parler.');
        resumeListening();
      } else {
        setLiveStatus('ready');
        setStatusNote('La réponse est prête à lire');
      }
    }
  }

  async function submitRecording(blob: Blob, mimeType: string) {
    if (!blob.size) {
      if (listeningModeRef.current) resumeListening();
      else setLiveStatus('ready');
      setStatusNote('Je n’ai rien entendu. Réessaie.');
      return;
    }
    const sessionId = sessionRef.current ?? crypto.randomUUID();
    sessionRef.current = sessionId;
    const controller = new AbortController();
    controllerRef.current = controller;
    setLiveStatus('thinking');
    setStatusNote('Je prépare ma réponse…');
    setError('');
    try {
      const result = await sendTurn(blob, mimeType, sessionId, controller.signal);
      if (controller.signal.aborted || !mountedRef.current) return;
      setTranscript(result.transcript);
      setAnswer(result.answer);
      if (!result.answer) {
        if (listeningModeRef.current) resumeListening();
        else setLiveStatus('ready');
        return;
      }
      await playSpeech(sessionId, result.answer, result.language || 'fr', controller.signal);
    } catch (cause) {
      if (controller.signal.aborted || !mountedRef.current) return;
      if (cause instanceof Error && cause.message === 'speech_not_detected') {
        setStatusNote('Je n’ai pas entendu de mots; continue quand tu veux.');
        resumeListening();
        return;
      }
      stopConversation('Écoute arrêtée après une erreur.');
      setError(permissionMessage(cause));
      setLiveStatus('error');
      setStatusNote('Le micro est coupé. Réessaie quand tu veux.');
    }
  }

  const beginConversation = async () => {
    if (listeningModeRef.current || capturePendingRef.current) return;
    setError('');
    setTranscript('');
    setAnswer('');
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder || typeof AudioContext === 'undefined') {
      setError('La conversation vocale nécessite un navigateur récent et une connexion HTTPS.');
      setLiveStatus('error');
      return;
    }

    const generation = ++captureGenerationRef.current;
    capturePendingRef.current = true;
    listeningModeRef.current = true;
    setListeningMode(true);
    setStarting(true);
    setStatusNote('Autorise le micro pour commencer…');
    try {
      const existingOutputContext = audioContextRef.current;
      const outputContext = existingOutputContext && existingOutputContext.state !== 'closed'
        ? existingOutputContext
        : new AudioContext();
      audioContextRef.current = outputContext;
      void outputContext.resume().catch(() => undefined);

      const inputContext = new AudioContext();
      inputAudioContextRef.current = inputContext;
      await inputContext.resume();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: selectedDevice ? { deviceId: { exact: selectedDevice } } : true,
      });
      if (!mountedRef.current || generation !== captureGenerationRef.current || !listeningModeRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      const source = inputContext.createMediaStreamSource(stream);
      const analyser = inputContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.12;
      source.connect(analyser);
      inputAudioSourceRef.current = source;
      inputAnalyserRef.current = analyser;

      if (!mountedRef.current || generation !== captureGenerationRef.current || !listeningModeRef.current) return;
      setPermission('Autorisé');
      setStarting(false);
      void refreshInputs();
      stream.getAudioTracks().forEach((track) => {
        track.addEventListener('ended', () => {
          if (!listeningModeRef.current || !mountedRef.current) return;
          stopConversation('Micro désactivé car il est devenu indisponible.');
          setError('Le microphone a été déconnecté. Rebranche-le puis réactive l’écoute.');
          setLiveStatus('error');
        }, { once: true });
      });
      capturePendingRef.current = false;
      setLiveStatus('listening');
      setStatusNote('Parle naturellement; je réponds après une pause.');
      startVoiceActivityMonitor();
    } catch (cause) {
      if (generation !== captureGenerationRef.current || !mountedRef.current) return;
      capturePendingRef.current = false;
      listeningModeRef.current = false;
      setListeningMode(false);
      setStarting(false);
      stopTracks();
      closeInputAudioContext();
      setLiveStatus('error');
      setStatusNote('Microphone indisponible');
      setError(permissionMessage(cause));
      if (cause instanceof DOMException && cause.name === 'NotAllowedError') setPermission('Bloqué');
    }
  };

  const toggleConversation = () => {
    if (listeningModeRef.current || capturePendingRef.current) {
      stopConversation(recording ? 'Écoute arrêtée; la phrase en cours est abandonnée.' : 'Micro désactivé.');
    } else {
      void beginConversation();
    }
  };

  const resetConversation = () => {
    stopConversation('Conversation réinitialisée.');
    setTranscript('');
    setAnswer('');
    setError('');
  };

  const stopSpeech = () => {
    releaseAudio();
    if (listeningModeRef.current) resumeListening();
    else {
      setLiveStatus('ready');
      setStatusNote('Réponse arrêtée');
    }
  };

  return (
    <LiveAvatarCall
      status={status}
      statusNote={statusNote}
      transcript={transcript}
      answer={answer}
      error={error}
      recording={recording}
      listeningMode={listeningMode}
      starting={starting}
      audioLevel={audioLevel}
      settingsOpen={settingsOpen}
      inputs={inputs}
      selectedDevice={selectedDevice}
      permission={permission}
      onToggleListening={toggleConversation}
      onReset={resetConversation}
      onStopSpeech={stopSpeech}
      onToggleSettings={() => setSettingsOpen((open) => !open)}
      onCloseSettings={() => setSettingsOpen(false)}
      onSelectDevice={(deviceId) => {
        if (listeningModeRef.current) stopConversation('Micro désactivé pour changer de microphone.');
        setSelectedDevice(deviceId);
      }}
      onDismissError={() => setError('')}
    />
  );
}
