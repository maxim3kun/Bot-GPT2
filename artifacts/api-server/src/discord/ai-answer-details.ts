import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type Message,
  type MessageCreateOptions,
} from "discord.js";
import type OpenAI from "openai";
import type { WebSearchResult } from "../lib/web-search.js";
import { splitAiAnswer } from "./ai-answer-format.js";
import { generateWithLengthRetry } from "./ai-completion-quality.js";
import { createReliableCompletion } from "./ai-reliable-completion.js";
import type { UserLang } from "./user-lang-store.js";

const DETAILS_TTL_MS = 5 * 60_000;
const ANSWER_DETAIL_THRESHOLD = 360;
const DETAILS_TEXT: Record<UserLang, {
  label: string; title: string; ownership: string; failed: string; request: string;
}> = {
  en: { label: "More", title: "📖 More details", ownership: "This button belongs to the person who asked the question.", failed: "I couldn't prepare the details. Please try again shortly.", request: "Add useful details missing from your previous answer without repeating it. Keep the same language and persona. Do not add claims unsupported by the supplied sources or verified calculations." },
  fr: { label: "Détails", title: "📖 Détails", ownership: "Ce bouton appartient à la personne qui a posé la question.", failed: "Je n’ai pas pu préparer les détails. Réessaie dans un instant.", request: "Ajoute les précisions utiles qui manquent à ta réponse précédente, sans la répéter. Reste dans la même langue et dans la même personnalité. N’ajoute aucune affirmation que les sources ou les calculs vérifiés ne permettent pas de confirmer." },
  es: { label: "Detalles", title: "📖 Más detalles", ownership: "Este botón pertenece a quien hizo la pregunta.", failed: "No pude preparar los detalles. Inténtalo de nuevo en un momento.", request: "Añade los detalles útiles que faltan en tu respuesta anterior, sin repetirla. Mantén el mismo idioma y la misma personalidad. No añadas afirmaciones que las fuentes o los cálculos verificados no respalden." },
  de: { label: "Details", title: "📖 Mehr Details", ownership: "Diese Schaltfläche gehört der Person, die die Frage gestellt hat.", failed: "Die Details konnten nicht vorbereitet werden. Bitte versuche es gleich noch einmal.", request: "Ergänze nützliche Einzelheiten, die in deiner vorherigen Antwort fehlen, ohne sie zu wiederholen. Behalte Sprache und Persönlichkeit bei. Füge keine Aussagen hinzu, die nicht durch Quellen oder geprüfte Berechnungen gestützt sind." },
  pt: { label: "Detalhes", title: "📖 Mais detalhes", ownership: "Este botão pertence a quem fez a pergunta.", failed: "Não consegui preparar os detalhes. Tente novamente daqui a pouco.", request: "Acrescente detalhes úteis que faltaram na resposta anterior, sem repeti-la. Mantenha o mesmo idioma e a mesma personalidade. Não inclua afirmações sem apoio nas fontes ou nos cálculos verificados." },
  it: { label: "Dettagli", title: "📖 Altri dettagli", ownership: "Questo pulsante appartiene a chi ha posto la domanda.", failed: "Non sono riuscito a preparare i dettagli. Riprova tra poco.", request: "Aggiungi dettagli utili che mancano nella risposta precedente, senza ripeterla. Mantieni la stessa lingua e personalità. Non aggiungere affermazioni non supportate dalle fonti o dai calcoli verificati." },
  ja: { label: "詳細", title: "📖 詳細", ownership: "このボタンは質問した人専用です。", failed: "詳細を準備できませんでした。しばらくしてからもう一度お試しください。", request: "前の回答を繰り返さず、不足している有用な詳細を追加してください。同じ言語と人格を保ち、情報源や検証済みの計算で裏付けられない主張は追加しないでください。" },
  nl: { label: "Details", title: "📖 Meer details", ownership: "Deze knop is bedoeld voor degene die de vraag stelde.", failed: "Ik kon de details niet voorbereiden. Probeer het zo opnieuw.", request: "Voeg nuttige details toe die in je vorige antwoord ontbreken, zonder dat antwoord te herhalen. Behoud dezelfde taal en persoonlijkheid. Voeg geen beweringen toe die niet door bronnen of gecontroleerde berekeningen worden ondersteund." },
  ru: { label: "Подробнее", title: "📖 Подробнее", ownership: "Эта кнопка доступна только автору вопроса.", failed: "Не удалось подготовить подробности. Попробуйте ещё раз позже.", request: "Добавь полезные подробности, которых не хватало в предыдущем ответе, не повторяя его. Сохрани язык и личность. Не добавляй утверждения, не подтверждённые источниками или проверенными расчётами." },
  pl: { label: "Szczegóły", title: "📖 Więcej szczegółów", ownership: "Ten przycisk jest przeznaczony dla autora pytania.", failed: "Nie udało się przygotować szczegółów. Spróbuj ponownie za chwilę.", request: "Dodaj przydatne szczegóły, których brakuje w poprzedniej odpowiedzi, ale jej nie powtarzaj. Zachowaj ten sam język i osobowość. Nie dodawaj twierdzeń bez potwierdzenia w źródłach lub sprawdzonych obliczeniach." },
  tr: { label: "Ayrıntılar", title: "📖 Daha fazla ayrıntı", ownership: "Bu düğme soruyu soran kişiye aittir.", failed: "Ayrıntılar hazırlanamadı. Lütfen biraz sonra tekrar deneyin.", request: "Önceki yanıtını tekrarlamadan eksik yararlı ayrıntıları ekle. Aynı dili ve kişiliği koru. Kaynaklar veya doğrulanmış hesaplamalarla desteklenmeyen iddialar ekleme." },
};

