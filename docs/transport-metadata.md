# Découverte régionale, retour et cache public

## Parcours Discord

- `!bus Normandie` et « Dis moi les bus en Normandie @bot » utilisent le même parcours natif.
- France/Québec apparaît au début de la recherche, puis uniquement via **Nouvelle recherche**.
- Région → sources/réseaux → lignes → départ → arrivée → passages. Les listes sont paginées et filtrables.
- Les régions sont résolues par identifiants administratifs officiels : région, départements et EPCI. Aucun point central de région n'est utilisé.
- Les sources agrégeant plusieurs réseaux sont explicitement signalées ; elles peuvent recouvrir les sources opérateurs. Deux jeux publiant les mêmes URL GTFS ne sont pas présentés comme deux réseaux indépendants.
- Les résultats proposent **Actualiser**, **Retour**, un seul **Modifier**, ainsi que les horaires supplémentaires disponibles et la source.
- **Modifier** recommence le choix des extrémités. **Retour** cherche réellement B → A, y compris les quais opposés liés par `parent_station` et les variantes de ligne officiellement publiées. Aucun appariement par proximité ou nom seul n'est ajouté.
- Un retour non vérifiable, fermé ou sans service au calendrier publié n'est pas fabriqué. Les perturbations et les prédictions restent vérifiées par le circuit existant.
- Les cartes contrôlent le propriétaire, l'autorisation et leur révision ; un double clic ou un clic sur une ancienne liste ne peut pas choisir une autre étape.

## Séparation des données

La collection MongoDB `public_transport_metadata` conserve exclusivement des DTO publics projetés selon une liste fermée :

- catalogue : noms, identifiants, couverture, licences, URL publiques, modes et versions des ressources ;
- références administratives ;
- listes d'arrêts et identifiants publics ;
- références de lignes et associations structurelles aux arrêts, sans course, calendrier ni heure.

Ni `JourneyIndex`, ni `trips`, ni `stop_times`, ni calendriers, prédictions, itinéraires personnels ou ZIP ne sont écrits dans cette collection. Les index et archives nécessaires aux horaires restent temporaires en mémoire, comme auparavant. Le cache météo est inchangé.

Les clés isolent territoire, fournisseur, catégorie, source et version. Au Québec, l'identité du catalogue est fixée avant qu'un téléchargement ne mette à jour la date de modification affichée : cette date ne doit pas produire une autre clé après redémarrage.

Expiration : catalogue France 15 min, Québec 1 h ; références administratives 24 h ; lignes/arrêts d'un réseau 6 h ; découvertes locales 1 h. Un changement d'URL ou de version publiée invalide les références associées. Une liste de lignes est une découverte, pas une preuve de service aujourd'hui.

Limites : 4 Mio par document, 128 entrées et 24 Mio retenus en mémoire ; index TTL et nettoyage borné des anciennes entrées MongoDB. Lectures/opérations de cache limitées à 800 ms, puis source réelle si nécessaire. Les erreurs de source ne sont jamais converties en catalogue vide synthétique. Les résultats ne sont pas tronqués pour rentrer dans la limite.

La découverte régionale lit seulement `routes.txt` du réseau sélectionné par requêtes HTTP Range lorsque le serveur le permet. Le repli sur un ZIP complet n'est que temporaire ; il n'est jamais stocké dans MongoDB. L'indexation et la recherche des horaires ne commencent qu'après le choix d'une ligne.

## Mesures réelles du 11 novembre 2026

Ce sont des observations ponctuelles, pas une garantie de temps de réponse. Les identifiants ont été vérifiés sur les sources publiques courantes.

| Opération | Sans cache partagé, processus neuf | Cache partagé initial | Après redémarrage |
| --- | ---: | ---: | ---: |
| Normandie : découverte des sources (30 sources publiées) | 978 ms, 4 requêtes | 1 208 ms, 4 requêtes | 231 ms, 0 requête aux sources |
| Nomad Car : catalogue des 118 lignes bus | 547 ms, 3 requêtes, ~67 Kio | 1 264 ms, 3 requêtes | 17 ms, 0 requête aux sources |
| Breteuil Eure : ligne 212, découverte locale | 3 333 ms, 4 requêtes, ~44,6 Mio | 3 099 ms, 3 requêtes | 291 ms, 1 requête de référence communale (~124 octets) |

La réutilisation dans le même processus de la découverte régionale et du catalogue des lignes a pris environ **11 ms**, sans requête aux sources. La première écriture MongoDB peut coûter plus cher que la lecture sans cache partagé : le gain est la réutilisation, pas un premier chargement miraculeusement instantané.

Le chargement distinct d'une ligne 212 avec son calendrier et ses passages a pris **4 219 ms**, avec un téléchargement temporaire d'environ **42,1 Mio**. Son résultat était bien étiqueté **horaires théoriques, non temps réel**. Ce coût n'est pas masqué par les mesures du catalogue et ces horaires ne sont pas persistés.

Reproduction depuis `artifacts/api-server` :

```sh
pnpm check:transport:live
pnpm check:transport:live --persistent
pnpm check:transport:live --persistent --schedules
pnpm check:transport:live --local
pnpm check:transport:live --local --persistent
# Exécuter à nouveau dans un nouveau processus pour mesurer la réutilisation MongoDB.
pnpm check:transport:live --local --persistent
pnpm check:transport:live --audit
```

Les vérifications nécessitent le MongoDB déjà configuré. Elles ne déploient rien et n'affichent ni identifiants Discord ni secrets. Le mode sans cache partagé ne lit ni n'écrit la collection de transport.

L'audit des sept documents écrits pendant ces vérifications réelles a confirmé la présence exclusive de champs du schéma public, sans horaires ni identité Discord.

## Vérification automatisée

`pnpm test:transport` inclut la nouvelle suite région/cache/retour. Elle couvre notamment la demande naturelle exacte, le parcours natif, la pagination, les versions et expirations, le redémarrage simulé, l'indisponibilité MongoDB, la projection des champs, les quais opposés, les retours bus/train, les services à sens unique, les fermetures, un calendrier expiré, les doubles clics et les anciennes cartes.

Les autres suites transports et actions IA continuent de couvrir les homonymes, départements, codes postaux, gares, Québec, connexions, perturbations, autorisations et consentements existants. Aucun déploiement Railway n'est inclus.
