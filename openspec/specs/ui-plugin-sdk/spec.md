# ui-plugin-sdk Specification

## Purpose
Fournir aux auteurs de plugins UI un package npm typé pour déclarer leur plugin auprès du dashboard et accéder au contexte d'exécution du dashboard.

## Requirements

### Requirement: Package npm publié
Le projet SHALL publier sur npm le package `@vtherm/dashboard-sdk`, distribué en modules ES avec ses définitions de types TypeScript. Sa version SHALL être celle du dashboard avec lequel il est publié.

#### Scenario: Installation par un auteur de plugin
- **WHEN** un auteur de plugin installe `@vtherm/dashboard-sdk` dans un projet TypeScript
- **THEN** les types du contrat sont disponibles sans package de types supplémentaire

### Requirement: Fonction de déclaration d'un plugin
Le package SHALL exporter `registerUiPlugin(definition)`, qui enregistre les contributions du plugin auprès du dashboard. La définition contient l'`id` du plugin et ses contributions regroupées par hook.

#### Scenario: Enregistrement depuis le module du plugin
- **WHEN** le module JavaScript d'un plugin appelle `registerUiPlugin` avec une définition valide pendant son chargement par le dashboard
- **THEN** les contributions du plugin sont prises en compte par le dashboard

#### Scenario: Dashboard absent
- **WHEN** `registerUiPlugin` est appelé dans une page où le dashboard n'est pas chargé
- **THEN** l'appel échoue avec une erreur explicite indiquant que le dashboard est introuvable

#### Scenario: Plugin inconnu côté Python
- **WHEN** `registerUiPlugin` est appelé avec un `id` qui n'a ni été enregistré côté Python ni déclaré par une entrée du mode développement
- **THEN** l'appel est refusé avec une erreur explicite et aucune contribution n'est appliquée

### Requirement: Types du contrat
Le package SHALL exporter les types de la définition de plugin, des contributions, des positions, des hooks et des propriétés reçues par les composants de contribution. Le type de position SHALL n'autoriser qu'une seule forme (`first`, `last`, `before`, `after`, `replace` ou `remove`) et SHALL refuser toute valeur numérique d'ordre. Les propriétés communes à tous les composants SHALL comprendre `hass` et `narrow`, l'indication d'un affichage étroit.

#### Scenario: Position invalide à la compilation
- **WHEN** un auteur écrit une position contenant à la fois `after` et `before`
- **THEN** la compilation TypeScript échoue

#### Scenario: Propriétés d'un composant par thermostat
- **WHEN** un composant est déclaré pour le hook `thermostat_widget`
- **THEN** son type de propriétés inclut `hass` et `thermostatId`

#### Scenario: Indication d'écran étroit dans les types
- **WHEN** un auteur écrit le composant d'une contribution de n'importe quel hook
- **THEN** son type de propriétés inclut `narrow`, un booléen

