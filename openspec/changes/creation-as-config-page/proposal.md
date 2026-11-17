# Proposal

## Why
L'assistant de création empile ses cartes sur une seule page et ne montre que les onglets principal et type. Il ne permet donc pas de régler les paramètres TPI ni les paramètres avancés, que Versatile Thermostat exige quand il n'y a pas de configuration centrale (`central-config-flags` les envoie aujourd'hui avec leurs valeurs par défaut, sans les montrer). Il dessine aussi ses propres boutons et son propre message de champs manquants, à côté de la page de configuration qui a déjà un menu de sections, des brouillons, des erreurs par onglet et, bientôt, des statuts de section et des actions dans la carte. Créer et modifier doivent se ressembler.

## What Changes
- **La création devient une page de configuration** : créer un thermostat ouvre la même mise en page qu'un thermostat existant (menu de gauche, une section à la fois, tiroir sur mobile), avec un brouillon nouveau.
- **Seulement les sections nécessaires** : le menu de la création liste, dans cet ordre, Type, Principal, TPI (quand le type utilise TPI ou la régulation par vanne) et Avancé. Les fonctionnalités, les presets, la vue d'ensemble et les sections des plugins tiers restent sur la page du thermostat créé.
- **Type dans la section Type** : le choix du type est en tête de la section Type, suivi des champs propres au type. Changer de type garde les valeurs déjà saisies que le nouveau type accepte au lieu de tout effacer.
- **Créer** remplace Enregistrer dans les actions de la section. Les sections signalent leurs champs obligatoires manquants. Une création refusée marque les sections en erreur. Une création réussie ouvre le thermostat créé.
- **Configuration centrale** : sa création suit le même modèle dans l'onglet de configuration générale, avec les sections Principal, TPI et Avancé. Les deux dernières sont aujourd'hui envoyées sans être montrées.
- **BREAKING (comportement)** : l'assistant de création (`vtherm-create-wizard`) est supprimé. L'adresse de création d'un thermostat reste `/thermostats/new`, suivie de la section ; celle de la configuration centrale passe dans l'onglet de configuration.

## Capabilities

### New Capabilities
<!-- aucune -->

### Modified Capabilities
- `core-config-management` :
  - la création d'un thermostat et celle de la configuration centrale se font dans une page de configuration, avec un menu limité aux sections nécessaires ;
  - un changement de type conserve les valeurs compatibles.
- `dashboard-panel` : fil d'ariane et itinéraires des pages de création. Le choix du type dans la section Type reprend l'exigence des cibles tactiles.

## Impact
- Frontend :
  - `frontend/src/navigation.ts` (thermostat « nouveau » et sections de création) ;
  - `frontend/src/panel.ts` (rendu de la création, `entryOf`, confirmation de départ, création au lieu d'enregistrement, redirection) ;
  - `frontend/src/config/config-session.ts` (brouillons de création) ;
  - `frontend/src/config/draft.ts` (création par `api.create`, changement de type) ;
  - `frontend/src/native/tab-definitions.ts` (sections de création et leur ordre) ;
  - `frontend/src/native/native-tab.ts` (choix du type en tête de la section Type) ;
  - `frontend/src/native/core-pages.ts` (bouton de création de la configuration centrale) ;
  - suppression de `frontend/src/components/create-wizard.ts` ;
  - textes en/fr/de dans `frontend/src/shell-translations.ts`.
- Tests : `navigation.test.ts`, `panel-config.test.ts`, `config-session.test.ts`, `draft.test.ts`, `ha-screens.test.ts`, `native-tabs.test.ts`.
- Pas de changement du serveur, du SDK ni de l'API WebSocket : `vtherm_dashboard/create` reçoit déjà les onglets.
- Documentation : `docs/user/configuration.md`, `docs/contributing/architecture.md`, `CHANGELOG.md`.
- Ordre : à appliquer après `central-config-flags`, `ha-save-actions` (bouton Créer dans le pied de carte) et `config-navigation-status` (statuts des sections). À coordonner avec `field-help-diagrams`, dont les cartes de type vont dans la section Type et non plus dans l'assistant, et avec `live-setting-insights`, qui prévoyait un cas « assistant de création ».
