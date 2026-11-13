import type { Message } from "discord.js";
import type { Language } from "./responses.js";
import { isSendable } from "./message-utils.js";

export const HANGMAN_MAX_ERRORS = 6;
export const HANGMAN_IDLE_TTL_MS = 10 * 60 * 1000;

const WORDS: Record<Language, string[]> = {
  en: ["apple", "bridge", "castle", "forest", "planet", "puzzle", "window", "yellow"],
  fr: ["école", "château", "étoile", "forêt", "fromage", "jardin", "nuage", "vélo"],
  es: ["árbol", "canción", "escuela", "familia", "guitarra", "niño", "pájaro", "ventana"],
  de: ["apfel", "brücke", "fenster", "garten", "insel", "kuchen", "schlüssel", "zug"],
  pt: ["árvore", "avião", "coração", "escola", "janela", "livro", "pássaro", "violão"],
  it: ["albero", "canzone", "finestra", "giardino", "isola", "libro", "nuvola", "zucchero"],
  ja: ["さくら", "ねこ", "りんご", "くるま", "うみ", "はな", "でんしゃ", "ほし"],
  nl: ["appel", "bloem", "fiets", "gebouw", "regen", "sleutel", "tuin", "vliegtuig"],
  ru: ["арбуз", "берёза", "город", "звезда", "книга", "корабль", "солнце", "яблоко"],
  pl: ["jabłko", "książka", "morze", "ogród", "pociąg", "słońce", "zegar", "żółw"],
  tr: ["araba", "çiçek", "kitap", "okul", "orman", "pencere", "şehir", "yıldız"],
};

const LOCALES: Record<Language, string> = {
  en: "en", fr: "fr", es: "es", de: "de", pt: "pt", it: "it",
  ja: "ja", nl: "nl", ru: "ru", pl: "pl", tr: "tr",
};

export interface HangmanScope {
  guildId: string | null;
  channelId: string;
  userId: string;
}

export interface HangmanView {
  maskedWord: string;
  guessedLetters: string[];
  wrongGuesses: number;
  remainingErrors: number;
  outcome: "active" | "won" | "lost" | "expired" | "stopped";
  word?: string;
}

export type HangmanResultKind =
  | "started" | "shown" | "missing" | "invalid" | "repeated"
  | "correct" | "wrong" | "won" | "lost" | "stopped" | "expired";

export interface HangmanResult {
  kind: HangmanResultKind;
  state?: HangmanView;
  replaced?: boolean;
}

interface HangmanSession {
  scopeKey: string;
  language: Language;
  word: string;
  guesses: Map<string, string>;
  wrongGuesses: number;
  expiresAt: number;
  onExpire?: (view: HangmanView) => void;
}

export function normalizeHangmanLetter(input: string, language: Language): string | null {
  const graphemes = Array.from(input.trim().normalize("NFC"));
  if (graphemes.length !== 1 || !/^\p{L}$/u.test(graphemes[0]!)) return null;
  const lower = graphemes[0]!.toLocaleLowerCase(LOCALES[language]);
  // Spanish ñ and Turkish ı are distinct letters, not accented variants of n/i.
  if ((language === "es" && lower === "ñ") || (language === "tr" && lower === "ı")) return lower;
  return lower.normalize("NFD").replace(/\p{M}/gu, "");
}

function keyFor(scope: HangmanScope): string {
  return `${scope.guildId ?? "dm"}:${scope.channelId}:${scope.userId}`;
}

function viewFor(session: HangmanSession, revealWord = false, outcome: HangmanView["outcome"] = "active"): HangmanView {
  const locale = LOCALES[session.language];
  const maskedWord = Array.from(session.word)
    .map((letter) => {
      const normalized = normalizeHangmanLetter(letter, session.language);
      return normalized && session.guesses.has(normalized) ? letter.toLocaleUpperCase(locale) : "_";
    })
    .join(" ");
  return {
    maskedWord,
    guessedLetters: [...session.guesses.values()],
    wrongGuesses: session.wrongGuesses,
    remainingErrors: HANGMAN_MAX_ERRORS - session.wrongGuesses,
    outcome,
    ...(revealWord ? { word: session.word } : {}),
  };
}

