# Design

## Context

Projet neuf : aucun code existant. `vtherm_api` est un package Python pur, sans intégration Home Assistant, donc sans WebSocket ni panel. Les plugins VTherm sont des intégrations HA qui peuvent importer `vtherm_api`. Voir proposal.md pour la motivation.

## Goals / Non-Goals

**Goals:**
- Un plugin ajoute, remplace ou supprime des éléments d'interface sans modifier le dashboard.
- Ordre de chargement et position des éléments exprimés par des relations avant/après, jamais par un numéro.
- Apparence entièrement pilotée par le thème Home Assistant.

**Non-Goals:**
- Sandbox des plugins JS : un plugin UI a les mêmes droits que du code d'une intégration HA installée par l'administrateur.
- Rechargement à chaud d'un plugin UI sans recharger la page.
- Contenu des écrans de configuration du cœur et des plugins.

## Decisions

### 1. Architecture hybride : Python déclare, JavaScript contribue
Le registre Python (dans `vtherm_api`) liste les plugins UI présents et leur `js_url`. Le frontend charge ces modules, qui déclarent leurs contributions dans `VThermUiPluginRegistry`.
- *Alternative A, tout en Python* : couple chaque plugin à l'API du dashboard et impose de sérialiser des composants UI. Rejetée.
- *Alternative B, tout en JS (auto-enregistrement global)* : pas de source de vérité sur les plugins installés, et risque de course au chargement. Rejetée.

### 2. Déclaration programmatique du `js_url`
Le plugin appelle `register_ui_plugin` pendant son setup, plutôt que de déclarer une URL dans un manifest statique. Cela permet une URL conditionnelle et une désinscription au déchargement. Le module doit exister avant l'appel : le plugin enregistre lui-même son fichier statique via le serveur HTTP de HA.
- *Alternative : manifest* : plus simple à inspecter, mais `vtherm_api` n'a pas accès aux manifests de façon fiable.

### 3. Nommage `ui` pour toute l'API
`register_ui_plugin`, `unregister_ui_plugin`, `get_ui_plugins`, commande WS `vtherm_dashboard/get_ui_plugins`, registre JS `VThermUiPluginRegistry`. Cela distingue les plugins UI des plugins thermostat de `vtherm_api`.

### 4. Deux niveaux déclaratifs séparés
- **Plugin** : `requires` (obligatoire), `load_after` / `load_before` (souples). Ils ne portent que sur l'ordre d'exécution.
- **Contribution** : `first`, `last`, `before`, `after`, `replace`, `remove`. Ils ne portent que sur la position dans un hook.

Chaque niveau a ainsi un seul rôle et se valide séparément.

### 5. Algorithme de chargement
1. Récupérer la liste via WS.
2. Construire un graphe : `requires` et `load_after` donnent l'arête cible → plugin, `load_before` donne plugin → cible. Les cibles absentes sont ignorées pour les liens souples.
3. Écarter les plugins dont la contrainte `dashboard_version` n'est pas satisfaite par la version du dashboard (état "dashboard incompatible"), puis ceux avec `requires` manquant (propagation jusqu'à stabilité).
4. Tri topologique de Kahn. Départage des ex æquo par `id` alphabétique, pour un ordre déterministe. Les plugins restants non triés forment des cycles et sont exclus.
5. Importer les modules dans cet ordre (`import()` dynamique, attente de chaque enregistrement). Chaque module appelle `registerUiPlugin(...)` du SDK, qui délègue au registre ; le registre vérifie que l'`id` correspond au plugin en cours d'import (connu côté Python), puis les contributions sont appliquées à ce moment.

### 6. Résolution des positions à l'ajout
Chaque hook maintient une liste ordonnée d'éléments. Pour chaque contribution, au chargement de son plugin :
- `first` / `last` : insertion en tête / en queue.
- `before` / `after` : insertion à côté de la cible. L'insertion se fait *immédiatement* après la cible, donc de multiples "après TPI" s'inversent dans l'ordre de chargement (le dernier chargé est le plus proche de la cible), comme dans la spec.
- `replace` : l'élément prend l'index de la cible, qui garde un lien `replacedBy` pour que les références `before`/`after` suivent le remplaçant.
- `remove` : la cible est marquée supprimée mais gardée en mémoire, afin que d'autres références restent résolubles.
- Cible absente : comportement `on_missing`, avec avertissement.

