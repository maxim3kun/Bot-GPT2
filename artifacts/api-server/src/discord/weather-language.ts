const en={
  title:"Weather forecast",temperature:"Temperature (available samples)",precipitation:"Precipitation",updated:"Model updated",checked:"checked",covered:"h covered",partial:"partial",
  missingTemperature:"not provided",missingRain:"not provided for this period",arrival:"Journey arrival",arrivalHint:"forecast around this time",summary:"Summary of data from",transitional:"Provider flags a transitional API version.",
  choose:"Which town? Reply to this message with its number, or make a more specific request.",
  which:"Which town would you like the forecast for? Specify France or Québec if needed and reply to this message.",
  noPlace:"No confirmed town found. Specify its name, department or France/Québec in a new weather request.",
  noDestination:"There is no verified journey destination for you in this channel/persona. Which town would you like? Reply to this message.",
  date:"Specify a valid future date/time, such as “tomorrow” or “2026-11-15 at 14:00”. Reply to this message.",
  closed:"Weather search closed.",invalidParameters:"Request one forecast with valid parameters.",failed:"The forecast could not be verified. I won't invent weather data.",
  configuration:"Weather is not activated: the owner must accept MET Norway's terms and provide a real contact URL.",
  unavailable:"The weather source is unavailable. I have no verified forecast to show.",invalid:"Weather data are incomplete or inconsistent; no forecast is confirmed.",
  quota:"The weather source is rate-limiting requests. Try later.",busy:"Too many weather requests are running. Try shortly.",
  horizon:"This period is outside MET Norway's currently available forecast horizon.",stale:"The latest forecast is too old to present as current.",
};
type Words=typeof en;
const fr:Words={
  title:"Prévisions météo",temperature:"Température (points disponibles)",precipitation:"Précipitations",updated:"Modèle actualisé",checked:"consulté",covered:"h couvertes",partial:"partiel",
  missingTemperature:"non communiquée",missingRain:"non communiquées pour cette période",arrival:"Arrivée du trajet",arrivalHint:"prévision autour de cette heure",summary:"Synthèse des données de",transitional:"Version signalée comme transitoire par le fournisseur.",
  choose:"Quelle commune souhaites-tu ? Réponds à ce message avec son numéro, ou reformule avec un lieu plus précis.",
  which:"Pour quelle commune souhaites-tu la météo ? Précise France ou Québec si nécessaire et réponds à ce message.",
  noPlace:"Aucune commune confirmée. Précise son nom, son département ou France/Québec en reformulant la demande météo.",
  noDestination:"Je n’ai pas de destination de trajet vérifiée pour toi dans ce salon/persona. Quelle commune souhaites-tu consulter ? Réponds à ce message.",
  date:"Précise une date et une heure valides, non passées, par exemple « demain » ou « 15/11/2026 à 14h ». Réponds à ce message.",
  closed:"Recherche météo terminée.",invalidParameters:"Demande une seule météo avec des paramètres valides.",failed:"La météo n’a pas pu être vérifiée. Aucune prévision inventée ne sera fournie.",
  configuration:"La météo n’est pas encore activée : le responsable doit valider les conditions MET Norway et renseigner son vrai lien de contact.",
  unavailable:"La source météo est indisponible. Je n’ai pas de prévisions vérifiées à afficher.",invalid:"Les données météo sont incomplètes ou incohérentes ; aucune prévision n’est confirmée.",
  quota:"La source météo limite les demandes. Réessaie plus tard.",busy:"Trop de recherches météo sont en cours. Réessaie dans un instant.",
  horizon:"Cette période dépasse les prévisions actuellement disponibles auprès de MET Norway.",stale:"Les dernières prévisions sont trop anciennes pour être présentées comme actuelles.",
};
const es:Words={
  title:"Previsión meteorológica",temperature:"Temperatura (muestras disponibles)",precipitation:"Precipitaciones",updated:"Modelo actualizado",checked:"consultado",covered:"h cubiertas",partial:"parcial",
  missingTemperature:"no disponible",missingRain:"no disponibles para este período",arrival:"Llegada del viaje",arrivalHint:"previsión para esa hora",summary:"Resumen de datos de",transitional:"El proveedor indica una versión transitoria.",
  choose:"¿Qué municipio? Responde a este mensaje con su número o precisa el lugar.",which:"¿Para qué municipio? Indica Francia o Quebec si es necesario y responde a este mensaje.",
  noPlace:"No se confirmó el municipio. Precisa el nombre, departamento o Francia/Quebec.",noDestination:"No hay un destino de viaje verificado para ti en este canal/persona. ¿Qué municipio? Responde a este mensaje.",
  date:"Indica una fecha futura válida, por ejemplo « 2026-11-15 at 14:00 ». Responde a este mensaje.",closed:"Búsqueda meteorológica cerrada.",
  invalidParameters:"Solicita una sola previsión con parámetros válidos.",failed:"No se pudo verificar la previsión. No inventaré datos.",
  configuration:"El responsable debe aceptar las condiciones de MET Norway y configurar un enlace de contacto real.",
  unavailable:"La fuente meteorológica no está disponible.",invalid:"Los datos son incompletos o incoherentes.",quota:"La fuente limita las solicitudes. Inténtalo más tarde.",busy:"Hay demasiadas consultas. Inténtalo en un momento.",
  horizon:"El período está fuera de las previsiones disponibles de MET Norway.",stale:"La previsión es demasiado antigua para presentarla como actual.",
};
const de:Words={
  title:"Wettervorhersage",temperature:"Temperatur (verfügbare Messpunkte)",precipitation:"Niederschlag",updated:"Modell aktualisiert",checked:"abgerufen",covered:"Std. abgedeckt",partial:"teilweise",
  missingTemperature:"nicht verfügbar",missingRain:"für diesen Zeitraum nicht verfügbar",arrival:"Ankunft der Reise",arrivalHint:"Vorhersage für diese Zeit",summary:"Zusammenfassung der Daten von",transitional:"Der Anbieter meldet eine Übergangsversion.",
  choose:"Welcher Ort? Antworte mit seiner Nummer auf diese Nachricht oder präzisiere den Ort.",which:"Für welchen Ort? Gib bei Bedarf Frankreich oder Québec an und antworte auf diese Nachricht.",
  noPlace:"Kein bestätigter Ort gefunden. Präzisiere Namen, Département oder Frankreich/Québec.",noDestination:"Für dich gibt es in diesem Kanal/Persona kein bestätigtes Reiseziel. Welcher Ort? Antworte auf diese Nachricht.",
  date:"Gib ein gültiges zukünftiges Datum an, etwa „2026-11-15 at 14:00“. Antworte auf diese Nachricht.",closed:"Wettersuche beendet.",
  invalidParameters:"Frage nur eine Vorhersage mit gültigen Angaben ab.",failed:"Die Vorhersage konnte nicht geprüft werden. Ich erfinde keine Wetterdaten.",
  configuration:"Der Betreiber muss den MET-Norway-Bedingungen zustimmen und eine echte Kontaktseite eintragen.",
  unavailable:"Die Wetterquelle ist nicht verfügbar.",invalid:"Die Wetterdaten sind unvollständig oder widersprüchlich.",quota:"Die Quelle begrenzt Anfragen. Versuche es später.",busy:"Zu viele Wetteranfragen. Versuche es gleich erneut.",
  horizon:"Der Zeitraum liegt außerhalb der verfügbaren MET-Norway-Vorhersage.",stale:"Die Vorhersage ist zu alt, um sie als aktuell anzuzeigen.",
};
const pt:Words={
  title:"Previsão meteorológica",temperature:"Temperatura (amostras disponíveis)",precipitation:"Precipitação",updated:"Modelo atualizado",checked:"consultado",covered:"h cobertas",partial:"parcial",
  missingTemperature:"não disponível",missingRain:"não disponível para este período",arrival:"Chegada da viagem",arrivalHint:"previsão para essa hora",summary:"Resumo dos dados de",transitional:"O fornecedor indica uma versão transitória.",
  choose:"Qual município? Responde a esta mensagem com o número ou especifica o local.",which:"Para qual município? Indica França ou Québec se necessário e responde a esta mensagem.",
  noPlace:"Nenhum município confirmado. Especifica o nome, departamento ou França/Québec.",noDestination:"Não há destino verificado para ti neste canal/persona. Qual município? Responde a esta mensagem.",
  date:"Indica uma data futura válida, por exemplo «2026-11-15 at 14:00». Responde a esta mensagem.",closed:"Consulta meteorológica encerrada.",
  invalidParameters:"Pede uma única previsão com parâmetros válidos.",failed:"Não foi possível verificar a previsão. Não inventarei dados.",
  configuration:"O responsável deve aceitar os termos da MET Norway e configurar um contacto público real.",
  unavailable:"A fonte meteorológica está indisponível.",invalid:"Os dados estão incompletos ou incoerentes.",quota:"A fonte limita os pedidos. Tenta mais tarde.",busy:"Há demasiadas consultas. Tenta dentro de um momento.",
  horizon:"O período está fora das previsões disponíveis da MET Norway.",stale:"A previsão é demasiado antiga para ser apresentada como atual.",
};
const it:Words={
  title:"Previsioni meteo",temperature:"Temperatura (campioni disponibili)",precipitation:"Precipitazioni",updated:"Modello aggiornato",checked:"consultato",covered:"ore coperte",partial:"parziale",
  missingTemperature:"non disponibile",missingRain:"non disponibili per questo periodo",arrival:"Arrivo del viaggio",arrivalHint:"previsione per quell'ora",summary:"Sintesi dei dati di",transitional:"Il fornitore segnala una versione transitoria.",
  choose:"Quale comune? Rispondi a questo messaggio con il numero o precisa il luogo.",which:"Per quale comune? Specifica Francia o Québec se necessario e rispondi a questo messaggio.",
  noPlace:"Nessun comune confermato. Specifica nome, dipartimento o Francia/Québec.",noDestination:"Non c'è una destinazione verificata per te in questo canale/persona. Quale comune? Rispondi a questo messaggio.",
  date:"Indica una data futura valida, ad esempio «2026-11-15 at 14:00». Rispondi a questo messaggio.",closed:"Ricerca meteo terminata.",
  invalidParameters:"Richiedi una sola previsione con parametri validi.",failed:"Non è stato possibile verificare le previsioni. Non inventerò dati.",
  configuration:"Il responsabile deve accettare i termini MET Norway e impostare un vero contatto pubblico.",
  unavailable:"La fonte meteo non è disponibile.",invalid:"I dati sono incompleti o incoerenti.",quota:"La fonte limita le richieste. Riprova più tardi.",busy:"Troppe ricerche meteo. Riprova fra poco.",
  horizon:"Il periodo supera le previsioni disponibili di MET Norway.",stale:"Le previsioni sono troppo vecchie per essere presentate come attuali.",
};
export const weatherWords=(language:string)=>({fr,en,es,de,pt,it}[language]??en);
