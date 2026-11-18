## MODIFIED Requirements

### Requirement: Plugin `core_advanced`
Le plugin `core_advanced` SHALL fournir l'onglet « Sécurité et dérogation » (en : « Safety and manual override », de : « Sicherheit und Übersteuerung ») : délai de sécurité en minutes (60), pourcentage d'activation minimal et par défaut de sécurité (valeurs par défaut de Versatile Thermostat), réparation des états incorrects (non) et durée de dérogation manuelle en minutes (0). Ce titre du dashboard SHALL s'afficher à l'identique dans le menu, le titre de la section et le fil d'Ariane.

#### Scenario: Avancé hérité
- **WHEN** un thermostat utilise la configuration avancée centrale
- **THEN** les valeurs centrales sont affichées en lecture seule

#### Scenario: Valeurs de sécurité manquantes
- **WHEN** un thermostat n'hérite pas de la configuration avancée et qu'une valeur de sécurité manque
- **THEN** la configuration est signalée incomplète

#### Scenario: Titre de l'onglet
- **WHEN** l'administrateur ouvre la configuration d'un thermostat en français, en anglais ou en allemand
- **THEN** le menu, le titre de la section et le fil d'Ariane affichent « Sécurité et dérogation », « Safety and manual override » ou « Sicherheit und Übersteuerung », et non « Paramètres avancés », « Advanced parameters » ou « Erweiterte Einstellungen »

#### Scenario: Panneau des champs rares
- **WHEN** la section « Sécurité et dérogation » affiche ses champs rarement modifiés
- **THEN** ils restent dans le panneau replié « Paramètres avancés (N) » de la section, dont le libellé ne change pas

## ADDED Requirements

### Requirement: Description de l'onglet de sécurité
La description de l'onglet « Sécurité et dérogation » SHALL nommer ses cinq réglages et indiquer que Versatile Thermostat appelle cet onglet « Paramètres avancés » (« Advanced parameters », « Erweiterte Einstellungen »), pour qu'un utilisateur de la documentation de Versatile Thermostat le retrouve.

#### Scenario: Description et ancien nom
- **WHEN** l'administrateur lit la description de la section « Sécurité et dérogation »
- **THEN** elle nomme les réglages de sécurité, la dérogation manuelle et la réparation de l'état incorrect, et cite l'ancien nom « Paramètres avancés » de Versatile Thermostat

### Requirement: Identifiants de l'onglet de sécurité
L'identifiant du plugin de l'onglet « Sécurité et dérogation », ceux de ses contributions, la clé de son titre et les clés de ses champs SHALL rester `core_advanced`, `core_advanced.tab.main`, `core_advanced.general.main`, `title.advanced` et celles de Versatile Thermostat.

#### Scenario: Contrat des plugins tiers
- **WHEN** un plugin tiers se place `after:core_advanced.tab.main` ou ouvre l'adresse de la section avancée enregistrée avant le changement
- **THEN** la contribution est placée au même endroit et l'adresse ouvre la même section, sous son nouveau titre
