# Spec Delta

## Purpose

Fournir l'entrée "Home confort" dans Home Assistant, qui héberge la configuration et la supervision des thermostats Versatile Thermostat avec l'apparence du thème actif de Home Assistant.

## ADDED Requirements

### Requirement: Entrée dans le menu latéral
L'extension SHALL ajouter au menu latéral de Home Assistant un élément intitulé "Home confort" qui ouvre le dashboard.

#### Scenario: Affichage du menu
- **WHEN** l'extension est installée et chargée
- **THEN** l'élément "Home confort" apparaît dans le menu latéral et ouvre le dashboard au clic

#### Scenario: Utilisateur non administrateur
- **WHEN** un utilisateur non administrateur ouvre Home Assistant
- **THEN** l'élément n'est pas affiché

### Requirement: Structure du dashboard
Le dashboard SHALL présenter une page de supervision globale, une page de configuration générale, et pour chaque thermostat Versatile Thermostat une vue de configuration et de supervision. Ces pages SHALL être composées des contributions des cinq hooks.

#### Scenario: Pages globales
- **WHEN** l'utilisateur ouvre le dashboard
- **THEN** il voit les widgets `global_widget` et peut accéder aux pages `global_page` et à la configuration générale

#### Scenario: Vue d'un thermostat
- **WHEN** l'utilisateur sélectionne un thermostat
- **THEN** il voit les widgets `thermostat_widget` et les onglets `thermostat_config` pour ce thermostat

### Requirement: Contexte transmis aux contributions
Chaque contribution SHALL recevoir l'objet `hass` de Home Assistant. Les contributions par thermostat SHALL aussi recevoir l'identifiant du thermostat concerné.

#### Scenario: Contribution par thermostat
- **WHEN** un widget `thermostat_widget` est affiché pour un thermostat
- **THEN** il reçoit l'identifiant de ce thermostat et l'objet `hass`

### Requirement: Thème hérité de Home Assistant
Le dashboard SHALL utiliser les variables de thème de Home Assistant (couleurs, polices, modes clair et sombre) pour son apparence, sans valeur de couleur propre figée.

#### Scenario: Changement de thème
- **WHEN** l'utilisateur sélectionne un autre thème Home Assistant
- **THEN** le dashboard reflète les couleurs du nouveau thème sans rechargement manuel de la page

#### Scenario: Mode sombre
- **WHEN** le thème actif de Home Assistant est en mode sombre
- **THEN** le dashboard s'affiche en mode sombre

### Requirement: Dashboard sans plugin
Le dashboard SHALL fonctionner avec le seul plugin `core`, quand aucun plugin UI n'est enregistré.

#### Scenario: Aucun plugin enregistré
- **WHEN** `get_ui_plugins` retourne une liste vide
- **THEN** le dashboard affiche les éléments du cœur sans erreur

### Requirement: Absence de thermostat
Le dashboard SHALL afficher un message explicite s'il n'existe aucun thermostat Versatile Thermostat.

#### Scenario: Aucun thermostat
- **WHEN** aucun thermostat Versatile Thermostat n'est configuré
- **THEN** le dashboard affiche un message indiquant qu'aucun thermostat n'est disponible
