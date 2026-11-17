# Spec Delta

## MODIFIED Requirements

### Requirement: Plugin `core_window`
Le plugin `core_window` SHALL fournir l'onglet d'ouverture, affiché quand la fonctionnalité est active : capteur d'ouverture, délai d'ouverture (30), délai de fermeture (30), action (arrêt, ventilation seule, hors-gel, éco) et, avec la méthode « chute de température », seuils de détection automatique (ouverture 3, fermeture 0) et durée maximale (30). Avec la méthode « capteur d'ouverture », le capteur SHALL être compté comme valeur manquante tant qu'il est vide.

#### Scenario: Avec capteur
- **WHEN** un capteur d'ouverture est renseigné
- **THEN** les seuils de détection automatique et la durée maximale ne sont pas proposés

#### Scenario: Sans capteur
- **WHEN** aucun capteur d'ouverture n'est renseigné et que la méthode « chute de température » est choisie
- **THEN** les seuils de détection automatique et la durée maximale sont proposés

#### Scenario: Méthode capteur sans capteur
- **WHEN** la méthode « capteur d'ouverture » est choisie et que le capteur est vide
- **THEN** la section est signalée incomplète

## ADDED Requirements

### Requirement: Choix de la méthode de détection d'ouverture
Quand la fonctionnalité d'ouverture est active, l'onglet d'ouverture SHALL proposer un choix exclusif entre « Capteur d'ouverture » et « Chute de température », présenté comme un groupe de boutons, et n'afficher que les champs de la méthode choisie. La méthode initiale SHALL être déduite des valeurs : capteur si un capteur est renseigné, chute de température si un seuil de détection l'est sans capteur, capteur sinon.

#### Scenario: Thermostat avec capteur
- **WHEN** l'onglet ouverture d'un thermostat qui a un capteur d'ouverture est affiché
- **THEN** « Capteur d'ouverture » est choisi et les seuils de détection automatique ne sont pas affichés

#### Scenario: Passage à la chute de température
- **WHEN** l'administrateur choisit « Chute de température »
- **THEN** le capteur d'ouverture est retiré du brouillon, et les seuils d'ouverture et de fermeture et la durée maximale sont affichés

#### Scenario: Retour au capteur
- **WHEN** l'administrateur revient à « Capteur d'ouverture »
- **THEN** les seuils de détection automatique propres au thermostat sont retirés du brouillon et le capteur est demandé

#### Scenario: Accessibilité du choix
- **WHEN** un lecteur d'écran atteint le choix de méthode
- **THEN** il annonce un groupe de boutons radio intitulé « Comment détecter une fenêtre ouverte ? » et l'option choisie
