import { randomUUID } from "node:crypto";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ButtonInteraction,
  type Message,
} from "discord.js";
import type OpenAI from "openai";
import { incrementGroqCalls } from "../lib/bot-stats.js";
import {
  buildConsentPrompt,
  getConsent,
} from "./ai-consent.js";
import { getEffectiveLanguage } from "./effective-language.js";
import { recordModuleFailureState } from "./module-technician.js";
import { USER_LANG_LABELS, isValidUserLang } from "./user-lang-store.js";
import type { Language } from "./responses.js";

const REQUEST_TTL_MS = 5 * 60_000;
const MAX_PENDING_REQUESTS = 1_000;
const MAX_TEXT_CHARACTERS = 500;
const DIRECT_TRANSLATION_TIMEOUT_MS = 8_000;
const RESULT_MAX_CHARACTERS = 1_800;

type TranslationMode = "direct" | "ai";
interface PendingTranslation {
  id: string;
  userId: string;
  target: Language;
  text: string;
  language: Language;
  expiresAt: number;
}

interface TranslationResponse {
  responseStatus?: number;
  responseData?: { translatedText?: string };
  quotaFinished?: boolean;
}

export interface TranslationDependencies {
  fetch?: typeof fetch;
  getConsent?: typeof getConsent;
  now?: () => number;
}

interface TranslationStrings {
  usage: string;
  unknownLanguage: string;
  tooLong: string;
  choose: string;
  directLabel: string;
  aiLabel: string;
  disclosure: string;
  unauthorized: string;
  expired: string;
  directWorking: string;
  aiWorking: string;
  directError: string;
  aiError: string;
  unavailable: string;
  result: string;
  truncated: string;
  genericError: string;
}

