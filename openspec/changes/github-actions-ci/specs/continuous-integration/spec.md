# Spec Delta

## Purpose
Vérifier automatiquement que chaque modification du dépôt se construit et passe ses tests, avant fusion et avant release.

## ADDED Requirements

### Requirement: Déclenchement sur push et pull request
Le workflow d'intégration continue SHALL s'exécuter pour tout push de branche et pour toute pull request, quelle que soit la branche cible.

#### Scenario: Push sur une branche
- **WHEN** un commit est poussé sur une branche
- **THEN** le workflow construit et teste le projet

#### Scenario: Pull request
- **WHEN** une pull request est ouverte ou mise à jour
- **THEN** le workflow s'exécute sur le résultat de la fusion proposée et son statut est visible sur la pull request

#### Scenario: Exécutions obsolètes
- **WHEN** un nouveau commit est poussé sur une référence dont l'exécution précédente est en cours
- **THEN** l'exécution précédente est annulée

### Requirement: Construction
Le workflow SHALL construire le frontend, le SDK et le custom component à partir d'une installation propre des dépendances, avec les versions de Python et de Node.js du projet.

#### Scenario: Construction réussie
- **WHEN** le code se compile
- **THEN** le job de construction réussit

#### Scenario: Erreur de compilation
- **WHEN** une erreur de type TypeScript ou de syntaxe Python est introduite
- **THEN** le workflow échoue

### Requirement: Tests
Le workflow SHALL exécuter les tests Python (pytest) et TypeScript (Vitest) et échouer si l'un d'eux échoue.

#### Scenario: Test en échec
- **WHEN** un test Python ou TypeScript échoue
- **THEN** le workflow échoue et la pull request est marquée en échec

#### Scenario: Tests réussis
- **WHEN** tous les tests passent
- **THEN** le workflow réussit

### Requirement: Validation hassfest
Le workflow SHALL exécuter `hassfest` sur le custom component et échouer si `hassfest` signale une erreur.

#### Scenario: Manifest invalide
- **WHEN** le `manifest.json` ne respecte pas les règles de Home Assistant (clé manquante, domaine incohérent)
- **THEN** le job `hassfest` échoue et le workflow échoue

#### Scenario: Intégration conforme
- **WHEN** l'intégration respecte les règles de Home Assistant
- **THEN** le job `hassfest` réussit

### Requirement: Validation HACS
Le workflow SHALL exécuter la HACS Action pour la catégorie `integration` et échouer si elle signale une erreur.

#### Scenario: Dépôt non conforme à HACS
- **WHEN** `hacs.json` est invalide ou la structure du dépôt ne respecte pas les règles de HACS
- **THEN** le job `hacs` échoue et le workflow échoue

#### Scenario: Dépôt conforme
- **WHEN** le dépôt respecte les règles de HACS
- **THEN** le job `hacs` réussit

#### Scenario: Contrôle dépendant des réglages GitHub
- **WHEN** la HACS Action échoue sur un contrôle qui dépend des réglages du dépôt (description, topics, issues activées)
- **THEN** le message indique le contrôle en cause, et toute exclusion de ce contrôle est déclarée dans le workflow avec sa justification

### Requirement: Marque fournie par l'intégration
Le contrôle HACS du dépôt `home-assistant/brands` SHALL être exclu de la HACS Action, car l'icône de l'intégration est fournie dans son dossier `brand/` et ce dépôt n'accepte pas les intégrations personnalisées. Aucun autre contrôle HACS ne SHALL être exclu sans justification dans le workflow.

#### Scenario: Intégration absente du dépôt de marques
- **WHEN** la HACS Action s'exécute sur l'intégration, absente du dépôt `home-assistant/brands`
- **THEN** le job `hacs` n'échoue pas à cause de la marque

#### Scenario: Autre contrôle en échec
- **WHEN** un autre contrôle de la HACS Action échoue
- **THEN** le job échoue

### Requirement: Vérifications du projet
Le workflow SHALL exécuter la commande de vérification locale unique du projet (conventions Python et TypeScript, documentation) et échouer si elle échoue, de sorte que la CI et le poste de développement appliquent les mêmes contrôles.

#### Scenario: Convention violée
- **WHEN** une demande de fusion contient un fichier `.js` non autorisé, un `any` explicite ou une page de documentation non indexée
- **THEN** le workflow échoue

### Requirement: Dépendances externes des tests
Le workflow SHALL installer `vtherm_api` depuis son index de paquets, et obtenir les dépôts Versatile Thermostat et HACS nécessaires aux tests d'intégration à des références fixées dans un fichier versionné du dépôt.

#### Scenario: Références fixées
- **WHEN** le workflow s'exécute deux fois sur le même commit
- **THEN** il teste contre les mêmes versions de Versatile Thermostat et de HACS

### Requirement: Droits minimaux et code non fiable
Le workflow SHALL s'exécuter avec le droit de lecture du contenu uniquement et SHALL NOT donner accès aux secrets du dépôt au code d'une pull request issue d'un fork.

#### Scenario: Pull request depuis un fork
- **WHEN** une pull request provient d'un fork
- **THEN** le workflow s'exécute sans secret et avec un jeton en lecture seule

### Requirement: Réutilisation par la release
Le workflow SHALL pouvoir être appelé par un autre workflow pour que la release exécute exactement les mêmes construction et tests.

#### Scenario: Appel depuis la release
- **WHEN** le workflow de release appelle le workflow d'intégration continue
- **THEN** les mêmes jobs de construction et de test s'exécutent et leur échec bloque la release
