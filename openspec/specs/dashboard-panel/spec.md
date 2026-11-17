# dashboard-panel Specification

## Purpose
Fournir l'entrée "Versatile Thermostat" dans Home Assistant, qui héberge la configuration et la supervision des thermostats Versatile Thermostat avec l'apparence du thème actif de Home Assistant.

## Requirements

### Requirement: Entrée dans le menu latéral
L'extension SHALL ajouter au menu latéral de Home Assistant un élément intitulé "Versatile Thermostat" qui ouvre le dashboard.

#### Scenario: Affichage du menu
- **WHEN** l'extension est installée et chargée
- **THEN** l'élément "Versatile Thermostat" apparaît dans le menu latéral et ouvre le dashboard au clic

#### Scenario: Utilisateur non administrateur
- **WHEN** un utilisateur non administrateur ouvre Home Assistant
- **THEN** l'élément n'est pas affiché

### Requirement: Onglets supérieurs
Le dashboard SHALL afficher en haut une barre d'onglets : Dashboard et Thermostats à gauche, puis les onglets de plugins, et Configuration sous forme d'une icône de roue crantée sans texte, seule à l'extrémité droite. L'icône Configuration SHALL avoir le nom accessible "Configuration" et une info-bulle.

#### Scenario: Barre par défaut
- **WHEN** l'utilisateur ouvre le dashboard sans plugin tiers
- **THEN** la barre contient Dashboard, Thermostats et VT Compléments à gauche et la roue crantée à droite

#### Scenario: Onglet de plugin
- **WHEN** un plugin contribue un onglet supérieur
- **THEN** il apparaît après les onglets natifs et avant la roue crantée

#### Scenario: Onglet actif
- **WHEN** l'utilisateur ouvre une page d'un onglet
- **THEN** cet onglet est visuellement actif

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
- **THEN** le fil d'ariane affiche "Thermostats > Nouveau thermostat > TPI", et le segment "Nouveau thermostat" ouvre l'écran de choix du type

#### Scenario: Écran de choix du type
- **WHEN** l'utilisateur ouvre l'écran de choix du type de la création d'un thermostat
- **THEN** le fil d'ariane affiche "Thermostats > Nouveau thermostat", et la page n'a pas de menu de sections

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

#### Scenario: Adresse du choix du type
- **WHEN** l'utilisateur ouvre l'adresse `/thermostats/new`, sans section
- **THEN** l'écran de choix du type est affiché, avec le brouillon de création en cours s'il existe, sinon avec un brouillon nouveau

#### Scenario: Section d'une création
- **WHEN** l'utilisateur ouvre l'adresse de la section Avancé d'une création de thermostat, directement ou par l'historique
- **THEN** la section Avancé d'une création est affichée, avec le brouillon de création en cours s'il existe, sinon avec un brouillon nouveau

#### Scenario: Section absente de la création
- **WHEN** l'URL désigne une section qui ne fait pas partie de la création, comme les presets
- **THEN** la première section de la création, Principal, est affichée avec un message d'explication

### Requirement: Onglet Dashboard
L'onglet Dashboard SHALL ouvrir par défaut la page Overview, qui affiche les widgets `global_widget`. Son menu SHALL lister cette page puis les pages `global_page`.

#### Scenario: Ouverture du dashboard
- **WHEN** l'utilisateur ouvre l'onglet Dashboard
- **THEN** la page Overview s'affiche avec les widgets globaux et le menu liste les pages globales

### Requirement: Onglet Thermostats
L'onglet Thermostats SHALL afficher par défaut la liste des thermostats en pleine largeur, sans menu de gauche. Après sélection d'un thermostat, son menu SHALL commencer par un sélecteur de thermostat, puis la vue d'ensemble (widgets `thermostat_widget`), puis les entrées `thermostat_config`.

#### Scenario: Liste
- **WHEN** l'utilisateur ouvre l'onglet Thermostats
- **THEN** la liste s'affiche en pleine largeur sans menu

#### Scenario: Sélection
- **WHEN** l'utilisateur sélectionne un thermostat
- **THEN** le menu affiche le sélecteur, la vue d'ensemble puis les sections de configuration

#### Scenario: Changement de thermostat
- **WHEN** l'utilisateur change de thermostat dans le sélecteur alors que la section TPI est ouverte
- **THEN** la section TPI du nouveau thermostat est ouverte si elle existe pour lui

#### Scenario: Section absente pour le nouveau thermostat
- **WHEN** la section ouverte n'existe pas pour le nouveau thermostat
- **THEN** la vue d'ensemble du nouveau thermostat est ouverte