export function createHangmanManager(options: {
  now?: () => number;
  random?: () => number;
  ttlMs?: number;
} = {}) {
  const now = options.now ?? Date.now;
  const random = options.random ?? Math.random;
  const ttlMs = options.ttlMs ?? HANGMAN_IDLE_TTL_MS;
  const sessions = new Map<string, HangmanSession>();

  function expire(at = now()): HangmanView[] {
    const expired: HangmanView[] = [];
    for (const [key, session] of sessions) {
      if (session.expiresAt > at) continue;
      sessions.delete(key);
      const view = viewFor(session, true, "expired");
      expired.push(view);
      try { session.onExpire?.(view); } catch { /* a notice failure must not keep a game alive */ }
    }
    return expired;
  }

  function current(scope: HangmanScope): HangmanView | null {
    expire();
    const session = sessions.get(keyFor(scope));
    return session ? viewFor(session) : null;
  }

  function start(
    scope: HangmanScope,
    language: Language,
    onExpire?: (view: HangmanView) => void,
  ): HangmanResult {
    expire();
    const scopeKey = keyFor(scope);
    const replaced = sessions.has(scopeKey);
    const words = WORDS[language];
    const choice = Math.max(0, Math.min(words.length - 1, Math.floor(random() * words.length)));
    const session: HangmanSession = {
      scopeKey,
      language,
      word: words[choice]!,
      guesses: new Map(),
      wrongGuesses: 0,
      expiresAt: now() + ttlMs,
      onExpire,
    };
    sessions.set(scopeKey, session);
    return { kind: "started", state: viewFor(session), replaced };
  }

  function guess(scope: HangmanScope, input: string): HangmanResult {
    expire();
    const session = sessions.get(keyFor(scope));
    if (!session) return { kind: "missing" };
    const letter = normalizeHangmanLetter(input, session.language);
    if (!letter) return { kind: "invalid", state: viewFor(session) };
    if (session.guesses.has(letter)) {
      session.expiresAt = now() + ttlMs;
      return { kind: "repeated", state: viewFor(session) };
    }

    session.guesses.set(letter, input.trim().normalize("NFC").toLocaleUpperCase(LOCALES[session.language]));
    session.expiresAt = now() + ttlMs;
    const occurs = Array.from(session.word)
      .some((character) => normalizeHangmanLetter(character, session.language) === letter);

    if (!occurs) session.wrongGuesses += 1;
    const won = Array.from(session.word)
      .every((character) => session.guesses.has(normalizeHangmanLetter(character, session.language)!));
    if (won) {
      sessions.delete(session.scopeKey);
      return { kind: "won", state: viewFor(session, true, "won") };
    }
    if (session.wrongGuesses >= HANGMAN_MAX_ERRORS) {
      sessions.delete(session.scopeKey);
      return { kind: "lost", state: viewFor(session, true, "lost") };
    }
    return { kind: occurs ? "correct" : "wrong", state: viewFor(session) };
  }

  function stop(scope: HangmanScope): HangmanResult {
    expire();
    const scopeKey = keyFor(scope);
    const session = sessions.get(scopeKey);
    if (!session) return { kind: "missing" };
    sessions.delete(scopeKey);
    return { kind: "stopped", state: viewFor(session, true, "stopped") };
  }

  return {
    current,
    start,
    guess,
    stop,
    expire,
    get size() { return sessions.size; },
  };
}

export const hangmanManager = createHangmanManager();
const cleanupTimer = setInterval(() => hangmanManager.expire(), 30_000);
cleanupTimer.unref();

const TEXT: Record<"en" | "fr", {
  title: string; start: string; restarted: string; word: string; errors: string; remaining: string;
  guessed: string; hint: string; good: string; bad: string; repeated: string; invalid: string;
  missing: string; won: string; lost: string; stopped: string; expired: string; noLetters: string;
}> = {
  en: {
    title: "Hangman",
    start: "A new word. Guess one letter at a time.",
    restarted: "Your previous game was reset.",
    word: "Word",
    errors: "Errors",
    remaining: "left",
    guessed: "Tried",
    hint: "Guess with {prefix}{command} <letter>. Use {prefix}{command} stop to quit.",
    good: "Good guess!",
    bad: "That letter is not in the word.",
    repeated: "You already tried that letter; no error was added.",
    invalid: "Enter one letter only.",
    missing: "You don't have an active game. Start one with {prefix}{command}.",
    won: "You won! The word was",
    lost: "Game over. The word was",
    stopped: "Game abandoned. The word was",
    expired: "Game expired after 10 minutes without activity. The word was",
    noLetters: "—",
  },
  fr: {
    title: "Pendu",
    start: "Un nouveau mot. Propose une lettre à la fois.",
    restarted: "Ta partie précédente a été relancée.",
    word: "Mot",
    errors: "Erreurs",
    remaining: "restantes",
    guessed: "Lettres proposées",
    hint: "Propose une lettre avec {prefix}{command} <lettre>. Utilise {prefix}{command} stop pour abandonner.",
    good: "Bonne lettre !",
    bad: "Cette lettre n’est pas dans le mot.",
    repeated: "Tu as déjà proposé cette lettre ; aucune erreur n’est ajoutée.",
    invalid: "Saisis une seule lettre.",
    missing: "Tu n’as pas de partie en cours. Lance-en une avec {prefix}{command}.",
    won: "Gagné ! Le mot était",
    lost: "Perdu ! Le mot était",
    stopped: "Partie abandonnée. Le mot était",
    expired: "Partie expirée après 10 minutes sans activité. Le mot était",
    noLetters: "—",
  },
};

