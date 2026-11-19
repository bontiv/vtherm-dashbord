# Spec Delta

## ADDED Requirements

### Requirement: Widgets globaux des plugins natifs
Les plugins natifs SHALL déclarer chacun leurs widgets de la page Overview dans une liste `global_widget` : `core` les widgets `core.widget.central_mode`, `core.widget.summary` et `core.widget.outdoor`, `core_central_boiler` les widgets `core_central_boiler.widget.boiler` et `core_central_boiler.widget.boiler_power`, `core_power` le widget `core_power.widget.house_power` et `core_presence` le widget `core_presence.widget.presence`.

#### Scenario: Plugin à deux widgets globaux
- **WHEN** le dashboard charge le plugin `core_central_boiler`
- **THEN** il enregistre deux contributions `global_widget`, chacune avec son placement et sa condition de visibilité

#### Scenario: Remplacement par un plugin tiers
- **WHEN** un plugin tiers déclare `replace: core_central_boiler.widget.boiler`
- **THEN** son widget prend la place de la carte de la chaudière et `core_central_boiler.widget.boiler_power` garde son ordre
