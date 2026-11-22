import {
  ApplicationCommandType,
  REST,
  Routes,
  SlashCommandBuilder,
  type RESTPostAPIApplicationCommandsJSONBody,
} from "discord.js";
import { logger } from "../lib/logger";

export const SLASH_COMMANDS = [
  new SlashCommandBuilder()
    .setName("poll")
    .setDescription("Créer un sondage / Create a poll")
    .addStringOption(opt => opt.setName("question").setDescription("Question du sondage").setMaxLength(250).setRequired(true))
    .addStringOption(opt => opt.setName("choices").setDescription("Choix séparés par | (2 à 9)").setMaxLength(1800).setRequired(true))
    .toJSON(),
  // ── Help ──────────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show bot commands and help")
    .addStringOption(opt =>
      opt.setName("lang").setDescription("Language")
        .addChoices(
          { name: "English",  value: "en" },
          { name: "Français", value: "fr" },
          { name: "Español",  value: "es" },
        ),
    )
    .toJSON(),

  // ── YouTube (autocomplete) ─────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("youtube")
    .setDescription("Search and play a YouTube video by artist + song")
    .addStringOption(opt =>
      opt.setName("artist")
        .setDescription("Artist name (type to get suggestions)")
        .setRequired(true)
        .setAutocomplete(true),
    )
    .addStringOption(opt =>
      opt.setName("song")
        .setDescription("Song name (type to get suggestions)")
        .setRequired(true)
        .setAutocomplete(true),
    )
    .toJSON(),

  // ── Play (URL or search query) ─────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play a YouTube URL or search for a track")
    .addStringOption(opt =>
      opt.setName("query")
        .setDescription("YouTube URL or search query (e.g. Dua Lipa Levitating)")
        .setRequired(true),
    )
    .toJSON(),

  // ── Bus city autocomplete ──────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("bus")
    .setDescription("Find a French bus route with city suggestions")
    .setDescriptionLocalizations({
      fr: "Chercher une ligne de bus en France avec des suggestions de communes",
      "es-ES": "Buscar una línea de autobús en Francia con sugerencias de ciudades",
    })
    .addStringOption(opt => opt
      .setName("ville")
      .setNameLocalizations({ "en-US": "city", "en-GB": "city", "es-ES": "ciudad" })
      .setDescription("Type the beginning of a French city name")
      .setDescriptionLocalizations({
        fr: "Saisis le début du nom d’une commune",
        "es-ES": "Escribe el comienzo del nombre de una ciudad",
      })
      .setRequired(true)
      .setAutocomplete(true))
    .toJSON(),

  // ── Now Playing ───────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("np")
    .setDescription("Show what is currently playing")
    .toJSON(),

  // ── Skip ──────────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Skip the current track")
    .toJSON(),

  // ── Stop ──────────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stop playback and disconnect the bot from voice")
    .toJSON(),

  // ── Join ──────────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("join")
    .setDescription("Make the bot join your voice channel")
    .toJSON(),

  // ── Leave ─────────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("leave")
    .setDescription("Make the bot leave the voice channel")
    .toJSON(),

  // ── Queue ─────────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Show the current playback queue")
    .toJSON(),

  // ── Say ───────────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("say")
    .setDescription("Make the bot send a message in this channel")
    .addStringOption(opt =>
      opt.setName("text")
        .setDescription("The text to send")
        .setRequired(true),
    )
    .toJSON(),

  // ── Radio ─────────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("radio")
    .setDescription("Play a radio station or browse the station list")
    .addStringOption(opt =>
      opt.setName("station")
        .setDescription("Station key (e.g. nrj, heart, kexp) — leave empty for the full list")
        .setRequired(false),
    )
    .toJSON(),

  // ── Joke ──────────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("joke")
    .setDescription("Get a random joke")
    .addStringOption(opt =>
      opt.setName("lang").setDescription("Language")
        .addChoices(
          { name: "English",  value: "en" },
          { name: "Français", value: "fr" },
          { name: "Español",  value: "es" },
        ),
    )
    .toJSON(),

  // ── Roll ──────────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("roll")
    .setDescription("Roll a dice")
    .addIntegerOption(opt =>
      opt.setName("faces")
        .setDescription("Number of faces (default: 6)")
        .setMinValue(2)
        .setMaxValue(1000)
        .setRequired(false),
    )
    .toJSON(),

  // ── 8ball ─────────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("8ball")
    .setDescription("Ask the magic 8-ball a yes/no question")
    .addStringOption(opt =>
      opt.setName("question")
        .setDescription("Your question")
        .setRequired(true),
    )
    .toJSON(),

  // ── Trivia ────────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("trivia")
    .setDescription("Start a trivia quiz question (requires AI)")
    .toJSON(),

  // ── Karaoke ───────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("karaoke")
    .setDescription("Start karaoke with live synced lyrics")
    .addStringOption(opt =>
      opt.setName("song")
        .setDescription("Artist and song name (e.g. Ed Sheeran Shape of You)")
        .setRequired(true),
    )
    .toJSON(),

  // ── Music (Suno) ──────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("music")
    .setDescription("Generate a song with Suno AI")
    .addStringOption(opt =>
      opt.setName("prompt")
        .setDescription("Describe the style and mood (e.g. lo-fi hip hop chill rainy day)")
        .setRequired(true),
    )
    .toJSON(),

  // ── Image (Cloudflare, optional Hugging Face fallback) ────────────────────
  new SlashCommandBuilder()
    .setName("image")
    .setDescription("Generate an image with AI")
    .addStringOption(opt =>
      opt.setName("description")
        .setDescription("Describe the image (e.g. a sunset over Paris at golden hour)")
        .setRequired(true),
    )
    .toJSON(),

  // ── Quest ─────────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("quest")
    .setDescription("Manage your personal quests and goals")
    .addStringOption(opt =>
      opt.setName("action").setDescription("Action to perform (default: start)")
        .setRequired(false)
        .addChoices(
          { name: "start — Create quests with AI",   value: "start"   },
          { name: "list — View your quests",          value: "list"    },
          { name: "profile — Level & XP",             value: "profile" },
          { name: "stats — 7-day chart",              value: "stats"   },
          { name: "reset — Reset all quests",         value: "reset"   },
        ),
    )
    .toJSON(),

  // ── Shazam ────────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("shazam")
    .setDescription("Identify the song currently playing in the voice channel")
    .setDescriptionLocalizations({
      fr: "Identifier la chanson en cours de lecture dans le salon vocal",
      "es-ES": "Identificar la canción que suena en el canal de voz",
    })
    .toJSON(),

  // ── Define (Dictionary) ───────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("define")
    .setDescription("Look up the definition of an English word")
    .setDescriptionLocalizations({
      fr: "Chercher la définition d'un mot anglais",
      "es-ES": "Buscar la definición de una palabra en inglés",
    })
    .addStringOption(opt =>
      opt.setName("word")
        .setDescription("The word to define")
        .setDescriptionLocalizations({
          fr: "Le mot à définir",
          "es-ES": "La palabra a definir",
        })
        .setRequired(true),
    )
    .toJSON(),

  // ── QR Code ───────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("qr")
    .setDescription("Create a QR code from text, or read a QR code from an attached image")
    .setDescriptionLocalizations({
      fr: "Créer un QR code ou lire un QR code depuis une image jointe",
      "es-ES": "Crear un código QR o leer uno desde una imagen adjunta",
    })
    .addStringOption(opt =>
      opt.setName("text")
        .setDescription("Text or URL to encode into a QR code")
        .setDescriptionLocalizations({
          fr: "Texte ou URL à encoder en QR code",
          "es-ES": "Texto o URL a codificar en código QR",
        })
        .setRequired(false),
    )
    .addAttachmentOption(opt =>
      opt.setName("image")
        .setDescription("Image containing a QR code to read")
        .setDescriptionLocalizations({
          fr: "Image contenant un QR code à lire",
          "es-ES": "Imagen con un código QR para leer",
        })
        .setRequired(false),
    )
    .toJSON(),

  // ── Echo ──────────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("echo")
    .setDescription("Toggle echo mode — repeats all messages in the channel (max 8). Use again to stop.")
    .setDescriptionLocalizations({
      fr: "Active/désactive l'écho — répète tous les messages du salon (max 8). Réutilise pour arrêter.",
      "es-ES": "Activa/desactiva el eco — repite todos los mensajes del canal (máx 8). Úsalo de nuevo para parar.",
    })
    .toJSON(),

  // ── Pokédex ───────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("pokemon")
    .setDescription("Look up a Pokémon in the Pokédex")
    .setDescriptionLocalizations({
      fr: "Consulter un Pokémon dans le Pokédex",
      "es-ES": "Buscar un Pokémon en la Pokédex",
    })
    .addStringOption(opt =>
      opt.setName("name")
        .setDescription("Pokémon name or number (e.g. pikachu or 25)")
        .setDescriptionLocalizations({
          fr: "Nom ou numéro du Pokémon (ex: pikachu ou 25)",
          "es-ES": "Nombre o número del Pokémon (ej: pikachu o 25)",
        })
        .setRequired(true),
    )
    .toJSON(),

  // ── Crypto paper simulator ────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("crypto")
    .setDescription("Track a private €10 crypto paper investment — no real trades")
    .setDescriptionLocalizations({
      fr: "Suivre un placement crypto fictif privé de 10 €, sans transaction réelle",
      "es-ES": "Seguir una inversión ficticia privada de 10 €, sin operaciones reales",
    })
    .addSubcommand(sub =>
      sub.setName("demarrer")
        .setDescription("Start a private simulated €10 purchase")
        .setDescriptionLocalizations({
          fr: "Démarrer un achat fictif privé de 10 €",
          "es-ES": "Iniciar una compra ficticia privada de 10 €",
        })
        .addStringOption(opt =>
          opt.setName("actif")
            .setDescription("Cryptocurrency to simulate")
            .setDescriptionLocalizations({ fr: "Cryptomonnaie à simuler", "es-ES": "Criptomoneda a simular" })
            .setRequired(true)
            .addChoices(
              { name: "Bitcoin (BTC)", value: "btc" },
              { name: "Ethereum (ETH)", value: "eth" },
              { name: "Solana (SOL)", value: "sol" },
            ),
        ),
    )
    .addSubcommand(sub =>
      sub.setName("solde")
        .setDescription("View your current private simulation")
        .setDescriptionLocalizations({
          fr: "Afficher ton portefeuille simulé et son évolution",
          "es-ES": "Ver tu cartera simulada y su evolución",
        }),
    )
    .addSubcommand(sub =>
      sub.setName("reinitialiser")
        .setDescription("Delete your simulated portfolio")
        .setDescriptionLocalizations({
          fr: "Effacer ton portefeuille simulé",
          "es-ES": "Borrar tu cartera simulada",
        }),
    )
    .addSubcommand(sub =>
      sub.setName("strategie")
        .setDescription("Backtest an illustrative paper strategy on public Binance candles")
        .setDescriptionLocalizations({
          fr: "Tester une règle fictive sur les bougies Binance publiques",
          "es-ES": "Probar una regla ficticia con velas públicas de Binance",
        })
        .addStringOption(opt =>
          opt.setName("actif")
            .setDescription("EUR market to test")
            .setDescriptionLocalizations({ fr: "Marché en euros à tester", "es-ES": "Mercado en euros que probar" })
            .setRequired(true)
            .addChoices(
              { name: "Bitcoin (BTC/EUR)", value: "btc" },
              { name: "Ethereum (ETH/EUR)", value: "eth" },
              { name: "Solana (SOL/EUR)", value: "sol" },
            ),
        )
        .addNumberOption(opt =>
          opt.setName("frais_pct")
            .setDescription("Assumed fee per side in percent; default 0.1")
            .setDescriptionLocalizations({
              fr: "Frais supposés par côté en pourcentage; défaut 0,1",
              "es-ES": "Comisión supuesta por lado en porcentaje; predeterminado 0,1",
            })
            .setMinValue(0)
            .setMaxValue(5)
            .setRequired(false),
        ),
    )
    .toJSON(),

  // ── Welcome (admin setup) ─────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("welcome")
    .setDescription("Configure the welcome channel for new members (admin only)")
    .setDescriptionLocalizations({
      fr: "Configurer le salon de bienvenue pour les nouveaux membres (admin seulement)",
      "es-ES": "Configurar el canal de bienvenida para nuevos miembros (solo admin)",
    })
    .addSubcommand(sub =>
      sub.setName("set")
        .setDescription("Set the welcome channel")
        .setDescriptionLocalizations({
          fr: "Définir le salon de bienvenue",
          "es-ES": "Establecer el canal de bienvenida",
        })
        .addChannelOption(opt =>
          opt.setName("channel")
            .setDescription("Channel where welcome messages will be sent")
            .setDescriptionLocalizations({
              fr: "Salon où les messages de bienvenue seront envoyés",
              "es-ES": "Canal donde se enviarán los mensajes de bienvenida",
            })
            .setRequired(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName("message")
        .setDescription("Set a custom welcome message ({user}, {server}, {count})")
        .setDescriptionLocalizations({
          fr: "Définir un message de bienvenue personnalisé ({user}, {server}, {count})",
          "es-ES": "Establecer un mensaje de bienvenida personalizado ({user}, {server}, {count})",
        })
        .addStringOption(opt =>
          opt.setName("text")
            .setDescription("Custom message text")
            .setDescriptionLocalizations({
              fr: "Texte du message personnalisé",
              "es-ES": "Texto del mensaje personalizado",
            })
            .setRequired(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName("clear")
        .setDescription("Reset the welcome message to default")
        .setDescriptionLocalizations({
          fr: "Remettre le message de bienvenue par défaut",
          "es-ES": "Restablecer el mensaje de bienvenida al predeterminado",
        }),
    )
    .addSubcommand(sub =>
      sub.setName("status")
        .setDescription("Show current welcome configuration")
        .setDescriptionLocalizations({
          fr: "Afficher la configuration actuelle de bienvenue",
          "es-ES": "Mostrar la configuración actual de bienvenida",
        }),
    )
    .toJSON(),

  // ── Schedule ──────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("schedule")
    .setDescription("Schedule messages to be sent at a specific time (UTC)")
    .setDescriptionLocalizations({
      fr: "Planifier des messages à envoyer à une heure précise (UTC)",
      "es-ES": "Programar mensajes para enviar a una hora específica (UTC)",
    })
    .addSubcommand(sub =>
      sub.setName("once")
        .setDescription("Schedule a message to send once at HH:MM UTC")
        .setDescriptionLocalizations({
          fr: "Planifier un message une seule fois à HH:MM UTC",
          "es-ES": "Programar un mensaje una sola vez a HH:MM UTC",
        })
        .addStringOption(opt =>
          opt.setName("time")
            .setDescription("Time in HH:MM (UTC) — e.g. 18:00")
            .setDescriptionLocalizations({
              fr: "Heure au format HH:MM (UTC) — ex: 18:00",
              "es-ES": "Hora en HH:MM (UTC) — ej: 18:00",
            })
            .setRequired(true),
        )
        .addChannelOption(opt =>
          opt.setName("channel")
            .setDescription("Channel to send the message in")
            .setDescriptionLocalizations({
              fr: "Salon où envoyer le message",
              "es-ES": "Canal donde enviar el mensaje",
            })
            .setRequired(true),
        )
        .addStringOption(opt =>
          opt.setName("message")
            .setDescription("The message to send")
            .setDescriptionLocalizations({
              fr: "Le message à envoyer",
              "es-ES": "El mensaje a enviar",
            })
            .setRequired(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName("daily")
        .setDescription("Schedule a message to repeat daily at HH:MM UTC")
        .setDescriptionLocalizations({
          fr: "Planifier un message récurrent chaque jour à HH:MM UTC",
          "es-ES": "Programar un mensaje para repetirse cada día a HH:MM UTC",
        })
        .addStringOption(opt =>
          opt.setName("time")
            .setDescription("Time in HH:MM (UTC) — e.g. 09:00")
            .setDescriptionLocalizations({
              fr: "Heure au format HH:MM (UTC) — ex: 09:00",
              "es-ES": "Hora en HH:MM (UTC) — ej: 09:00",
            })
            .setRequired(true),
        )
        .addChannelOption(opt =>
          opt.setName("channel")
            .setDescription("Channel to send the message in")
            .setDescriptionLocalizations({
              fr: "Salon où envoyer le message",
              "es-ES": "Canal donde enviar el mensaje",
            })
            .setRequired(true),
        )
        .addStringOption(opt =>
          opt.setName("message")
            .setDescription("The message to send")
            .setDescriptionLocalizations({
              fr: "Le message à envoyer",
              "es-ES": "El mensaje à envoyer",
            })
            .setRequired(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName("list")
        .setDescription("List all scheduled messages for this server")
        .setDescriptionLocalizations({
          fr: "Lister tous les messages planifiés de ce serveur",
          "es-ES": "Listar todos los mensajes programados de este servidor",
        }),
    )
    .addSubcommand(sub =>
      sub.setName("cancel")
        .setDescription("Cancel a scheduled message by ID")
        .setDescriptionLocalizations({
          fr: "Annuler un message planifié par son ID",
          "es-ES": "Cancelar un mensaje programado por su ID",
        })
        .addStringOption(opt =>
          opt.setName("id")
            .setDescription("Message ID (from /schedule list)")
            .setDescriptionLocalizations({
              fr: "ID du message (depuis /schedule list)",
              "es-ES": "ID del mensaje (desde /schedule list)",
            })
            .setRequired(true),
        ),
    )
    .toJSON(),

  // ── Shell Game ────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("shellgame")
    .setDescription("Play the Shell Game — follow the ball and find the right cup!")
    .addStringOption(opt =>
      opt.setName("difficulty")
        .setDescription("Game difficulty")
        .addChoices(
          { name: "🟢 Easy (3 cups)",   value: "easy"   },
          { name: "🟡 Medium (4 cups)", value: "medium" },
          { name: "🔴 Hard (5 cups)",   value: "hard"   },
        ),
    )
    .addStringOption(opt =>
      opt.setName("action")
        .setDescription("Action to perform")
        .addChoices(
          { name: "Play",  value: "play"  },
          { name: "Stats", value: "stats" },
        ),
    )
    .toJSON(),
] as const;

type PrimaryEntryPointCommandPayload = Extract<
  RESTPostAPIApplicationCommandsJSONBody,
  { type: ApplicationCommandType.PrimaryEntryPoint }
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Discord rejects bulk command updates that omit an application's Activity
 * Entry Point. Preserve its writable fields while dropping response-only IDs.
 */
export function mergePrimaryEntryPointCommand(
  commands: readonly RESTPostAPIApplicationCommandsJSONBody[],
  existingCommands: readonly unknown[],
): RESTPostAPIApplicationCommandsJSONBody[] {
  const primaryEntryPoints = existingCommands.filter(
    (command): command is Record<string, unknown> =>
      isRecord(command) && command.type === ApplicationCommandType.PrimaryEntryPoint,
  );

  const preservedCommands = primaryEntryPoints.map((command) => {
    if (typeof command.name !== "string" || command.name.length === 0) {
      throw new Error("Discord returned an invalid Activity Entry Point command");
    }

    const payload: Record<string, unknown> = {
      name: command.name,
      type: ApplicationCommandType.PrimaryEntryPoint,
    };

    for (const field of [
      "name_localizations",
      "description",
      "description_localizations",
      "options",
      "default_member_permissions",
      "dm_permission",
      "nsfw",
      "integration_types",
      "contexts",
      "handler",
    ]) {
      if (command[field] !== undefined) payload[field] = command[field];
    }

    return payload as unknown as PrimaryEntryPointCommandPayload;
  });

  return [
    ...commands.filter((command) => command.type !== ApplicationCommandType.PrimaryEntryPoint),
    ...preservedCommands,
  ];
}

export async function registerSlashCommands(clientId: string, token: string): Promise<void> {
  const rest = new REST().setToken(token);
  try {
    const route = Routes.applicationCommands(clientId);
    const existingCommands = await rest.get(route) as unknown;
    if (!Array.isArray(existingCommands)) {
      throw new Error("Discord returned an invalid global command list");
    }

    const commands = mergePrimaryEntryPointCommand(SLASH_COMMANDS, existingCommands);
    await rest.put(route, { body: commands });
    logger.info({
      count: commands.length,
      preservedActivityEntryPoint: commands.some(
        (command) => command.type === ApplicationCommandType.PrimaryEntryPoint,
      ),
    }, "Slash commands registered globally");
  } catch (err) {
    logger.error({ err }, "Failed to register slash commands");
  }
}
