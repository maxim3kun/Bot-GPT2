import { EmbedBuilder, type Message } from "discord.js";
import {
  CivicSourceError,
  getLegifranceArticle,
  getPublicHolidayCalendar,
  resolveHolidayCountry,
  searchAssemblyVotes,
  searchLegifrance,
  type CivicLanguage,
  type PublicHoliday,
} from "./civic-data.js";

const TEXT: Record<CivicLanguage, {
  votesTitle: string;
  latestVotes: string;
  noVotes: string;
  refreshed: string;
  updating: string;
  sourceUnavailable: string;
  holidayUsage: string;
  countryMissing: string;
  countryAmbiguous: string;
  holidayUnavailable: string;
  holidayDisclaimer: string;
  holidayOfficial: string;
  national: string;
  regional: string;
  legalUsage: string;
  legalNeedsCredentials: string;
  legalNoResults: string;
  legalDisclaimer: string;
  legalUnavailable: string;
  source: string;
  adopted: string;
  rejected: string;
  notAdopted: string;
  for: string;
  against: string;
  abstentions: string;
  version: string;
  state: string;
  region: string;
}> = {
  en: {
    votesTitle: "Assembly votes",
    latestVotes: "Recent official votes",
    noVotes: "No matching vote was found in the current legislature.",
    refreshed: "Vote archive refreshed",
    updating: "Using the last verified archive while a background update runs.",
    sourceUnavailable: "The official source could not be verified right now. No unverified result was shown.",
    holidayUsage: "Usage: `!holidays <country> [year]` — for example `!holidays France 2026`.",
    countryMissing: "I couldn't match that country to a country covered by the public holiday source. Try its two-letter country code.",
    countryAmbiguous: "Several countries match. Choose one of these country codes",
    holidayUnavailable: "No verified holiday records are available for that country and year.",
    holidayDisclaimer: "Nager.Date is a public aggregator; local or sector-specific holidays may be missing.",
    holidayOfficial: "Official GOV.UK bank-holiday calendar.",
    national: "National and public holidays",
    regional: "Regional holidays",
    legalUsage: "Usage: `!law <article number>` (Civil Code by default), `!law <code> article <number>`, or `!law search <topic>`.",
    legalNeedsCredentials: "The official Legifrance API is not connected. Legal answers stay disabled rather than being guessed. PISTE access: https://piste.gouv.fr/api-catalog-sandbox",
    legalNoResults: "No matching official legal text was returned.",
    legalDisclaimer: "General legal information only; this is not legal advice.",
    legalUnavailable: "The official legal source could not be verified. I won't replace it with an unverified answer.",
    source: "Official source",
    adopted: "adopted",
    rejected: "rejected",
    notAdopted: "not adopted",
    for: "For",
    against: "Against",
    abstentions: "Abstentions",
    version: "Version",
    state: "Legal status",
    region: "Region",
  },
  fr: {
    votesTitle: "Votes de l’Assemblée nationale",
    latestVotes: "Derniers scrutins officiels",
    noVotes: "Aucun scrutin correspondant n’a été trouvé dans la législature actuelle.",
    refreshed: "Archive des votes actualisée",
    updating: "Dernière archive vérifiée affichée pendant sa mise à jour en arrière-plan.",
    sourceUnavailable: "La source officielle n’a pas pu être vérifiée. Aucun résultat non vérifié n’est affiché.",
    holidayUsage: "Utilisation : `!feries <pays> [année]` — par exemple `!feries France 2026`.",
    countryMissing: "Je ne trouve pas ce pays dans les données de jours fériés. Essaie son code pays à deux lettres.",
    countryAmbiguous: "Plusieurs pays correspondent. Choisis l’un de ces codes",
    holidayUnavailable: "Aucun jour férié vérifié n’est disponible pour ce pays et cette année.",
    holidayDisclaimer: "Nager.Date est un agrégateur public ; certains jours régionaux ou propres à un secteur peuvent manquer.",
    holidayOfficial: "Calendrier officiel des jours fériés de GOV.UK.",
    national: "Jours fériés nationaux",
    regional: "Jours fériés régionaux",
    legalUsage: "Utilisation : `!loi <numéro d’article>` (Code civil par défaut), `!loi <code> article <numéro>` ou `!loi recherche <sujet>`.",
    legalNeedsCredentials: "L’API officielle de Légifrance n’est pas connectée. Je préfère désactiver les réponses juridiques plutôt que deviner. Accès PISTE : https://piste.gouv.fr/api-catalog-sandbox",
    legalNoResults: "Aucun texte juridique officiel correspondant n’a été renvoyé.",
    legalDisclaimer: "Information juridique générale, pas un conseil juridique.",
    legalUnavailable: "La source juridique officielle n’a pas pu être vérifiée. Je ne la remplace pas par une réponse non vérifiée.",
    source: "Source officielle",
    adopted: "adopté",
    rejected: "rejeté",
    notAdopted: "non adopté",
    for: "Pour",
    against: "Contre",
    abstentions: "Abstentions",
    version: "Version",
    state: "État juridique",
    region: "Région",
  },
  es: {
    votesTitle: "Votaciones de la Asamblea Nacional",
    latestVotes: "Votaciones oficiales recientes",
    noVotes: "No se encontró ninguna votación coincidente en la legislatura actual.",
    refreshed: "Archivo de votaciones actualizado",
    updating: "Mostrando el último archivo verificado mientras se actualiza en segundo plano.",
    sourceUnavailable: "No se pudo verificar la fuente oficial. No se muestran resultados sin verificar.",
    holidayUsage: "Uso: `!holidays <país> [año]`, por ejemplo `!holidays France 2026`.",
    countryMissing: "No encuentro ese país en los datos de festivos. Prueba su código de dos letras.",
    countryAmbiguous: "Coinciden varios países. Elige uno de estos códigos",
    holidayUnavailable: "No hay festivos verificados para ese país y año.",
    holidayDisclaimer: "Nager.Date es un agregador público; pueden faltar festivos locales o sectoriales.",
    holidayOfficial: "Calendario oficial de días festivos de GOV.UK.",
    national: "Festivos nacionales",
    regional: "Festivos regionales",
    legalUsage: "Uso: `!law <número de artículo>` (Código Civil por defecto), `!law <código> article <número>` o `!law search <tema>`.",
    legalNeedsCredentials: "La API oficial de Legifrance no está conectada. Las respuestas legales quedan desactivadas para no inventarlas. Acceso PISTE: https://piste.gouv.fr/api-catalog-sandbox",
    legalNoResults: "No se encontró ningún texto jurídico oficial coincidente.",
    legalDisclaimer: "Información jurídica general, no asesoramiento legal.",
    legalUnavailable: "No se pudo verificar la fuente jurídica oficial. No la sustituiré por una respuesta no verificada.",
    source: "Fuente oficial",
    adopted: "aprobado",
    rejected: "rechazado",
    notAdopted: "no aprobado",
    for: "A favor",
    against: "En contra",
    abstentions: "Abstenciones",
    version: "Versión",
    state: "Estado jurídico",
    region: "Región",
  },
  de: {
    votesTitle: "Abstimmungen der Nationalversammlung",
    latestVotes: "Aktuelle offizielle Abstimmungen",
    noVotes: "In der aktuellen Legislaturperiode wurde keine passende Abstimmung gefunden.",
    refreshed: "Abstimmungsarchiv aktualisiert",
    updating: "Das letzte geprüfte Archiv wird während der Aktualisierung im Hintergrund angezeigt.",
    sourceUnavailable: "Die offizielle Quelle konnte nicht geprüft werden. Es werden keine ungeprüften Ergebnisse angezeigt.",
    holidayUsage: "Verwendung: `!holidays <Land> [Jahr]`, zum Beispiel `!holidays France 2026`.",
    countryMissing: "Dieses Land ist in den Feiertagsdaten nicht auffindbar. Versuche den zweistelligen Ländercode.",
    countryAmbiguous: "Mehrere Länder passen. Wähle einen dieser Codes",
    holidayUnavailable: "Für dieses Land und Jahr sind keine geprüften Feiertage verfügbar.",
    holidayDisclaimer: "Nager.Date ist ein öffentlicher Aggregator; lokale oder branchenspezifische Feiertage können fehlen.",
    holidayOfficial: "Offizieller GOV.UK-Feiertagskalender.",
    national: "Nationale Feiertage",
    regional: "Regionale Feiertage",
    legalUsage: "Verwendung: `!law <Artikelnummer>` (standardmäßig Code civil), `!law <Gesetzbuch> article <Nummer>` oder `!law search <Thema>`.",
    legalNeedsCredentials: "Die offizielle Legifrance-API ist nicht verbunden. Rechtsantworten bleiben deaktiviert, statt geraten zu werden. PISTE-Zugang: https://piste.gouv.fr/api-catalog-sandbox",
    legalNoResults: "Kein passender offizieller Rechtstext gefunden.",
    legalDisclaimer: "Allgemeine Rechtsinformation, keine Rechtsberatung.",
    legalUnavailable: "Die offizielle Rechtsquelle konnte nicht geprüft werden. Ich ersetze sie nicht durch eine ungeprüfte Antwort.",
    source: "Offizielle Quelle",
    adopted: "angenommen",
    rejected: "abgelehnt",
    notAdopted: "nicht angenommen",
    for: "Dafür",
    against: "Dagegen",
    abstentions: "Enthaltungen",
    version: "Fassung",
    state: "Rechtsstatus",
    region: "Region",
  },
  pt: {
    votesTitle: "Votações da Assembleia Nacional",
    latestVotes: "Votações oficiais recentes",
    noVotes: "Nenhuma votação correspondente foi encontrada na legislatura atual.",
    refreshed: "Arquivo de votações atualizado",
    updating: "A mostrar o último arquivo verificado durante a atualização em segundo plano.",
    sourceUnavailable: "Não foi possível verificar a fonte oficial. Nenhum resultado não verificado foi exibido.",
    holidayUsage: "Uso: `!holidays <país> [ano]`, por exemplo `!holidays France 2026`.",
    countryMissing: "Não encontrei esse país nos dados de feriados. Tente o código de duas letras.",
    countryAmbiguous: "Vários países correspondem. Escolha um destes códigos",
    holidayUnavailable: "Não há feriados verificados disponíveis para esse país e ano.",
    holidayDisclaimer: "Nager.Date é um agregador público; feriados locais ou setoriais podem faltar.",
    holidayOfficial: "Calendário oficial de feriados do GOV.UK.",
    national: "Feriados nacionais",
    regional: "Feriados regionais",
    legalUsage: "Uso: `!law <número do artigo>` (Código Civil por padrão), `!law <código> article <número>` ou `!law search <tema>`.",
    legalNeedsCredentials: "A API oficial do Legifrance não está ligada. As respostas jurídicas ficam desativadas para não serem inventadas. Acesso PISTE: https://piste.gouv.fr/api-catalog-sandbox",
    legalNoResults: "Nenhum texto jurídico oficial correspondente foi encontrado.",
    legalDisclaimer: "Informação jurídica geral, não aconselhamento jurídico.",
    legalUnavailable: "Não foi possível verificar a fonte jurídica oficial. Não a substituirei por uma resposta não verificada.",
    source: "Fonte oficial",
    adopted: "aprovado",
    rejected: "rejeitado",
    notAdopted: "não aprovado",
    for: "A favor",
    against: "Contra",
    abstentions: "Abstenções",
    version: "Versão",
    state: "Estado jurídico",
    region: "Região",
  },
  it: {
    votesTitle: "Votazioni dell’Assemblea nazionale",
    latestVotes: "Ultime votazioni ufficiali",
    noVotes: "Nessuna votazione corrispondente nella legislatura attuale.",
    refreshed: "Archivio delle votazioni aggiornato",
    updating: "Mostro l’ultimo archivio verificato durante l’aggiornamento in background.",
    sourceUnavailable: "Impossibile verificare la fonte ufficiale. Nessun risultato non verificato è stato mostrato.",
    holidayUsage: "Uso: `!holidays <paese> [anno]`, ad esempio `!holidays France 2026`.",
    countryMissing: "Paese non trovato nei dati delle festività. Prova il codice di due lettere.",
    countryAmbiguous: "Corrispondono più paesi. Scegli uno di questi codici",
    holidayUnavailable: "Non ci sono festività verificate per quel paese e anno.",
    holidayDisclaimer: "Nager.Date è un aggregatore pubblico; potrebbero mancare festività locali o settoriali.",
    holidayOfficial: "Calendario ufficiale delle festività GOV.UK.",
    national: "Festività nazionali",
    regional: "Festività regionali",
    legalUsage: "Uso: `!law <numero articolo>` (Codice civile per impostazione predefinita), `!law <codice> article <numero>` o `!law search <tema>`.",
    legalNeedsCredentials: "L’API ufficiale di Legifrance non è collegata. Le risposte legali restano disattivate per evitare supposizioni. Accesso PISTE: https://piste.gouv.fr/api-catalog-sandbox",
    legalNoResults: "Nessun testo giuridico ufficiale corrispondente.",
    legalDisclaimer: "Informazioni giuridiche generali, non consulenza legale.",
    legalUnavailable: "Impossibile verificare la fonte giuridica ufficiale. Non la sostituirò con una risposta non verificata.",
    source: "Fonte ufficiale",
    adopted: "approvato",
    rejected: "respinto",
    notAdopted: "non approvato",
    for: "Favorevoli",
    against: "Contrari",
    abstentions: "Astenuti",
    version: "Versione",
    state: "Stato giuridico",
    region: "Regione",
  },
  ja: {
    votesTitle: "国民議会の採決",
    latestVotes: "最近の公式採決",
    noVotes: "現会期に一致する採決は見つかりませんでした。",
    refreshed: "採決データを更新しました",
    updating: "確認済みのデータを表示しながら、バックグラウンドで更新しています。",
    sourceUnavailable: "公式情報を確認できませんでした。未確認の結果は表示しません。",
    holidayUsage: "使い方: `!holidays <国> [年]` 例: `!holidays France 2026`",
    countryMissing: "祝日データで国を特定できません。2文字の国コードを試してください。",
    countryAmbiguous: "複数の国が一致します。次のコードから選んでください",
    holidayUnavailable: "この国と年の確認済み祝日はありません。",
    holidayDisclaimer: "Nager.Date は公開集約データです。地域や業種別の休日が欠ける場合があります。",
    holidayOfficial: "GOV.UK の公式祝日カレンダー。",
    national: "全国の祝日",
    regional: "地域の祝日",
    legalUsage: "使い方: `!law <条文番号>`（既定はフランス民法典）、`!law <法典> article <番号>`、`!law search <テーマ>`",
    legalNeedsCredentials: "公式 Legifrance API が未接続です。推測を避けるため法律回答を無効にしています。PISTE: https://piste.gouv.fr/api-catalog-sandbox",
    legalNoResults: "一致する公式法律文書が見つかりませんでした。",
    legalDisclaimer: "一般的な法律情報であり、法的助言ではありません。",
    legalUnavailable: "公式法律情報を確認できませんでした。未確認の回答で代用しません。",
    source: "公式情報源",
    adopted: "可決",
    rejected: "否決",
    notAdopted: "未採択",
    for: "賛成",
    against: "反対",
    abstentions: "棄権",
    version: "版",
    state: "法的状態",
    region: "地域",
  },
  nl: {
    votesTitle: "Stemmingen in de Nationale Vergadering",
    latestVotes: "Recente officiële stemmingen",
    noVotes: "Geen passende stemming gevonden in de huidige zittingsperiode.",
    refreshed: "Stemarchief bijgewerkt",
    updating: "Het laatst gecontroleerde archief wordt getoond terwijl de achtergrondupdate loopt.",
    sourceUnavailable: "De officiële bron kon niet worden gecontroleerd. Er zijn geen ongecontroleerde resultaten getoond.",
    holidayUsage: "Gebruik: `!holidays <land> [jaar]`, bijvoorbeeld `!holidays France 2026`.",
    countryMissing: "Dit land staat niet in de feestdaggegevens. Probeer de tweecijferige landcode.",
    countryAmbiguous: "Meerdere landen komen overeen. Kies een van deze codes",
    holidayUnavailable: "Geen gecontroleerde feestdagen beschikbaar voor dit land en jaar.",
    holidayDisclaimer: "Nager.Date is een openbare aggregator; lokale of sectorale feestdagen kunnen ontbreken.",
    holidayOfficial: "Officiële GOV.UK-feestdagenkalender.",
    national: "Nationale feestdagen",
    regional: "Regionale feestdagen",
    legalUsage: "Gebruik: `!law <artikelnummer>` (standaard Code civil), `!law <wetboek> article <nummer>` of `!law search <onderwerp>`.",
    legalNeedsCredentials: "De officiële Legifrance-API is niet gekoppeld. Juridische antwoorden blijven uitgeschakeld om gokken te voorkomen. PISTE: https://piste.gouv.fr/api-catalog-sandbox",
    legalNoResults: "Geen overeenkomende officiële wettekst gevonden.",
    legalDisclaimer: "Algemene juridische informatie, geen juridisch advies.",
    legalUnavailable: "De officiële juridische bron kon niet worden gecontroleerd. Ik vervang die niet door een ongecontroleerd antwoord.",
    source: "Officiële bron",
    adopted: "aangenomen",
    rejected: "verworpen",
    notAdopted: "niet aangenomen",
    for: "Voor",
    against: "Tegen",
    abstentions: "Onthoudingen",
    version: "Versie",
    state: "Juridische status",
    region: "Regio",
  },
  ru: {
    votesTitle: "Голосования Национального собрания",
    latestVotes: "Последние официальные голосования",
    noVotes: "В текущем созыве совпадений не найдено.",
    refreshed: "Архив голосований обновлён",
    updating: "Показан последний проверенный архив; обновление выполняется в фоне.",
    sourceUnavailable: "Не удалось проверить официальный источник. Непроверенные результаты не показаны.",
    holidayUsage: "Использование: `!holidays <страна> [год]`, например `!holidays France 2026`.",
    countryMissing: "Страна не найдена в данных о праздниках. Попробуйте двухбуквенный код.",
    countryAmbiguous: "Подходит несколько стран. Выберите один из кодов",
    holidayUnavailable: "Нет проверенных праздников для этой страны и года.",
    holidayDisclaimer: "Nager.Date — публичный агрегатор; местные или отраслевые праздники могут отсутствовать.",
    holidayOfficial: "Официальный календарь GOV.UK.",
    national: "Национальные праздники",
    regional: "Региональные праздники",
    legalUsage: "Использование: `!law <номер статьи>` (по умолчанию Гражданский кодекс Франции), `!law <кодекс> article <номер>` или `!law search <тема>`.",
    legalNeedsCredentials: "Официальный API Legifrance не подключён. Юридические ответы отключены, чтобы не гадать. Доступ PISTE: https://piste.gouv.fr/api-catalog-sandbox",
    legalNoResults: "Подходящий официальный правовой текст не найден.",
    legalDisclaimer: "Общая правовая информация, не юридическая консультация.",
    legalUnavailable: "Не удалось проверить официальный правовой источник. Непроверенным ответом его не заменяю.",
    source: "Официальный источник",
    adopted: "принят",
    rejected: "отклонён",
    notAdopted: "не принят",
    for: "За",
    against: "Против",
    abstentions: "Воздержались",
    version: "Версия",
    state: "Правовой статус",
    region: "Регион",
  },
  pl: {
    votesTitle: "Głosowania Zgromadzenia Narodowego",
    latestVotes: "Najnowsze oficjalne głosowania",
    noVotes: "Nie znaleziono pasującego głosowania w bieżącej kadencji.",
    refreshed: "Archiwum głosowań zaktualizowane",
    updating: "Wyświetlam ostatnie sprawdzone archiwum podczas aktualizacji w tle.",
    sourceUnavailable: "Nie udało się sprawdzić oficjalnego źródła. Nie pokazano niezweryfikowanych wyników.",
    holidayUsage: "Użycie: `!holidays <kraj> [rok]`, na przykład `!holidays France 2026`.",
    countryMissing: "Nie znaleziono kraju w danych o świętach. Spróbuj dwuliterowego kodu.",
    countryAmbiguous: "Pasuje kilka krajów. Wybierz jeden z tych kodów",
    holidayUnavailable: "Brak zweryfikowanych świąt dla tego kraju i roku.",
    holidayDisclaimer: "Nager.Date to publiczny agregator; lokalne lub branżowe święta mogą być pominięte.",
    holidayOfficial: "Oficjalny kalendarz świąt GOV.UK.",
    national: "Święta krajowe",
    regional: "Święta regionalne",
    legalUsage: "Użycie: `!law <numer artykułu>` (domyślnie francuski Kodeks cywilny), `!law <kodeks> article <numer>` lub `!law search <temat>`.",
    legalNeedsCredentials: "Oficjalne API Legifrance nie jest połączone. Odpowiedzi prawne są wyłączone, by uniknąć zgadywania. Dostęp PISTE: https://piste.gouv.fr/api-catalog-sandbox",
    legalNoResults: "Nie znaleziono pasującego oficjalnego tekstu prawnego.",
    legalDisclaimer: "Ogólna informacja prawna, nie porada prawna.",
    legalUnavailable: "Nie udało się sprawdzić oficjalnego źródła prawa. Nie zastąpię go niezweryfikowaną odpowiedzią.",
    source: "Oficjalne źródło",
    adopted: "przyjęto",
    rejected: "odrzucono",
    notAdopted: "nie przyjęto",
    for: "Za",
    against: "Przeciw",
    abstentions: "Wstrzymali się",
    version: "Wersja",
    state: "Status prawny",
    region: "Region",
  },
  tr: {
    votesTitle: "Ulusal Meclis oylamaları",
    latestVotes: "Son resmî oylamalar",
    noVotes: "Mevcut yasama döneminde eşleşen oylama bulunamadı.",
    refreshed: "Oylama arşivi güncellendi",
    updating: "Arka planda güncelleme yapılırken son doğrulanmış arşiv gösteriliyor.",
    sourceUnavailable: "Resmî kaynak doğrulanamadı. Doğrulanmamış sonuç gösterilmedi.",
    holidayUsage: "Kullanım: `!holidays <ülke> [yıl]`, örneğin `!holidays France 2026`.",
    countryMissing: "Tatil verilerinde bu ülkeyi bulamadım. İki harfli ülke kodunu deneyin.",
    countryAmbiguous: "Birden fazla ülke eşleşiyor. Şu kodlardan birini seçin",
    holidayUnavailable: "Bu ülke ve yıl için doğrulanmış tatil kaydı yok.",
    holidayDisclaimer: "Nager.Date herkese açık bir toplayıcıdır; yerel veya sektörel tatiller eksik olabilir.",
    holidayOfficial: "Resmî GOV.UK tatil takvimi.",
    national: "Ulusal tatiller",
    regional: "Bölgesel tatiller",
    legalUsage: "Kullanım: `!law <madde numarası>` (varsayılan Fransız Medeni Kanunu), `!law <kanun> article <numara>` veya `!law search <konu>`.",
    legalNeedsCredentials: "Resmî Legifrance API'si bağlı değil. Tahmin yürütmemek için hukuk yanıtları devre dışı. PISTE erişimi: https://piste.gouv.fr/api-catalog-sandbox",
    legalNoResults: "Eşleşen resmî hukuk metni bulunamadı.",
    legalDisclaimer: "Genel hukuk bilgisi, hukuki tavsiye değildir.",
    legalUnavailable: "Resmî hukuk kaynağı doğrulanamadı. Doğrulanmamış yanıtla değiştirmeyeceğim.",
    source: "Resmî kaynak",
    adopted: "kabul edildi",
    rejected: "reddedildi",
    notAdopted: "kabul edilmedi",
    for: "Lehte",
    against: "Aleyhte",
    abstentions: "Çekimser",
    version: "Sürüm",
    state: "Hukuki durum",
    region: "Bölge",
  },
};

