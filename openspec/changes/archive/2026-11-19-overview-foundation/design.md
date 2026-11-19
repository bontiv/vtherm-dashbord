# Design

## Context
- Le contrat des widgets existe : `thermostat_widget` et `global_widget` (`packages/sdk/src/types.ts`), placement `first/last/before/after/replace/remove` et condition `visible` par contribution. Un plugin déclare une liste de widgets par hook. Un widget masqué garde sa place.
- `thermostat_widget` reçoit `hass`, `thermostatId`, `narrow` ; sa condition `visible` reçoit `hass`, `thermostatId`, `thermostatType`, `values`, `centralValues`. `global_widget` ne reçoit que `hass` (plan, manque 3).
- `thermostatId` est l'identifiant de l'entrée de configuration, pas l'entité `climate`.
- `native/insight-panels.ts` contient `thermostatEntities` (privé, asynchrone, appelle `get_thermostats`) et `native/history.ts` un `HistoryClient` (cache de 5 min, `history/history_during_period` en réponse compressée) ; `thermostat-areas.ts` lit déjà `hass.devices` et `hass.entities`.
- `components/widgets.ts` dessine une grille `repeat(auto-fill, minmax(280px, 1fr))`, chaque widget dans un `div.widget` qui imite une carte ; il ne transmet que `hass` et `thermostatId`. Le panel connaît déjà l'identifiant et les valeurs de la configuration centrale (`session.centralId`, `valuesOf`), qu'il passe aux sections `thermostat_config`.
- Source des mesures : Versatile Thermostat (VT), entités retrouvées par clé de traduction, pas par nom.

## Goals / Non-Goals
**Goals:**
- Un widget s'écrit en lisant des valeurs, sans connaître le registre des entités ni écrire d'appel serveur.
- Les plugins tiers disposent des mêmes aides que les widgets natifs, et d'une taille déclarable.
- Même rendu partout : carte, titre, états, unités, langue, thème, écran étroit.

**Non-Goals:**
- Aucun widget (voir les autres changes `overview-*`).
- Aucune commande (mode, preset, verrou, contournement, mode central) : première version en affichage seul.
- Ni unité de ligne fixe pour les widgets, ni réorganisation par l'utilisateur.
- Pas d'export des composants de présentation ni du client d'historique par le SDK.

