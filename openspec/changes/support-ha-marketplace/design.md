# Design

## Context
- `frontend/src/complements/hacs-client.ts` est le seul code qui appelle HACS. `HacsClient.status()` lit `hacs/info` et rend un `HacsStatus` (`ready`, `absent`, `disabled`, `unsupported`, `broken`) ; `list()` lit `hacs/repositories/list` ; `install()` enchaîne liste, `hacs/repositories/add`, nouvelle liste (HACS répond sans erreur même quand il refuse), `hacs/repository/download`, puis une dernière liste pour lire `status === "pending-restart"`. `unknown_command` sur `hacs/info` donne `absent`.
- `complementsModel` (`model.ts`) garde `hacs: HacsStatus`, `repositories: HacsRepository[]` et `hacsFailure`, lit la boutique après le catalogue et appelle `load()` de nouveau après une installation : le serveur relit alors le manifeste de l'intégration (`async_get_integration`), donc `ha.config_flow` est connu sans redémarrage quand Home Assistant a rechargé ses intégrations personnalisées.
- `complements-page.ts` affiche `hacsNotice()` (textes `hacs.*`, lien `HACS_DOCUMENTATION`), les liens `hacsLink()` (`/hacs/repository/<id>`) et l'action `action.open_hacs`.
- La Marketplace de Home Assistant 2026.11.0 (`homeassistant/components/marketplace/websocket/`) a été lue dans le devcontainer :
  - `marketplace/info` rend `version`, `categories`, `disabled_reason`, `stage`, `startup`, plus `warning_accepted` (pour l'utilisateur de la connexion) et `github_connected`.
  - `marketplace/repositories/list` (`categories` optionnel) rend les mêmes champs que HACS pour ce que lit le dashboard (`id`, `full_name`, `category`, `installed`, `status`, `installed_version`, `available_version`, `config_flow`), avec les mêmes valeurs de `status` (`new`, `pending-restart`, `pending-upgrade`, `installed`, `default`). Seuls les dépôts déjà lus (`last_fetched`) sont listés.
  - `marketplace/repositories/add` (`repository`, `category`) exige l'avertissement accepté et GitHub connecté ; un refus est une vraie erreur (`add_failed`, `repository_exists`, `invalid_category`, `core_repository`, `app_repository`).
  - `marketplace/repository/install` (`repository` = id, `version` et `confirm_replace_built_in` optionnels) remplace `hacs/repository/download` ; il exige l'avertissement accepté. Erreurs propres : `replaces_built_in`, `github_rate_limited`, `repository_not_found`.
  - Toute commande répond `not_loaded` quand l'entrée de la Marketplace n'est pas chargée, `warning_not_accepted` et `github_not_connected` selon les gardes ci-dessus.
  - Après l'installation d'une intégration qui déclare un config flow et que le chargeur ne connaissait pas, la Marketplace recharge les intégrations personnalisées et ne met pas `pending-restart`. Sinon elle met `pending-restart` et crée une réparation.
  - Le panneau est `/marketplace` ; `/hacs` et `/hacs/{tail}` redirigent vers `/marketplace/{tail}`.
- Le contrat HACS est vérifié par `tests/test_hacs_contract.py`, qui exécute les vrais gestionnaires de `external/hacs` et écrit `shared/hacs-answers.json`, rejoué par `frontend/test/hacs-contract.test.ts`.
- Le bandeau : `renderAlert()` (`components/ha.ts`) rend `ha-alert` quand il est défini, sinon `<div class="alert …">`, avec la même classe. Les règles `.banner`, `.banner.warning`, `.banner.error` de `complements-page.ts` ajoutent bordure, marge intérieure et rayon aux deux. `panel.ts` limite déjà ces règles au `div` de repli pour `.readonly` et `.missing`.

## Goals / Non-Goals

**Goals:**
- Un seul adaptateur, testé contre les réponses enregistrées de la vraie Marketplace et du vrai HACS.
- Aucun changement de comportement sur Home Assistant 2026.10 et avant avec HACS.
- Aucun changement du format du catalogue ni de la commande `vtherm_dashboard/get_complements`.

**Non-Goals:**
- Accepter l'avertissement de la Marketplace ou connecter GitHub depuis le dashboard : ce sont des décisions de l'administrateur, prises dans la Marketplace.
- Gérer `confirm_replace_built_in` : aucun complément du catalogue ne remplace une intégration intégrée. Si la Marketplace répond `replaces_built_in`, l'erreur est affichée comme une autre, avec le lien vers la Marketplace.
- Faire les mises à jour par le dashboard (`update_entity_id`, `marketplace/repository/install` sur un dépôt installé) : elles restent dans la boutique, comme aujourd'hui.
- S'abonner aux événements de la Marketplace (`marketplace/subscribe`) : la page relit l'état à chaque ouverture, comme avec HACS.
- Renommer le champ `hacs_category` du catalogue ou de l'API WebSocket.

## Decisions

### 1. Un client unique paramétré par la boutique
`hacs-client.ts` devient `store-client.ts`, qui exporte `StoreClient` et `detectStore(hass)`. Une boutique est décrite par un objet constant :

```ts
interface StoreBackend {
  readonly kind: "marketplace" | "hacs";
  readonly info: string;            // "marketplace/info" | "hacs/info"
  readonly list: string;            // ".../repositories/list"
  readonly add: string;             // ".../repositories/add"
  readonly install: string;         // "marketplace/repository/install" | "hacs/repository/download"
  readonly panel: string;           // "/marketplace" | "/hacs"
}
```

Les réponses lues sont identiques pour les deux boutiques (champs et valeurs de `status`), donc la lecture (`toRepository`), l'enchaînement de l'installation et la déduction du redémarrage sont partagés. Seuls les noms de commandes, le chemin du panneau et la lecture des prérequis propres à la Marketplace changent.
- *Alternative écartée* : deux classes derrière une interface, comme le suggère l'issue. Elles dupliqueraient l'enchaînement de l'installation et sa vérification, qui sont la partie la plus délicate, pour une différence de quatre chaînes.
- Les types `HacsRepository`, `HacsStatus`, `HacsError` deviennent `StoreRepository`, `StoreStatus`, `StoreError` ; le modèle garde `store` et `storeFailure` au lieu de `hacs` et `hacsFailure`.

### 2. Détection : Marketplace d'abord, puis HACS
`detectStore()` appelle `marketplace/info`.
- Réponse valide → Marketplace.
- `not_loaded` → statut `not_loaded` de la Marketplace (elle existe, HACS ne peut pas être là : la migration le retire).
- `unknown_command` → appel de `hacs/info`, avec la logique actuelle ; `unknown_command` de nouveau → `absent`.
- Autre erreur → `broken`, avec la boutique qui l'a donnée.

Le choix n'est ni stocké ni réglable : il est refait à chaque `load()`. La vérification de version minimale (`MIN_HACS_VERSION`) ne s'applique qu'à HACS ; la Marketplace a la version de Home Assistant.

### 3. Prérequis de la Marketplace dans le statut
`StoreStatus` `ready` porte `store` (la boutique), `version`, `categories`, et pour la Marketplace `warningAccepted` et `githubConnected` (toujours vrais pour HACS). La page en déduit :
- `warningAccepted === false` → bandeau « acceptez l'avertissement dans la Marketplace » avec lien vers `/marketplace`, et installations désactivées.
- `githubConnected === false` → l'installation d'un complément dont le dépôt n'est pas dans `repositories` est désactivée, avec une explication dans sa carte d'action et un lien vers `/marketplace`. Un complément dont le dépôt est connu reste installable : `marketplace/repository/install` n'exige pas GitHub.

Les erreurs `warning_not_accepted` et `github_not_connected` renvoyées malgré tout par une commande (état changé entre la lecture et l'action) sont traduites en messages explicites, pas en « interface changée ».

### 4. Textes par boutique, pas de nom interpolé
Les clés `hacs.*` et `action.open_hacs` sont remplacées par `store.marketplace.*` et `store.hacs.*` (en, fr, de), plus `store.none.*` quand aucune boutique ne répond. Le nom n'est pas interpolé dans une phrase commune : l'article change selon la langue (« dans la Marketplace », « dans HACS », « im Marketplace »). Le lien de documentation sans boutique pointe vers `https://www.home-assistant.io/integrations/marketplace/`.
- *Alternative écartée* : une clé `{store}`. Elle donne des phrases fausses en français et en allemand.

### 5. Liens vers la boutique
`storeLink(backend, repository)` rend `<panel>/repository/<id>` ou `<panel>` sans dépôt. Le chemin `/marketplace/repository/<id>` est déduit de la redirection `/hacs/{tail}` → `/marketplace/{tail}` ; il est vérifié dans le navigateur pendant l'implémentation (tâche dédiée). Si le panneau utilise un autre chemin, seule cette fonction change.

### 6. Redémarrage
La déduction actuelle reste, sans changement : `restartRequired` vient de `status === "pending-restart"` après l'installation, et `deduceState()` donne « à configurer » à une intégration téléchargée dont Home Assistant connaît le config flow (`ha.config_flow`). La Marketplace recharge les intégrations personnalisées pendant `marketplace/repository/install`, et le modèle relit le catalogue après l'installation : le serveur trouve alors l'intégration et son config flow.
- *Alternative écartée* (prévue d'abord) : prendre `repository.config_flow` en compte quand `ha.config_flow` est faux. Quand Home Assistant ne connaît pas encore l'intégration, son config flow ne peut pas s'ouvrir : « à configurer » serait faux, et le bouton « Configurer » mènerait à une erreur.

### 7. Contrat de la Marketplace
`tests/test_marketplace_contract.py` fait pour la Marketplace ce que `test_hacs_contract.py` fait pour HACS : il charge `homeassistant.components.marketplace` du Home Assistant installé, remplace seulement GitHub (enregistrement et téléchargement d'un dépôt), et compare les réponses aux scénarios de l'adaptateur avec `shared/marketplace-answers.json` (option `--update-marketplace-answers`). Il est ignoré quand le Home Assistant installé n'a pas de Marketplace. `frontend/test/store-contract.test.ts` rejoue les deux fichiers avec le même client. Scénarios Marketplace : `absent` (commande inconnue, puis repli HACS), `not_loaded`, `ready`, `disabled`, `warning_not_accepted`, `github_not_connected`, `install_present`, `install_absent`, `add_failed`, `install_failed`.

### 8. Bandeau
Dans `complements-page.ts`, les règles deviennent `div.banner { margin; padding; border; border-radius }`, `div.banner.warning`, `div.banner.error`, et `ha-alert.banner { display: block; margin: 0 0 12px }`. Les usages de la classe `banner` (bannières générales, notice de la boutique, aide à l'installation manuelle, avertissement expérimental, erreurs) passent tous par `renderAlert()`, donc la correction les couvre tous. Un aperçu dans `frontend/preview` avec `ha-alert` défini permet de le vérifier.

## Risks / Trade-offs
- [Les commandes `marketplace/*` ne sont pas une API publique et peuvent changer] → Elles sont isolées dans un seul objet, couvertes par un test de contrat contre le vrai code de Home Assistant, et le repli « Ouvrir dans la Marketplace » reste.
- [Le test de contrat dépend de la version de Home Assistant de `requirements-dev.txt`] → Les tests Python passent sur Home Assistant 2026.11.0, figé dans `requirements-dev.txt` avec `pytest-homeassistant`, comme Versatile Thermostat : `pytest-homeassistant-custom-component` s'arrête à 2026.10.4, sans Marketplace. La version que répond la Marketplace est fixée par le test pour que le fichier ne change pas à chaque version ; une réponse qui change fait échouer le test avec un message qui dit de relancer l'enregistrement après vérification de l'adaptateur.
- [Un dépôt du catalogue absent de la liste parce que la Marketplace ne l'a pas encore lu (`last_fetched`)] → Le dashboard tente l'ajout, que la Marketplace refuse avec `repository_exists` ; ce code est traité comme « déjà présent » : la liste est relue, et l'erreur n'est affichée que si le dépôt n'y apparaît toujours pas.
- [Le chemin `/marketplace/repository/<id>` est déduit, pas lu dans le frontend de Home Assistant] → Vérifié dans le navigateur pendant l'implémentation ; corrigé à un seul endroit.
- [Le style de `ha-alert` sur 2026.11 n'a pas été inspecté] → Vérification visuelle sur le Home Assistant du devcontainer, en clair et en sombre.

## Migration Plan
Aucune donnée à migrer : le dashboard ne stocke rien. Un utilisateur qui passe à Home Assistant 2026.11 voit la Marketplace détectée au prochain affichage de la page. Retour arrière : revenir à la version précédente du dashboard, qui retrouve son comportement actuel (HACS seulement).

## Open Questions
- Réglée : le panneau de la Marketplace de Home Assistant 2026.11.0 ouvre bien la fiche d'un dépôt à `/marketplace/repository/<id>` (vérifié dans le navigateur avec un dépôt installé).
