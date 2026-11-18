# config-form-layout Specification

## Purpose
Disposer les champs des sections de configuration natives pour qu'une section se lise d'un coup d'œil sur un écran large comme sur un téléphone, les réglages essentiels d'abord et les réglages rares à part.

## Requirements

### Requirement: Grille de champs
Les champs d'une section native SHALL être disposés sur une grille qui ajoute des colonnes selon la largeur disponible, chaque champ gardant une largeur minimale lisible. Les champs de liste (entités multiples, listes de valeurs, commandes) et les textes longs SHALL occuper toute la largeur de la grille. La carte de la section SHALL utiliser la largeur disponible de la page.

#### Scenario: Écran large
- **WHEN** l'onglet principal d'un thermostat est affiché sur un écran de 1440 px de large
- **THEN** le nom, le capteur de température et la durée de cycle sont côte à côte sur une même ligne

#### Scenario: Champ de liste
- **WHEN** l'onglet type d'un thermostat sur interrupteur est affiché sur un écran large
- **THEN** la liste des entités sous-jacentes occupe toute la largeur de la grille

#### Scenario: Téléphone
- **WHEN** la même section est affichée sur un écran de 360 px de large
- **THEN** les champs sont sur une seule colonne, sans débordement horizontal

### Requirement: Paramètres avancés
Chaque section native SHALL afficher d'abord ses champs essentiels et courants, puis regrouper ses champs avancés dans un panneau replié intitulé « Paramètres avancés » avec leur nombre. Le panneau SHALL s'ouvrir de lui-même quand l'un de ses champs est refusé ou obligatoire sans valeur.

#### Scenario: Champs avancés du TPI
- **WHEN** l'onglet TPI d'un thermostat est affiché
- **THEN** les coefficients sont visibles, et les délais minimaux d'activation et de désactivation et les seuils TPI sont dans « Paramètres avancés (4) », replié

#### Scenario: Champ avancé refusé
- **WHEN** l'enregistrement refuse le seuil TPI haut
- **THEN** le panneau « Paramètres avancés » de l'onglet TPI est ouvert et le champ est en erreur

### Requirement: Classement des champs natifs
Chaque champ natif SHALL avoir un niveau, courant ou avancé, fixé par le dashboard. Un champ que le dashboard ne connaît pas encore (ajouté par une nouvelle version de VT) SHALL être courant. Les scénarios ci-dessous fixent les champs avancés minimaux de chaque section.

#### Scenario: Principal et type
- **WHEN** les onglets principal et type sont affichés
- **THEN** le capteur de dernière vue, le pas de température, le maintien d'activité, les commandes personnalisées, le ventilateur automatique et l'utilisation de la température de l'équipement sont dans « Paramètres avancés »

#### Scenario: TPI et synchronisation
- **WHEN** les onglets TPI et synchronisation de température sont affichés
- **THEN** les délais minimaux, les seuils TPI, les paramètres fins d'Auto TPI et la synchronisation par calibration sont dans « Paramètres avancés »

#### Scenario: Autres sections
- **WHEN** les onglets chaudière centrale, avancé, détection de panne et verrouillage sont affichés
- **THEN** le délai de maintien de la chaudière, le pourcentage minimal de sécurité, la réparation des états incorrects, la tolérance et le modèle d'activation de la détection de panne, le code et le reverrouillage automatique sont dans « Paramètres avancés »

#### Scenario: Champ inconnu
- **WHEN** une nouvelle version de VT ajoute un champ à l'onglet TPI
- **THEN** ce champ est affiché hors du panneau replié

#### Scenario: Champ courant
- **WHEN** l'onglet avancé d'un thermostat est affiché
- **THEN** le délai de sécurité, le pourcentage par défaut de sécurité et la durée de dérogation manuelle sont visibles hors du panneau replié

### Requirement: Alignement des champs d'une ligne
Sur une même ligne de la grille des champs d'une section native, les zones de saisie SHALL commencer à la même hauteur, que le contrôle de Home Assistant affiche le nom du champ au-dessus de sa zone de saisie ou à l'intérieur. Les champs dont le nom est à l'intérieur, et les interrupteurs, SHALL descendre de la hauteur de ce nom seulement sur les lignes qui contiennent un champ dont le nom est au-dessus.

#### Scenario: Principaux attributs
- **WHEN** l'onglet principal d'un thermostat est affiché sur un écran de 1440 px, avec le nom, le capteur de température et la durée de cycle sur une ligne
- **THEN** les zones de saisie des trois champs commencent à la même hauteur, à 1 px près

#### Scenario: Ligne sans nom au-dessus
- **WHEN** une ligne ne contient que des champs texte, nombre ou liste
- **THEN** ses champs commencent en haut de la ligne, sans espace ajouté

#### Scenario: Interrupteur sur une ligne de sélecteurs d'entité
- **WHEN** un interrupteur est sur la même ligne qu'un sélecteur d'entité
- **THEN** le haut du texte de l'interrupteur est à la hauteur du haut de la zone de saisie du sélecteur, l'interrupteur restant placé par Home Assistant à côté de son texte

#### Scenario: Bouton d'aide d'un sélecteur d'entité
- **WHEN** un sélecteur d'entité a un bouton d'aide (i)
- **THEN** le haut du bouton est à la hauteur du haut de sa zone de saisie, comme pour les autres champs, et non à la hauteur de son nom

#### Scenario: Une colonne
- **WHEN** la section est affichée sur un écran de 360 px de large
- **THEN** aucun espace n'est ajouté au-dessus des champs dont le nom est à l'intérieur

### Requirement: Nom d'un champ sur une ligne
Le nom affiché d'un champ natif qui n'occupe pas toute la largeur de la grille SHALL tenir sur une seule ligne à la largeur minimale d'une tuile (300 px), en anglais, en français et en allemand, astérisque d'obligation compris, quand il est au-dessus de la zone de saisie ou remonté au-dessus d'une valeur.

#### Scenario: Paramètres avancés
- **WHEN** la section « Paramètres avancés » de la configuration centrale est affichée en français sur un écran de 1440 px
- **THEN** le nom du délai de sécurité et celui du pourcentage de puissance en mode sécurité tiennent sur une ligne et ne recouvrent pas la valeur

#### Scenario: Nom trop long dans une langue
- **WHEN** un champ natif non large a, dans une des trois langues, un nom qui ne tient pas sur une ligne d'une tuile de largeur minimale
- **THEN** un test du dashboard échoue en nommant le champ et la langue

#### Scenario: Champ vide
- **WHEN** un champ texte ou nombre est vide et sans focus
- **THEN** son nom, plus grand à l'intérieur de la zone de saisie, peut passer sur deux lignes sans recouvrir de valeur, et il tient sur une ligne dès qu'il remonte

### Requirement: Nom court d'un champ
Quand le nom de Versatile Thermostat d'un champ natif est trop long pour tenir sur une ligne, le dashboard SHALL afficher un nom court, partout où il nomme ce champ. La phrase complète SHALL rester accessible par l'indication ou l'explication du champ.

#### Scenario: Délai de sécurité
- **WHEN** la section « Sécurité et dérogation » est affichée en français
- **THEN** le délai de sécurité s'appelle « Délai max. sans mesure (min) », et son indication explique les minutes sans mesure avant le mode sécurité

#### Scenario: Valeurs manquantes d'une création
- **WHEN** la création d'un thermostat liste les champs qui manquent
- **THEN** elle les nomme avec le même nom que leur tuile
