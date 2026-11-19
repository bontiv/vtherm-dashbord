# Spec Delta

## ADDED Requirements

### Requirement: Widget Fenêtre
Le widget `core_window.widget.window` SHALL montrer par une icône et un texte la fenêtre ouverte ou fermée (`window_state`), la détection automatique (`window_auto_state`) quand elle est configurée, le contournement actif (`window_bypass_state`) et l'effet en cours (arrêt, éco, hors-gel, ventilation ou aucun). Il SHALL ne dessiner aucun bouton ni délai restant, et SHALL être masqué quand la détection de fenêtre est éteinte.

#### Scenario: Fenêtre ouverte avec arrêt
- **WHEN** `window_state` est allumé et que la raison du mode est `hvac_off_window_detection`
- **THEN** le widget affiche l'icône de fenêtre ouverte, « Ouverte » et l'effet « Arrêt »

#### Scenario: Effet ventilation
- **WHEN** la raison du mode est `hvac_off_window_detection` et que le thermostat est en mode `fan_only`
- **THEN** le widget affiche l'effet « Ventilation »

#### Scenario: Effet hors-gel
- **WHEN** `messages` contient `target_temp_window_frost`
- **THEN** le widget affiche l'effet « Hors-gel »

#### Scenario: Contournement actif
- **WHEN** `window_bypass_state` est allumé alors que la fenêtre est ouverte
- **THEN** le widget affiche « Contournement actif » et l'effet « Aucun »

#### Scenario: Détection automatique non configurée
- **WHEN** `is_window_auto_configured` est faux
- **THEN** le widget n'affiche pas la ligne de détection automatique

#### Scenario: Fonction éteinte
- **WHEN** la détection de fenêtre est éteinte pour le thermostat
- **THEN** le widget est masqué

#### Scenario: Capteur inconnu
- **WHEN** `window_state` vaut `unknown`
- **THEN** le widget affiche « Inconnu » et l'effet « Aucun »

### Requirement: Widget Mouvement
Le widget `core_motion.widget.motion` SHALL montrer par une icône et un texte le mouvement détecté (`motion_state`) et, quand le message `target_temp_activity_detected` est actif, l'étiquette « preset d'activité en vigueur ». Il SHALL être masqué quand la détection de mouvement est éteinte.

#### Scenario: Mouvement détecté
- **WHEN** `motion_state` est allumé et que le message d'activité est actif
- **THEN** le widget affiche l'icône de mouvement, « Mouvement » et l'étiquette « preset d'activité »

#### Scenario: Pas de mouvement
- **WHEN** `motion_state` est éteint
- **THEN** le widget affiche « Aucun mouvement » sans étiquette

#### Scenario: Fonction éteinte
- **WHEN** la détection de mouvement est éteinte
- **THEN** le widget est masqué

### Requirement: Widget Délestage
Le widget `core_power.widget.overpowering` SHALL montrer par une icône et un texte si le délestage est actif (`overpowering_state`), en couleur d'alerte quand il l'est. Il SHALL être masqué quand la gestion de puissance est éteinte.

#### Scenario: Délestage actif
- **WHEN** `overpowering_state` est allumé
- **THEN** le widget affiche une icône d'alerte et « Délestage actif » en couleur d'avertissement

#### Scenario: Pas de délestage
- **WHEN** `overpowering_state` est éteint
- **THEN** le widget affiche une icône de validation et « Pas de délestage »

#### Scenario: Gestion de puissance éteinte
- **WHEN** la gestion de puissance est éteinte
- **THEN** le widget est masqué

### Requirement: Widget Arrêt et démarrage automatiques
Le widget `core_auto_start_stop.widget.auto_start_stop` SHALL montrer l'arrêt automatique détecté, la fonction activée ou non, l'erreur accumulée sur une jauge dont le repère est son seuil, et la date du dernier basculement en âge relatif. Il SHALL ne dessiner aucun interrupteur ni prochaine action prévue, et SHALL être masqué hors des thermostats `over_climate` qui ont la fonction.

#### Scenario: Valeurs affichées
- **WHEN** l'erreur accumulée est 4,2 pour un seuil de 10 et que l'arrêt est détecté
- **THEN** le widget affiche l'icône d'arrêt, « Arrêt automatique » et une jauge à 4,2 avec le repère 10

#### Scenario: Fonction désactivée
- **WHEN** `auto_start_stop_enable` est faux
- **THEN** le widget affiche « Désactivée » et reste affiché

#### Scenario: Dernier basculement
- **WHEN** le dernier basculement date de deux heures
- **THEN** le widget affiche « il y a 2 heures » avec la date complète en infobulle

