# Spec Delta

## Purpose

Permettre aux plugins Versatile Thermostat de déclarer côté Python qu'ils fournissent une interface pour le dashboard, et permettre au frontend de découvrir ces plugins UI via WebSocket.

## ADDED Requirements

### Requirement: Enregistrement d'un plugin UI
L'API Python `vtherm_api` SHALL fournir `register_ui_plugin` pour déclarer un plugin UI avec un identifiant unique, l'URL de son module JavaScript et ses métadonnées de dépendance de chargement.

#### Scenario: Enregistrement valide
- **WHEN** un plugin appelle `register_ui_plugin` avec un `id` et un `js_url`
- **THEN** le plugin apparaît dans le résultat de `get_ui_plugins`

#### Scenario: Identifiant déjà utilisé
- **WHEN** un plugin appelle `register_ui_plugin` avec un `id` déjà enregistré
- **THEN** l'appel est refusé avec une erreur explicite et l'enregistrement existant est conservé

#### Scenario: Paramètres invalides
- **WHEN** `id` ou `js_url` est absent ou vide
- **THEN** l'appel est refusé avec une erreur explicite

### Requirement: Désenregistrement d'un plugin UI
L'API Python SHALL fournir `unregister_ui_plugin` pour retirer un plugin UI, par exemple lors du déchargement de son intégration.

#### Scenario: Désenregistrement d'un plugin existant
- **WHEN** un plugin appelle `unregister_ui_plugin` avec son `id`
- **THEN** il n'apparaît plus dans `get_ui_plugins`

#### Scenario: Désenregistrement d'un plugin inconnu
- **WHEN** `unregister_ui_plugin` est appelé avec un `id` inconnu
- **THEN** l'appel n'échoue pas et ne modifie rien

### Requirement: Lecture des plugins UI
L'API Python SHALL fournir `get_ui_plugins`, qui retourne les plugins UI enregistrés avec leur `id`, leur `js_url` et leurs métadonnées de dépendance. Les plugins thermostat non UI ne SHALL pas y apparaître.

#### Scenario: Aucun plugin
- **WHEN** aucun plugin UI n'est enregistré
- **THEN** `get_ui_plugins` retourne une liste vide

### Requirement: Déclaration des dépendances de chargement
Les métadonnées d'un plugin UI SHALL pouvoir contenir `requires`, `load_after` et `load_before`, chacun étant une liste d'identifiants de plugins UI. Ces champs SHALL être optionnels.

#### Scenario: Dépendances omises
- **WHEN** un plugin est enregistré sans `requires`, `load_after` ni `load_before`
- **THEN** il est enregistré sans dépendance

### Requirement: Commande WebSocket de découverte
L'extension SHALL exposer la commande WebSocket `vtherm_dashboard/get_ui_plugins`, qui retourne la même liste que `get_ui_plugins`. Seuls les utilisateurs authentifiés de Home Assistant SHALL pouvoir l'utiliser.

#### Scenario: Utilisateur authentifié
- **WHEN** le frontend envoie `vtherm_dashboard/get_ui_plugins` sur une connexion authentifiée
- **THEN** il reçoit la liste des plugins UI enregistrés

#### Scenario: Plugin enregistré après le démarrage
- **WHEN** un plugin s'enregistre après le premier appel de la commande
- **THEN** il apparaît dans la réponse des appels suivants

### Requirement: Origine des modules JavaScript
L'extension SHALL n'autoriser le chargement que de `js_url` locaux à l'instance Home Assistant (chemin commençant par `/`). Les URL absolues vers un autre hôte SHALL être refusées à l'enregistrement.

#### Scenario: URL externe
- **WHEN** un plugin enregistre un `js_url` commençant par `https://autre-hote/`
- **THEN** l'enregistrement est refusé avec une erreur explicite
