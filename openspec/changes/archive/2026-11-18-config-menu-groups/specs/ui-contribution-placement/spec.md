## MODIFIED Requirements

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