const STRINGS: Record<Language, TranslationStrings> = {
  en: {
    usage: "Usage: `!translate <language code> <text>` (for example `!translate fr Good morning`). Choose direct translation or AI reformulation afterward.",
    unknownLanguage: "That language isn't supported. Choose one of: en, fr, es, de, pt, it, ja, nl, ru, pl, tr.",
    tooLong: "Text must contain between 1 and 500 characters.",
    choose: "Choose how to translate into **{target}**.",
    directLabel: "Direct · MyMemory",
    aiLabel: "Reformulate · AI",
    disclosure: "Direct translation sends your text to **MyMemory**; AI reformulation sends it to **Groq** only after saved AI consent.",
    unauthorized: "Only the person who requested this translation can choose its result.",
    expired: "This translation choice has expired. Run the command again.",
    directWorking: "Translating with MyMemory…",
    aiWorking: "Reformulating with Groq…",
    directError: "MyMemory couldn't translate this text right now. Try again later.",
    aiError: "The AI couldn't reformulate this text right now. Your text wasn't posted as a result.",
    unavailable: "The AI service isn't configured right now.",
    result: "Translation to {target}",
    truncated: "… (result shortened)",
    genericError: "Something went wrong while finishing the translation. Please try again.",
  },
  fr: {
    usage: "Utilisation : `!traduis <code langue> <texte>` (ex. `!traduis fr Good morning`). Choisis ensuite une traduction directe ou une reformulation par IA.",
    unknownLanguage: "Cette langue n’est pas prise en charge. Choisis : en, fr, es, de, pt, it, ja, nl, ru, pl, tr.",
    tooLong: "Le texte doit contenir entre 1 et 500 caractères.",
    choose: "Choisis le résultat pour **{target}**.",
    directLabel: "Directe · MyMemory",
    aiLabel: "Reformuler · IA",
    disclosure: "La traduction directe transmet le texte à **MyMemory** ; la reformulation l’envoie à **Groq** uniquement si le consentement IA est déjà accepté.",
    unauthorized: "Seule la personne à l’origine de cette demande peut choisir le résultat.",
    expired: "Ce choix a expiré. Relance la commande.",
    directWorking: "Traduction avec MyMemory…",
    aiWorking: "Reformulation avec Groq…",
    directError: "MyMemory n’a pas pu traduire ce texte pour le moment. Réessaie plus tard.",
    aiError: "L’IA n’a pas pu reformuler ce texte pour le moment.",
    unavailable: "Le service IA n’est pas configuré pour le moment.",
    result: "Traduction vers {target}",
    truncated: "… (résultat raccourci)",
    genericError: "Une erreur a empêché de terminer la traduction. Réessaie.",
  },
  es: {
    usage: "Uso: `!translate <código de idioma> <texto>` (por ejemplo `!translate fr Good morning`). Después elige traducción directa o reformulación con IA.",
    unknownLanguage: "Ese idioma no está disponible. Elige: en, fr, es, de, pt, it, ja, nl, ru, pl, tr.",
    tooLong: "El texto debe tener entre 1 y 500 caracteres.",
    choose: "Elige el resultado en **{target}**.",
    directLabel: "Directa · MyMemory",
    aiLabel: "Reformular · IA",
    disclosure: "La traducción directa envía el texto a **MyMemory**; la reformulación lo envía a **Groq** solo con consentimiento de IA aceptado.",
    unauthorized: "Solo quien pidió esta traducción puede elegir el resultado.",
    expired: "Esta opción ha caducado. Ejecuta el comando de nuevo.",
    directWorking: "Traduciendo con MyMemory…",
    aiWorking: "Reformulando con Groq…",
    directError: "MyMemory no pudo traducir este texto ahora. Inténtalo más tarde.",
    aiError: "La IA no pudo reformular este texto ahora.",
    unavailable: "El servicio de IA no está configurado.",
    result: "Traducción al {target}",
    truncated: "… (resultado acortado)",
    genericError: "Se produjo un error al terminar la traducción. Inténtalo de nuevo.",
  },
  de: {
    usage: "Verwendung: `!translate <Sprachcode> <Text>` (zum Beispiel `!translate fr Good morning`). Danach direkte Übersetzung oder KI-Umformulierung wählen.",
    unknownLanguage: "Diese Sprache wird nicht unterstützt. Verfügbar: en, fr, es, de, pt, it, ja, nl, ru, pl, tr.",
    tooLong: "Der Text muss 1 bis 500 Zeichen lang sein.",
    choose: "Ergebnis auf **{target}** auswählen.",
    directLabel: "Direkt · MyMemory",
    aiLabel: "Umformulieren · KI",
    disclosure: "Die direkte Übersetzung sendet den Text an **MyMemory**; die KI-Umformulierung sendet ihn nur nach gespeicherter Zustimmung an **Groq**.",
    unauthorized: "Nur die Person, die diese Übersetzung angefordert hat, darf das Ergebnis auswählen.",
    expired: "Diese Auswahl ist abgelaufen. Bitte führe den Befehl erneut aus.",
    directWorking: "Übersetzung mit MyMemory…",
    aiWorking: "Umformulierung mit Groq…",
    directError: "MyMemory konnte diesen Text gerade nicht übersetzen. Bitte später erneut versuchen.",
    aiError: "Die KI konnte diesen Text gerade nicht umformulieren.",
    unavailable: "Der KI-Dienst ist derzeit nicht konfiguriert.",
    result: "Übersetzung auf {target}",
    truncated: "… (Ergebnis gekürzt)",
    genericError: "Beim Abschließen der Übersetzung ist ein Fehler aufgetreten. Bitte erneut versuchen.",
  },
  pt: {
    usage: "Uso: `!translate <código do idioma> <texto>` (por exemplo `!translate fr Good morning`). Depois escolha tradução direta ou reformulação por IA.",
    unknownLanguage: "Esse idioma não é compatível. Escolha: en, fr, es, de, pt, it, ja, nl, ru, pl, tr.",
    tooLong: "O texto deve ter entre 1 e 500 caracteres.",
    choose: "Escolha o resultado em **{target}**.",
    directLabel: "Direta · MyMemory",
    aiLabel: "Reformular · IA",
    disclosure: "A tradução direta envia o texto para **MyMemory**; a reformulação envia para **Groq** somente após o consentimento de IA.",
    unauthorized: "Somente quem solicitou esta tradução pode escolher o resultado.",
    expired: "Esta escolha expirou. Execute o comando novamente.",
    directWorking: "Traduzindo com MyMemory…",
    aiWorking: "Reformulando com Groq…",
    directError: "MyMemory não conseguiu traduzir este texto agora. Tente mais tarde.",
    aiError: "A IA não conseguiu reformular este texto agora.",
    unavailable: "O serviço de IA não está configurado.",
    result: "Tradução para {target}",
    truncated: "… (resultado abreviado)",
    genericError: "Ocorreu um erro ao concluir a tradução. Tente novamente.",
  },
  it: {
    usage: "Uso: `!translate <codice lingua> <testo>` (per esempio `!translate fr Good morning`). Poi scegli traduzione diretta o riformulazione IA.",
    unknownLanguage: "Questa lingua non è supportata. Scegli: en, fr, es, de, pt, it, ja, nl, ru, pl, tr.",
    tooLong: "Il testo deve contenere da 1 a 500 caratteri.",
    choose: "Scegli il risultato in **{target}**.",
    directLabel: "Diretta · MyMemory",
    aiLabel: "Riformula · IA",
    disclosure: "La traduzione diretta invia il testo a **MyMemory**; la riformulazione lo invia a **Groq** solo con il consenso IA già accettato.",
    unauthorized: "Solo chi ha richiesto la traduzione può scegliere il risultato.",
    expired: "Questa scelta è scaduta. Ripeti il comando.",
    directWorking: "Traduzione con MyMemory…",
    aiWorking: "Riformulazione con Groq…",
    directError: "MyMemory non è riuscito a tradurre il testo. Riprova più tardi.",
    aiError: "L’IA non è riuscita a riformulare il testo.",
    unavailable: "Il servizio IA non è configurato.",
    result: "Traduzione in {target}",
    truncated: "… (risultato abbreviato)",
    genericError: "Si è verificato un errore durante il completamento della traduzione. Riprova.",
  },
  ja: {
    usage: "使い方: `!translate <言語コード> <テキスト>` (例: `!translate fr Good morning`)。その後、直接翻訳またはAIによる言い換えを選択します。",
    unknownLanguage: "対応していない言語です: en, fr, es, de, pt, it, ja, nl, ru, pl, tr。",
    tooLong: "テキストは1～500文字で入力してください。",
    choose: "**{target}**の結果を選択してください。",
    directLabel: "直接翻訳 · MyMemory",
    aiLabel: "AIで言い換え",
    disclosure: "直接翻訳ではテキストを**MyMemory**へ送信します。AIによる言い換えでは、AI同意済みの場合のみ**Groq**へ送信します。",
    unauthorized: "この翻訳を依頼した人だけが結果を選べます。",
    expired: "選択の有効期限が切れました。コマンドをもう一度実行してください。",
    directWorking: "MyMemoryで翻訳中…",
    aiWorking: "Groqで言い換え中…",
    directError: "現在MyMemoryで翻訳できません。後でもう一度お試しください。",
    aiError: "現在AIで言い換えできません。",
    unavailable: "AIサービスは現在設定されていません。",
    result: "{target}への翻訳",
    truncated: "… (結果を短縮)",
    genericError: "翻訳の完了中にエラーが発生しました。もう一度お試しください。",
  },
  nl: {
    usage: "Gebruik: `!translate <taalcode> <tekst>` (bijvoorbeeld `!translate fr Good morning`). Kies daarna een directe vertaling of AI-herformulering.",
    unknownLanguage: "Deze taal wordt niet ondersteund. Kies: en, fr, es, de, pt, it, ja, nl, ru, pl, tr.",
    tooLong: "De tekst moet 1 tot 500 tekens bevatten.",
    choose: "Kies het resultaat in **{target}**.",
    directLabel: "Direct · MyMemory",
    aiLabel: "Herformuleren · AI",
    disclosure: "De directe vertaling stuurt tekst naar **MyMemory**; de AI-herformulering stuurt tekst alleen na opgeslagen toestemming naar **Groq**.",
    unauthorized: "Alleen degene die de vertaling aanvroeg kan het resultaat kiezen.",
    expired: "Deze keuze is verlopen. Voer de opdracht opnieuw uit.",
    directWorking: "Vertalen met MyMemory…",
    aiWorking: "Herformuleren met Groq…",
    directError: "MyMemory kon deze tekst nu niet vertalen. Probeer het later opnieuw.",
    aiError: "De AI kon deze tekst nu niet herformuleren.",
    unavailable: "De AI-service is niet ingesteld.",
    result: "Vertaling naar {target}",
    truncated: "… (resultaat ingekort)",
    genericError: "Er ging iets mis bij het afronden van de vertaling. Probeer het opnieuw.",
  },
  ru: {
    usage: "Использование: `!translate <код языка> <текст>` (например `!translate fr Good morning`). Затем выберите прямой перевод или перефразирование ИИ.",
    unknownLanguage: "Этот язык не поддерживается. Доступны: en, fr, es, de, pt, it, ja, nl, ru, pl, tr.",
    tooLong: "Текст должен содержать от 1 до 500 символов.",
    choose: "Выберите результат на **{target}**.",
    directLabel: "Перевод · MyMemory",
    aiLabel: "Перефразировать · ИИ",
    disclosure: "Прямой перевод отправляет текст в **MyMemory**; ИИ отправляет его в **Groq** только после сохранённого согласия.",
    unauthorized: "Результат может выбрать только автор запроса.",
    expired: "Выбор устарел. Запустите команду ещё раз.",
    directWorking: "Перевод через MyMemory…",
    aiWorking: "Перефразирование через Groq…",
    directError: "MyMemory сейчас не смог перевести этот текст. Попробуйте позже.",
    aiError: "ИИ сейчас не смог перефразировать этот текст.",
    unavailable: "Сервис ИИ сейчас не настроен.",
    result: "Перевод на {target}",
    truncated: "… (результат сокращён)",
    genericError: "При завершении перевода произошла ошибка. Попробуйте ещё раз.",
  },
  pl: {
    usage: "Użycie: `!translate <kod języka> <tekst>` (np. `!translate fr Good morning`). Następnie wybierz tłumaczenie bezpośrednie lub parafrazę AI.",
    unknownLanguage: "Ten język nie jest obsługiwany. Wybierz: en, fr, es, de, pt, it, ja, nl, ru, pl, tr.",
    tooLong: "Tekst musi zawierać od 1 do 500 znaków.",
    choose: "Wybierz wynik w języku **{target}**.",
    directLabel: "Bezpośrednie · MyMemory",
    aiLabel: "Parafrazuj · AI",
    disclosure: "Tłumaczenie bezpośrednie wysyła tekst do **MyMemory**; parafraza AI wysyła go do **Groq** tylko po zapisanej zgodzie.",
    unauthorized: "Wynik może wybrać tylko osoba, która poprosiła o tłumaczenie.",
    expired: "Ta opcja wygasła. Uruchom polecenie ponownie.",
    directWorking: "Tłumaczenie przez MyMemory…",
    aiWorking: "Parafrazowanie przez Groq…",
    directError: "MyMemory nie może teraz przetłumaczyć tego tekstu. Spróbuj później.",
    aiError: "AI nie może teraz sparafrazować tego tekstu.",
    unavailable: "Usługa AI nie jest obecnie skonfigurowana.",
    result: "Tłumaczenie na {target}",
    truncated: "… (wynik skrócony)",
    genericError: "Wystąpił błąd podczas kończenia tłumaczenia. Spróbuj ponownie.",
  },
  tr: {
    usage: "Kullanım: `!translate <dil kodu> <metin>` (ör. `!translate fr Good morning`). Ardından doğrudan çeviri veya yapay zekâ ile yeniden yazma seç.",
    unknownLanguage: "Bu dil desteklenmiyor. Şunlardan birini seç: en, fr, es, de, pt, it, ja, nl, ru, pl, tr.",
    tooLong: "Metin 1 ile 500 karakter arasında olmalı.",
    choose: "**{target}** sonucunu seç.",
    directLabel: "Doğrudan · MyMemory",
    aiLabel: "Yapay zekâ ile yeniden yaz",
    disclosure: "Doğrudan çeviri metni **MyMemory**'ye gönderir; yapay zekâ ile yeniden yazma, yalnızca kayıtlı onaydan sonra **Groq**'a gönderir.",
    unauthorized: "Bu çeviri sonucunu yalnızca isteği yapan kişi seçebilir.",
    expired: "Bu seçim sona erdi. Komutu yeniden çalıştır.",
    directWorking: "MyMemory ile çevriliyor…",
    aiWorking: "Groq ile yeniden yazılıyor…",
    directError: "MyMemory şu anda bu metni çeviremedi. Daha sonra tekrar dene.",
    aiError: "Yapay zekâ şu anda bu metni yeniden yazamadı.",
    unavailable: "Yapay zekâ hizmeti şu anda yapılandırılmamış.",
    result: "{target} diline çeviri",
    truncated: "… (sonuç kısaltıldı)",
    genericError: "Çeviri tamamlanırken bir hata oluştu. Tekrar dene.",
  },
};

