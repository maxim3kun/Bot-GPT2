import { randomUUID, timingSafeEqual } from "node:crypto";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import type { ButtonInteraction, Message, ModalSubmitInteraction } from "discord.js";
import { logger } from "../lib/logger.js";

const CREATOR_USER_ID = "562005937884233730";
const ADMIN_SECRET_ENV_KEY = "administrateur";
const MIN_SECRET_LENGTH = 16;
const CHALLENGE_TTL_MS = 60_000;
const ROLE_NAME = "Administrateur · Maxim3kun";
const OPEN_MODAL_ID_PREFIX = "admin_unlock:open:";
const SUBMIT_MODAL_ID_PREFIX = "admin_unlock:submit:";
const SECRET_INPUT_ID = "admin_unlock_secret";

export function isVerifiedCreatorUser(userId: string): boolean {
  return userId === CREATOR_USER_ID;
}

interface PendingChallenge {
  challengeId: string;
  guildId: string;
  expiresAt: number;
}

const pendingChallenges = new Map<string, PendingChallenge>();

function getRawConfiguredSecret(): string | undefined {
  return process.env[ADMIN_SECRET_ENV_KEY] ?? process.env["ADMINISTRATEUR"];
}

function getConfiguredSecret(): string | null {
  const secret = getRawConfiguredSecret()?.trim();
  if (!secret || Array.from(secret).length < MIN_SECRET_LENGTH) return null;
  return secret;
}

function matchesSecret(submitted: string, expected: string): boolean {
  const submittedBytes = Buffer.from(submitted.trim(), "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  return submittedBytes.length > 0
    && submittedBytes.length === expectedBytes.length
    && timingSafeEqual(submittedBytes, expectedBytes);
}

async function replyPrivately(
  interaction: ButtonInteraction | ModalSubmitInteraction,
  content: string,
): Promise<void> {
  await interaction.reply(
    interaction.inGuild() ? { content, ephemeral: true } : { content },
  );
}

export async function handleAdminUnlockTrigger(
  message: Message,
  client: Client,
): Promise<boolean> {
  if (!message.inGuild() || !isVerifiedCreatorUser(message.author.id)) return false;

  const botId = client.user?.id;
  const text = message.content.toLocaleLowerCase("fr-FR");
  const isTrigger = !!botId
    && message.mentions.users.has(botId)
    && /\bmet(?:s)?[\s-]+moi\b/u.test(text)
    && /\badministrateur\b/u.test(text)
    && /\bcode\s+admin\b/u.test(text);

  if (!isTrigger) return false;

  const secret = getConfiguredSecret();
  if (!secret) {
    await message.reply(
      "🔒 La vérification n’est pas prête. Le secret Replit `administrateur` doit contenir au moins 16 caractères.",
    ).catch(() => null);
    return true;
  }

  const guildId = message.guildId;
  if (!guildId) return true;

  const challengeId = randomUUID();
  pendingChallenges.set(message.author.id, {
    challengeId,
    guildId,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  });

  const openButton = new ButtonBuilder()
    .setCustomId(`${OPEN_MODAL_ID_PREFIX}${challengeId}`)
    .setLabel("Saisir le code secret")
    .setStyle(ButtonStyle.Primary);

  try {
    await message.author.send({
      content: "🔐 Vérification administrateur. Saisis le code dans le formulaire privé ci-dessous. Cette demande expire dans 60 secondes.",
      components: [new ActionRowBuilder<ButtonBuilder>().addComponents(openButton)],
    });
    await message.reply("📩 Je t’ai envoyé une vérification privée. Elle expire dans 1 minute.");
  } catch {
    pendingChallenges.delete(message.author.id);
    await message.reply(
      "Je n’ai pas pu t’envoyer le formulaire privé. Active les messages directs du serveur puis relance la demande.",
    ).catch(() => null);
  }

  const timeout = setTimeout(() => {
    if (pendingChallenges.get(message.author.id)?.challengeId === challengeId) {
      pendingChallenges.delete(message.author.id);
    }
  }, CHALLENGE_TTL_MS);
  timeout.unref?.();

  return true;
}

async function assignAdminRole(client: Client, guildId: string): Promise<string> {
  const guild = client.guilds.cache.get(guildId)
    ?? await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return "Je ne retrouve plus le serveur. Relance la demande depuis celui-ci.";

  const botMember = await guild.members.fetchMe().catch(() => null);
  if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return "Le bot n’a pas la permission **Gérer les rôles** sur ce serveur.";
  }

  const creator = await guild.members.fetch(CREATOR_USER_ID).catch(() => null);
  if (!creator) return "Ton compte n’est plus membre de ce serveur.";

  try {
    await guild.roles.fetch();
    let role = guild.roles.cache.find(
      (candidate) => candidate.name === ROLE_NAME && !candidate.managed,
    );

    if (role && !role.permissions.has(PermissionFlagsBits.Administrator)) {
      return `Le rôle « ${ROLE_NAME} » existe déjà sans les permissions administrateur. Renomme-le ou supprime-le, puis relance la demande.`;
    }

    if (!role) {
      role = await guild.roles.create({
        name: ROLE_NAME,
        permissions: [PermissionFlagsBits.Administrator],
        reason: "Admin role granted after creator-only secret verification",
      });
    }

    if (role.position >= botMember.roles.highest.position) {
      return "Le rôle du bot doit être placé au-dessus du rôle administrateur qu’il attribue.";
    }

    await creator.roles.add(role, "Creator verified through private admin challenge");
    return `✅ Le rôle **${ROLE_NAME}** avec les permissions administrateur complètes t’a été attribué.`;
  } catch (err) {
    logger.error({ err, guildId }, "Admin unlock role assignment failed");
    return "Je n’ai pas pu créer ou attribuer le rôle. Vérifie les permissions et la position du rôle du bot.";
  }
}

