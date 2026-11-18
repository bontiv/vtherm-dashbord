# Tasks

## 1. SDK : groupes partagés et statuts éteints

- [x] 1.1 Ajouter `CORE_MENU_GROUPS` (`settings`, `features`) dans `packages/sdk/src`, exporté par `index.ts`, avec la documentation TSDoc en anglais
- [x] 1.2 Étendre `SectionStatus` avec `{ kind: "off" }` et le drapeau `off?: true` de `{ kind: "inherited" }`, et faire accepter ces formes par `isSectionStatus` ; tests TypeScript dans `packages/sdk/test/status.test.ts` et `types.test.ts`
- [x] 1.3 Regénérer la référence du SDK (`docs/reference/sdk/`) ; le SDK partage la version du dashboard, changée à la publication : l'ajout est noté dans la section « For plugin authors » de `CHANGELOG.md`

## 2. Navigation et menu

- [x] 2.1 Dans `frontend/src/navigation.ts`, traduire un groupe de `CORE_MENU_GROUPS` avec les textes du shell, et ne plus donner de statut à une entrée `complete` du groupe `settings` ; tests dans `frontend/test/navigation.test.ts` (intitulé partagé par une entrée tierce, absence de coche, coche gardée dans `features`)
- [x] 2.2 Appliquer la priorité refusée, éteinte, héritée éteinte, incomplète, héritée, complète dans `statusOf`, avec le statut `off` renvoyé par une fonction de statut ; tests
- [x] 2.3 Afficher « Central (off) » dans `statusView` de `frontend/src/components/side-menu.ts`, en retrait comme une entrée éteinte ; test dans `frontend/test/side-menu-status.test.ts` (texte et annonce)
- [x] 2.4 Ajouter `menu.group.settings`, `menu.group.features`, `status.inherited_off` et `status.spoken.inherited_off` en en/fr/de dans `frontend/src/shell-translations.ts`

## 3. Onglets natifs : groupes et ordre

- [x] 3.1 Ajouter `MENU_ORDER` (ordre et groupe de chaque onglet) dans `frontend/src/native/tab-definitions.ts`, sans toucher à `TAB_DEFINITIONS` ni à `FLOW_TABS`
- [x] 3.2 Réécrire `previous` de `frontend/src/native/native-plugin.ts` : prédécesseur le plus proche dans `MENU_ORDER` dont le plugin est déjà chargé ; déclarer le groupe partagé de chaque contribution `thermostat_config` et `general_config`
- [x] 3.3 Passer `core.general.create` au groupe `settings` dans `frontend/src/native/plugins/core.ts`, retirer `group.vtherm` de `COMMON_TEXTS` (`scripts/native-texts.ts`) et regénérer les catalogues (`npm run catalogs:generate`)
- [x] 3.4 Tests dans `frontend/test/native-plugins.test.ts` : ordre et intitulés du menu d'un thermostat `over_switch`, `over_valve` et `over_climate` (avec et sans régulation par vanne), de la configuration centrale, du menu de création (Principal, Sous-jacents, TPI, Avancé sous « Paramètres généraux »), et insertion tierce `after: core_tpi.tab.main` avec et sans groupe partagé

## 4. Règles d'extinction

- [x] 4.1 Ajouter la règle `off` à `TabDefinition` et la déclarer pour `humidity` (`use_humidity_feature`) et `lock` (`lock_users` et `lock_automations`, valeurs propres puis centrales héritées), avec les défauts de `shared/vtherm-config-schemas.json`
- [x] 4.2 Appeler la règle dans `nativeStatus` avant le calcul des valeurs manquantes ; tests : humidité off, verrouillage off (thermostat et configuration centrale), « Central (off) » pour un verrouillage hérité d'une centrale sans effet, « Off » quand les valeurs propres l'éteignent aussi, « Central » pour une ouverture héritée d'une centrale sans ouverture

## 5. Synchronisation de la température comme fonctionnalité

- [x] 5.1 Déclarer `feature: "sync_device_internal_temp"` sur l'onglet et faire chercher l'offre de la fonctionnalité dans les formulaires `features` et `type` par `isAvailable`
- [x] 5.2 Ajouter `featureStepOf` et l'utiliser dans `featureOf` de `frontend/src/panel.ts` pour que l'interrupteur modifie l'étape `type` ; `"features"` reste l'étape des plugins tiers
- [x] 5.3 Ajouter `feature_intro.sync_device_internal_temp` en en/fr/de dans `scripts/native-texts.ts` et regénérer les catalogues
- [x] 5.4 Tests : la section apparaît éteinte pour `over_climate` sans synchronisation, n'apparaît pas pour `over_switch` et `over_valve`, et l'activer coche l'option dans l'onglet « Sous-jacents » du brouillon

## 6. Documentation

- [x] 6.1 `docs/user/configuration.md` : les deux groupes, leur ordre, l'absence de coche dans les Paramètres généraux, les statuts Off de l'humidité et du verrouillage, « Central (off) », et la synchronisation activable sur place
- [x] 6.2 `docs/plugins/hooks-and-placement.md` : `CORE_MENU_GROUPS`, le préfixe réservé `core:`, les statuts `off` et « héritée éteinte » dans le tableau des statuts, avec un exemple vérifié dans `docs/examples/typescript/` et son test
- [x] 6.3 `docs/plugins/native-plugins.md` : nouvel ordre et groupes des onglets natifs ; `CHANGELOG.md`

## 7. Vérification

- [x] 7.1 `npm run check`, tests vitest du frontend et du SDK, et pytest (dérive des schémas)
- [x] 7.2 Vérifier dans le HA de développement, en fr, en et de : menus d'un thermostat de chaque type et de la configuration centrale, statuts Humidité et Verrouillage, « Central (off) », activation de la synchronisation sur un thermostat `over_climate`, largeur mobile (tiroir)

## Workflow follow-up

- Commit, archivage du change avec synchronisation des specs, push.
