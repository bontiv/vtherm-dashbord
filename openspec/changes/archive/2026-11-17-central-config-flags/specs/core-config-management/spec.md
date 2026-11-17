## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Champs non modifiés soumis au config flow
Quand le dashboard soumet un formulaire du config flow de Versatile Thermostat, un champ que le brouillon ne modifie pas SHALL recevoir la valeur que ce formulaire propose, comme l'écran de Home Assistant. À défaut de proposition, il SHALL recevoir la valeur enregistrée, puis la valeur par défaut du formulaire.

#### Scenario: Option centrale non modifiée à la création
- **WHEN** aucune configuration centrale n'existe et une création ne modifie pas l'option "contrôle par l'entité centrale", dont la valeur par défaut du formulaire est "oui"
- **THEN** le formulaire reçoit "non", la valeur que Versatile Thermostat propose, et la création n'est pas refusée avec l'erreur "configuration centrale requise"

#### Scenario: Champ non modifié d'une configuration existante
- **WHEN** l'administrateur enregistre une modification de l'onglet principal d'un thermostat sans toucher à son cycle
- **THEN** le cycle enregistré reste inchangé
