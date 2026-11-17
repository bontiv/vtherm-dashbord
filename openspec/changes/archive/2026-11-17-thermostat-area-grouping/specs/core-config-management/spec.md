# Spec Delta

## ADDED Requirements

### Requirement: Pièce d'un thermostat
La pièce d'un thermostat SHALL être celle que Home Assistant donne à son entité climate : la pièce propre de l'entité quand elle en a une, sinon celle de l'appareil de son entrée Versatile Thermostat. Le dashboard SHALL afficher les noms de pièce et d'étage tels que Home Assistant les connaît au moment de l'affichage.

#### Scenario: Pièce de l'appareil
- **WHEN** l'appareil d'un thermostat est dans la pièce « Salle de bain »
- **THEN** le thermostat est rattaché à « Salle de bain »

#### Scenario: Pièce de l'entité
- **WHEN** l'appareil d'un thermostat est dans « Salon » et que son entité climate a sa propre pièce « Bureau »
- **THEN** le thermostat est rattaché à « Bureau »

#### Scenario: Renommage
- **WHEN** l'administrateur renomme la pièce « Bureau » en « Bureau parental » dans Home Assistant alors que la liste est affichée
- **THEN** l'en-tête de la pièce affiche le nouveau nom sans rechargement de la page

### Requirement: Liste des thermostats par pièce
Par défaut, la liste des thermostats SHALL regrouper les thermostats par pièce, chaque groupe ayant un en-tête avec l'icône et le nom de la pièce, et ses thermostats triés par nom. Les groupes SHALL être ordonnés par niveau d'étage puis par nom de pièce ; quand des étages existent, l'en-tête SHALL indiquer l'étage. Les thermostats sans pièce SHALL former un dernier groupe « Sans pièce ».

#### Scenario: Plusieurs thermostats dans une pièce
- **WHEN** deux thermostats sont dans la pièce « Salon »
- **THEN** ils apparaissent tous deux sous l'en-tête « Salon », triés par nom

#### Scenario: Étages
- **WHEN** la pièce « Chambre » est au premier étage et « Salon » au rez-de-chaussée
- **THEN** le groupe « Salon » précède le groupe « Chambre », et chaque en-tête indique son étage

#### Scenario: Sans pièce
- **WHEN** un thermostat n'a de pièce ni par son appareil ni par son entité
- **THEN** il apparaît dans le groupe « Sans pièce », en dernier, avec un lien qui ouvre sa fiche d'appareil dans Home Assistant pour lui attribuer une pièce

#### Scenario: Aucune pièce dans la maison
- **WHEN** aucun thermostat n'a de pièce
- **THEN** la liste est affichée sans en-tête de groupe, triée par nom, et sans le choix « Par pièce / Par nom »

### Requirement: Choix du regroupement
Quand au moins un thermostat a une pièce, la liste des thermostats SHALL proposer un choix entre « Par pièce » et « Par nom ». Le choix SHALL être mémorisé dans le navigateur de l'utilisateur et la liste SHALL fonctionner avec le regroupement par défaut quand la mémorisation est impossible.

#### Scenario: Liste par nom
- **WHEN** l'administrateur choisit « Par nom »
- **THEN** la liste affiche tous les thermostats triés par nom, sans en-tête de pièce

#### Scenario: Retour sur la page
- **WHEN** l'administrateur revient sur l'onglet Thermostats après avoir choisi « Par nom »
- **THEN** la liste est toujours triée par nom

#### Scenario: Navigation privée
- **WHEN** le navigateur refuse l'accès au stockage local
- **THEN** la liste est regroupée par pièce et le choix fonctionne pour la durée de la page

### Requirement: Pièce dans le sélecteur de thermostat
Le sélecteur de thermostat du menu de gauche SHALL ordonner les thermostats comme la liste regroupée par pièce et SHALL afficher chaque thermostat sous la forme « pièce · nom », ou par son seul nom quand il n'a pas de pièce.

#### Scenario: Sélecteur
- **WHEN** l'administrateur ouvre le sélecteur de thermostat
- **THEN** les thermostats du rez-de-chaussée précèdent ceux du premier étage, et chacun est libellé avec sa pièce
