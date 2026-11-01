import type { Message } from "discord.js";
import type { UserLang } from "./user-lang-store.js";

export type AiIntent =
  | "greeting"
  | "identity"
  | "creator"
  | "capabilities"
  | "time"
  | "research"
  | "discord_action"
  | "creative"
  | "personal"
  | "factual"
  | "general";

export interface AiRoute {
  intent: AiIntent;
  needsResearch: boolean;
  needsConfirmation: boolean;
}

const RESEARCH_TERMS = [
  "actualité", "actualites", "actualité", "aujourd'hui", "aujourd’hui", "maintenant",
  "dernier", "dernière", "dernieres", "récent", "recente", "en ce moment",
  "current", "today", "latest", "recent", "right now", "news", "breaking",
  "prix actuel", "cours actuel", "score", "résultat", "resultat", "météo", "meteo",
  "quel temps", "temps qu'il fait", "temps qu il fait", "prévision", "prevision",
  "weather", "forecast", "disponible", "disponibilité", "disponibilite",
  "version actuelle", "mise à jour", "mise a jour", "source", "cherche sur internet",
  "recherche sur internet", "regarde sur internet", "regarder sur internet",
  "sur internet", "sur le web", "vérifie en ligne", "verifie en ligne",
];

const TIME_TERMS = [
  "quelle heure", "quel heure", "heure à", "heure a", "heure en", "time in",
  "what time", "heure actuelle", "heure locale", "fuseau horaire", "timezone",
];

const WEATHER_TERMS = [
  "météo", "meteo", "quel temps", "temps qu'il fait", "temps qu il fait",
  "prévision", "prevision", "weather", "forecast",
];

const ACTION_TERMS = [
  "supprime", "supprimer", "efface", "effacer", "ban", "bannis", "bannir",
  "kick", "exclure", "timeout", "mute", "réagis", "reagis", "envoie dans",
  "change le préfixe", "change le prefixe", "modifie le serveur",
];

const CREATIVE_TERMS = [
  "écris", "ecris", "rédige", "redige", "invente", "imagine", "compose",
  "poème", "poeme", "histoire", "blague", "paroles", "logo", "crée", "cree",
];

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(normalize(term)));
}