#### Scenario: Thermostat sur interrupteur
- **WHEN** le thermostat est de type `over_switch`
- **THEN** le widget est masqué

### Requirement: Widget Verrouillage
Le widget `core_lock.widget.lock` SHALL montrer par une icône de cadenas et un texte si le thermostat est verrouillé (`is_locked`). Il SHALL ne dessiner aucun bouton ni échéance de reverrouillage, et SHALL être masqué quand le verrouillage n'est pas configuré.

#### Scenario: Verrouillé
- **WHEN** `is_locked` est vrai
- **THEN** le widget affiche un cadenas fermé et « Verrouillé »

#### Scenario: Libre
- **WHEN** `is_locked` est faux
- **THEN** le widget affiche un cadenas ouvert et « Libre »

#### Scenario: Verrouillage non configuré
- **WHEN** le verrouillage n'est pas configuré
- **THEN** le widget est masqué

### Requirement: Widget Panne de chauffage
Le widget `core_heating_failure.widget.failure` SHALL montrer la panne de chauffage et la panne de refroidissement (`heating_failure_state`, `cooling_failure_state`), le suivi en cours sur une barre de progression (écoulé sur écoulé plus restant), la cause probable avec un lien vers l'entité en cas de panne, et l'icône de détection suspendue par un modèle quand un modèle est configuré. Il SHALL rester affiché tant que la détection est active, et être masqué sinon.

#### Scenario: Panne active
- **WHEN** `heating_failure_state` est allumé avec `root_cause_entity_id` égal à `switch.radiateur`
- **THEN** le widget affiche une alerte « Panne de chauffage », la cause probable et un lien qui ouvre les informations de `switch.radiateur`

#### Scenario: Suivi en cours
- **WHEN** le suivi de chauffe a 6 minutes écoulées et 4 minutes restantes
- **THEN** la barre affiche 60 % avec « 6 min écoulées, 4 min restantes »

#### Scenario: Aucune panne
- **WHEN** aucune panne ni aucun suivi n'est actif
- **THEN** le widget affiche « Aucune panne » avec une icône de validation

#### Scenario: Détection suspendue
- **WHEN** `is_detection_enabled_by_template` est faux
- **THEN** le widget affiche l'icône « détection suspendue par le modèle »

#### Scenario: Thermostat sur climate sans vanne
- **WHEN** le thermostat est `over_climate` sans régulation par vanne
- **THEN** le widget est masqué

### Requirement: Place des widgets de fonctions
Les widgets de fonctions SHALL se placer après le widget Preset dans cet ordre, par placements déclaratifs : fenêtre, mouvement, délestage, arrêt et démarrage automatiques, verrouillage, panne de chauffage. Un widget masqué SHALL garder sa place.

#### Scenario: Ordre par défaut
- **WHEN** toutes les fonctions sont actives
- **THEN** les cartes de fonctions suivent la carte Preset dans l'ordre : Fenêtre, Mouvement, Délestage, Arrêt automatique, Verrouillage, Panne de chauffage

#### Scenario: Fenêtre masquée
- **WHEN** la détection de fenêtre est éteinte
- **THEN** Mouvement garde sa place relative après Preset

### Requirement: Langues, thème et écran étroit des widgets de fonctions
Chaque widget de fonction SHALL avoir son titre et tous ses libellés en anglais, français et allemand, SHALL utiliser les couleurs du thème clair et sombre, et SHALL rester lisible à 375 px.

#### Scenario: Allemand
- **WHEN** la langue de l'utilisateur est l'allemand
- **THEN** les titres et les libellés des six widgets sont allemands

#### Scenario: Thème sombre
- **WHEN** le thème est sombre
- **THEN** les icônes d'alerte, les jauges et les barres utilisent les couleurs du thème

#### Scenario: Mobile
- **WHEN** la vue d'un thermostat est affichée à 375 px
- **THEN** les six cartes tiennent en une colonne sans texte coupé

### Requirement: Taille des widgets de fonctions
Les six widgets de fonctions SHALL occuper une colonne de la grille, sans hauteur minimale, et SHALL ne déclarer aucune `size`.

#### Scenario: Une colonne
- **WHEN** la vue d'un thermostat est affichée à 1 440 px avec les six fonctions actives
- **THEN** chaque carte de fonction occupe une seule colonne

#### Scenario: Écran étroit
- **WHEN** la vue est affichée à 375 px
- **THEN** les cartes sont en une colonne, dans l'ordre des placements
