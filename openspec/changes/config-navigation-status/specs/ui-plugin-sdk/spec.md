# Spec Delta

## ADDED Requirements

### Requirement: Statut et fonctionnalité des contributions de configuration
Les contributions `thermostat_config` et `general_config` SHALL accepter une fonction de statut facultative, pure, qui reçoit le contexte de visibilité et renvoie un statut typé (complète, héritée, incomplète avec un nombre, ou aucun), et une clé de fonctionnalité facultative qui désigne la valeur booléenne qui active la section. Le dashboard SHALL calculer lui-même les statuts éteinte et refusée.

#### Scenario: Plugin tiers incomplet
- **WHEN** la fonction de statut d'un plugin tiers renvoie « incomplète, 2 »
- **THEN** son entrée affiche « 2 manquants » dans le menu

#### Scenario: Plugin tiers avec fonctionnalité
- **WHEN** un plugin tiers déclare la fonctionnalité `use_my_feature` et que sa valeur est fausse
- **THEN** son entrée a le statut éteinte et sa page montre l'interrupteur d'activation fourni par le dashboard

#### Scenario: Statut invalide
- **WHEN** une fonction de statut lève une exception ou renvoie une valeur hors du type
- **THEN** l'entrée n'affiche pas de statut et le mode développement signale l'erreur du plugin

#### Scenario: Sans statut
- **WHEN** une contribution ne déclare ni statut ni fonctionnalité
- **THEN** son entrée n'affiche que les statuts calculés par le dashboard (refusée)
