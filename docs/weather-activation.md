# Activation de la météo MET Norway

L’intégration est désactivée par défaut dans le code. Un responsable humain doit
consulter et accepter les [conditions actuelles de MET Norway](https://api.met.no/doc/TermsOfService).
L’assistant ne peut pas accepter ces conditions à sa place.

## Décision reçue pour cette installation

Le 11 novembre 2026, le responsable du projet a explicitement répondu **oui**
au formulaire « Acceptes-tu les conditions de MET Norway ? », puis a fourni le
lien public du dépôt de ce bot comme contact. Les paramètres de cette
installation ont été renseignés **après cette réponse**, avant les appels de
vérification réels. Il ne s’agit donc pas d’une acceptation décidée par l’assistant.

Les paramètres non secrets sont :

- `MET_WEATHER_TERMS_ACCEPTED` : `true` uniquement après l’accord explicite du responsable ;
- `MET_WEATHER_CONTACT_URL` : une vraie page publique de contact ou le dépôt du projet.

Cet accord ne dispense pas un autre exploitant d’accepter les conditions pour
sa propre installation. Ne pas activer automatiquement un nouveau déploiement
pour un autre responsable. Aucun déploiement Railway n’a été lancé dans le cadre
de cet ajout.

## Vérification

`pnpm --filter @workspace/api-server run test:weather` utilise uniquement des
réponses simulées et ne contacte pas le fournisseur.

`pnpm --filter @workspace/api-server run check:weather:live` vérifie la configuration
d’activation, puis les prévisions de Beauvais et Montréal. Le cache partagé évite
de répéter les mêmes appels après un redémarrage. Les données restent des
**prévisions**, pas des observations en temps réel ; leur résumé cite MET Norway
et la licence CC BY 4.0.
