# Tasks

Ce change s'applique après `ui-plugin-dashboard` et ne modifie pas ses exigences. Le code Python suit Black (180 colonnes) et pylint ; le code frontend, scripts et tests est en TypeScript ; fichiers, commentaires, docstrings et documentation sont en anglais.

## 1. Mode frontend de développement dans l'intégration (Python)
- [x] 1.1 Ajouter dans `const.py` le nom de la variable `VTHERM_DASHBOARD_DEV_SERVER` et, dans `dev_server.py`, une fonction qui lit `os.environ`, renvoie l'URL sans `/` final quand elle est absolue `http`/`https`, renvoie `None` quand elle est absente ou vide, et écrit une erreur citant la valeur quand elle est invalide ; vérifier par des tests unitaires dans `tests/test_panel.py` (absente, vide, `http://localhost:5198/`, `localhost:5198`, `javascript:alert(1)`)
- [x] 1.2 Dans `panel.py`, en mode actif : ne pas contrôler `www/`, ne pas enregistrer `/vtherm_dashboard_static`, enregistrer le panneau avec `module_url=<dev>/src/index.ts` (même titre, icône, élément, `require_admin`), et écrire l'avertissement avec l'URL ; vérifier par des tests (`monkeypatch.setenv`) que l'entrée se charge sans `www/`, que `module_url` désigne le serveur, que le panneau reste réservé aux administrateurs, que l'avertissement est journalisé, et que le test existant « module manquant ⇒ erreur » passe toujours sans la variable
- [x] 1.3 Dans `native_plugins.py`, faire renvoyer à `native_js_url()` `<dev>/src/native/plugins/<id>.ts` en mode actif, sans changer contrainte, `requires` ni `load_after` ; vérifier dans `tests/test_native_plugins.py` que les URLs changent en mode actif, que les autres champs sont identiques, et que chaque `<id>` de `NATIVE_PLUGIN_ORDER` a bien un fichier `frontend/src/native/plugins/<id>.ts`
- [x] 1.4 Vérifier que `pytest` et `npm run check:python` passent
- [x] 1.5 Documenter la variable dans `docs/contributing/development-environment.md` (section « Run Home Assistant » : deux façons de lancer, build ou serveur de développement) et, si elle décrit la source du module du panneau, `docs/contributing/architecture.md` ; vérifier avec `npm run check:docs` et `npm run check:completeness`

## 2. Serveur de développement du frontend (TypeScript)
- [x] 2.1 Ajouter à `frontend/vite.config.ts` la section `server` (port 5198, `strictPort`, CORS, `origin`, `host`, `hmr` sur le port du serveur) et les scripts `dev` dans `frontend/package.json` (`vite`) et à la racine (`npm run dev -w frontend`) ; vérifier que `npm run dev` démarre, que `curl -i -H "Origin: http://localhost:8123" http://localhost:5198/src/index.ts` renvoie du JavaScript avec `Access-Control-Allow-Origin`, qu'un second `npm run dev` échoue sur le port occupé, et que `npm run build` produit toujours les mêmes fichiers dans `www/`
- [ ] 2.2 Rendre le rechargement automatique possible : importer le client Vite depuis le point d'entrée uniquement en développement (code absent du build) ; vérifier que `npm run build` ne contient pas `@vite/client` (test dans `frontend/test/build.test.ts`), et qu'avec Home Assistant ouvert la sauvegarde d'un fichier de `frontend/src/` recharge la page ; si la redirection de port l'empêche, consigner la limite dans la documentation plutôt que de bloquer
- [x] 2.3 Vérifier `npm run typecheck`, `npm run lint`, `npm run check:js` et `npm test`
- [x] 2.4 Documenter `npm run dev`, le port 5198, le rechargement et la variante `vite build --watch` dans `docs/contributing/development-environment.md`, à côté de la prévisualisation (5199) ; vérifier avec `npm run check:docs`

