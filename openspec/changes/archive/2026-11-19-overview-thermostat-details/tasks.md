# Tasks

## 1. Lecture des sources et squelette des plugins

- [x] 1.1 Lire dans `external/versatile_thermostat/custom_components/versatile_thermostat/` le calcul de `model_confidence` (échelle), le nom exact des attributs de `auto_tpi_learning`, de `temp_synchronisation` et de `underlying_temperature_tracking`, et l'emplacement de `is_used_by_central_boiler` ; corriger le tableau D1 de `design.md` si un nom diffère, et choisir jauge ou valeur brute pour la confiance
- [x] 1.2 Déclarer dans `frontend/src/native/` les contributions `thermostat_widget` des plugins `core` (deux widgets), `core_tpi`, `core_humidity`, `core_sync_temp`, `core_central_boiler` et `core_power` avec identifiant, placement et condition de visibilité ; vérifier par des tests les scénarios « Plugin à deux widgets » et « Remplacement de l'historique »

## 2. Widgets du plugin `core`

- [x] 2.1 Écrire le widget Historique 24 h (deux courbes avec le client d'historique du dashboard et `vtherm-time-chart`, capteur extérieur de la configuration effective, chargement à la visibilité, message d'erreur) ; vérifier par des tests les scénarios du widget Historique 24 h
- [x] 2.2 Écrire le widget Équipements (icône par équipement lue dans `hass.states`, alerte « attendu actif, éteint », ventilation) ; vérifier par des tests les scénarios du widget Équipements
- [x] 2.3 Ajouter les titres et libellés de ces deux widgets en en/fr/de dans `scripts/native-texts.ts` et régénérer les catalogues ; vérifier `npm run check:catalogs`
- [x] 2.4 Documenter ces deux widgets dans `docs/user/dashboard.md`, avec les valeurs qui n'ont pas d'historique ; vérifier `npm run check:docs`

## 3. Widgets de TPI, d'humidité et d'énergie

- [x] 3.1 Écrire le widget Apprentissage Auto TPI (icône d'état, cycles, coefficients, confiance, constante de temps, capacité, statut, début, sans bouton) ; vérifier par des tests les scénarios du widget Apprentissage Auto TPI
- [x] 3.2 Écrire le widget Humidité (jauge seule) ; vérifier par des tests les scénarios du widget Humidité
- [x] 3.3 Écrire le widget Énergie du thermostat (courbe de la puissance moyenne, compteur d'énergie) ; vérifier par des tests les scénarios du widget Énergie du thermostat
- [x] 3.4 Ajouter les titres et libellés de ces trois widgets en en/fr/de et régénérer les catalogues ; vérifier `npm run check:catalogs`
- [x] 3.5 Documenter ces trois widgets dans `docs/user/dashboard.md` (échelle de la confiance, exclusion des boutons d'apprentissage) ; vérifier `npm run check:docs`

## 4. Widgets de synchronisation et de chaudière

- [x] 4.1 Écrire le widget Suivi de l'équipement (températures envoyées, alerte de suivi suspendu, tableau des écarts en infobulle) ; vérifier par des tests les scénarios du widget Suivi de l'équipement
- [x] 4.2 Écrire le widget Demande à la chaudière (flamme, filtre par rattachement à la chaudière) ; vérifier par des tests les scénarios du widget Demande à la chaudière
- [x] 4.3 Ajouter les titres et libellés de ces deux widgets en en/fr/de et régénérer les catalogues ; vérifier `npm run check:catalogs`
- [x] 4.4 Documenter ces deux widgets dans `docs/user/dashboard.md` et la liste des widgets de chaque plugin dans `docs/plugins/native-plugins.md` ; vérifier `npm run check:docs`

## 5. Mise en page

- [x] 5.1 Déclarer les placements en chaîne après le widget Panne de chauffage et `last` pour l'historique ; vérifier par des tests les scénarios « Ordre par défaut » et « Cible absente »
- [x] 5.2 Vérifier par des tests, pour les sept widgets, les scénarios « Allemand », « Thème sombre » et « Mobile » (ajouter les courbes au test des styles étroits à 360 px) et les scénarios de taille « Historique sur deux colonnes », « Auto TPI sur deux lignes », « Écran étroit » et « Un widget large ne bloque pas les suivants »
- [x] 5.3 Ajouter l'entrée de `CHANGELOG.md` (Added : sept widgets de détail de la vue d'ensemble d'un thermostat, en affichage seul) ; vérifier `npm run check:docs`

## 6. Vérification d'ensemble

- [x] 6.1 Exécuter `npm run check`, `npm test` et `npm run test:python` sans erreur
- [x] 6.2 À faire par l'utilisateur : dans Home Assistant, ouvrir la vue d'un thermostat avec TPI et Auto TPI, d'un thermostat `over_climate` avec ventilation et suivi de température, à 1440 px et à 375 px, en thème sombre, et comparer les courbes de 24 h à l'historique de Home Assistant ; vérifier qu'aucune requête d'historique ne part tant que la carte n'est pas visible
