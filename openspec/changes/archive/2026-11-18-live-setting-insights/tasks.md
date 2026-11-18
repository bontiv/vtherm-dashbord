# Tasks

## 1. Fonctions d'estimation

- [x] 1.1 Créer `frontend/src/insights/` (TypeScript) avec `tpiDecision` portée de `prop_algo_tpi.py` et `cycle_scheduler.py` (parties pièce et extérieure, plafond, `max_on_percent`, seuils d'arrêt et de reprise, temps minimaux), en citant les fichiers de VT ; vérifier par des tests Vitest les scénarios « Calcul détaillé », « Temps minimal d'activation » et « Seuil d'arrêt »
- [x] 1.2 Ajouter `slopeHistory` et `windowDetections` portées de `ema.py`, `open_window_algorithm.py` et `feature_window_manager.py` (lissage, pente maximale, point plat après 30 min, durée maximale) ; vérifier par des tests une aération détectée, une aération trop faible et une fin par durée maximale
- [x] 1.3 Ajouter `sensorGaps`, `tpiHistory`, `temperatureHistory` et `comfortStats` (temps de montée hors baisses de consigne, dépassement, maintien à ±0,5°) ; vérifier par des tests sur des séries construites
- [x] 1.4 Ajouter un test `pytest` qui exécute les fonctions de VT de `external/` sur des cas fixés et écrit des fixtures JSON, et un test Vitest qui compare les fonctions portées à ces fixtures ; vérifier `npm test` et `npm run test:python`
- [x] 1.5 Documenter les fonctions portées et la procédure de relecture lors d'une montée de version de VT dans `docs/contributing/` (en anglais) ; vérifier `npm run check:docs`

## 2. Lecture de l'historique

- [x] 2.1 Créer le client d'historique (TypeScript) : `history/history_during_period` pour une entité et une période, attributs seulement pour l'entité climate, cache de 5 minutes invalidé en cas d'erreur, conversion en échantillons `{t, v}` ; vérifier par des tests avec un `hass` simulé le cache, l'erreur et l'absence de requête tant qu'aucun panneau n'est ouvert

## 3. Composant de graphique temporel

- [x] 3.1 Créer `vtherm-time-chart` (TypeScript, Lit, SVG) : séries pleines et pointillées, bandes, axes aux formats régionaux, curseur au survol, au toucher et au clavier, résumé textuel, couleurs du thème, largeur fluide ; commenter le choix fait à la place de `ha-chart-base` ; vérifier par des tests le résumé, la lecture d'un point au clavier et l'absence de couleur figée
- [x] 3.2 Vérifier l'absence de débordement à 360 px en ajoutant le composant au test des styles étroits

## 4. Panneaux d'estimation

- [x] 4.1 Créer le panneau TPI (onglets « maintenant », « 24 h », « 7 jours », décomposition, consigne d'essai et retour, moyennes estimée et enregistrée, indicateurs de confort, messages sans données) ; vérifier par des tests de rendu les scénarios du panneau TPI et du rejeu TPI de la spec
- [x] 4.2 Créer le panneau d'ouverture (pente, seuils, détections, chute la plus forte, seuil absent, durée maximale) ; vérifier par des tests les scénarios du rejeu de la détection d'ouverture
- [x] 4.3 Créer le panneau de sécurité (silences intérieur et extérieur, délai saisi, plus long silence, cas `over_climate`) ; vérifier par des tests les scénarios du rejeu des pertes de capteur
- [x] 4.4 Insérer les panneaux dans `frontend/src/native/native-tab.ts` pour les onglets `tpi`, `window` et `advanced`, dans un `ha-expansion-panel` replié, avec les valeurs effectives du brouillon (propres ou centrales) et le cas de la page de création (le brouillon de création, dont la section TPI, change `creation-as-config-page`) ; vérifier par des tests dans `frontend/test/native-tabs.test.ts` le recalcul à la modification d'un champ et la valeur héritée
- [x] 4.5 Ajouter tous les textes des panneaux en en/fr/de dans `scripts/native-texts.ts` et régénérer les catalogues ; vérifier `npm run check:catalogs`
- [x] 4.6 Documenter les panneaux, ce qu'ils estiment et leurs limites dans la documentation utilisateur de `docs/`, et ajouter l'entrée du `CHANGELOG.md` ; vérifier `npm run check:docs`

## 5. Données de développement

- [x] 5.1 Écrire le script Python de remplissage de l'historique du devcontainer (semaine simulée, deux aérations, un silence de 70 minutes), formaté par Black (180) et validé par pylint ; vérifier `npm run check:python` et que les trois panneaux montrent des données après exécution
- [x] 5.2 Documenter le script dans `docs/contributing/development-environment.md`, en précisant qu'il ne valide pas les calculs ; vérifier `npm run check:docs`

## 6. Vérification d'ensemble

- [x] 6.1 Exécuter `npm run check`, `npm test` et `npm run test:python` sans erreur
- [x] 6.2 Dans le devcontainer avec l'historique simulé, vérifier les trois panneaux pour un thermostat sur interrupteur, sur vanne et sur climate, en thème clair et sombre, en en/fr/de, sur bureau et à 360 px, et qu'aucune requête d'historique ne part tant que les panneaux sont repliés
