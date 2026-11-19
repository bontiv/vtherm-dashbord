# Tasks

## 1. Entités centrales et squelette des plugins

- [x] 1.1 Lire dans `external/versatile_thermostat/custom_components/versatile_thermostat/` (`select.py`, `binary_sensor.py`, `sensor.py`, `number.py`, `feature_central_boiler_manager.py`, `feature_power_manager.py`) les clés de traduction des entités centrales (et vérifier dans le devcontainer que le `select` du mode central se retrouve par son domaine sur l'appareil central), l'entité qui porte les attributs `activation_scheduled` et `is_central_boiler_ready`, et l'unité de `power_manager.current_power` ; corriger le tableau D1 de `design.md` si un nom diffère
- [x] 1.2 Déclarer dans `frontend/src/native/` les contributions `global_widget` des plugins `core`, `core_central_boiler`, `core_power` et `core_presence` avec identifiant, placement et condition de visibilité qui lit `central` et `getEntryEntities(hass, central.entryId)`, et la taille de chaque widget (tableau D5 de `design.md`) ; vérifier par des tests les scénarios « Plugin à deux widgets globaux » et « Remplacement par un plugin tiers »

## 2. Widgets du plugin `core`

- [x] 2.1 Écrire le widget Mode central (icône et libellé traduit par option, aucun sélecteur) ; vérifier par des tests les scénarios du widget Mode central
- [x] 2.2 Écrire le widget Résumé des thermostats (barre segmentée, liste des alertes avec liens vers la vue de chaque thermostat par le routeur du dashboard, filtre de redessin par entités des thermostats) ; vérifier par des tests les scénarios du widget Résumé, dont « Trente thermostats » avec des états simulés
- [x] 2.3 Écrire le widget Température extérieure (valeur, courbe 24 h avec le client d'historique du dashboard et `vtherm-time-chart`, message si l'historique échoue) ; vérifier par des tests les scénarios du widget Température extérieure
- [x] 2.4 Ajouter les textes des trois widgets et des cinq modes centraux en en/fr/de dans `scripts/native-texts.ts` et régénérer les catalogues ; vérifier `npm run check:catalogs`
- [x] 2.5 Documenter les trois widgets dans `docs/user/dashboard.md` ; vérifier `npm run check:docs`

## 3. Widgets des plugins chaudière, puissance et présence

- [x] 3.1 Écrire le widget Chaudière centrale (icône, jauge avec seuil, liste des demandeurs avec liens, sablier, alerte « non prête ») ; vérifier par des tests les scénarios du widget Chaudière centrale
- [x] 3.2 Écrire le widget Puissance demandée à la chaudière (jauge avec seuil, courbe 24 h) ; vérifier par des tests les scénarios du widget Puissance demandée
- [x] 3.3 Écrire le widget Puissance du logement (jauge, marge calculée, énergie totale seulement à unités identiques, dépassement) ; vérifier par des tests les scénarios du widget Puissance du logement
- [x] 3.4 Écrire le widget Présence (icône et texte, sans bouton) ; vérifier par des tests les scénarios du widget Présence
- [x] 3.5 Ajouter les textes de ces quatre widgets en en/fr/de et régénérer les catalogues ; vérifier `npm run check:catalogs`
- [x] 3.6 Documenter ces quatre widgets dans `docs/user/dashboard.md` et la liste des widgets de chaque plugin dans `docs/plugins/native-plugins.md` ; vérifier `npm run check:docs`

## 4. Page Overview

- [x] 4.1 Déclarer les placements (`first`, puis `after` en chaîne) et ajouter dans `frontend/src/native/core-pages.ts` le message affiché quand aucun widget n'est visible, avec son texte en en/fr/de ; vérifier par des tests les scénarios « Ordre par défaut », « Chaudière masquée », « Aucun widget » et « Au moins un widget »
- [x] 4.2 Vérifier par des tests, pour les sept widgets, les scénarios « Résumé en pleine largeur », « Courbe sur deux colonnes », « Écran étroit », « Allemand », « Thème sombre » et « Mobile » (ajouter les widgets au test des styles étroits)
- [x] 4.3 Ajouter l'entrée de `CHANGELOG.md` (Added : sept widgets de la page Overview, en affichage seul) ; vérifier `npm run check:docs`

## 5. Vérification d'ensemble

- [x] 5.1 Exécuter `npm run check`, `npm test` et `npm run test:python` sans erreur
- [x] 5.2 À faire par l'utilisateur : dans Home Assistant, ouvrir la page Overview avec la configuration centrale complète, puis sans chaudière et sans présence, à 1440 px et à 375 px, en thème sombre, en en/fr/de, et comparer le mode central, la chaudière et la puissance aux entités des outils de développement
