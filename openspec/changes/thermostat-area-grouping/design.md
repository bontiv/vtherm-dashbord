# Design

## Context
Voir proposal.md et specs/core-config-management. État actuel :
- `vtherm_dashboard/get_thermostats` (`websocket_api.py`) renvoie `ThermostatSummary` (`id`, `name`, `type`, `read_only`) construits par `list_thermostats()` (`vtherm_config.py`), triés par nom.
- `frontend/src/config/config-session.ts` charge cette liste ; `navigation.ts` la porte (`ThermostatInfo`) ; `thermostat-list.ts` la dessine en `ha-md-list-item`, et `side-menu.ts` en `ha-selector` `select` (liste déroulante).
- Dans le frontend de Home Assistant, l'objet `hass` porte `areas` (`area_id`, `name`, `icon`, `floor_id`), `floors` (`floor_id`, `name`, `level`, `icon`), `devices` et `entities`, tenus à jour en direct. Le type `Hass` du SDK ne les décrit pas.

## Goals / Non-Goals

**Goals:**
- Une source de vérité unique pour le rattachement à une pièce (le serveur), et des noms affichés en direct (l'objet `hass`).
- Une fonction de regroupement pure, partagée par la liste et le sélecteur.

**Non-Goals:**
- Pas d'attribution de pièce depuis le dashboard : elle se fait dans Home Assistant, et le dashboard y renvoie par un lien.
- Pas de regroupement par pièce dans les autres pages (configuration, compléments).

## Decisions

### 1. Le serveur rattache, le client nomme
`list_thermostats()` ajoute à chaque résumé `device_id` (appareil de l'entrée VT, par le registre d'appareils), `climate_entity_id` (registre d'entités, plateforme `climate` de l'entrée) et `area_id` (zone de l'appareil, sinon de l'entité). Le client lit le nom, l'icône et l'étage dans `hass.areas`/`hass.floors`. Si l'objet `hass` ne les a pas (version ancienne), le serveur fournit aussi `area_name`, `floor_name` et `floor_level`, utilisés en repli.
- Alternative écartée : tout calculer côté client depuis `hass.devices`/`hass.entities`. Le client devrait retrouver l'appareil d'une entrée de configuration (`config_entries` de l'appareil), ce qui reproduit un registre déjà disponible côté serveur ; et ces collections sont absentes des versions anciennes.
- Le rattachement suit les changements de pièce faits pendant que la page est ouverte : la session recharge la liste quand `hass.devices` ou `hass.entities` change pour un appareil ou une entité de thermostat (comparaison des `area_id`), sans nouvelle commande WebSocket dédiée.

### 2. `groupByArea(thermostats, areas, floors)` pure
Renvoie une liste ordonnée de groupes `{ areaId | null, name, icon, floorName, items }` : tri par `floor.level` (étages sans niveau après ceux qui en ont, pièces sans étage après les étages), puis par nom de pièce (`localeCompare` dans la langue de l'utilisateur), puis thermostats par nom ; groupe `null` en dernier. Si tous les thermostats sont sans pièce, un seul groupe sans en-tête. La même fonction donne l'ordre et les libellés « pièce · nom » du sélecteur.

### 3. Rendu
En-têtes de groupe : `ha-icon` de la pièce (`mdi:texture-box` par défaut), nom, étage en texte secondaire ; un `h3` sémantique, pour que les lecteurs d'écran naviguent par groupe. Le choix « Par pièce / Par nom » est un sélecteur `select` de Home Assistant en mode boutons, au-dessus de la liste. Il est mémorisé sous une clé `localStorage` propre au dashboard, avec `try/catch` et repli sur l'état en mémoire. Le lien « Attribuer une pièce » ouvre `/config/devices/device/<device_id>` par la navigation de Home Assistant.

## Risks / Trade-offs
- [Entrée VT sans appareil (anciennes versions)] → repli sur la pièce de l'entité climate, puis groupe « Sans pièce » sans lien d'appareil.
- [Rechargements trop fréquents de la liste] → rechargement seulement quand l'`area_id` d'un appareil ou d'une entité de thermostat change, avec un délai de regroupement de quelques centaines de millisecondes.
- [Le sélecteur `select` ne sait pas afficher de groupes] → ordre par pièce et libellé préfixé, plutôt qu'un composant de liste groupée maison.
