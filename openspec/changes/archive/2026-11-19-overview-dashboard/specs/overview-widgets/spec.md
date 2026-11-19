# Spec Delta

## ADDED Requirements

### Requirement: Widget Mode central
Le widget `core.widget.central_mode` SHALL montrer le mode central actuel (`Auto`, `Stopped`, `Heat only`, `Cool only`, `Frost protection`) par une icône et un libellé traduit, et SHALL ne dessiner aucun sélecteur. Il SHALL être masqué quand l'entité du mode central n'existe pas.

#### Scenario: Mode affiché
- **WHEN** le mode central est `Frost protection`
- **THEN** le widget affiche l'icône hors-gel et le libellé « Hors-gel » en français

#### Scenario: Valeur inconnue
- **WHEN** l'état de l'entité est une option que le dashboard ne connaît pas
- **THEN** le widget affiche l'option telle quelle avec une icône générique

#### Scenario: Sans configuration centrale
- **WHEN** aucune configuration centrale n'existe
- **THEN** le widget est masqué

#### Scenario: Entité indisponible
- **WHEN** l'entité du mode central est `unavailable`
- **THEN** le widget affiche « — » avec la mention « indisponible »

### Requirement: Widget Résumé des thermostats
Le widget `core.widget.summary` SHALL montrer sur une barre segmentée le nombre de thermostats en chauffe, au repos, éteints et indisponibles, plus en climatisation quand il y en a au moins un, et lister, avec un lien vers sa vue, chaque thermostat en alerte (messages `safety_detected`, `overpowering_detected` ou `underlying_unavailable`, panne de chauffage ou de refroidissement, équipements indisponibles). Il SHALL ne dessiner aucun graphique.

#### Scenario: Répartition
- **WHEN** trois thermostats chauffent, cinq sont au repos et deux sont éteints
- **THEN** la barre montre 3, 5 et 2 avec leurs libellés et leurs valeurs en texte

#### Scenario: Thermostat en alerte
- **WHEN** le thermostat « Salon » a `safety_detected` dans ses messages
- **THEN** le widget liste « Salon » avec une icône d'alerte et un lien vers sa vue d'ensemble

#### Scenario: Aucune alerte
- **WHEN** aucun thermostat n'est en alerte
- **THEN** le widget affiche « Aucune alerte » avec une icône de validation

#### Scenario: Thermostat indisponible
- **WHEN** l'entité `climate` d'un thermostat est `unavailable`
- **THEN** il est compté comme indisponible et non comme éteint

#### Scenario: Trente thermostats
- **WHEN** l'état d'une entité qui n'appartient à aucun thermostat change
- **THEN** le widget n'est pas redessiné

### Requirement: Widget Température extérieure
Le widget `core.widget.outdoor` SHALL montrer la valeur du capteur extérieur de la configuration centrale et sa courbe sur 24 heures, avec l'unité de l'entité. Il SHALL être masqué quand la configuration centrale n'a pas de capteur extérieur ou que son entité n'existe pas.

#### Scenario: Valeur et courbe
- **WHEN** le capteur extérieur vaut 6,2 °C et que son historique existe
- **THEN** le widget affiche « 6,2 °C » et la courbe des 24 dernières heures avec un résumé textuel

#### Scenario: Historique indisponible
- **WHEN** la lecture de l'historique échoue
- **THEN** le widget affiche la valeur courante et un message « historique indisponible » à la place de la courbe

#### Scenario: Sans capteur extérieur
- **WHEN** la configuration centrale n'a pas de capteur extérieur
- **THEN** le widget est masqué

### Requirement: Widget Chaudière centrale
Le widget `core_central_boiler.widget.boiler` SHALL montrer si la chaudière est appelée (capteur binaire `central_boiler_state`), le nombre de thermostats demandeurs sur une jauge dont le repère est le seuil du nombre d'équipements, la liste des demandeurs avec un lien vers chacun, un sablier quand l'activation est différée et une alerte quand la chaudière n'est pas prête. Il SHALL être masqué quand le capteur binaire n'existe pas.

#### Scenario: Chaudière appelée
- **WHEN** la chaudière est allumée, avec 3 demandeurs pour un seuil de 2
- **THEN** le widget affiche l'icône de chaudière allumée, la jauge à « 3 » avec le repère 2 et les trois noms

#### Scenario: Activation différée
- **WHEN** `activation_scheduled` est vrai avec `delayed_activation_sec` à 30
- **THEN** le widget affiche un sablier et « activation dans 30 s »

#### Scenario: Chaudière non prête
- **WHEN** `is_central_boiler_ready` est faux
- **THEN** le widget affiche une alerte « Chaudière non prête »

#### Scenario: Fonction éteinte
- **WHEN** la chaudière centrale n'est pas activée dans la configuration centrale
- **THEN** le widget est masqué

### Requirement: Widget Puissance demandée à la chaudière
Le widget `core_central_boiler.widget.boiler_power` SHALL montrer la puissance totale demandée (capteur `total_power_active_boiler`) sur une jauge dont le repère est le seuil de puissance, et sa courbe sur 24 heures. Il SHALL être masqué quand ce capteur n'existe pas.

