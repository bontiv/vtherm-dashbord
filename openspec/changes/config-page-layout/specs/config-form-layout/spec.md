# Spec Delta

## Purpose

Disposer les champs des sections de configuration natives pour qu'une section se lise d'un coup d'œil sur un écran large comme sur un téléphone, les réglages essentiels d'abord et les réglages rares à part.

## ADDED Requirements

### Requirement: Grille de champs
Les champs d'une section native SHALL être disposés sur une grille qui ajoute des colonnes selon la largeur disponible, chaque champ gardant une largeur minimale lisible. Les champs de liste (entités multiples, listes de valeurs, commandes) et les textes longs SHALL occuper toute la largeur de la grille. La carte de la section SHALL utiliser la largeur disponible de la page.

#### Scenario: Écran large
- **WHEN** l'onglet principal d'un thermostat est affiché sur un écran de 1440 px de large
- **THEN** le nom, le capteur de température et le capteur de dernière vue sont côte à côte sur une même ligne

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
