## MODIFIED Requirements

### Requirement: Cibles tactiles
Sur un écran étroit, chaque contrôle interactif du cadre du dashboard et de ses pages natives (boutons, entrées de menu, onglets, liens du fil d'ariane, champs, listes déroulantes, cases et boutons radio avec leur libellé) SHALL offrir une zone de toucher d'au moins 44 px de haut.

#### Scenario: Filtres du catalogue des compléments
- **WHEN** le catalogue des compléments est affiché sur un écran de 375 px de large
- **THEN** chaque champ de recherche, liste de filtre et bouton offre une zone de toucher d'au moins 44 px de haut

#### Scenario: Choix du type dans l'assistant de création
- **WHEN** la section Type de la page de création d'un thermostat est affichée sur un écran étroit
- **THEN** toucher le libellé d'un type de thermostat le sélectionne, et la zone de chaque choix fait au moins 44 px de haut

### Requirement: Fil d'ariane
Le dashboard SHALL afficher sous les onglets un fil d'ariane composé de l'onglet supérieur, du thermostat sélectionné le cas échéant, puis du titre de l'entrée courante. Chaque segment sauf le dernier SHALL être cliquable.

#### Scenario: Section d'un thermostat
- **WHEN** l'utilisateur ouvre la section TPI du thermostat Salon
- **THEN** le fil d'ariane affiche "Thermostats > Salon > TPI"

#### Scenario: Section de configuration générale
- **WHEN** l'utilisateur ouvre la section Window de la configuration générale
- **THEN** le fil d'ariane affiche "Configuration > Window"

#### Scenario: Section d'une création
- **WHEN** l'utilisateur ouvre la section TPI pendant la création d'un thermostat
- **THEN** le fil d'ariane affiche "Thermostats > Nouveau thermostat > TPI", et le segment "Nouveau thermostat" ouvre la première section de la création

#### Scenario: Navigation par le fil d'ariane
- **WHEN** l'utilisateur clique sur le segment "Thermostats"
- **THEN** la liste des thermostats est affichée

### Requirement: Itinéraires et liens directs
Chaque page du dashboard SHALL avoir un itinéraire propre dans l'URL du panel, et l'historique du navigateur SHALL fonctionner. Un itinéraire inconnu SHALL ouvrir la page par défaut de son onglet avec un message.

#### Scenario: Rechargement de la page
- **WHEN** l'utilisateur recharge le navigateur sur la section TPI du thermostat Salon
- **THEN** la même section du même thermostat est affichée

#### Scenario: Itinéraire inconnu
- **WHEN** l'URL désigne une page qui n'existe pas ou n'est plus disponible
- **THEN** la page par défaut de l'onglet est affichée avec un message d'explication

#### Scenario: Section d'une création
- **WHEN** l'utilisateur ouvre l'adresse de la section Avancé d'une création de thermostat, directement ou par l'historique
- **THEN** la section Avancé d'une création est affichée, avec le brouillon de création en cours s'il existe, sinon avec un brouillon nouveau

#### Scenario: Section absente de la création
- **WHEN** l'URL désigne une section qui ne fait pas partie de la création, comme les presets
- **THEN** la première section de la création est affichée avec un message d'explication
