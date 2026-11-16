import { type CSSProperties, useEffect, useState } from 'react';
import { DiscordSDK } from '@discord/embedded-app-sdk';
import { ArrowUpRight, Check, CircleHelp, ExternalLink } from 'lucide-react';

type RuntimeState = 'checking' | 'activity' | 'preview' | 'unavailable';

const scenes = ['#e7d9ef', '#f1d9c9', '#d1e6df', '#f1e2a9', '#d4def0'];

function Home() {
  const [scene, setScene] = useState(0);
  const [runtime, setRuntime] = useState<RuntimeState>('checking');

  useEffect(() => {
    const timer = window.setInterval(() => {
      setScene((current) => (current + 1) % scenes.length);
    }, 2000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
    if (!clientId) {
      setRuntime('preview');
      return;
    }

    let mounted = true;
    let timeout = 0;
    const detectActivity = async () => {
      try {
        const discordSdk = new DiscordSDK(clientId);
        await Promise.race([
          discordSdk.ready(),
          new Promise<never>((_, reject) => {
            timeout = window.setTimeout(
              () => reject(new Error('Discord Activity context timed out')),
              6000,
            );
          }),
        ]);
        if (mounted) setRuntime('activity');
      } catch {
        if (mounted) setRuntime('unavailable');
      } finally {
        window.clearTimeout(timeout);
      }
    };
    void detectActivity();

    return () => {
      mounted = false;
    };
  }, []);

  const isConnected = runtime === 'activity';
  const statusText = {
    checking: 'Vérification du contexte Discord…',
    activity: 'Ouvert dans Discord',
    preview: 'Aperçu navigateur',
    unavailable: 'Discord Activity non détectée',
  }[runtime];

  return (
    <main
      className="activity-background grain relative flex min-h-[100dvh] flex-col overflow-hidden px-5 py-5 text-[#302b3d] sm:px-9 sm:py-7"
      style={{ '--scene-color': scenes[scene] } as CSSProperties}
    >
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-[14px] bg-[#302b3d] text-[#f7f1e8] shadow-[0_5px_0_#b9a9c0]">
            <svg aria-hidden="true" viewBox="0 0 28 28" className="size-6">
              <path d="M14 3.5 16.6 11l7.5 3-7.5 2.7-2.6 7.8-2.7-7.8-7.4-2.7 7.4-3L14 3.5Z" fill="currentColor" />
              <circle cx="22.2" cy="6.4" r="1.5" fill="#ef9b70" />
            </svg>
          </div>
          <div className="leading-tight">
            <div className="font-semibold tracking-[-0.04em]">MaximeGPT</div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-[.19em] text-[#756b7e]">Activity</div>
          </div>
        </div>
        <div className="rounded-full border border-[#302b3d]/15 bg-[#fffaf2]/55 px-3 py-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#574e61] backdrop-blur-sm sm:px-4 sm:text-[11px]">
          Démo embarquée
        </div>
      </header>

      <div className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 py-14 lg:grid-cols-[1.05fr_.95fr] lg:gap-16 lg:py-20">
        <section className="rise-in max-w-[620px]">
          <div className="mb-7 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.2em] text-[#655970]">
            <span className="size-2 rounded-full bg-[#e9855f]" />
            Votre assistant, dans Discord
          </div>
          <h1 className="max-w-[650px] font-serif text-[clamp(3.5rem,8vw,6.6rem)] leading-[.91] tracking-[-.075em] text-[#302b3d]">
            MaximeGPT,
            <br />
            <span className="italic text-[#744f83]">juste ici.</span>
          </h1>
          <p className="mt-8 max-w-[450px] text-[16px] leading-[1.75] text-[#50495a] sm:text-[18px]">
            Une Activity est une petite application qui s’ouvre directement dans Discord. Cette démo montre MaximeGPT dans son espace, sans quitter la conversation.
          </p>
          <div className="mt-9 flex items-center gap-3 text-[13px] font-medium text-[#5d5566]">
            <span className="grid size-7 place-items-center rounded-full bg-[#fffaf2]/70">
              <Check size={15} strokeWidth={2.5} />
            </span>
            Pas de micro. Pas d’accès aux messages.
          </div>
        </section>

        <section className="rise-in-delay relative mx-auto w-full max-w-[470px]" aria-label="Aperçu de l’Activity">
          <div className="absolute -right-5 -top-7 z-20 hidden -rotate-6 rounded-xl border border-[#302b3d]/15 bg-[#fffaf2] px-4 py-2.5 text-xs font-semibold shadow-[0_5px_0_rgba(48,43,61,.1)] sm:block">
            Une fenêtre dans Discord
          </div>
          <div className="overflow-hidden rounded-[26px] border border-[#302b3d]/15 bg-[#fbf8f0] shadow-[0_24px_70px_rgba(48,43,61,.18)]">
            <div className="flex h-12 items-center gap-2 border-b border-[#302b3d]/10 bg-[#f1ede5] px-4">
              <span className="size-2 rounded-full bg-[#d4b9aa]" />
              <span className="size-2 rounded-full bg-[#decf9d]" />
              <span className="size-2 rounded-full bg-[#aec8b8]" />
              <span className="ml-3 text-[11px] font-medium text-[#766d7b]">discord.com / Activity</span>
              <ExternalLink className="ml-auto text-[#847b89]" size={14} />
            </div>
            <div className="p-5 sm:p-7">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid size-11 place-items-center rounded-[15px] bg-[#302b3d] text-[#f8f0e3]">
                    <svg aria-hidden="true" viewBox="0 0 28 28" className="size-6">
                      <path d="M14 3.5 16.6 11l7.5 3-7.5 2.7-2.6 7.8-2.7-7.8-7.4-2.7 7.4-3L14 3.5Z" fill="currentColor" />
                      <circle cx="22.2" cy="6.4" r="1.5" fill="#ef9b70" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-bold tracking-[-.03em]">MaximeGPT</div>
                    <div className="mt-1 text-xs text-[#807784]">Votre espace personnel</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-[#e9f1e9] px-2.5 py-1.5 text-[10px] font-semibold text-[#42664e]">
                  <span className="size-1.5 rounded-full bg-[#6b9b72]" />
                  {isConnected ? 'Dans Discord' : 'Mode démo'}
                </div>
              </div>

              <div className="mt-6 rounded-[20px] bg-[#302b3d] p-5 text-[#f8f0e3] sm:p-7">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[.2em] text-[#c2b3c8]">Un petit aperçu</div>
                    <div className="mt-3 font-serif text-[27px] leading-tight tracking-[-.04em] sm:text-[32px]">Une Activity,<br />intégrée à Discord.</div>
                  </div>
                  <div className="grid size-9 place-items-center rounded-full border border-white/20 text-[#f1b08e]">
                    <ArrowUpRight size={17} />
                  </div>
                </div>
                <div className="mt-7 flex items-center gap-2 border-t border-white/15 pt-4 text-[11px] text-[#d6cbd9]">
                  <span className="size-1.5 rounded-full bg-[#eca27e]" />
                  Une interface intégrée à Discord
                </div>
              </div>

              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[#302b3d]/10 bg-[#f3efe7] p-4">
                <div className="mt-0.5 text-[#7c6888]"><CircleHelp size={17} /></div>
                <p className="text-[11px] leading-[1.6] text-[#6d6572]">
                  {isConnected
                    ? 'Le SDK officiel confirme que cette page est ouverte dans une Activity Discord.'
                    : 'En aperçu navigateur, cette fenêtre illustre simplement à quoi ressemble une Activity.'}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 text-[11px] font-medium text-[#554e5c]">
            <span className={`size-2 rounded-full ${runtime === 'checking' ? 'animate-pulse bg-[#c99b58]' : isConnected ? 'bg-[#5e946a]' : 'bg-[#d18b69]'}`} />
            <span data-testid="status-runtime">{statusText}</span>
          </div>
        </section>
      </div>

      <footer className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between border-t border-[#302b3d]/15 pt-4 text-[10px] font-medium uppercase tracking-[.14em] text-[#655d6b]">
        <span>MaximeGPT · Une démo, rien de plus</span>
        <span>La couleur évolue toutes les deux secondes</span>
      </footer>
    </main>
  );
}

function App() {
  return <Home />;
}

export default App;