const pending = new Map<string, PendingTranslation>();
const fill = (text: string, value: string) => text.replace("{target}", value);

export function isTranslationCommand(command: string | undefined): boolean {
  return ["translate", "traduis", "traduction"].includes(command ?? "");
}

export function pendingTranslationCount(): number {
  return pending.size;
}

export function translationInteractionError(language: Language): string {
  return STRINGS[language].genericError;
}

export async function translateWithMyMemory(
  text: string,
  target: Language,
  fetcher: typeof fetch = fetch,
): Promise<string> {
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text);
  url.searchParams.set("langpair", `autodetect|${target}`);
  const response = await fetcher(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(DIRECT_TRANSLATION_TIMEOUT_MS),
    redirect: "error",
  });
  if (!response.ok) throw new Error("MyMemory HTTP failure");
  const data = await response.json() as TranslationResponse;
  const translated = data.responseData?.translatedText?.trim();
  if (data.responseStatus !== 200 || data.quotaFinished || !translated) {
    throw new Error("MyMemory returned no translation");
  }
  return translated.slice(0, 4_000);
}

function createRequestId(): string {
  const now = Date.now();
  for (const [id, request] of pending) if (request.expiresAt <= now) pending.delete(id);
  while (pending.size >= MAX_PENDING_REQUESTS) pending.delete(pending.keys().next().value!);
  return randomUUID().replaceAll("-", "").slice(0, 20);
}

