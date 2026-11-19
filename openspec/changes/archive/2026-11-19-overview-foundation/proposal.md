# Proposal

## Why
La vue d'ensemble d'un thermostat n'est aujourd'hui qu'une ligne « Type » au-dessus d'une grille vide (`frontend/src/native/core-pages.ts`), et la page Overview du dashboard est vide aussi : aucun plugin natif ne contribue de widget. Le plan `.kiro/plan/overview-runtime-elements.md` recense 27 widgets d'éléments de fonctionnement (20 sur un thermostat, 7 sur le dashboard). Avant d'en écrire un seul, il faut un socle commun, sinon chaque widget réinvente le format des valeurs, les états « vide » ou « indisponible » et la taille de sa carte.

Un audit contre l'API de Home Assistant (section « Audit de redondance » du design) a réduit le socle : l'objet `hass` du frontend donne déjà, de façon synchrone, les états, le registre des entités, le registre des appareils et `callWS`. Le SDK n'ajoute donc ni appel serveur, ni répertoire, ni lecteur d'historique. Il manque seulement trois choses que `hass` ne donne pas : le filtre « entités d'une entrée de configuration » (le registre d'affichage des entités n'a pas `config_entry_id`), les valeurs de la configuration centrale pour un widget global, et la taille d'un widget dans la grille.

## What Changes
- **SDK, lecture** : une fonction pure `getEntryEntities(hass, entryId)` qui trouve l'appareil d'une entrée de configuration (par ses `identifiers` dans `hass.devices`) puis ses entités (par `device_id` dans `hass.entities`). Elle sert pour un thermostat (`thermostatId` est l'identifiant de l'entrée) et pour la configuration centrale. Les registres `entities` et `devices` entrent dans le type `Hass`.
- **SDK, contexte des widgets globaux** : un widget `global_widget` et sa condition `visible` reçoivent aussi `central`, l'identifiant et les valeurs de la configuration centrale (comme `thermostat_widget` reçoit déjà `centralValues`).
- **SDK, taille** : une propriété facultative `size` sur les contributions de widget : `{ columns?: 1 | 2 | 3 | "full"; rows?: 1 | 2 | 3 }`, validée à l'enregistrement. Sans elle, un widget garde une colonne et sa hauteur actuelle : aucun plugin existant ne change. **Remplace l'hypothèse « grille fixe ».**
- **Grille** : le conteneur des widgets calcule le nombre de colonnes de 280 px, applique `size`, revient à une colonne sur écran étroit et garde l'ordre du DOM (pas de `dense`).
- **Harnais de test** : le faux `hass` accepte `entities` et `devices` ; les contributions résolues portent leur taille normalisée.
- **Composants de présentation** réutilisables (dashboard, non exportés par le SDK) : carte de widget, jauge, barre (simple et segmentée), icône d'état, ligne de valeur, âge relatif. Ils utilisent les composants de Home Assistant quand ils existent.
- **Conventions des widgets** : identifiants `<plugin>.widget.<nom>`, titre traduit, états chargement / vide / indisponible, accessibilité, unités et formats régionaux, masquage d'un widget dont la fonctionnalité est éteinte, re-rendu limité aux entités lues.
- Le conteneur (`vtherm-widgets`) devient un `ha-card` et transmet `narrow` aux widgets.
- **Retiré par rapport à la première version du change** : `getCentralEntities`, `readHistory`, le répertoire d'entités rempli par `get_thermostats` et `get_central_config`, le champ Python `central_device_id`.
- Aucun widget n'est livré : la vue reste vide jusqu'au change `overview-thermostat-core`.

## Capabilities

### New Capabilities
- `overview-widgets`: règles communes des widgets de fonctionnement (carte, états, formats, accessibilité, thème, écran étroit, coût, taille et grille) et composants de présentation.

### Modified Capabilities
- `ui-plugin-sdk`: nouvelles exigences : lecture des entités d'une entrée de configuration, contexte de la configuration centrale des widgets globaux, taille d'un widget, registres dans le type `Hass`, harnais de test des widgets.

## Impact
- `packages/sdk/src/` : types (`Hass.entities`, `Hass.devices`, `WidgetSize`, `central`), une fonction pure, validation de `size`, `testing.ts`. Version du SDK : ajouts facultatifs et compatibles, pas de rupture.
- `frontend/src/` : `native/insight-panels.ts` délègue sa recherche d'entités à la fonction du SDK (un appel WebSocket en moins) ; composants sous `frontend/src/components/overview/` ; `components/widgets.ts` (grille, `ha-card`, `narrow`) ; `panel.ts` transmet `central` aux widgets globaux.
- `native/history.ts` reste interne : les widgets natifs l'utilisent comme les panneaux d'estimation ; les plugins tiers lisent l'historique avec `hass.callWS` (recette documentée).
- Textes : clés communes en en/fr/de dans `scripts/native-texts.ts` (catalogues régénérés).
- Documentation : `docs/plugins/plugin-development.md` (l'exemple qui traite `thermostatId` comme une entité `climate` est faux), `docs/plugins/hooks-and-placement.md` (taille, grille, contexte central), `docs/plugins/testing.md`, `docs/reference/sdk`, `CHANGELOG.md` (section « For plugin authors »).
- Aucun appel réseau ni code Python nouveau. Les dépendances sont celles du dépôt (Lit, composants de Home Assistant).
- À appliquer en premier : les changes `overview-thermostat-core`, `overview-dashboard`, `overview-thermostat-protections` et `overview-thermostat-details` en dépendent.