function gameText(language: Language) {
  return TEXT[language === "fr" ? "fr" : "en"];
}

function hangmanDrawing(errors: number): string {
  const stages = [
    ["  +---+", "  |   |", "      |", "      |", "      |", "========="],
    ["  +---+", "  |   |", "  O   |", "      |", "      |", "========="],
    ["  +---+", "  |   |", "  O   |", "  |   |", "      |", "========="],
    ["  +---+", "  |   |", "  O   |", " /|   |", "      |", "========="],
    ["  +---+", "  |   |", "  O   |", " /|\\  |", "      |", "========="],
    ["  +---+", "  |   |", "  O   |", " /|\\  |", " /    |", "========="],
    ["  +---+", "  |   |", "  O   |", " /|\\  |", " / \\  |", "========="],
  ];
  return stages[Math.max(0, Math.min(HANGMAN_MAX_ERRORS, errors))]!.join("\n");
}

export function formatHangmanMessage(
  result: HangmanResult,
  language: Language,
  prefix = "!",
  command = language === "fr" ? "pendu" : "hangman",
): string {
  const text = gameText(language);
  const fill = (value: string) => value.replaceAll("{prefix}", prefix).replaceAll("{command}", command);
  if (result.kind === "missing") return `❓ ${fill(text.missing)}`;
  if (result.kind === "invalid") return `✍️ ${text.invalid}`;
  if (result.kind === "repeated") return `🔁 ${text.repeated}\n${formatHangmanMessage({ kind: "shown", state: result.state }, language, prefix, command)}`;
  const state = result.state;
  if (!state) return `❓ ${fill(text.missing)}`;

  let status = "";
  if (result.kind === "started") status = `${result.replaced ? `${text.restarted} ` : ""}${text.start}`;
  if (result.kind === "shown") status = "";
  if (result.kind === "correct") status = `✅ ${text.good}`;
  if (result.kind === "wrong") status = `❌ ${text.bad}`;
  if (result.kind === "won") status = `🎉 **${text.won} \`${state.word}\`**`;
  if (result.kind === "lost") status = `💥 **${text.lost} \`${state.word}\`**`;
  if (result.kind === "stopped") status = `🏳️ ${text.stopped} \`${state.word}\`.`;
  if (result.kind === "expired") status = `⏰ ${text.expired} \`${state.word}\`.`;

  const body = [
    `🪢 **${text.title}**`,
    `\`${hangmanDrawing(state.wrongGuesses)}\``,
    `**${text.word} :** \`${state.maskedWord}\``,
    `**${text.errors} :** ${state.wrongGuesses}/${HANGMAN_MAX_ERRORS} · ${state.remainingErrors} ${text.remaining}`,
    `**${text.guessed} :** ${state.guessedLetters.length ? state.guessedLetters.join(", ") : text.noLetters}`,
  ].join("\n");
  const hint = state.outcome === "active" ? `\n${fill(text.hint)}` : "";
  return `${status ? `${status}\n` : ""}${body}${hint}`;
}

export async function handleHangmanCommand(
  message: Message,
  args: string[],
  language: Language,
  prefix = "!",
  command = language === "fr" ? "pendu" : "hangman",
): Promise<void> {
  const scope: HangmanScope = {
    guildId: message.guildId,
    channelId: message.channelId,
    userId: message.author.id,
  };
  const subcommand = args[0]?.trim().toLocaleLowerCase(LOCALES[language]);
  const isStop = ["stop", "cancel", "abandon", "abandonner"].includes(subcommand ?? "");

  if (isStop) {
    await message.reply(formatHangmanMessage(hangmanManager.stop(scope), language, prefix, command));
    return;
  }

  if (!args.length || ["start", "new", "nouveau", "nouvelle", "demarrer", "démarrer"].includes(subcommand ?? "")) {
    if (!args.length) {
      const current = hangmanManager.current(scope);
      if (current) {
        await message.reply(formatHangmanMessage({ kind: "shown", state: current }, language, prefix, command));
        return;
      }
    }
    const replaced = hangmanManager.current(scope) !== null;
    const result = hangmanManager.start(scope, language, (state) => {
      if (!isSendable(message.channel)) return;
      void message.channel.send(formatHangmanMessage({ kind: "expired", state }, language, prefix, command)).catch(() => null);
    });
    result.replaced = replaced;
    await message.reply(formatHangmanMessage(result, language, prefix, command));
    return;
  }

  if (["status", "etat", "état"].includes(subcommand ?? "")) {
    const state = hangmanManager.current(scope);
    await message.reply(formatHangmanMessage(state ? { kind: "shown", state } : { kind: "missing" }, language, prefix, command));
    return;
  }

  const result = hangmanManager.guess(scope, args.join(" "));
  await message.reply(formatHangmanMessage(result, language, prefix, command));
}
