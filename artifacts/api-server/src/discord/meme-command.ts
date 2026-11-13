import {
  AttachmentBuilder,
  PermissionFlagsBits,
  type Attachment,
  type Message,
} from "discord.js";
import sharp from "sharp";
import { isSendable } from "./message-utils.js";
import type { Language } from "./responses.js";

const MAX_INPUT_BYTES = 8 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 16_000_000;
const OUTPUT_WIDTH = 1200;
const OUTPUT_HEIGHT = 900;
const IMAGE_HOSTS = new Set([
  "cdn.discordapp.com",
  "media.discordapp.com",
  "cdn.discordapp.net",
  "media.discordapp.net",
]);
const TEMPLATE_COLORS = {
  classic: ["#493fbd", "#172d56", "#e97c74"],
  duo: ["#bfe8ec", "#f4b77a", "#d95143"],
  night: ["#10172b", "#384086", "#2d2054"],
} as const;

interface MemeStrings {
  usage: string;
  badCaption: string;
  badTemplate: string;
  tooLarge: string;
  invalidImage: string;
  unauthorizedImage: string;
  noPermission: string;
  created: string;
  failed: string;
}

const STRINGS: Record<Language, MemeStrings> = {
  en: {
    usage: "Use `!meme <top text> | <bottom text>` with an image you own or may edit, or use `!meme template <classic|duo|night> <top> | <bottom>`. Without an image, the classic original template is used.",
    badCaption: "Add both captions separated by `|` (maximum 80 characters each).",
    badTemplate: "Choose a template: `classic`, `duo` or `night`.",
    tooLarge: "That image or the generated file is too large. Use an image under 8 MB.",
    invalidImage: "I can only use a static PNG, JPEG or WebP image from Discord.",
    unauthorizedImage: "Upload only an image you own or are authorized to edit.",
    noPermission: "I need permission to attach files in this channel.",
    created: "Your meme is ready. Review it before sharing.",
    failed: "I couldn't create that meme. Check the image and captions, then try again.",
  },
  fr: {
    usage: "Utilise `!meme <texte haut> | <texte bas>` avec une image que tu possèdes ou peux modifier, ou `!meme template <classique|duo|nuit> <haut> | <bas>`. Sans image, un modèle original est utilisé.",
    badCaption: "Ajoute les deux textes séparés par `|` (80 caractères maximum chacun).",
    badTemplate: "Choisis un modèle : `classique`, `duo` ou `nuit`.",
    tooLarge: "L’image ou le fichier créé est trop volumineux. Utilise une image de moins de 8 Mo.",
    invalidImage: "Je peux utiliser uniquement une image statique PNG, JPEG ou WebP jointe sur Discord.",
    unauthorizedImage: "N’envoie qu’une image que tu possèdes ou que tu es autorisé à modifier.",
    noPermission: "Il me faut la permission de joindre des fichiers dans ce salon.",
    created: "Ton mème est prêt. Vérifie-le avant de le partager.",
    failed: "Je n’ai pas pu créer ce mème. Vérifie l’image et les textes, puis réessaie.",
  },
  es: {
    usage: "Usa `!meme <texto arriba> | <texto abajo>` con una imagen propia o autorizada, o `!meme template <classic|duo|night> <arriba> | <abajo>`. Sin imagen se usa una plantilla original.",
    badCaption: "Añade ambos textos separados por `|` (máximo 80 caracteres cada uno).",
    badTemplate: "Elige una plantilla: `classic`, `duo` o `night`.",
    tooLarge: "La imagen o el archivo es demasiado grande. Usa una imagen de menos de 8 MB.",
    invalidImage: "Solo puedo usar una imagen estática PNG, JPEG o WebP adjunta en Discord.",
    unauthorizedImage: "Sube solo imágenes propias o que tengas permiso para editar.",
    noPermission: "Necesito permiso para adjuntar archivos en este canal.",
    created: "Tu meme está listo. Revísalo antes de compartirlo.",
    failed: "No pude crear el meme. Comprueba la imagen y los textos e inténtalo de nuevo.",
  },
  de: {
    usage: "Nutze `!meme <Text oben> | <Text unten>` mit einem eigenen oder zur Bearbeitung freigegebenen Bild oder `!meme template <classic|duo|night> <oben> | <unten>`. Ohne Bild wird eine eigene Vorlage genutzt.",
    badCaption: "Gib beide Texte mit `|` getrennt ein (höchstens 80 Zeichen pro Text).",
    badTemplate: "Wähle eine Vorlage: `classic`, `duo` oder `night`.",
    tooLarge: "Das Bild oder die Datei ist zu groß. Verwende ein Bild unter 8 MB.",
    invalidImage: "Ich kann nur statische PNG-, JPEG- oder WebP-Bilder aus Discord verwenden.",
    unauthorizedImage: "Lade nur ein eigenes oder zur Bearbeitung freigegebenes Bild hoch.",
    noPermission: "Ich benötige in diesem Kanal die Berechtigung, Dateien anzuhängen.",
    created: "Dein Meme ist fertig. Prüfe es vor dem Teilen.",
    failed: "Das Meme konnte nicht erstellt werden. Prüfe Bild und Texte und versuche es erneut.",
  },
  pt: {
    usage: "Use `!meme <texto acima> | <texto abaixo>` com uma imagem própria ou autorizada, ou `!meme template <classic|duo|night> <acima> | <abaixo>`. Sem imagem, é usado um modelo original.",
    badCaption: "Adicione os dois textos separados por `|` (máximo de 80 caracteres cada).",
    badTemplate: "Escolha um modelo: `classic`, `duo` ou `night`.",
    tooLarge: "A imagem ou o arquivo é grande demais. Use uma imagem com menos de 8 MB.",
    invalidImage: "Só posso usar uma imagem estática PNG, JPEG ou WebP anexada no Discord.",
    unauthorizedImage: "Envie apenas uma imagem própria ou autorizada para edição.",
    noPermission: "Preciso de permissão para anexar arquivos neste canal.",
    created: "Seu meme está pronto. Revise antes de compartilhar.",
    failed: "Não consegui criar o meme. Verifique a imagem e os textos e tente novamente.",
  },
  it: {
    usage: "Usa `!meme <testo sopra> | <testo sotto>` con un'immagine tua o autorizzata, oppure `!meme template <classic|duo|night> <sopra> | <sotto>`. Senza immagine viene usato un modello originale.",
    badCaption: "Inserisci entrambi i testi separati da `|` (massimo 80 caratteri ciascuno).",
    badTemplate: "Scegli un modello: `classic`, `duo` o `night`.",
    tooLarge: "L'immagine o il file è troppo grande. Usa un'immagine sotto gli 8 MB.",
    invalidImage: "Posso usare solo immagini statiche PNG, JPEG o WebP allegate su Discord.",
    unauthorizedImage: "Carica solo un'immagine tua o che sei autorizzato a modificare.",
    noPermission: "Mi serve il permesso di allegare file in questo canale.",
    created: "Il tuo meme è pronto. Controllalo prima di condividerlo.",
    failed: "Non sono riuscito a creare il meme. Controlla immagine e testi e riprova.",
  },
  ja: {
    usage: "自分で所有または編集許可のある画像と `!meme <上の文> | <下の文>` を使うか、`!meme template <classic|duo|night> <上> | <下>` を使ってください。画像がない場合はオリジナルテンプレートを使用します。",
    badCaption: "両方の文を `|` で区切って入力してください (各80文字まで)。",
    badTemplate: "テンプレートは `classic`、`duo`、`night` から選択してください。",
    tooLarge: "画像または生成ファイルが大きすぎます。8 MB未満の画像を使ってください。",
    invalidImage: "Discordに添付された静止PNG、JPEG、WebP画像のみ使えます。",
    unauthorizedImage: "所有または編集許可のある画像だけをアップロードしてください。",
    noPermission: "このチャンネルでファイルを添付する権限が必要です。",
    created: "ミームができました。共有する前に確認してください。",
    failed: "ミームを作成できませんでした。画像と文章を確認して再試行してください。",
  },
  nl: {
    usage: "Gebruik `!meme <tekst boven> | <tekst onder>` met een eigen of toegestaan beeld, of `!meme template <classic|duo|night> <boven> | <onder>`. Zonder afbeelding wordt een originele sjabloon gebruikt.",
    badCaption: "Voeg beide teksten toe, gescheiden door `|` (maximaal 80 tekens elk).",
    badTemplate: "Kies een sjabloon: `classic`, `duo` of `night`.",
    tooLarge: "De afbeelding of het bestand is te groot. Gebruik een afbeelding kleiner dan 8 MB.",
    invalidImage: "Ik kan alleen statische PNG-, JPEG- of WebP-afbeeldingen uit Discord gebruiken.",
    unauthorizedImage: "Upload alleen een afbeelding die je bezit of mag bewerken.",
    noPermission: "Ik heb toestemming nodig om bestanden in dit kanaal bij te voegen.",
    created: "Je meme is klaar. Controleer hem voordat je hem deelt.",
    failed: "Ik kon de meme niet maken. Controleer de afbeelding en teksten en probeer opnieuw.",
  },
  ru: {
    usage: "Используй `!meme <текст сверху> | <текст снизу>` со своим изображением или изображением, которое разрешено редактировать, либо `!meme template <classic|duo|night> <верх> | <низ>`. Без изображения используется оригинальный шаблон.",
    badCaption: "Добавь обе подписи через `|` (до 80 символов каждая).",
    badTemplate: "Выбери шаблон: `classic`, `duo` или `night`.",
    tooLarge: "Изображение или файл слишком большой. Нужна картинка меньше 8 МБ.",
    invalidImage: "Можно использовать только статичное изображение PNG, JPEG или WebP из Discord.",
    unauthorizedImage: "Загружай только свои изображения или те, которые разрешено редактировать.",
    noPermission: "Мне нужно разрешение прикреплять файлы в этом канале.",
    created: "Мем готов. Проверь его перед отправкой.",
    failed: "Не удалось создать мем. Проверь изображение и подписи и попробуй снова.",
  },
  pl: {
    usage: "Użyj `!meme <tekst u góry> | <tekst na dole>` z własnym lub dozwolonym obrazem albo `!meme template <classic|duo|night> <góra> | <dół>`. Bez obrazu używany jest oryginalny szablon.",
    badCaption: "Dodaj oba teksty rozdzielone `|` (maksymalnie 80 znaków każdy).",
    badTemplate: "Wybierz szablon: `classic`, `duo` lub `night`.",
    tooLarge: "Obraz lub plik jest za duży. Użyj obrazu poniżej 8 MB.",
    invalidImage: "Mogę użyć tylko statycznych obrazów PNG, JPEG lub WebP z Discorda.",
    unauthorizedImage: "Prześlij tylko własny obraz lub taki, który możesz edytować.",
    noPermission: "Potrzebuję uprawnienia do załączania plików na tym kanale.",
    created: "Twój mem jest gotowy. Sprawdź go przed udostępnieniem.",
    failed: "Nie udało się utworzyć mema. Sprawdź obraz i teksty, a potem spróbuj ponownie.",
  },
  tr: {
    usage: "Kendi veya düzenleme iznin olan bir resimle `!meme <üst metin> | <alt metin>` kullan ya da `!meme template <classic|duo|night> <üst> | <alt>` yaz. Resim yoksa özgün bir şablon kullanılır.",
    badCaption: "Her biri en fazla 80 karakter olan iki metni `|` ile ayır.",
    badTemplate: "`classic`, `duo` veya `night` şablonlarından birini seç.",
    tooLarge: "Resim veya dosya çok büyük. 8 MB'tan küçük bir resim kullan.",
    invalidImage: "Yalnızca Discord'dan statik PNG, JPEG veya WebP resimleri kullanılabilir.",
    unauthorizedImage: "Yalnızca sana ait veya düzenleme iznin olan resimleri yükle.",
    noPermission: "Bu kanala dosya eklemek için izne ihtiyacım var.",
    created: "Meme hazır. Paylaşmadan önce kontrol et.",
    failed: "Meme oluşturulamadı. Resmi ve metinleri kontrol edip tekrar dene.",
  },
};