Un `replace` ou `remove` sur la contribution d'un plugin non ordonné avant lui est détecté par comparaison avec l'ordre de chargement : avertissement.

### 7. Contrat de contribution
Une contribution est un objet `{ id, component, placement?, on_missing? }` (type exporté par `@vtherm/dashboard-sdk`) où `component` est le nom d'un custom element (Web Component) enregistré par le plugin. Le dashboard instancie l'élément et lui affecte `hass` et, selon le hook, `thermostatId`. Les Web Components sont retenus car HA les utilise déjà, ce qui évite d'imposer un framework aux plugins.
- *Alternative : fonctions de rendu* : couplées à un framework précis. Rejetée.

### 8. Package npm `@vtherm/dashboard-sdk` et monorepo
Le dépôt devient un monorepo npm (workspaces) : `packages/sdk` (publié sous `@vtherm/dashboard-sdk`) et `frontend/` (le dashboard). Le dashboard importe les types du SDK, qui est ainsi la source unique du contrat plugin/dashboard.
- Le SDK ne contient pas de registre : `registerUiPlugin` valide la définition puis appelle `window.VThermUiPluginRegistry.register`. Le dashboard pose ce global avant d'importer les modules plugins. Plusieurs copies du SDK dans des bundles différents partagent donc le même registre.
- Si le global est absent, `registerUiPlugin` lève une erreur claire (module chargé hors dashboard).
- La validation (hook connu, préfixe d'identifiant, forme de position) et la résolution des positions vivent dans le SDK et sont réutilisées par le dashboard et par le harnais de test, pour garantir les mêmes règles partout.
- Le SDK est versionné et publié avec le dashboard, depuis le même dépôt. Le scope `@vtherm` appartient au projet.
- *Alternative : types dans un dépôt séparé* : plus de découplage, mais deux dépôts à synchroniser à chaque évolution du contrat. Rejetée pour la première version.

### 9. Compatibilité par contrainte de version du dashboard
Chaque plugin déclare une seule fois, dans `register_ui_plugin`, une contrainte `dashboard_version` (par exemple `>=1.0,<2.0`). Le dashboard l'évalue avant de télécharger le module : un plugin incompatible n'est jamais exécuté. L'état "dashboard incompatible" indique la contrainte, la version courante et le motif (trop ancien ou trop récent).
- **Une seule déclaration, côté Python.** Le dashboard et le SDK sont publiés avec le même numéro de version, donc une déclaration côté JavaScript n'apporterait qu'un risque de désaccord entre deux copies. Le SDK n'a pas de champ de version dans `registerUiPlugin`.
- **Grammaire minimale** : comparateurs `>=`, `>`, `<=`, `<`, `==` séparés par des virgules (ET), versions semver, `1.0` équivaut à `1.0.0`. Pas de `^`, `~`, `||` ni de jokers en v1.
- **Parseur écrit à la main** en Python (validation à l'enregistrement) et en TypeScript (évaluation dans le dashboard), sans dépendance externe. Les deux passent la même table de cas, ce qui évite les écarts de comportement entre `packaging` (PEP 440) et `semver` (npm), notamment sur les préversions.
- La version du dashboard est celle de son `manifest.json`, injectée dans le bundle au build. Le SDK l'expose en lecture seule.
- **Alternative : version minimale seule** : ne protège pas contre un dashboard plus récent qui change le contrat. Rejetée.
- **Alternative : numéro de version de contrat distinct** : une deuxième numérotation à maintenir. Rejetée.
- **Alternative : syntaxe npm ou PEP 440 complète** : plus expressive, mais une implémentation différente par langage. Rejetée pour la v1.
- Les auteurs alignent la plage de leur dépendance `@vtherm/dashboard-sdk` sur leur `dashboard_version` (à documenter dans le guide).

### 10. Mode développement côté navigateur
Les entrées de développement sont stockées dans le `localStorage` du navigateur, lues par le chargeur du dashboard avant le tri des plugins. Rien n'est écrit côté Home Assistant.
- Une entrée avec un `id` installé remplace seulement le `js_url` ; ses métadonnées restent celles du registre Python.
- Une entrée avec un `id` inconnu contient ses propres métadonnées (`dashboard_version` obligatoire) et tient lieu de déclaration Python. Le contrôle "id connu" du registre JS accepte les deux sources.
- Le chargeur fusionne les entrées avec la liste reçue du WebSocket, puis suit le même algorithme (décision 5) : aucun chemin de code distinct pour les plugins en développement, sauf la source de l'URL.
- Le mode est réservé aux administrateurs, comme le panel, et un bandeau le signale.
- Le rechargement se fait par rafraîchissement de la page. Un rechargement à chaud automatique est hors périmètre.
- Prérequis côté développeur : le serveur de développement doit envoyer `Access-Control-Allow-Origin` (import de module depuis une autre origine). Le guide donne la configuration Rollup et Vite. `http://localhost` depuis une page HTTPS fonctionne sur Chrome et Firefox, pas sur Safari.
- *Alternative : autoriser des `js_url` externes côté Python avec une option de l'intégration* : exige un redémarrage ou une configuration de Home Assistant, et ouvre une porte côté serveur pour tous les utilisateurs. Rejetée.
- *Alternative : paramètre d'URL `?dev_plugin=...`* : plus fragile (perdu à la navigation) et visible dans l'historique. Rejetée.

### 11. Harnais de test dans le SDK
`@vtherm/dashboard-sdk/testing` est un point d'entrée distinct (champ `exports` du `package.json`), qui expose un faux hôte. Il réutilise le même code de validation et de résolution des positions que le dashboard (module partagé du SDK), donc il ne peut pas diverger. Un faux `hass` permet de fixer des états et de rendre un composant de contribution avec ses propriétés. Le point d'entrée principal n'importe jamais ce module, ce qui garde les bundles de production exempts du harnais.
- Conséquence : le moteur de résolution des positions vit dans le SDK (et non dans `frontend/`), importé par le dashboard et par le harnais.
- *Alternative : harnais dans un package séparé* : un deuxième package à publier et à aligner. Rejetée.

### 12. Thème
Le dashboard n'embarque aucune couleur fixe. Il utilise uniquement les variables CSS de HA (`--primary-color`, `--card-background-color`, `--primary-text-color`, etc.) et les composants natifs de HA quand c'est possible. Les custom properties CSS traversent le Shadow DOM, donc le changement de thème s'applique sans code spécifique. Les plugins sont invités à faire de même.

### 13. Panel et sécurité côté Python
- Panel enregistré en `require_admin=True` via `panel_custom`, avec un module JS servi en chemin statique.
- La commande WS est enregistrée avec `websocket_api.async_response` et exige l'authentification standard de HA.
- `register_ui_plugin` valide `id`, `js_url` local (chemin absolu commençant par `/`), `dashboard_version` (grammaire de la décision 9) et unicité.

### 14. Configuration native : pilotage du config flow de Versatile Thermostat
Le dashboard ne réécrit pas les règles de validation de Versatile Thermostat : il pilote le config flow et l'options flow existants côté serveur, par les API publiques de Home Assistant (`hass.config_entries.flow` et `hass.config_entries.options`). Cela garantit la même validation et le même enregistrement atomique que l'interface de Home Assistant.
- **Commandes WebSocket** de l'extension : lister les thermostats et la configuration centrale, lire une configuration, enregistrer un brouillon, créer un thermostat. Chacune exige un administrateur.
- **Enregistrement d'un brouillon** : le serveur ouvre l'options flow de l'entrée, puis pour chaque onglet modifié choisit l'étape du menu correspondante, soumet l'ensemble des champs de l'onglet (le flow supprime les champs facultatifs absents), enchaîne les étapes `spec_*` quand l'héritage est désactivé, puis termine par `finalize`. Les erreurs du flow (clé de champ et code) sont renvoyées au navigateur et affichées sur les champs. Si une étape échoue, le flow est abandonné et rien n'est écrit.
- **Création** : même mécanisme avec `flow.async_init` (étape `user`, type du thermostat, puis les onglets), jusqu'à `finalize`. Le flow refuse la finalisation d'une configuration incomplète.
- **Rechargement** : Versatile Thermostat recharge l'entrée à la mise à jour (son `update_listener`). Le dashboard n'ajoute aucun rechargement.
- **Un plugin natif par étape du flow** : le serveur garde la correspondance entre l'onglet natif (par exemple `core_tpi.tab.main`) et l'étape du flow à piloter. Les 15 plugins natifs sont enregistrés par le custom component via `register_ui_plugin`, comme des plugins tiers. Les onglets des plugins tiers n'ont pas de correspondance avec une étape : leur stockage reste à définir dans un changement ultérieur.
- **Interface unique côté serveur** : le pilote de flow est caché derrière une interface "valider et enregistrer une configuration" (voir "Orientation à long terme" plus bas), pour pouvoir changer de mécanisme sans toucher aux commandes WebSocket ni au frontend.
- **Composants écrits à la main**, pas générés depuis les schémas : l'expérience d'édition (champs conditionnels, valeurs centrales en lecture seule) demande des composants dédiés. Pour détecter la dérive, un test d'intégration compare les champs de chaque onglet avec les schémas du config flow du dépôt `external/versatile_thermostat` et échoue si un champ apparaît, disparaît ou change de type.
- **Versions** : le dashboard déclare la version de configuration (`VERSION` et `MINOR_VERSION`) de Versatile Thermostat qu'il supporte. Une entrée plus récente est affichée en lecture seule.
- **Presets** : les températures de preset sont des entités `number` de Versatile Thermostat, hors du config flow. L'onglet des presets les lit et les modifie par le service `number.set_value` de Home Assistant. L'édition des presets centraux dans la configuration générale dépasse le config flow : elle est ajoutée parce que sans elle l'option "utiliser les presets centraux" n'a pas d'écran où définir les valeurs.
- **Libellés** : traductions propres au dashboard (français et anglais). Réutiliser celles de Versatile Thermostat n'est pas retenu : leurs clés sont liées aux formulaires de Home Assistant et changent avec ses étapes.
- **Orientation à long terme : validation et normalisation partagées dans `vtherm_api`.** Des fonctions pures (validation d'un onglet, normalisation de la configuration à l'enregistrement, test de complétude), utilisées à la fois par le config flow de Versatile Thermostat et par le dashboard, permettraient de remplacer le pilotage du flow par une mise à jour directe de l'entrée (`async_update_entry`) sans dupliquer les règles. Elle suppose que le config flow de Versatile Thermostat les adopte, ce qui ne dépend pas de ce projet. Le pilotage du flow est donc la solution de cette version, et la contribution amont est la cible.
  - **Chemin de transition** : le pilote de flow reste derrière une interface unique de "validation et enregistrement d'une configuration". Quand `vtherm_api` fournit les fonctions partagées et que la version minimale de Versatile Thermostat supportée les utilise, une seconde implémentation de cette interface est ajoutée, puis le pilote de flow est retiré. Les specs décrivent le comportement et non le mécanisme, donc elles ne changent pas.
  - **Documenté** dans `docs/contributing/config-flow-driver.md` (section "Évolution prévue"), avec ce qui reste à faire en amont.
- *Alternative : modification directe de l'entrée avec règles propres au dashboard* : code serveur plus court, mais les règles de validation et de normalisation seraient copiées et divergeraient en silence quand Versatile Thermostat évolue. De plus, la création d'un thermostat exige de toute façon un flow. Rejetée pour cette version, et reprise par la cible ci-dessus une fois les règles partagées.
- *Alternative : validation partagée dans `vtherm_api` dès cette version* : même cible, mais elle bloquerait la livraison sur une décision externe.
- *Alternative : un seul plugin `core`* : plus simple à maintenir, mais moins fidèle au config flow et moins utile comme exemple pour les auteurs de plugins. Retenir 15 plugins coûte 15 enregistrements Python et un ordre de chargement à décrire (tous requièrent `core`).

### 15. Visibilité conditionnelle et ordre des onglets natifs
Une contribution déclare facultativement `visible(context)`, fonction pure évaluée à chaque changement du brouillon. Elle sert aux onglets dépendants des fonctionnalités (ouverture, mouvement, etc.) et du type du thermostat.
- Une contribution masquée garde sa place dans la liste résolue, donc `after: X` reste stable même si X est masquée. Seul le rendu filtre.
- L'ordre des onglets natifs reproduit le menu du config flow, exprimé par `after` en chaîne et `load_after` entre plugins natifs, sans numéro d'ordre. Les plugins natifs sont ainsi aussi un test des mécanismes de position.
- Les identifiants de plugin `core` et `core_*` sont réservés. Le préfixe d'identifiant d'une contribution est le plugin suivi d'un point, donc `core_tpi.tab.main` n'appartient pas à `core`.

### 16. Conventions de code
- **TypeScript partout où le code est écrit pour le navigateur ou Node** : dashboard, SDK, plugins natifs, plugin d'exemple, tests Vitest, scripts de vérification (documentation, conformité), et fichiers de configuration quand l'outil accepte TypeScript (`vite.config.ts`, `rollup.config.ts` via le chargeur de configuration TypeScript de l'outil, `vitest.config.ts`). Les sorties de build sont du JavaScript généré, non versionné.
  - Configuration : `strict: true`, `allowJs: false`, ESLint avec `@typescript-eslint/no-explicit-any` en erreur. Un contrôle liste les fichiers `.js`, `.mjs` et `.cjs` versionnés et les compare à une liste d'exceptions (par exemple une configuration d'outil qui n'accepte pas TypeScript), chaque exception avec sa justification.
  - Les exemples de la documentation et du README du SDK sont en TypeScript. Les auteurs de plugins restent libres de leur langage : le SDK fournit des types, et le module livré est du JavaScript compilé.
- **Python aligné sur Versatile Thermostat** : mêmes outils et réglages que son dépôt (Black avec `line-length = 180` dans `pyproject.toml`, `.pylintrc` avec `max-line-length=180`, `* text=auto eol=lf` dans `.gitattributes`, `asyncio_mode = "auto"` pour pytest, annotations de type, docstrings, logger de module). Les extraits de configuration proviennent de ce dépôt, pour que le code de `vtherm_api` contribué en amont suive les mêmes règles que celui du dashboard.
  - Le devcontainer utilise donc les extensions Black et pylint (et non Ruff) avec formatage à l'enregistrement.
  - Le logger suit celui de Versatile Thermostat (`get_vtherm_logger` de `vtherm_api`) si cette fonction est disponible dans la version de `vtherm_api` ciblée ; sinon `logging.getLogger(__name__)`, à vérifier à l'implémentation.
- **Langue : anglais exclusivement** pour les en-têtes, commentaires, docstrings, commentaires de documentation, messages de commit et pages de `docs/`. Les traductions de l'interface (français et anglais) restent des chaînes de produit dans les fichiers de traduction. La conformité repose sur la revue et la case du modèle de demande de fusion : une détection automatique de langue donnerait trop de faux positifs (noms propres, identifiants, extraits de log). L'anglais s'impose aussi parce que le code contribué à `vtherm_api` et à Versatile Thermostat est en anglais.
- **Vérification** : une commande locale unique et le même contrôle dans l'intégration continue (Black en mode vérification, pylint, `tsc --noEmit`, ESLint, contrôle des fichiers JavaScript).
- *Alternative : Ruff pour Python* : plus rapide, mais différent de Versatile Thermostat. Les contributions vers `vtherm_api` et Versatile Thermostat doivent passer leur propre intégration continue, donc les mêmes outils évitent les surprises. Rejetée.
- *Alternative : JavaScript avec JSDoc et `checkJs`* : évite l'étape de compilation, mais les types du contrat du SDK (positions à forme unique, contextes par hook) s'expriment mal. Rejetée.

### 17. Documentation dans `docs/`, vérifiée par l'intégration continue
Principe : ce qui peut être dérivé du code l'est, ce qui est rédigé est vérifié.
- **Arborescence** : `docs/README.md` (index avec public visé), `docs/user/` (utilisateur), `docs/plugins/` (auteur de plugin : procédure `plugin-development.md`, chargement et dépendances, hooks et positions, mode développement, tests, thème), `docs/reference/` (références générées et grammaire des contraintes), `docs/contributing/` (architecture, environnement, publication) et `CHANGELOG.md` à la racine avec une section "Pour les auteurs de plugins" par version.
- **Référence générée** : TypeDoc (avec sortie Markdown) pour le SDK, génération depuis les docstrings pour Python. Les fichiers générés sont enregistrés dans `docs/reference/` ; un contrôle recompile la référence et échoue en cas de différence. Un contrôle échoue aussi pour un export public sans commentaire.
- **Exemples** : la source de vérité est un fichier réel sous `docs/examples/`, compilé ou exécuté par les tests. Un script copie les extraits dans les pages Markdown à des marqueurs ; le contrôle échoue si une page diffère de sa source. Les exemples ne peuvent donc pas devenir obsolètes sans casser les tests.
- **Liens et index** : un script vérifie les liens relatifs, les ancres et la présence de chaque page dans `docs/README.md`.
- **Process** : un modèle de demande de fusion contient une case de mise à jour de la documentation, et `openspec/config.yaml` impose, dans les règles des tâches, qu'une tâche qui change un comportement public mette à jour `docs/` dans le même groupe.
- **La prose rédigée ne peut pas être vérifiée automatiquement** : c'est le rôle de la revue et de la case du modèle de demande de fusion, mais les contrôles ci-dessus couvrent les dérives les plus fréquentes (référence, exemples, liens).
- **Langue** : anglais exclusivement (décision 16), noms de code non traduits.
- **Documentation de `vtherm_api`** : la référence de l'API Python d'enregistrement est générée dans ce dépôt ; la documentation du dépôt `vtherm_api` renvoie vers elle, pour éviter deux sources à maintenir.
- *Alternative : site de documentation publié (MkDocs, Docusaurus)* : utile plus tard, mais hors de la première version. Les pages Markdown restent lisibles sur GitHub.
- *Alternative : documentation écrite à la main uniquement* : dérive inévitable à mesure que les API évoluent. Rejetée.

### 18. Navigation : onglets supérieurs, menu de gauche, fil d'ariane
```
+--------------------------------------------------------------+
| Home confort  [Dashboard] [Thermostats] [Plugin tab]  [gear] |   top_tab (zones start / end)
+--------------------------------------------------------------+
| Thermostats > Salon > TPI                                    |   breadcrumb
+-----------------+--------------------------------------------+
| Salon        v  |  content of the selected menu entry        |   left menu: scrolls alone
| Overview        |                                            |   entries come from hooks
| Main ... TPI <  |                                            |
+-----------------+--------------------------------------------+
```
- **Deux niveaux de navigation, tous deux déclaratifs.** Le niveau 1 est le hook `top_tab`. Le niveau 2 est le menu de gauche, composé des contributions qui ciblent l'onglet : `global_page` (Dashboard), `general_config` et `tab_page` (Configuration), `thermostat_config` (thermostat sélectionné), `tab_page` (onglet de plugin). Les sept hooks gardent les cinq hooks précédents et ajoutent `top_tab` et `tab_page`.
- **Un menu est une liste unique.** Les contributions des différents hooks d'un même menu sont fusionnées dans une seule liste ordonnée, ce qui permet les positions croisées (une `tab_page` placée `after` une section `general_config`). Les identifiants sont donc uniques dans le menu et non plus seulement par hook. Le moteur de résolution (décision 6) travaille sur la liste du menu.
- **Zones des onglets supérieurs** : `start` (défaut) et `end`. La roue crantée est seule dans `end`, donc un onglet de plugin placé `last` reste avant elle. Une cible située dans l'autre zone est traitée comme absente.
- **Groupes** : propriété facultative d'une entrée, rendue comme intitulé au-dessus de chaque suite consécutive d'entrées du même groupe. Le groupe n'est pas un objet positionnable : seules les entrées le sont, ce qui garde le modèle de position inchangé. Le menu de Configuration utilise deux groupes, "Versatile Thermostat" et "Dashboard".
- **Fil d'ariane et itinéraires** : l'URL du panel porte l'onglet, le thermostat et l'entrée (`/home-confort/<tab>/<thermostat>/<entry>`), lue et écrite par un routeur léger sur l'historique du navigateur. Le fil d'ariane se calcule depuis l'itinéraire et les titres des contributions, qui sont obligatoires pour cette raison. Un itinéraire inconnu retombe sur la page par défaut de l'onglet avec un message.
- **Onglet Thermostats** : la page d'arrivée est la liste en pleine largeur. Une fois un thermostat choisi, le menu est celui du thermostat, précédé d'un sélecteur qui conserve l'entrée courante quand elle existe pour le nouveau thermostat, sinon ouvre la vue d'ensemble. La vue d'ensemble est la première entrée `thermostat_config` du plugin `core`.
- **Mobile** : en dessous d'un seuil de largeur, le menu devient un tiroir et les onglets supérieurs défilent horizontalement avec la roue crantée fixe. Le fil d'ariane garde ses deux derniers segments. L'application Home Assistant sur téléphone ouvre le panel dans cette disposition.
- **Brouillon** : il survit aux changements d'entrée dans le même thermostat (le brouillon appartient au thermostat, pas à l'entrée) et déclenche une confirmation quand on le quitte.
- *Alternative : navigation en barre latérale interne unique* : plus simple, mais les plugins ne peuvent pas ajouter un espace de premier niveau et la barre devient longue. Rejetée.
- *Alternative : groupes positionnables* : plus expressif mais double le modèle de position. Rejetée pour cette version.

## Risks / Trade-offs

- [Plugin JS malveillant ou bogué avec les droits de la page HA] → Seuls des modules locaux sont autorisés, et le panel est réservé aux administrateurs. Chaque import est isolé par `try/catch`.
- [Ordre d'enregistrement Python : le plugin s'inscrit avant ou après le dashboard] → Le registre vit dans `vtherm_api`, indépendant de l'ordre de setup. Le frontend lit la liste à l'ouverture du panel.
- [Plugin enregistré après l'ouverture du panel] → Non visible avant rechargement de la page. Acceptable en première version (non-objectif : rechargement à chaud).
- [Position résolue à l'ajout : dépend de l'ordre de chargement] → Mitigé par l'ordre déterministe et par l'avertissement quand un `replace`/`remove` n'a pas de dépendance déclarée.
- [Nécessite une évolution du package `vtherm_api`] → À coordonner avec ses mainteneurs. Le registre est petit et isolé, pour limiter le risque.
- [Couplage au config flow de Versatile Thermostat : une nouvelle étape, un champ ou un enchaînement modifié casse le pilotage] → La version de configuration supportée est déclarée (lecture seule au-delà), le test de dérive compare les champs aux schémas réels, et les tests d'intégration exécutent le vrai flow à chaque changement de version de Versatile Thermostat dans l'intégration continue.
- [Plugins tiers sans convention de stockage de leur configuration] → Hors périmètre de ce changement. Le contrat de contexte de configuration est posé, mais le stockage des valeurs d'un plugin tiers est à définir (par exemple des clés préfixées par l'identifiant du plugin) dans un changement ultérieur.
- [Les plugins doivent élargir leur borne haute à chaque version majeure du dashboard] → Voulu : un plugin non testé sur la nouvelle majeure n'est pas chargé silencieusement. Le dashboard affiche un motif explicite, et le guide des auteurs décrit la démarche.
- [Publication npm : le package et le dashboard doivent rester alignés] → Même dépôt, même numéro de version, publication par la même chaîne d'intégration continue.
