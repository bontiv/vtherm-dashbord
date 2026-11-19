# Spec Delta

## ADDED Requirements

### Requirement: Widgets de fonctions des plugins natifs
Les plugins `core_window`, `core_motion`, `core_power`, `core_auto_start_stop`, `core_lock` et `core_heating_failure` SHALL déclarer chacun un widget de la vue d'ensemble d'un thermostat dans leur liste `thermostat_widget`, d'identifiant `<plugin>.widget.window`, `.motion`, `.overpowering`, `.auto_start_stop`, `.lock` et `.failure`.

#### Scenario: Plugin à plusieurs widgets
- **WHEN** le dashboard charge le plugin `core_power`
- **THEN** il enregistre le widget `core_power.widget.overpowering` du thermostat, sans retirer ses widgets globaux ou d'énergie déclarés par d'autres changes

#### Scenario: Plugin retiré
- **WHEN** le plugin `core_motion` est désactivé
- **THEN** le widget Mouvement n'apparaît plus et les autres gardent leur place
