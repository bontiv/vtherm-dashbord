# Tasks

## 1. Lecture des sources et squelette des plugins

- [x] 1.1 Lire dans `external/versatile_thermostat/custom_components/versatile_thermostat/` les noms exacts des attributs des gestionnaires (fenêtre, mouvement, puissance, arrêt automatique, verrou, panne de chauffage), les codes de raison et de message de l'effet de la fenêtre, et relever dans `frontend/src/native/tab-definitions.ts` la clé de fonctionnalité de chaque section ; corriger les tableaux D1 et D3 de `design.md` si un nom diffère
- [x] 1.2 Déclarer dans `frontend/src/native/` les contributions `thermostat_widget` des plugins `core_window`, `core_motion`, `core_power`, `core_auto_start_stop`, `core_lock` et `core_heating_failure` avec identifiant, placement et condition de visibilité (valeurs effectives et entité source) ; vérifier par des tests les scénarios « Plugin à plusieurs widgets » et « Plugin retiré »

## 2. Widgets de détection

- [x] 2.1 Écrire le widget Fenêtre (capteur, détection automatique, contournement, effet déduit, sans bouton ni délai) ; vérifier par des tests les scénarios du widget Fenêtre
- [x] 2.2 Écrire le widget Mouvement ; vérifier par des tests les scénarios du widget Mouvement
- [x] 2.3 Écrire le widget Délestage ; vérifier par des tests les scénarios du widget Délestage
- [x] 2.4 Ajouter les titres et libellés de ces trois widgets en en/fr/de dans `scripts/native-texts.ts` et régénérer les catalogues ; vérifier `npm run check:catalogs`
- [x] 2.5 Documenter ces trois widgets dans `docs/user/dashboard.md` (ce qu'ils montrent, ce qui est exclu : délai restant de la fenêtre) ; vérifier `npm run check:docs`

## 3. Widgets d'automatismes et de protection

- [x] 3.1 Écrire le widget Arrêt et démarrage automatiques (jauge avec seuil, âge du dernier basculement, sans interrupteur ni prochaine action) ; vérifier par des tests les scénarios du widget Arrêt et démarrage automatiques
- [x] 3.2 Écrire le widget Verrouillage (cadenas, sans bouton ni échéance) ; vérifier par des tests les scénarios du widget Verrouillage
- [x] 3.3 Écrire le widget Panne de chauffage (pannes, barre de suivi, cause probable avec lien « plus d'infos » de Home Assistant, détection suspendue) ; vérifier par des tests les scénarios du widget Panne de chauffage
- [x] 3.4 Ajouter les titres et libellés de ces trois widgets en en/fr/de et régénérer les catalogues ; vérifier `npm run check:catalogs`
- [x] 3.5 Documenter ces trois widgets dans `docs/user/dashboard.md` et la liste des widgets de chaque plugin dans `docs/plugins/native-plugins.md` ; vérifier `npm run check:docs`

## 4. Mise en page

- [x] 4.1 Déclarer les placements en chaîne après le widget Preset ; vérifier par des tests les scénarios « Ordre par défaut » et « Fenêtre masquée », et le repli en dernier quand `core_presets.widget.preset` est absent
- [x] 4.2 Vérifier par des tests, pour les six widgets, les scénarios « Allemand », « Thème sombre », « Mobile », « Une colonne » et « Écran étroit » (ajouter les widgets au test des styles étroits)
- [x] 4.3 Ajouter l'entrée de `CHANGELOG.md` (Added : six widgets de fonctions de la vue d'ensemble d'un thermostat, en affichage seul) ; vérifier `npm run check:docs`

## 5. Vérification d'ensemble

- [x] 5.1 Exécuter `npm run check`, `npm test` et `npm run test:python` sans erreur
- [x] 5.2 À faire par l'utilisateur : dans Home Assistant, ouvrir la vue d'un thermostat avec fenêtre, mouvement, délestage, verrou et détection de panne actifs, à 1440 px et à 375 px, en thème sombre, ouvrir une fenêtre de test et vérifier l'effet affiché ; vérifier aussi qu'une fonction éteinte ne laisse aucune carte