function isNamedEntityLookup(text: string): boolean {
  const match = text.match(/\b(?:qu['’]est[- ]ce que|c['’]est quoi|qui est|que signifie|que veut dire|what is|who is|who was|tell me about)\s+(?:(?:le|la|les|un|une|the|a|an)\s+)?([\p{L}][\p{L}\p{M}\d'’.-]*)/iu);
  const firstLetter = match?.[1]?.[0];
  return Boolean(firstLetter && firstLetter === firstLetter.toLocaleUpperCase() && firstLetter !== firstLetter.toLocaleLowerCase());
}

export function classifyAiMessage(text: string): AiRoute {
  const normalized = normalize(text);

  if (
    /^(bonjour|bonsoir|salut|coucou|hello|hi|hey|yo|hola|hallo|ciao)( bot| ia| toi| a toi)?[!?. ]*$/.test(normalized) ||
    /^(bonjour|bonsoir|salut|coucou|hello|hi|hey|yo|hola|hallo|ciao)?\s*(comment (?:va|vas)[- ]tu|comment tu vas|comment allez[- ]vous|comment ca va|ca va|how are you|how's it going)[!?. ]*$/.test(normalized)
  ) {
    return { intent: "greeting", needsResearch: false, needsConfirmation: false };
  }

  if (
    /^(quel est|c'est quoi|c est quoi|comment s'appelle|comment s appelle|what is)\s+(ton|ta|votre|your)\s+(nom|name)/.test(normalized) ||
    /^(ton|ta|votre|your)\s+(nom|name)\b/.test(normalized)
  ) {
    return { intent: "identity", needsResearch: false, needsConfirmation: false };
  }

  if (
    /\b(?:qui (?:est|a cree|t a cree|t a developpe)|(?:ton|ta|votre) createur|who (?:created|made|developed) you|who is your creator)\b/.test(normalized) ||
    /\b(?:qui est derriere toi|qui t a concu|who built you)\b/.test(normalized)
  ) {
    return { intent: "creator", needsResearch: false, needsConfirmation: false };
  }

  if (
    /\b(?:tes|vos) (?:fonctions|fonctionnalites|capacites|possibilites)\b/.test(normalized) ||
    /\b(?:que|quoi) (?:peux|sais) tu faire\b/.test(normalized) ||
    /\b(?:tu peux faire quoi|tu sais faire quoi|a quoi tu sers)\b/.test(normalized) ||
    /\b(?:what can you do|what are your (?:functions|features|capabilities)|tell me your (?:functions|features|capabilities))\b/.test(normalized)
  ) {
    return { intent: "capabilities", needsResearch: false, needsConfirmation: false };
  }

  if (includesAny(normalized, TIME_TERMS)) {
    // A request such as "quelle heure et la météo à Paris" must not return
    // after answering only the first clause. Let the AI synthesize both parts
    // with web evidence while the time is supplied as deterministic context.
    return { intent: "time", needsResearch: includesAny(normalized, WEATHER_TERMS), needsConfirmation: false };
  }

  if (includesAny(normalized, ACTION_TERMS)) {
    return {
      intent: "discord_action",
      needsResearch: false,
      needsConfirmation: true,
    };
  }

  if (includesAny(normalized, RESEARCH_TERMS)) {
    return { intent: "research", needsResearch: true, needsConfirmation: false };
  }

  if (isNamedEntityLookup(text)) {
    return { intent: "research", needsResearch: true, needsConfirmation: false };
  }

  if (includesAny(normalized, CREATIVE_TERMS)) {
    return { intent: "creative", needsResearch: false, needsConfirmation: false };
  }

  if (/\b(mon|ma|mes|moi|je suis|j'ai|j’ai|my|me|i am|i'm)\b/.test(normalized)) {
    return { intent: "personal", needsResearch: false, needsConfirmation: false };
  }

  if (/^(qui|que|quoi|comment|pourquoi|quand|où|ou|who|what|how|why|when|where)\b/.test(normalized) || normalized.endsWith("?")) {
    // Stable, everyday questions can be answered by the model directly. Web
    // research is reserved for time-sensitive requests above or an explicit
    // request to check the Internet, so a question like "comment tu vas ?"
    // stays instant and does not produce irrelevant source links.
    return { intent: "factual", needsResearch: false, needsConfirmation: false };
  }

  return { intent: "general", needsResearch: false, needsConfirmation: false };
}

const CITY_TIMEZONES: Record<string, string> = {
  "paris": "Europe/Paris",
  "france": "Europe/Paris",
  "londres": "Europe/London",
  "london": "Europe/London",
  "new york": "America/New_York",
  "new-york": "America/New_York",
  "montreal": "America/Toronto",
  "montréal": "America/Toronto",
  "toronto": "America/Toronto",
  "los angeles": "America/Los_Angeles",
  "san francisco": "America/Los_Angeles",
  "mexico": "America/Mexico_City",
  "mexico city": "America/Mexico_City",
  "sao paulo": "America/Sao_Paulo",
  "são paulo": "America/Sao_Paulo",
  "buenos aires": "America/Argentina/Buenos_Aires",
  "reykjavik": "Atlantic/Reykjavik",
  "lisbonne": "Europe/Lisbon",
  "lisbon": "Europe/Lisbon",
  "berlin": "Europe/Berlin",
  "rome": "Europe/Rome",
  "madrid": "Europe/Madrid",
  "athenes": "Europe/Athens",
  "athens": "Europe/Athens",
  "moscou": "Europe/Moscow",
  "moscow": "Europe/Moscow",
  "dubai": "Asia/Dubai",
  "delhi": "Asia/Kolkata",
  "mumbai": "Asia/Kolkata",
  "bangkok": "Asia/Bangkok",
  "singapour": "Asia/Singapore",
  "singapore": "Asia/Singapore",
  "tokyo": "Asia/Tokyo",
  "japon": "Asia/Tokyo",
  "japan": "Asia/Tokyo",
  "séoul": "Asia/Seoul",
  "seoul": "Asia/Seoul",
  "coree du sud": "Asia/Seoul",
  "south korea": "Asia/Seoul",
  "pekin": "Asia/Shanghai",
  "beijing": "Asia/Shanghai",
  "chine": "Asia/Shanghai",
  "china": "Asia/Shanghai",
  "sydney": "Australia/Sydney",
  "australie": "Australia/Sydney",
  "australia": "Australia/Sydney",
  "auckland": "Pacific/Auckland",
  "nouvelle zelande": "Pacific/Auckland",
  "new zealand": "Pacific/Auckland",
};

function frenchPlacePreposition(place: string): string {
  const normalized = normalize(place);
  if (["france", "chine", "australie", "coree du sud", "nouvelle zelande"].includes(normalized)) {
    return "en";
  }
  if (["japon", "mexique"].includes(normalized)) return "au";
  return "à";
}

export function resolveTimeZone(place: string): string | null {
  const normalizedPlace = normalize(place);
  return CITY_TIMEZONES[place] ?? CITY_TIMEZONES[normalizedPlace] ?? (
    /^[a-z]+\/[a-z_]+(?:\/[a-z_]+)?$/i.test(place.trim()) ? place.trim() : null
  );
}

export function isWeatherRequest(text: string): boolean {
  return includesAny(normalize(text), WEATHER_TERMS);
}

export function requestedTimePlace(text: string): string | null {
  const normalized = normalize(text);
  const match = normalized.match(/(?:heure|time)(?: actuelle| locale)?(?:\s+est[- ]il|\s+is it|\s+is)?\s+(?:a|en|in)\s+(.+?)(?=\s+(?:et|and)\s+|[?.!,]|$)/);
  if (match?.[1]?.trim()) return match[1].trim();

  // Prefer the longest name first so "new york" is not partially matched
  // as "york", and normalize aliases such as Montréal/Montréal.
  for (const place of Object.keys(CITY_TIMEZONES).sort((a, b) => b.length - a.length)) {
    if (normalize(place) && normalized.includes(normalize(place))) return place;
  }
  return null;
}

export function currentTimeAnswer(
  text: string,
  fallbackPlace?: string | null,
  language: UserLang = "en",
): string {
  const prompts: Record<UserLang, { askPlace: string; unknownPlace: (place: string) => string; result: (time: string, place: string) => string }> = {
    en: { askPlace: "Which city or country? Reply with its name once and I'll remember it for next time.", unknownPlace: (place) => `I don't know the time zone for **${place}**.`, result: (time, place) => `It's **${time}** in **${place}**.` },
    fr: { askPlace: "Dans quelle ville ou quel pays ? Réponds avec son nom et je le retiendrai pour la prochaine fois.", unknownPlace: (place) => `Je ne connais pas le fuseau horaire de **${place}**.`, result: (time, place) => `Il est **${time}** ${frenchPlacePreposition(place)} **${place}**.` },
    es: { askPlace: "¿En qué ciudad o país?", unknownPlace: (place) => `No conozco la zona horaria de **${place}**.`, result: (time, place) => `Son las **${time}** en **${place}**.` },
    de: { askPlace: "In welcher Stadt oder welchem Land?", unknownPlace: (place) => `Ich kenne die Zeitzone von **${place}** nicht.`, result: (time, place) => `In **${place}** ist es **${time}** Uhr.` },
    pt: { askPlace: "Em qual cidade ou país?", unknownPlace: (place) => `Não conheço o fuso horário de **${place}**.`, result: (time, place) => `São **${time}** em **${place}**.` },
    it: { askPlace: "In quale città o paese?", unknownPlace: (place) => `Non conosco il fuso orario di **${place}**.`, result: (time, place) => `Sono le **${time}** a **${place}**.` },
    ja: { askPlace: "どの都市または国ですか？", unknownPlace: (place) => `**${place}** のタイムゾーンがわかりません。`, result: (time, place) => `**${place}** は **${time}** です。` },
    nl: { askPlace: "Welke stad of welk land?", unknownPlace: (place) => `Ik ken de tijdzone van **${place}** niet.`, result: (time, place) => `Het is **${time}** in **${place}**.` },
    ru: { askPlace: "В каком городе или стране?", unknownPlace: (place) => `Я не знаю часовой пояс **${place}**.`, result: (time, place) => `В **${place}** сейчас **${time}**.` },
    pl: { askPlace: "W jakim mieście lub kraju?", unknownPlace: (place) => `Nie znam strefy czasowej **${place}**.`, result: (time, place) => `W **${place}** jest **${time}**.` },
    tr: { askPlace: "Hangi şehir veya ülke?", unknownPlace: (place) => `**${place}** saat dilimini bilmiyorum.`, result: (time, place) => `**${place}** saat **${time}**.` },
  };
  const localeNames: Record<UserLang, string> = {
    en: "en-GB", fr: "fr-FR", es: "es-ES", de: "de-DE", pt: "pt-PT",
    it: "it-IT", ja: "ja-JP", nl: "nl-NL", ru: "ru-RU", pl: "pl-PL", tr: "tr-TR",
  };
  const place = requestedTimePlace(text) ?? fallbackPlace;
  if (!place) return prompts[language].askPlace;

  const timezone = resolveTimeZone(place);
  if (!timezone) return prompts[language].unknownPlace(place);

  const now = new Date();
  const formatted = new Intl.DateTimeFormat(localeNames[language], {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);

  const displayPlace = place
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  return prompts[language].result(formatted, displayPlace);
}

export function directGreeting(message: Message, language: UserLang = "en"): string {
  const greetings: Record<UserLang, (name: string) => string> = {
    en: (name) => `Hello ${name}! How can I help?`,
    fr: (name) => `Coucou ${name} ! Comment vas-tu ?`,
    es: (name) => `¡Hola ${name}! ¿Cómo puedo ayudarte?`,
    de: (name) => `Hallo ${name}! Wie kann ich dir helfen?`,
    pt: (name) => `Olá, ${name}! Como posso ajudar?`,
    it: (name) => `Ciao ${name}! Come posso aiutarti?`,
    ja: (name) => `${name}さん、こんにちは！何かお手伝いできますか？`,
    nl: (name) => `Hallo ${name}! Hoe kan ik je helpen?`,
    ru: (name) => `Привет, ${name}! Чем могу помочь?`,
    pl: (name) => `Cześć ${name}! Jak mogę pomóc?`,
    tr: (name) => `Merhaba ${name}! Nasıl yardımcı olabilirim?`,
  };
  return greetings[language](message.author.toString());
}

export function directIdentityAnswer(language: UserLang = "en"): string {
  const answers: Record<UserLang, string> = {
    en: "My name is **MaximeGPT** 🤖",
    fr: "Je m’appelle **MaximeGPT** 🤖",
    es: "Me llamo **MaximeGPT** 🤖",
    de: "Ich heiße **MaximeGPT** 🤖",
    pt: "Meu nome é **MaximeGPT** 🤖",
    it: "Mi chiamo **MaximeGPT** 🤖",
    ja: "私の名前は **MaximeGPT** です 🤖",
    nl: "Ik heet **MaximeGPT** 🤖",
    ru: "Меня зовут **MaximeGPT** 🤖",
    pl: "Mam na imię **MaximeGPT** 🤖",
    tr: "Benim adım **MaximeGPT** 🤖",
  };
  return answers[language];
}

export function directCreatorAnswer(language: UserLang = "en"): string {
  const answers: Record<UserLang, string> = {
    en: "I was created and developed by **Maxime**, also known as **Maxim3kun**. I’m the MaximeGPT Discord bot.",
    fr: "J’ai été créé et développé par **Maxime**, connu sous le pseudo **Maxim3kun**. Je suis le bot Discord MaximeGPT.",
    es: "Fui creado y desarrollado por **Maxime**, conocido como **Maxim3kun**. Soy el bot de Discord MaximeGPT.",
    de: "Ich wurde von **Maxime**, auch bekannt als **Maxim3kun**, erstellt und entwickelt. Ich bin der MaximeGPT-Discord-Bot.",
    pt: "Fui criado e desenvolvido por **Maxime**, conhecido como **Maxim3kun**. Sou o bot do Discord MaximeGPT.",
    it: "Sono stato creato e sviluppato da **Maxime**, conosciuto come **Maxim3kun**. Sono il bot Discord MaximeGPT.",
    ja: "**Maxime**（**Maxim3kun**）が開発したDiscordボット、MaximeGPTです。",
    nl: "Ik ben gemaakt en ontwikkeld door **Maxime**, ook bekend als **Maxim3kun**. Ik ben de MaximeGPT-Discordbot.",
    ru: "Меня создал и разработал **Maxime**, также известный как **Maxim3kun**. Я Discord-бот MaximeGPT.",
    pl: "Stworzył mnie i rozwija **Maxime**, znany także jako **Maxim3kun**. Jestem botem Discord MaximeGPT.",
    tr: "Beni **Maxime**, diğer adıyla **Maxim3kun**, oluşturup geliştirdi. Ben MaximeGPT Discord botuyum.",
  };
  return answers[language];
}

export function directCapabilitiesAnswer(language: UserLang = "en"): string {
  const answers: Record<UserLang, string> = {
    en: "I’m **MaximeGPT**, created by **Maxime (Maxim3kun)**. I can chat and search the web with sources, run quizzes and mini-games, help with quests, handle voice chat, and play radio or YouTube audio. I can also generate music when Suno is configured. Server admins can configure the prefix, language, welcome messages, and scheduled posts. I can’t assign roles or ban, kick, or mute members on request. Some features require permissions or extra setup. Type `help` with your server’s configured prefix (default: `!help`) for the command list.",
    fr: "Je suis **MaximeGPT**, créé par **Maxime (Maxim3kun)**. Je peux discuter et rechercher sur le Web avec des sources, lancer des quiz et mini-jeux, aider avec les quêtes, participer aux échanges vocaux et lire la radio ou l’audio YouTube. Je peux aussi générer de la musique si Suno est configuré. Les admins peuvent régler le préfixe, la langue, les messages de bienvenue et les messages programmés. Je ne peux pas attribuer de rôles ni bannir, expulser ou muter des membres à la demande. Certaines fonctions nécessitent des permissions ou une configuration. Tape `help` après le préfixe de ton serveur (par défaut : `!help`) pour voir les commandes.",
    es: "Soy **MaximeGPT**, creado por **Maxime (Maxim3kun)**. Puedo conversar y buscar en la web con fuentes, iniciar concursos y minijuegos, ayudar con misiones, participar en voz y reproducir radio o audio de YouTube. También puedo generar música si el Suno está configurado. Los administradores pueden configurar el prefijo, el idioma, los mensajes de bienvenida y los mensajes programados. No puedo asignar roles ni expulsar, banear o silenciar miembros por petición. Algunas funciones requieren permisos o configuración. Escribe `help` con el prefijo configurado en tu servidor (por defecto: `!help`) para ver los comandos.",
    de: "Ich bin **MaximeGPT**, erstellt von **Maxime (Maxim3kun)**. Ich kann chatten, mit Quellen im Web suchen, Quizze und Minispiele starten, bei Quests helfen, Sprachfunktionen nutzen sowie Radio oder YouTube-Audio abspielen. Mit eingerichtetem Suno kann ich auch Musik generieren. Admins können Präfix, Sprache, Begrüßungen und geplante Nachrichten konfigurieren. Ich kann auf Anfrage keine Rollen vergeben oder Mitglieder bannen, kicken oder stummschalten. Einige Funktionen benötigen Berechtigungen oder zusätzliche Einrichtung. Gib `help` mit dem Serverpräfix ein (Standard: `!help`), um die Befehle zu sehen.",
    pt: "Sou o **MaximeGPT**, criado por **Maxime (Maxim3kun)**. Posso conversar e pesquisar na Web com fontes, iniciar quizzes e minijogos, ajudar com missões, participar de conversas por voz e reproduzir rádio ou áudio do YouTube. Também posso gerar música se o Suno estiver configurado. Administradores podem configurar prefixo, idioma, mensagens de boas-vindas e mensagens agendadas. Não posso atribuir cargos nem banir, expulsar ou silenciar membros a pedido. Alguns recursos exigem permissões ou configuração. Use `help` com o prefixo configurado no servidor (padrão: `!help`) para ver os comandos.",
    it: "Sono **MaximeGPT**, creato da **Maxime (Maxim3kun)**. Posso chattare e cercare sul Web con fonti, avviare quiz e minigiochi, aiutare con le missioni, partecipare alla chat vocale e riprodurre radio o audio YouTube. Posso anche generare musica se Suno è configurato. Gli amministratori possono configurare prefisso, lingua, messaggi di benvenuto e messaggi programmati. Non posso assegnare ruoli né bannare, espellere o silenziare membri su richiesta. Alcune funzioni richiedono autorizzazioni o configurazione. Digita `help` con il prefisso configurato nel server (predefinito: `!help`) per vedere i comandi.",
    ja: "**Maxime（Maxim3kun）**が作成したMaximeGPTです。会話、出典付きWeb検索、クイズやミニゲーム、クエスト支援、音声チャット、ラジオやYouTube音声の再生ができます。Sunoの設定があれば音楽も生成できます。管理者はプレフィックス、言語、歓迎メッセージ、予約投稿を設定できます。依頼に応じてロールを付与したり、メンバーをBAN・キック・ミュートしたりはできません。一部機能には権限や追加設定が必要です。コマンド一覧はサーバー設定のプレフィックスと`help`（初期値は`!help`）で確認できます。",
    nl: "Ik ben **MaximeGPT**, gemaakt door **Maxime (Maxim3kun)**. Ik kan chatten, met bronnen op het web zoeken, quizzen en minigames starten, helpen met quests, spraakchat ondersteunen en radio of YouTube-audio afspelen. Met Suno ingesteld kan ik ook muziek genereren. Beheerders kunnen prefix, taal, welkomstberichten en geplande berichten instellen. Ik kan op verzoek geen rollen toewijzen of leden bannen, kicken of dempen. Sommige functies vereisen rechten of extra instellingen. Typ `help` met de ingestelde serverprefix (standaard: `!help`) voor de opdrachten.",
    ru: "Я **MaximeGPT**, созданный **Maxime (Maxim3kun)**. Я могу общаться, искать информацию в интернете с источниками, запускать викторины и мини-игры, помогать с заданиями, работать с голосовым чатом и воспроизводить радио или аудио YouTube. При настройке Suno я также могу создавать музыку. Администраторы могут настраивать префикс, язык, приветствия и запланированные сообщения. Я не могу по запросу назначать роли, банить, исключать или отключать звук участникам. Для некоторых функций нужны права или дополнительная настройка. Введите `help` с префиксом сервера (по умолчанию: `!help`), чтобы посмотреть список команд.",
    pl: "Jestem **MaximeGPT**, stworzonym przez **Maxime (Maxim3kun)**. Mogę rozmawiać, wyszukiwać w sieci ze źródłami, uruchamiać quizy i minigry, pomagać w zadaniach, obsługiwać rozmowy głosowe oraz odtwarzać radio lub dźwięk z YouTube. Po skonfigurowaniu Suno mogę też generować muzykę. Administratorzy mogą ustawiać prefiks, język, powitania i zaplanowane wiadomości. Nie mogę na żądanie nadawać ról ani banować, wyrzucać lub wyciszać członków. Niektóre funkcje wymagają uprawnień lub konfiguracji. Wpisz `help` z prefiksem serwera (domyślnie: `!help`), aby zobaczyć polecenia.",
    tr: "**MaximeGPT**, **Maxime (Maxim3kun)** tarafından oluşturuldu. Sohbet edebilir, kaynaklı web araması yapabilir, quiz ve mini oyunlar başlatabilir, görevlerde yardımcı olabilir, sesli sohbeti kullanabilir ve radyo ya da YouTube sesi oynatabilirim. Suno yapılandırılmışsa müzik de oluşturabilirim. Yöneticiler öneki, dili, karşılama mesajlarını ve zamanlanmış iletileri ayarlayabilir. İstek üzerine rol veremem; üyeleri banlayamam, atamam veya susturamam. Bazı özellikler izin ya da ek yapılandırma gerektirir. Komut listesini görmek için sunucu önekin ve `help` yaz (varsayılan: `!help`).",
  };
  return answers[language];
}
