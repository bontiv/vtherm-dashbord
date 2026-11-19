# Tasks

## 1. Lecture des sources et squelette des plugins

- [x] 1.1 Lire dans `external/versatile_thermostat/custom_components/versatile_thermostat/` l'emplacement exact de `ext_current_temperature`, `hvac_off_reason`, `messages`, `inhibition`, `timed_preset_manager` et `safety_manager.is_safety_configured`, et corriger le tableau D1 de `design.md` si un nom diffère
- [x] 1.2 Créer un module par plugin sous `frontend/src/native/widgets/` (TypeScript, Lit) avec les accès aux attributs en un seul endroit, et déclarer les contributions `thermostat_widget` des plugins `core`, `core_tpi`, `core_valve_regulation`, `core_presets` et `core_advanced` avec identifiant, placement et condition de visibilité ; vérifier par des tests les scénarios « Plugin à plusieurs widgets », « Retrait par un plugin tiers » et « Plugin sans widget »

## 2. Widgets du plugin `core`

- [x] 2.1 Écrire le widget Température (jauge, repère, bornes `min_temp` et `max_temp`, ligne extérieure, « demandée → appliquée », consigne régulée) ; vérifier par des tests de rendu les scénarios du widget Température
- [x] 2.2 Écrire le widget Mode et action (icônes, raison traduite, code inconnu, veille, mode central appliqué, aucun bouton) ; vérifier par des tests les scénarios du widget Mode et action
- [x] 2.3 Écrire le widget Alertes (messages, thermostat non prêt, équipements, âges, inhibition, seuil du délai de sécurité effectif, message « Aucune alerte ») ; vérifier par des tests les scénarios du widget Alertes, dont le délai de sécurité propre, central et inconnu
- [x] 2.4 Ajouter les titres et libellés des trois widgets en en/fr/de dans `scripts/native-texts.ts` et régénérer les catalogues ; vérifier `npm run check:catalogs`
- [x] 2.5 Documenter les trois widgets (ce qu'ils montrent, d'où viennent les valeurs, ce qui est exclu) dans `docs/user/dashboard.md` ; vérifier `npm run check:docs`

## 3. Widgets des autres plugins

- [x] 3.1 Écrire le widget Chauffe TPI (barre de puissance, barre segmentée ON/OFF, masqué hors TPI) ; vérifier par des tests les scénarios du widget Chauffe TPI
- [x] 3.2 Écrire le widget Vanne (jauge, barre par vanne pour les types `over_valve` et `over_climate` avec vanne) ; vérifier par des tests les scénarios du widget Vanne
- [x] 3.3 Écrire le widget Preset et dérogation (icône par preset, temporisé avec temps restant et heure de fin, dérogation, sans barre) ; vérifier par des tests les scénarios du widget Preset et dérogation
- [x] 3.4 Écrire le widget Sécurité (icône, barre de la part imposée, masqué sans sécurité configurée) ; vérifier par des tests les scénarios du widget Sécurité
- [x] 3.5 Ajouter les titres et libellés de ces quatre widgets en en/fr/de et régénérer les catalogues ; vérifier `npm run check:catalogs`
- [x] 3.6 Documenter ces quatre widgets dans `docs/user/dashboard.md` et la liste des widgets de chaque plugin dans `docs/plugins/native-plugins.md` ; vérifier `npm run check:docs`

## 4. Mise en page de la vue d'ensemble

- [x] 4.1 Dans `frontend/src/native/core-pages.ts`, transmettre `centralValues` à `vtherm-widgets-page` et déclarer les placements (`first`, puis `after` en chaîne) ; vérifier par des tests les scénarios « Ordre par défaut », « Widget masqué », « Insertion par un plugin tiers » et « Fonctionnalité héritée »
- [x] 4.2 Vérifier par des tests, pour les sept widgets, les scénarios « Allemand », « Langue non prise en charge », « Thème sombre », « Mobile », « Une colonne » et « Écran étroit » (ajouter les widgets au test des styles étroits)
- [x] 4.3 Ajouter l'entrée de `CHANGELOG.md` (Added : sept widgets de la vue d'ensemble d'un thermostat, en affichage seul) ; vérifier `npm run check:docs`

## 5. Vérification d'ensemble

- [x] 5.1 Exécuter `npm run check`, `npm test` et `npm run test:python` sans erreur
- [x] 5.2 À faire par l'utilisateur : dans Home Assistant, ouvrir la vue d'ensemble d'un thermostat sur interrupteur, d'un thermostat sur vanne et d'un thermostat sur climate, à 1440 px et à 375 px, en thème sombre, en en/fr/de, et vérifier les valeurs contre l'entité `climate` des outils de développement, l'ordre des cartes et l'absence de carte vide
