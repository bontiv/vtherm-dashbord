# Tasks

## 1. Registre Python des plugins UI

- [ ] 1.1 Définir `register_ui_plugin`, `unregister_ui_plugin` et `get_ui_plugins` dans `vtherm_api` (ou un module du custom component si le package n'est pas modifiable), avec validation de `id`, `js_url` local et unicité ; vérifier par des tests unitaires pytest couvrant les scénarios de `ui-plugin-registration`
- [ ] 1.2 Valider les champs optionnels `requires`, `load_after`, `load_before` (listes d'identifiants) ; vérifier par des tests unitaires (omis, valides, types invalides)
- [ ] 1.3 Documenter l'API dans `docs/ui-plugin-api.md` avec un exemple d'enregistrement ; vérifier que l'exemple s'exécute tel quel dans un test

## 2. Custom component Home Assistant

- [ ] 2.1 Créer le custom component (`manifest.json`, `__init__.py`, config entry ou `async_setup`) ; vérifier qu'il se charge dans une instance HA de développement sans erreur dans les logs
- [ ] 2.2 Enregistrer le panel "Home confort" (`require_admin`, module JS servi en chemin statique, entrée de menu) ; vérifier que l'entrée apparaît pour un admin et pas pour un non-admin
- [ ] 2.3 Implémenter la commande WebSocket `vtherm_dashboard/get_ui_plugins` ; vérifier par test avec le client WS de test HA (connexion authentifiée, liste vide, plugin ajouté après)

## 3. Chargeur frontend

- [ ] 3.1 Initialiser le projet frontend (TypeScript, Lit, bundler produisant un module unique) ; vérifier que le build produit le fichier servi par le panel
- [ ] 3.2 Implémenter le tri des dépendances de chargement (`requires`, `load_after`, `load_before`, propagation, cycles, ordre déterministe) ; vérifier par tests unitaires sur chaque scénario de `ui-plugin-loading`
- [ ] 3.3 Implémenter le chargement dynamique des modules avec isolation des échecs et état par plugin ; vérifier par test avec un module introuvable et un module qui lève une exception
- [ ] 3.4 Exposer `VThermUiPluginRegistry.register` et le plugin `core` ; vérifier qu'un plugin de test s'enregistre et que `core` est chargé en premier

## 4. Hooks et résolution des positions

- [ ] 4.1 Implémenter les listes ordonnées par hook et la validation des contributions (hook inconnu, identifiant dupliqué ou mal préfixé) ; vérifier par tests unitaires
- [ ] 4.2 Implémenter `first`, `last`, `before`, `after` avec résolution à l'ajout ; vérifier le cas "plusieurs après TPI" (ordre B, A)
- [ ] 4.3 Implémenter `replace` (suivi par les références) et `remove` ; vérifier par tests des scénarios de remplacement, de suppression et de suivi du remplaçant
- [ ] 4.4 Implémenter `on_missing` et l'avertissement d'ordre insuffisant ; vérifier par tests unitaires (`last`, `skip`, dépendance non déclarée)

## 5. Interface du dashboard

- [ ] 5.1 Réaliser le gabarit du dashboard (navigation, pages globales, configuration générale, liste des thermostats) avec uniquement des variables CSS de Home Assistant ; vérifier visuellement avec un thème clair, un thème sombre et un thème tiers installé
- [ ] 5.2 Afficher les contributions des cinq hooks en leur transmettant `hass` et `thermostatId` ; vérifier avec un plugin de test contribuant à chaque hook
- [ ] 5.3 Ajouter la vue d'état des plugins UI (chargé, dépendance manquante, cycle, échec, avertissements) ; vérifier avec des plugins de test dans chaque état
- [ ] 5.4 Gérer les cas sans plugin et sans thermostat ; vérifier que le dashboard s'affiche sans erreur et montre le message prévu

## 6. Intégration

- [ ] 6.1 Écrire un plugin d'exemple (Python + JS) qui ajoute un onglet après `core.tab.tpi`, en remplace un autre et supprime un widget ; vérifier en bout en bout dans une instance HA de développement
- [ ] 6.2 Rédiger `docs/ui-plugin-guide.md` pour les auteurs de plugins (dépendances, hooks, positions, thème) ; vérifier que le plugin d'exemple suit ce guide
