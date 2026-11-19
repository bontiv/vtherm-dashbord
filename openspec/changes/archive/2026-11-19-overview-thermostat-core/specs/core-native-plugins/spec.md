# Spec Delta

## ADDED Requirements

### Requirement: Widgets de base des plugins natifs
Les plugins natifs SHALL déclarer chacun leurs widgets de la vue d'ensemble d'un thermostat dans une liste `thermostat_widget` : `core` les widgets `core.widget.temperature`, `core.widget.mode` et `core.widget.alerts`, `core_tpi` `core_tpi.widget.heating`, `core_valve_regulation` `core_valve_regulation.widget.valve`, `core_presets` `core_presets.widget.preset` et `core_advanced` `core_advanced.widget.safety`. Ils SHALL utiliser les mêmes mécanismes que les plugins tiers.

#### Scenario: Plugin à plusieurs widgets
- **WHEN** le dashboard charge le plugin `core`
- **THEN** il enregistre trois contributions `thermostat_widget`, chacune avec son placement et sa condition de visibilité

#### Scenario: Retrait par un plugin tiers
- **WHEN** un plugin tiers déclare `remove: core.widget.alerts` sur `thermostat_widget`
- **THEN** le widget Alertes n'apparaît plus et les autres gardent leur place

#### Scenario: Plugin sans widget
- **WHEN** le plugin `core_complements` est chargé
- **THEN** il ne déclare aucun widget
