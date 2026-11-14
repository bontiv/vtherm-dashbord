# Spec Delta

## Purpose

Définir la gestion de l'internationalisation de tous les plugins UI, natifs et tiers : catalogues de traductions, résolution de la langue de l'utilisateur de Home Assistant, repli sur l'anglais et vérifications associées.

## ADDED Requirements

### Requirement: Internationalisation de tous les plugins
Tout texte affiché à l'utilisateur par un plugin UI (titres, groupes, libellés, aides, messages d'erreur) SHALL provenir des catalogues de traductions du plugin, par l'API du SDK. Un plugin SHALL fournir au minimum un catalogue en anglais.

#### Scenario: Plugin sans catalogue anglais
- **WHEN** un plugin est enregistré sans catalogue en anglais
- **THEN** l'enregistrement est refusé avec une erreur explicite

#### Scenario: Plugin avec anglais seul
- **WHEN** un plugin tiers ne fournit que l'anglais
- **THEN** ses textes s'affichent en anglais quelle que soit la langue de l'utilisateur

### Requirement: Langues minimales des plugins natifs
Chaque plugin natif SHALL fournir des catalogues complets en anglais, en français et en allemand. Les trois catalogues d'un plugin SHALL contenir exactement les mêmes clés.

#### Scenario: Clé manquante en allemand
- **WHEN** une clé du catalogue anglais d'un plugin natif n'existe pas dans son catalogue allemand
- **THEN** la vérification du projet échoue en nommant le plugin et la clé

#### Scenario: Clé en trop
- **WHEN** un catalogue français contient une clé absente du catalogue anglais
- **THEN** la vérification du projet échoue

### Requirement: Résolution de la langue
Le dashboard SHALL utiliser la langue du profil de l'utilisateur de Home Assistant. Pour chaque texte, il SHALL chercher d'abord l'étiquette complète (par exemple `pt-BR`), puis la langue de base (`pt`), puis l'anglais. Les étiquettes SHALL être comparées sans tenir compte de la casse ni de la différence entre `-` et `_`.

#### Scenario: Langue supportée
- **WHEN** la langue de l'utilisateur est l'allemand et que le plugin fournit `de`
- **THEN** les textes du plugin s'affichent en allemand

#### Scenario: Variante régionale
- **WHEN** la langue de l'utilisateur est `fr-CA` et que le plugin fournit `fr` sans `fr-CA`
- **THEN** les textes s'affichent en français

#### Scenario: Langue non supportée
- **WHEN** la langue de l'utilisateur est `ja` et que le plugin ne la fournit pas
- **THEN** les textes s'affichent en anglais

### Requirement: Repli par clé
Quand une clé manque dans la langue résolue, le dashboard SHALL utiliser sa valeur anglaise. Quand elle manque aussi en anglais, il SHALL afficher la clé elle-même et enregistrer un avertissement dans l'état du plugin.

#### Scenario: Clé manquante dans la langue de l'utilisateur
- **WHEN** un catalogue français tiers n'a pas une clé qui existe en anglais
- **THEN** la valeur anglaise de cette clé est affichée

#### Scenario: Clé inconnue
- **WHEN** un composant demande une clé absente de tous les catalogues
- **THEN** la clé est affichée telle quelle et un avertissement est enregistré

### Requirement: Clés typées à la compilation
Le SDK SHALL fournir une fonction de déclaration des catalogues qui type la fonction de traduction d'après les clés du catalogue anglais. Une clé inconnue SHALL provoquer une erreur de compilation TypeScript. Les catalogues des autres langues SHALL pouvoir être déclarés partiels, ou complets pour les plugins natifs, avec une vérification de compilation.

#### Scenario: Clé inconnue à la compilation
- **WHEN** un composant appelle la traduction avec une clé absente du catalogue anglais
- **THEN** la compilation TypeScript échoue

#### Scenario: Catalogue complet incomplet
- **WHEN** un catalogue déclaré complet omet une clé du catalogue anglais
- **THEN** la compilation TypeScript échoue

#### Scenario: Catalogue partiel
- **WHEN** un plugin tiers déclare un catalogue français partiel
- **THEN** la compilation réussit

### Requirement: Titres et groupes par clés
Les contributions SHALL désigner leur titre et leur groupe par des clés de traduction de leur plugin, et non par des textes littéraux. Le fil d'ariane et le menu SHALL afficher le texte traduit dans la langue résolue.

#### Scenario: Titre traduit
- **WHEN** la langue de l'utilisateur est le français
- **THEN** le menu et le fil d'ariane affichent les titres français des contributions

