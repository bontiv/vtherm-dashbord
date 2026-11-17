# Spec Delta

## Purpose

Montrer dans le menu, pour chaque section de configuration d'un thermostat ou de la configuration générale, si elle est complète, éteinte, héritée, incomplète ou refusée, et y garder les fonctionnalités éteintes pour qu'on puisse les découvrir et les activer sur place.

## ADDED Requirements

### Requirement: Statuts d'une section
Chaque entrée de configuration du menu SHALL afficher un statut parmi : complète, éteinte, héritée, incomplète avec le nombre de valeurs manquantes, refusée. Le statut SHALL suivre les valeurs du brouillon et se mettre à jour sans enregistrement. Chaque statut SHALL être distinguable autrement que par la couleur (icône ou texte) et annoncé avec le nom de l'entrée.

#### Scenario: Section complète
- **WHEN** toutes les valeurs obligatoires de la section TPI ont une valeur et qu'aucune erreur n'est connue
- **THEN** l'entrée TPI affiche une coche de couleur succès

#### Scenario: Section incomplète
- **WHEN** l'administrateur vide le capteur de température de la section principale
- **THEN** l'entrée principale affiche « 1 manquant » en couleur d'avertissement, avant tout enregistrement

#### Scenario: Lecteur d'écran
- **WHEN** un lecteur d'écran atteint l'entrée « Ouverture » éteinte
- **THEN** il annonce « Ouverture, éteinte »

### Requirement: Priorité des statuts
Quand plusieurs statuts s'appliquent à une section, le menu SHALL afficher le premier dans l'ordre : refusée, éteinte, incomplète, héritée, complète.

#### Scenario: Section héritée et refusée
- **WHEN** une section utilise la configuration centrale et que le dernier enregistrement l'a refusée
- **THEN** l'entrée affiche « Erreur »

#### Scenario: Section entièrement héritée
- **WHEN** toutes les options d'héritage d'une section sont actives et que rien ne manque
- **THEN** l'entrée affiche « Central »

### Requirement: Sections des fonctionnalités éteintes
Une section qui représente une fonctionnalité désactivée SHALL rester dans le menu, en retrait et avec le statut éteinte. Ouverte, elle SHALL afficher une courte explication de la fonctionnalité et un interrupteur d'activation, sans ses champs. Activer cet interrupteur SHALL modifier la même valeur que l'onglet « fonctionnalités », dans le brouillon, et afficher les champs de la section.

#### Scenario: Découverte de la détection d'ouverture
- **WHEN** l'administrateur ouvre la section « Ouverture » d'un thermostat dont la fonctionnalité est éteinte
- **THEN** la section montre l'explication et l'interrupteur, et aucun champ de détection

#### Scenario: Activation sur place
- **WHEN** l'administrateur active l'interrupteur de la section « Ouverture »
- **THEN** les champs de la section apparaissent, l'onglet « fonctionnalités » montre la fonctionnalité active et la barre d'enregistrement signale une modification

#### Scenario: Fonctionnalité non applicable
- **WHEN** une fonctionnalité ne s'applique pas au type du thermostat, comme le démarrage et l'arrêt automatiques pour `over_switch`
- **THEN** sa section n'apparaît pas dans le menu

### Requirement: Accès à la première erreur
Après un enregistrement refusé, la barre d'enregistrement SHALL proposer d'ouvrir la première section en erreur dans l'ordre du menu, et chaque section en erreur SHALL avoir le statut refusée jusqu'à ce que ses valeurs refusées soient modifiées ou qu'un enregistrement réussisse.

#### Scenario: Erreur dans une autre section
- **WHEN** l'administrateur enregistre depuis la section principale et que la section TPI est refusée
- **THEN** la barre d'enregistrement propose « Aller à TPI », qui ouvre la section TPI avec le champ refusé en évidence

#### Scenario: Correction
- **WHEN** l'administrateur modifie le champ refusé de la section TPI
- **THEN** l'entrée TPI quitte le statut refusée et prend le statut calculé sur le brouillon
