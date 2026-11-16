# Spec Delta

## MODIFIED Requirements

### Requirement: Affichage sur mobile
Sur un écran étroit, le menu de gauche SHALL devenir un tiroir ouvert par un bouton, la barre d'onglets supérieurs SHALL défiler horizontalement en gardant la roue crantée visible, et le fil d'ariane SHALL se limiter à ses deux derniers segments. Le titre du dashboard SHALL alors ne pas être affiché, tout en restant accessible aux lecteurs d'écran, et l'en-tête SHALL tenir sur une ligne : le bouton du menu de Home Assistant, les onglets supérieurs, puis la roue crantée.

#### Scenario: Écran étroit
- **WHEN** la largeur de la fenêtre est inférieure au seuil mobile
- **THEN** le menu est replié dans un tiroir, la roue crantée reste visible et le fil d'ariane affiche au plus deux segments

#### Scenario: Ouverture du tiroir
- **WHEN** l'utilisateur appuie sur le bouton du menu
- **THEN** le tiroir s'ouvre et se referme après le choix d'une entrée

#### Scenario: Titre masqué
- **WHEN** le dashboard est affiché sur un écran de 375 px de large, avec les onglets Dashboard, Thermostats et VT Compléments
- **THEN** le titre n'est pas affiché, les onglets occupent toute la place entre le bouton du menu de Home Assistant et la roue crantée, et un lecteur d'écran annonce toujours le titre

#### Scenario: Titre sur grand écran
- **WHEN** la largeur de la fenêtre est supérieure au seuil mobile
- **THEN** le titre est affiché à gauche des onglets, comme avant

#### Scenario: Onglets hors de l'écran
- **WHEN** les onglets supérieurs ne tiennent pas tous sur la largeur de l'écran
- **THEN** un indice visuel signale, du côté concerné, que la barre peut défiler

#### Scenario: Onglet actif visible
- **WHEN** l'onglet actif est hors de la partie visible de la barre, par exemple après l'ouverture d'un lien direct
- **THEN** la barre défile pour l'afficher

### Requirement: Contexte transmis aux contributions
Chaque contribution SHALL recevoir l'objet `hass` de Home Assistant et l'indication `narrow`, vraie quand le dashboard est affiché en mode étroit. Les contributions par thermostat SHALL aussi recevoir l'identifiant du thermostat concerné.

#### Scenario: Contribution par thermostat
- **WHEN** un widget `thermostat_widget` est affiché pour un thermostat
- **THEN** il reçoit l'identifiant de ce thermostat et l'objet `hass`

#### Scenario: Indication d'écran étroit
- **WHEN** une contribution de n'importe quel hook, configuration comprise, est affichée sur un écran étroit
- **THEN** elle reçoit `narrow` à vrai, et à faux sur un écran large ; la valeur change sans rechargement quand la largeur franchit le seuil

## ADDED Requirements

### Requirement: Accès au menu de Home Assistant sur mobile
Quand Home Assistant indique au panneau un affichage étroit, le dashboard SHALL afficher, en tête de son en-tête, le bouton standard qui ouvre le menu latéral de Home Assistant. Sur un écran large, ce bouton SHALL ne pas apparaître.

#### Scenario: Quitter le dashboard depuis un téléphone
- **WHEN** un administrateur ouvre le dashboard sur un téléphone et appuie sur le bouton du menu de Home Assistant
- **THEN** le menu latéral de Home Assistant s'ouvre et permet d'aller sur une autre page

#### Scenario: Écran large
- **WHEN** le menu latéral de Home Assistant est visible à côté du dashboard
- **THEN** le dashboard n'affiche pas ce bouton

### Requirement: Tiroir du menu sur mobile
Le tiroir du menu de gauche SHALL couvrir toute la hauteur sous l'en-tête et SHALL assombrir le reste de la page. Il SHALL se fermer au toucher de la zone assombrie, à la touche Échap et après le choix d'une entrée. À l'ouverture, le focus SHALL aller dans le tiroir ; à la fermeture, il SHALL revenir sur le bouton qui l'a ouvert.

