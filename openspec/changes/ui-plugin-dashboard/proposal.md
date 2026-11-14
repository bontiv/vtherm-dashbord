# Proposal

## Why

Versatile Thermostat (VTherm) n'a pas d'interface unifiée pour configurer et superviser l'ensemble des thermostats. De plus, ses plugins (via `vtherm_api`) modifient ou ajoutent des fonctionnalités, mais ne peuvent pas contribuer à une interface commune. Il faut un dashboard "Home confort" dans Home Assistant, extensible par les plugins sans modifier son code.

## What Changes

- Nouvelle extension Home Assistant (custom component) qui ajoute l'entrée "Home confort" dans le menu latéral via un panel.
- Enrichissement de `vtherm_api` avec une API d'enregistrement de plugins UI, nommée avec le préfixe `ui` pour la distinguer des API des plugins thermostat : `register_ui_plugin`, `unregister_ui_plugin`, `get_ui_plugins`.
- Commande WebSocket `vtherm_dashboard/get_ui_plugins`, exposée par notre extension (`vtherm_api` est un package Python pur et n'expose pas de WebSocket).
- Registre JavaScript `VThermUiPluginRegistry` : le dashboard charge dynamiquement le `js_url` de chaque plugin UI, qui s'enregistre et déclare ses contributions.
- Configuration native du cœur de Versatile Thermostat : création, consultation et modification de la configuration générale (configuration centrale) et de celle de chaque thermostat, avec les mêmes règles de validation que le config flow de Versatile Thermostat.
- Plugins natifs : le dashboard fournit lui-même 15 plugins UI (`core`, `core_tpi`, `core_window`, etc.), un par étape du config flow, enregistrés par les mêmes mécanismes que les plugins tiers. Les identifiants `core` et `core_*` leur sont réservés.
- Contributions à visibilité conditionnelle (par exemple un onglet affiché seulement si une fonctionnalité est active) et contexte de configuration transmis aux composants (valeurs, erreurs, brouillon).
- Package npm `@vtherm/dashboard-sdk` : types TypeScript du contrat et fonction `registerUiPlugin` que les plugins utilisent pour se déclarer, et un point d'entrée `@vtherm/dashboard-sdk/testing` avec un faux hôte pour les tests sans Home Assistant.
- Langue : en-têtes, commentaires, docstrings et documentation exclusivement en anglais (les traductions de l'interface restent dans les fichiers de traduction).
- Conventions de code vérifiées par l'intégration continue : TypeScript strict pour tout le code destiné au navigateur ou à Node (pas de fichiers `.js` dans les sources), Python aligné sur Versatile Thermostat (Black 180 colonnes, pylint, fins de ligne LF, pytest asynchrone automatique).
- Documentation dans `docs/` : API (Python, WebSocket, SDK), procédure complète pour développer un plugin UI, guides utilisateur et contributeur, journal des changements. La référence est générée depuis le code, les exemples sont compilés par les tests, et l'intégration continue vérifie liens, index et synchronisation.
- Mode développement : un administrateur peut déclarer dans son navigateur l'URL d'un serveur local (`rollup -c --watch`, `vite build --watch`) pour remplacer un plugin installé ou tester un plugin sans enregistrement Python. Un bandeau le signale.
- Compatibilité : chaque plugin déclare, à l'enregistrement Python, une contrainte sur la version du dashboard (`dashboard_version`, par exemple `>=1.0,<2.0`). Le dashboard refuse de charger un plugin dont la contrainte n'est pas satisfaite, trop ancien ou trop récent.
- Deux niveaux déclaratifs distincts, sans numéro d'ordre :
  - **Dépendances de chargement** (niveau plugin UI) : `requires`, `load_after`, `load_before`.
  - **Positionnement** (niveau de chaque contribution) : `first`, `last`, `before`, `after`, `replace`, `remove`, résolu à l'ajout.
- Navigation du dashboard : onglets supérieurs (Dashboard, Thermostats, onglets de plugins, roue crantée de Configuration seule à droite), menu de gauche défilant construit par les contributions, fil d'ariane, itinéraires et affichage mobile.
- Sept hooks de contribution : onglet supérieur, entrée de menu d'un onglet, page globale, widget global, section de configuration générale, entrée de menu d'un thermostat (dont ses sections de configuration), widget de vue d'ensemble d'un thermostat. Les entrées de menu ont un titre, une icône et un groupe facultatifs.
- Le thème du dashboard réutilise les variables CSS du thème actif de Home Assistant.

## Capabilities

### New Capabilities
- `ui-plugin-registration`: API Python `vtherm_api` d'enregistrement et de lecture des plugins UI, et commande WebSocket de découverte.
- `ui-plugin-loading`: chargement côté frontend des plugins UI, résolution des dépendances de chargement (`requires`, `load_after`, `load_before`), compatibilité de version et gestion des erreurs (cycle, dépendance manquante, dashboard incompatible).
- `ui-contribution-placement`: hooks de contribution et résolution déclarative des positions (`first`, `last`, `before`, `after`, `replace`, `remove`).
- `ui-plugin-sdk`: package npm `@vtherm/dashboard-sdk` (types, `registerUiPlugin`, validation, harnais de test, version du dashboard en lecture seule).
- `ui-plugin-dev-mode`: chargement de plugins depuis un serveur de développement local, déclaré dans le navigateur d'un administrateur.
- `project-documentation`: contenu, organisation et maintien à jour de la documentation du projet dans `docs/`, y compris la procédure pour les auteurs de plugins.
- `core-config-management`: création, modification et validation de la configuration générale et par thermostat de Versatile Thermostat (brouillon, héritage de la configuration centrale, compatibilité de version).
- `core-native-plugins`: plugins UI natifs du dashboard, leurs onglets, champs et conditions d'affichage, déduits du config flow de Versatile Thermostat.
- `code-conventions`: TypeScript strict à la place de JavaScript, conventions Python de Versatile Thermostat, et vérification automatique.
- `dashboard-panel`: panel "Home confort" dans le menu latéral de Home Assistant, page de configuration/supervision du cœur et thème hérité de Home Assistant.

### Modified Capabilities
<!-- Aucune : le projet ne contient pas encore de spec. -->

## Impact

- Nouveau code : custom component Python (panel, WebSocket) et SPA frontend (web components).
- `vtherm_api` (package externe) : ajout de l'API des plugins UI. Il faut coordonner avec ses mainteneurs.
- Plugins VTherm existants : doivent appeler `register_ui_plugin` et fournir un module JS (écrit avec `@vtherm/dashboard-sdk`) pour apparaître dans le dashboard. Aucun changement pour ceux qui n'ont pas d'UI.
- Publication : le scope npm `@vtherm` appartient au projet. Le package `@vtherm/dashboard-sdk` est versionné avec le dashboard et publié depuis le même dépôt.
- Hypothèse retenue : le `js_url` est déclaré de façon programmatique lors du setup du plugin (et non via un manifest statique).
- Évolution prévue : la validation et la normalisation de la configuration seront à terme partagées dans `vtherm_api` (contribution amont) pour remplacer le pilotage du config flow par une mise à jour directe de l'entrée. Cette version pilote le flow et le documente.
- Couplage avec Versatile Thermostat : la configuration native dépend du config flow de Versatile Thermostat (étapes, règles de validation, clés de configuration). Le dashboard déclare la version de configuration qu'il supporte et passe en lecture seule au-delà.
- Hors périmètre : écrans de configuration des plugins tiers (SmartPI, etc.), suppression d'un thermostat (laissée à l'interface de Home Assistant), convention de stockage de la configuration propre aux plugins tiers, contenu de la supervision.