#### Scenario: Clé de titre inconnue
- **WHEN** la clé de titre d'une contribution n'existe dans aucun catalogue
- **THEN** la clé est affichée et l'avertissement est enregistré

### Requirement: Paramètres et pluriels
Les textes SHALL accepter des paramètres nommés et des formes plurielles selon les règles de la langue de l'utilisateur. Un paramètre manquant SHALL être signalé sans faire échouer l'affichage.

#### Scenario: Paramètre
- **WHEN** un texte contient le paramètre `{name}` et qu'une valeur est fournie
- **THEN** la valeur est insérée dans le texte

#### Scenario: Pluriel
- **WHEN** un texte déclare des formes singulier et pluriel et que la valeur est 2
- **THEN** la forme plurielle de la langue est utilisée

#### Scenario: Paramètre manquant
- **WHEN** un texte attend un paramètre qui n'est pas fourni
- **THEN** le texte est affiché avec le paramètre laissé tel quel et un avertissement est enregistré

### Requirement: Changement de langue sans rechargement
Quand la langue de l'utilisateur change dans Home Assistant, le dashboard SHALL mettre à jour tous les textes des plugins sans rechargement de la page.

#### Scenario: Changement de langue
- **WHEN** l'utilisateur change sa langue de l'anglais au français pendant que le dashboard est ouvert
- **THEN** les menus, le fil d'ariane et les formulaires s'affichent en français

### Requirement: Chargement différé des catalogues
Un plugin SHALL pouvoir charger ses catalogues par langue à la demande. Le catalogue anglais SHALL toujours être chargé comme repli. L'échec du chargement d'une langue SHALL entraîner le repli sur l'anglais avec un avertissement, sans empêcher l'affichage du plugin.

#### Scenario: Chargement à la demande
- **WHEN** un plugin déclare un chargeur de catalogue par langue et que l'utilisateur est en allemand
- **THEN** seuls les catalogues allemand et anglais sont chargés

#### Scenario: Échec de chargement
- **WHEN** le chargement du catalogue allemand échoue
- **THEN** le plugin s'affiche en anglais et l'état du plugin signale l'échec

### Requirement: Formats régionaux
Les nombres, dates, heures et unités affichés par les plugins natifs SHALL suivre les paramètres régionaux de l'utilisateur de Home Assistant (séparateur décimal, format 12 ou 24 heures, unité de température).

#### Scenario: Séparateur décimal
- **WHEN** la langue de l'utilisateur est le français
- **THEN** une température de 19,5 s'affiche avec une virgule

#### Scenario: Format de l'heure
- **WHEN** l'utilisateur utilise le format 12 heures
- **THEN** les heures affichées par les plugins natifs suivent ce format

### Requirement: Messages d'erreur du serveur
Les erreurs renvoyées par le serveur pour l'utilisateur SHALL porter un code stable. Le dashboard SHALL les afficher par une clé de traduction associée au code, et afficher un message générique traduit accompagné du code quand le code est inconnu. Le texte anglais du serveur est destiné aux journaux.

#### Scenario: Code connu
- **WHEN** le serveur renvoie le code `unknown_entity` pour un champ
- **THEN** le message est affiché dans la langue de l'utilisateur

#### Scenario: Code inconnu
- **WHEN** le serveur renvoie un code sans traduction
- **THEN** un message générique traduit est affiché avec le code

### Requirement: Contenu distant localisé
Pour les contenus distants qui existent en plusieurs langues (par exemple les champs `description_<langue>` du catalogue de compléments), le dashboard SHALL appliquer la même chaîne de résolution (étiquette complète, langue de base, anglais).

#### Scenario: Description du catalogue
- **WHEN** l'utilisateur est en allemand et que l'entrée contient `description_de`
- **THEN** la description allemande est affichée

#### Scenario: Description sans traduction
- **WHEN** l'entrée n'a pas de description dans la langue de l'utilisateur
- **THEN** la description anglaise est affichée

### Requirement: Détection des traductions manquantes
Le harnais de test du SDK SHALL fournir une vérification qui échoue si un catalogue déclaré complet omet une clé ou en contient une inconnue. Le mode développement SHALL signaler dans l'état d'un plugin les clés manquantes rencontrées à l'exécution.

#### Scenario: Vérification dans les tests d'un plugin
- **WHEN** un plugin exécute la vérification du harnais avec un catalogue allemand déclaré complet auquel il manque une clé
- **THEN** le test échoue en nommant la clé

#### Scenario: Clé manquante en mode développement
- **WHEN** un plugin chargé en mode développement demande une clé absente en allemand alors que l'utilisateur est en allemand
- **THEN** l'état du plugin indique la clé manquante pour cette langue
