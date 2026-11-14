# Spec Delta

## Purpose

Permettre aux plugins Versatile Thermostat de déclarer côté Python qu'ils fournissent une interface pour le dashboard, et permettre au frontend de découvrir ces plugins UI via WebSocket.

## ADDED Requirements

### Requirement: Enregistrement d'un plugin UI
L'API Python `vtherm_api` SHALL fournir `register_ui_plugin` pour déclarer un plugin UI avec un identifiant unique, l'URL de son module JavaScript et ses métadonnées de dépendance de chargement.

#### Scenario: Enregistrement valide
- **WHEN** un plugin appelle `register_ui_plugin` avec un `id`, un `js_url` et un `dashboard_version`
- **THEN** le plugin apparaît dans le résultat de `get_ui_plugins`

#### Scenario: Identifiant déjà utilisé
- **WHEN** un plugin appelle `register_ui_plugin` avec un `id` déjà enregistré
- **THEN** l'appel est refusé avec une erreur explicite et l'enregistrement existant est conservé

#### Scenario: Paramètres invalides
- **WHEN** `id` ou `js_url` est absent ou vide
- **THEN** l'appel est refusé avec une erreur explicite

### Requirement: Identifiants réservés aux plugins natifs
Les identifiants de plugins UI égaux à `core` ou commençant par `core_` SHALL être réservés aux plugins natifs du dashboard. `vtherm_api` n'identifie pas l'appelant : l'extension SHALL exclure de la liste de chargement tout plugin dont l'identifiant est réservé sans figurer parmi les plugins natifs qu'elle enregistre.

#### Scenario: Identifiant réservé
- **WHEN** un plugin tiers enregistre l'`id` `core_custom`
- **THEN** l'enregistrement dans `vtherm_api` réussit, mais le plugin n'est pas chargé et son état "identifiant réservé" est visible dans la vue d'état des plugins

#### Scenario: Plugin natif
- **WHEN** le dashboard enregistre ses propres plugins `core` et `core_tpi`
- **THEN** ils apparaissent dans `get_ui_plugins` et dans la liste de chargement

### Requirement: Désenregistrement d'un plugin UI
L'API Python SHALL fournir `unregister_ui_plugin` pour retirer un plugin UI, par exemple lors du déchargement de son intégration.

#### Scenario: Désenregistrement d'un plugin existant
- **WHEN** un plugin appelle `unregister_ui_plugin` avec son `id`
- **THEN** il n'apparaît plus dans `get_ui_plugins`

#### Scenario: Désenregistrement d'un plugin inconnu
- **WHEN** `unregister_ui_plugin` est appelé avec un `id` inconnu
- **THEN** l'appel n'échoue pas et ne modifie rien

### Requirement: Lecture des plugins UI
L'API Python SHALL fournir `get_ui_plugins`, qui retourne les plugins UI enregistrés avec leur `id`, leur `js_url` et leurs métadonnées, dans l'ordre d'enregistrement, sans tri ni vérification des dépendances. Les plugins thermostat non UI ne SHALL pas y apparaître.

#### Scenario: Aucun plugin
- **WHEN** aucun plugin UI n'est enregistré
- **THEN** `get_ui_plugins` retourne une liste vide

#### Scenario: Pas de tri par l'API
- **WHEN** le plugin B, qui requiert A, est enregistré avant A
- **THEN** `get_ui_plugins` retourne B avant A

### Requirement: Déclaration des dépendances de chargement
Les métadonnées d'un plugin UI SHALL pouvoir contenir `requires`, `load_after` et `load_before`, chacun étant une liste d'identifiants de plugins UI. Ces champs SHALL être optionnels.

#### Scenario: Dépendances omises
- **WHEN** un plugin est enregistré sans `requires`, `load_after` ni `load_before`
- **THEN** il est enregistré sans dépendance

### Requirement: Contrainte de version du dashboard
Les métadonnées d'un plugin UI SHALL contenir `dashboard_version`, obligatoire à l'enregistrement. `vtherm_api` n'en contrôle pas la grammaire : l'extension l'évalue à la construction de la liste de chargement. Une contrainte est une liste de comparateurs séparés par des virgules, tous à satisfaire, parmi `>=`, `>`, `<=`, `<` et `==`, appliqués à une version semver (`1.0` équivaut à `1.0.0`).

#### Scenario: Contrainte valide
- **WHEN** un plugin appelle `register_ui_plugin` avec `dashboard_version=">=1.0,<2.0"`
- **THEN** `get_ui_plugins` retourne cette contrainte pour le plugin

#### Scenario: Champ absent
- **WHEN** `dashboard_version` est absent
- **THEN** l'appel est refusé avec une erreur explicite

#### Scenario: Contrainte invalide
- **WHEN** `dashboard_version` contient un opérateur non supporté (par exemple `^1.0`) ou une version qui n'est pas un semver
- **THEN** l'enregistrement réussit, le plugin n'est pas chargé et son état "contrainte invalide" cite la partie fautive

### Requirement: Commande WebSocket de découverte
L'extension SHALL exposer la commande WebSocket `vtherm_dashboard/get_ui_plugins`. À chaque appel, elle construit la liste des plugins à charger (validation, filtrage, tri) et retourne chaque plugin avec son état, son motif et son rang de chargement. Seuls les utilisateurs authentifiés de Home Assistant SHALL pouvoir l'utiliser.

#### Scenario: Utilisateur authentifié
- **WHEN** le frontend envoie `vtherm_dashboard/get_ui_plugins` sur une connexion authentifiée
- **THEN** il reçoit la liste ordonnée des plugins UI avec leur état

#### Scenario: Plugin enregistré après le démarrage
- **WHEN** un plugin s'enregistre après le premier appel de la commande
- **THEN** il apparaît dans la réponse des appels suivants

#### Scenario: Entrées de développement d'un administrateur
- **WHEN** un administrateur joint des entrées de développement à la requête
- **THEN** elles sont fusionnées aux plugins enregistrés avant la construction de la liste

#### Scenario: Entrées de développement d'un non-administrateur
- **WHEN** un utilisateur non administrateur joint des entrées de développement à la requête
- **THEN** la commande est refusée avec une erreur d'autorisation

### Requirement: Origine des modules JavaScript
L'extension SHALL n'inclure dans la liste de chargement que des `js_url` locaux à l'instance Home Assistant (chemin commençant par `/`). Un plugin dont l'URL est absolue vers un autre hôte SHALL être exclu avec l'état "URL invalide". Les entrées du mode développement suivent leur propre règle.

#### Scenario: URL externe
- **WHEN** un plugin enregistre un `js_url` commençant par `https://autre-hote/`
- **THEN** le plugin n'est pas chargé et son état "URL invalide" indique l'URL refusée