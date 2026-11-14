# Spec Delta

## Purpose
Mesurer et rendre visible la part du code exercée par les tests, pour Python et pour TypeScript.

## ADDED Requirements

### Requirement: Mesure de la couverture
Le workflow d'intégration continue SHALL mesurer la couverture des tests Python et TypeScript du code du projet, tests et code généré exclus.

#### Scenario: Exécution des tests
- **WHEN** les tests s'exécutent dans l'intégration continue
- **THEN** un rapport de couverture est produit pour Python et un autre pour TypeScript

#### Scenario: Fichier de test
- **WHEN** la couverture est calculée
- **THEN** les fichiers de test et les sorties de build n'y figurent pas

### Requirement: Publication des rapports
Le workflow SHALL publier les rapports de couverture comme artefacts de l'exécution et afficher le pourcentage global de chaque langage dans le résumé de l'exécution.

#### Scenario: Consultation
- **WHEN** une exécution se termine
- **THEN** les rapports (HTML et machine-lisible) sont téléchargeables et le résumé indique les pourcentages

#### Scenario: Tests en échec
- **WHEN** des tests échouent
- **THEN** les rapports disponibles sont quand même publiés

### Requirement: Absence de seuil bloquant
Le workflow SHALL NOT échouer à cause d'un pourcentage de couverture, tant qu'aucun seuil n'est configuré explicitement.

#### Scenario: Couverture basse
- **WHEN** la couverture est faible et tous les tests passent
- **THEN** le workflow réussit