export async function handleTranslationCommand(
  message: Message,
  command: string | undefined,
  args: string[],
  language: Language,
): Promise<boolean> {
  if (!isTranslationCommand(command)) return false;
  const targetCode = args[0]?.toLowerCase();
  const text = args.slice(1).join(" ").trim();
  if (!targetCode || !text) {
    await message.reply(STRINGS[language].usage);
    return true;
  }
  if (!isValidUserLang(targetCode)) {
    await message.reply(STRINGS[language].unknownLanguage);
    return true;
  }
  if (text.length > MAX_TEXT_CHARACTERS) {
    await message.reply(STRINGS[language].tooLong);
    return true;
  }

  const id = createRequestId();
  const target = targetCode;
  pending.set(id, {
    id,
    userId: message.author.id,
    target,
    text,
    language,
    expiresAt: Date.now() + REQUEST_TTL_MS,
  });
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`translate:${id}:direct`).setLabel(STRINGS[language].directLabel).setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`translate:${id}:ai`).setLabel(STRINGS[language].aiLabel).setStyle(ButtonStyle.Secondary),
  );
  await message.reply({
    content: `${fill(STRINGS[language].choose, USER_LANG_LABELS[target])}\n${STRINGS[language].disclosure}`,
    components: [row],
    allowedMentions: { parse: [] },
  });
  return true;
}

