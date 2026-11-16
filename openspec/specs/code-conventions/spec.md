# code-conventions Specification

## Purpose
Fixer les conventions de code du projet (TypeScript pour tout le code destiné au navigateur, Python aligné sur Versatile Thermostat) et les faire vérifier automatiquement, afin que le code reste homogène et compatible avec les contributions amont.

## Requirements

### Requirement: Langue du code et de la documentation
Tout en-tête de fichier, commentaire, docstring, commentaire de documentation, message de commit et page de documentation SHALL être rédigé exclusivement en anglais. Les textes affichés à l'utilisateur du dashboard sont des chaînes de produit, pas de la documentation : ils SHALL passer par les catalogues de traduction (spec `internationalization` : anglais, français et allemand pour les plugins natifs).

#### Scenario: Commentaire en français
- **WHEN** un commentaire, un en-tête ou une docstring est rédigé en français
- **THEN** la revue le refuse, conformément à la case du modèle de demande de fusion

#### Scenario: Chaîne affichée à l'utilisateur
- **WHEN** un libellé du dashboard doit exister en français
- **THEN** il est ajouté au fichier de traduction français et non dans le code

#### Scenario: Aucune détection automatique
- **WHEN** l'intégration continue s'exécute
- **THEN** elle n'effectue pas de détection automatique de langue, la conformité étant assurée par la revue et le modèle de demande de fusion

### Requirement: Code source en TypeScript
Le code du projet qui s'exécute dans le navigateur ou dans Node (dashboard, SDK, plugins natifs, plugin d'exemple, tests, scripts de vérification, configurations d'outils) SHALL être écrit en TypeScript. Les fichiers `.js`, `.mjs` et `.cjs` ne SHALL pas figurer dans les sources, hors fichiers générés et exceptions listées explicitement.

#### Scenario: Fichier JavaScript ajouté
- **WHEN** un fichier `.js` hors liste d'exceptions est ajouté aux sources
- **THEN** la vérification des conventions échoue en nommant le fichier

#### Scenario: Exception documentée
- **WHEN** un outil n'accepte qu'un fichier de configuration JavaScript
- **THEN** le fichier est autorisé uniquement s'il figure dans la liste d'exceptions avec sa justification

#### Scenario: Sortie de build
- **WHEN** le build produit un module JavaScript
- **THEN** ce fichier généré n'est pas versionné comme source

### Requirement: Typage strict
Le compilateur TypeScript SHALL être configuré en mode strict, sans compilation de fichiers JavaScript. L'usage explicite de `any` SHALL être refusé par l'analyse statique, sauf exception commentée et justifiée.

#### Scenario: Type any explicite
- **WHEN** un `any` explicite est ajouté sans exception justifiée
- **THEN** l'analyse statique échoue

#### Scenario: Erreur de type
- **WHEN** le code contient une erreur de type
- **THEN** la compilation échoue

### Requirement: Formatage Python aligné sur Versatile Thermostat
Le code Python SHALL être formaté avec Black avec une longueur de ligne de 180 et analysé par pylint avec une longueur de ligne maximale de 180, comme dans Versatile Thermostat. Les fins de ligne SHALL être LF et l'indentation de 4 espaces.

#### Scenario: Code non formaté
- **WHEN** un fichier Python n'est pas formaté selon Black avec 180 colonnes
- **THEN** la vérification de formatage échoue en nommant le fichier

#### Scenario: Ligne trop longue
- **WHEN** une ligne Python dépasse 180 caractères
- **THEN** pylint signale l'erreur

#### Scenario: Fin de ligne
- **WHEN** un fichier du dépôt contient des fins de ligne CRLF
- **THEN** le dépôt les normalise en LF

### Requirement: Principes de code Python de Versatile Thermostat
Le code Python SHALL utiliser des annotations de type, des docstrings pour les modules, classes et fonctions publiques, et un logger de module au lieu de `print`. Les tests Python SHALL utiliser pytest avec le mode asynchrone automatique.

#### Scenario: Fonction publique sans docstring
- **WHEN** une fonction publique n'a pas de docstring
- **THEN** pylint signale l'absence

#### Scenario: Test asynchrone
- **WHEN** un test Python est une coroutine
- **THEN** il s'exécute sans décorateur supplémentaire

### Requirement: Vérification automatique des conventions
L'intégration continue SHALL exécuter les vérifications de conventions (Black, pylint, compilation TypeScript stricte, analyse statique, absence de JavaScript dans les sources) et échouer si l'une d'elles échoue. Une commande locale unique SHALL exécuter les mêmes vérifications.

#### Scenario: Demande de fusion
- **WHEN** une demande de fusion contient une violation de convention
- **THEN** l'intégration continue échoue

#### Scenario: Commande locale
- **WHEN** un contributeur exécute la commande de vérification locale
- **THEN** elle exécute les mêmes contrôles que l'intégration continue

### Requirement: Contrôle Home Assistant en priorité
Tout code d'interface du projet (dashboard, plugins natifs, plugin d'exemple) SHALL utiliser le composant Home Assistant équivalent quand il existe, avant tout contrôle HTML générique ou composant écrit pour le projet. Un contrôle générique SHALL être justifié par un commentaire qui nomme le composant Home Assistant écarté et la raison.

#### Scenario: Contrôle générique sans justification
- **WHEN** une revue trouve un `textarea`, un `select`, un `input` ou un `button` sans équivalent Home Assistant justifié par un commentaire
- **THEN** la revue le refuse, conformément à la case du modèle de demande de fusion

#### Scenario: Exception justifiée
- **WHEN** aucun composant Home Assistant ne convient (par exemple, repli quand le composant est absent)
- **THEN** le contrôle générique est accepté avec un commentaire qui nomme le composant écarté
