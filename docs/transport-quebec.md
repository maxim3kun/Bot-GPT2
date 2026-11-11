# Transports du Québec : couverture et limites

Vérification initiale : **11 novembre 2026**. Ce document décrit les sources connues, pas une garantie d’exhaustivité de tous les transporteurs québécois.

## Utilisation

- `!transport` : choisir **France** ou **Québec**, le mode puis la localité.
- `!metro qc Montréal 1` : réseau STM, ligne 1.
- `!bus qc Québec 800` : réseau RTC, parcours 800.
- `!bus qc Trois-Rivières` : choisir le réseau et la ligne.
- `!train qc Montréal 11` : Exo, ligne 11 (abréviation GTFS **VH**).
- `!tram qc Montréal` : **Train léger / tram**, dont le REM (son GTFS déclare le type 0).
- `!bus fr Amiens Beauvais 601` : recherche française directe. Les anciennes syntaxes restent reconnues; sans préfixe territorial, le menu demande France/Québec avant toute recherche.

Le bouton **France / Québec** reste accessible. Une nouvelle recherche conserve le territoire choisi; changer de territoire efface les arrêts, lignes et résultats de l’ancien territoire. Les homonymes incluent leur région ou département.

Au Québec, choisir le réseau **avant** son chargement évite de télécharger les GTFS de toute la province pour une seule demande. Départ et arrivée sont ensuite choisis sur la ligne officielle. Aucun temps de marche, changement de réseau ou correspondance non documentée n’est inventé.

## Provenance et inventaire provincial

