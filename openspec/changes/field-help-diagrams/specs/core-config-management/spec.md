# Spec Delta

## ADDED Requirements

### Requirement: Cartes explicatives des types de thermostat
L'assistant de création SHALL présenter chaque type de thermostat proposé par une carte sélectionnable qui porte une icône, un titre qui dit ce que le thermostat pilote, une phrase qui explique comment Versatile Thermostat le pilote et des exemples d'équipements, traduits dans la langue de l'utilisateur. Ces cartes SHALL remplacer la liste déroulante du type.

#### Scenario: Cartes affichées
- **WHEN** l'administrateur démarre la création d'un thermostat
- **THEN** trois cartes sont affichées : piloter un interrupteur (radiateurs électriques, fils pilotes, prises), piloter un équipement qui a son propre thermostat (vannes thermostatiques, climatiseurs, pompes à chaleur) et régler l'ouverture d'une vanne (vannes qui exposent leur ouverture en nombre)

#### Scenario: Sélection au clavier
- **WHEN** l'administrateur atteint les cartes au clavier et valide l'une d'elles
- **THEN** ce type est choisi, la carte est marquée sélectionnée et les champs de ce type sont affichés

#### Scenario: Changement de type
- **WHEN** l'administrateur choisit une autre carte après avoir commencé à renseigner les champs
- **THEN** le type change selon les mêmes règles que le changement de type dans la liste déroulante actuelle

#### Scenario: Écran étroit
- **WHEN** l'assistant est affiché sur un écran de 360 px de large
- **THEN** les cartes s'empilent verticalement sans débordement horizontal