### Requirement: Onglet Configuration
L'icône Configuration SHALL ouvrir un menu en deux groupes : "Versatile Thermostat" (sections de la configuration générale) puis "Dashboard" (état des plugins et mode développement), suivis des entrées de plugins qui ciblent cet onglet.

#### Scenario: Menu de configuration
- **WHEN** l'utilisateur ouvre la configuration
- **THEN** le menu affiche le groupe "Versatile Thermostat", puis le groupe "Dashboard"

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

### Requirement: Thème hérité de Home Assistant
Le dashboard SHALL utiliser les variables de thème de Home Assistant (couleurs, polices, modes clair et sombre) pour son apparence, sans valeur de couleur propre figée.

#### Scenario: Changement de thème
- **WHEN** l'utilisateur sélectionne un autre thème Home Assistant
- **THEN** le dashboard reflète les couleurs du nouveau thème sans rechargement manuel de la page

#### Scenario: Mode sombre
- **WHEN** le thème actif de Home Assistant est en mode sombre
- **THEN** le dashboard s'affiche en mode sombre

### Requirement: Dashboard sans plugin tiers
Le dashboard SHALL fonctionner avec les seuls plugins natifs, quand aucun plugin UI tiers n'est enregistré.

#### Scenario: Aucun plugin tiers
- **WHEN** la liste de chargement ne contient que les plugins natifs
- **THEN** le dashboard affiche les éléments du cœur sans erreur

### Requirement: Dépendance à Versatile Thermostat
Le `manifest.json` de l'extension SHALL déclarer la dépendance à l'intégration `versatile_thermostat`. Home Assistant ne SHALL donc charger l'extension que lorsque Versatile Thermostat est chargé.

#### Scenario: Versatile Thermostat absent
- **WHEN** l'intégration Versatile Thermostat n'est pas installée ou n'a pas démarré
- **THEN** Home Assistant ne charge pas l'extension, journalise la dépendance manquante et n'affiche pas l'élément "Versatile Thermostat"

#### Scenario: Versatile Thermostat présent
- **WHEN** l'intégration Versatile Thermostat est chargée
- **THEN** l'extension est chargée et l'élément "Versatile Thermostat" apparaît

### Requirement: Absence de thermostat
Le dashboard SHALL afficher un message explicite s'il n'existe aucun thermostat Versatile Thermostat.

#### Scenario: Aucun thermostat
- **WHEN** aucun thermostat Versatile Thermostat n'est configuré
- **THEN** le dashboard affiche un message indiquant qu'aucun thermostat n'est disponible

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
- **WHEN** l'écran de choix du type de la création d'un thermostat est affiché sur un écran étroit
- **THEN** toucher le libellé d'un type de thermostat le sélectionne, et la zone de chaque choix fait au moins 44 px de haut

### Requirement: Aucun débordement horizontal sur mobile
Sur un écran de 360 px de large ou plus, aucune page native du dashboard SHALL ne déborder horizontalement : les textes longs (adresses, identifiants d'entité, noms de dépôt) SHALL passer à la ligne, et un contenu qui ne peut pas se réduire, comme un tableau, SHALL défiler dans son propre cadre. Seule la barre des onglets supérieurs défile horizontalement.

#### Scenario: Détail d'un complément
- **WHEN** la page de détail d'un complément dont l'adresse du dépôt est longue est affichée sur un écran de 375 px de large
- **THEN** l'adresse passe à la ligne et la page n'a pas de barre de défilement horizontale

#### Scenario: Toutes les pages natives
- **WHEN** chaque page native (Dashboard, liste et configuration des thermostats, assistant de création, configuration générale, Plugins, Développement, catalogue et détail des compléments) est affichée sur un écran de 360 px de large
- **THEN** aucun élément de la page ne dépasse la largeur de l'écran

### Requirement: Zones sûres des écrans à encoche
Le cadre du dashboard SHALL respecter les marges de zone sûre que l'application Home Assistant ou le navigateur indique (encoche, barre de navigation du système), pour que l'en-tête, le tiroir et le bas de la page, avec les actions de la dernière carte, restent visibles et utilisables.

#### Scenario: Téléphone avec encoche
- **WHEN** le dashboard est ouvert dans l'application Home Assistant sur un téléphone dont l'écran a une encoche ou une barre de navigation système
- **THEN** aucun contrôle de l'en-tête n'est sous l'encoche, et en bas de la page les actions de la dernière carte peuvent être amenées au-dessus de la barre de navigation du système

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
