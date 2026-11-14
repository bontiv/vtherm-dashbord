# Spec Delta

## Purpose
Détecter les failles de sécurité dans le code Python et TypeScript par les outils d'analyse statique (SAST) de GitHub.

## ADDED Requirements

### Requirement: Analyse CodeQL du code du projet
Un workflow SHALL analyser avec CodeQL le code Python et le code JavaScript/TypeScript, sur chaque push, chaque pull request et selon une planification hebdomadaire.

#### Scenario: Pull request
- **WHEN** une pull request est ouverte ou mise à jour
- **THEN** CodeQL analyse les deux langages et publie les alertes sur la pull request

#### Scenario: Planification
- **WHEN** la planification hebdomadaire se déclenche
- **THEN** CodeQL analyse la branche par défaut, ce qui détecte les alertes dues à de nouvelles requêtes

#### Scenario: Langages indépendants
- **WHEN** l'analyse d'un langage échoue
- **THEN** l'analyse de l'autre langage se poursuit

### Requirement: Résultats dans l'onglet Security
Le workflow SHALL envoyer les résultats au code scanning de GitHub.

#### Scenario: Alerte détectée
- **WHEN** CodeQL détecte une vulnérabilité
- **THEN** une alerte apparaît dans l'onglet Security du dépôt

### Requirement: Droits limités du workflow d'analyse
Le workflow SHALL demander seulement les droits de lecture du contenu et d'écriture des événements de sécurité.

#### Scenario: Jeton du workflow
- **WHEN** le workflow s'exécute
- **THEN** son jeton n'a ni droit d'écriture sur le contenu ni droit sur les releases
