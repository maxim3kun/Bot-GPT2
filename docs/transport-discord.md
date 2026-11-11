# Rechercher un transport dans Discord

Les commandes n’appellent pas l’IA. Elles utilisent les catalogues et les fichiers officiels des réseaux de France et du Québec.

Sans préfixe territorial, choisir **France** ou **Québec** avant la recherche. Les syntaxes françaises restent reconnues; `fr` et `qc` permettent de choisir directement le territoire, par exemple `!bus fr Amiens Beauvais 601` ou `!metro qc Montréal 1`. Au Québec, sélectionner ensuite le réseau évite de charger toute la province. Le bouton **France / Québec** permet de changer de territoire sans conserver les anciens arrêts.

Voir la [couverture québécoise, les licences et les limites par réseau](transport-quebec.md), dont les sources encore indisponibles et les accès temps réel non configurés.

## Commandes

- `!transport` : choisir le mode, puis saisir la commune.
- `!bus Breteuil` : choisir **Breteuil — 60, Oise, Hauts-de-France** ou **Breteuil — 27, Eure, Normandie**, puis la ligne.
- `!bus Breteuil (60)` : préciser le département dès le départ.
- `!metro Toulouse` : afficher les lignes de métro repérées près du centre de la commune.
- `!metro ligne 8 Paris`, `!metro Paris ligne 8` ou `!metro Paris 8` : charger la ligne 8 depuis les horaires officiels d’Île-de-France Mobilités.
- `!tram <commune>` et `!train <commune>` : utiliser le même parcours pour les autres modes.
- `!bus Beauvais Amiens 601` ou `!bus Beauvais vers Amiens 601` : présélectionner la ligne et placer les arrêts de la destination en premier, sans masquer les arrêts intermédiaires.

Le préfixe du serveur remplace `!` s’il a été personnalisé.

## Parcours

1. Choisir la commune quand plusieurs portent le même nom. Le choix géographique est conservé pendant toute la recherche.
2. Choisir une ligne. Les grandes listes sont paginées et disposent d’une recherche.
3. Choisir l’arrêt de départ.
4. Choisir un arrêt d’arrivée réellement desservi après le départ, sur la même ligne.
5. Consulter les prochains départs et leur arrivée : temps réel, prévue, approximative (`≈`) ou explicitement indisponible.

Le menu appartient à la personne qui a lancé la commande. Il propose des retours, une annulation et une expiration après cinq minutes. Une nouvelle recherche dans le même salon remplace son ancien menu.

Les quais rattachés à une même gare par le champ officiel `parent_station` sont regroupés dans les choix. Les résultats précisent l’arrêt/quai de départ lorsqu’un choix couvre plusieurs quais. Des noms proches ou des coordonnées voisines ne suffisent pas à regrouper des arrêts.

Les trajets directs s’affichent dans une carte Discord compacte : départ et arrivée, quai commun indiqué une seule fois, puis horaires regroupés par jour avec durée du trajet. Trois départs sont visibles par défaut. **Plus d’horaires** en affiche jusqu’à six sans nouvelle requête; **Actualiser** recharge les estimations. Si le serveur refuse les liens intégrés (embeds), le bot conserve une version texte compacte et les mêmes commandes.

La mention **Embarquement** n’apparaît pas si elle répète le départ ou l’arrivée (accents, casse et ponctuation ignorés). Un quai distinct reste indiqué, même si un seul quai est associé à l’arrêt.

Quand un départ temps réel n’a pas d’arrivée opérateur, une durée officielle peut fournir une arrivée **approximative**, par exemple `11:35 → ≈ 11:42 · ≈ 7 min`. Le pied de carte précise **Départs temps réel · ≈ arrivée approximative**; les horaires prévus restent identifiés comme tels. Sans référence compatible, la ligne affiche **arrivée indisponible**.

Ce calcul ne remplace jamais l’arrivée brute et ne sert pas à valider une correspondance. Une course GTFS connue utilise uniquement son propre service. Un véhicule SIRI distinct exige un terminus officiel compatible et un parcours publié non ambigu : aucun emprunt à une autre branche ou à un express. Les calendriers et exceptions sont respectés, y compris les services après minuit et les changements d’heure. La durée provient du départ publié le plus proche, dans une fenêtre de six heures, avec un maximum de 24 heures de trajet; la fourchette des durées compatibles est conservée pour les fermetures. Les courses signalées annulées sont exclues des références.

Les recherches géographiques ne sont pas effectuées deux fois pour une commande avec deux communes. Une source qui vient d’échouer n’est pas retéléchargée pendant une minute; elle reste signalée comme indisponible. Une ligne ciblée trouvée reste en cache cinq minutes même si un autre réseau a échoué; une liste générale partielle est réévaluée plus vite.

## Limites et fiabilité

