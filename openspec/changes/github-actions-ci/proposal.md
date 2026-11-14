# Proposal

## Why
Le dépôt n'a pas encore de GitHub Actions. Rien ne vérifie automatiquement qu'un push ou une pull request compile et passe les tests, aucun rapport de couverture n'existe, aucune analyse de sécurité du code ne tourne, et la distribution à HACS reste manuelle.

## What Changes
- Workflow d'intégration continue : tout push de branche et toute pull request déclenche la construction (frontend, SDK, custom component) et les tests (Python et TypeScript).
- Couverture du code : mesure pour Python (`pytest-cov`) et TypeScript (Vitest, V8), rapports publiés en artefacts et résumé dans la page d'exécution.
- Analyse statique de sécurité (SAST) fournie par GitHub : CodeQL pour Python et JavaScript/TypeScript, sur push, pull request et en planification hebdomadaire.
- Workflow de release : un push de tag `v<semver>` valide le tag, relance construction et tests, construit l'archive `zip_release` de HACS et publie une GitHub Release qui la contient. Le format du tag est l'intersection de semver pour Home Assistant et pour NPM, préfixée par `v` (par exemple `v0.1.1`).
- `hacs.json` déclare `zip_release` et le nom de l'archive.
- Validation Home Assistant et HACS dans l'intégration continue : `hassfest` (action officielle de Home Assistant) et la HACS Action, exécutées sur chaque push et pull request, donc aussi avant une release.
- Cohérence de version : la release compare au tag la version du `manifest.json` et celle de chaque `package.json` du monorepo, et échoue si l'une diffère. Le workflow ne modifie aucun fichier de version.
- Tag stable sur `master` : un tag sans suffixe de préversion doit désigner un commit de `master`. Un tag de préversion peut être sur n'importe quelle branche.
- Publication npm de `@vtherm/dashboard-sdk` par trusted publishing (OIDC), après la GitHub Release, sans jeton stocké.
- Vérifications du projet : la CI exécute la commande de vérification locale unique (conventions, documentation) définie par `ui-plugin-dashboard`.
- Mise à jour automatique des actions (Dependabot, écosystème `github-actions`).

## Capabilities

### New Capabilities
- `continuous-integration`: construction et tests déclenchés par tout push et toute pull request, avec réutilisation par le workflow de release.
- `code-coverage`: mesure et publication de la couverture Python et TypeScript.
- `code-scanning`: analyse de sécurité du code par CodeQL.
- `release-packaging`: validation du tag de version, archive `zip_release` pour HACS, GitHub Release et publication npm du SDK.

### Modified Capabilities
<!-- Aucune : `openspec/specs/` est vide. L'exigence "vérifications de conventions en intégration continue" de `code-conventions` (change ui-plugin-dashboard) est satisfaite par le workflow de ce change. -->

## Impact
- Nouveaux fichiers : `.github/workflows/ci.yml`, `.github/workflows/codeql.yml`, `.github/workflows/release.yml`, `.github/dependabot.yml`, `hacs.json`.
- Dépendances de développement : `pytest-cov` dans `requirements-dev.txt`, `@vitest/coverage-v8` dans le workspace npm.
- Chevauchement avec le change `ui-plugin-dashboard` : ses tâches 3.1 et 3.2 mentionnent un workflow d'intégration continue. Ce change livre les workflows ; ces tâches y ajoutent leurs vérifications (conventions, documentation) dans les jobs existants.
- Réglages hors dépôt : activer le code scanning, protéger `master` avec les contrôles requis, et déclarer sur npmjs.com le trusted publisher du package (dépôt `bontiv/vtherm_dashboard`, fichier `release.yml`).
- Dépendances de test : `vtherm_api` est installé depuis son index de paquets, donc les tests ne tournent qu'après sa publication avec le registre des plugins UI.
- Contrôle HACS des marques exclu : l'icône est dans `brand/` et `home-assistant/brands` n'accepte pas les intégrations personnalisées.
- Ce change est appliqué en dernier et prévaut sur `ui-plugin-dashboard` pour tout ce qui concerne les workflows (tâches 3.1, 3.2 et 11.3 de ce dernier : elles ne livrent plus de workflow).
- Hors périmètre : service de couverture externe (Codecov), seuil minimal de couverture.
