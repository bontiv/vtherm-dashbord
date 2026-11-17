# Tasks

## 1. Contrat du SDK

- [x] 1.1 Ajouter à `ThermostatConfigContribution` et `GeneralConfigContribution` (`packages/sdk/src/types.ts`) `status?: (context) => SectionStatus` et `feature?: string`, avec le type `SectionStatus` ; étendre la validation à l'enregistrement ; vérifier par des tests de types et `frontend/test/registry.test.ts`
- [x] 1.2 Permettre au harnais de test du SDK d'évaluer la fonction de statut d'une contribution ; vérifier par un test d'exemple dans `docs/examples/typescript/`
- [x] 1.3 Documenter le statut et la fonctionnalité dans `docs/plugins/hooks-and-placement.md` et régénérer la référence ; vérifier `npm run check:reference` et `npm run check:docs`

## 2. Modèle de statut

- [x] 2.1 Ajouter `status` à `NavItem` dans `frontend/src/navigation.ts`, calculé selon la priorité refusée, éteinte, incomplète, héritée, complète, avec les erreurs du brouillon par onglet et une fonction de statut neutralisée si elle échoue ; vérifier par des tests dans `frontend/test/navigation.test.ts` chaque scénario de « Statuts d'une section » et « Priorité des statuts »
- [x] 2.2 Faire calculer par `frontend/src/config/draft.ts` les onglets en erreur et leur levée quand un champ refusé change ; vérifier par des tests dans `frontend/test/draft.test.ts`

## 3. Onglets natifs

- [x] 3.1 Séparer dans `frontend/src/native/tab-definitions.ts` l'applicabilité de l'activation et déclarer `feature` pour les sept onglets de fonctionnalité ; vérifier par des tests dans `frontend/test/native-plugins.test.ts` que l'onglet reste visible éteint et qu'une fonctionnalité non applicable reste masquée
- [x] 3.2 Fournir dans `frontend/src/native/native-plugin.ts` la fonction de statut des onglets natifs (champs obligatoires applicables sans valeur, héritage) ; vérifier par des tests le scénario « Section incomplète » et « Section entièrement héritée »
- [x] 3.3 Ajouter les textes `status.*` du shell et `feature_intro.<clé>` des plugins natifs en en/fr/de ; vérifier `npm run check:catalogs` et `frontend/test/shell-translations.test.ts`
- [x] 3.4 Mettre à jour `docs/plugins/native-plugins.md` (onglets éteints, interrupteur) ; vérifier `npm run check:docs`

## 4. Affichage

- [x] 4.1 Dessiner l'interrupteur d'activation et l'introduction dans `frontend/src/components/contribution-host.ts` pour une section qui déclare `feature`, sans monter son composant quand elle est éteinte ; vérifier par des tests les scénarios « Découverte de la détection d'ouverture », « Activation sur place » et « Activation depuis l'onglet de la fonctionnalité »
- [x] 4.2 Afficher le statut dans `frontend/src/components/side-menu.ts` (emplacement `end` de `ha-md-list-item`, repli HTML, nom accessible, entrée éteinte en retrait) ; vérifier par des tests de rendu et par le test des styles étroits à 375 px
- [x] 4.3 Ajouter « Aller à <section> » aux messages des actions d'enregistrement (`DraftControls.messages` construits par `frontend/src/panel.ts`, dessinés par `frontend/src/components/card-actions.ts`), la barre d'enregistrement ayant été remplacée par `ha-save-actions` ; vérifier par un test le scénario « Erreur dans une autre section »

## 5. Tuiles des thermostats

- [x] 5.1 Ajouter `climate_entity_id` au résumé des thermostats, sauf si `thermostat-area-grouping` l'a déjà livré, (`vtherm_config.py`, `get_thermostats`), formaté par Black (180) et validé par pylint ; vérifier par un test `pytest` et `npm run check:python`
- [x] 5.2 Remplacer les lignes de `frontend/src/components/thermostat-list.ts` par des grilles de tuiles en direct dans chaque groupe de pièce et dans la vue « Par nom » (température → consigne, action, preset, état indisponible), et le bouton de création par une tuile « Nouveau thermostat » en fin de liste ; vérifier par des tests de rendu les scénarios de « Tuiles des thermostats » et l'absence de débordement à 360 px
- [x] 5.3 Ajouter les textes des tuiles en en/fr/de et mettre à jour la documentation utilisateur de `docs/` et le `CHANGELOG.md` ; vérifier `npm run check:docs`

## 6. Vérification d'ensemble

- [x] 6.1 Exécuter `npm run check`, `npm test` et `npm run test:python` sans erreur
- [x] 6.2 Dans le devcontainer, vérifier les statuts d'un thermostat de chaque type et de la configuration générale (complète, éteinte, héritée, incomplète, refusée), l'activation d'une fonctionnalité depuis sa section et les tuiles, sur bureau et à 375 px, en thème clair et sombre
