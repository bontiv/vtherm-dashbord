## MODIFIED Requirements

### Requirement: Statut et fonctionnalité des contributions de configuration
Les contributions `thermostat_config` et `general_config` SHALL accepter une fonction de statut facultative, pure, qui reçoit le contexte de visibilité et renvoie un statut typé (complète, héritée, héritée éteinte, éteinte, incomplète avec un nombre, ou aucun), et une clé de fonctionnalité facultative qui désigne la valeur booléenne qui active la section. Le dashboard SHALL calculer lui-même le statut refusée, et le statut éteinte quand la valeur de la fonctionnalité est fausse.

#### Scenario: Plugin tiers incomplet
- **WHEN** la fonction de statut d'un plugin tiers renvoie « incomplète, 2 »
- **THEN** son entrée affiche « 2 manquants » dans le menu

#### Scenario: Plugin tiers avec fonctionnalité
- **WHEN** un plugin tiers déclare la fonctionnalité `use_my_feature` et que sa valeur est fausse
- **THEN** son entrée a le statut éteinte et sa page montre l'interrupteur d'activation fourni par le dashboard

#### Scenario: Plugin tiers éteint par ses valeurs
- **WHEN** la fonction de statut d'un plugin tiers sans fonctionnalité renvoie « éteinte »
- **THEN** son entrée affiche « Off » et sa page s'affiche normalement, sans interrupteur d'activation

#### Scenario: Plugin tiers hérité éteint
- **WHEN** la fonction de statut d'un plugin tiers renvoie « héritée éteinte »
- **THEN** son entrée affiche « Central (off) »

#### Scenario: Statut invalide
- **WHEN** une fonction de statut lève une exception ou renvoie une valeur hors du type
- **THEN** l'entrée n'affiche pas de statut et le mode développement signale l'erreur du plugin

#### Scenario: Sans statut
- **WHEN** une contribution ne déclare ni statut ni fonctionnalité
- **THEN** son entrée n'affiche que les statuts calculés par le dashboard (refusée)

## ADDED Requirements

### Requirement: Groupes partagés du cœur
Le SDK SHALL exposer les identifiants des groupes partagés « Paramètres généraux » et « Fonctionnalités », utilisables comme groupe d'une entrée de menu par tout plugin. Le dashboard SHALL traduire leurs intitulés en anglais, français et allemand, sans clé dans les catalogues du plugin.

#### Scenario: Usage typé
- **WHEN** un plugin TypeScript déclare comme groupe d'une section l'identifiant du groupe « Fonctionnalités » exposé par le SDK
- **THEN** la compilation réussit et la section apparaît sous l'intitulé du groupe des onglets natifs
