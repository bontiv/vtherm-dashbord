# Spec Delta

## MODIFIED Requirements

### Requirement: Menu de gauche
Un onglet supérieur qui a des entrées SHALL afficher à gauche un menu construit par les contributions. Le menu SHALL défiler verticalement quand il dépasse la hauteur disponible, sans faire défiler le reste de la page. L'entrée courante SHALL être mise en évidence, et les contributions masquées ne SHALL pas apparaître. Les entrées de configuration SHALL afficher leur statut à droite de leur titre, dans le menu comme dans le tiroir sur mobile.

#### Scenario: Menu plus long que l'écran
- **WHEN** le menu contient plus d'entrées que la hauteur de la fenêtre ne permet d'en afficher
- **THEN** il défile seul et l'entrée courante reste accessible

#### Scenario: Entrée masquée
- **WHEN** la condition de visibilité d'une entrée est fausse
- **THEN** l'entrée n'apparaît pas dans le menu

#### Scenario: Statut dans le tiroir
- **WHEN** le menu d'un thermostat est ouvert en tiroir sur un écran de 375 px de large
- **THEN** chaque entrée de configuration affiche son statut sans que le titre déborde

## ADDED Requirements

### Requirement: Tuiles des thermostats
La liste de l'onglet Thermostats SHALL présenter chaque thermostat par une tuile qui montre son nom, l'icône de son type, la température de la pièce et la consigne, l'action en cours (chauffe, refroidissement, repos, arrêt) et le preset actif, lus en direct dans l'état de son entité climate. Une tuile « Nouveau thermostat » SHALL ouvrir la page de création. Les tuiles SHALL passer à la ligne selon la largeur disponible.

#### Scenario: Tuiles par pièce
- **WHEN** la liste est regroupée par pièce
- **THEN** chaque groupe de pièce présente ses thermostats en tuiles, et le choix « Par nom » présente toutes les tuiles triées par nom

#### Scenario: Nouveau thermostat
- **WHEN** l'administrateur choisit la tuile « Nouveau thermostat », en fin de liste
- **THEN** la page de création d'un thermostat s'ouvre

#### Scenario: État en direct
- **WHEN** la température de la pièce d'un thermostat change dans Home Assistant
- **THEN** sa tuile affiche la nouvelle température sans rechargement

#### Scenario: Thermostat qui chauffe
- **WHEN** l'action de l'entité climate d'un thermostat est « chauffe »
- **THEN** sa tuile l'indique par un texte et une pastille de la couleur de chauffe du thème

#### Scenario: Entité indisponible
- **WHEN** l'entité climate d'un thermostat est indisponible ou introuvable
- **THEN** la tuile affiche le nom, le type et la mention « indisponible », et reste cliquable

#### Scenario: Téléphone
- **WHEN** la liste est affichée sur un écran de 360 px de large
- **THEN** les tuiles occupent la largeur de l'écran, une par ligne, sans débordement horizontal