#### Scenario: Fermeture par la zone assombrie
- **WHEN** le tiroir est ouvert et l'utilisateur touche la page assombrie
- **THEN** le tiroir se ferme sans changer de page

#### Scenario: Navigation au clavier
- **WHEN** le tiroir est ouvert et l'utilisateur appuie sur Échap
- **THEN** le tiroir se ferme et le focus revient sur le bouton du menu

#### Scenario: Menu plus haut que l'écran
- **WHEN** le menu du tiroir a plus d'entrées que la hauteur de l'écran ne peut en montrer
- **THEN** le tiroir défile seul, sans faire défiler la page

### Requirement: Cibles tactiles
Sur un écran étroit, chaque contrôle interactif du cadre du dashboard et de ses pages natives (boutons, entrées de menu, onglets, liens du fil d'ariane, champs, listes déroulantes, cases et boutons radio avec leur libellé) SHALL offrir une zone de toucher d'au moins 44 px de haut.

#### Scenario: Filtres du catalogue des compléments
- **WHEN** le catalogue des compléments est affiché sur un écran de 375 px de large
- **THEN** chaque champ de recherche, liste de filtre et bouton offre une zone de toucher d'au moins 44 px de haut

#### Scenario: Choix du type dans l'assistant de création
- **WHEN** l'assistant de création d'un thermostat est affiché sur un écran étroit
- **THEN** toucher le libellé d'un type de thermostat le sélectionne, et la zone de chaque choix fait au moins 44 px de haut

### Requirement: Aucun débordement horizontal sur mobile
Sur un écran de 360 px de large ou plus, aucune page native du dashboard SHALL ne déborder horizontalement : les textes longs (adresses, identifiants d'entité, noms de dépôt) SHALL passer à la ligne, et un contenu qui ne peut pas se réduire, comme un tableau, SHALL défiler dans son propre cadre. Seule la barre des onglets supérieurs défile horizontalement.

#### Scenario: Détail d'un complément
- **WHEN** la page de détail d'un complément dont l'adresse du dépôt est longue est affichée sur un écran de 375 px de large
- **THEN** l'adresse passe à la ligne et la page n'a pas de barre de défilement horizontale

#### Scenario: Toutes les pages natives
- **WHEN** chaque page native (Dashboard, liste et configuration des thermostats, assistant de création, configuration générale, Plugins, Développement, catalogue et détail des compléments) est affichée sur un écran de 360 px de large
- **THEN** aucun élément de la page ne dépasse la largeur de l'écran

### Requirement: Barre d'enregistrement sur mobile
Sur un écran étroit, la barre d'enregistrement SHALL rester visible en bas de l'écran pendant le défilement de la page, et ses boutons SHALL passer sous son message quand ils ne tiennent pas sur la même ligne, sans masquer les messages d'erreur.

#### Scenario: Brouillon modifié sur un téléphone
- **WHEN** l'utilisateur modifie un champ de configuration sur un écran de 375 px de large puis fait défiler la page
- **THEN** la barre d'enregistrement reste en bas de l'écran avec ses boutons Annuler et Enregistrer accessibles

### Requirement: Zones sûres des écrans à encoche
Le cadre du dashboard SHALL respecter les marges de zone sûre que l'application Home Assistant ou le navigateur indique (encoche, barre de navigation du système), pour que l'en-tête, le tiroir et la barre d'enregistrement restent visibles et utilisables.

#### Scenario: Téléphone avec encoche
- **WHEN** le dashboard est ouvert dans l'application Home Assistant sur un téléphone dont l'écran a une encoche ou une barre de navigation système
- **THEN** aucun contrôle de l'en-tête ni de la barre d'enregistrement n'est sous l'encoche ou sous cette barre
