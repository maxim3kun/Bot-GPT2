import { useCallback, useEffect, useRef, useState } from 'react';
import { DiscordSDK, RPCCloseCodes } from '@discord/embedded-app-sdk';
import {
  Check,
  CircleHelp,
  LockKeyhole,
  LoaderCircle,
  Save,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';

type ViewState = 'checking' | 'authorizing' | 'ready' | 'preview' | 'error';
type ApiErrorBody = { error?: string };

interface ActivityAuthResponse {
  activityToken: string;
  discordAccessToken: string;
  userId: string;
  displayName: string;
  sessionId: string;
  sessionExpiresAt: string;
}

interface StoryState {
  consentAccepted: boolean;
  story: string;
  updatedAt: string | null;
}

interface ActivityConfig {
  ready: boolean;
  clientIdMatches: boolean;
  checks: {
    discordOAuth: boolean;
    sessionSigning: boolean;
    mongo: boolean;
    encryption: boolean;
  };
}

const API_BASE = (import.meta.env.VITE_ACTIVITY_API_URL ?? '').trim().replace(/\/+$/, '');
const STORY_MAX_LENGTH = 4_000;
const PRIVATE_PROMPTS = [
  'Un carnet fermé apparaît sur ta table. Quel premier souvenir y notes-tu ?',
  'Une porte inconnue vient de s’ouvrir dans un endroit familier. Que trouves-tu derrière ?',
  'Un message sans signature te confie une petite mission. Quelle est-elle ?',
  'Tu découvres une carte dont un seul lieu est marqué. Pourquoi veux-tu t’y rendre ?',
  'Un objet ordinaire semble cacher une histoire. Lequel choisis-tu ?',
  'Une personne te demande de garder un secret sans t’expliquer pourquoi. Que fais-tu ?',
];

function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

async function apiRequest<T>(
  path: string,
  options: { token?: string; method?: string; body?: unknown } = {},
): Promise<T> {
  const response = await fetch(apiUrl(path), {
    method: options.method ?? 'GET',
    cache: 'no-store',
    headers: {
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      ...(options.body !== undefined ? { 'content-type': 'application/json' } : {}),
    },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
  const data = await response.json().catch(() => ({})) as T & ApiErrorBody;
  if (!response.ok) {
    const error = new Error(data.error || `http_${response.status}`);
    throw error;
  }
  return data;
}

function makeVerifier(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

async function makeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function privatePrompt(): string {
  const index = (crypto.getRandomValues(new Uint32Array(1))[0] ?? 0) % PRIVATE_PROMPTS.length;
  return PRIVATE_PROMPTS[index] ?? PRIVATE_PROMPTS[0]!;
}

function messageForError(error: unknown): string {
  const code = error instanceof Error ? error.message : '';
  if (/failed to fetch|networkerror|load failed/i.test(code)) {
    return 'L’API de l’Activity est inaccessible depuis cette page. Vérifie son URL HTTPS et l’origine autorisée sur le serveur.';
  }
  const messages: Record<string, string> = {
    activity_oauth_not_configured: 'Le serveur doit encore recevoir l’identifiant et le secret OAuth de cette application Discord.',
    activity_storage_unavailable: 'La base MongoDB est indisponible. Rien n’a été enregistré.',
    activity_encryption_unavailable: 'La clé de chiffrement du serveur manque. Les histoires restent désactivées.',
    activity_session_expired: 'La session du serveur a expiré. Ferme puis relance l’Activity.',
    invalid_activity_authorization: 'Discord n’a pas fourni un contexte valide pour cette Activity.',
    invalid_configuration: 'L’identifiant Discord de la page ne correspond pas à celui configuré sur le serveur.',
    invalid_code: 'Discord a refusé la connexion. Ferme puis relance l’Activity.',
    invalid_identity: 'L’identité Discord n’a pas pu être vérifiée.',
    not_a_member: 'Cette Activity doit être ouverte depuis un serveur auquel tu appartiens.',
    provider_unavailable: 'Discord est temporairement injoignable. Réessaie dans un instant.',
    rate_limited: 'Trop de tentatives. Attends un instant avant de réessayer.',
    story_consent_required: 'Accepte d’abord la conservation chiffrée pour enregistrer cette histoire.',
    unauthorized: 'Ta session Discord a expiré. Relance l’Activity.',
    explicit_acceptance_required: 'L’enregistrement ne peut être activé que par un accord explicite.',
  };
  return messages[code] ?? 'Une erreur est survenue. Aucun contenu privé n’a été partagé.';
}

function messageForConfig(config: ActivityConfig): string {
  if (!config.checks.discordOAuth) {
    return 'L’API doit recevoir l’identifiant et le secret OAuth de l’application Discord. Le secret reste uniquement sur le serveur.';
  }
  if (!config.clientIdMatches) {
    return 'L’identifiant d’application configuré dans cette page ne correspond pas à celui du serveur API.';
  }
  if (!config.checks.sessionSigning) return 'La clé de signature SESSION_SECRET manque sur le serveur API.';
  if (!config.checks.mongo) return 'MongoDB est indisponible sur le serveur API.';
  if (!config.checks.encryption) return 'MongoDB ou la clé ENCRYPTION_KEY manque. La sauvegarde privée reste désactivée.';
  return 'La configuration de l’Activity est incomplète.';
}

function Home() {
  const [view, setView] = useState<ViewState>('checking');
  const [message, setMessage] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [token, setToken] = useState('');
  const [story, setStory] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [localPrompt, setLocalPrompt] = useState(privatePrompt);
  const [busy, setBusy] = useState(false);
  const sdkRef = useRef<DiscordSDK | null>(null);
  const tokenRef = useRef('');

  const updateToken = useCallback((nextToken: string) => {
    tokenRef.current = nextToken;
    setToken(nextToken);
  }, []);

  useEffect(() => {
    let mounted = true;
    const clientId = (import.meta.env.VITE_DISCORD_CLIENT_ID ?? '').trim();
    const start = async () => {
      if (!clientId) {
        setView('error');
        setMessage('Il manque l’identifiant public de l’application Discord dans la configuration de la page.');
        return;
      }
      let sdk: DiscordSDK;
      try {
        sdk = new DiscordSDK(clientId);
        sdkRef.current = sdk;
        let readyTimeout = 0;
        try {
          await Promise.race([
            sdk.ready(),
            new Promise<never>((_, reject) => {
              readyTimeout = window.setTimeout(() => reject(new Error('activity_context_timeout')), 6_000);
            }),
          ]);
        } finally {
          window.clearTimeout(readyTimeout);
        }
      } catch {
        if (mounted) setView('preview');
        return;
      }
      if (!mounted) return;
      const guildId = sdk.guildId;
      if (!guildId) {
        setView('error');
        setMessage('Ouvre l’Activity depuis un serveur Discord, pas depuis un message privé.');
        return;
      }
      try {
        setView('authorizing');
        const config = await apiRequest<ActivityConfig>(`/api/activity/config?clientId=${encodeURIComponent(clientId)}`);
        if (!config.ready) {
          setView('error');
          setMessage(messageForConfig(config));
          return;
        }
        const verifier = makeVerifier();
        const challenge = await makeChallenge(verifier);
        const authorization = await sdk.commands.authorize({
          client_id: clientId,
          response_type: 'code',
          scope: ['identify', 'guilds'],
          prompt: 'none',
          code_challenge: challenge,
          code_challenge_method: 'S256',
        });
        const login = await apiRequest<ActivityAuthResponse>('/api/activity/auth', {
          method: 'POST',
          body: { code: authorization.code, codeVerifier: verifier, guildId, clientId },
        });
        const discordUser = await sdk.commands.authenticate({
          access_token: login.discordAccessToken,
        });
        if (discordUser.user.id !== login.userId) {
          throw new Error('invalid_identity');
        }
        if (!mounted) return;

        updateToken(login.activityToken);
        setDisplayName(login.displayName || discordUser.user.username);
        setSessionId(login.sessionId);
        const personal = await apiRequest<{ story: StoryState }>('/api/activity/me', {
          token: login.activityToken,
        });
        if (!mounted) return;
        setConsentAccepted(personal.story.consentAccepted);
        setStory(personal.story.story || '');
        setSavedAt(personal.story.updatedAt);
        setView('ready');
      } catch (error) {
        if (!mounted) return;
        setView('error');
        setMessage(messageForError(error));
      }
    };
    void start();
    return () => {
      mounted = false;
      sdkRef.current = null;
    };
  }, [updateToken]);

  useEffect(() => {
    if (view !== 'ready') return;
    const timer = window.setInterval(async () => {
      const currentToken = tokenRef.current;
      if (!currentToken) return;
      try {
        const result = await apiRequest<{ activityToken: string }>('/api/activity/pulse', {
          method: 'POST',
          token: currentToken,
        });
        updateToken(result.activityToken);
      } catch {
        setMessage('La connexion a été perdue. Relance l’Activity pour reprendre en sécurité.');
      }
    }, 5 * 60 * 1_000);
    return () => window.clearInterval(timer);
  }, [view, updateToken]);

  const saveStory = async () => {
    if (!token || !consentAccepted || !story.trim()) return;
    setBusy(true);
    setMessage('');
    try {
      await apiRequest('/api/activity/story', {
        method: 'PUT',
        token,
        body: { story },
      });
      setSavedAt(new Date().toISOString());
      setMessage('Ton histoire a été enregistrée de façon chiffrée. Elle reste privée.');
    } catch (error) {
      setMessage(messageForError(error));
    } finally {
      setBusy(false);
    }
  };

  const acceptStorage = async () => {
    if (!token || !consentChecked) return;
    setBusy(true);
    setMessage('');
    try {
      await apiRequest('/api/activity/consent', {
        method: 'POST',
        token,
        body: { accepted: true },
      });
      setConsentAccepted(true);
      setMessage('Accord enregistré. Ton histoire reste privée et tu peux retirer cet accord à tout moment.');
      if (story.trim()) {
        await apiRequest('/api/activity/story', { method: 'PUT', token, body: { story } });
        setSavedAt(new Date().toISOString());
      }
    } catch (error) {
      setMessage(messageForError(error));
    } finally {
      setBusy(false);
    }
  };

  const revokeStorage = async () => {
    if (!token) return;
    setBusy(true);
    setMessage('');
    try {
      await apiRequest('/api/activity/consent', { method: 'DELETE', token });
      setConsentAccepted(false);
      setStory('');
      setSavedAt(null);
      setConsentChecked(false);
      setLocalPrompt(privatePrompt());
      setMessage('Accord retiré et histoire enregistrée effacée.');
    } catch (error) {
      setMessage(messageForError(error));
    } finally {
      setBusy(false);
    }
  };

  const deleteStory = async () => {
    if (!token) return;
    setBusy(true);
    setMessage('');
    try {
      await apiRequest('/api/activity/story', { method: 'DELETE', token });
      setStory('');
      setSavedAt(null);
      setMessage('Ton histoire enregistrée a été effacée.');
    } catch (error) {
      setMessage(messageForError(error));
    } finally {
      setBusy(false);
    }
  };

  const closeActivity = () => sdkRef.current?.close(RPCCloseCodes.CLOSE_NORMAL, 'Activity fermée');

  if (view === 'checking' || view === 'authorizing') {
    return (
      <main className="activity-background grain flex min-h-[100dvh] items-center justify-center px-5 py-8 text-[#302b3d]">
        <section className="w-full max-w-lg rounded-[28px] border border-[#302b3d]/10 bg-[#fffaf2]/85 p-8 shadow-[0_24px_70px_rgba(48,43,61,.15)] sm:p-10">
          <Brand />
          <div className="mt-12 flex items-center gap-3 text-sm font-medium text-[#60576a]">
            <LoaderCircle className="animate-spin" size={20} />
            {view === 'checking' ? 'Connexion à Discord…' : 'Vérification de ton accès…'}
          </div>
          <p className="mt-4 text-sm leading-6 text-[#756d7b]">Aucune histoire personnelle n’est chargée avant la vérification de ton identité.</p>
        </section>
      </main>
    );
  }

  if (view === 'preview') {
    return (
      <main className="activity-background grain flex min-h-[100dvh] items-center justify-center px-5 py-8 text-[#302b3d]">
        <section className="w-full max-w-lg rounded-[28px] border border-[#302b3d]/10 bg-[#fffaf2]/85 p-8 shadow-[0_24px_70px_rgba(48,43,61,.15)] sm:p-10">
          <Brand />
          <h1 className="mt-12 font-serif text-4xl tracking-tight">À ouvrir dans Discord</h1>
          <p className="mt-4 leading-7 text-[#60576a]">La page de test ne reçoit pas l’identité Discord. Ouvre l’Activity dans un serveur pour accéder à ton espace privé.</p>
          <div className="mt-8 flex gap-3 rounded-2xl bg-[#f0ece4] p-4 text-sm leading-6 text-[#60576a]">
            <CircleHelp className="mt-1 shrink-0 text-[#7c6888]" size={18} />
            <span>L’aperçu navigateur n’affiche ni données de membre ni histoire enregistrée.</span>
          </div>
        </section>
      </main>
    );
  }

  if (view === 'error') {
    return (
      <main className="activity-background grain flex min-h-[100dvh] items-center justify-center px-5 py-8 text-[#302b3d]">
        <section className="w-full max-w-lg rounded-[28px] border border-[#302b3d]/10 bg-[#fffaf2]/90 p-8 shadow-[0_24px_70px_rgba(48,43,61,.15)] sm:p-10">
          <Brand />
          <div className="mt-12 grid size-12 place-items-center rounded-2xl bg-[#f5e3dd] text-[#a65345]">
            <X size={22} />
          </div>
          <h1 className="mt-6 font-serif text-4xl tracking-tight">Connexion bloquée</h1>
          <p className="mt-4 leading-7 text-[#60576a]">{message}</p>
          <p className="mt-5 text-sm leading-6 text-[#756d7b]">Pour protéger les histoires, l’Activity refuse de continuer si Discord, MongoDB ou le chiffrement n’est pas vérifié.</p>
          <button onClick={closeActivity} className="mt-8 rounded-xl bg-[#302b3d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#463e54]">
            Fermer
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="activity-background grain min-h-[100dvh] px-4 py-5 text-[#302b3d] sm:px-8 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between gap-4">
          <Brand />
          <button onClick={closeActivity} aria-label="Fermer l’Activity" className="grid size-10 place-items-center rounded-full border border-[#302b3d]/10 bg-[#fffaf2]/65 text-[#51485b] transition hover:bg-white">
            <X size={18} />
          </button>
        </header>

        <section className="mt-9 rounded-[28px] border border-[#302b3d]/10 bg-[#fffaf2]/85 p-5 shadow-[0_20px_60px_rgba(48,43,61,.12)] sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#756b7e]">Ton espace privé</p>
              <h1 className="mt-2 font-serif text-4xl leading-tight tracking-[-.04em] sm:text-5xl">Une histoire à toi.</h1>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#e9f1e9] px-3 py-2 text-xs font-semibold text-[#42664e]">
              <ShieldCheck size={15} />
              Session du serveur active
            </div>
          </div>

          <div className="mt-7 flex items-start gap-3 rounded-2xl border border-[#302b3d]/10 bg-white/60 p-4">
            <LockKeyhole className="mt-0.5 shrink-0 text-[#74587f]" size={18} />
            <p className="text-sm leading-6 text-[#5d5566]">
              {displayName ? `Espace de ${displayName}. ` : ''}
              Ton histoire est séparée de celles des autres membres. Rien n’est partagé dans le serveur.
            </p>
          </div>

          <label htmlFor="private-story" className="mt-7 block text-sm font-semibold text-[#40384a]">Ton récit privé</label>
          <textarea
            id="private-story"
            value={story}
            onChange={(event) => setStory(event.target.value.slice(0, STORY_MAX_LENGTH))}
            maxLength={STORY_MAX_LENGTH}
            placeholder={localPrompt}
            rows={7}
            className="mt-2 w-full resize-y rounded-2xl border border-[#302b3d]/15 bg-white/75 px-4 py-3 text-sm leading-6 text-[#302b3d] outline-none transition placeholder:text-[#817888] focus:border-[#866a91] focus:ring-4 focus:ring-[#866a91]/10"
          />
          <div className="mt-2 flex justify-between text-xs text-[#756d7b]">
            <span>{consentAccepted ? 'Enregistrement chiffré activé' : 'Visible seulement dans cette page tant que tu ne choisis pas de l’enregistrer'}</span>
            <span>{story.length}/{STORY_MAX_LENGTH}</span>
          </div>

          {!consentAccepted ? (
            <section className="mt-6 rounded-2xl border border-[#866a91]/20 bg-[#f5f0f6] p-4 sm:p-5">
              <div className="flex gap-3">
                <LockKeyhole className="mt-0.5 shrink-0 text-[#74587f]" size={18} />
                <div>
                  <h2 className="font-semibold text-[#40384a]">Garder ton histoire pour plus tard ?</h2>
                  <p className="mt-2 text-sm leading-6 text-[#625969]">Si tu acceptes, elle sera chiffrée dans MongoDB et ne sera visible que par toi. Tu peux refuser, ou retirer ton accord et tout effacer plus tard.</p>
                </div>
              </div>
              <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm leading-6 text-[#51485b]">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(event) => setConsentChecked(event.target.checked)}
                  className="mt-1 size-4 accent-[#74587f]"
                />
                <span>Je donne mon accord explicite pour enregistrer cette histoire chiffrée.</span>
              </label>
              <div className="mt-4 flex flex-wrap gap-2">
                <button disabled={!consentChecked || busy} onClick={() => void acceptStorage()} className="inline-flex items-center gap-2 rounded-xl bg-[#302b3d] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#463e54] disabled:cursor-not-allowed disabled:opacity-45">
                  <Check size={16} /> Accepter et enregistrer
                </button>
                <button onClick={() => setMessage('D’accord. Ton texte reste seulement dans cette page et ne sera pas enregistré.')} className="rounded-xl border border-[#302b3d]/15 bg-white/70 px-4 py-2.5 text-sm font-semibold text-[#51485b] transition hover:bg-white">
                  Continuer sans sauvegarder
                </button>
              </div>
            </section>
          ) : (
            <div className="mt-5 flex flex-wrap gap-2">
              <button disabled={busy || !story.trim()} onClick={() => void saveStory()} className="inline-flex items-center gap-2 rounded-xl bg-[#6156d9] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5248c6] disabled:cursor-not-allowed disabled:opacity-45">
                <Save size={16} /> Enregistrer
              </button>
              <button disabled={busy || !savedAt} onClick={() => void deleteStory()} className="inline-flex items-center gap-2 rounded-xl border border-[#302b3d]/15 bg-white/70 px-4 py-2.5 text-sm font-semibold text-[#51485b] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45">
                <Trash2 size={16} /> Effacer l’histoire
              </button>
              <button disabled={busy} onClick={() => void revokeStorage()} className="inline-flex items-center gap-2 rounded-xl border border-[#b76f62]/25 bg-[#fbefec] px-4 py-2.5 text-sm font-semibold text-[#8e4b42] transition hover:bg-[#f8e5e0] disabled:cursor-not-allowed disabled:opacity-45">
                <X size={16} /> Retirer mon accord et tout effacer
              </button>
            </div>
          )}

          {savedAt && consentAccepted && (
            <p className="mt-3 text-xs text-[#756d7b]">Dernière sauvegarde : {new Date(savedAt).toLocaleString()}</p>
          )}
          {message && (
            <p role="status" className="mt-4 rounded-xl bg-[#f1ede5] px-4 py-3 text-sm leading-6 text-[#51485b]">{message}</p>
          )}
          <p className="mt-7 border-t border-[#302b3d]/10 pt-4 text-xs leading-5 text-[#756d7b]">
            Session privée · ID de session {sessionId.slice(0, 8)} · les autres membres ne voient pas ton texte.
          </p>
        </section>
      </div>
    </main>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 place-items-center rounded-[14px] bg-[#302b3d] text-[#f7f1e8] shadow-[0_5px_0_#b9a9c0]">
        <svg aria-hidden="true" viewBox="0 0 28 28" className="size-6">
          <path d="M14 3.5 16.6 11l7.5 3-7.5 2.7-2.6 7.8-2.7-7.8-7.4-2.7 7.4-3L14 3.5Z" fill="currentColor" />
          <circle cx="22.2" cy="6.4" r="1.5" fill="#ef9b70" />
        </svg>
      </div>
      <div className="leading-tight">
        <div className="font-semibold tracking-[-.04em]">MaximeGPT</div>
        <div className="mt-1 text-[10px] font-bold uppercase tracking-[.19em] text-[#756b7e]">Activity privée</div>
      </div>
    </div>
  );
}

export default function App() {
  return <Home />;
}
