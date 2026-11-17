# Spec Delta

## MODIFIED Requirements

### Requirement: Onglet fonctionnalités
L'onglet "fonctionnalités" SHALL proposer l'activation des fonctionnalités ouverture, mouvement, puissance et présence pour tous les types, la détection de panne de chauffage pour les types sans climate simple, le démarrage et l'arrêt automatiques pour `over_climate` sans régulation par vanne, et la chaudière centrale pour la configuration générale. L'interrupteur d'activation affiché dans l'onglet d'une fonctionnalité SHALL modifier la même valeur.

#### Scenario: Activation d'une fonctionnalité
- **WHEN** l'administrateur active la fonctionnalité mouvement
- **THEN** l'onglet mouvement passe du statut éteinte à son statut calculé et affiche ses champs

#### Scenario: Fonctionnalité non applicable
- **WHEN** un thermostat `over_switch` est ouvert
- **THEN** l'option de démarrage et d'arrêt automatiques n'est pas proposée

#### Scenario: Activation depuis l'onglet de la fonctionnalité
- **WHEN** l'administrateur active la fonctionnalité mouvement par l'interrupteur de l'onglet mouvement
- **THEN** l'onglet "fonctionnalités" montre la fonctionnalité mouvement active

## ADDED Requirements

### Requirement: Onglets des fonctionnalités éteintes
Les onglets natifs liés à une fonctionnalité (ouverture, mouvement, puissance, présence, démarrage et arrêt automatiques, chaudière centrale, détection de panne de chauffage) SHALL, quand la fonctionnalité s'applique au type mais est désactivée, rester listés avec le statut éteinte au lieu d'être masqués, et SHALL déclarer la valeur d'activation de leur fonctionnalité.

#### Scenario: Onglet ouverture éteint
- **WHEN** un thermostat dont la fonctionnalité d'ouverture est désactivée est ouvert
- **THEN** l'onglet ouverture figure dans le menu avec le statut éteinte

#### Scenario: Chaudière centrale
- **WHEN** la configuration générale est ouverte avec la chaudière centrale désactivée
- **THEN** l'onglet de la chaudière centrale figure dans son menu avec le statut éteinte
