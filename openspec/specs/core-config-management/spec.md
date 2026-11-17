# core-config-management Specification

## Purpose
Définir comment le dashboard permet de créer, consulter et modifier la configuration du cœur de Versatile Thermostat (configuration générale et configuration par thermostat) avec les mêmes règles que le config flow de Versatile Thermostat.

## Requirements

### Requirement: Configuration générale
Le dashboard SHALL fournir une page de configuration générale qui édite la configuration centrale de Versatile Thermostat (entrée de type `thermostat_central_config`). Cette configuration est unique.

#### Scenario: Configuration centrale existante
- **WHEN** l'administrateur ouvre la configuration générale et qu'une configuration centrale existe
- **THEN** les sections du hook `general_config` affichent ses valeurs courantes

#### Scenario: Configuration centrale absente
- **WHEN** aucune configuration centrale n'existe
- **THEN** la page propose de la créer et n'affiche aucune section tant qu'elle n'est pas créée

#### Scenario: Unicité
- **WHEN** une configuration centrale existe déjà
- **THEN** le dashboard ne propose pas d'en créer une seconde

### Requirement: Liste et sélection des thermostats
Le dashboard SHALL lister les thermostats Versatile Thermostat existants (hors configuration centrale) avec leur nom et leur type (`over_switch`, `over_climate`, `over_valve`), et SHALL ouvrir la configuration d'un thermostat à la sélection.

#### Scenario: Ouverture d'un thermostat
- **WHEN** l'administrateur sélectionne un thermostat
- **THEN** les onglets du hook `thermostat_config` applicables à son type sont affichés avec ses valeurs

### Requirement: Création d'un thermostat
Le dashboard SHALL permettre de créer un thermostat en choisissant son type puis en renseignant ses onglets. La création SHALL être refusée tant que la configuration est incomplète selon les règles du config flow de Versatile Thermostat, et le dashboard SHALL indiquer les éléments manquants.

#### Scenario: Choix du type
- **WHEN** l'administrateur démarre une création alors qu'une configuration centrale existe
- **THEN** les types proposés sont `over_switch`, `over_climate` et `over_valve`, sans le type central

#### Scenario: Configuration incomplète
- **WHEN** l'administrateur tente de créer un thermostat sans nom, sans capteur de température ou sans entité sous-jacente
- **THEN** la création est refusée et la liste des éléments manquants est affichée

#### Scenario: Création réussie
- **WHEN** l'administrateur valide une configuration complète et valide
- **THEN** le thermostat est créé et apparaît dans la liste

#### Scenario: Création sans configuration centrale
- **WHEN** aucune configuration centrale n'existe et l'administrateur crée un thermostat `over_switch` avec un nom, un capteur de température, un capteur de température extérieure et une entité sous-jacente
- **THEN** le thermostat est créé avec ses propres coefficients TPI et paramètres avancés, aux valeurs par défaut de Versatile Thermostat, et toutes ses options de configuration centrale valent "non"

### Requirement: Modification avec brouillon explicite
Les modifications d'une configuration SHALL être conservées dans un brouillon jusqu'à l'enregistrement explicite. Le dashboard SHALL signaler les modifications non enregistrées et permettre de les annuler.

#### Scenario: Modification non enregistrée
- **WHEN** l'administrateur modifie un champ sans enregistrer
- **THEN** un indicateur de modifications non enregistrées est affiché et la configuration réelle est inchangée

#### Scenario: Annulation
- **WHEN** l'administrateur annule ses modifications
- **THEN** les champs reprennent les valeurs enregistrées

#### Scenario: Changement de section
- **WHEN** l'administrateur passe d'une section à une autre du menu d'un même thermostat
- **THEN** le brouillon est conservé sans confirmation

#### Scenario: Départ avec brouillon
- **WHEN** l'administrateur change de thermostat, d'onglet supérieur ou de configuration avec des modifications non enregistrées, ou ferme la page
- **THEN** le dashboard demande confirmation avant de les perdre

