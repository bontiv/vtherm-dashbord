# Spec Delta

## ADDED Requirements

### Requirement: Widgets de détail des plugins natifs
Les plugins natifs SHALL déclarer chacun leurs widgets de détail de la vue d'ensemble d'un thermostat dans une liste `thermostat_widget` : `core` les widgets `core.widget.history` et `core.widget.devices`, `core_tpi` le widget `core_tpi.widget.auto_tpi`, `core_humidity` le widget `core_humidity.widget.humidity`, `core_sync_temp` le widget `core_sync_temp.widget.sync`, `core_central_boiler` le widget `core_central_boiler.widget.thermostat` et `core_power` le widget `core_power.widget.energy`.

#### Scenario: Plugin à deux widgets
- **WHEN** le dashboard charge le plugin `core`
- **THEN** il enregistre aussi `core.widget.history` et `core.widget.devices`, chacun avec son placement et sa condition de visibilité

#### Scenario: Remplacement de l'historique
- **WHEN** un plugin tiers déclare `replace: core.widget.history`
- **THEN** son widget prend la place de la carte d'historique, en dernière position