function cleanExternalText(value: string, maxLength = 900): string {
  return value.replace(/<@!?\d+>/g, "@user")
    .replace(/@everyone|@here/g, (match) => `@\u200b${match.slice(1)}`)
    .replace(/([\\`*_~|>])/g, "\\$1")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function cleanLegalText(value: string, maxLength = 3_800): string {
  return value.replace(/<@!?\d+>/g, "@user")
    .replace(/@everyone|@here/g, (match) => `@\u200b${match.slice(1)}`)
    .replace(/([\\`*_~|>])/g, "\\$1")
    .replace(/[ \t]+\n/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}

async function sendTyping(message: Message): Promise<void> {
  const channel = message.channel as typeof message.channel & { sendTyping?: () => Promise<void> };
  await channel.sendTyping?.().catch(() => undefined);
}

function dateText(date: string, language: CivicLanguage): string {
  const value = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(value.getTime())) return date;
  try {
    return new Intl.DateTimeFormat(language, { timeZone: "UTC", dateStyle: "medium" }).format(value);
  } catch {
    return date;
  }
}

function retrievedText(timestamp: number, language: CivicLanguage): string {
  const locale = language === "en" ? "en-GB" : language;
  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone: "UTC",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toISOString();
  }
}

function sourceFooter(source: string, timestamp: number, language: CivicLanguage): string {
  return `${source} · ${retrievedText(timestamp, language)}`.slice(0, 2_048);
}

