# Spec Delta

## Purpose
Publier une version installable par HACS, sous forme d'archive `zip_release`, à partir d'un tag de version.

## ADDED Requirements

### Requirement: Déclenchement par tag de version
Le workflow de release SHALL se déclencher au push d'un tag préfixé par `v` et dont le reste est une version semver acceptée à la fois par Home Assistant et par NPM : trois nombres sans zéro initial, séparés par des points, avec un suffixe de préversion facultatif et sans métadonnées de build.

#### Scenario: Tag valide
- **WHEN** le tag `v0.1.1` ou `v1.0.0-beta.2` est poussé
- **THEN** la release est exécutée

#### Scenario: Tag invalide
- **WHEN** un tag comme `v1.0`, `0.1.1`, `v01.2.3` ou `v1.0.0+build5` est poussé
- **THEN** la validation du tag échoue et aucune release n'est publiée

#### Scenario: Branche
- **WHEN** un commit est poussé sur une branche
- **THEN** la release ne se déclenche pas

### Requirement: Branche du tag
Un tag de version stable (sans suffixe de préversion) SHALL désigner un commit de la branche `master`. Un tag de préversion (avec suffixe) PEUT désigner un commit de n'importe quelle branche. La validation SHALL échouer, sans publication, pour un tag stable dont le commit n'appartient pas à l'historique de `master`.

#### Scenario: Tag stable sur master
- **WHEN** le tag `v0.1.1` est poussé sur un commit de `master`
- **THEN** la validation de la branche réussit

#### Scenario: Tag stable hors master
- **WHEN** le tag `v0.1.1` est poussé sur un commit d'une autre branche, non fusionné dans `master`
- **THEN** la validation échoue avec un message qui nomme la branche attendue, et aucune release n'est publiée

#### Scenario: Préversion sur une autre branche
- **WHEN** le tag `v0.2.0-rc.1` est poussé sur un commit d'une branche de fonctionnalité
- **THEN** la validation de la branche réussit et la release se poursuit

### Requirement: Contrôles avant publication
La release SHALL réussir la construction, les tests, les vérifications, `hassfest` et la HACS Action de l'intégration continue sur le commit du tag avant de créer l'archive et la GitHub Release.

#### Scenario: Tests en échec sur le tag
- **WHEN** un test échoue sur le commit du tag
- **THEN** aucune archive ni GitHub Release n'est créée

### Requirement: Cohérence entre le tag et les versions du dépôt
La release SHALL comparer au tag, privé de son préfixe `v`, la version du `manifest.json` du custom component et celle de chaque `package.json` du monorepo (racine, `packages/sdk`, `frontend`), sur le commit du tag. Elle SHALL échouer avant toute construction si l'une diffère, est absente ou illisible.

#### Scenario: Versions identiques
- **WHEN** le tag `v0.1.1` est poussé et que le manifest et chaque `package.json` indiquent `0.1.1`
- **THEN** la release se poursuit

#### Scenario: Manifest différent
- **WHEN** le tag `v0.1.1` est poussé et le `manifest.json` indique `0.1.0`
- **THEN** la release échoue avec un message qui donne les deux versions, et aucune archive ni GitHub Release n'est créée

#### Scenario: Package différent
- **WHEN** le tag `v0.1.1` est poussé et le `package.json` du SDK indique `0.1.0`
- **THEN** la release échoue en nommant le fichier et les deux versions, sans rien publier

#### Scenario: Version absente ou illisible
- **WHEN** un de ces fichiers n'a pas de champ `version` ou n'est pas un JSON valide
- **THEN** la release échoue avec un message explicite

#### Scenario: Préversion
- **WHEN** le tag `v0.2.0-rc.1` est poussé et que tous ces fichiers indiquent `0.2.0-rc.1`
- **THEN** la release se poursuit

### Requirement: Archive zip_release
La release SHALL produire une archive zip dont la racine est le contenu du custom component, frontend construit inclus, et dont `manifest.json` est celui du dépôt, sans modification.

#### Scenario: Contenu de l'archive
- **WHEN** l'archive est dézippée dans `custom_components/vtherm_dashboard`
- **THEN** l'intégration est complète et fonctionnelle sans étape de build

#### Scenario: Frontend et icône
- **WHEN** l'archive est créée
- **THEN** elle contient le bundle du frontend (`www/`) et les images de l'intégration (`brand/`)

#### Scenario: Fichiers exclus
- **WHEN** l'archive est créée
- **THEN** elle ne contient ni tests, ni sources TypeScript, ni `node_modules`, ni caches Python

### Requirement: Déclaration HACS
Le fichier `hacs.json` SHALL déclarer la distribution par archive (`zip_release`) avec le nom de fichier que la release publie.

#### Scenario: Nom de l'archive
- **WHEN** la release est publiée
- **THEN** l'archive jointe porte exactement le nom déclaré dans `hacs.json`

### Requirement: GitHub Release
La release SHALL créer une GitHub Release associée au tag avec l'archive en pièce jointe, des notes générées automatiquement, et marquée préversion si le tag a un suffixe de préversion.

#### Scenario: Version stable
- **WHEN** le tag `v0.1.1` est publié
- **THEN** une GitHub Release `v0.1.1` non préversion contient l'archive

#### Scenario: Préversion
- **WHEN** le tag `v0.2.0-rc.1` est publié
- **THEN** la GitHub Release est marquée préversion

#### Scenario: Nouvelle exécution
- **WHEN** la release est relancée pour un tag dont la GitHub Release existe
- **THEN** l'archive est remplacée et aucune seconde Release n'est créée

### Requirement: Publication npm du SDK
La release SHALL publier le package `@vtherm/dashboard-sdk` sur npm, après la création de la GitHub Release, par le trusted publishing de npm (identité OIDC du workflow, sans jeton stocké). Un tag de préversion SHALL publier avec l'étiquette de distribution `next`, un tag stable avec `latest`.

#### Scenario: Version stable
- **WHEN** le tag `v0.1.1` est publié et que la GitHub Release existe
- **THEN** `@vtherm/dashboard-sdk@0.1.1` est publié avec l'étiquette `latest`

#### Scenario: Préversion
- **WHEN** le tag `v0.2.0-rc.1` est publié
- **THEN** `@vtherm/dashboard-sdk@0.2.0-rc.1` est publié avec l'étiquette `next` et `latest` ne change pas

#### Scenario: Préversion hors master
- **WHEN** un tag de préversion désigne un commit qui n'est pas dans l'historique de `master`
- **THEN** la publication npm s'exécute en `--dry-run`, vérifie le contenu du package et ne publie rien

#### Scenario: Aucun secret npm
- **WHEN** le dépôt est inspecté
- **THEN** aucun secret ni jeton npm n'est utilisé ou requis par le workflow

#### Scenario: Échec en amont
- **WHEN** la validation, les tests, l'archive ou la GitHub Release échouent
- **THEN** rien n'est publié sur npm

### Requirement: Droit d'écriture limité à la publication
Seul le job de publication SHALL avoir le droit d'écriture sur le contenu du dépôt.

#### Scenario: Jobs de construction et de test
- **WHEN** la release s'exécute
- **THEN** les jobs de construction et de test n'ont qu'un droit de lecture

#### Scenario: Job npm
- **WHEN** le job de publication npm s'exécute
- **THEN** il a le droit de lecture du contenu et `id-token: write`, sans droit d'écriture sur le contenu
