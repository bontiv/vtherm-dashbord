# Spec Delta

## Purpose

Définir les hooks d'interface auxquels les plugins UI contribuent et la façon dont la position de chaque contribution est déclarée et résolue, indépendamment de l'ordre de chargement des plugins.

## ADDED Requirements

### Requirement: Hooks de contribution
Le dashboard SHALL accepter des contributions pour cinq hooks : `general_config` (configuration générale), `thermostat_config` (configuration par thermostat), `global_widget` (widget de supervision global), `global_page` (page de supervision globale) et `thermostat_widget` (widget de supervision par thermostat).

#### Scenario: Contribution à un hook valide
- **WHEN** un plugin déclare une contribution sur `thermostat_config`
- **THEN** elle apparaît dans la configuration de chaque thermostat

#### Scenario: Hook inconnu
- **WHEN** un plugin déclare une contribution sur un hook qui n'existe pas
- **THEN** la contribution est ignorée et l'erreur est signalée dans l'état du plugin

### Requirement: Identifiant de contribution
Chaque contribution SHALL avoir un identifiant unique dans son hook, préfixé par l'identifiant de son plugin (par exemple `core.tab.tpi`). Les autres contributions peuvent le désigner comme cible de position.

#### Scenario: Identifiant dupliqué
- **WHEN** deux contributions du même hook ont le même identifiant
- **THEN** la seconde est refusée et l'erreur est signalée

#### Scenario: Préfixe incorrect
- **WHEN** l'identifiant d'une contribution n'est pas préfixé par l'identifiant de son plugin
- **THEN** la contribution est refusée et l'erreur est signalée

### Requirement: Positionnement déclaratif par contribution
Chaque contribution SHALL déclarer sa position avec exactement une des formes `first`, `last`, `before: <id>`, `after: <id>`, `replace: <id>` ou `remove: <id>`. Sans déclaration, la position par défaut est `last`. Aucune valeur numérique d'ordre n'est acceptée.

#### Scenario: Ajout en dernier
- **WHEN** une contribution déclare `last`
- **THEN** elle est placée après toutes les contributions déjà présentes dans le hook

#### Scenario: Après une cible
- **WHEN** une contribution déclare `after: core.tab.tpi`
- **THEN** elle est placée immédiatement après l'onglet `core.tab.tpi`

#### Scenario: Avant une cible
- **WHEN** une contribution déclare `before: core.tab.tpi`
- **THEN** elle est placée immédiatement avant l'onglet `core.tab.tpi`

#### Scenario: Forme invalide
- **WHEN** une contribution déclare plusieurs formes de position ou une valeur numérique
- **THEN** la contribution est refusée et l'erreur est signalée

### Requirement: Résolution à l'ajout
La position d'une contribution SHALL être résolue au moment où son plugin est chargé, par rapport aux contributions déjà présentes. Plusieurs contributions visant la même cible SHALL s'enchaîner dans l'ordre de chargement des plugins, la plus récente étant placée juste après (ou avant) la cible.

#### Scenario: Plusieurs "après TPI"
- **WHEN** les plugins A puis B, chargés dans cet ordre, déclarent chacun `after: core.tab.tpi`
- **THEN** l'ordre obtenu est `core.tab.tpi`, B, A

### Requirement: Remplacement d'une contribution
Une contribution déclarant `replace: <id>` SHALL prendre la place de la cible, qui n'est plus affichée. Les contributions qui visaient la cible avec `before` ou `after` SHALL suivre le remplaçant.

#### Scenario: Remplacement de l'onglet de synchronisation
- **WHEN** un plugin déclare `replace: core.tab.temperature_sync`
- **THEN** son onglet apparaît à la place de l'onglet remplacé, qui n'est plus affiché

#### Scenario: Cible remplacée suivie
- **WHEN** B déclarait `after: core.tab.temperature_sync` et qu'un plugin remplace cette cible
- **THEN** l'onglet de B est placé après le remplaçant

### Requirement: Suppression d'une contribution
Une contribution déclarant `remove: <id>` SHALL retirer la cible de l'interface. La contribution de suppression n'affiche aucun élément.

#### Scenario: Suppression d'un widget
- **WHEN** un plugin déclare `remove: core.widget.cycle` sur `thermostat_widget`
- **THEN** le widget `core.widget.cycle` n'apparaît plus

### Requirement: Cible absente
Si la cible d'une position `before`, `after`, `replace` ou `remove` n'existe pas au moment de la résolution, le dashboard SHALL appliquer le comportement `on_missing` de la contribution. Les valeurs sont `last` (défaut) et `skip` (ignorer la contribution). Un avertissement SHALL être enregistré dans l'état du plugin.

#### Scenario: Cible absente avec valeur par défaut
- **WHEN** une contribution déclare `after: absent.tab` sans `on_missing`
- **THEN** elle est placée en dernier et un avertissement est enregistré

#### Scenario: Cible absente avec skip
- **WHEN** une contribution déclare `replace: absent.tab` avec `on_missing: skip`
- **THEN** elle n'est pas affichée

### Requirement: Avertissement d'ordre insuffisant
Quand une contribution `replace` ou `remove` vise une contribution d'un plugin qui n'est ni requis ni déclaré dans `load_after` par son plugin, le dashboard SHALL enregistrer un avertissement de configuration.

#### Scenario: Dépendance non déclarée
- **WHEN** un plugin remplace une contribution d'un autre plugin sans déclarer de dépendance de chargement vers lui
- **THEN** un avertissement est enregistré dans l'état du plugin
