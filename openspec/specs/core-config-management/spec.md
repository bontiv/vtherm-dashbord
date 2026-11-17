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

### Requirement: Liste et sélection des thermostats
Le dashboard SHALL lister les thermostats Versatile Thermostat existants (hors configuration centrale) avec leur nom et leur type (`over_switch`, `over_climate`, `over_valve`), et SHALL ouvrir la configuration d'un thermostat à la sélection.

#### Scenario: Ouverture d'un thermostat
- **WHEN** l'administrateur sélectionne un thermostat
- **THEN** les onglets du hook `thermostat_config` applicables à son type sont affichés avec ses valeurs

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
