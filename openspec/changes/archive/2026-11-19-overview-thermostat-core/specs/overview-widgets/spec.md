# Spec Delta

## ADDED Requirements

### Requirement: Widget Température
Le widget `core.widget.temperature` SHALL montrer sur une jauge (bornes `min_temp` et `max_temp`) la température courante de l'entité `climate` et la consigne en repère, puis la température extérieure du thermostat, avec l'unité de Home Assistant. Il SHALL montrer « demandée → appliquée » seulement quand ces consignes diffèrent, et la consigne régulée seulement quand son capteur existe.

#### Scenario: Valeurs affichées
- **WHEN** la température courante est 19,5, la consigne 21 et la température extérieure 6,2, en °C
- **THEN** la jauge montre 19,5 avec le repère 21 et la ligne extérieure affiche « 6,2 °C »

#### Scenario: Consigne modifiée par une fonction
- **WHEN** la consigne demandée est 21 et que la consigne appliquée est 17 à cause d'une fenêtre ouverte
- **THEN** le widget affiche « 21 → 17 °C »

#### Scenario: Consigne identique
- **WHEN** les consignes demandée et appliquée sont égales
- **THEN** le widget n'affiche pas la ligne « demandée → appliquée »

#### Scenario: Pas de capteur extérieur
- **WHEN** le thermostat n'a pas de température extérieure
- **THEN** la ligne extérieure affiche « — » et la jauge reste affichée

#### Scenario: Température indisponible
- **WHEN** l'état de l'entité `climate` est `unavailable`
- **THEN** la jauge affiche « — » avec la mention « indisponible »

### Requirement: Widget Mode et action
Le widget `core.widget.mode` SHALL montrer par une icône et un texte le mode HVAC (état de `climate`) et l'action HVAC (`hvac_action`), la raison du mode ou de l'arrêt (`hvac_off_reason`, `hvac_mode_reason`) en libellé traduit, la veille (`is_sleeping`) et le mode central appliqué (`last_central_mode`) seulement quand ils s'appliquent. Il SHALL ne dessiner aucun bouton.

#### Scenario: Chauffe en cours
- **WHEN** le mode est `heat` et l'action `heating`
- **THEN** le widget affiche l'icône de chauffe et les textes « Chauffage » et « En chauffe »

#### Scenario: Arrêt par une fenêtre
- **WHEN** le mode est `off` avec la raison `hvac_off_window_detection`
- **THEN** le widget affiche « Arrêt » et la raison « Fenêtre ouverte »

#### Scenario: Raison inconnue
- **WHEN** la raison est un code que le dashboard ne connaît pas
- **THEN** le widget affiche le code tel quel avec une icône générique

#### Scenario: Aucune commande
- **WHEN** le widget est affiché
- **THEN** il ne contient aucun bouton ni sélecteur de mode

### Requirement: Widget Alertes et raisons
Le widget `core.widget.alerts` SHALL lister les messages actifs (`messages`) chacun avec une icône et un texte traduit, le thermostat non prêt (`is_ready` faux), les équipements sous-jacents indisponibles ou non initialisés (liste en infobulle), l'âge de la dernière mesure intérieure et extérieure, et l'inhibition quand elle est utilisée. Quand rien n'est à signaler, il SHALL le dire avec une icône de validation.

#### Scenario: Message actif
- **WHEN** `messages` contient `overpowering_detected`
- **THEN** le widget affiche une alerte avec une icône, le texte « Délestage actif » et la couleur d'avertissement

#### Scenario: Mesure ancienne
- **WHEN** la dernière mesure intérieure date de 12 minutes et que le délai de sécurité effectif est de 5 minutes
- **THEN** le widget affiche « il y a 12 minutes » en couleur d'avertissement avec la date complète en infobulle

#### Scenario: Délai de sécurité inconnu
- **WHEN** aucun délai de sécurité n'est connu
- **THEN** l'âge de la mesure s'affiche sans couleur d'avertissement

#### Scenario: Équipement indisponible
- **WHEN** `unavailable_underlying_entities` contient `switch.radiateur_salon`
- **THEN** le widget montre une alerte dont l'infobulle liste `switch.radiateur_salon`

#### Scenario: Rien à signaler
- **WHEN** aucun message n'est actif, que le thermostat est prêt et que les mesures sont récentes
- **THEN** le widget affiche « Aucune alerte » avec une icône de validation et les deux âges

### Requirement: Widget Chauffe TPI
Le widget `core_tpi.widget.heating` SHALL montrer la puissance demandée (0 à 100 %) sur une barre et, quand elles existent, les durées ON et OFF du cycle sur une barre segmentée. Il SHALL être masqué quand l'algorithme n'est pas TPI ou qu'aucune source de la puissance n'existe, et ne SHALL pas afficher la position dans le cycle, que Versatile Thermostat ne publie pas.

#### Scenario: Valeurs affichées
- **WHEN** la puissance demandée est 62 %, la durée ON 186 s et la durée OFF 114 s
- **THEN** la barre montre « 62 % » et la barre segmentée montre « ON 186 s » et « OFF 114 s »

#### Scenario: Thermostat sur climate sans vanne
- **WHEN** le thermostat est de type `over_climate` sans régulation par vanne
- **THEN** le widget est masqué

#### Scenario: Durées absentes
- **WHEN** la puissance existe mais pas les durées du cycle
- **THEN** seule la barre de puissance est affichée

#### Scenario: Puissance indisponible
- **WHEN** la source de la puissance est `unavailable`
- **THEN** la barre affiche « — » avec la mention « indisponible »

