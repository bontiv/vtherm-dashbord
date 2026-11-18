# Proposal

## Why
Dans le devcontainer, les tests sont très lents. Mesures du 18/11/2026 :

| Mesure | Aujourd'hui | Sur le disque du conteneur, ou avec la correction |
|---|---|---|
| Suite vitest (1 052 tests) | 72 s | 8 s |
| Chargement de happy-dom | 14,5 à 17 s | 0,2 s |
| `test_config_flow_driver.py` + `test_presets.py` (42 tests) | 166 s | 14 s sans le mode debug d'asyncio |
| `scripts/check-doc-completeness.test.ts` | 28,7 s | lectures en double à supprimer |

Le dépôt, `node_modules` compris, est monté depuis le disque Windows (`C:\` en 9p, drvfs), comme `external/versatile_thermostat` et `external/vtherm_api` : chaque accès à un fichier traverse le pont Windows-Linux. Côté Python, le plugin de test de Home Assistant active le mode debug d'asyncio (`enable_event_loop_debug`, autouse) : chaque future enregistre sa pile d'appels, ce qui vérifie chaque fichier de la pile sur ce montage (22 000 `stat` pour le test le plus lent). L'échec de démarrage de `complements-sanitize.test.ts` dans le pool par défaut disparaît sur le disque du conteneur.

## What Changes
- `node_modules` (racine et `frontend/`) est sur des volumes Docker du devcontainer ; les sources restent sur `C:\`, lisibles depuis Windows.
- Le mode debug d'asyncio des tests Python est actif en intégration continue et sur demande (variable d'environnement), inactif par défaut dans le devcontainer.
- pytest s'exécute en parallèle (`-n auto`), en local et en intégration continue ; les tests n'ont pas d'état partagé entre processus.
- Les tests qui lancent le vrai Versatile Thermostat portent le marqueur `vtherm` : on peut les exclure en local (`-m "not vtherm"`), l'intégration continue les exécute toujours.
- Les tests de l'enchaînement « configuration puis pré-réglages » de la commande `save_config` utilisent un faux `ConfigWriter` et de fausses entités de pré-réglages ; les tests du comportement de Versatile Thermostat restent sur le vrai.
- `check-doc-completeness.test.ts` lit chaque fichier du dépôt une seule fois.
- La documentation des contributeurs décrit ces réglages et les commandes rapides.

## Capabilities

### New Capabilities
- `test-execution`: comment les tests du dépôt s'exécutent dans le devcontainer et en intégration continue : emplacement des dépendances, mode debug d'asyncio, parallélisme, marquage des tests de contrat avec Versatile Thermostat, tests d'orchestration sans Versatile Thermostat.

### Modified Capabilities
<!-- Aucune : le comportement du dashboard ne change pas. -->

## Impact
- Devcontainer : `.devcontainer/devcontainer.json` (volumes `node_modules`), `.devcontainer/post-create.sh` (propriétaire des volumes, `npm ci`). Il faut reconstruire le conteneur.
- Python : `tests/conftest.py` (fixture de debug, marqueur), `pyproject.toml` (marqueur déclaré), `requirements-dev.txt` (`pytest-xdist` explicite), nouveau fichier de tests d'orchestration, `tests/test_presets.py` allégé.
- CI : `.github/workflows/ci.yml` (`-n auto`, `CI` déjà défini par GitHub Actions).
- TypeScript : `scripts/check-doc-completeness.test.ts`.
- Documentation : `docs/contributing/development-environment.md`, `CHANGELOG.md` (« For contributors »).
- Aucun changement du code du dashboard, du SDK ni de l'intégration.