function translateVoteResult(value: string, language: CivicLanguage): string {
  const normalized = value.trim().normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const copy = TEXT[language];
  if (normalized === "adopte" || normalized.includes("a adopte")) return copy.adopted;
  if (normalized.includes("non adopte")) return copy.notAdopted;
  if (normalized === "rejete" || normalized.includes("a rejete")) return copy.rejected;
  return value ? cleanExternalText(value, 100) : "";
}

async function handleVotes(message: Message, args: string[], language: CivicLanguage): Promise<void> {
  await sendTyping(message);
  try {
    const result = await searchAssemblyVotes(args.join(" ").slice(0, 160));
    const copy = TEXT[language];
    if (!result.votes.length) {
      await message.reply(copy.noVotes);
      return;
    }
    const embed = new EmbedBuilder()
      .setColor(0x315bba)
      .setTitle(copy.votesTitle)
      .setDescription(args.length ? `**${cleanExternalText(args.join(" "), 120)}**` : copy.latestVotes)
      .setFooter({ text: result.stale
        ? `${copy.updating} · ${sourceFooter("Assemblée nationale", result.fetchedAt, language)}`
        : sourceFooter("Assemblée nationale · 17e législature", result.fetchedAt, language) });
    for (const vote of result.votes) {
      const counts = [
        vote.forCount !== undefined ? `${copy.for}: **${vote.forCount}**` : "",
        vote.againstCount !== undefined ? `${copy.against}: **${vote.againstCount}**` : "",
        vote.abstentionCount !== undefined ? `${copy.abstentions}: **${vote.abstentionCount}**` : "",
      ].filter(Boolean).join(" · ");
      const title = `N° ${vote.number} · ${dateText(vote.date, language)}`;
      const description = [
        `**${cleanExternalText(vote.title, 300)}**`,
        vote.result ? `${translateVoteResult(vote.result, language)}${vote.kind ? ` · ${cleanExternalText(vote.kind, 80)}` : ""}` : "",
        counts,
        `[${copy.source}](${`https://www.assemblee-nationale.fr/dyn/${encodeURIComponent(vote.legislature)}/scrutins/${encodeURIComponent(vote.number)}`})`,
      ].filter(Boolean).join("\n");
      embed.addFields({ name: title, value: description.slice(0, 1_024) });
    }
    await message.reply({ embeds: [embed] });
  } catch {
    await message.reply(TEXT[language].sourceUnavailable);
  }
}

