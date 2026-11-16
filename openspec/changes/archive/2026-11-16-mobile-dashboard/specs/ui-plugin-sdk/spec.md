# Spec Delta

## MODIFIED Requirements

### Requirement: Types du contrat
Le package SHALL exporter les types de la définition de plugin, des contributions, des positions, des hooks et des propriétés reçues par les composants de contribution. Le type de position SHALL n'autoriser qu'une seule forme (`first`, `last`, `before`, `after`, `replace` ou `remove`) et SHALL refuser toute valeur numérique d'ordre. Les propriétés communes à tous les composants SHALL comprendre `hass` et `narrow`, l'indication d'un affichage étroit.

#### Scenario: Position invalide à la compilation
- **WHEN** un auteur écrit une position contenant à la fois `after` et `before`
- **THEN** la compilation TypeScript échoue

#### Scenario: Propriétés d'un composant par thermostat
- **WHEN** un composant est déclaré pour le hook `thermostat_widget`
- **THEN** son type de propriétés inclut `hass` et `thermostatId`

#### Scenario: Indication d'écran étroit dans les types
- **WHEN** un auteur écrit le composant d'une contribution de n'importe quel hook
- **THEN** son type de propriétés inclut `narrow`, un booléen