- Les trajets directs et une correspondance avec délai officiel publié sont proposés dans une même source. Le bot ne calcule pas d’itinéraire porte-à-porte ni de marche inventée entre réseaux.
- Une demande avec numéro de ligne s’arrête à la première source officielle qui dessert cette ligne près du départ. Elle ne prétend pas recenser tous les réseaux portant ce numéro. Sans numéro, la recherche reste générale.
- La découverte initiale porte sur les arrêts proches du centre de la commune, pas sur l’intégralité de son territoire.
- Les estimations ne sont dites « temps réel » que si elles proviennent d’un flux récent et exploitable. Sinon, les horaires disponibles sont étiquetés **théoriques**.
- Pour un trajet direct sans départ dans les 24 heures, la recherche théorique s’étend à sept jours et indique les dates. Les exceptions du calendrier (jours fériés, vacances, suppressions) restent respectées. L’absence de résultat est attribuée aux données publiées, pas à l’inexistence de la ligne.
- Les annulations et les arrêts non desservis signalés par un flux récent sont exclus des résultats de ce trajet.
- Une source défaillante n’efface pas les autres réseaux trouvés. Une liste partielle le signale.
- Les téléchargements, les analyses et les caches ont des limites de concurrence et de taille pour éviter de saturer le bot. Une source trop volumineuse ou non autorisée peut rester indisponible; aucune ligne n’est inventée pour la remplacer.
- Les petits réseaux sont chargés avant les grandes bases nationales. Le lien direct de l’exploitant est utilisé lorsqu’il est publié et autorisé, avec repli sur le lien du catalogue; les deux chemins gardent les mêmes contrôles de sécurité.
- Une recherche qui dépasse 45 secondes ferme son menu avec un message explicite; elle ne peut pas écraser ce message avec une réponse tardive.

## Métro parisien

Le ZIP global d’Île-de-France Mobilités dépasse la limite habituelle de téléchargement. Le bot lit ses tables utiles par plages HTTP, vérifie que la version du fichier reste identique et contrôle les tailles et les sommes de contrôle. Les formes géographiques et les tables d’extension ne sont pas téléchargées. Les lignes, courses, calendriers et arrêts utiles sont conservés sous forme d’un petit GTFS compatible avec le moteur existant, sans charger le ZIP complet.

Sans numéro de ligne, la première étape ne garde que les preuves de desserte près de la commune pour proposer une liste. Après le choix d’une ligne, ses courses complètes sont chargées séparément : ce résumé de découverte n’est jamais utilisé pour calculer des horaires.

Le premier chargement peut prendre quelques dizaines de secondes; les données et les index sont ensuite réutilisés en cache. Pour cette grande source, seuls les trajets directs sont proposés : les correspondances restent explicitement non calculées. Les autres réseaux conservent leur prise en charge habituelle des correspondances publiées.

### Perturbations et prochains passages IDFM

Le processus exécutant le bot doit recevoir le secret `IDFM_PRIM_API_KEY`, obtenu dans le portail officiel [PRIM](https://prim.iledefrance-mobilites.fr). Le configurer dans l’environnement de développement ne configure pas un autre hébergeur tel que Railway. Ne jamais publier sa valeur dans le code, les commandes ou les journaux.

- Les messages Info Trafic officiels sont consultés pour la ligne choisie. Les identifiants précis de quai/station et les périodes d’application déterminent les montées et descentes à exclure, dans les menus puis à nouveau au calcul. Une fermeture de quai ne ferme pas automatiquement les autres lignes de la même station. Un trajet traversant une station sans y monter ni y descendre reste possible si la source ne signale pas une interruption de ligne.
- Une interruption bloquante dont le périmètre ou le calendrier particulier ne sont pas pris en charge interdit de confirmer le trajet; elle n’est pas transformée arbitrairement en fermeture de toutes les stations. Les alertes non bloquantes concernant les arrêts choisis restent visibles.
- Les prochains passages SIRI sont filtrés par ligne, quai, destination officielle et fraîcheur. L’arrivée opérateur n’est associée que si le même véhicule daté est identifié à destination. Une arrivée manquante reste inconnue dans les données brutes; seul l’affichage peut ajouter une approximation `≈` séparée et identifiée, selon les règles ci-dessus.
- Les passages explicitement supprimés ne réapparaissent pas comme des départs théoriques. Sans estimation exploitable, les horaires prévus sont clairement étiquetés **théoriques**. Sans accès aux alertes, le résultat indique que la desserte n’est pas confirmée; une panne ne supprime pas immédiatement les fermetures récemment connues.

Les requêtes sont limitées, mutualisées et mises en cache brièvement. Le jeton est envoyé uniquement au domaine officiel PRIM, sans redirection. Aucun test ne doit envoyer de vrais messages Discord pour vérifier ces services : utiliser les réponses simulées et des lectures des API officielles.

## Diagnostic sur Railway

Les modifications locales et le redémarrage du serveur de développement ne prouvent pas que Railway exécute cette version.

Dans les journaux de la version déployée :

- `Transport command received` confirme que la commande a atteint le module.
- `Transport routes loaded` donne le nombre de lignes trouvées et de sources indisponibles.
- `Transport browser source unavailable` et `Transport menu lookup failed` identifient une erreur de source ou un dépassement de délai.

Si aucune réponse d’attente ni trace de réception n’apparaît, vérifier la version déployée, le préfixe, la réception des messages Discord et les droits d’écriture du bot avant d’accuser les données de transport. Ne jamais partager de jetons ou de secrets dans les journaux envoyés pour diagnostic.
