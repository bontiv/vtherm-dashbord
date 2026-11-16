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
Un onglet supérieur qui a des entrées SHALL afficher à gauche un menu construit par les contributions. Le menu SHALL défiler verticalement quand il dépasse la hauteur disponible, sans faire défiler le reste de la page. L'entrée courante SHALL être mise en évidence, et les contributions masquées ne SHALL pas apparaître.

#### Scenario: Menu plus long que l'écran
- **WHEN** le menu contient plus d'entrées que la hauteur de la fenêtre ne permet d'en afficher
- **THEN** il défile seul et l'entrée courante reste accessible

#### Scenario: Entrée masquée
- **WHEN** la condition de visibilité d'une entrée est fausse
- **THEN** l'entrée n'apparaît pas dans le menu

### Requirement: Fil d'ariane
Le dashboard SHALL afficher sous les onglets un fil d'ariane composé de l'onglet supérieur, du thermostat sélectionné le cas échéant, puis du titre de l'entrée courante. Chaque segment sauf le dernier SHALL être cliquable.

#### Scenario: Section d'un thermostat
- **WHEN** l'utilisateur ouvre la section TPI du thermostat Salon
- **THEN** le fil d'ariane affiche "Thermostats > Salon > TPI"

#### Scenario: Section de configuration générale
- **WHEN** l'utilisateur ouvre la section Window de la configuration générale
- **THEN** le fil d'ariane affiche "Configuration > Window"

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
Sur un écran étroit, le menu de gauche SHALL devenir un tiroir ouvert par un bouton, la barre d'onglets supérieurs SHALL défiler horizontalement en gardant la roue crantée visible, et le fil d'ariane SHALL se limiter à ses deux derniers segments.

#### Scenario: Écran étroit
- **WHEN** la largeur de la fenêtre est inférieure au seuil mobile
- **THEN** le menu est replié dans un tiroir, la roue crantée reste visible et le fil d'ariane affiche au plus deux segments

#### Scenario: Ouverture du tiroir
- **WHEN** l'utilisateur appuie sur le bouton du menu
- **THEN** le tiroir s'ouvre et se referme après le choix d'une entrée

### Requirement: Contexte transmis aux contributions
Chaque contribution SHALL recevoir l'objet `hass` de Home Assistant. Les contributions par thermostat SHALL aussi recevoir l'identifiant du thermostat concerné.

#### Scenario: Contribution par thermostat
- **WHEN** un widget `thermostat_widget` est affiché pour un thermostat
- **THEN** il reçoit l'identifiant de ce thermostat et l'objet `hass`

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
