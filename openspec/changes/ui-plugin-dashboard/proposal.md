# Proposal

## Why

Versatile Thermostat (VTherm) n'a pas d'interface unifiée pour configurer et superviser l'ensemble des thermostats. De plus, ses plugins (via `vtherm_api`) modifient ou ajoutent des fonctionnalités, mais ne peuvent pas contribuer à une interface commune. Il faut un dashboard "Home confort" dans Home Assistant, extensible par les plugins sans modifier son code.

## What Changes

- Nouvelle extension Home Assistant (custom component) qui ajoute l'entrée "Home confort" dans le menu latéral via un panel.
- Enrichissement de `vtherm_api` avec une API d'enregistrement de plugins UI, nommée avec le préfixe `ui` pour la distinguer des API des plugins thermostat : `register_ui_plugin`, `unregister_ui_plugin`, `get_ui_plugins`.
- Commande WebSocket `vtherm_dashboard/get_ui_plugins`, exposée par notre extension (`vtherm_api` est un package Python pur et n'expose pas de WebSocket).
- Registre JavaScript `VThermUiPluginRegistry` : le dashboard charge dynamiquement le `js_url` de chaque plugin UI, qui s'enregistre et déclare ses contributions.
- Package npm `@vtherm/dashboard-sdk` : types TypeScript du contrat et fonction `registerUiPlugin` que les plugins utilisent pour se déclarer, et un point d'entrée `@vtherm/dashboard-sdk/testing` avec un faux hôte pour les tests sans Home Assistant.
- Documentation dans `docs/` : API (Python, WebSocket, SDK), procédure complète pour développer un plugin UI, guides utilisateur et contributeur, journal des changements. La référence est générée depuis le code, les exemples sont compilés par les tests, et l'intégration continue vérifie liens, index et synchronisation.
- Mode développement : un administrateur peut déclarer dans son navigateur l'URL d'un serveur local (`rollup -c --watch`, `vite build --watch`) pour remplacer un plugin installé ou tester un plugin sans enregistrement Python. Un bandeau le signale.
- Compatibilité : chaque plugin déclare, à l'enregistrement Python, une contrainte sur la version du dashboard (`dashboard_version`, par exemple `>=1.0,<2.0`). Le dashboard refuse de charger un plugin dont la contrainte n'est pas satisfaite, trop ancien ou trop récent.
- Deux niveaux déclaratifs distincts, sans numéro d'ordre :
  - **Dépendances de chargement** (niveau plugin UI) : `requires`, `load_after`, `load_before`.
  - **Positionnement** (niveau de chaque contribution) : `first`, `last`, `before`, `after`, `replace`, `remove`, résolu à l'ajout.
- Cinq hooks de contribution : configuration générale, configuration par thermostat, widget de supervision global, page de supervision globale, widget de supervision par thermostat.
- Le thème du dashboard réutilise les variables CSS du thème actif de Home Assistant.

## Capabilities

### New Capabilities
- `ui-plugin-registration`: API Python `vtherm_api` d'enregistrement et de lecture des plugins UI, et commande WebSocket de découverte.
- `ui-plugin-loading`: chargement côté frontend des plugins UI, résolution des dépendances de chargement (`requires`, `load_after`, `load_before`), compatibilité de version et gestion des erreurs (cycle, dépendance manquante, dashboard incompatible).
- `ui-contribution-placement`: hooks de contribution et résolution déclarative des positions (`first`, `last`, `before`, `after`, `replace`, `remove`).
- `ui-plugin-sdk`: package npm `@vtherm/dashboard-sdk` (types, `registerUiPlugin`, validation, harnais de test, version du dashboard en lecture seule).
- `ui-plugin-dev-mode`: chargement de plugins depuis un serveur de développement local, déclaré dans le navigateur d'un administrateur.
- `project-documentation`: contenu, organisation et maintien à jour de la documentation du projet dans `docs/`, y compris la procédure pour les auteurs de plugins.
- `dashboard-panel`: panel "Home confort" dans le menu latéral de Home Assistant, page de configuration/supervision du cœur et thème hérité de Home Assistant.

### Modified Capabilities
<!-- Aucune : le projet ne contient pas encore de spec. -->

## Impact

- Nouveau code : custom component Python (panel, WebSocket) et SPA frontend (web components).
- `vtherm_api` (package externe) : ajout de l'API des plugins UI. Il faut coordonner avec ses mainteneurs.
- Plugins VTherm existants : doivent appeler `register_ui_plugin` et fournir un module JS (écrit avec `@vtherm/dashboard-sdk`) pour apparaître dans le dashboard. Aucun changement pour ceux qui n'ont pas d'UI.
- Publication : le scope npm `@vtherm` appartient au projet. Le package `@vtherm/dashboard-sdk` est versionné avec le dashboard et publié depuis le même dépôt.
- Hypothèse retenue : le `js_url` est déclaré de façon programmatique lors du setup du plugin (et non via un manifest statique).
- Hors périmètre : contenu détaillé des écrans de configuration du cœur VTherm et des plugins spécifiques (SmartPI, etc.).
