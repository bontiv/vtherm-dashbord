# Spec Delta

## Purpose

Définir comment le dashboard charge les plugins UI dans un ordre déduit de dépendances déclaratives, sans numéro de priorité, et comment il réagit aux erreurs de chargement.

## ADDED Requirements

### Requirement: Plugin UI du cœur
L'extension SHALL enregistrer côté Python, avec les autres plugins natifs, un plugin UI d'identifiant `core`, toujours présent et chargé en premier. Les autres plugins peuvent le référencer dans leurs dépendances.

#### Scenario: Dépendance au cœur
- **WHEN** un plugin déclare `requires: ["core"]`
- **THEN** la dépendance est satisfaite

#### Scenario: Cœur enregistré en Python
- **WHEN** l'extension démarre
- **THEN** `core` figure parmi les plugins enregistrés dans `vtherm_api` et en tête de la liste de chargement

### Requirement: Liste de chargement construite par le serveur
À chaque appel de la commande WebSocket, l'extension SHALL construire la liste ordonnée des plugins avec état, motif et rang, en appliquant la validation, la compatibilité de version, les dépendances et la détection des cycles. Le frontend SHALL importer les modules dans l'ordre reçu et ne SHALL pas recalculer cet ordre.

#### Scenario: Ordre reçu suivi
- **WHEN** le serveur retourne les plugins A, B puis C à charger
- **THEN** le frontend importe leurs modules dans cet ordre

#### Scenario: Plugin exclu par le serveur
- **WHEN** le serveur marque un plugin "dashboard incompatible", "cycle" ou "invalide"
- **THEN** le frontend ne télécharge pas son module

#### Scenario: Échec à l'exécution
- **WHEN** le module de A échoue à l'import et que B requiert A
- **THEN** le frontend n'importe pas B, qui passe en "dépendance manquante"

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

### Requirement: Compatibilité avec la version du dashboard
Le dashboard SHALL évaluer la contrainte `dashboard_version` de chaque plugin avant de télécharger son module. Un plugin dont la contrainte n'est pas satisfaite par la version du dashboard SHALL ne pas être chargé et SHALL passer à l'état "dashboard incompatible", avec la contrainte déclarée, la version courante et le motif (dashboard trop ancien ou trop récent). Les plugins qui le requièrent passent en "dépendance manquante".

#### Scenario: Dashboard trop ancien
- **WHEN** un plugin déclare `>=2.0` et que le dashboard est en `1.4.0`
- **THEN** le module du plugin n'est pas téléchargé et l'état indique la contrainte `>=2.0`, la version `1.4.0` et le motif "dashboard trop ancien"

#### Scenario: Dashboard trop récent
- **WHEN** un plugin déclare `>=1.0,<2.0` et que le dashboard est en `2.1.0`
- **THEN** le module du plugin n'est pas téléchargé et l'état indique le motif "dashboard trop récent"

#### Scenario: Contrainte satisfaite
- **WHEN** un plugin déclare `>=1.2,<2.0` et que le dashboard est en `1.4.0`
- **THEN** le plugin est chargé normalement

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
Le dashboard SHALL permettre à l'utilisateur de consulter, pour chaque plugin UI, son état (chargé, dépendance manquante, dashboard incompatible, cycle, invalide, échec), le motif et sa source (installé, ou en développement avec l'URL utilisée).

#### Scenario: Consultation
- **WHEN** l'utilisateur ouvre la vue d'état des plugins
- **THEN** chaque plugin enregistré est listé avec son état
