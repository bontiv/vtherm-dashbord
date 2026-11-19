# Spec Delta

## ADDED Requirements

### Requirement: Page Overview sans widget visible
Quand aucun widget global n'est visible, la page Overview SHALL afficher un message traduit qui explique qu'aucune information n'est disponible (aucun thermostat, pas de configuration centrale) au lieu d'une page blanche.

#### Scenario: Aucun widget
- **WHEN** aucun thermostat n'existe et qu'il n'y a pas de configuration centrale
- **THEN** la page Overview affiche le message d'absence d'information

#### Scenario: Au moins un widget
- **WHEN** au moins un widget global est visible
- **THEN** le message n'est pas affiché
