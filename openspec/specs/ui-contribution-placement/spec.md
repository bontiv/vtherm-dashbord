# ui-contribution-placement Specification

## Purpose
Définir les hooks d'interface auxquels les plugins UI contribuent et la façon dont la position de chaque contribution est déclarée et résolue, indépendamment de l'ordre de chargement des plugins.

## Requirements

### Requirement: Hooks de contribution
Le dashboard SHALL accepter des contributions pour sept hooks : `top_tab` (onglet supérieur), `tab_page` (entrée du menu d'un onglet supérieur), `global_page` (entrée du menu de l'onglet Dashboard), `global_widget` (widget de la page Overview), `general_config` (section de la configuration générale), `thermostat_config` (entrée du menu d'un thermostat, en particulier ses sections de configuration) et `thermostat_widget` (widget de la vue d'ensemble d'un thermostat).

#### Scenario: Contribution à un hook valide
- **WHEN** un plugin déclare une contribution sur `thermostat_config`
- **THEN** elle apparaît dans le menu de chaque thermostat

#### Scenario: Contribution d'onglet supérieur
- **WHEN** un plugin déclare une contribution sur `top_tab`
- **THEN** un onglet supérieur supplémentaire apparaît dans la barre d'onglets

#### Scenario: Hook inconnu
- **WHEN** un plugin déclare une contribution sur un hook qui n'existe pas
- **THEN** la contribution est ignorée et l'erreur est signalée dans l'état du plugin

### Requirement: Identifiant de contribution
Chaque contribution SHALL avoir un identifiant unique dans son hook (le menu d'un onglet supérieur est lui-même un hook, composé des contributions de plusieurs hooks), préfixé par l'identifiant de son plugin (par exemple `core_tpi.tab.main`). Les autres contributions peuvent le désigner comme cible de position.

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
- **WHEN** une contribution déclare `after: core_tpi.tab.main`
- **THEN** elle est placée immédiatement après l'onglet `core_tpi.tab.main`

#### Scenario: Avant une cible
- **WHEN** une contribution déclare `before: core_tpi.tab.main`
- **THEN** elle est placée immédiatement avant l'onglet `core_tpi.tab.main`

#### Scenario: Forme invalide
- **WHEN** une contribution déclare plusieurs formes de position ou une valeur numérique
- **THEN** la contribution est refusée et l'erreur est signalée

### Requirement: Résolution à l'ajout
La position d'une contribution SHALL être résolue au moment où son plugin est chargé, par rapport aux contributions déjà présentes. Plusieurs contributions visant la même cible SHALL s'enchaîner dans l'ordre de chargement des plugins, la plus récente étant placée juste après (ou avant) la cible.

#### Scenario: Plusieurs "après TPI"
- **WHEN** les plugins A puis B, chargés dans cet ordre, déclarent chacun `after: core_tpi.tab.main`
- **THEN** l'ordre obtenu est `core_tpi.tab.main`, B, A

### Requirement: Remplacement d'une contribution
Une contribution déclarant `replace: <id>` SHALL prendre la place de la cible, qui n'est plus affichée. Les contributions qui visaient la cible avec `before` ou `after` SHALL suivre le remplaçant.

#### Scenario: Remplacement de l'onglet de synchronisation
- **WHEN** un plugin déclare `replace: core_sync_temp.tab.main`
- **THEN** son onglet apparaît à la place de l'onglet remplacé, qui n'est plus affiché

#### Scenario: Cible remplacée suivie
- **WHEN** B déclarait `after: core_sync_temp.tab.main` et qu'un plugin remplace cette cible
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

### Requirement: Visibilité conditionnelle
Une contribution SHALL pouvoir déclarer une condition de visibilité évaluée avec le contexte courant (par exemple la configuration du thermostat). Une contribution masquée ne SHALL pas être affichée, mais SHALL conserver sa place dans la résolution des positions, de sorte que les positions des autres contributions ne changent pas.

#### Scenario: Condition devenue vraie
- **WHEN** la configuration du thermostat change et que la condition d'une contribution passe à vrai
- **THEN** la contribution apparaît à sa position résolue sans rechargement de la page

#### Scenario: Position stable
- **WHEN** une contribution B déclare `after` une contribution A, que A est masquée puis qu'elle devient visible
- **THEN** B est affichée à la place qu'occuperait A, et A apparaît immédiatement avant B sans déplacer les autres contributions

#### Scenario: Condition en erreur
- **WHEN** l'évaluation de la condition lève une erreur
- **THEN** la contribution est masquée et l'erreur est signalée dans l'état du plugin

### Requirement: Titre des contributions de navigation
Chaque contribution des hooks `top_tab`, `tab_page`, `global_page`, `general_config` et `thermostat_config` SHALL déclarer un titre, sous la forme d'une clé de traduction de son plugin, utilisé dans la navigation et dans le fil d'ariane. Une icône est facultative.

#### Scenario: Titre absent
- **WHEN** une contribution de navigation est déclarée sans titre
- **THEN** elle est refusée et l'erreur est signalée dans l'état du plugin

#### Scenario: Icône facultative
- **WHEN** une contribution de navigation est déclarée sans icône
- **THEN** elle est affichée avec son titre seul

### Requirement: Zone des onglets supérieurs
Une contribution `top_tab` SHALL déclarer une zone, `start` (par défaut) ou `end`. Les positions d'un onglet supérieur SHALL se résoudre dans sa zone. Une cible située dans l'autre zone SHALL être traitée comme absente.

#### Scenario: Zone par défaut
- **WHEN** un plugin déclare un `top_tab` en position `last` sans zone
- **THEN** l'onglet est placé en fin de zone `start`, avant l'icône Configuration

#### Scenario: Cible dans l'autre zone
- **WHEN** un `top_tab` de la zone `start` déclare `after: core.top.configuration`, située en zone `end`
- **THEN** le comportement `on_missing` s'applique et un avertissement est enregistré

### Requirement: Entrée de menu d'un onglet supérieur
Une contribution `tab_page` SHALL désigner son onglet supérieur cible par son identifiant (`tab`) et apparaître dans le menu de gauche de cet onglet. L'onglet Thermostats SHALL ne pas accepter de `tab_page`, ses entrées venant du hook `thermostat_config`.

#### Scenario: Onglet cible valide
- **WHEN** un plugin déclare un `top_tab` et des `tab_page` qui le désignent
- **THEN** les entrées apparaissent dans le menu de l'onglet du plugin

#### Scenario: Onglet cible inconnu
- **WHEN** une `tab_page` désigne un onglet qui n'existe pas
- **THEN** la contribution est ignorée et l'erreur est signalée dans l'état du plugin

#### Scenario: Onglet cible supprimé
- **WHEN** un autre plugin supprime l'onglet cible par `remove`
- **THEN** les entrées qui le désignent ne sont pas affichées et un avertissement est enregistré

#### Scenario: Onglet Thermostats
- **WHEN** une `tab_page` désigne l'onglet Thermostats
- **THEN** la contribution est refusée avec une erreur qui indique d'utiliser `thermostat_config`

### Requirement: Menu composé de plusieurs hooks
Le menu de gauche d'un onglet supérieur SHALL être composé de toutes les contributions qui le ciblent : `global_page` pour Dashboard, `general_config` et `tab_page` pour Configuration, `thermostat_config` pour un thermostat, `tab_page` pour un onglet de plugin. Les positions SHALL se résoudre dans le menu, et les identifiants SHALL y être uniques même entre hooks différents.

#### Scenario: Position entre hooks
- **WHEN** une `tab_page` de l'onglet Configuration déclare `after` l'identifiant d'une section `general_config`
- **THEN** elle est placée juste après cette section dans le menu

#### Scenario: Identifiant dupliqué entre hooks
- **WHEN** une `tab_page` et une `general_config` du même menu ont le même identifiant
- **THEN** la seconde enregistrée est refusée et l'erreur est signalée

### Requirement: Groupes dans le menu
Une entrée de menu SHALL pouvoir déclarer un groupe : une clé de traduction de son plugin, ou l'un des groupes partagés du cœur (« Paramètres généraux », « Fonctionnalités »), dont l'intitulé est traduit par le dashboard. Le menu SHALL afficher l'intitulé du groupe au-dessus de chaque suite consécutive d'entrées du même groupe. Les entrées sans groupe n'ont pas d'intitulé.

#### Scenario: Entrées consécutives
- **WHEN** trois entrées consécutives déclarent le groupe "Dashboard"
- **THEN** l'intitulé "Dashboard" est affiché une seule fois au-dessus d'elles

#### Scenario: Entrées séparées
- **WHEN** deux entrées du même groupe sont séparées par une entrée d'un autre groupe
- **THEN** l'intitulé est affiché au-dessus de chacune des deux suites

#### Scenario: Groupe partagé par un plugin tiers
- **WHEN** un plugin tiers déclare le groupe partagé « Fonctionnalités » pour une section placée après la détection de présence, sans clé de ce groupe dans ses catalogues
- **THEN** sa section apparaît sous l'intitulé « Fonctionnalités » des onglets natifs, traduit dans la langue de l'utilisateur
