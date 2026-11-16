# Tasks

## 1. Vérification, contrat de champs et chargeur dans le SDK

- [x] 1.0 Vérifier dans le code du frontend de Home Assistant (version courante et anciennes, sans `npm install`) : réordonnancement de `ha-entities-picker`, existence de `ha-alert`, `ha-dialog`, `ha-data-table`, `ha-expansion-panel`, `ha-service-picker`, `ha-md-list-item`, `ha-spinner` ou `ha-circular-progress`, événement `hass-more-info`; fixer la version minimale dans `docs/contributing/architecture.md` et `hacs.json` si besoin; vérifier que le résultat est écrit dans `design.md` (liste des composants et version)
- [x] 1.1 Ajouter `packages/sdk/src/fields.ts` (TypeScript strict) : types de champs, `FieldDefinition` et fonction pure `selectorOf`; vérifier avec `packages/sdk/test/fields.test.ts` (un cas par type de champ du tableau de `design.md`, y compris `unit_of_measurement`)
- [x] 1.2 Ajouter `ensureHaControls()` (chargement partagé, `whenDefined`, technique `partial-panel-resolver`, délai maximal, résultat par composant, alternative `ha-spinner` / `ha-circular-progress`) et vérifier avec un test qui simule les éléments et les appels répétés
- [x] 1.3 Exporter le tout depuis `packages/sdk/src/index.ts` et vérifier avec `packages/sdk/test/bundle.test.ts` et la compilation `tsc`
- [x] 1.4 Ajouter au harnais `packages/sdk/src/testing.ts` des éléments simulés de `ha-selector`, `ha-switch`, `ha-button`, `ha-alert`, `ha-dialog`, `ha-card` et vérifier avec `packages/sdk/test/testing.test.ts` (propriétés transmises, `value-changed`)
- [x] 1.5 Documenter le contrat dans `docs/plugins/plugin-development.md`, `docs/plugins/testing.md` et régénérer `docs/reference/sdk/`; vérifier avec `frontend/test/docs.test.ts` (les exemples de `docs/examples/typescript/` compilent)

## 2. Onglets natifs avec les contrôles Home Assistant

- [x] 2.1 Ajouter les filtres (`device_class`) et l'unité des délais (D8) à `shared/vtherm-config-schemas.json` et à `FieldSpec`; lire dans Versatile Thermostat l'unité de `window_auto_max_duration`, `heater_heating_time`, `heater_cooling_time`; vérifier avec `tests/test_schema_drift.py` et `frontend/test/fields.test.ts`
- [x] 2.2 Remplacer le rendu de `renderField` dans `frontend/src/native/native-tab.ts` : booléen, nombre, entier, délai, choix, texte, gabarit, entité et liste d'entités par `ha-selector` (cas a des sous-jacents et cas c des capteurs); garder héritage central, aide, erreur et ordre; vérifier avec `frontend/test/native-tabs.test.ts` mis à jour
- [x] 2.3 Convertir `fields.ts` (`parseInput`, `formatInput`, `entityChoices`) en conversions de valeurs de sélecteurs, valeur vide à `null`; vérifier avec `frontend/test/fields.test.ts`
- [x] 2.4 Implémenter les commandes d'allumage et d'extinction par sous-jacent (cas b) avec `ha-service-picker`, champ attribut et repli champ texte, sérialisation `service_name[/attribute:value]` et valeur illisible conservée; remplacer l'attente `TEXTAREA` de `frontend/test/native-tabs.test.ts` et vérifier les scénarios de la spec
- [x] 2.5 Même modèle pour `central_boiler_activation_service` et `central_boiler_deactivation_service`; vérifier avec un test de l'onglet `core_central_boiler`
- [x] 2.6 Remplacer `div.card` par `ha-card`, les erreurs `base` et de champ par `ha-alert` ou l'erreur du sélecteur, les groupes de champs longs par `ha-expansion-panel` (ouvert si erreur), les valeurs centrales par des entités cliquables (`hass-more-info`), le chargement des presets par `ha-spinner`; vérifier avec `frontend/test/native-tabs.test.ts` (rôle `alert`, groupe qui s'ouvre sur erreur, événement `hass-more-info` avec `entityId`)
- [x] 2.7 Remplacer les températures de preset (`renderPresets`) par le sélecteur `number`, le bouton de suggestion et le bouton de `frontend/src/native/core-pages.ts` par `ha-button`; vérifier avec `frontend/test/native-tabs.test.ts`
- [x] 2.8 Appeler `ensureHaControls()` avant le premier rendu, avec état d'attente et repli HTML (commentaire d'exception) et avertissement unique; vérifier avec un test où `ha-selector` n'est pas défini
- [x] 2.9 Mettre à jour `docs/user/configuration.md` et `docs/plugins/native-plugins.md` (nouveaux contrôles, repli, version minimale); vérifier avec `frontend/test/native-docs.test.ts`