function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export function shouldOfferAnswerDetails(prompt: string, answer: string, hasResearchEvidence: boolean): boolean {
  const request = normalize(prompt);
  if (/\b(?:detail(?:s|ed)?|detall(?:e|es|ado|ada|ados|adas)|in depth|more complete|develop|expand|en detail|plus de detail|detaille|developpe|approfondis|explique en profondeur|amplia|profundiza|ausfuhrlich|detalhe|detalhado|dettaglio|piu completo|szczegol|detay|подроб)\b/.test(request)
    || /詳しく|詳細|подробн/.test(request)) {
    return false;
  }
  const length = answer.trim().length;
  return length >= ANSWER_DETAIL_THRESHOLD || (hasResearchEvidence && length >= 120);
}

export function buildAnswerDetailsRow(
  customId: string,
  language: UserLang,
  sourceRow?: ActionRowBuilder<ButtonBuilder> | null,
): ActionRowBuilder<ButtonBuilder> {
  const buttons = sourceRow?.components.map(component => ButtonBuilder.from(component)) ?? [];
  buttons.push(new ButtonBuilder()
    .setCustomId(customId)
    .setLabel(DETAILS_TEXT[language].label)
    .setEmoji("📖")
    .setStyle(ButtonStyle.Secondary));
  return new ActionRowBuilder<ButtonBuilder>().addComponents(buttons.slice(0, 5));
}

export function buildAnswerDetailsMessages(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  answer: string,
  language: UserLang,
  verifiedCalculations: unknown[] = [],
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const detailsRequest = DETAILS_TEXT[language].request;
  const currentTurn = messages.at(-1);
  const withCalculations = messages.map((message, index) => {
    if (!verifiedCalculations.length || index !== 0 || message.role !== "system" || typeof message.content !== "string") {
      return message;
    }
    return {
      ...message,
      content: `${message.content}\n\nVerified calculations from the previous answer; use only these checked results:\n${JSON.stringify(verifiedCalculations).slice(0, 4_000)}`,
    };
  });
  const earlierMessages = currentTurn?.role === "user" ? withCalculations.slice(0, -1) : withCalculations;
  return [
    ...earlierMessages,
    ...(currentTurn?.role === "user" ? [currentTurn] : []),
    { role: "assistant", content: answer },
    { role: "user", content: detailsRequest },
  ];
}

export async function generateAnswerDetails(options: {
  openai: OpenAI;
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  answer: string;
  language: UserLang;
  evidence: WebSearchResult[];
  verifiedCalculations?: unknown[];
  sourceRow?: ActionRowBuilder<ButtonBuilder> | null;
}): Promise<AnswerDetails> {
  const hasEvidence = options.evidence.some(result => !!result.content?.trim());
  const expanded = await generateWithLengthRetry(async tokenBudget => {
    const response = await createReliableCompletion(options.openai, {
      model: "openai/gpt-oss-120b",
      max_completion_tokens: tokenBudget,
      currentUserText: DETAILS_TEXT[options.language].request,
      messages: buildAnswerDetailsMessages(options.messages, options.answer, options.language, options.verifiedCalculations),
      ...(hasEvidence ? { evidence: options.evidence, responseLanguage: options.language } : {}),
    });
    const choice = response.choices[0];
    return {
      text: choice?.message?.content?.trim() ?? "",
      finishReason: choice?.finish_reason ?? null,
      silent: response.intentionallySilent,
    };
  });
  const text = expanded.finishReason === "length"
    ? `${expanded.text.trim()}\n\n_${options.language === "fr" ? "Réponse interrompue par la limite du modèle." : "Response interrupted by the model's limit."}_`
    : expanded.text.trim();
  return { text, sourceRow: options.sourceRow };
}

export interface AnswerDetails {
  text: string;
  sourceRow?: ActionRowBuilder<ButtonBuilder> | null;
}

export function attachAnswerDetailsCollector(
  response: Message,
  options: {
    customId: string;
    userId: string;
    language: UserLang;
    sourceRow?: ActionRowBuilder<ButtonBuilder> | null;
    generate: () => Promise<AnswerDetails>;
  },
): void {
  let cachedPayload: Pick<MessageCreateOptions, "content" | "embeds" | "components"> | undefined;
  const collector = response.createMessageComponentCollector({
    time: DETAILS_TTL_MS,
    filter: interaction => interaction.customId === options.customId,
  });
  collector.on("collect", async interaction => {
    const privateReply = interaction.inGuild();
    if (interaction.user.id !== options.userId) {
      await interaction.reply({
        content: DETAILS_TEXT[options.language].ownership,
        ephemeral: privateReply,
      });
      return;
    }
    if (cachedPayload) {
      await interaction.reply({ ...cachedPayload, ephemeral: privateReply });
      return;
    }
    await interaction.deferReply({ ephemeral: privateReply });
    try {
      const details = await options.generate();
      const chunks = splitAiAnswer(details.text.trim(), 3_800);
      if (!chunks.length) throw new Error("The detail response was empty");
      const embeds = chunks.slice(0, 10).map((chunk, index) => {
        const embed = new EmbedBuilder().setColor(0x5865f2).setDescription(chunk);
        if (index === 0) embed.setTitle(DETAILS_TEXT[options.language].title);
        return embed;
      });
      const components = details.sourceRow ? [details.sourceRow] : [];
      cachedPayload = { embeds, components };
      await interaction.editReply({ ...cachedPayload });
    } catch {
      await interaction.editReply({
        content: DETAILS_TEXT[options.language].failed,
      });
    }
  });
  collector.on("end", () => {
    void response.edit({ components: options.sourceRow ? [options.sourceRow] : [] }).catch(() => null);
  });
}