### Requirement: Widget Vanne
Le widget `core_valve_regulation.widget.valve` SHALL montrer l'ouverture de la vanne (`valve_open_percent`, en %) sur une jauge, et une barre par vanne quand le thermostat en a plusieurs. Il SHALL être masqué quand aucune source de l'ouverture n'existe.

#### Scenario: Une vanne
- **WHEN** l'ouverture est 40 % pour une seule vanne
- **THEN** le widget montre une jauge à « 40 % » sans barre par vanne

#### Scenario: Plusieurs vannes
- **WHEN** le thermostat a deux vannes ouvertes à 30 % et 50 %
- **THEN** le widget montre la jauge et deux barres libellées avec le nom de chaque vanne

#### Scenario: Thermostat sans vanne
- **WHEN** le thermostat est sur interrupteur
- **THEN** le widget est masqué

### Requirement: Widget Preset et dérogation
Le widget `core_presets.widget.preset` SHALL montrer le preset courant (`preset_mode`) avec son icône, le preset temporisé actif avec le temps restant en texte et l'heure de fin, et la dérogation manuelle avec le preset de reprise. Il SHALL ne montrer ni barre de progression du temporisé, dont la durée totale n'est pas publiée, ni sélecteur de preset.

#### Scenario: Preset courant
- **WHEN** le preset est `eco`
- **THEN** le widget affiche l'icône et le texte « Éco »

#### Scenario: Preset temporisé
- **WHEN** un preset temporisé `boost` est actif avec 25 minutes restantes
- **THEN** le widget affiche « Boost » et « 25 min restantes » avec l'heure de fin, sans barre

#### Scenario: Dérogation manuelle
- **WHEN** `is_manual_override` est vrai et le preset de reprise `comfort`
- **THEN** le widget affiche « Dérogation manuelle » et « reprise : Confort »

#### Scenario: Sans preset
- **WHEN** le preset est `none`
- **THEN** le widget affiche « Aucun preset »

### Requirement: Widget Sécurité
Le widget `core_advanced.widget.safety` SHALL montrer par une icône et un texte si le mode sécurité est actif (`safety_state`), et, pendant la sécurité avec TPI, la part de chauffe imposée sur une barre colorée. Il SHALL être masqué quand la sécurité n'est pas configurée.

#### Scenario: Sécurité normale
- **WHEN** le capteur binaire `safety_state` est éteint
- **THEN** le widget affiche une icône de validation et « Normal »

#### Scenario: Sécurité déclenchée
- **WHEN** `safety_state` est allumé et que la part de chauffe imposée est 25 %
- **THEN** le widget affiche une icône d'alerte, « Mode sécurité actif » et une barre à « 25 % » en couleur d'avertissement

#### Scenario: Sécurité non configurée
- **WHEN** `is_safety_configured` est faux
- **THEN** le widget est masqué

#### Scenario: État indisponible
- **WHEN** `safety_state` vaut `unavailable`
- **THEN** le widget affiche « indisponible » et aucune alerte

### Requirement: Mise en page de la vue d'ensemble d'un thermostat
La vue d'ensemble d'un thermostat SHALL ranger les widgets de base dans cet ordre, par placements déclaratifs : température en premier, puis mode, alertes, chauffe, vanne, preset, sécurité. Un widget masqué SHALL garder sa place, et la vue SHALL transmettre aux conditions de visibilité les valeurs du thermostat et celles de la configuration centrale.

#### Scenario: Ordre par défaut
- **WHEN** un thermostat sur interrupteur a toutes les fonctions de base
- **THEN** les cartes sont, dans l'ordre : Température, Mode et action, Alertes, Chauffe, Preset, Sécurité

#### Scenario: Widget masqué
- **WHEN** la vanne est masquée parce que le thermostat est sur interrupteur
- **THEN** les cartes Preset et Sécurité gardent leur ordre relatif

#### Scenario: Insertion par un plugin tiers
- **WHEN** un plugin tiers déclare un widget `after: core.widget.mode`
- **THEN** sa carte est placée juste après Mode et action

#### Scenario: Fonctionnalité héritée
- **WHEN** la sécurité est configurée seulement dans la configuration centrale et que le thermostat l'utilise
- **THEN** le widget Sécurité est affiché

### Requirement: Langues, thème et écran étroit des widgets de base
Chaque widget de base SHALL avoir son titre et tous ses libellés en anglais, français et allemand, SHALL utiliser les couleurs du thème clair et sombre, et SHALL rester lisible à 375 px.

#### Scenario: Allemand
- **WHEN** la langue de l'utilisateur est l'allemand
- **THEN** les titres et les libellés des sept widgets sont ceux du catalogue allemand de leur plugin

#### Scenario: Langue non prise en charge
- **WHEN** la langue de l'utilisateur n'est pas prise en charge
- **THEN** les textes sont en anglais

#### Scenario: Thème sombre
- **WHEN** le thème est sombre
- **THEN** aucun texte ni icône ne garde une couleur figée du thème clair

#### Scenario: Mobile
- **WHEN** la vue d'un thermostat est affichée à 375 px
- **THEN** les cartes sont en une colonne et aucun texte n'est coupé

### Requirement: Taille des widgets de base
Les sept widgets de base SHALL occuper une colonne de la grille, sans hauteur minimale, et SHALL ne déclarer aucune `size`.

#### Scenario: Une colonne
- **WHEN** la vue d'un thermostat est affichée à 1 440 px
- **THEN** chacune des cartes de base occupe une seule colonne

#### Scenario: Écran étroit
- **WHEN** la vue est affichée à 375 px
- **THEN** les cartes sont en une colonne, dans le même ordre
