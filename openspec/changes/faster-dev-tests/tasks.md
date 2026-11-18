# Tasks

## 1. Dépendances JavaScript sur des volumes

- [x] 1.1 Ajouter à `.devcontainer/devcontainer.json` les volumes nommés `vtherm-dashboard-node-modules` (sur `${containerWorkspaceFolder}/node_modules`) et `vtherm-dashboard-frontend-node-modules` (sur `${containerWorkspaceFolder}/frontend/node_modules`)
- [x] 1.2 Dans `.devcontainer/post-create.sh`, donner la propriété des deux volumes à `vscode` avant l'installation, et installer avec `npm ci`

## 2. Tests Python

- [x] 2.1 Redéfinir la fixture `enable_event_loop_debug` dans `tests/conftest.py` : mode debug si `CI` est défini ou si `VTHERM_ASYNCIO_DEBUG=1`, sinon désactivé ; test qui vérifie les trois cas
- [x] 2.2 Déclarer le marqueur `vtherm` dans `pyproject.toml` et l'ajouter, par `pytest_collection_modifyitems` dans `tests/conftest.py`, aux tests qui utilisent `real_vtherm` (directement ou par une fixture) ou portent `requires_vtherm` ; vérifier avec `pytest --collect-only -m vtherm` que les fichiers attendus sont marqués et que `pytest -m "not vtherm"` n'en charge aucun
- [x] 2.3 Créer `tests/test_save_command.py` avec un `FakeConfigWriter` (remplace `websocket_api.FlowConfigWriter` par `monkeypatch`) et de fausses entités de pré-réglages (entrée `MockConfigEntry` de Versatile Thermostat, entités `number` du registre avec le marqueur des pré-réglages, états et bornes, faux service `number.set_value`) ; y déplacer les trois tests d'orchestration de `tests/test_presets.py` et garder `test_create_and_read_through_the_commands` sur le vrai Versatile Thermostat
- [x] 2.4 Ajouter `pytest-xdist` à `requirements-dev.txt`, lancer `pytest -n auto` en entier et corriger tout état partagé entre processus ; passer la commande pytest de `.github/workflows/ci.yml` à `pytest -n auto --cov …`

## 3. Tests TypeScript

- [x] 3.1 Dans `scripts/check-doc-completeness.test.ts`, une seule source disque mémorisée pour tout le fichier ; vérifier que les cas qui retirent ou modifient une page passent toujours

## 4. Documentation

- [x] 4.1 `docs/contributing/development-environment.md` : les volumes `node_modules` (reconstruire le conteneur, dossier de l'hôte à supprimer), `pytest -n auto`, `pytest -m "not vtherm"` pour une itération rapide et la suite complète avant un commit, `VTHERM_ASYNCIO_DEBUG=1`, et la raison de ces réglages (montage de l'hôte) ; `CHANGELOG.md`, section « For contributors »

## 5. Vérification

- [x] 5.1 `npm run check`, `npm test`, `npm run test:docs` et `pytest -n auto`, chaque commande avec un délai maximal (`timeout`) ; noter les durées avant et après dans le compte rendu — avant la reconstruction du conteneur : `npm run check` passe ; pytest 297 tests en 19 à 22 s (194 s avant), 40 s avec le mode debug comme en CI ; `check-doc-completeness.test.ts` 0,17 s (28,7 s avant) ; `npm test` reste à environ 80 s tant que `node_modules` est sur le montage de l'hôte, avec `complements-sanitize` qui ne démarre pas et `native-docs` dont le `beforeAll` dépasse 10 s sous charge (passe seul et dans `npm run test:docs`), et un échec de `complements-docs.test.ts` qui vient des modifications en cours du change `improve-complements-ux`
- [ ] 5.2 Après la reconstruction du devcontainer par l'utilisateur : `node_modules` sur les volumes (`mount`), durée de `npm test`, `complements-sanitize.test.ts` qui démarre dans le pool par défaut, serveur Vite et HA de développement toujours fonctionnels (`start-ha.sh --dev-frontend`)

## Workflow follow-up

- Commit, archivage du change avec synchronisation des specs, push.