export function isMemeCommand(command: string | undefined): boolean {
  return command === "meme" || command === "mème";
}

function escapeXml(text: string): string {
  return text.replace(/[<>&"']/g, (character) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;", "'": "&apos;",
  })[character]!);
}

function wrapCaption(input: string): string[] {
  const words = input.split(/\s+/).filter(Boolean).flatMap((word) => {
    const characters = Array.from(word);
    const parts: string[] = [];
    while (characters.length > 27) parts.push(characters.splice(0, 27).join(""));
    if (characters.length) parts.push(characters.join(""));
    return parts;
  });
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (!current) current = word;
    else if (`${current} ${word}`.length <= 27) current += ` ${word}`;
    else { lines.push(current); current = word; }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3).map((line, index, all) =>
    index === all.length - 1 && lines.length > 3 ? `${line.slice(0, 24)}…` : line);
}

function backgroundTemplate(theme: keyof typeof TEMPLATE_COLORS): Buffer {
  const [primary, secondary, accent] = TEMPLATE_COLORS[theme];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${OUTPUT_WIDTH}" height="${OUTPUT_HEIGHT}" viewBox="0 0 ${OUTPUT_WIDTH} ${OUTPUT_HEIGHT}">
    <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${primary}"/><stop offset="1" stop-color="${secondary}"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <circle cx="1020" cy="170" r="210" fill="${accent}" opacity=".42"/>
    <circle cx="150" cy="830" r="280" fill="${accent}" opacity=".28"/>
    <path d="M0 590 C240 420 420 820 670 600 S1020 430 1200 610 V900 H0Z" fill="#101827" opacity=".25"/>
    <rect x="28" y="28" width="1144" height="844" rx="36" fill="none" stroke="#FFFFFF" stroke-opacity=".42" stroke-width="4"/>
  </svg>`;
  return Buffer.from(svg);
}

function captionOverlay(top: string, bottom: string): Buffer {
  const topLines = wrapCaption(top);
  const bottomLines = wrapCaption(bottom);
  const lineHeight = 52;
  const topHeight = Math.max(104, topLines.length * lineHeight + 42);
  const bottomHeight = Math.max(104, bottomLines.length * lineHeight + 42);
  const textLine = (line: string, index: number, section: "top" | "bottom") => {
    const y = section === "top"
      ? 48 + 42 + index * lineHeight
      : OUTPUT_HEIGHT - bottomHeight + 38 + index * lineHeight;
    return `<text x="${OUTPUT_WIDTH / 2}" y="${y}" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-weight="900" font-size="38" fill="#FFFFFF" stroke="#101010" stroke-width="5" paint-order="stroke">${escapeXml(line)}</text>`;
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${OUTPUT_WIDTH}" height="${OUTPUT_HEIGHT}" viewBox="0 0 ${OUTPUT_WIDTH} ${OUTPUT_HEIGHT}">
    <rect x="24" y="24" width="${OUTPUT_WIDTH - 48}" height="${topHeight}" rx="24" fill="#080A10" fill-opacity=".68"/>
    <rect x="24" y="${OUTPUT_HEIGHT - bottomHeight - 24}" width="${OUTPUT_WIDTH - 48}" height="${bottomHeight}" rx="24" fill="#080A10" fill-opacity=".68"/>
    ${topLines.map((line, index) => textLine(line, index, "top")).join("")}
    ${bottomLines.map((line, index) => textLine(line, index, "bottom")).join("")}
  </svg>`;
  return Buffer.from(svg);
}