### Requirement: Enregistrement atomique
L'enregistrement des modifications passant par le config flow SHALL appliquer l'ensemble de ces modifications ou aucune. Après un enregistrement réussi, la prise en compte de la configuration par Versatile Thermostat (rechargement de l'entrée) SHALL suivre le comportement de Versatile Thermostat, sans rechargement supplémentaire provoqué par le dashboard.

#### Scenario: Enregistrement réussi
- **WHEN** l'administrateur enregistre un brouillon valide
- **THEN** la configuration du thermostat contient les nouvelles valeurs

#### Scenario: Enregistrement refusé
- **WHEN** une valeur du brouillon est invalide
- **THEN** aucune valeur n'est enregistrée et les erreurs sont affichées sur les champs concernés

### Requirement: Températures de preset hors config flow
Les températures de preset SHALL être lues et modifiées par les entités `number.*` que Versatile Thermostat expose, pour les presets de chaque thermostat et pour ceux de la configuration centrale. Le dashboard SHALL ne pas les écrire dans la configuration du config flow. Elles font partie du brouillon, mais leur enregistrement n'est pas couvert par l'atomicité du config flow.

#### Scenario: Presets dans le brouillon
- **WHEN** le brouillon contient des champs du config flow et des températures de preset
- **THEN** le config flow est enregistré d'abord, puis chaque température est appliquée à son entité `number`

#### Scenario: Échec d'une température
- **WHEN** l'application d'une température de preset est refusée par Home Assistant
- **THEN** l'erreur est affichée sur le champ concerné et la configuration déjà enregistrée par le config flow est conservée

#### Scenario: Presets centraux
- **WHEN** l'administrateur modifie une température de preset dans la configuration générale
- **THEN** la valeur est appliquée à l'entité `number` de la configuration centrale

### Requirement: Validation équivalente au config flow
Le dashboard SHALL refuser les mêmes configurations que le config flow de Versatile Thermostat, avec la même cause, et SHALL afficher l'erreur sur le champ fautif ou, à défaut, sur le formulaire.

#### Scenario: Entité inconnue
- **WHEN** un champ désigne une entité qui n'a pas d'état dans Home Assistant
- **THEN** l'erreur "entité inconnue" est affichée sur ce champ

#### Scenario: Deux méthodes de détection d'ouverture
- **WHEN** un capteur d'ouverture et les seuils de détection automatique sont renseignés ensemble
- **THEN** l'erreur "une seule méthode de détection" est affichée

#### Scenario: Configuration centrale requise
- **WHEN** une option "utiliser la configuration centrale" est activée et qu'aucune configuration centrale n'existe
- **THEN** l'erreur "configuration centrale requise" est affichée

#### Scenario: Code de verrouillage
- **WHEN** le code de verrouillage n'est pas composé de quatre chiffres
- **THEN** l'erreur "code de verrouillage incorrect" est affichée

#### Scenario: Nombre d'entités de régulation par vanne
- **WHEN** le nombre d'entités d'ouverture ou de fermeture ne correspond pas au nombre d'entités sous-jacentes
- **THEN** l'erreur "nombre d'entités incorrect" est affichée

#### Scenario: Évolution des règles de Versatile Thermostat
- **WHEN** le config flow installé de Versatile Thermostat refuse une configuration
- **THEN** le dashboard la refuse aussi, sans règle de validation propre qui diverge

### Requirement: Champs non modifiés soumis au config flow
Quand le dashboard soumet un formulaire du config flow de Versatile Thermostat, un champ que le brouillon ne modifie pas SHALL recevoir la valeur que ce formulaire propose, comme l'écran de Home Assistant. À défaut de proposition, il SHALL recevoir la valeur enregistrée, puis la valeur par défaut du formulaire.

#### Scenario: Option centrale non modifiée à la création
- **WHEN** aucune configuration centrale n'existe et une création ne modifie pas l'option "contrôle par l'entité centrale", dont la valeur par défaut du formulaire est "oui"
- **THEN** le formulaire reçoit "non", la valeur que Versatile Thermostat propose, et la création n'est pas refusée avec l'erreur "configuration centrale requise"

#### Scenario: Champ non modifié d'une configuration existante
- **WHEN** l'administrateur enregistre une modification de l'onglet principal d'un thermostat sans toucher à son cycle
- **THEN** le cycle enregistré reste inchangé

### Requirement: Héritage de la configuration centrale
Pour chaque section qui le permet (principale, TPI, presets, ouverture, mouvement, puissance, présence, avancée, verrouillage, détection de panne de chauffage), un thermostat SHALL pouvoir utiliser la configuration centrale ou une configuration propre. Quand l'héritage est actif, les champs propres SHALL être masqués et les valeurs centrales affichées en lecture seule.

#### Scenario: Héritage actif
- **WHEN** l'option "utiliser la configuration centrale" d'une section est activée
- **THEN** les champs propres sont masqués et les valeurs de la configuration centrale sont affichées en lecture seule

#### Scenario: Héritage désactivé
- **WHEN** l'administrateur désactive l'option
- **THEN** les champs propres de la section sont affichés et modifiables

#### Scenario: Pas de configuration centrale
- **WHEN** aucune configuration centrale n'existe
- **THEN** les options d'héritage sont désactivées, forcées à "non" et accompagnées d'une explication

#### Scenario: Autres options qui exigent une configuration centrale
- **WHEN** aucune configuration centrale n'existe et l'onglet principal d'un thermostat est affiché
- **THEN** les options "contrôle par l'entité centrale" et "utilisé par la chaudière centrale" sont désactivées, affichées à "non" et accompagnées de la même explication

### Requirement: Fonctionnalités désactivées
Quand une fonctionnalité est désactivée, l'enregistrement SHALL retirer les valeurs propres à cette fonctionnalité de la configuration, comme le fait Versatile Thermostat. La fonctionnalité "démarrage et arrêt automatiques" désactivée SHALL remettre son niveau à "aucun".

#### Scenario: Fenêtre désactivée
- **WHEN** l'administrateur désactive la fonctionnalité d'ouverture et enregistre
- **THEN** le capteur d'ouverture et les seuils de détection ne figurent plus dans la configuration

#### Scenario: Démarrage et arrêt automatiques
- **WHEN** la fonctionnalité de démarrage et d'arrêt automatiques est désactivée et enregistrée
- **THEN** son niveau vaut "aucun"

### Requirement: Valeurs par défaut
Les champs SHALL recevoir les valeurs par défaut de Versatile Thermostat. Les bornes de température par défaut et le pas SHALL dépendre de l'unité de température de Home Assistant.

#### Scenario: Unité en degrés Celsius
- **WHEN** un thermostat est créé alors que l'unité est le degré Celsius
- **THEN** la température minimale vaut 7, la maximale 35 et le pas 0,1

#### Scenario: Unité en degrés Fahrenheit
- **WHEN** l'unité est le degré Fahrenheit
- **THEN** la température minimale vaut 45, la maximale 95 et le pas 1,0

### Requirement: Compatibilité avec la version de Versatile Thermostat
Le dashboard SHALL déclarer la version de configuration de Versatile Thermostat qu'il supporte. Pour une entrée dont la version de configuration est plus récente, le dashboard SHALL afficher la configuration en lecture seule avec un message explicite, sans autoriser de modification.

#### Scenario: Version de configuration plus récente
- **WHEN** une entrée a une version de configuration supérieure à celle supportée
- **THEN** la configuration est en lecture seule et un message indique d'utiliser l'interface de Home Assistant ou de mettre à jour le dashboard


### Requirement: Accès et langue
La configuration SHALL être réservée aux administrateurs. Les libellés, aides et messages d'erreur SHALL suivre les règles de la spec `internationalization` : anglais, français et allemand fournis, anglais par défaut.

#### Scenario: Utilisateur non administrateur
- **WHEN** un utilisateur non administrateur ouvre le dashboard
- **THEN** aucune page de configuration n'est accessible

#### Scenario: Langue non fournie
- **WHEN** la langue de l'utilisateur n'est pas fournie par le dashboard
- **THEN** les libellés et les messages d'erreur de validation sont affichés en anglais
