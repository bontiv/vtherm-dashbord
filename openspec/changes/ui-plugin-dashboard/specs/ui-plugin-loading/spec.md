# Spec Delta

## Purpose

Définir comment le dashboard charge les plugins UI dans un ordre déduit de dépendances déclaratives, sans numéro de priorité, et comment il réagit aux erreurs de chargement.

## ADDED Requirements

### Requirement: Plugin UI du cœur
Le dashboard SHALL fournir un plugin UI d'identifiant `core`, toujours présent et chargé en premier. Les autres plugins peuvent le référencer dans leurs dépendances.

#### Scenario: Dépendance au cœur
- **WHEN** un plugin déclare `requires: ["core"]`
- **THEN** la dépendance est satisfaite

### Requirement: Ordre de chargement déclaratif
Le dashboard SHALL charger les plugins UI dans un ordre qui respecte `requires`, `load_after` et `load_before`. Un plugin n'est exécuté qu'après les plugins dont il dépend.

#### Scenario: load_after
- **WHEN** le plugin B déclare `load_after: ["A"]` et que A est présent
- **THEN** A est chargé avant B

#### Scenario: load_before
- **WHEN** le plugin B déclare `load_before: ["A"]` et que A est présent
- **THEN** B est chargé avant A

#### Scenario: Ordre souple avec cible absente
- **WHEN** un plugin déclare `load_after` ou `load_before` vers un plugin absent
- **THEN** la déclaration est ignorée et le plugin est chargé

#### Scenario: Ordre déterministe
- **WHEN** deux plugins n'ont aucune contrainte entre eux
- **THEN** leur ordre relatif est identique à chaque chargement

### Requirement: Dépendance obligatoire manquante
Si un plugin déclare `requires` vers un plugin absent ou en échec, le dashboard SHALL ne pas appliquer ses contributions et SHALL signaler l'état "dépendance manquante" avec l'identifiant manquant.

#### Scenario: Plugin requis absent
- **WHEN** le plugin B déclare `requires: ["A"]` et que A n'est pas enregistré
- **THEN** B n'est pas chargé et le dashboard indique que A est manquant

#### Scenario: Propagation
- **WHEN** C requiert B et que B est en état "dépendance manquante"
- **THEN** C est aussi en état "dépendance manquante"

### Requirement: Détection des cycles
Si les dépendances de chargement forment un cycle, le dashboard SHALL exclure les plugins du cycle, signaler l'erreur avec la liste de ces plugins, et SHALL continuer à charger les autres.

#### Scenario: Cycle entre deux plugins
- **WHEN** A déclare `load_after: ["B"]` et B déclare `load_after: ["A"]`
- **THEN** A et B ne sont pas chargés, l'erreur de cycle est affichée et les autres plugins sont chargés

### Requirement: Isolation des échecs
Une erreur de téléchargement ou d'exécution du module JS d'un plugin SHALL ne pas empêcher le chargement des autres plugins ni l'affichage du dashboard.

#### Scenario: Module introuvable
- **WHEN** le `js_url` d'un plugin répond avec une erreur
- **THEN** le plugin est marqué en échec avec la raison, et les plugins qui le requièrent passent en "dépendance manquante"

### Requirement: Visibilité de l'état des plugins
Le dashboard SHALL permettre à l'utilisateur de consulter, pour chaque plugin UI, son état (chargé, dépendance manquante, cycle, échec) et le motif.

#### Scenario: Consultation
- **WHEN** l'utilisateur ouvre la vue d'état des plugins
- **THEN** chaque plugin enregistré est listé avec son état