async function readDiscordAttachment(
  attachment: Attachment,
  fetcher: typeof fetch = fetch,
): Promise<Buffer> {
  if (attachment.size > MAX_INPUT_BYTES) throw new Error("image_too_large");
  if (attachment.contentType && !["image/png", "image/jpeg", "image/webp"].includes(attachment.contentType.toLowerCase())) {
    throw new Error("invalid_image");
  }
  const url = new URL(attachment.url);
  if (url.protocol !== "https:" || url.port || url.username || url.password || !IMAGE_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error("invalid_image_url");
  }
  const response = await fetcher(url, {
    headers: { accept: "image/png,image/jpeg,image/webp" },
    signal: AbortSignal.timeout(10_000),
    redirect: "error",
  });
  if (!response.ok || !response.headers.get("content-type")?.toLowerCase().startsWith("image/")) {
    throw new Error("invalid_image");
  }
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_INPUT_BYTES) {
    await response.body?.cancel().catch(() => {});
    throw new Error("image_too_large");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("invalid_image");
  const chunks: Buffer[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_INPUT_BYTES) {
        await reader.cancel();
        throw new Error("image_too_large");
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}

async function normalizeUserImage(buffer: Buffer): Promise<Buffer> {
  let image = sharp(buffer, { limitInputPixels: MAX_IMAGE_PIXELS, animated: false, failOn: "error" });
  let metadata: sharp.Metadata;
  try {
    metadata = await image.metadata();
  } catch {
    throw new Error("invalid_image");
  }
  if (!metadata.width || !metadata.height || metadata.width * metadata.height > MAX_IMAGE_PIXELS
    || !["png", "jpeg", "webp"].includes(metadata.format ?? "")
    || (metadata.pages ?? 1) > 1) {
    throw new Error("invalid_image");
  }
  try {
    return await sharp(buffer, { limitInputPixels: MAX_IMAGE_PIXELS, animated: false, failOn: "error" })
      .rotate()
      .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, { fit: "contain", background: "#171923", withoutEnlargement: true })
      .png()
      .toBuffer();
  } catch {
    throw new Error("invalid_image");
  }
}

