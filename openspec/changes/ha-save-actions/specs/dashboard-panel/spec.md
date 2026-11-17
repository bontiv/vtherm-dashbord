# Spec Delta

## MODIFIED Requirements

### Requirement: Zones sûres des écrans à encoche
Le cadre du dashboard SHALL respecter les marges de zone sûre que l'application Home Assistant ou le navigateur indique (encoche, barre de navigation du système), pour que l'en-tête, le tiroir et le bas de la page, avec les actions de la dernière carte, restent visibles et utilisables.

#### Scenario: Téléphone avec encoche
- **WHEN** le dashboard est ouvert dans l'application Home Assistant sur un téléphone dont l'écran a une encoche ou une barre de navigation système
- **THEN** aucun contrôle de l'en-tête n'est sous l'encoche, et en bas de la page les actions de la dernière carte peuvent être amenées au-dessus de la barre de navigation du système

## REMOVED Requirements

### Requirement: Barre d'enregistrement sur mobile
**Reason**: La barre d'enregistrement collée en bas de l'écran est remplacée par des actions en pied de la carte de chaque section, comme dans les pages de configuration de Home Assistant (voir `config-save-actions`).
**Migration**: Sur un téléphone, l'administrateur enregistre ou annule avec les actions du pied de la carte de la section, en faisant défiler jusqu'au bas de la carte. L'exigence « Actions sur un écran étroit » de `config-save-actions` couvre leur disposition.
