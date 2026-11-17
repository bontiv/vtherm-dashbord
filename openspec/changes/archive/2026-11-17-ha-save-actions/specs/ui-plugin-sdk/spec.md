# Spec Delta

## MODIFIED Requirements

### Requirement: Contexte des composants de configuration
Un composant des hooks `general_config` et `thermostat_config` SHALL recevoir `hass`, les valeurs courantes de la configuration éditée, celles de la configuration centrale pour `thermostat_config`, les erreurs de validation de ses champs, un moyen de proposer des modifications du brouillon et l'état du brouillon avec ses commandes (modifié ou non, enregistrement en cours, enregistrer, annuler). Il ne SHALL pas écrire lui-même dans la configuration de Home Assistant : l'enregistrement est assuré par le dashboard.

#### Scenario: Modification du brouillon
- **WHEN** un composant propose la modification d'un champ
- **THEN** le brouillon du dashboard est mis à jour et la configuration réelle reste inchangée jusqu'à l'enregistrement

#### Scenario: Erreurs de validation
- **WHEN** l'enregistrement est refusé pour une valeur
- **THEN** le composant concerné reçoit l'erreur associée à son champ

#### Scenario: Configuration générale
- **WHEN** un composant du hook `general_config` est affiché
- **THEN** il ne reçoit pas d'identifiant de thermostat

#### Scenario: État du brouillon
- **WHEN** un composant de configuration propose une modification
- **THEN** il reçoit un état du brouillon marqué comme modifié, et la commande d'annulation remet les valeurs enregistrées

#### Scenario: Enregistrement demandé par le composant
- **WHEN** un composant appelle la commande d'enregistrement
- **THEN** le dashboard enregistre tout le brouillon de la configuration et le composant reçoit le résultat (réussi, refusé ou partiel) pour l'afficher sur son bouton

## ADDED Requirements

### Requirement: Déclaration des actions d'enregistrement d'une contribution
Une contribution `general_config` ou `thermostat_config` SHALL pouvoir déclarer qu'elle dessine elle-même les actions d'enregistrement dans sa carte. Sans cette déclaration, le dashboard SHALL dessiner ces actions dans une carte sous le composant. Les contributions natives SHALL utiliser cette même déclaration. Une valeur invalide SHALL être rejetée par la validation, comme les autres champs de contribution.

#### Scenario: Plugin existant
- **WHEN** un plugin tiers publié avant ce changement déclare une contribution `thermostat_config` sans la nouvelle déclaration
- **THEN** il reste valide et ses pages de configuration affichent les actions dans la carte du dashboard

#### Scenario: Déclaration faite
- **WHEN** une contribution `thermostat_config` déclare dessiner elle-même les actions
- **THEN** le dashboard ne dessine pas de carte d'actions sous son composant

#### Scenario: Déclaration sur un autre hook
- **WHEN** un auteur ajoute cette déclaration à une contribution `global_page`
- **THEN** la compilation TypeScript échoue et la validation à l'enregistrement rejette la contribution
