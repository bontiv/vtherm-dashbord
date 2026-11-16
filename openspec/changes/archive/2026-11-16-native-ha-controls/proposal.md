# Proposal

## Why
Le dashboard doit ressembler aux interfaces natives de Home Assistant. Aujourd'hui, les onglets natifs dessinent leurs champs avec des contrôles HTML génériques (`input`, `select`, `textarea`, `datalist`) alors que Home Assistant fournit les composants adaptés. Trois cas sont inacceptables pour l'utilisateur : la liste des sous-jacents (underlyings) est un `textarea` (une entité par ligne), les commandes d'allumage et d'extinction d'un VTherm de type switch sont des `textarea`, et le capteur de température est un `input` texte avec une `datalist` sans aucun filtre de classe. Règle voulue : s'il existe un contrôle Home Assistant, il est utilisé en priorité.

## What Changes
- Les champs de configuration des onglets natifs (`frontend/src/native/native-tab.ts`) sont dessinés avec les composants de Home Assistant : `ha-selector` (sélecteurs `entity`, `number`, `boolean`, `select`, `text`, `template`), `ha-switch`, `ha-button`, selon le tableau de correspondance de `design.md`.
- (a) Sous-jacents : `underlying_entity_ids` (et `opening_degree_entity_ids`, `closing_degree_entity_ids`, `sync_entity_ids`) utilisent le sélecteur `entity` en mode `multiple`, filtré par domaine selon le type de VTherm, en conservant l'ordre.
- (b) Commandes switch : `vswitch_on_command` et `vswitch_off_command` ne sont plus des `textarea` : une commande par sous-jacent, saisie avec des contrôles Home Assistant, et sérialisée au format attendu par Versatile Thermostat (`service_name[/attribute:value]`).
- (c) Capteur de température : `temperature_sensor_entity_id` (et `external_temperature_sensor_entity_id`, `humidity_sensor_entity_id`, capteurs de puissance) utilisent le sélecteur `entity` avec filtre de domaine et de `device_class`.
- Chargement des composants : ils ne sont pas tous enregistrés tant qu'une page de Home Assistant ne les a pas utilisés. Un chargeur partagé les rend disponibles avant le premier rendu et prévoit un repli sur les contrôles actuels s'ils restent indisponibles.
- Contrat SDK : le SDK (`@vtherm/dashboard-sdk`) exporte un contrat de champs (un type de champ par contrôle Home Assistant), la correspondance champ vers sélecteur et le chargeur, réutilisables par les plugins tiers. Le harnais de test (`@vtherm/dashboard-sdk/testing`) sait simuler ces composants.
- Règle de conventions : « contrôle Home Assistant en priorité » entre dans la spec `code-conventions`, avec la liste des exceptions justifiées.
- Autres écrans (assistant de création, filtres de la page Compléments, page dev, boutons, saisie des presets) : migrés vers `ha-selector`, `ha-textfield`, `ha-select`, `ha-switch`, `ha-button`, `ha-icon`.
- Décisions validées : commandes on/off et services de la chaudière centrale avec `ha-service-picker` (repli sur un champ texte) ; filtre `device_class` strict `temperature` pour le capteur de température, la valeur déjà enregistrée restant visible ; version minimale de Home Assistant fixée par une tâche de vérification (ordre des listes d'entités) ; contrat SDK limité aux types et à la conversion en sélecteur, sans élément partagé.
- Messages : bandeaux, notices et erreurs (`div` avec `role="alert"` ou `role="status"`) vers `ha-alert` (types `error`, `warning`, `info`).
- Confirmations : dialogues maison de la page Compléments et `window.confirm` du panneau vers `ha-dialog` (ou le dialogue de confirmation de Home Assistant s'il est accessible), avec repli.
- Tableaux faits main (état des plugins, page dev) vers `ha-data-table`, ou `ha-card` avec une liste si le tableau est trop contraint.
- Cartes et sections (`div.card` des onglets natifs, `ul.cards` des Compléments) vers `ha-card`.
- États de chargement en texte simple et progression d'installation vers `ha-circular-progress` ou `ha-spinner` (celui qui existe dans la version minimale de Home Assistant).
- Navigation : menu de gauche, liste des thermostats, sélecteur de thermostat et lien « Créer » vers `ha-list` / `ha-md-list-item`, `ha-select` et `ha-button` avec `href`.
- Groupes de champs longs vers `ha-expansion-panel`.
- Une entité affichée (valeur de lecture seule, suggestion) ouvre la fiche de Home Assistant par l'événement `hass-more-info` (`entityId`).
- Champs de délai (minutes, secondes) : `number` avec unité, pas `duration` (justification et liste des champs dans `design.md`, D8).
- Documentation `docs/` mise à jour dans le même groupe de tâches que chaque changement de comportement public.
- **BREAKING (interne)** : le test `frontend/test/native-tabs.test.ts` qui exige `TEXTAREA` pour `vswitch_on_command` est remplacé. Les valeurs enregistrées ne changent pas de format.

## Capabilities

### New Capabilities
- `ha-native-controls` : utilisation des composants natifs de Home Assistant pour tous les champs du dashboard : correspondance type de champ vers contrôle, filtres, chargement, repli, accessibilité, cas des sous-jacents, des commandes switch et des capteurs.

### Modified Capabilities
- `ui-plugin-sdk` : ajout du contrat de champs (types, correspondance vers sélecteur, chargeur) et du support des composants Home Assistant dans le harnais de test.
- `code-conventions` : ajout de la règle « contrôle Home Assistant en priorité » et de la liste d'exceptions.

## Impact
- **Frontend** : `frontend/src/native/native-tab.ts` (rendu des champs, préréglages, bouton de suggestion), `frontend/src/native/fields.ts` (`parseInput`, `formatInput`, `entityChoices` deviennent des conversions de valeurs de sélecteurs), `frontend/src/native/schemas.ts` (`FieldSpec` : filtres), `frontend/src/components/create-wizard.ts`, `frontend/src/complements/complements-page.ts`, `frontend/src/dev/dev-plugins-page.ts`, `frontend/src/panel.ts` / `top-bar.ts` (boutons), `frontend/src/components/icon.ts`, `frontend/src/components/plugin-status.ts`, `side-menu.ts`, `thermostat-list.ts`, `breadcrumb.ts`, `contribution-host.ts`, `frontend/src/native/core-pages.ts`. L'inventaire complet des fichiers de `frontend/src` qui rendent du HTML est une tâche (3.3).
- **Données** : `shared/vtherm-config-schemas.json` et son test de dérive `tests/test_schema_drift.py` (ajout éventuel de métadonnées de filtre, sans changer les champs de Versatile Thermostat).
- **SDK** : `packages/sdk/src/types.ts`, nouveau module de champs, `index.ts`, `testing.ts`.
- **Tests** : `frontend/test/native-tabs.test.ts`, `frontend/test/fields.test.ts`, tests du SDK.
- **Documentation** : `docs/plugins/plugin-development.md`, `docs/plugins/testing.md`, `docs/plugins/theming.md`, `docs/plugins/native-plugins.md`, `docs/contributing/code-conventions.md`, `docs/user/configuration.md`, `docs/reference/sdk/` (généré).
- **Dépendances** : aucune nouvelle (les composants viennent de Home Assistant à l'exécution). Version minimale de Home Assistant à fixer par la tâche 1.0 (voir `design.md`).