#### Scenario: Valeur et seuil
- **WHEN** la puissance demandée est 1 800 W et le seuil 1 000 W
- **THEN** la jauge affiche « 1 800 W » avec le repère « 1 000 W »

#### Scenario: Seuil de puissance inutilisé
- **WHEN** le capteur de puissance n'existe pas
- **THEN** le widget est masqué

#### Scenario: Unité kW
- **WHEN** le capteur est en kW
- **THEN** la valeur, le repère et la courbe sont en kW

### Requirement: Widget Puissance du logement
Le widget `core_power.widget.house_power` SHALL montrer la puissance courante et la puissance maximale du logement (`power_manager.current_power` et `current_max_power` d'un thermostat) sur une jauge, la marge calculée par le dashboard, et l'énergie totale des thermostats seulement quand tous les compteurs ont la même unité. Il SHALL être masqué quand aucun thermostat ne publie la puissance courante.

#### Scenario: Valeurs affichées
- **WHEN** la puissance courante est 4,1 kW pour un maximum de 6 kW
- **THEN** la jauge affiche « 4,1 / 6 kW » et la marge « 1,9 kW »

#### Scenario: Unités d'énergie différentes
- **WHEN** deux compteurs d'énergie ont des unités différentes
- **THEN** l'énergie totale n'est pas affichée et le reste du widget l'est

#### Scenario: Gestion de puissance éteinte
- **WHEN** aucun thermostat ne publie `power_manager.current_power`
- **THEN** le widget est masqué

#### Scenario: Dépassement
- **WHEN** la puissance courante dépasse le maximum
- **THEN** la jauge est en couleur d'avertissement et la marge affiche « dépassement de 0,4 kW »

### Requirement: Widget Présence
Le widget `core_presence.widget.presence` SHALL montrer la présence globale, lue sur le capteur de présence de la configuration centrale (`presence_sensor_entity_id`) comme Versatile Thermostat le lit (`on` ou `home` présent, `off` ou `not_home` absent, toute autre valeur inconnu), par une icône et un texte « présent », « absent » ou « inconnu », sans bouton. Il SHALL être masqué quand la configuration centrale n'a pas de capteur de présence ou que son entité n'existe pas.

#### Scenario: Présent
- **WHEN** le capteur est allumé
- **THEN** le widget affiche l'icône de présence et « Présent »

#### Scenario: Inconnu
- **WHEN** le capteur est `unknown`
- **THEN** le widget affiche « Inconnu » et non « Absent »

#### Scenario: Détection de présence éteinte
- **WHEN** la configuration centrale n'a pas de capteur de présence
- **THEN** le widget est masqué

### Requirement: Mise en page de la page Overview
La page Overview SHALL ranger les widgets globaux dans cet ordre, par placements déclaratifs : mode central, présence, résumé, chaudière, puissance de la chaudière, puissance du logement, température extérieure. Un widget masqué SHALL garder sa place.

#### Scenario: Ordre par défaut
- **WHEN** toutes les fonctions centrales sont actives
- **THEN** les cartes sont dans l'ordre : Mode central, Présence, Résumé, Chaudière, Puissance de la chaudière, Puissance du logement, Température extérieure

#### Scenario: Chaudière masquée
- **WHEN** la chaudière centrale est éteinte
- **THEN** les autres cartes gardent leur ordre relatif

### Requirement: Langues, thème et écran étroit des widgets globaux
Chaque widget global SHALL avoir son titre et tous ses libellés en anglais, français et allemand, SHALL utiliser les couleurs du thème clair et sombre, et SHALL rester lisible à 375 px.

#### Scenario: Allemand
- **WHEN** la langue de l'utilisateur est l'allemand
- **THEN** les titres, les libellés des modes centraux et les textes des sept widgets sont allemands

#### Scenario: Thème sombre
- **WHEN** le thème est sombre
- **THEN** la barre du résumé, les jauges et les courbes utilisent les couleurs du thème

#### Scenario: Mobile
- **WHEN** la page Overview est affichée à 375 px
- **THEN** les cartes sont en une colonne, et la liste des thermostats en alerte passe à la ligne sans débordement

### Requirement: Taille des widgets globaux
Les widgets Température extérieure et Puissance demandée à la chaudière SHALL occuper deux colonnes et deux lignes, le widget Chaudière centrale une colonne et deux lignes, et les widgets Mode central, Présence, Résumé des thermostats et Puissance du logement une colonne. Sur un écran étroit, chaque widget SHALL occuper une colonne.

#### Scenario: Résumé sur une colonne
- **WHEN** la page Overview est affichée à 1 440 px
- **THEN** la carte du résumé occupe une colonne, après le mode central et la présence

#### Scenario: Courbe sur deux colonnes
- **WHEN** la page Overview est affichée à 1 440 px
- **THEN** la carte de la température extérieure occupe deux colonnes et sa hauteur minimale est de deux lignes

#### Scenario: Écran étroit
- **WHEN** la page Overview est affichée à 375 px
- **THEN** toutes les cartes occupent une colonne et la carte de la chaudière garde sa hauteur minimale
