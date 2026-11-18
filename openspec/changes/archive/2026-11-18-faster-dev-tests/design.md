# Design

## Context
- `.devcontainer/devcontainer.json` monte le dépôt depuis `C:\VS-Projects\vtherm_dashboard` (montage par défaut de VS Code, en 9p sous Docker Desktop/WSL), et `external/versatile_thermostat` et `external/vtherm_api` par deux montages `bind`. `post-create.sh` lance `npm install` à la racine : `node_modules` (13 319 fichiers, 262 Mo) et `frontend/node_modules` sont donc sur ce montage.
- Mesures (proposal) : happy-dom se charge en 14,5 à 17 s depuis le montage, en 0,2 s depuis le disque du conteneur ; vitest annonce environ 16 s de démarrage par fichier de test (0,44 s sur le disque du conteneur).
- `pytest_homeassistant_custom_component.plugins` déclare la fixture autouse `enable_event_loop_debug`, qui appelle `set_debug(True)`. En mode debug, `asyncio` appelle `traceback.extract_stack` à chaque future et chaque tâche ; `linecache.checkcache` fait alors un `stat` par fichier de la pile.
- `websocket_api.py` crée `FlowConfigWriter(hass)` à chaque commande d'écriture ; `ConfigWriter` est la classe abstraite. `presets.py` trouve les entités de pré-réglages dans le registre des entités (plateforme `versatile_thermostat`, domaine `number`, `unique_id` qui contient le marqueur des pré-réglages) et les modifie par le service `number.set_value`.
- `pytest-xdist` est déjà installé, comme dépendance de `pytest-homeassistant-custom-component`. GitHub Actions définit `CI=true`.

## Goals / Non-Goals

**Goals:**
- Diviser par plus de cinq le temps des suites dans le devcontainer, sans changer ce qu'elles vérifient en intégration continue.
- Garder les sources sur l'hôte : l'éditeur, les outils Windows et l'assistant lisent les mêmes fichiers.

**Non-Goals:**
- Déplacer tout le dépôt dans un volume du conteneur : les sources ne seraient plus lisibles depuis Windows.
- Passer vitest en `isolate: false` : plusieurs tests réenregistrent des éléments personnalisés et rechargent les modules (`vi.resetModules`) ; une fois `node_modules` déplacé, le gain annoncé (environ 22 s) ne vaut plus ce risque.
- Remplacer par des faux les tests qui vérifient le comportement de Versatile Thermostat.

## Decisions

### 1. `node_modules` sur des volumes nommés
`devcontainer.json` ajoute deux montages `type=volume` : `vtherm-dashboard-node-modules` sur `${containerWorkspaceFolder}/node_modules` et `vtherm-dashboard-frontend-node-modules` sur `${containerWorkspaceFolder}/frontend/node_modules`. Un volume neuf appartient à `root` : `post-create.sh` en donne la propriété à `vscode` (`sudo chown`) avant `npm ci`. Le serveur Vite du mode développement en profite aussi.
- *Alternative écartée* : un seul volume pour tout le dépôt (option « Clone Repository in Container Volume »). Plus rapide encore pour pytest, mais les sources quitteraient l'hôte.
- Le dossier `node_modules` de l'hôte reste, masqué dans le conteneur : la documentation dit qu'on peut le supprimer côté Windows.

### 2. Le mode debug d'asyncio selon l'environnement
`tests/conftest.py` redéfinit la fixture `enable_event_loop_debug` (même nom : la fixture du `conftest.py` prend le pas sur celle du plugin) : `set_debug(True)` si `CI` est défini ou si `VTHERM_ASYNCIO_DEBUG=1`, sinon `set_debug(False)`.
- *Pourquoi* : le mode debug reste utile (rappels lents, coroutines jamais attendues, appels depuis un autre thread) ; l'intégration continue le garde, un développeur peut l'activer d'une variable.
- *Alternative écartée* : le couper partout. La CI perdrait ces vérifications pour un gain qu'elle n'a presque pas (disques natifs).

### 3. pytest en parallèle, sans `addopts`
L'intégration continue lance `pytest -n auto` (avec `--cov`, compatible avec xdist) ; la documentation recommande `pytest -n auto` pour toute la suite. `-n auto` n'est pas dans `addopts` : lancer un seul fichier ou un seul test démarrerait sinon un processus par cœur. `pytest-xdist` est ajouté explicitement à `requirements-dev.txt`. Les tests qui écrivent dans le dépôt (`--update-schemas`, `--update-hacs-answers`) ne le font que sur demande ; une exécution parallèle complète vérifie qu'aucun autre test ne partage d'état.

### 4. Le marqueur `vtherm` posé par le `conftest.py`
`pyproject.toml` déclare le marqueur `vtherm`. Un hook `pytest_collection_modifyitems` de `tests/conftest.py` l'ajoute à chaque test qui utilise, directement ou par une autre fixture, la fixture `real_vtherm`, ou qui porte le `skipif` `requires_vtherm` (tests qui importent le code de Versatile Thermostat, comme la dérive des schémas). Les fichiers de test n'ont rien à déclarer, et un nouveau test qui charge Versatile Thermostat est marqué de lui-même.

### 5. Un faux `ConfigWriter` pour l'orchestration de `save_config`
Un nouveau fichier `tests/test_save_command.py` remplace `websocket_api.FlowConfigWriter` par un `FakeConfigWriter` (`monkeypatch`), dont le résultat est fixé par le test, et enregistre de fausses entités de pré-réglages : une entrée `MockConfigEntry` du domaine de Versatile Thermostat, des entités `number` de cette plateforme dans le registre avec le marqueur des pré-réglages, leurs états et attributs (min, max), et un faux service `number.set_value` qui enregistre les appels. Les trois tests d'orchestration de `test_presets.py` y passent ; `test_create_and_read_through_the_commands` reste sur le vrai Versatile Thermostat comme test de bout en bout.
- *Alternative écartée* : un point d'injection du writer dans le code de production. Le `monkeypatch` suffit aux tests et ne change pas l'intégration.

### 6. Une source disque mémorisée dans `check-doc-completeness.test.ts`
Le test enveloppe `diskSource(ROOT)` dans une source qui garde chaque lecture dans une `Map` pour tout le fichier de test ; les cas qui modifient un fichier passent toujours par leurs `changes`. Le script lui-même ne change pas : son exécution lit chaque page une fois.

## Risks / Trade-offs
- [Il faut reconstruire le devcontainer] → La documentation et le CHANGELOG le disent ; tant que le conteneur n'est pas reconstruit, rien ne casse, les tests restent juste lents.
- [Un problème que seul le mode debug révèle passe en local] → L'intégration continue garde le mode debug ; `VTHERM_ASYNCIO_DEBUG=1 pytest` le reproduit.
- [Le faux `ConfigWriter` s'écarte du vrai] → Il ne remplace que le résultat de l'écriture ; le contrat de `ConfigWriter` est la classe abstraite, et les tests du vrai writer restent marqués `vtherm`.
- [Un test exclu par `-m "not vtherm"` casse sans qu'on le voie en local] → L'intégration continue exécute toujours la suite complète ; la documentation recommande la suite complète avant un commit.
- [Le gain de vitest dépend du poste] → Le scénario de la spec cite le poste de développement de référence ; la vérification compare avant et après sur le même poste.