## Audit de redondance avec l'API de Home Assistant
Ce que `hass` donne déjà de façon synchrone (sources : définitions `HomeAssistant` et registres du dépôt `home-assistant/frontend`, branche `dev`) : `states`, `entities` (registre d'affichage : `entity_id`, `device_id`, `area_id`, `platform`, `translation_key`, `hidden`, `entity_category`, `labels`, `display_precision`), `devices` (`id`, `config_entries`, `identifiers`, `area_id`, `name`), `areas`, `floors`, `config.unit_system`, `locale`, `callWS`, `callService`, `connection.subscribeMessage`/`subscribeEvents`, et les formateurs `formatEntityState`, `formatEntityAttributeValue`, `formatEntityAttributeName`.

Point décisif : le registre d'affichage `hass.entities` **n'a pas** `config_entry_id` (il est dans le registre complet `config/entity_registry/list`, réservé aux administrateurs et asynchrone). Le lien entrée → entités passe par l'appareil : `hass.devices[...].identifiers` contient `["versatile_thermostat", <identifiant de l'entrée>]` (VT : `base_entity.py:61` pour un thermostat, `select.py:89` pour la configuration centrale), et `hass.entities[...].device_id` désigne cet appareil.

| Ajout de la première version | Verdict | Remplacement par `hass` ; ce qui reste |
| --- | --- | --- |
| `getThermostatEntities(hass, thermostatId)` | PARTIELLEMENT UTILE | Une fonction pure `getEntryEntities(hass, entryId)` : `Object.values(hass.devices).find(d => d.identifiers.some(([domain, id]) => domain === "versatile_thermostat" && id === entryId))`, puis `Object.values(hass.entities).filter(e => e.device_id === device.id)`. Reste dans le SDK : le filtre, son typage et la clé de traduction. |
| `getCentralEntities(hass)` | REDONDANT | Même fonction avec l'identifiant de l'entrée centrale. Supprimée. |
| Répertoire d'entités rempli par `get_thermostats` et `get_central_config` | REDONDANT | `hass.devices` et `hass.entities` sont synchrones : la condition `visible` les lit directement. Plus d'état asynchrone, plus de widgets masqués pendant le chargement, plus de limite aux administrateurs. Supprimé. |
| Recherche de l'appareil central, champ Python `central_device_id` | REDONDANT | `identifiers` de `hass.devices` (ci-dessus). Supprimés, aucun code Python. |
| `readHistory(hass, entityId, period, options)` | REDONDANT | `hass.callWS({ type: "history/history_during_period", start_time, end_time, entity_ids: [id], minimal_response: true, no_attributes: true })`. `recorder/statistics_during_period` ne couvre que les capteurs avec `state_class` (aucun attribut de `climate`), `history/stream` sert au temps réel. Le dashboard garde `HistoryClient` en interne (cache de 5 min, décompression des lignes `lu`/`lc`/`s`/`a`), comme les panneaux d'estimation. Supprimée du SDK ; recette de 10 lignes dans la documentation pour les plugins tiers. |
| Formatage des valeurs à la main (`Intl`) | PARTIELLEMENT UTILE | `hass.formatEntityState(stateObj)` et `hass.formatEntityAttributeValue(stateObj, attribut)` donnent la valeur, l'unité et la précision de Home Assistant. Les widgets les utilisent quand ils existent ; repli sur `Intl` sinon (harnais de test, version ancienne). |
| `Hass.entities`, `Hass.devices`, formateurs dans le type du SDK | NÉCESSAIRE (typage) | Les propriétés existent à l'exécution mais le type `Hass` du SDK ne les décrit pas ; elles sont facultatives, en lecture seule. |
| Identifiant et valeurs de la configuration centrale pour un widget global | NÉCESSAIRE | Les données d'une entrée de configuration ne sont pas dans `hass` (seulement ses entités). `thermostat_widget` reçoit déjà `centralValues` ; `global_widget` reçoit `central: { entryId, values }`. Le panel les a déjà. |
| `size` d'un widget | NÉCESSAIRE | Aucune notion équivalente dans `hass`. |
| Harnais : faux `hass` avec `entities`, `devices` | NÉCESSAIRE | Le faux `hass` n'a que `states` ; sans registres, `getEntryEntities` ne se teste pas. Le harnais de l'historique tombe avec `readHistory`. |

Résultat : le SDK gagne une fonction pure, trois types facultatifs, un champ de contexte et une propriété de taille. Il ne gagne aucun appel réseau.

## Décisions

### D1. Lecture des entités : une fonction pure
`getEntryEntities(hass, entryId)` renvoie `{ deviceId, entities, climate, byKey }` : l'appareil de l'entrée, ses entités (`entityId`, `domain`, `translationKey`, `platform`), la première entité `climate` et un dictionnaire clé de traduction → identifiant d'entité. Elle ne renvoie que des valeurs vides si un registre manque, si l'entrée est inconnue ou si l'identifiant n'est pas celui d'une entrée (par exemple `climate.salon`). Elle est pure et sans état : pas de délégation au registre du dashboard, pas de cache. Une entité de la configuration centrale sans clé de traduction (le `select` du mode central, d'`unique_id` `central_mode`) se retrouve par son domaine sur l'appareil central.
- Alternative écartée : un répertoire tenu par le dashboard depuis `get_thermostats`. Asynchrone, réservé aux administrateurs, et il duplique `hass.devices` et `hass.entities`.
- Alternative écartée : filtrer `hass.entities` par `config_entry_id`. Le champ n'existe pas dans le registre d'affichage.
- Coût : le parcours des deux registres est linéaire ; il est fait dans `visible` et au rendu, pour un thermostat. Un index par appareil, mémorisé par référence de `hass.entities`, est ajouté seulement si une mesure le justifie.

### D2. Contexte de la configuration centrale pour les widgets globaux
`global_widget` reçoit `central?: { entryId: string; values: ConfigValues }` dans ses propriétés et dans le contexte de sa condition `visible`, absent quand il n'y a pas de configuration centrale. Le panel le remplit avec `session.centralId` et `valuesOf(centralId)` (déjà lus pour les sections de configuration). Les widgets lisent les entités centrales avec `getEntryEntities(hass, central.entryId)`.
- Alternative écartée : passer seulement `centralValues`, comme `thermostat_widget` : l'identifiant de l'entrée est nécessaire pour retrouver l'appareil.

### D3. Historique : hors du SDK
Les widgets natifs (W2, W21, W26, W27) utilisent `HistoryClient` de `native/history.ts`, partagé avec les panneaux d'estimation. Seules les entités dont l'historique contient la valeur sont lisibles : l'état du `climate`, ses attributs `current_temperature`, `temperature`, `hvac_action`, `preset_mode`, `on_percent`, `power_percent`, `valve_open_percent`, `ema_temp`, et l'état des capteurs de VT. Les attributs imbriqués (`specific_states.*`, `*_manager.*`, `vtherm_over_*`) ne sont pas enregistrés. La documentation donne aux plugins tiers la recette `hass.callWS` (requête minimale, lecture des champs `lu`, `s`).
- Alternative écartée : exporter le client dans le SDK. Un contrat et un cache à garantir aux plugins tiers, qui n'en ont pas demandé ; reste possible plus tard.

### D4. Composants de présentation : dans le dashboard
Sous `frontend/src/components/overview/` : `vtherm-widget-card`, `vtherm-gauge`, `vtherm-bar` (simple ou segmentée), `vtherm-state-icon`, `vtherm-value-row`, `vtherm-age`. Chacun préfère le composant de Home Assistant quand il est défini (`ha-icon`, `ha-gauge`, `ha-progress-bar`, `ha-tooltip`, via le chargeur existant) et se replie sur du SVG ou du HTML. Le graphique en ligne est le `vtherm-time-chart` existant.

### D5. Carte, conteneur et conventions
- `vtherm-widgets` remplace son `div.widget` par un `ha-card` (repli : le même `div` stylé), transmet `narrow`, et reste le seul propriétaire de la bordure. Le widget natif dessine un `vtherm-widget-card` (titre + corps) sans seconde bordure. Le rendu des widgets tiers existants ne change pas.
- Identifiant `<plugin>.widget.<nom>`, titre `widget.<nom>.title` du catalogue du plugin, en/fr/de.
- Un widget dont la fonctionnalité est éteinte, ou dont aucune source n'existe, est masqué par `visible`, jamais vide. `visible` combine la configuration effective (valeurs du thermostat et centrales) et la présence de l'entité source.
- Valeur absente, `unavailable` ou `unknown` : « — » avec la mention « indisponible » pour les lecteurs d'écran. Jamais « 0 » pour une valeur inconnue.
- Valeurs : `hass.formatEntityState` et `hass.formatEntityAttributeValue` quand ils existent, sinon `Intl.NumberFormat` avec `hass.locale` et l'unité de l'entité ou de `hass.config.unit_system`. Âge : `Intl.RelativeTimeFormat`, date complète en infobulle.
- Couleur jamais seule : icône et texte ; couleurs de thème de Home Assistant, aucune couleur figée.
- Coût : un widget ne se redessine que si l'état de ses entités change ; l'historique ne se charge que quand la carte est visible (`IntersectionObserver`).

### D6. Éléments sans source dans VT
Quatre éléments du plan n'ont pas de source dans VT : position dans le cycle TPI (TP-05), délai restant de la fenêtre (WI-05), prochaine action de l'arrêt automatique (AS-05), échéance du reverrouillage (LK-02). Décision par défaut : **exclus**, aucun calcul côté dashboard. Un calcul reposerait sur des durées de configuration et des instants que VT ne publie pas : il afficherait une valeur fausse après un redémarrage ou un changement de configuration. La durée totale d'un preset temporisé (PR-03) manque aussi : temps restant en texte, sans barre.
- Alternative écartée : estimer ces valeurs avec les délais de configuration.

### D7. Taille d'un widget
Propriété facultative des contributions `global_widget` et `thermostat_widget` : `size?: { columns?: 1 | 2 | 3 | "full"; rows?: 1 | 2 | 3 }`. Défaut : `{ columns: 1, rows: 1 }`.
- **Colonnes** : entier de 1 à 3, ou `"full"` (toute la rangée). L'unité d'une colonne est la colonne de la grille (280 px minimum). 3 colonnes (soit 3 × 280 px et les écarts, environ 880 px) tiennent dans le panneau d'un écran de bureau ; au-delà, `"full"` couvre le besoin.
- **Lignes** : entier de 1 à 3. Les lignes de la grille restent automatiques (leur hauteur suit le contenu) : `rows` fixe une hauteur **minimale** de `rows × 140 px` plus les écarts entre lignes (`calc(N * var(--vtherm-widget-row) + (N - 1) * gap)`), pas un intervalle de lignes de grille. Sans `rows`, aucune hauteur minimale : le rendu des widgets existants est inchangé. 140 px = une jauge et deux lignes de texte.
- **Nombre de colonnes de la grille** : calculé à la mesure par un `ResizeObserver` du conteneur (`floor((largeur + écart) / (280 + écart))`, au moins 1), puis `grid-template-columns: repeat(n, 1fr)`. Une largeur demandée est ramenée à `min(demandée, n)` : un widget de 3 colonnes dans une grille de 2 en occupe 2, jamais une colonne implicite qui déborde. `"full"` occupe `1 / -1`. Quand `n = 1` (écran étroit, 375 px), tout est ramené à 1 colonne, la hauteur minimale reste.
- **Pas de `grid-auto-flow: dense`** : il remplit les trous en déplaçant les cartes, donc l'ordre visuel ne suit plus l'ordre du DOM. L'ordre de lecture, de tabulation et de placement (`after`, `before`) serait faux. Conséquence acceptée : un widget large en fin de rangée peut laisser un trou ; l'auteur ordonne ses widgets.
- **Validation** : `size` doit être un objet ; `columns` vaut 1, 2, 3 ou `"full"` ; `rows` vaut 1, 2 ou 3 ; une autre clé ou valeur est refusée avec le chemin (`plugins.smartpi.contributions.thermostat_widget[0].size.columns`). Sur un autre hook, `size` est refusé. Le type TypeScript n'offre `size` que sur les deux hooks de widget.
- **Forme comparée** : des classes nommées (`small|medium|large|wide|full`) cachent le calcul, imposent un tableau de correspondance à documenter et à maintenir, et ne disent pas si « wide » prend 2 ou 3 colonnes ; des entiers bornés se traduisent directement en CSS et se testent. Alternative écartée aussi : des nombres libres (grille imprévisible, widgets de 7 colonnes impossibles à replier).

### Décisions prises par défaut (à confirmer)
| # | Hypothèse | Alternative écartée |
| --- | --- | --- |
| a | Le SDK ajoute seulement `getEntryEntities`, le contexte `central` et `size`. L'historique n'est pas exporté : les widgets natifs utilisent le client interne, les plugins tiers `hass.callWS`. (Réduit après l'audit de redondance.) | Exporter `readHistory` et un répertoire d'entités : redondants avec `hass`. Rester entièrement natif : les plugins tiers n'auraient même pas le filtre d'entités. |
| b | La présence est **globale** ; la température extérieure est **par thermostat**. | Présence par thermostat : le capteur propre à un thermostat existe mais est rare. Température extérieure globale : fausse quand un thermostat a son propre capteur. |
| c | Première version en **affichage seul** : mode, preset, verrou, contournement de fenêtre, mode central, Auto TPI, présence simulée ne sont pas commandables. Ces commandes sont un change à part. | Commandes dès la première version : confirmations, droits, retour d'erreur, code de verrouillage. |
| d | **Taille déclarable par widget** (`size`), grille de ~280 px par colonne. | Grille fixe de 280 px sans taille par widget. |

## Risques / Trade-offs
- Les registres `hass.entities` et `hass.devices` et leurs champs (`identifiers`, `translation_key`) n'ont pas été vérifiés sur la version de Home Assistant du projet (la documentation cite 2026.10 ; `hacs.json` de VT demande 2026.10.4) : le code lu est la branche `dev` du frontend. Un champ absent donne une valeur vide, jamais une erreur. La tâche 1.1 le vérifie dans le devcontainer.
  - **Vérifié (tâche 1.1, 2026-11-19)** dans le devcontainer, Home Assistant **2026.10.4** et frontend `20260930.5`, par lecture du code installé :
    - `config/entity_registry/list_for_display` (`helpers/entity_registry.py`, `_as_display_dict`) envoie toujours `ei` (entité) et `pl` (plateforme), et `di` (appareil), `tk` (clé de traduction), `ai`, `lb`, `np`, `ic` quand ils ne sont pas nuls ; le frontend les décompresse en `entity_id`, `platform`, `device_id`, `translation_key`. **Aucun `config_entry_id`** dans ce registre.
    - `config/device_registry/list` (`helpers/device_registry.py`, `dict_repr`) envoie `id`, `identifiers` (liste de paires `[domaine, identifiant]`) et `config_entries` (marqué obsolète, retiré en 2027.8) ; il envoie aussi `config_entry_id`. Le filtre passe par `identifiers`, qui n'est pas obsolète.
    - Versatile Thermostat (`external/`, commit `e0b0a2f`) : l'entrée centrale ne crée qu'un `select`, `CentralModeSelect` (`unique_id` `central_mode`, sans `translation_key`), sur l'appareil d'identifiant `("versatile_thermostat", <entrée>)`. L'autre `select` de VT (`auto_start_stop_stop_mode`, avec clé de traduction) n'existe que pour un thermostat `over_climate`. Le `select` du mode central est donc le seul `select` sans clé de traduction de l'appareil central.
- Le registre d'affichage n'expose pas `unique_id` : le `select` du mode central se retrouve par domaine sur l'appareil central, ce qui suppose qu'il en soit le seul `select` sans clé de traduction (à vérifier en 1.1, avec `overview-dashboard`).
- Un widget qui lit `hass.entities` à chaque rendu parcourt tout le registre. Mesure à faire avec 30 thermostats avant d'ajouter un index.
- `size` ajoute un champ au contrat : la forme est figée par la version du SDK ; ajouter une valeur plus tard (`columns: 4`) est compatible, en retirer une ne l'est pas.
- Les noms d'attributs et les clés de traduction de VT viennent de la lecture de son code (état du dépôt `external/` à la date du plan), pas d'une exécution.
- `native/insight-panels.ts` perd son appel `get_thermostats` pour les entités : la tâche 1.4 vérifie que les panneaux d'estimation trouvent les mêmes entités.
