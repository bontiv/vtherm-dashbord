# Tasks

## 1. Rattachement côté serveur

- [x] 1.1 Ajouter à `ThermostatSummary` et `list_thermostats()` (`custom_components/vtherm_dashboard/vtherm_config.py`) `device_id`, `climate_entity_id` (sauf si `config-navigation-status` l'a déjà livré), `area_id` (entité climate si elle a sa propre pièce, sinon appareil, comme Home Assistant) et les replis `area_name`, `floor_name`, `floor_level`, formatés par Black (180) et validés par pylint ; vérifier par des tests `pytest` les scénarios « Pièce de l'appareil », « Pièce de l'entité » et une entrée sans appareil, et `npm run check:python`
- [x] 1.2 Étendre le type de la réponse dans `frontend/src/config/api.ts` et `ThermostatInfo` dans `frontend/src/navigation.ts` ; vérifier `npm run typecheck`

## 2. Regroupement

- [x] 2.1 Écrire en TypeScript `groupByArea()` (ordre par étage puis pièce, thermostats par nom, groupe « Sans pièce » en dernier, liste sans en-tête si aucune pièce, repli sur les noms du serveur) avec un type local pour `hass.areas` et `hass.floors` ; vérifier par des tests Vitest les scénarios « Plusieurs thermostats dans une pièce », « Étages », « Sans pièce » et « Aucune pièce dans la maison »
- [x] 2.2 Recharger la liste dans `frontend/src/config/config-session.ts` quand l'`area_id` d'un appareil ou d'une entité de thermostat change dans `hass` ; vérifier par un test avec un `hass` simulé le scénario « Renommage » et le changement de pièce

## 3. Affichage

- [x] 3.1 Dessiner dans `frontend/src/components/thermostat-list.ts` les groupes avec leurs en-têtes (icône, nom, étage, `h3`), le lien « Attribuer une pièce » et le choix « Par pièce / Par nom » mémorisé avec repli ; vérifier par des tests de rendu les scénarios de « Choix du regroupement » et l'absence de débordement à 360 px
- [x] 3.2 Ordonner et libeller « pièce · nom » les options du sélecteur de `frontend/src/components/side-menu.ts` ; vérifier par un test le scénario « Sélecteur »
- [x] 3.3 Ajouter les textes (choix, « Sans pièce », lien) en en/fr/de, mettre à jour la documentation utilisateur de la liste des thermostats dans `docs/` et le `CHANGELOG.md` ; vérifier `frontend/test/shell-translations.test.ts` et `npm run check:docs`

## 4. Vérification d'ensemble

- [ ] 4.1 Exécuter `npm run check`, `npm test` et `npm run test:python` sans erreur
- [x] 4.2 Dans le devcontainer, créer deux étages et trois pièces, y placer les thermostats (un sans pièce), vérifier la liste, le choix « Par nom », le sélecteur et le renommage d'une pièce en direct, sur bureau et à 360 px