const REGION_NAMES: Record<string, Partial<Record<CivicLanguage, string>>> = {
  "England and Wales": {
    fr: "Angleterre et pays de Galles",
    es: "Inglaterra y Gales",
    de: "England und Wales",
    pt: "Inglaterra e País de Gales",
    it: "Inghilterra e Galles",
  },
  Scotland: { fr: "Écosse", es: "Escocia", de: "Schottland", pt: "Escócia", it: "Scozia" },
  "Northern Ireland": {
    fr: "Irlande du Nord",
    es: "Irlanda del Norte",
    de: "Nordirland",
    pt: "Irlanda do Norte",
    it: "Irlanda del Nord",
  },
};

function localizedRegion(region: string, language: CivicLanguage): string {
  return REGION_NAMES[region]?.[language] ?? region;
}

function groupHolidayRows(holidays: PublicHoliday[]): Array<{ title: string; lines: string[] }> {
  const groups = new Map<string, PublicHoliday[]>();
  for (const holiday of holidays) {
    const label = holiday.region ?? (holiday.global ? "national" : "regional");
    groups.set(label, [...(groups.get(label) ?? []), holiday]);
  }
  const result: Array<{ title: string; lines: string[] }> = [];
  for (const [title, rows] of groups) {
    for (let offset = 0; offset < rows.length; offset += 8) {
      result.push({
        title,
        lines: rows.slice(offset, offset + 8).map((holiday) => {
          const name = holiday.localName && holiday.localName !== holiday.name
            ? `${holiday.localName} (${holiday.name})`
            : holiday.localName || holiday.name;
          const location = holiday.counties?.length ? ` — ${holiday.counties.join(", ")}` : "";
          return `• **${holiday.date}** · ${cleanExternalText(name, 100)}${cleanExternalText(location, 100)}`;
        }),
      });
    }
  }
  return result;
}

