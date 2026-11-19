# Spec Delta

## ADDED Requirements

### Requirement: Widget Historique 24 h
Le widget `core.widget.history` SHALL montrer sur 24 heures la température courante, la consigne et la température extérieure du capteur de la configuration effective du thermostat, puis la puissance TPI sur une seconde courbe quand elle existe, avec le composant de graphique du dashboard et un résumé textuel. Il SHALL charger l'historique seulement quand sa carte est visible, et n'offrir ni sélecteur de période ni commande.

#### Scenario: Courbes affichées
- **WHEN** l'historique de 24 heures existe pour la température, la consigne, un capteur extérieur et la puissance TPI
- **THEN** le widget montre une courbe de températures à trois séries et une courbe de puissance, avec leurs libellés et leurs unités

#### Scenario: Sans puissance TPI
- **WHEN** le thermostat n'a pas de source de puissance
- **THEN** seule la courbe des températures est affichée

#### Scenario: Sans capteur extérieur
- **WHEN** le thermostat n'a pas de capteur extérieur
- **THEN** la courbe n'a pas de série extérieure et la légende ne la cite pas

#### Scenario: Erreur d'historique
- **WHEN** la lecture de l'historique échoue
- **THEN** le widget affiche « historique indisponible » à la place des courbes

#### Scenario: Attribut imbriqué
- **WHEN** le widget cherche l'historique d'une valeur qui n'est pas enregistrée par Home Assistant
- **THEN** il n'affiche aucune série pour cette valeur et ne signale pas d'erreur

#### Scenario: Carte hors de l'écran
- **WHEN** la carte est sous la zone visible
- **THEN** aucune requête d'historique n'est envoyée avant qu'elle devienne visible

### Requirement: Widget Équipements
Le widget `core.widget.devices` SHALL montrer par une icône et le nom de l'entité l'état de chaque équipement sous-jacent, si l'équipement est actif ou devrait l'être (`is_device_active`, `should_device_be_active`, `nb_device_actives`) et le mode de ventilation (`fan_mode`) quand il existe. Il SHALL être masqué quand le thermostat n'a aucun équipement sous-jacent publié.

#### Scenario: Deux équipements
- **WHEN** un thermostat a deux interrupteurs, l'un allumé et l'autre éteint
- **THEN** le widget affiche deux icônes avec leur nom et leur état

#### Scenario: Équipement attendu actif mais éteint
- **WHEN** `should_device_be_active` est vrai et `is_device_active` est faux
- **THEN** le widget affiche une alerte « attendu actif, éteint »

#### Scenario: Équipement indisponible
- **WHEN** l'état d'un équipement sous-jacent est `unavailable`
- **THEN** son icône affiche « indisponible » et les autres équipements restent affichés

#### Scenario: Ventilation
- **WHEN** le thermostat `over_climate` a un `fan_mode` égal à `auto`
- **THEN** le widget affiche l'icône de ventilation et « Auto »

### Requirement: Widget Apprentissage Auto TPI
Le widget `core_tpi.widget.auto_tpi` SHALL montrer par une icône l'état de l'apprentissage (`disabled`, `off`, `bootstrap`, `active`), les cycles appris, les coefficients calculés, la confiance du modèle, la constante de temps thermique, l'état de la capacité de chauffe, le statut du dernier apprentissage et son début. Il SHALL ne dessiner aucun bouton, et SHALL être masqué hors de TPI, quand l'option Auto TPI est éteinte ou que l'état est `disabled`.

#### Scenario: Apprentissage actif
- **WHEN** l'état est `active` avec 42 cycles de chauffe, `calculated_coef_int` à 0,55 et `calculated_coef_ext` à 0,012
- **THEN** le widget affiche l'icône « actif », « 42 cycles » et « coef. int 0,55 · coef. ext 0,012 »

#### Scenario: Confiance du modèle
- **WHEN** `model_confidence` vaut 0,62 (Versatile Thermostat la publie de 0 à 1)
- **THEN** le widget affiche une barre de confiance à 62 %

#### Scenario: Statut du dernier apprentissage
- **WHEN** `last_learning_status` contient un motif d'arrêt
- **THEN** le widget affiche ce texte tel que Versatile Thermostat le donne

#### Scenario: Option éteinte
- **WHEN** l'option Auto TPI n'est pas activée
- **THEN** le widget est masqué

#### Scenario: Apprentissage arrêté
- **WHEN** l'état est `off`
- **THEN** le widget reste affiché avec « Arrêté » et les derniers résultats

### Requirement: Widget Humidité
Le widget `core_humidity.widget.humidity` SHALL montrer l'humidité de la pièce (`current_humidity` de l'entité `climate`) sur une jauge de 0 à 100 %. Il SHALL être masqué quand l'attribut n'existe pas, et ne SHALL pas dessiner de courbe.

#### Scenario: Valeur affichée
- **WHEN** l'humidité est 48,5
- **THEN** la jauge affiche « 48,5 % » (« 48,5 % » en français, « 48.5 % » en anglais)

#### Scenario: Pas de capteur
- **WHEN** l'attribut `current_humidity` est absent
- **THEN** le widget est masqué

#### Scenario: Valeur indisponible
- **WHEN** l'attribut vaut `unknown`
- **THEN** la jauge affiche « — » avec la mention « indisponible »