## 3. Environnement de développement
- [x] 3.1 Ajouter l'option `--dev-frontend` à `.devcontainer/start-ha.sh` : elle exporte `VTHERM_DASHBOARD_DEV_SERVER=http://localhost:5198` si la variable n'est pas déjà définie ; sans l'option, rien ne change ; vérifier avec `bash -n` et en lançant le script avec et sans l'option (journal de Home Assistant)
- [x] 3.2 Ajouter le port 5198 à `forwardPorts` et `portsAttributes` de `.devcontainer/devcontainer.json`, en préservant les modifications locales existantes du fichier ; vérifier que le JSONC reste valide
- [x] 3.3 Documenter l'option, le port redirigé, le cas où le navigateur n'atteint pas `localhost` (Codespaces : définir la variable à l'URL redirigée) et le contenu mixte HTTPS/HTTP dans `docs/contributing/development-environment.md` ; vérifier avec `npm run check:docs`

## 4. Vérification de bout en bout
- [ ] 4.1 Dans le dev container, sans build (`www/` absent) : `npm run dev`, puis `bash .devcontainer/start-ha.sh --dev-frontend` ; vérifier que l'entrée se charge, que « Home confort » s'affiche avec ses onglets natifs, qu'une modification d'un fichier de `frontend/src/`, d'un plugin natif et de `packages/sdk/src/` apparaît après rechargement sans redémarrage, que le serveur arrêté n'empêche pas le reste de Home Assistant de fonctionner, et que l'entrée de mode développement d'un plugin tiers garde son URL
- [ ] 4.2 Sans l'option : vérifier que le message « The frontend module … is missing » revient sans build, puis disparaît après `npm run build`
- [x] 4.3 Ajouter une entrée au `CHANGELOG.md` (contributeurs : serveur de développement du frontend) et lancer `npm run check`, `npm test` et `pytest`

## Notes d'application
- 2.3 et 4.3 : `npm run check` signale R0903 sur `complements.py` et `npm test` dépasse le délai dans `frontend/test/docs.test.ts` (variables du thème) ; les deux échouent aussi sans ce change (lecture lente des fichiers par le montage du dev container).
- 3.1 : vérifié avec `start-ha.sh --dev-frontend` (avertissement dans le journal, panneau chargé depuis Vite).
- 2.2 : le serveur détecte une modification et envoie le rechargement de la page (vérifié sur une instance temporaire) ; le rechargement automatique dans le navigateur n'a pas encore été observé.
- 4.1 : vérifié sans build — entrée chargée, 16 plugins natifs `ready` et importés depuis Vite, onglets, navigation et pages de configuration. Restent : modification visible après rechargement (plugin natif, SDK), serveur arrêté, entrée d'un plugin tiers.
- 4.2 : pas encore vérifié.

## Corrections trouvées pendant l'essai
- [x] 5.1 Vite écoutait seulement sur `::1` dans le conteneur alors que la redirection de VS Code se connecte à `127.0.0.1` : `server.host: "127.0.0.1"` ; vérifié depuis l'hôte Windows
- [x] 5.2 La liste des plugins refusait l'URL du serveur pour les plugins natifs (`invalid_url`) : `build_plugin_list` accepte l'adresse du serveur de développement pour les plugins natifs seulement ; tests dans `tests/test_plugin_list.py` et `tests/test_native_plugins.py`, docs `websocket-api.md` et spec mises à jour
- [x] 5.3 Le montage 9p du dépôt (hôte Windows) n'envoie pas d'événements de fichier : `server.watch.usePolling` ; vérifié sur une instance temporaire, documenté
- [x] 5.4 Bug existant, aussi présent avec le build : Home Assistant écrit `route` sur le panneau et écrasait sa route interne, renommée `currentRoute` ; test dans `frontend/test/panel.test.ts`, navigation vérifiée dans le navigateur
- [x] 5.5 Bug existant, hors serveur de développement : quand la configuration centrale est la seule entrée de Versatile Thermostat et qu'elle est enregistrée, Versatile Thermostat supprime l'instance de `vtherm_api` et les plugins UI sont perdus. Contournement : `api_keepalive.py` enregistre une factory de feature manager qui ne s'applique à aucun thermostat ; tests avec le vrai Versatile Thermostat dans `tests/test_api_keepalive.py`. La correction de fond reste à faire dans Versatile Thermostat (compter `get_ui_plugins()` dans `remove_entry`).
