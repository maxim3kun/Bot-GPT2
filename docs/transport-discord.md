# Rechercher un transport dans Discord

Les commandes n’appellent pas l’IA. Elles utilisent le catalogue national et les fichiers publiés par les réseaux de transport.

## Commandes

- `!transport` : choisir le mode, puis saisir la commune.
- `!bus Breteuil` : choisir **Breteuil — 60, Oise, Hauts-de-France** ou **Breteuil — 27, Eure, Normandie**, puis la ligne.
- `!bus Breteuil (60)` : préciser le département dès le départ.
- `!metro Toulouse` : afficher les lignes de métro repérées près du centre de la commune.
- `!tram <commune>` et `!train <commune>` : utiliser le même parcours pour les autres modes.
- `!bus Beauvais Amiens 601` ou `!bus Beauvais vers Amiens 601` : présélectionner la ligne et filtrer les propositions d’arrivée.

Le préfixe du serveur remplace `!` s’il a été personnalisé.

## Parcours

1. Choisir la commune quand plusieurs portent le même nom. Le choix géographique est conservé pendant toute la recherche.
2. Choisir une ligne. Les grandes listes sont paginées et disposent d’une recherche.
3. Choisir l’arrêt de départ.
4. Choisir un arrêt d’arrivée réellement desservi après le départ, sur la même ligne.
5. Consulter les prochains départs et, quand elles sont disponibles, les heures d’arrivée.

Le menu appartient à la personne qui a lancé la commande. Il propose des retours, une annulation et une expiration après cinq minutes. Une nouvelle recherche dans le même salon remplace son ancien menu.

## Limites et fiabilité

- Il s’agit de **trajets directs**. Le bot ne calcule pas de correspondances ni d’itinéraire porte-à-porte.
- La découverte initiale porte sur les arrêts proches du centre de la commune, pas sur l’intégralité de son territoire.
- Les estimations ne sont dites « temps réel » que si elles proviennent d’un flux récent et exploitable. Sinon, les horaires disponibles sont étiquetés **théoriques**.
- Les annulations et les arrêts non desservis signalés par un flux récent sont exclus des résultats de ce trajet.
- Une source défaillante n’efface pas les autres réseaux trouvés. Une liste partielle le signale.
- Les téléchargements, les analyses et les caches ont des limites de concurrence et de taille pour éviter de saturer le bot. Une source trop volumineuse ou non autorisée peut rester indisponible; aucune ligne n’est inventée pour la remplacer.
- Une recherche qui dépasse 45 secondes ferme son menu avec un message explicite; elle ne peut pas écraser ce message avec une réponse tardive.

## Diagnostic sur Railway

Les modifications locales et le redémarrage du serveur de développement ne prouvent pas que Railway exécute cette version.

Dans les journaux de la version déployée :

- `Transport command received` confirme que la commande a atteint le module.
- `Transport routes loaded` donne le nombre de lignes trouvées et de sources indisponibles.
- `Transport browser source unavailable` et `Transport menu lookup failed` identifient une erreur de source ou un dépassement de délai.

Si aucune réponse d’attente ni trace de réception n’apparaît, vérifier la version déployée, le préfixe, la réception des messages Discord et les droits d’écriture du bot avant d’accuser les données de transport. Ne jamais partager de jetons ou de secrets dans les journaux envoyés pour diagnostic.