Découverte dynamique : [API CKAN de Données Québec](https://www.donneesquebec.ca/recherche/api/3/action/package_search?q=GTFS&rows=100). Pagination bornée et cache d’une heure. Lors de la vérification, ce catalogue renvoyait 22 jeux, dont des archives, des pages HTML et les traversiers. **22 jeux ne signifient pas 22 réseaux exploitables, ni une couverture provinciale exhaustive.**

Les exploitants absents sont complétés par leurs pages officielles et le catalogue ARTM. Les nouveaux domaines ne sont pas automatiquement autorisés. Une ressource non vérifiée est signalée, pas téléchargée sans contrôle.

| Réseau / zone | Source et licence | État constaté |
|---|---|---|
| STM, Montréal : bus et métro | [Données Québec](https://www.donneesquebec.ca/recherche/dataset/vmtl-stm-horaires-planifies-et-trajets-des-bus-et-du-metro), CC BY | Lectures complètes réussies : métro 1 et bus 10; découverte de 99 lignes de bus près du centre. Horaires prévus; accès temps réel non configuré. |
| STL, Laval | [Données Québec](https://www.donneesquebec.ca/recherche/dataset/https-www-stlaval-ca-datas-opendata-gtf_stl-zip), CC BY | ZIP public disponible, vérifié par lecture HTTP partielle. Calendrier et lignes contrôlés à la demande. Temps réel non configuré. |
| RTL, Longueuil | [Données ouvertes RTL](https://www.rtl-longueuil.qc.ca/donnees-ouvertes), conditions RTL | URL courante publiée; redirection vers le domaine officiel `old.rtl-longueuil.qc.ca`, contrôlée à chaque étape. Fraîcheur du calendrier vérifiée à la recherche. Accès Chrono temps réel non configuré. |
| Exo, trains | [Page officielle Exo](https://exo.quebec/fr/a-propos/donnees-ouvertes), CC BY | Lecture complète réussie de la ligne 11/VH depuis Lucien-L’Allier. Les numéros en début du nom officiel sont reconnus en plus des abréviations. Temps réel soumis à un accès développeur non configuré. |
| Exo, Laurentides | [Catalogue provincial](https://www.donneesquebec.ca/recherche/dataset/laurentides-gtfs), CC BY | Flux officiel référencé; lien migré vers le répertoire actuel publié par Exo. Validation à la demande. |
| Exo, Sorel-Varennes | [Catalogue provincial](https://www.donneesquebec.ca/recherche/dataset/sorel-varennes-gtfs), CC BY | Même contrôle à la demande. |
| Exo, Terrebonne-Mascouche | [Catalogue provincial](https://www.donneesquebec.ca/recherche/dataset/terrebonne-mascouche-gtfs), CC BY | Même contrôle à la demande. |
| Exo, Chambly-Richelieu-Carignan | [Catalogue provincial](https://www.donneesquebec.ca/recherche/dataset/chambly-richelieu-carignan-gtfs), CC BY | Utilisation du lien HTTPS actuel publié par Exo, pas de l’ancien lien HTTP. |
| Exo, L’Assomption | [Catalogue provincial](https://www.donneesquebec.ca/recherche/dataset/lassomption-gtfs), CC BY | Flux officiel référencé; validation à la demande. |
| Exo, Sainte-Julie | [Catalogue provincial](https://www.donneesquebec.ca/recherche/dataset/sainte-julie-gtfs), CC BY | Flux officiel référencé; validation à la demande. |
| Exo, La Presqu’Île | [Catalogue provincial](https://www.donneesquebec.ca/recherche/dataset/presquile-gtfs), CC BY | Flux officiel référencé; validation à la demande. |
| Exo, Vallée-du-Richelieu | [Catalogue provincial](https://www.donneesquebec.ca/recherche/dataset/vallee-du-richelieu-gtfs), CC BY | Flux officiel référencé; validation à la demande. |
| Exo, Sud-Ouest | [Catalogue provincial](https://www.donneesquebec.ca/recherche/dataset/sud-ouest-gtfs), CC BY | Flux officiel référencé; validation à la demande. |
| Exo, Le Richelain-Roussillon | [Page officielle Exo](https://exo.quebec/fr/a-propos/donnees-ouvertes), CC BY | Source complémentaire publiée par l’exploitant; validation à la demande. |
| REM | [Catalogue ARTM](https://donnees.artm.quebec/catalogue/dataset/offres-de-service-planifie-du-reseau-express-metropolitain), licence du catalogue | Lecture complète réussie : A1, A3–A1 et A4–A1; heures A1 et arrivées vérifiées. Proposé dans **Train léger / tram** selon le type du GTFS. |
| RTC, Québec | [RTC](https://www.rtcquebec.ca/donnees-ouvertes) et [catalogue](https://www.donneesquebec.ca/recherche/dataset/rtc-gtfs-arrets-et-les-parcours), CC BY / conditions RTC | Lecture complète réussie du parcours 800. Fichier actualisé le 10/11/2026, contrairement à la date ancienne de sa fiche catalogue. Attribution et date affichées. |
| STLévis | [Données ouvertes STLévis](https://www.stlevis.ca/stlevis/donnees-ouvertes) | Lecture complète réussie de L2. La page affiche CC BY 4.0 **et** des conditions commerciales restrictives : vérifier celles-ci avant réutilisation commerciale. Pas d’affirmation de licence commerciale sans réserve. |
| STO, Gatineau | [Page officielle STO](https://www.sto.ca/affaires/espace-developpeurs-donnees-ouvertes/), conditions STO | Lien GTFS public référencé mais inaccessible depuis cet environnement lors des essais. Le menu signale un chargement indisponible, pas une absence de bus. Temps réel soumis à une clé STO non configurée. |
| STS, Sherbrooke | [Données Québec](https://www.donneesquebec.ca/recherche/dataset/transport-sts), CC BY | Lecture complète réussie de la ligne 1. L’URL du catalogue est un répertoire : utiliser son ZIP courant, pas l’archive hiver 2022. TripUpdates et Alerts publics intégrés; prévisions seulement si les flux sont récents et applicables au trajet. |
| STTR, Trois-Rivières | [Données Québec](https://www.donneesquebec.ca/recherche/dataset/gtsf), CC BY | Lecture complète réussie de la ligne 2 et découverte de 37 lignes. Malgré le titre « temps réel », la ressource utilisée est un GTFS d’horaires prévus. |
| Rouyn-Noranda | [Données Québec](https://www.donneesquebec.ca/recherche/dataset/transport-en-commun-gtfs), CC BY | Flux provincial référencé; validation du calendrier à la demande. |
| Salaberry-de-Valleyfield | [Données Québec](https://www.donneesquebec.ca/recherche/dataset/gtfs-stsv), CC BY | Flux provincial référencé; validation à la demande. |
| RimouskiBus | [Données Québec](https://www.donneesquebec.ca/recherche/dataset/transport-collectif), CC BY | Flux courant référencé. Ancien jeu « avant 2022 » exclu. |
| VIA Rail, gares québécoises | [Ressources développeurs VIA Rail](https://www.viarail.ca/en/developer-resources), Licence du gouvernement ouvert Canada 2.0 | Lecture complète réussie d’un train depuis Québec; fichier publié le 02/11/2026. Horaires prévus. Les recherches de localités restent limitées au Québec; une ligne peut continuer hors province. |
| STS, Saguenay | [Planificateur officiel](https://sts.saguenay.ca/planificateur-de-trajet) | Pas de flux GTFS public **vérifié/configuré dans ce bot**. Le planificateur renvoie vers Google Maps/Transit. Réseau visible avec explication et lien, sans inventer d’horaires. |
| RÉGÎM, Gaspésie–Îles-de-la-Madeleine | [Exploitant](https://regim.info/) | Pas de flux officiel exploitable vérifié/configuré; lien et limite visibles. |
| Orléans Express, interurbain | [Exploitant](https://www.orleansexpress.com/fr/) | Pas de flux officiel exploitable configuré; horaires sur le site du transporteur. |
| Intercar, régional | [Exploitant](https://intercar.ca/) | Pas de flux officiel exploitable configuré; horaires sur le site du transporteur. |

Les mentions « validation à la demande » ne prétendent pas qu’un trajet complet a été testé sur chaque réseau. D’autres services régionaux peuvent exister sans figurer au catalogue provincial ou sans flux public utilisable. Les traversiers sont volontairement exclus.

## Géographie et horaires

Les localités viennent de la [Base de données toponymiques du Canada](https://geogratis.gc.ca/services/geoname/fr/geonames.json), limitée à la province 24, aux noms officiels et aux lieux habités. Les doublons municipalité/lieu habité sont regroupés lorsqu’ils désignent la même localité et région; les homonymes distincts restent proposés.

Les emprises régionales servent seulement à présélectionner les réseaux, **pas à prouver une desserte**. Celle-ci exige de vrais arrêts géolocalisés, des courses et des calendriers du GTFS choisi. Un nouvel exploitant du catalogue sans emprise connue reste sélectionnable, mais n’est pas téléchargé automatiquement.

Chaque GTFS conserve son fuseau IANA : les sources consultées utilisent notamment `America/Montreal` et `America/Toronto`; les autres fuseaux restent possibles. Pas de décalage fixe avec la France. Les exceptions, services après minuit et changements d’heure restent appliqués.

Les fréquences `exact_times=1` produisent les départs prévus correspondants. Une fréquence non exacte ne produit **pas** des heures précises inventées : le résultat indique cette limite. Une arrivée calculée reste une approximation distincte, jamais une garantie de correspondance.

## Données volumineuses, sécurité et fraîcheur

- Index géographique d’arrêts séparé, lectures HTTP partielles et téléchargements limités au réseau choisi; la découverte n’est pas utilisée comme horaire de voyage.
- Pour les sources permettant les lectures partielles : sous-ensembles de ligne complets, filtrés sur les services des sept prochains jours et le jour de service précédent. Ce filtrage élimine les anciennes versions saisonnières sans changer les règles de service : le parcours 800 RTC passe ainsi sous le budget d’index.
- Contrôles de version du ZIP, CRC, tailles, redirections, domaines et concurrence. Pas de désactivation TLS pour faire fonctionner un exploitant inaccessible.
- Repli ZIP borné pour les petits serveurs sans HTTP Range; HTML, répertoires et pages d’accès ne sont pas des horaires.
- Identifiants, fournisseurs et clés de cache séparés par territoire. **Aucun jeton PRIM n’est envoyé au Québec.**
- Caches mémoire bornés : 80 Mio de fichiers, six index géographiques, trois index de lignes; aucun ZIP volumineux enregistré dans Git.
- Dates catalogue et dates des données distinguées. La date HTTP du fichier est privilégiée lorsqu’elle est disponible. Un calendrier expiré ou sans service prochain est signalé, pas présenté comme une preuve d’absence de transports.
- Les flux GTFS-RT doivent être récents; annulations et arrêts sautés sont exclus. Les alertes Sherbrooke sont limitées à la ligne, l’arrêt, la course et la période concernés. En cas de panne, les fermetures connues sont conservées temporairement avec avertissement de couverture indisponible.

## Vérification

`pnpm --filter @workspace/api-server run typecheck`

`pnpm --filter @workspace/api-server run test:transport`

Ces contrôles incluent la France, les menus Discord simulés, l’isolation territoriale, les liens refusés, les pannes, calendriers, fréquences, changements d’heure et alertes. Les lectures publiques réelles ci-dessus n’envoient aucun message Discord et ne configurent aucun compte ni accès payant.
