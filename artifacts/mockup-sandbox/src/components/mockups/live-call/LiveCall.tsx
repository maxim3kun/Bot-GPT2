import { useEffect, useRef, useState } from 'react';
import { AudioLines, Mic, MicOff, Keyboard, Pause, RotateCcw, Sparkles, Volume2 } from 'lucide-react';
import './live-call.css';

type CallMode = 'idle' | 'listening' | 'thinking' | 'speaking';

const modeCopy: Record<CallMode, string> = {
  idle: 'Je suis là, prends ton temps.',
  listening: 'Je t’écoute…',
  thinking: 'Laisse-moi y réfléchir',
  speaking: 'Je voulais te dire…',
};

export function LiveCall() {
  const [mode, setMode] = useState<CallMode>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [typed, setTyped] = useState('');
  const [transcript, setTranscript] = useState('');
  const holdRef = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (mode === 'idle') return;
    const interval = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [mode]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const startListening = () => {
    if (mode === 'thinking') return;
    window.clearTimeout(timerRef.current);
    holdRef.current = true;
    setMode('listening');
  };
  const stopListening = () => {
    if (!holdRef.current) return;
    holdRef.current = false;
    setTranscript('Je voulais te parler de ma journée.');
    setTyped('');
    setMode('thinking');
    timerRef.current = window.setTimeout(() => {
      setTyped('Parfois, les journées les plus ordinaires méritent aussi qu’on en parle. Qu’est-ce qui t’est resté en tête ?');
      setMode('speaking');
    }, 2300);
  };
  const reset = () => {
    holdRef.current = false;
    window.clearTimeout(timerRef.current);
    setMode('idle');
    setElapsed(0);
    setTranscript('');
    setTyped('');
  };
  const time = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
  const isActive = mode === 'listening' || mode === 'speaking';

  return (
    <main className="call-page" data-mode={mode}>
      <div className="call-shell">
        <header className="call-header">
          <div className="call-brand"><span className="brand-icon"><AudioLines size={19} /></span><span><b>MaximeGPT</b><small>Un moment à deux</small></span></div>
          <div className="call-header-right"><span className="demo-tag"><i /> Démo interactive</span><button className="reset-icon" onClick={reset} aria-label="Recommencer" data-testid="button-reset"><RotateCcw size={17} /></button></div>
        </header>

        <section className="call-stage" aria-label="Appel de démonstration avec Maxime">
          <div className="starfield" aria-hidden="true"><i /><i /><i /><i /><i /></div>
          <div className="stage-topline"><span className="live-indicator"><i /> APPEL PRIVÉ</span><span className="call-clock">{time}</span></div>
          <div className="call-glow" aria-hidden="true" />
          <div className="character-scene">
            <div className="character-aura" />
            <div className={`maxime-art ${mode === 'speaking' ? 'maxime-art--speaking' : ''} ${mode === 'thinking' ? 'maxime-art--thinking' : ''}`}>
              <img src="/__mockup/images/maxime-stage-portrait.jpg" alt="Maxime, en tenue cyan lumineuse" />
              <span className="mouth-motion" aria-hidden="true" />
            </div>
            {mode === 'thinking' && <div className="thought-bubble"><span /><span /><span /><small>réfléchit</small></div>}
            <div className={`call-desk ${mode === 'thinking' ? 'call-desk--typing' : ''}`} aria-hidden="true">
              <div className="desk-edge" />
              <div className="keyboard">
                <div className="keyboard-keys">
                  {Array.from({ length: 30 }, (_, index) => <i key={index} />)}
                </div>
                <div className="keyboard-space" />
                <span className="typing-caret" />
              </div>
              <span className="desk-light" />
            </div>
            <div className={`scene-caption scene-caption--${mode}`}>
              <span className="caption-wave"><i /><i /><i /><i /><i /></span>
              {modeCopy[mode]}
            </div>
          </div>
          <div className="call-identity">
            <span className="identity-avatar">M</span>
            <span><b>Maxime</b><small>{mode === 'listening' ? 'À ton écoute' : mode === 'thinking' ? 'En train de réfléchir' : mode === 'speaking' ? 'Parle' : 'Disponible'}</small></span>
            <span className="identity-sound"><AudioLines size={16} /></span>
          </div>
          <div className="demo-note"><Sparkles size={14} /> Simulation locale · aucun micro ni service connecté</div>
        </section>

        <section className="call-console">
          <div className="console-top">
            <div className="prompt-block"><span className="prompt-kicker">À TOI</span><h1>On se parle ?</h1><p>Maintiens le bouton, puis relâche.</p></div>
            {mode === 'thinking' && (
              <div className="typing-window" aria-live="polite">
                <div className="typing-head"><Keyboard size={15} /><span>Maxime écrit</span><span className="typing-dots"><i /><i /><i /></span></div>
                <div className="typing-lines"><i /><i /><i /></div>
              </div>
            )}
            {mode === 'speaking' && <div className="reply-preview" aria-live="polite"><span>MAXIME</span><p>{typed}</p></div>}
            {transcript && mode !== 'thinking' && mode !== 'speaking' && <div className="transcript"><span>TON DERNIER MESSAGE</span><p>{transcript}</p></div>}
          </div>
          <div className="console-controls">
            <span className="privacy-label"><span className="privacy-dot" /> Démonstration sans capture audio</span>
            <div className="button-cluster">
              {mode === 'speaking' && <button className="stop-button" onClick={() => setMode('idle')} data-testid="button-stop"><Pause size={15} /> Arrêter</button>}
              <button
                className={`talk-button ${mode === 'listening' ? 'talk-button--active' : ''}`}
                onPointerDown={(event) => { if (event.button === 0) { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); startListening(); } }}
                onPointerUp={stopListening}
                onPointerCancel={stopListening}
                onKeyDown={(event) => { if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) { event.preventDefault(); startListening(); } }}
                onKeyUp={(event) => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); stopListening(); } }}
                aria-label={mode === 'listening' ? 'Relâcher pour envoyer' : 'Maintenir pour parler'}
                data-testid="button-hold-to-talk"
              ><span className="talk-icon">{mode === 'listening' ? <MicOff size={21} /> : <Mic size={21} />}</span><span>{mode === 'listening' ? 'Relâche pour envoyer' : 'Maintenir pour parler'}</span><kbd>SPACE</kbd></button>
            </div>
          </div>
        </section>
        <footer className="call-footer"><span><Volume2 size={14} /> Le mouvement de Maxime suit l’état de la démo.</span><span>Un petit espace pour se retrouver.</span></footer>
      </div>
    </main>
  );
}
