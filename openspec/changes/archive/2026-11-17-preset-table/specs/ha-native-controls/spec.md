# Spec Delta

## MODIFIED Requirements

### Requirement: Contrôles hors configuration
Les contrôles de l'assistant de création, des filtres de la page Compléments, de la page de développement et des boutons d'action SHALL utiliser les composants de Home Assistant équivalents (`ha-selector`, `ha-textfield`, `ha-select`, `ha-switch`, `ha-button`, `ha-icon`). Les températures du tableau des presets SHALL être saisies avec des champs numériques compacts du dashboard, stylés par les variables du thème de Home Assistant, avec une justification en commentaire comme l'exige la règle du contrôle Home Assistant en priorité.

#### Scenario: Bouton d'action
- **WHEN** le dashboard affiche un bouton (créer, annuler, utiliser la suggestion)
- **THEN** il est dessiné avec `ha-button`

#### Scenario: Température de preset
- **WHEN** l'onglet des presets affiche une température
- **THEN** elle est saisie dans une case numérique compacte du tableau, avec l'unité de la température, les limites et le pas de l'entité

#### Scenario: Thème des cases
- **WHEN** l'utilisateur passe en thème sombre ou personnalisé
- **THEN** les cases du tableau prennent les couleurs de fond, de texte, de bordure et de focus du thème
