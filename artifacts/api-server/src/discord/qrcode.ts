import { EmbedBuilder, AttachmentBuilder, Message } from "discord.js";
import QRCode from "qrcode";
import jsQR from "jsqr";
import sharp from "sharp";
import { logger } from "../lib/logger.js";

const LOCALE_STRINGS: Record<string, {
  noText: string;
  tooLong: string;
  generating: string;
  errorCreate: string;
  noImage: string;
  reading: string;
  found: string;
  notFound: string;
  errorRead: string;
  qrLabel: string;
}> = {
  fr: {
    noText: "📷 Donne-moi un texte ! Ex: `/qr https://example.com`",
    tooLong: "❌ Le texte est trop long (max 500 caractères).",
    generating: "⏳ Génération du QR code…",
    errorCreate: "❌ Impossible de créer le QR code.",
    noImage: "📷 Joins une image contenant un QR code à analyser.",
    reading: "🔍 Lecture du QR code…",
    found: "✅ QR Code détecté",
    notFound: "❌ Aucun QR code trouvé dans l'image.",
    errorRead: "❌ Impossible de lire l'image.",
    qrLabel: "Contenu",
  },
  es: {
    noText: "📷 ¡Dame un texto! Ej: `/qr https://example.com`",
    tooLong: "❌ El texto es demasiado largo (máx 500 caracteres).",
    generating: "⏳ Generando código QR…",
    errorCreate: "❌ No se pudo crear el código QR.",
    noImage: "📷 Adjunta una imagen con un código QR para leerlo.",
    reading: "🔍 Leyendo el código QR…",
    found: "✅ Código QR detectado",
    notFound: "❌ No se encontró ningún código QR en la imagen.",
    errorRead: "❌ No se pudo leer la imagen.",
    qrLabel: "Contenido",
  },
  en: {
    noText: "📷 Give me some text! e.g. `/qr https://example.com`",
    tooLong: "❌ Text is too long (max 500 characters).",
    generating: "⏳ Generating QR code…",
    errorCreate: "❌ Could not create the QR code.",
    noImage: "📷 Attach an image containing a QR code to read it.",
    reading: "🔍 Reading QR code…",
    found: "✅ QR Code detected",
    notFound: "❌ No QR code found in the image.",
    errorRead: "❌ Could not read the image.",
    qrLabel: "Content",
  },
};

function getStrings(locale: string) {
  if (locale.startsWith("fr")) return LOCALE_STRINGS["fr"]!;
  if (locale.startsWith("es")) return LOCALE_STRINGS["es"]!;
  return LOCALE_STRINGS["en"]!;
}

export async function handleQrCreate(
  text: string,
  locale: string,
  reply: (opts: unknown) => Promise<unknown>,
): Promise<void> {
  const s = getStrings(locale);

  if (!text.trim()) { await reply(s.noText); return; }
  if (text.length > 500) { await reply(s.tooLong); return; }

  try {
    const buffer = await QRCode.toBuffer(text, {
      type: "png",
      width: 512,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    });

    const attachment = new AttachmentBuilder(buffer, { name: "qrcode.png" });
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("📷 QR Code")
      .setDescription(`\`\`\`${text.slice(0, 200)}${text.length > 200 ? "…" : ""}\`\`\``)
      .setImage("attachment://qrcode.png")
      .setFooter({ text: `${text.length} characters` });

    await reply({ embeds: [embed], files: [attachment] });
  } catch (err) {
    logger.error({ err }, "QR create error");
    await reply(s.errorCreate);
  }
}

export async function handleQrRead(
  message: Message,
  locale: string,
): Promise<void> {
  const s = getStrings(locale);
  const attachment = message.attachments.first();

  if (!attachment || !attachment.contentType?.startsWith("image/")) {
    await message.reply(s.noImage);
    return;
  }

  const wait = await message.reply(s.reading);

  try {
    const res = await fetch(attachment.url);
    const arrayBuffer = await res.arrayBuffer();
    const rawBuffer = Buffer.from(arrayBuffer);

    const { data, info } = await sharp(rawBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const code = jsQR(
      new Uint8ClampedArray(data),
      info.width,
      info.height,
    );

    await wait.delete().catch(() => null);

    if (!code) {
      await message.reply(s.notFound);
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle(s.found)
      .addFields({ name: s.qrLabel, value: `\`\`\`${code.data.slice(0, 1000)}\`\`\`` });

    await message.reply({ embeds: [embed] });
  } catch (err) {
    logger.error({ err }, "QR read error");
    await wait.delete().catch(() => null);
    await message.reply(s.errorRead);
  }
}
