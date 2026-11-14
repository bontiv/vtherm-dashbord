# Design

## Context

Projet neuf : aucun code existant. `vtherm_api` est un package Python pur, sans intégration Home Assistant, donc sans WebSocket ni panel. Les plugins VTherm sont des intégrations HA qui peuvent importer `vtherm_api`. Voir proposal.md pour la motivation.

## Goals / Non-Goals

**Goals:**
- Un plugin ajoute, remplace ou supprime des éléments d'interface sans modifier le dashboard.
- Ordre de chargement et position des éléments exprimés par des relations avant/après, jamais par un numéro.
- Apparence entièrement pilotée par le thème Home Assistant.

**Non-Goals:**
- Sandbox des plugins JS : un plugin UI a les mêmes droits que du code d'une intégration HA installée par l'administrateur.
- Rechargement à chaud d'un plugin UI sans recharger la page.
- Contenu des écrans de configuration du cœur et des plugins.

## Decisions

### 1. Architecture hybride : Python déclare, JavaScript contribue
Le registre Python (dans `vtherm_api`) liste les plugins UI présents et leur `js_url`. Le frontend charge ces modules, qui déclarent leurs contributions dans `VThermUiPluginRegistry`.
- *Alternative A, tout en Python* : couple chaque plugin à l'API du dashboard et impose de sérialiser des composants UI. Rejetée.
- *Alternative B, tout en JS (auto-enregistrement global)* : pas de source de vérité sur les plugins installés, et risque de course au chargement. Rejetée.

### 2. Déclaration programmatique du `js_url`
Le plugin appelle `register_ui_plugin` pendant son setup, plutôt que de déclarer une URL dans un manifest statique. Cela permet une URL conditionnelle et une désinscription au déchargement. Le module doit exister avant l'appel : le plugin enregistre lui-même son fichier statique via le serveur HTTP de HA.
- *Alternative : manifest* : plus simple à inspecter, mais `vtherm_api` n'a pas accès aux manifests de façon fiable.

### 3. Nommage `ui` pour toute l'API
`register_ui_plugin`, `unregister_ui_plugin`, `get_ui_plugins`, commande WS `vtherm_dashboard/get_ui_plugins`, registre JS `VThermUiPluginRegistry`. Cela distingue les plugins UI des plugins thermostat de `vtherm_api`.

### 4. Deux niveaux déclaratifs séparés
- **Plugin** : `requires` (obligatoire), `load_after` / `load_before` (souples). Ils ne portent que sur l'ordre d'exécution.
- **Contribution** : `first`, `last`, `before`, `after`, `replace`, `remove`. Ils ne portent que sur la position dans un hook.

Chaque niveau a ainsi un seul rôle et se valide séparément.

### 5. Algorithme de chargement
1. Récupérer la liste via WS.
2. Construire un graphe : `requires` et `load_after` donnent l'arête cible → plugin, `load_before` donne plugin → cible. Les cibles absentes sont ignorées pour les liens souples.
3. Écarter les plugins avec `requires` manquant (propagation jusqu'à stabilité).
4. Tri topologique de Kahn. Départage des ex æquo par `id` alphabétique, pour un ordre déterministe. Les plugins restants non triés forment des cycles et sont exclus.
5. Importer les modules dans cet ordre (`import()` dynamique, attente de chaque enregistrement). Chaque module appelle `register(...)` ; l'application des contributions se fait à ce moment.

### 6. Résolution des positions à l'ajout
Chaque hook maintient une liste ordonnée d'éléments. Pour chaque contribution, au chargement de son plugin :
- `first` / `last` : insertion en tête / en queue.
- `before` / `after` : insertion à côté de la cible. L'insertion se fait *immédiatement* après la cible, donc de multiples "après TPI" s'inversent dans l'ordre de chargement (le dernier chargé est le plus proche de la cible), comme dans la spec.
- `replace` : l'élément prend l'index de la cible, qui garde un lien `replacedBy` pour que les références `before`/`after` suivent le remplaçant.
- `remove` : la cible est marquée supprimée mais gardée en mémoire, afin que d'autres références restent résolubles.
- Cible absente : comportement `on_missing`, avec avertissement.

Un `replace` ou `remove` sur la contribution d'un plugin non ordonné avant lui est détecté par comparaison avec l'ordre de chargement : avertissement.

### 7. Contrat de contribution
Une contribution est un objet `{ id, component, placement?, on_missing? }` où `component` est le nom d'un custom element (Web Component) enregistré par le plugin. Le dashboard instancie l'élément et lui affecte `hass` et, selon le hook, `thermostatId`. Les Web Components sont retenus car HA les utilise déjà, ce qui évite d'imposer un framework aux plugins.
- *Alternative : fonctions de rendu* : couplées à un framework précis. Rejetée.

### 8. Thème
Le dashboard n'embarque aucune couleur fixe. Il utilise uniquement les variables CSS de HA (`--primary-color`, `--card-background-color`, `--primary-text-color`, etc.) et les composants natifs de HA quand c'est possible. Les custom properties CSS traversent le Shadow DOM, donc le changement de thème s'applique sans code spécifique. Les plugins sont invités à faire de même.

### 9. Panel et sécurité côté Python
- Panel enregistré en `require_admin=True` via `panel_custom`, avec un module JS servi en chemin statique.
- La commande WS est enregistrée avec `websocket_api.async_response` et exige l'authentification standard de HA.
- `register_ui_plugin` valide `id`, `js_url` local (chemin absolu commençant par `/`) et unicité.

## Risks / Trade-offs

- [Plugin JS malveillant ou bogué avec les droits de la page HA] → Seuls des modules locaux sont autorisés, et le panel est réservé aux administrateurs. Chaque import est isolé par `try/catch`.
- [Ordre d'enregistrement Python : le plugin s'inscrit avant ou après le dashboard] → Le registre vit dans `vtherm_api`, indépendant de l'ordre de setup. Le frontend lit la liste à l'ouverture du panel.
- [Plugin enregistré après l'ouverture du panel] → Non visible avant rechargement de la page. Acceptable en première version (non-objectif : rechargement à chaud).
- [Position résolue à l'ajout : dépend de l'ordre de chargement] → Mitigé par l'ordre déterministe et par l'avertissement quand un `replace`/`remove` n'a pas de dépendance déclarée.
- [Nécessite une évolution du package `vtherm_api`] → À coordonner avec ses mainteneurs. Le registre est petit et isolé, pour limiter le risque.
- [Pas de version de contrat entre dashboard et plugins] → Hors périmètre de cette première version. Un champ de version pourra être ajouté à `register_ui_plugin` sans casser les plugins existants, car les champs sont optionnels.