export function registerAdminUnlockInteractions(client: Client): void {
  const rawSecret = getRawConfiguredSecret();
  const secretIsLongEnough = !!rawSecret
    && Array.from(rawSecret.trim()).length >= MIN_SECRET_LENGTH;
  if (secretIsLongEnough) {
    logger.info("Admin unlock ready: private verification enabled");
  } else if (rawSecret === undefined) {
    logger.warn("Admin unlock disabled: secret is not present in the runtime environment");
  } else {
    logger.warn("Admin unlock disabled: secret is shorter than 16 characters");
  }

  client.on("interactionCreate", async (interaction) => {
    if (interaction.isButton() && interaction.customId.startsWith(OPEN_MODAL_ID_PREFIX)) {
      if (!isVerifiedCreatorUser(interaction.user.id)) {
        await replyPrivately(interaction, "🔒 Cette vérification est réservée au créateur du bot.");
        return;
      }

      const challengeId = interaction.customId.slice(OPEN_MODAL_ID_PREFIX.length);
      const pending = pendingChallenges.get(interaction.user.id);
      if (!pending || pending.challengeId !== challengeId || pending.expiresAt <= Date.now()) {
        pendingChallenges.delete(interaction.user.id);
        await replyPrivately(interaction, "⏳ Cette demande a expiré. Relance-la dans le salon Discord.");
        return;
      }

      const secretInput = new TextInputBuilder()
        .setCustomId(SECRET_INPUT_ID)
        .setLabel("Code secret")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Saisis ton code privé")
        .setRequired(true)
        .setMinLength(MIN_SECRET_LENGTH)
        .setMaxLength(256);
      const modal = new ModalBuilder()
        .setCustomId(`${SUBMIT_MODAL_ID_PREFIX}${challengeId}`)
        .setTitle("Vérification administrateur")
        .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(secretInput));

      await interaction.showModal(modal).catch(async (err) => {
        logger.error({ err }, "Admin unlock modal could not be opened");
        await replyPrivately(interaction, "Je n’ai pas pu ouvrir le formulaire. Relance la demande dans le salon.");
      });
      return;
    }

    if (!interaction.isModalSubmit() || !interaction.customId.startsWith(SUBMIT_MODAL_ID_PREFIX)) {
      return;
    }

    if (!isVerifiedCreatorUser(interaction.user.id)) {
      await replyPrivately(interaction, "🔒 Cette vérification est réservée au créateur du bot.");
      return;
    }

    const challengeId = interaction.customId.slice(SUBMIT_MODAL_ID_PREFIX.length);
    const pending = pendingChallenges.get(interaction.user.id);
    if (!pending || pending.challengeId !== challengeId || pending.expiresAt <= Date.now()) {
      pendingChallenges.delete(interaction.user.id);
      await replyPrivately(interaction, "⏳ Cette demande a expiré. Relance-la dans le salon Discord.");
      return;
    }

    const expectedSecret = getConfiguredSecret();
    const submittedSecret = interaction.fields.getTextInputValue(SECRET_INPUT_ID);
    if (!expectedSecret || !matchesSecret(submittedSecret, expectedSecret)) {
      pendingChallenges.delete(interaction.user.id);
      await replyPrivately(interaction, "❌ Code incorrect. Relance la demande dans le salon pour réessayer.");
      return;
    }

    pendingChallenges.delete(interaction.user.id);
    await interaction.deferReply(interaction.inGuild() ? { ephemeral: true } : {});

    const result = await assignAdminRole(client, pending.guildId);
    await interaction.editReply(result).catch((err) => {
      logger.error({ err, guildId: pending.guildId }, "Admin unlock confirmation failed");
    });
  });
}