### Requirement: Widget Suivi de l'équipement
Le widget `core_sync_temp.widget.sync` SHALL montrer la température envoyée à chaque équipement, une alerte quand le suivi de la consigne est suspendu avec sa raison et son nombre de tentatives, et en infobulle l'écart entre la température envoyée et celle constatée par équipement. Il SHALL être masqué hors des thermostats `over_climate` qui publient ces données.

#### Scenario: Suivi suspendu
- **WHEN** `suspended` est vrai avec la raison `max_attempts` et 3 tentatives
- **THEN** le widget affiche une alerte avec la raison et « 3 tentatives »

#### Scenario: Température envoyée
- **WHEN** la température envoyée à `climate.clim_salon` est 20,5 °C
- **THEN** le widget affiche « climate.clim_salon : 20,5 °C »

#### Scenario: Thermostat sur interrupteur
- **WHEN** le thermostat est de type `over_switch`
- **THEN** le widget est masqué

### Requirement: Widget Demande à la chaudière
Le widget `core_central_boiler.widget.thermostat` SHALL montrer par une icône de flamme et un texte si ce thermostat demande la chaudière centrale (équipement actif, thermostat rattaché à la chaudière). Il SHALL être masqué quand le thermostat n'est pas rattaché à la chaudière centrale.

#### Scenario: Demande active
- **WHEN** le thermostat est rattaché à la chaudière et que son équipement est actif
- **THEN** le widget affiche une flamme et « Demande la chaudière »

#### Scenario: Pas de demande
- **WHEN** le thermostat est rattaché à la chaudière et que son équipement est éteint
- **THEN** le widget affiche « Ne demande pas la chaudière »

#### Scenario: Thermostat non rattaché
- **WHEN** le thermostat n'est pas rattaché à la chaudière centrale
- **THEN** le widget est masqué

### Requirement: Widget Énergie du thermostat
Le widget `core_power.widget.energy` SHALL montrer la puissance moyenne du cycle (capteur `mean_power_cycle`) sur une courbe de 24 heures et l'énergie consommée (capteur `energy`) en compteur avec l'unité du capteur. Il SHALL être masqué quand ni l'un ni l'autre capteur n'existe.

#### Scenario: Valeurs affichées
- **WHEN** la puissance moyenne du cycle est 420 W et l'énergie 12,4 kWh
- **THEN** le widget affiche « 420 W », « 12,4 kWh » et la courbe des 24 dernières heures

#### Scenario: Puissance de l'appareil non renseignée
- **WHEN** aucun capteur d'énergie ni de puissance moyenne n'existe
- **THEN** le widget est masqué

#### Scenario: Compteur indisponible
- **WHEN** le capteur d'énergie est `unavailable`
- **THEN** le compteur affiche « — » et la courbe reste affichée

### Requirement: Place des widgets de détail
Les widgets de détail SHALL se placer après les widgets de fonctions par placements déclaratifs : équipements, Auto TPI, demande à la chaudière, énergie, humidité, suivi de l'équipement, puis l'historique en dernier. Un widget masqué SHALL garder sa place.

#### Scenario: Ordre par défaut
- **WHEN** tous les widgets de détail sont visibles
- **THEN** les cartes sont dans l'ordre : Équipements, Auto TPI, Demande à la chaudière, Énergie, Humidité, Suivi de l'équipement, Historique 24 h

#### Scenario: Cible absente
- **WHEN** le widget Équipements est retiré par un plugin tiers
- **THEN** les autres cartes de détail gardent leur ordre relatif

### Requirement: Langues, thème et écran étroit des widgets de détail
Chaque widget de détail SHALL avoir son titre et tous ses libellés en anglais, français et allemand, SHALL utiliser les couleurs du thème clair et sombre, et SHALL rester lisible à 375 px, courbes comprises.

#### Scenario: Allemand
- **WHEN** la langue de l'utilisateur est l'allemand
- **THEN** les titres, les libellés et les axes des courbes des sept widgets sont allemands

#### Scenario: Thème sombre
- **WHEN** le thème est sombre
- **THEN** les courbes, les jauges et les icônes utilisent les couleurs du thème

#### Scenario: Mobile
- **WHEN** la vue d'un thermostat est affichée à 375 px
- **THEN** les courbes occupent la largeur de la carte sans débordement et gardent leur résumé textuel

### Requirement: Taille des widgets de détail
Le widget Historique 24 h SHALL occuper deux colonnes et deux lignes, les widgets Apprentissage Auto TPI et Énergie du thermostat une colonne et deux lignes, et les autres widgets de détail une colonne. Sur un écran étroit, chaque widget SHALL occuper une colonne en gardant sa hauteur minimale.

#### Scenario: Historique sur deux colonnes
- **WHEN** la vue d'un thermostat est affichée à 1 440 px
- **THEN** la carte de l'historique occupe deux colonnes et sa hauteur minimale est de deux lignes

#### Scenario: Auto TPI sur deux lignes
- **WHEN** le widget Apprentissage Auto TPI est affiché
- **THEN** sa carte occupe une colonne et sa hauteur minimale est de deux lignes

#### Scenario: Écran étroit
- **WHEN** la vue est affichée à 375 px
- **THEN** l'historique occupe une colonne et garde sa hauteur de deux lignes

#### Scenario: Un widget large ne bloque pas les suivants
- **WHEN** l'historique de deux colonnes ne tient pas dans la rangée en cours
- **THEN** il passe à la rangée suivante dans l'ordre des placements
