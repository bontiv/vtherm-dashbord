# Spec Delta

## ADDED Requirements

### Requirement: Présentation de l'héritage
L'option d'héritage d'une section SHALL être présentée par un interrupteur « Personnaliser pour ce thermostat », éteint quand la section utilise la configuration centrale, qui écrit l'inverse de l'option de Versatile Thermostat. Quand l'héritage est actif, les valeurs centrales SHALL être affichées en pastilles compactes « libellé : valeur », les entités par leur nom, suivies d'un lien qui ouvre la même section de la configuration générale.

#### Scenario: Section héritée
- **WHEN** l'onglet ouverture d'un thermostat utilise la configuration centrale
- **THEN** l'interrupteur « Personnaliser pour ce thermostat » est éteint, et les délais et l'action centraux sont affichés en pastilles avec le lien « Modifier la configuration centrale »

#### Scenario: Personnalisation
- **WHEN** l'administrateur allume l'interrupteur « Personnaliser pour ce thermostat »
- **THEN** l'option `use_window_central_config` vaut faux dans le brouillon et les champs propres de la section sont affichés

#### Scenario: Valeur centrale vide
- **WHEN** la configuration centrale n'a aucune valeur pour les champs de la section
- **THEN** une mention indique que les valeurs par défaut de Versatile Thermostat s'appliquent

#### Scenario: Lien avec brouillon
- **WHEN** l'administrateur suit le lien vers la configuration centrale avec des modifications non enregistrées
- **THEN** le dashboard demande confirmation avant de quitter le thermostat
