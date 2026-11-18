# Proposal

## Why
L'onglet « Paramètres avancés » (plugin `core_advanced`) porte le nom de l'étape « advanced » du config flow de Versatile Thermostat. Ce nom ne dit rien de son contenu. Il prête aussi à confusion avec le panneau replié « Paramètres avancés (N) » que chaque section affiche en fin de page : l'onglet « Paramètres avancés » contient lui-même un panneau « Paramètres avancés (2) » (`safety_min_on_percent` et `repair_incorrect_state`).

L'utilisateur pense que l'onglet ne contient que les réglages du mode sécurité. C'est inexact : il a cinq champs de réglage (six avec la case de l'héritage central), dont deux n'ont rien à voir avec la sécurité.

| Champ | Rôle | Lié au mode sécurité |
|---|---|---|
| `use_advanced_central_config` | Utiliser la configuration centrale avancée (thermostat seulement) | non (héritage) |
| `safety_delay_min` | Délai maximal entre 2 mesures de température (60 min) | oui |
| `safety_min_on_percent` | Pourcentage minimal de puissance pour entrer en mode sécurité (0,5) | oui |
| `safety_default_on_percent` | Pourcentage de puissance utilisé en mode sécurité (0,1) | oui |
| `repair_incorrect_state` | Réparer l'état incorrect des équipements sous-jacents (non) | non |
| `manual_override_duration_min` | Durée de la dérogation manuelle, en minutes (0) | non |

Les champs viennent de `STEP_ADVANCED_DATA_SCHEMA` et `STEP_CENTRAL_ADVANCED_DATA_SCHEMA` de Versatile Thermostat ; le panneau « insights » de l'onglet ne rejoue que la sécurité. Nommer l'onglet « Mode sécurité » ou « Détection panne capteur » cacherait la dérogation manuelle.

## What Changes
- L'onglet `core_advanced` s'appelle **« Sécurité et dérogation »** en français, **« Safety and manual override »** en anglais, **« Sicherheit und manuelle Übersteuerung »** en allemand (variante courte prévue si le nom ne tient pas à 360 px : « Sicherheit und Übersteuerung »). Le nom couvre les trois réglages du mode sécurité et la dérogation manuelle (l'utilisateur reprend la main). La réparation de l'état incorrect (`repair_incorrect_state`) est un filet de sécurité que le nom ne cite pas : compromis assumé, compensé par la description.
- La description de l'onglet (`description.advanced`) nomme les cinq réglages et garde l'ancien nom : « Versatile Thermostat appelle cet onglet « Paramètres avancés » », pour que l'utilisateur de la doc de VT retrouve l'onglet.
- Le titre change partout où il s'affiche : entrée de menu du thermostat et de la Configuration, titre de la section, fil d'Ariane, résumé de page. Le libellé « Paramètres avancés » du panneau replié de chaque section ne change pas.
- Les textes de la documentation qui citent l'ancien nom sont mis à jour, avec une mention que Versatile Thermostat appelle cette étape « Advanced parameters ».
- Le générateur de catalogues accepte un titre et une description d'onglet propres au dashboard, qui prennent le pas sur ceux de Versatile Thermostat (aujourd'hui `title.<onglet>` et `description.<onglet>` viennent toujours de VT).
- Inchangés : l'identifiant `core_advanced`, les identifiants `core_advanced.tab.main` et `core_advanced.general.main`, la clé de catalogue `title.advanced`, la clé d'onglet `advanced`, les clés des champs, les adresses (URL) des pages et la place dans le menu. Les plugins tiers qui se placent `after:` ou `before:` cet onglet et les liens enregistrés continuent donc de fonctionner.
- Python, SDK et config flow de Versatile Thermostat : aucun changement.

## Capabilities

### New Capabilities
<!-- Aucune. -->

### Modified Capabilities
- `core-native-plugins`: le plugin `core_advanced` fixe le titre de son onglet dans les trois langues.

## Impact
- `scripts/generate-native-catalogs.ts` : un titre ou une description d'onglet de `PLUGIN_TEXTS` prend le pas sur `menu_options` et sur la description de VT.
- `scripts/native-texts.ts` : entrées `title.advanced` et `description.advanced` de `core_advanced` en en/fr/de.
- `frontend/src/native/catalogs/core_advanced.ts` : régénéré par `npm run catalogs:generate` (seules les lignes `title.advanced` et `description.advanced` changent ; ne pas l'éditer à la main).
- Tests qui lisent l'ancien titre : `frontend/test/panel-config.test.ts` (menus et fil d'Ariane de la création, lignes 335, 372, 393, 399, 558) ; ajouter un test du titre dans `frontend/test/native-plugins.test.ts` ou `frontend/test/shell-translations.test.ts`.
- Documentation : `docs/user/configuration.md` (étape 4 de la création, phrase des sections TPI et avancé, tableau des sections, panneau « What VT would do with these settings »), `docs/plugins/native-plugins.md` (lignes 75 et 76 du tableau des placements, ligne 26), `docs/contributing/setting-insights.md` si elle cite l'onglet, `CHANGELOG.md`.
- Spécifications : `openspec/specs/core-native-plugins/spec.md` (exigence « Plugin `core_advanced` »). Les formulations « section Avancé » des specs `core-config-management`, `dashboard-panel` et `config-section-status` sont des noms courts de section, comme « Principal » ou « TPI » : elles restent.
- Aucun changement visible dans les données : aucune migration.
