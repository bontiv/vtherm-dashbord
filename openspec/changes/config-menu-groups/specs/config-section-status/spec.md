## MODIFIED Requirements

### Requirement: Statuts d'une section
Chaque entrée de configuration du menu SHALL afficher un statut parmi : complète, éteinte, héritée, héritée éteinte, incomplète avec le nombre de valeurs manquantes, refusée. Le statut SHALL suivre les valeurs du brouillon et se mettre à jour sans enregistrement. Chaque statut SHALL être distinguable autrement que par la couleur (icône ou texte) et annoncé avec le nom de l'entrée.

#### Scenario: Section complète
- **WHEN** la détection d'ouverture d'un thermostat est activée, utilise ses propres valeurs et qu'aucune valeur obligatoire ne manque
- **THEN** l'entrée « Détection d'ouverture » affiche une coche de couleur succès

#### Scenario: Section incomplète
- **WHEN** l'administrateur vide le capteur de température de la section principale
- **THEN** l'entrée principale affiche « 1 manquant » en couleur d'avertissement, avant tout enregistrement

#### Scenario: Lecteur d'écran
- **WHEN** un lecteur d'écran atteint l'entrée « Ouverture » éteinte
- **THEN** il annonce « Ouverture, éteinte »

### Requirement: Priorité des statuts
Quand plusieurs statuts s'appliquent à une section, le menu SHALL afficher le premier dans l'ordre : refusée, éteinte, héritée éteinte, incomplète, héritée, complète.

#### Scenario: Section héritée et refusée
- **WHEN** une section utilise la configuration centrale et que le dernier enregistrement l'a refusée
- **THEN** l'entrée affiche « Erreur »

#### Scenario: Section entièrement héritée
- **WHEN** toutes les options d'héritage d'une section sont actives et que rien ne manque
- **THEN** l'entrée affiche « Central »

#### Scenario: Éteinte par le thermostat lui-même
- **WHEN** un thermostat dont la détection d'ouverture est désactivée utilise la configuration centrale de l'ouverture
- **THEN** l'entrée affiche « Off » et non « Central »

### Requirement: Sections des fonctionnalités éteintes
Une section qui représente une fonctionnalité désactivée SHALL rester dans le menu, en retrait et avec le statut éteinte. Ouverte, elle SHALL afficher une courte explication de la fonctionnalité et un interrupteur d'activation, sans ses champs. Activer cet interrupteur SHALL modifier, dans le brouillon, la même valeur que l'onglet qui la porte (« Fonctions », ou « Sous-jacents » pour la synchronisation de la température), et afficher les champs de la section.

#### Scenario: Découverte de la détection d'ouverture
- **WHEN** l'administrateur ouvre la section « Ouverture » d'un thermostat dont la fonctionnalité est éteinte
- **THEN** la section montre l'explication et l'interrupteur, et aucun champ de détection

#### Scenario: Activation sur place
- **WHEN** l'administrateur active l'interrupteur de la section « Ouverture »
- **THEN** les champs de la section apparaissent, l'onglet « fonctionnalités » montre la fonctionnalité active et le pied de la carte indique « Modifications non enregistrées »

#### Scenario: Fonctionnalité non applicable
- **WHEN** une fonctionnalité ne s'applique pas au type du thermostat, comme le démarrage et l'arrêt automatiques pour `over_switch`
- **THEN** sa section n'apparaît pas dans le menu

#### Scenario: Synchronisation de la température éteinte
- **WHEN** l'administrateur ouvre la section « Synchronisation de la température » d'un thermostat `over_climate` qui ne synchronise pas sa température
- **THEN** l'entrée a le statut éteinte, la section montre l'explication et l'interrupteur, et l'activer coche la même option dans l'onglet « Sous-jacents »

#### Scenario: Synchronisation pour un autre type
- **WHEN** le thermostat est de type `over_switch` ou `over_valve`
- **THEN** la section « Synchronisation de la température » n'apparaît pas dans le menu

## ADDED Requirements

### Requirement: Sections toujours actives sans coche
Une section du groupe « Paramètres généraux », qui ne peut pas être éteinte, SHALL ne rien afficher quand elle est complète. Elle SHALL continuer d'afficher les statuts refusée, incomplète et héritée.

#### Scenario: Fonctions complètes
- **WHEN** la section « Fonctions » d'un thermostat n'a aucune valeur manquante
- **THEN** son entrée n'affiche ni coche ni texte de statut

#### Scenario: Paramètres avancés hérités
- **WHEN** la section « Paramètres avancés » utilise la configuration centrale et que rien ne manque
- **THEN** son entrée affiche « Central »

### Requirement: Humidité éteinte
La section « Humidité » d'un thermostat SHALL avoir le statut éteinte quand l'option « Utiliser un capteur d'humidité » est décochée dans le brouillon. Sa page SHALL rester affichée normalement, avec cette option, pour qu'on puisse la cocher.

#### Scenario: Capteur non utilisé
- **WHEN** l'administrateur décoche « Utiliser un capteur d'humidité »
- **THEN** l'entrée « Humidité » affiche « Off » avant tout enregistrement, et la page montre toujours l'option

#### Scenario: Capteur utilisé
- **WHEN** l'option « Utiliser un capteur d'humidité » est cochée et que rien ne manque
- **THEN** l'entrée « Humidité » affiche une coche de couleur succès

### Requirement: Verrouillage éteint
La section « Gestion du verrouillage » SHALL avoir le statut éteinte quand les options « Le verrouillage empêchera les commandes des utilisateurs » et « Le verrouillage empêchera les commandes des automatisations » sont toutes deux décochées, pour un thermostat qui utilise ses propres valeurs comme pour la configuration centrale. Une option absente SHALL valoir sa valeur par défaut de Versatile Thermostat.

#### Scenario: Aucune commande bloquée
- **WHEN** l'administrateur décoche les deux options dans la section de verrouillage de la configuration centrale
- **THEN** l'entrée « Gestion du verrouillage » de la configuration centrale affiche « Off »

#### Scenario: Une seule option cochée
- **WHEN** seule l'option des utilisateurs est cochée
- **THEN** l'entrée n'a pas le statut éteinte

### Requirement: Section héritée éteinte
Une section d'un thermostat qui utilise la configuration centrale SHALL avoir le statut héritée éteinte, affiché « Central (off) », quand les valeurs centrales qu'elle reprend éteignent la section alors que les valeurs propres du thermostat ne l'éteignent pas.

#### Scenario: Verrouillage central sans effet
- **WHEN** un thermostat utilise la configuration centrale du verrouillage et que la configuration centrale a les deux options décochées
- **THEN** l'entrée « Gestion du verrouillage » du thermostat affiche « Central (off) » et un lecteur d'écran annonce « configuration centrale, éteinte »

#### Scenario: Fonctionnalité propre au thermostat
- **WHEN** un thermostat a la détection d'ouverture activée et utilise la configuration centrale de l'ouverture, alors que la configuration centrale a cette fonctionnalité désactivée
- **THEN** l'entrée « Détection d'ouverture » du thermostat affiche « Central », car Versatile Thermostat active la fonctionnalité d'après la valeur du thermostat