async function handleHolidays(message: Message, args: string[], language: CivicLanguage): Promise<void> {
  const copy = TEXT[language];
  if (!args.length) {
    await message.reply(copy.holidayUsage);
    return;
  }
  const yearTokenIndex = args.findIndex((arg) => /^\d{4}$/.test(arg));
  const year = yearTokenIndex >= 0 ? Number(args[yearTokenIndex]) : new Date().getUTCFullYear();
  const countryName = args.filter((_, index) => index !== yearTokenIndex).join(" ").trim();
  if (!countryName) {
    await message.reply(copy.holidayUsage);
    return;
  }
  await sendTyping(message);
  try {
    const matches = await resolveHolidayCountry(countryName, language);
    if (!matches.length) {
      await message.reply(copy.countryMissing);
      return;
    }
    if (matches.length > 1) {
      const codes = matches.slice(0, 10).map((country) => `\`${country.countryCode}\` ${cleanExternalText(country.name, 80)}`).join(" · ");
      await message.reply(`${copy.countryAmbiguous}: ${codes}`);
      return;
    }
    const country = matches[0]!;
    const calendar = await getPublicHolidayCalendar(country.countryCode, year);
    const wantsEnglandOnly = ["angleterre", "england"].includes(
      countryName.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim(),
    );
    const rows = wantsEnglandOnly
      ? calendar.holidays.filter((holiday) => holiday.region === "England and Wales")
      : calendar.holidays;
    if (!rows.length) {
      await message.reply(copy.holidayUnavailable);
      return;
    }
    const embed = new EmbedBuilder()
      .setColor(0x248f64)
      .setTitle(`${cleanExternalText(country.name, 100)} · ${year}`)
      .setDescription(calendar.source === "GOV.UK"
        ? copy.holidayOfficial
        : copy.holidayDisclaimer)
      .setFooter({ text: sourceFooter(calendar.source, calendar.fetchedAt, language) });
    for (const group of groupHolidayRows(rows).slice(0, 20)) {
      const title = group.title === "national"
        ? copy.national
        : group.title === "regional"
          ? copy.regional
          : `${copy.region}: ${localizedRegion(group.title, language)}`;
      embed.addFields({ name: title, value: group.lines.join("\n").slice(0, 1_024) || "—" });
    }
    await message.reply({ embeds: [embed] });
  } catch (error) {
    await message.reply(error instanceof CivicSourceError && error.reason === "unsupported"
      ? copy.holidayUnavailable
      : copy.sourceUnavailable);
  }
}

