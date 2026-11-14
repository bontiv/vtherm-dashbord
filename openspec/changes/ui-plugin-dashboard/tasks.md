# Tasks

Les pages de documentation sont rédigées dans le groupe qui livre la fonctionnalité correspondante. Le groupe 9 couvre les pages transverses et le contrôle de complétude.

## 1. Registre Python des plugins UI

- [ ] 1.1 Définir `register_ui_plugin`, `unregister_ui_plugin` et `get_ui_plugins` dans `vtherm_api` (ou un module du custom component si le package n'est pas modifiable), avec validation de `id`, `js_url` local, `dashboard_version` (contrainte obligatoire) et unicité ; vérifier par des tests unitaires pytest couvrant les scénarios de `ui-plugin-registration`
- [ ] 1.2 Valider les champs optionnels `requires`, `load_after`, `load_before` (listes d'identifiants) ; vérifier par des tests unitaires (omis, valides, types invalides)
- [ ] 1.3 Définir la table de cas partagée des contraintes de version (`shared/version-constraints.json` : contrainte, version, résultat attendu, cas invalides, préversions) et implémenter le parseur Python à la main ; vérifier que les tests Python passent sur toute la table
- [ ] 1.4 Documenter l'API Python : docstrings complètes (paramètres, erreurs, exemples), page `docs/plugins/python-api.md` et exemple exécutable dans `docs/examples/python/` ; vérifier que l'exemple est exécuté par pytest et que la page couvre chaque paramètre et chaque erreur de `ui-plugin-registration`

## 2. Custom component Home Assistant

- [ ] 2.1 Créer le custom component (`manifest.json`, `__init__.py`, config entry ou `async_setup`) ; vérifier qu'il se charge dans une instance HA de développement sans erreur dans les logs
- [ ] 2.2 Enregistrer le panel "Home confort" (`require_admin`, module JS servi en chemin statique, entrée de menu) ; vérifier que l'entrée apparaît pour un admin et pas pour un non-admin
- [ ] 2.3 Implémenter la commande WebSocket `vtherm_dashboard/get_ui_plugins` et la documenter dans `docs/reference/websocket-api.md` (requête, réponse, erreurs, authentification) ; vérifier par test avec le client WS de test HA (connexion authentifiée, liste vide, plugin ajouté après, `dashboard_version` présent) et par la présence de chaque champ de la réponse dans la page

## 3. Monorepo, garde-fous de documentation et SDK `@vtherm/dashboard-sdk`

- [ ] 3.1 Initialiser le monorepo npm (workspaces `packages/sdk` et `frontend`, TypeScript, tests Vitest) et adapter `.devcontainer/post-create.sh` pour installer à partir du `package.json` racine ; vérifier que `npm install` et `npm test` s'exécutent à la racine
- [ ] 3.2 Mettre en place le socle de documentation : `docs/README.md` (index avec public visé), scripts de vérification des liens, des ancres, de la présence de chaque page dans l'index et de la synchronisation des exemples depuis `docs/examples/`, workflow d'intégration continue qui les exécute, et modèle de demande de fusion avec la case de mise à jour de la documentation ; vérifier qu'une page non indexée, un lien cassé et un exemple désynchronisé font chacun échouer le script
- [ ] 3.3 Définir les types du contrat (définition de plugin, contributions, positions à forme unique, hooks, propriétés des composants) avec commentaires de documentation ; vérifier par des tests de types (`tsd` ou `expectTypeOf`) : `after` + `before` ne compile pas, valeur numérique refusée, `thermostatId` présent pour `thermostat_widget`
- [ ] 3.4 Implémenter la validation partagée (hook connu, préfixe d'identifiant, forme de position) avec chemins d'erreur explicites ; vérifier par tests unitaires de chaque scénario de `ui-plugin-sdk`
- [ ] 3.5 Implémenter `registerUiPlugin` (délégation à `window.VThermUiPluginRegistry`, erreur claire si le dashboard est absent) et la lecture seule de la version du dashboard ; vérifier par test avec deux copies du SDK chargées séparément qui partagent le même registre simulé, et un test où un `id` inconnu côté Python est refusé
- [ ] 3.6 Configurer la construction (ES module, fichiers `.d.ts`) et la publication npm (`publishConfig` public, `files`, `npm pack --dry-run`) ; vérifier que `npm pack --dry-run` ne liste que les fichiers voulus et que le package s'importe depuis un projet TypeScript de test
- [ ] 3.7 Générer la référence du SDK dans `docs/reference/sdk/` avec TypeDoc et ajouter les contrôles de fraîcheur de la référence et de commentaire sur chaque export public ; vérifier qu'un type modifié sans régénération et un export sans commentaire font échouer le contrôle
- [ ] 3.8 Rédiger `packages/sdk/README.md` (installation, exemple minimal, lien vers `docs/plugins/plugin-development.md`) ; vérifier que l'exemple est compilé par les tests

## 4. Chargeur frontend

- [ ] 4.1 Initialiser le projet `frontend/` (Lit, bundler produisant un module unique, version du dashboard injectée au build depuis `manifest.json`) ; vérifier que le build produit le fichier servi par le panel et que la version est lisible dans le bundle
- [ ] 4.2 Implémenter le parseur de contraintes TypeScript à la main et l'évaluation de `dashboard_version` ; vérifier que les tests passent sur la même table `shared/version-constraints.json` que Python
- [ ] 4.3 Implémenter le tri des dépendances de chargement (`dashboard_version`, `requires`, `load_after`, `load_before`, propagation, cycles, ordre déterministe) ; vérifier par tests unitaires sur chaque scénario de `ui-plugin-loading`
- [ ] 4.4 Implémenter le chargement dynamique des modules avec isolation des échecs, état par plugin et refus d'un `id` inconnu côté Python ; vérifier par test avec un module introuvable, un module qui lève une exception, un plugin trop ancien et un plugin trop récent (module non téléchargé)
- [ ] 4.5 Exposer `window.VThermUiPluginRegistry` avant l'import des plugins et le plugin `core` ; vérifier qu'un plugin de test écrit avec le SDK s'enregistre et que `core` est chargé en premier
- [ ] 4.6 Documenter le chargement dans `docs/plugins/loading-and-dependencies.md` (`requires`, `load_after`, `load_before`, états d'un plugin) et `docs/plugins/version-constraints.md` (grammaire, exemples, montée de version majeure) ; vérifier que les exemples proviennent de `docs/examples/` et que chaque état de plugin de la spec est décrit

## 5. Hooks et résolution des positions

Le moteur de résolution vit dans `packages/sdk` (module partagé), importé par le dashboard et par le harnais de test.

- [ ] 5.1 Implémenter dans le SDK les listes ordonnées par hook et la validation des contributions (hook inconnu, identifiant dupliqué ou mal préfixé) ; vérifier par tests unitaires
- [ ] 5.2 Implémenter `first`, `last`, `before`, `after` avec résolution à l'ajout ; vérifier le cas "plusieurs après TPI" (ordre B, A)
- [ ] 5.3 Implémenter `replace` (suivi par les références) et `remove` ; vérifier par tests des scénarios de remplacement, de suppression et de suivi du remplaçant
- [ ] 5.4 Implémenter `on_missing` et l'avertissement d'ordre insuffisant ; vérifier par tests unitaires (`last`, `skip`, dépendance non déclarée)
- [ ] 5.5 Implémenter le harnais `@vtherm/dashboard-sdk/testing` (faux hôte, faux `hass`, listes résolues par hook, rendu d'un composant avec ses propriétés) comme point d'entrée distinct dans `exports` ; vérifier par tests des scénarios du harnais de `ui-plugin-sdk`, dont l'absence du harnais dans un bundle qui importe seulement le point d'entrée principal
- [ ] 5.6 Documenter les hooks et les positions dans `docs/plugins/hooks-and-placement.md` (les cinq hooks, les six formes de position, `on_missing`, règles de résolution) et le harnais dans `docs/plugins/testing.md` ; vérifier que chaque hook et chaque forme de position y figure avec un exemple issu de `docs/examples/`

## 6. Interface du dashboard

- [ ] 6.1 Réaliser le gabarit du dashboard (navigation, pages globales, configuration générale, liste des thermostats) avec uniquement des variables CSS de Home Assistant ; vérifier visuellement avec un thème clair, un thème sombre et un thème tiers installé
- [ ] 6.2 Afficher les contributions des cinq hooks en leur transmettant `hass` et `thermostatId` ; vérifier avec un plugin de test contribuant à chaque hook
- [ ] 6.3 Ajouter la vue d'état des plugins UI (chargé, dépendance manquante, dashboard incompatible, cycle, échec, avertissements) ; vérifier avec des plugins de test dans chaque état
- [ ] 6.4 Gérer les cas sans plugin et sans thermostat ; vérifier que le dashboard s'affiche sans erreur et montre le message prévu
- [ ] 6.5 Rédiger `docs/user/dashboard.md` (accès, pages, vue d'état des plugins, effet des thèmes) et `docs/plugins/theming.md` (variables CSS à utiliser par les plugins) ; vérifier que chaque état de la vue d'état est décrit et que les variables citées existent dans le code du dashboard

## 7. Mode développement

- [ ] 7.1 Implémenter le stockage local des entrées de développement (ajout, activation, désactivation, suppression, validation du schéma `http`/`https`, `dashboard_version` obligatoire pour un `id` inconnu) ; vérifier par tests unitaires de `ui-plugin-dev-mode`
- [ ] 7.2 Fusionner les entrées avec la liste reçue du WebSocket (remplacement de l'URL pour un `id` installé, déclaration complète pour un `id` inconnu) et faire accepter ces `id` par le registre JS ; vérifier par tests unitaires dont les deux cas et le refus pour un utilisateur non administrateur
- [ ] 7.3 Réaliser la page de gestion des plugins en développement, le bandeau "Mode développement" et le diagnostic d'échec (URL tentée, CORS, contenu mixte) ; vérifier avec un serveur local arrêté, un serveur sans en-tête CORS et un serveur correct
- [ ] 7.4 Ajouter la source (installé ou développement avec URL) à la vue d'état des plugins ; vérifier avec un plugin de chaque source
- [ ] 7.5 Documenter le mode développement dans `docs/plugins/dev-mode.md` (usage, deux modes d'entrée, CORS pour Rollup et Vite, HTTPS et Safari, limites) ; vérifier que les configurations Rollup et Vite proviennent de `docs/examples/` et fonctionnent avec le plugin d'exemple du groupe 8

## 8. Intégration

- [ ] 8.1 Écrire un plugin d'exemple (Python + JS avec `@vtherm/dashboard-sdk`, configuration Rollup et Vite avec CORS, tests avec le harnais) qui ajoute un onglet après `core.tab.tpi`, en remplace un autre et supprime un widget ; vérifier en bout en bout dans une instance HA de développement, d'abord en mode développement avec `--watch` puis installé
- [ ] 8.2 Rédiger `docs/plugins/plugin-development.md`, la procédure complète : prérequis, création du projet, installation du SDK, déclaration Python avec `dashboard_version`, contributions et positions, développement avec le mode développement et `--watch`, tests avec le harnais, installation dans Home Assistant, publication et montée de version majeure du dashboard ; vérifier qu'une personne qui n'a pas écrit le plugin d'exemple suit la procédure du début à la fin sans étape non documentée, et que les extraits proviennent du plugin d'exemple
- [ ] 8.3 Mettre en place la chaîne de publication (version commune dashboard/SDK, publication npm depuis l'intégration continue) et la documenter dans `docs/contributing/publishing.md` ; vérifier avec une exécution à blanc (`npm publish --dry-run`)

## 9. Documentation transverse et complétude

- [ ] 9.1 Rédiger `docs/contributing/architecture.md` (schéma Python/WebSocket/JS, registres, ordre de chargement) et `docs/contributing/development-environment.md` (devcontainer, `external/`, lancement de Home Assistant, tests) ; vérifier qu'un contributeur qui part d'un clone propre démarre Home Assistant et lance les tests en suivant la page
- [ ] 9.2 Créer `CHANGELOG.md` avec, pour chaque version, une section "Pour les auteurs de plugins" (évolutions du contrat et migrations) ; vérifier que la version initiale y figure et que le guide `docs/plugins/plugin-development.md` y renvoie pour la montée de version
- [ ] 9.3 Ajouter à `openspec/config.yaml` une règle de tâches : tout changement d'un comportement public met à jour `docs/` dans le même groupe de tâches ; vérifier que `openspec validate` passe et que la règle apparaît dans `openspec instructions tasks`
- [ ] 9.4 Contrôler la complétude par rapport à la spec `project-documentation` (index, API publiques, procédure, trois publics, exemples, liens, journal) avec un script qui vérifie la présence des pages requises ; vérifier que le script échoue quand une page requise est retirée et passe sur l'état final
