# Tasks

## 1. Retrait de l'onglet

- [x] 1.1 Retirer `features` de `MENU_ORDER` (`frontend/src/native/tab-definitions.ts`) en gardant sa définition dans `TAB_DEFINITIONS`, et faire créer par `nativeTabContributions` (`frontend/src/native/native-plugin.ts`) une contribution et un élément seulement pour les onglets de `MENU_ORDER` ; mettre à jour le commentaire de `tabKey` qui cite `core.tab.features`
- [x] 1.2 Tests dans `frontend/test/native-plugins.test.ts` : plus de `core.tab.features` ni de `core.general.features`, ordre et groupes des menus de chaque type et de la configuration centrale sans l'onglet, `isAvailable` et `featureStepOf` inchangés ; adapter `frontend/test/native-tabs.test.ts` (tests de l'onglet features retirés ou remplacés par ceux de l'activation par onglet)

## 2. Refus de l'étape « features »

- [x] 2.1 Exposer dans le brouillon (`frontend/src/config/draft.ts`) les champs refusés d'une étape, et rendre `isRefused` de `frontend/src/panel.ts` vrai pour la contribution dont le `feature` est un champ refusé de l'étape « features » ; même règle pour la cible de « Aller à … »
- [x] 2.2 Tests dans `frontend/test/panel-config.test.ts` : un refus de `use_window_feature` met l'entrée « Ouverture » en erreur et propose « Aller à Ouverture » ; remplacer les tests qui ouvrent `core.tab.features` par l'activation et la désactivation depuis l'onglet de la fonctionnalité, et vérifier que le brouillon enregistre la valeur dans l'étape « features » ; une adresse `core.tab.features` ouvre la page par défaut avec l'avis

- [x] 2.3 Mettre les actions d'enregistrement d'une section dont la fonctionnalité est éteinte au pied de la carte de l'interrupteur (`FeatureControl.actions`, `featureOf` de `frontend/src/panel.ts`, `renderFeature` de `frontend/src/components/contribution-host.ts`), sans carte séparée (`renderActionsCard`), même pour une contribution à `save_actions: "component"` ; test : éteindre l'ouverture depuis son onglet laisse, dans la carte de l'interrupteur, « Modifications non enregistrées » et un bouton « Enregistrer » actif

## 3. Documentation

- [x] 3.1 `docs/plugins/native-plugins.md` : identifiants du plugin `core` (deux onglets), ordre des menus, onglets des fonctionnalités (l'interrupteur écrit dans l'étape « features »), table générée régénérée (`UPDATE_NATIVE_DOCS=1`) ; `docs/plugins/hooks-and-placement.md` (l'interrupteur ne renvoie plus à l'onglet « features ») ; `docs/user/configuration.md` (tableau des sections) et `docs/user/dashboard.md` (activation d'une fonctionnalité)
- [x] 3.2 `CHANGELOG.md` : sous `### Changed`, le retrait de l'onglet « Features » ; sous « For plugin authors », **BREAKING** : `core.tab.features` et `core.general.features` n'existent plus, viser `core.tab.type` ou `core.tab.main`

## 4. Vérification

- [x] 4.1 `npm run check`, les tests vitest et `npm run test:docs`, chaque commande avec un délai maximal (`timeout`)
- [x] 4.2 Dans le HA de développement : menus d'un thermostat de chaque type et de la configuration centrale sans « Fonctions », activation puis désactivation d'une fonctionnalité depuis son onglet et enregistrement, valeur relue après rechargement, ancienne adresse `core.tab.features`

## Workflow follow-up

- Commit, archivage du change avec synchronisation des specs, push.