### Requirement: Validation à l'enregistrement
`registerUiPlugin` SHALL valider la définition avec les mêmes règles que le dashboard (hook connu, identifiants préfixés par l'identifiant du plugin, forme de position valide) et SHALL signaler toute erreur avec le chemin de l'élément fautif.

#### Scenario: Identifiant mal préfixé
- **WHEN** une contribution du plugin `smartpi` a l'identifiant `autre.tab.main`
- **THEN** l'appel échoue avec une erreur qui désigne cette contribution

### Requirement: Types des contributions de navigation
Les types du package SHALL couvrir les sept hooks. Une contribution de navigation SHALL exiger un titre, une `top_tab` SHALL accepter une zone (`start` ou `end`), une `tab_page` SHALL exiger l'identifiant de son onglet cible, et une entrée de menu SHALL accepter un groupe facultatif.

#### Scenario: Titre manquant
- **WHEN** un auteur déclare une contribution `thermostat_config` sans titre
- **THEN** la compilation TypeScript échoue

#### Scenario: Onglet cible manquant
- **WHEN** un auteur déclare une `tab_page` sans `tab`
- **THEN** la compilation TypeScript échoue

#### Scenario: Zone invalide
- **WHEN** un auteur déclare une `top_tab` avec une zone autre que `start` ou `end`
- **THEN** la compilation TypeScript échoue

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

### Requirement: Registre unique côté dashboard
Le package SHALL déléguer l'enregistrement au registre du dashboard présent dans la page, et ne SHALL pas contenir de registre propre. Plusieurs plugins qui embarquent chacun une copie du package SHALL enregistrer leurs contributions dans le même registre.

#### Scenario: Deux plugins avec deux copies du SDK
- **WHEN** deux plugins, chacun avec sa propre copie du package, appellent `registerUiPlugin`
- **THEN** les deux plugins apparaissent dans le même registre du dashboard

### Requirement: Harnais de test
Le package SHALL fournir un point d'entrée séparé `@vtherm/dashboard-sdk/testing` avec un faux hôte, utilisable sans Home Assistant ni navigateur complet. Ce faux hôte SHALL appliquer les mêmes règles de validation et de positionnement que le dashboard, SHALL permettre de définir les états du faux `hass`, et SHALL retourner pour chaque hook la liste ordonnée des contributions résolues. Ce point d'entrée SHALL ne pas être importé par le point d'entrée principal.

#### Scenario: Test de position
- **WHEN** un test enregistre un plugin avec une contribution `after: core_tpi.tab.main` dans le faux hôte
- **THEN** la liste résolue du hook `thermostat_config` place la contribution juste après `core_tpi.tab.main`

#### Scenario: Rendu d'un composant
- **WHEN** un test affiche une contribution `thermostat_widget` avec un faux `hass` et un `thermostatId`
- **THEN** le composant est rendu avec ces propriétés

#### Scenario: Règles identiques
- **WHEN** une définition invalide est enregistrée dans le faux hôte
- **THEN** il retourne la même erreur que `registerUiPlugin` dans le dashboard

#### Scenario: Absence du harnais en production
- **WHEN** un plugin importe uniquement le point d'entrée principal du package
- **THEN** le code du harnais n'est pas inclus dans son bundle

### Requirement: Version du dashboard accessible
Le package SHALL exposer la version du dashboard en cours d'exécution, en lecture seule, pour permettre à un plugin d'adapter son comportement.

#### Scenario: Lecture de la version
- **WHEN** un plugin lit la version du dashboard via le package
- **THEN** il obtient la version semver du dashboard chargé dans la page

### Requirement: Contrat des types de champs
Le SDK SHALL exporter un contrat de champs de configuration où chaque type de champ correspond à un contrôle Home Assistant : booléen, nombre, entier, texte, texte long, entité (une ou plusieurs, avec domaines et classes d'appareil), choix, durée et gabarit. Le SDK SHALL fournir la fonction pure qui transforme une définition de champ en description de sélecteur de Home Assistant.

#### Scenario: Champ entité à plusieurs valeurs
- **WHEN** un plugin déclare un champ entité avec plusieurs valeurs et le domaine `climate`
- **THEN** la description de sélecteur obtenue est un sélecteur `entity` en mode liste avec le filtre de domaine `climate`

#### Scenario: Type de champ inconnu
- **WHEN** un plugin déclare un type de champ absent du contrat
- **THEN** la compilation TypeScript échoue

### Requirement: Chargeur des composants de Home Assistant
Le SDK SHALL exporter une fonction qui rend disponibles les composants de Home Assistant utilisés par le contrat de champs et qui indique, sans lever d'erreur, si le chargement a réussi et quels composants sont définis (par exemple `ha-spinner` ou `ha-circular-progress`). Le SDK ne fournit pas d'élément de formulaire partagé : chaque plugin rend ses champs avec le contrat. Plusieurs appels SHALL partager un seul chargement.

#### Scenario: Appels répétés
- **WHEN** deux plugins appellent le chargeur en même temps
- **THEN** un seul chargement a lieu et les deux appels reçoivent le même résultat

### Requirement: Composants Home Assistant dans le harnais de test
Le harnais de test SHALL permettre de tester un composant de plugin qui utilise les composants de Home Assistant, sans Home Assistant : il fournit des éléments simulés des composants du contrat qui reçoivent les propriétés et émettent `value-changed` comme les vrais.

#### Scenario: Test d'un champ entité
- **WHEN** un test change la valeur d'un sélecteur d'entités simulé
- **THEN** le composant du plugin propose le changement correspondant au brouillon

#### Scenario: Propriétés transmises
- **WHEN** un test lit un sélecteur simulé
- **THEN** il peut vérifier le sélecteur, la valeur, le libellé, l'aide et l'erreur transmis

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