export async function handleTranslationButton(
  interaction: ButtonInteraction,
  openai: OpenAI | null,
  dependencies: TranslationDependencies = {},
): Promise<void> {
  const [, id, rawMode] = interaction.customId.split(":");
  const mode = rawMode as TranslationMode;
  const request = pending.get(id ?? "");
  if (request && interaction.user.id !== request.userId) {
    await interaction.reply({ content: STRINGS[request.language].unauthorized, ephemeral: true });
    return;
  }
  if (!request || request.expiresAt <= (dependencies.now?.() ?? Date.now()) || !["direct", "ai"].includes(mode)) {
    pending.delete(id ?? "");
    const language = request?.language ?? getEffectiveLanguage(interaction.guildId, interaction.user.id);
    await interaction.reply({ content: STRINGS[language].expired, ephemeral: true });
    return;
  }
  if (mode === "ai") {
    if (!openai) {
      pending.delete(request.id);
      await interaction.update({ content: STRINGS[request.language].unavailable, components: [], allowedMentions: { parse: [] } });
      return;
    }
    const consent = await (dependencies.getConsent ?? getConsent)(interaction.user.id);
    if (consent === "declined") {
      await interaction.deferUpdate();
      return;
    }
    if (consent !== "accepted") {
      pending.delete(request.id);
      await interaction.reply({
        ...buildConsentPrompt(request.language),
        ephemeral: true,
      });
      return;
    }
  }

  pending.delete(request.id);
  const strings = STRINGS[request.language];
  await interaction.update({
    content: mode === "direct" ? strings.directWorking : strings.aiWorking,
    components: [],
    embeds: [],
    allowedMentions: { parse: [] },
  });

  try {
    const translated = mode === "direct"
      ? await translateWithMyMemory(request.text, request.target, dependencies.fetch)
      : await (async () => {
        const response = await openai!.chat.completions.create({
          model: "openai/gpt-oss-20b",
          max_completion_tokens: 700,
          messages: [
            {
              role: "system",
              content: `Translate and naturally reformulate the user's text into ${USER_LANG_LABELS[request.target]}. Preserve its meaning and tone, do not add facts or commentary, and return only the result.`,
            },
            { role: "user", content: request.text },
          ],
        });
        incrementGroqCalls();
        const result = response.choices[0]?.message?.content?.trim();
        if (!result) throw new Error("Groq returned no translation");
        return result;
      })();
    const shortened = translated.length > RESULT_MAX_CHARACTERS;
    const result = translated.slice(0, RESULT_MAX_CHARACTERS);
    await interaction.editReply({
      content: `🔤 **${fill(strings.result, USER_LANG_LABELS[request.target])}**\n${result}${shortened ? `\n${strings.truncated}` : ""}`,
      allowedMentions: { parse: [] },
    });
  } catch (error) {
    if (mode === "ai") recordModuleFailureState("ai", new Error("Groq translation failed"), "groq");
    else recordModuleFailureState("other", new Error("MyMemory translation failed"));
    await interaction.editReply(mode === "direct" ? strings.directError : strings.aiError).catch(() => null);
    void error;
  }
}
