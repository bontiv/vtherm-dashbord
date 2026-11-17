## MODIFIED Requirements

### Requirement: Configuration générale
Le dashboard SHALL fournir une page de configuration générale qui édite la configuration centrale de Versatile Thermostat (entrée de type `thermostat_central_config`). Cette configuration est unique.

#### Scenario: Configuration centrale existante
- **WHEN** l'administrateur ouvre la configuration générale et qu'une configuration centrale existe
- **THEN** les sections du hook `general_config` affichent ses valeurs courantes

#### Scenario: Configuration centrale absente
- **WHEN** aucune configuration centrale n'existe
- **THEN** la page propose de la créer et n'affiche aucune section tant que l'administrateur n'a pas commencé la création

#### Scenario: Création de la configuration centrale
- **WHEN** l'administrateur commence la création de la configuration centrale
- **THEN** le menu de la configuration générale liste les sections Principal, TPI et Avancé, aux valeurs par défaut de Versatile Thermostat, et l'action Créer remplace l'action Enregistrer

#### Scenario: Configuration centrale créée
- **WHEN** l'administrateur crée une configuration centrale complète
- **THEN** elle est créée avec les valeurs des trois sections, et la configuration générale affiche toutes ses sections

#### Scenario: Unicité
- **WHEN** une configuration centrale existe déjà
- **THEN** le dashboard ne propose pas d'en créer une seconde

### Requirement: Création d'un thermostat
Le dashboard SHALL permettre de créer un thermostat dans une page de configuration dont le menu liste, dans cet ordre, les sections Principal, Sous-jacents, TPI (quand le type l'utilise) et Avancé, avec un brouillon nouveau. La création SHALL commencer par un écran de choix du type, avant la page de configuration. La création SHALL être refusée tant que la configuration est incomplète selon les règles du config flow de Versatile Thermostat, et le dashboard SHALL indiquer les éléments manquants par section.

#### Scenario: Choix du type
- **WHEN** l'administrateur démarre une création, avec ou sans configuration centrale
- **THEN** un écran propose les types `over_switch`, `over_climate` et `over_valve`, sans le type central, sans menu de sections

#### Scenario: Choix du type par cartes
- **WHEN** l'écran de choix du type est affiché
- **THEN** chaque type est une carte cliquable, focusable et de nom accessible son titre, qui dit ce que le type commande et donne des exemples d'appareils, avec les couleurs du thème, trois cartes côte à côte sur un écran large et empilées sur un écran étroit, sans aucune carte sélectionnée à l'arrivée, et aucune action Continuer

#### Scenario: Type choisi
- **WHEN** l'administrateur clique une carte, ou l'active par Entrée ou Espace, sur l'écran de choix du type, par exemple celle de `over_climate`
- **THEN** la page de configuration s'ouvre sur la section Principal, première du menu, avec un brouillon du type choisi

#### Scenario: Retour au choix du type
- **WHEN** l'administrateur est dans une section de la création et ouvre le segment « Nouveau thermostat » du fil d'ariane
- **THEN** l'écran de choix du type est affiché avec la carte du type choisi sélectionnée, sans perdre le brouillon, et changer de type garde les valeurs que le nouveau type accepte

#### Scenario: Sections de la création
- **WHEN** l'administrateur crée un thermostat `over_climate` sans régulation par vanne
- **THEN** le menu liste Principal, Sous-jacents et Avancé dans cet ordre, sans TPI, et ne liste ni la vue d'ensemble, ni les fonctionnalités, ni les presets, ni les sections des plugins tiers

#### Scenario: Sections qui dépendent du type
- **WHEN** l'administrateur passe d'un `over_switch` à un `over_climate` sans régulation par vanne
- **THEN** la section TPI disparaît du menu, et Principal reste la première section

#### Scenario: Configuration incomplète
- **WHEN** l'administrateur tente de créer un thermostat sans nom, sans capteur de température ou sans entité sous-jacente
- **THEN** la création est refusée, chaque section concernée indique ses champs manquants et la liste des éléments manquants est affichée, par section et avec les libellés traduits, dans une alerte d'avertissement en haut de la page de configuration, avant la carte de la section, jusqu'à ce que plus rien ne manque

#### Scenario: Champ obligatoire vide
- **WHEN** l'administrateur ouvre, pendant une création, une section qui a un champ obligatoire encore vide
- **THEN** ce champ est affiché dans la couleur d'erreur du thème de Home Assistant, signalé comme invalide aux technologies d'assistance et accompagné du mot « Obligatoire », et il revient à l'apparence normale dès qu'il est rempli, alors que les champs d'un thermostat existant ne changent pas

#### Scenario: Création refusée par Versatile Thermostat
- **WHEN** Versatile Thermostat refuse la création à cause d'une valeur d'une section
- **THEN** l'erreur est affichée sur le champ concerné, la section est marquée en erreur dans le menu, et le brouillon de création est conservé

#### Scenario: Création réussie
- **WHEN** l'administrateur valide une configuration complète et valide
- **THEN** le thermostat est créé, apparaît dans la liste et sa page s'ouvre sur sa vue d'ensemble

#### Scenario: Création sans configuration centrale
- **WHEN** aucune configuration centrale n'existe et l'administrateur crée un thermostat `over_switch` avec un nom, un capteur de température, un capteur de température extérieure et une entité sous-jacente
- **THEN** le thermostat est créé avec ses propres coefficients TPI et paramètres avancés, aux valeurs par défaut de Versatile Thermostat sauf s'il les a modifiés dans les sections TPI et Avancé, et toutes ses options de configuration centrale valent "non"

#### Scenario: Abandon de la création
- **WHEN** l'administrateur quitte la création après avoir renseigné un champ
- **THEN** le dashboard demande confirmation avant de perdre le brouillon de création, comme pour un thermostat existant

## ADDED Requirements

### Requirement: Changement de type pendant la création
Pendant la création d'un thermostat, changer de type SHALL conserver les valeurs déjà saisies que le nouveau type accepte et SHALL retirer du brouillon celles qu'il n'accepte pas : un champ que son formulaire n'a plus, ou une entité dont le domaine n'est plus accepté.

#### Scenario: Valeurs communes conservées
- **WHEN** l'administrateur a renseigné le nom, le capteur de température et une entité sous-jacente `switch` d'un `over_switch`, puis choisit `over_valve`
- **THEN** le nom et le capteur de température sont conservés, l'entité `switch` est retirée des entités sous-jacentes, et les champs de la section Sous-jacents sont ceux d'un `over_valve`

#### Scenario: Entités compatibles conservées
- **WHEN** l'administrateur a choisi une entité sous-jacente `climate` d'un `over_climate`, puis choisit `over_switch`, dont les entités sous-jacentes acceptent le domaine `climate`
- **THEN** l'entité est conservée

#### Scenario: Valeurs propres à l'ancien type retirées
- **WHEN** l'administrateur a coché l'inversion de l'interrupteur d'un `over_switch`, puis choisit `over_climate`
- **THEN** cette valeur ne fait plus partie du brouillon et n'est pas envoyée à la création
