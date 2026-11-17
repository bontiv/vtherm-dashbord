# Tasks

Prérequis : `central-config-flags`, `ha-save-actions` et `config-navigation-status` sont appliqués (voir design.md, Risks).

## 1. Sections et navigation de la création

- [x] 1.1 Ajouter `CREATION_TABS` et une fonction qui renvoie les identifiants des contributions de création pour un genre et des valeurs donnés (`frontend/src/native/tab-definitions.ts`, `native-plugin.ts`) (design D1). Vérifier par un test que `over_switch` donne type, main, tpi, advanced, que `over_climate` sans vanne donne type, main, advanced, et que le central donne main, tpi, advanced.
- [x] 1.2 Ajouter l'option `creation` à `NavigationInput` et le thermostat « nouveau » à `resolveNavigation` (`frontend/src/navigation.ts`, design D2) : entrées filtrées et ordonnées, pas de sélecteur, fil d'ariane « Thermostats > Nouveau thermostat > section », retour à la première section avec `route_unknown` pour une section absente. Vérifier par des tests de `frontend/test/navigation.test.ts` les scénarios « Sections de la création », « Section d'une création » (fil d'ariane et itinéraire) et « Section absente de la création ».

## 2. Brouillons et envoi de la création

- [x] 2.1 Ajouter `startCreation`, `creation` et `create` à `ConfigSession` (`frontend/src/config/config-session.ts`, design D3). L'envoi comprend un onglet vide pour chaque section de création qui s'applique ; en cas de succès, le brouillon est retiré et la liste relue ; en cas de refus, les erreurs sont posées sur le brouillon. Vérifier par des tests de `config-session.test.ts` les onglets envoyés, le succès et le refus.
- [x] 2.2 Ajouter à `ConfigDraft` le changement de type avec filtrage des clés et des domaines d'entités (`frontend/src/config/draft.ts`, design D4). Vérifier par des tests de `draft.test.ts` les deux scénarios de « Changement de type pendant la création » et « Entités compatibles conservées ».

## 3. Page de création dans le panel

- [x] 3.1 Dans `frontend/src/panel.ts`, rendre la création comme une page de configuration (menu, section courante, propriétés `creating`), faire renvoyer la clé de création par `entryOf` et passer à la navigation l'option `creation` pour les thermostats et pour la configuration centrale. Vérifier par des tests de `panel-config.test.ts` l'ouverture de `/thermostats/new`, le passage d'une section à l'autre sans perte du brouillon et la confirmation au départ (« Abandon de la création »).
- [x] 3.2 Afficher le choix du type en tête de l'onglet natif `type` en création (`frontend/src/native/native-tab.ts`), avec les cartes de `field-help-diagrams` si ce changement est déjà appliqué, sinon le `ha-selector` en liste et son repli en boutons radio. Vérifier par des tests de `native-tabs.test.ts` et `ha-screens.test.ts` le choix au clavier et au toucher, avec des zones d'au moins 44 px sur écran étroit.
- [x] 3.3 Brancher les actions de carte de `ha-save-actions` sur la création (libellé Créer, commande `create`, Annuler qui abandonne sans confirmation, Créer actif dès que rien ne manque) et la liste des manquants près de Créer (design D5). Puis naviguer vers le thermostat créé, ou vers la configuration générale, après un succès. Vérifier par des tests de `panel-config.test.ts` les scénarios « Configuration incomplète », « Création refusée par Versatile Thermostat » et « Création réussie ».
- [x] 3.4 Remplacer, dans la page « Configuration centrale » (`frontend/src/native/core-pages.ts`), la navigation vers `/thermostats/new/central` par le démarrage de la création centrale dans l'onglet de configuration, et masquer cette page pendant la création. Vérifier par des tests les scénarios « Configuration centrale absente », « Création de la configuration centrale » et « Configuration centrale créée ».

## 4. Retrait de l'assistant, textes et documentation

- [x] 4.1 Supprimer `frontend/src/components/create-wizard.ts`, son import dans `panel.ts` et ses tests. Déplacer les textes utiles sous `creation.*` en en/fr/de dans `frontend/src/shell-translations.ts`. Vérifier que `npm run build`, `npm run lint` et `shell-translations.test.ts` passent.
- [x] 4.2 Réécrire les sections « Create the central configuration » et « Create a thermostat » de `docs/user/configuration.md` (sections de la création, type en premier, Créer, abandon) et mettre à jour `docs/contributing/architecture.md` (plus d'assistant). Ajouter une entrée « Changed » au `CHANGELOG.md`. Vérifier que `npm test -- docs` passe.
- [x] 4.3 Mettre à jour les tâches 5.x de `openspec/changes/field-help-diagrams/tasks.md` et la mention de l'assistant dans `openspec/changes/live-setting-insights/tasks.md` pour qu'elles visent la section Type et la page de création. Vérifier que `openspec validate field-help-diagrams` et `openspec validate live-setting-insights` passent.

## 5. Vérification d'ensemble

- [ ] 5.1 Dans le devcontainer, à 1440 px puis à 375 px :
  - sans configuration centrale, créer un `over_switch` en modifiant un coefficient TPI, puis vérifier dans Home Assistant la valeur enregistrée ;
  - créer ensuite la configuration centrale depuis l'onglet de configuration ;
  - créer un `over_climate` et vérifier qu'il n'a pas de section TPI et qu'il hérite de la configuration centrale ;
  - vérifier qu'aucune page ne déborde horizontalement.
