## MODIFIED Requirements

### Requirement: Sections des fonctionnalités éteintes
Une section qui représente une fonctionnalité désactivée SHALL rester dans le menu, en retrait et avec le statut éteinte. Ouverte, elle SHALL afficher une courte explication de la fonctionnalité et un interrupteur d'activation, sans ses champs. Activer cet interrupteur SHALL modifier, dans le brouillon, la valeur de l'étape du config flow qui la porte (« features », ou « Sous-jacents » pour la synchronisation de la température), et afficher les champs de la section.

#### Scenario: Découverte de la détection d'ouverture
- **WHEN** l'administrateur ouvre la section « Ouverture » d'un thermostat dont la fonctionnalité est éteinte
- **THEN** la section montre l'explication et l'interrupteur, et aucun champ de détection

#### Scenario: Activation sur place
- **WHEN** l'administrateur active l'interrupteur de la section « Ouverture »
- **THEN** les champs de la section apparaissent, l'interrupteur reste au-dessus d'eux pour désactiver la fonctionnalité, et le pied de la carte indique « Modifications non enregistrées »

#### Scenario: Actions d'une section éteinte
- **WHEN** la section d'une fonctionnalité éteinte est ouverte, par exemple juste après que l'administrateur l'a éteinte
- **THEN** les actions « Enregistrer » et « Annuler » sont au pied de la même carte que le titre, l'explication et l'interrupteur, actives dès que le brouillon a une modification

#### Scenario: Fonctionnalité non applicable
- **WHEN** une fonctionnalité ne s'applique pas au type du thermostat, comme le démarrage et l'arrêt automatiques pour `over_switch`
- **THEN** sa section n'apparaît pas dans le menu

#### Scenario: Synchronisation de la température éteinte
- **WHEN** l'administrateur ouvre la section « Synchronisation de la température » d'un thermostat `over_climate` qui ne synchronise pas sa température
- **THEN** l'entrée a le statut éteinte, la section montre l'explication et l'interrupteur, et l'activer coche la même option dans l'onglet « Sous-jacents »

#### Scenario: Synchronisation pour un autre type
- **WHEN** le thermostat est de type `over_switch` ou `over_valve`
- **THEN** la section « Synchronisation de la température » n'apparaît pas dans le menu

### Requirement: Accès à la première erreur
Après un enregistrement refusé, les messages au-dessus des actions d'enregistrement de la section SHALL proposer d'ouvrir la première autre section en erreur dans l'ordre du menu, et chaque section en erreur SHALL avoir le statut refusée jusqu'à ce que ses valeurs refusées soient modifiées ou qu'un enregistrement réussisse. Une valeur refusée de l'étape « features » SHALL rendre en erreur la section de la fonctionnalité qui la déclare.

#### Scenario: Erreur dans une autre section
- **WHEN** l'administrateur enregistre depuis la section principale et que la section TPI est refusée
- **THEN** le pied de la carte de la section principale propose « Aller à TPI », qui ouvre la section TPI avec le champ refusé en évidence

#### Scenario: Correction
- **WHEN** l'administrateur modifie le champ refusé de la section TPI
- **THEN** l'entrée TPI quitte le statut refusée et prend le statut calculé sur le brouillon

#### Scenario: Activation d'une fonctionnalité refusée
- **WHEN** Versatile Thermostat refuse `use_window_feature` de l'étape « features » à l'enregistrement
- **THEN** l'entrée « Ouverture » a le statut refusée, et le pied de la carte de la section enregistrée propose « Aller à Ouverture »

## REMOVED Requirements

### Requirement: Sections toujours actives sans coche
**Reason**: Son scénario s'appuyait sur la section « Fonctions », retirée du menu. Elle est remplacée par « Sections des paramètres généraux sans coche », de même règle.
**Migration**: Aucune : la règle d'affichage ne change pas.

## ADDED Requirements

### Requirement: Sections des paramètres généraux sans coche
Une section du groupe « Paramètres généraux », qui ne peut pas être éteinte, SHALL ne rien afficher quand elle est complète. Elle SHALL continuer d'afficher les statuts refusée, incomplète et héritée.

#### Scenario: Principaux attributs complets
- **WHEN** la section « Principaux attributs » d'un thermostat n'a aucune valeur manquante
- **THEN** son entrée n'affiche ni coche ni texte de statut

#### Scenario: Section de sécurité héritée
- **WHEN** la section « Sécurité et dérogation » utilise la configuration centrale et que rien ne manque
- **THEN** son entrée affiche « Central »
