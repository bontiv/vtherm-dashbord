# Spec Delta

## Purpose

Permettre aux auteurs de plugins UI de tester leur interface dans le dashboard depuis un serveur de développement local, avec rechargement par rafraîchissement de la page, sans installer ni redémarrer quoi que ce soit côté Home Assistant.

## ADDED Requirements

### Requirement: Page de gestion des plugins en développement
Le dashboard SHALL fournir une page permettant à un administrateur d'ajouter, d'activer, de désactiver et de supprimer des entrées de plugins en développement.

#### Scenario: Ajout d'une entrée
- **WHEN** un administrateur ajoute une entrée avec un `id` et l'URL de son serveur local
- **THEN** l'entrée apparaît dans la liste, activée

#### Scenario: Désactivation sans suppression
- **WHEN** l'administrateur désactive une entrée
- **THEN** elle est conservée dans la liste mais n'est plus chargée au prochain rafraîchissement

#### Scenario: Utilisateur non administrateur
- **WHEN** un utilisateur non administrateur ouvre le dashboard
- **THEN** la page de gestion n'est pas accessible et aucune entrée de développement n'est chargée

### Requirement: Stockage local au navigateur
Les entrées SHALL être conservées uniquement dans le navigateur de l'utilisateur qui les a créées. Elles ne SHALL affecter ni les autres utilisateurs ni les autres navigateurs, et ne SHALL rien écrire côté Home Assistant.

#### Scenario: Autre navigateur
- **WHEN** le même utilisateur ouvre le dashboard dans un autre navigateur
- **THEN** les entrées de développement ne sont pas présentes

#### Scenario: Persistance après rafraîchissement
- **WHEN** l'administrateur rafraîchit la page
- **THEN** les entrées activées sont chargées de nouveau

### Requirement: Transmission au serveur
Le dashboard SHALL transmettre les entrées actives dans la requête de découverte des plugins, et le serveur les fusionne aux plugins enregistrés pour construire la liste. Le serveur SHALL ne pas conserver ces entrées.

#### Scenario: Fusion par le serveur
- **WHEN** une entrée active est transmise avec la requête
- **THEN** le plugin figure dans la liste de chargement avec la source "développement"

#### Scenario: Aucune conservation
- **WHEN** l'entrée est désactivée puis la page rafraîchie
- **THEN** le serveur ne la retourne plus

#### Scenario: Identifiant réservé
- **WHEN** une entrée de développement porte un `id` égal à `core` ou commençant par `core_` sans correspondre à un plugin natif
- **THEN** elle est exclue de la liste avec l'état "identifiant réservé"

### Requirement: Remplacement d'un plugin installé
Une entrée dont l'`id` correspond à un plugin enregistré côté Python SHALL remplacer l'URL du module de ce plugin par l'URL de développement. Les métadonnées (`dashboard_version`, `requires`, `load_after`, `load_before`) SHALL rester celles de l'enregistrement Python.

#### Scenario: Remplacement du module
- **WHEN** une entrée active porte l'`id` d'un plugin installé
- **THEN** le dashboard charge le module depuis l'URL de développement et non depuis le `js_url` installé

#### Scenario: Métadonnées conservées
- **WHEN** le plugin installé déclare `requires: ["core"]`
- **THEN** le module de développement est chargé selon cette même dépendance

### Requirement: Déclaration complète d'un plugin en développement
Une entrée dont l'`id` ne correspond à aucun plugin enregistré côté Python SHALL contenir elle-même `dashboard_version` et, de façon facultative, `requires`, `load_after` et `load_before`. Elle SHALL tenir lieu d'enregistrement Python pour ce plugin.

#### Scenario: Plugin sans Python
- **WHEN** une entrée active déclare un `id` inconnu avec `dashboard_version=">=1.0,<2.0"` et une URL
- **THEN** le plugin est chargé et peut enregistrer ses contributions

#### Scenario: Contrainte absente
- **WHEN** une entrée pour un `id` inconnu ne contient pas `dashboard_version`
- **THEN** l'entrée est refusée à l'ajout avec une erreur explicite

### Requirement: Mêmes règles de chargement
Les plugins en développement SHALL suivre les règles du chargement normal : évaluation de `dashboard_version`, dépendances de chargement, cycles, isolation des échecs et résolution des positions.

#### Scenario: Plugin de développement incompatible
- **WHEN** la contrainte `dashboard_version` d'une entrée n'est pas satisfaite par le dashboard
- **THEN** le module n'est pas téléchargé et l'état "dashboard incompatible" est affiché

### Requirement: Origine des URL de développement
Une URL de développement SHALL utiliser `http` ou `https`. Tout autre schéma SHALL être refusé à l'ajout.

#### Scenario: Schéma refusé
- **WHEN** l'administrateur saisit une URL `javascript:...` ou `data:...`
- **THEN** l'entrée est refusée avec une erreur explicite

### Requirement: Signalement du mode développement
Tant qu'au moins une entrée est active, le dashboard SHALL afficher un bandeau visible sur toutes ses pages indiquant le mode développement et les plugins concernés.

#### Scenario: Bandeau affiché
- **WHEN** une entrée de développement est active
- **THEN** le bandeau "Mode développement" est affiché avec l'`id` de chaque plugin concerné

### Requirement: Diagnostic d'un échec de chargement
Quand le module d'une entrée de développement ne peut pas être chargé, le dashboard SHALL afficher l'URL tentée et une indication sur les causes courantes : serveur arrêté, en-tête CORS absent, contenu mixte HTTP dans une page HTTPS.

#### Scenario: Serveur arrêté
- **WHEN** le serveur de développement ne répond pas
- **THEN** l'état du plugin indique l'échec avec l'URL et les causes possibles, et les autres plugins continuent de se charger
