# Tasks

## 1. Contrat du SDK

- [x] 1.1 Ajouter `DraftControls`, `DraftMessage` et `SaveResult` à `packages/sdk/src/types.ts`, la propriété `draft` à `ConfigProps` et `save_actions?: "component" | "dashboard"` aux seules contributions `general_config` et `thermostat_config` (TypeScript, commentaires en anglais) ; vérifier par un test de types que `save_actions` sur une `global_page` ne compile pas
- [x] 1.2 Valider `save_actions` dans la validation du SDK et du faux hôte (valeur connue, hooks de configuration seulement, chemin de l'élément fautif) ; vérifier par des tests les scénarios « Plugin existant » et « Déclaration sur un autre hook »
- [x] 1.3 Ajouter `ha-progress-button` à `HA_CONTROLS` sans le rendre requis pour `loaded`, et un `ha-progress-button` simulé au harnais de test (`progress`, `disabled`, `actionSuccess()`, `actionError()`, résultat lisible) ; vérifier par les tests du SDK
- [x] 1.4 Documenter `draft`, `save_actions` et le gabarit HA du pied de carte (`card-actions`, `ha-button` plain + `mdiRestore`, `ha-progress-button` filled, `actionSuccess`/`actionError`) dans `docs/plugins/plugin-development.md`, `docs/plugins/hooks-and-placement.md` et `docs/plugins/testing.md`, régénérer `docs/reference/sdk` ; vérifier `npm run check:docs`

## 2. État du brouillon transmis par le panneau

- [x] 2.1 Dans `frontend/src/panel.ts`, construire `draft` dans `propsOf()` (dirty, saving, messages traduits, `save()` qui renvoie `success`/`error`/`partial` et ne rejette jamais, `discard()`), en remplaçant `save()` et `savedMessage` ; vérifier par des tests de `frontend/test/panel-config.test.ts` les scénarios « Modifications dans deux sections », « Annulation » et « Échec de la connexion »
- [x] 2.2 Ajouter les textes `draft.save_failed` et l'annonce de succès en en/fr/de dans `frontend/src/shell-translations.ts`, garder `draft.saved` pour le repli et retirer les clés devenues inutiles ; vérifier `frontend/test/shell-translations.test.ts`

## 3. Pied de carte façon Home Assistant

- [x] 3.1 Écrire `renderCardActions()` dans `frontend/src/components/ha.ts` : messages au-dessus, `ha-button` plain avec l'icône de restauration à gauche, `ha-progress-button` filled à droite, gestionnaire de clic de HA (garde `progress`, `actionSuccess`/`actionError`), région `status` pour l'annonce, et replis `ha-button`/`button` avec texte de résultat ; vérifier par des tests unitaires les scénarios « Aucune modification », « Enregistrement en cours », « Enregistrement réussi », « Lecteur d'écran », « Valeur refusée », « Températures non appliquées » et « Composant absent »
- [x] 3.2 Dessiner ce pied dans le `ha-card` de `frontend/src/native/native-tab.ts` (et dans le `.card` de repli) et déclarer `save_actions: "component"` pour les contributions natives dans `frontend/src/native/native-plugin.ts` ; vérifier par des tests les scénarios « Section ouverte », « Onglet natif » et « Configuration en lecture seule »
- [x] 3.3 Dans `panel.ts`, supprimer `renderSaveBar()` et les styles `.savebar`, dessiner la carte d'actions sous les contributions sans `save_actions: "component"`, et reporter la marge de zone sûre sur le bas du contenu de la page ; réécrire les tests de `panel-config.test.ts` et `ha-screens.test.ts` qui ciblaient `.savebar`, et vérifier les scénarios « Pas de barre en bas de page », « Plugin tiers sans déclaration » et « Téléphone avec encoche »
- [x] 3.4 Ajuster les styles étroits (`narrow-styles.ts`) pour le pied : actions sur une ligne, messages qui passent à la ligne, cibles tactiles ; vérifier par un test des styles étroits le scénario « Téléphone » de « Actions sur un écran étroit »
- [x] 3.5 Mettre à jour `docs/user/configuration.md` (« Change, save, discard » : actions en pied de carte, bouton vert avec coche, rouge en cas d'échec), `docs/contributing/architecture.md` (plus de save bar), `docs/plugins/theming.md` (`--safe-area-inset-bottom`) et `CHANGELOG.md` (changement de comportement sur mobile) ; vérifier `npm run check:docs`

## 4. Vérification d'ensemble

- [x] 4.1 Exécuter `npm run check` et `npm test` sans erreur
- [x] 4.2 Dans le devcontainer, comparer une section d'un thermostat avec `/config/entity-id-format` de Home Assistant (thème clair et sombre, 1440 px et 375 px) : enregistrer un brouillon valide (bouton vert avec coche), un brouillon refusé (bouton rouge, erreur sur le champ), annuler, et contrôler que `ha-progress-button` est bien défini après le chargement des composants ; sinon appliquer le repli de chargement prévu dans design.md

## Workflow follow-up

- Réconcilier avec `config-navigation-status` (bouton « Aller à <section> » désormais dans les messages du pied de carte) selon l'ordre de livraison.
- Archiver le change après revue.