## 3. Autres écrans

- [x] 3.1 Migrer `frontend/src/components/create-wizard.ts` (type, nom, boutons, erreurs) vers les composants Home Assistant; vérifier avec le test du panneau et un test du formulaire
- [x] 3.2 Migrer `frontend/src/complements/complements-page.ts` : bandeaux vers `ha-alert`, dialogues d'installation et de redémarrage vers `ha-dialog` (repli), `ul.cards` vers `ha-card`, filtres vers `ha-select` et `ha-textfield`, boutons vers `ha-button`, chargement et progression vers `ha-spinner` ou `ha-circular-progress`; vérifier avec `frontend/test/complements-pages.test.ts` (confirmation obligatoire avant l'appel, y compris au repli)
- [x] 3.3 Inventaire complet : grep dans tous les fichiers de `frontend/src` (hors catalogues) des balises `button`, `select`, `textarea`, `input`, `table`, `dialog`, `ul`, `li`, `a` utilisé comme bouton, `nav`, `dl`, `label` et des `role="alert|status"`, `window.confirm`; mettre à jour le tableau de `design.md` avec chaque fichier trouvé (au moins `panel.ts`, `complements-page.ts`, `create-wizard.ts`, `plugin-status.ts`, `side-menu.ts`, `thermostat-list.ts`, `breadcrumb.ts`, `contribution-host.ts`, `top-bar.ts`, `core-pages.ts`, `dev-plugins-page.ts`, `native-tab.ts`) et migrer ou justifier chacun; vérifier que le grep final ne laisse que les replis et les exceptions commentés
- [x] 3.4 Migrer `frontend/src/panel.ts` : barre d'enregistrement (`ha-button`, `ha-alert`), `window.confirm(t("draft.leave"))` vers `ha-dialog` (repli `window.confirm`), chargement du panneau vers `ha-spinner`; vérifier avec `frontend/test/panel.test.ts` et `frontend/test/panel-config.test.ts` (annuler garde la page)
- [x] 3.5 Migrer `plugin-status.ts` et `dev-plugins-page.ts` : tableau vers `ha-data-table` ou `ha-card` + liste (choix noté pour chaque écran), `ha-switch`, `ha-textfield`, `ha-button`, `ha-alert`; vérifier avec `frontend/test/plugin-status.test.ts` et `frontend/test/dev-mode.test.ts`
- [x] 3.6 Migrer `side-menu.ts`, `thermostat-list.ts` (`ha-list` / `ha-md-list-item` avec `href`, `ha-select`, lien « Créer » en `ha-button href`, vide en `ha-alert`) et `contribution-host.ts` (`ha-alert`); garder `followLink` pour le clic simple et laisser `breadcrumb.ts` et les onglets de `top-bar.ts` en exception commentée; vérifier avec `frontend/test/navigation.test.ts`, `frontend/test/panel.test.ts` et un test du lien (clic du milieu)
- [x] 3.7 Mettre à jour `docs/plugins/theming.md` (composants natifs, thème sombre) et `docs/user/dashboard.md`, `docs/user/complements.md` (dialogues, messages); vérifier avec `frontend/test/docs.test.ts` et `frontend/test/complements-docs.test.ts`

## 4. Règle de conventions et vérification finale

- [x] 4.1 Ajouter la règle « contrôle Home Assistant en priorité » et la liste d'exceptions (onglets de la barre haute, fil d'Ariane, replis) à `docs/contributing/code-conventions.md` et au modèle de demande de fusion; vérifier que la page et la case existent
- [x] 4.2 Vérifier l'ensemble : `npm run typecheck` et les tests du frontend et du SDK (suite complète une seule fois, mémoire limitée), puis `openspec validate native-ha-controls --strict`

## Workflow follow-up

- Archiver le change après la revue.
- Tester à la main dans Home Assistant (affichage direct sur le dashboard, sans visite préalable d'une autre page), en thème clair et sombre, sur écran étroit.

## Notes d'implémentation

- 3.5 : `plugin-status.ts` et `dev-plugins-page.ts` utilisent une `ha-card` par plugin plutôt que `ha-data-table`, dont les colonnes ne conviennent ni aux détails sur plusieurs lignes ni à l'écran étroit ; le tableau reste le repli.
- `ha-selector` marque un champ comme obligatoire par défaut : les champs facultatifs (texte, chaudière, presets, filtres des compléments) passent `.required=${false}`.
- Les filtres des compléments ajoutent la valeur `__all__` (« Tous »), car le sélecteur `select` n'a pas de valeur vide.
