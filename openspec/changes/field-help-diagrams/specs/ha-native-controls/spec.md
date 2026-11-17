# Spec Delta

## MODIFIED Requirements

### Requirement: Accessibilité, thème et traductions des contrôles
Chaque contrôle SHALL avoir un libellé, un texte d'aide et un message d'erreur traduits par le catalogue du plugin, passés au composant Home Assistant (`label`, `helper`, `error`). Le texte d'aide passé en `helper` SHALL être l'indication courte du champ (`hint.<clé>`), ou à défaut l'aide `help.<clé>`. Les contrôles SHALL suivre le thème de Home Assistant, sans styles qui en contournent l'apparence.

#### Scenario: Libellé et aide
- **WHEN** un champ a une clé `field.<clé>` et `help.<clé>` dans le catalogue, sans `hint.<clé>`
- **THEN** le composant affiche ce libellé et cette aide dans la langue de l'utilisateur

#### Scenario: Indication courte prioritaire
- **WHEN** un champ a à la fois `hint.<clé>` et `help.<clé>` dans le catalogue
- **THEN** le composant reçoit `hint.<clé>` en `helper`, et `help.<clé>` reste accessible par le panneau d'aide du champ

#### Scenario: Thème sombre
- **WHEN** l'utilisateur utilise un thème sombre ou personnalisé
- **THEN** les contrôles prennent les couleurs du thème sans règle CSS propre au dashboard

## ADDED Requirements

### Requirement: Bouton d'aide d'un champ
Le bouton (i) qui ouvre l'aide détaillée d'un champ SHALL être un bouton d'icône de Home Assistant, avec un libellé accessible traduit qui nomme le champ, et SHALL respecter la cible tactile minimale des contrôles sur écran étroit.

#### Scenario: Libellé accessible
- **WHEN** un lecteur d'écran atteint le bouton (i) du champ « Durée de cycle »
- **THEN** il annonce un libellé du type « Aide : Durée de cycle » et l'état ouvert ou fermé du panneau

#### Scenario: Repli
- **WHEN** le bouton d'icône de Home Assistant est indisponible
- **THEN** le bouton se replie sur un bouton HTML équivalent, avec le même libellé et le même comportement