async function composeMeme(top: string, bottom: string, theme: keyof typeof TEMPLATE_COLORS, source?: Buffer): Promise<Buffer> {
  const background = source ? await normalizeUserImage(source) : backgroundTemplate(theme);
  const result = await sharp(background, { limitInputPixels: MAX_IMAGE_PIXELS })
    .composite([{ input: captionOverlay(top, bottom) }])
    .png()
    .toBuffer();
  if (result.length > MAX_OUTPUT_BYTES) throw new Error("image_too_large");
  return result;
}

function parseMeme(args: string[]): { theme: keyof typeof TEMPLATE_COLORS; captions: string; explicitTemplate: boolean } {
  if (args[0]?.toLowerCase() !== "template") return { theme: "classic", captions: args.join(" ").trim(), explicitTemplate: false };
  const rawTheme = args[1]?.toLowerCase();
  const aliases: Record<string, keyof typeof TEMPLATE_COLORS> = { classic: "classic", classique: "classic", duo: "duo", night: "night", nuit: "night" };
  if (!rawTheme || !aliases[rawTheme]) throw new Error("bad_template");
  return { theme: aliases[rawTheme]!, captions: args.slice(2).join(" ").trim(), explicitTemplate: true };
}

export async function handleMemeCommand(
  message: Message,
  args: string[],
  language: Language,
  fetchAttachment: (attachment: Attachment) => Promise<Buffer> = (attachment) => readDiscordAttachment(attachment),
): Promise<void> {
  const strings = STRINGS[language];
  if (!args.length || args[0]?.toLowerCase() === "help" || args[0]?.toLowerCase() === "aide") {
    await message.reply(strings.usage);
    return;
  }

  let parsed: ReturnType<typeof parseMeme>;
  try {
    parsed = parseMeme(args);
  } catch {
    await message.reply(strings.badTemplate);
    return;
  }
  const [top, bottom, ...extra] = parsed.captions.split("|").map((caption) => caption.trim());
  if (!top || !bottom || extra.length || top.length > 80 || bottom.length > 80) {
    await message.reply(strings.badCaption);
    return;
  }
  const attachment = message.attachments.first();
  if (attachment && parsed.explicitTemplate) {
    await message.reply(strings.badCaption);
    return;
  }
  if (message.guild && message.client.user && "permissionsFor" in message.channel
    && !message.channel.permissionsFor(message.client.user)?.has(PermissionFlagsBits.AttachFiles)) {
    await message.reply(strings.noPermission);
    return;
  }

  if (isSendable(message.channel)) await message.channel.sendTyping().catch(() => undefined);
  try {
    const source = attachment ? await fetchAttachment(attachment) : undefined;
    const buffer = await composeMeme(top, bottom, parsed.theme, source);
    await message.reply({
      content: strings.created,
      files: [new AttachmentBuilder(buffer, { name: "meme.png" })],
      allowedMentions: { parse: [] },
    });
  } catch (error) {
    await message.reply(
      error instanceof Error && error.message === "image_too_large" ? strings.tooLarge
        : error instanceof Error && error.message.startsWith("invalid_image") ? strings.invalidImage
          : error instanceof Error && error.message === "unauthorized_image" ? strings.unauthorizedImage
            : strings.failed,
    ).catch(() => null);
  }
}

export const memeImageLimits = {
  maxInputBytes: MAX_INPUT_BYTES,
  maxOutputBytes: MAX_OUTPUT_BYTES,
  maxImagePixels: MAX_IMAGE_PIXELS,
};