function parseArticleRequest(raw: string): { articleNumber: string; codeName: string } | undefined {
  const match = raw.match(/^(?:(.+?)\s+)?(?:article\s*)?([a-z]?\d+(?:-\d+)*[a-z]?)$/i);
  if (!match) return undefined;
  const prefix = match[1]?.trim() ?? "";
  return {
    codeName: prefix || "Code civil",
    articleNumber: match[2]!,
  };
}

function getLegifranceCredentials(): { clientId: string; clientSecret: string; refreshToken: string } | undefined {
  const clientId = process.env.LEGIFRANCE_CLIENT_ID?.trim();
  const clientSecret = process.env.LEGIFRANCE_CLIENT_SECRET?.trim();
  const refreshToken = process.env.LEGIFRANCE_REFRESH_TOKEN?.trim();
  return clientId && clientSecret && refreshToken ? { clientId, clientSecret, refreshToken } : undefined;
}

async function handleLaw(message: Message, args: string[], language: CivicLanguage): Promise<void> {
  const copy = TEXT[language];
  const query = args.join(" ").trim();
  if (!query) {
    await message.reply(copy.legalUsage);
    return;
  }
  const credentials = getLegifranceCredentials();
  if (!credentials) {
    await message.reply(copy.legalNeedsCredentials);
    return;
  }
  await sendTyping(message);
  try {
    const searchMode = /^(?:search|recherche)\s+/i.test(query);
    if (!searchMode) {
      const parsed = parseArticleRequest(query);
      if (parsed) {
        const article = await getLegifranceArticle(parsed.articleNumber, parsed.codeName, credentials);
        const version = article.versionStart
          ? `${copy.version} ${dateText(article.versionStart, language)}${article.versionEnd ? ` – ${dateText(article.versionEnd, language)}` : ""}`
          : `${copy.version} · ${retrievedText(Date.now(), language)}`;
        const embed = new EmbedBuilder()
          .setColor(0x375ba9)
          .setTitle(`${cleanExternalText(article.codeTitle, 120)} · Article ${cleanExternalText(article.articleNumber, 32)}`)
          .setURL(article.officialUrl)
          .setDescription(cleanLegalText(article.text))
          .addFields({ name: copy.state, value: cleanExternalText(article.state, 100) })
          .setFooter({ text: `${version} · ${copy.legalDisclaimer} · ${copy.source}` });
        await message.reply({ embeds: [embed], allowedMentions: { parse: [] } });
        return;
      }
    }

    const searchTerm = searchMode ? query.replace(/^(?:search|recherche)\s+/i, "").trim() : query;
    if (!searchTerm) {
      await message.reply(copy.legalUsage);
      return;
    }
    const results = await searchLegifrance(searchTerm.slice(0, 160), credentials);
    if (!results.length) {
      await message.reply(copy.legalNoResults);
      return;
    }
    const embed = new EmbedBuilder()
      .setColor(0x375ba9)
      .setTitle("Légifrance")
      .setDescription(copy.legalDisclaimer);
    for (const result of results) {
      const details = [
        result.state ? `${copy.state}: ${cleanExternalText(result.state, 80)}` : "",
        result.date ? `${copy.version}: ${dateText(result.date, language)}` : "",
        result.excerpt ? cleanExternalText(result.excerpt, 700) : "",
        result.officialUrl ? `[${copy.source}](${result.officialUrl})` : "",
      ].filter(Boolean).join("\n");
      embed.addFields({ name: cleanExternalText(result.title, 200), value: (details || copy.legalNoResults).slice(0, 1_024) });
    }
    await message.reply({ embeds: [embed], allowedMentions: { parse: [] } });
  } catch (error) {
    await message.reply(error instanceof CivicSourceError && error.reason === "unsupported"
      ? copy.legalNoResults
      : copy.legalUnavailable);
  }
}

export function isCivicCommand(command: string): boolean {
  return ["vote", "votes", "scrutin", "scrutins", "loi", "droit", "law", "feries", "holiday", "holidays", "jourferie", "joursferies"]
    .includes(command);
}

export async function handleCivicCommand(
  message: Message,
  command: string,
  args: string[],
  language: CivicLanguage,
): Promise<boolean> {
  if (["vote", "votes", "scrutin", "scrutins"].includes(command)) {
    await handleVotes(message, args, language);
    return true;
  }
  if (["feries", "holiday", "holidays", "jourferie", "joursferies"].includes(command)) {
    await handleHolidays(message, args, language);
    return true;
  }
  if (["loi", "droit", "law"].includes(command)) {
    await handleLaw(message, args, language);
    return true;
  }
  return false;
}
