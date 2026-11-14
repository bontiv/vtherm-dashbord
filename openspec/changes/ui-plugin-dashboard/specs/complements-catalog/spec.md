# Spec Delta

## Purpose

Permettre de découvrir les compléments de Versatile Thermostat (intégrations, cartes, blueprints, add-ons) listés dans le catalogue du projet et d'installer ceux qui passent par le marketplace de Home Assistant (HACS), sans quitter le dashboard.

## ADDED Requirements

### Requirement: Plugin natif Compléments
Le dashboard SHALL fournir un plugin natif `core_complements`, enregistré comme les autres plugins, qui ajoute l'onglet supérieur "VT Compléments" (`core_complements.top.complements`, zone `start`, placé après Thermostats) et deux entrées de menu : "Catalogue" et "Installés". Le titre de l'onglet est préfixé par "VT" dans toutes les langues.

#### Scenario: Onglet présent
- **WHEN** seuls les plugins natifs sont chargés
- **THEN** la barre contient Dashboard, Thermostats et VT Compléments à gauche, et la roue crantée à droite

#### Scenario: Titre selon la langue
- **WHEN** la langue de l'utilisateur est l'anglais, le français ou l'allemand
- **THEN** le titre de l'onglet est respectivement "VT add-ons", "VT Compléments" et "VT-Erweiterungen"

#### Scenario: Menu de l'onglet
- **WHEN** l'utilisateur ouvre l'onglet VT Compléments
- **THEN** le menu propose "Catalogue" puis "Installés"

#### Scenario: Remplacement par un plugin tiers
- **WHEN** un plugin tiers déclare `remove: core_complements.top.complements`
- **THEN** l'onglet n'est plus affiché

### Requirement: Catalogue distant
Le dashboard SHALL lire le catalogue de compléments publié à l'adresse `https://raw.githubusercontent.com/bontiv/vtherm-website/latest/pluginsdb/plugins.json`. La lecture SHALL être faite par le serveur de Home Assistant, mise en cache, et rafraîchissable manuellement.

#### Scenario: Lecture réussie
- **WHEN** l'utilisateur ouvre le catalogue
- **THEN** les compléments du catalogue sont affichés

#### Scenario: Catalogue indisponible
- **WHEN** le catalogue ne peut pas être lu et qu'une copie précédente existe
- **THEN** la copie est affichée avec son ancienneté et un avertissement

#### Scenario: Aucune copie disponible
- **WHEN** le catalogue ne peut pas être lu et qu'aucune copie n'existe
- **THEN** un message d'erreur explicite est affiché avec un bouton pour réessayer

#### Scenario: Rafraîchissement manuel
- **WHEN** l'utilisateur demande un rafraîchissement
- **THEN** le catalogue est relu sans attendre l'expiration du cache

### Requirement: Entrées de catalogue tolérantes
Une entrée de catalogue SHALL être identifiée par `slug`, à défaut par `url`, puis par `name`. Les champs absents (`description_de`, `ha_domain`, `author`, `slug`) SHALL être tolérés. Une entrée sans nom ni type valide SHALL être ignorée avec un avertissement enregistré, sans empêcher l'affichage des autres.

#### Scenario: Entrée sans slug
- **WHEN** une entrée de type blueprint n'a qu'une `url`
- **THEN** elle est affichée et identifiée par son `url`

#### Scenario: Entrée invalide
- **WHEN** une entrée n'a ni `name` ni `type`
- **THEN** elle est ignorée et un avertissement est enregistré

### Requirement: Affichage et filtrage
Chaque complément SHALL être affiché avec son nom, sa description dans la langue de l'utilisateur (repli sur l'anglais), son type, sa famille, son niveau de certification, son auteur et son état. Le catalogue SHALL proposer une recherche textuelle et des filtres par type, famille, certification et état.

#### Scenario: Description localisée
- **WHEN** la langue de l'utilisateur est le français et que `description_fr` existe
- **THEN** la description française est affichée

#### Scenario: Langue sans traduction
- **WHEN** l'entrée n'a pas de description dans la langue de l'utilisateur
- **THEN** la description anglaise est affichée

#### Scenario: Recherche
- **WHEN** l'utilisateur saisit un texte
- **THEN** seuls les compléments dont le nom ou la description contient ce texte restent affichés

#### Scenario: Entrée "Installés"
- **WHEN** l'utilisateur ouvre "Installés"
- **THEN** seuls les compléments installés sont listés

### Requirement: Descriptions sûres
Les descriptions du catalogue contiennent du HTML. Le dashboard SHALL n'en afficher que les balises de mise en forme simples (paragraphes, liens, emphase, listes, code) et SHALL retirer scripts, gestionnaires d'événements et styles. Les liens SHALL s'ouvrir dans un nouvel onglet sans transmettre le référent.

#### Scenario: Script dans une description
- **WHEN** une description contient une balise de script ou un attribut d'événement
- **THEN** ils ne sont pas rendus ni exécutés

#### Scenario: Lien externe
- **WHEN** l'utilisateur clique sur un lien d'une description
- **THEN** la cible s'ouvre dans un nouvel onglet

### Requirement: Détail d'un complément
Le dashboard SHALL afficher une page de détail par complément, avec une route propre, le fil d'ariane "VT Compléments > Catalogue > nom", la description complète, le lien vers le dépôt (déduit du `slug`) ou l'`url`, et les actions disponibles.

#### Scenario: Ouverture du détail
- **WHEN** l'utilisateur sélectionne un complément
- **THEN** la page de détail s'affiche et le fil d'ariane indique "VT Compléments > Catalogue > nom du complément"

#### Scenario: Lien direct
- **WHEN** l'utilisateur recharge la page de détail
- **THEN** le même complément est affiché

### Requirement: États d'installation
L'état de chaque complément SHALL être déduit de Home Assistant et de HACS : non installé, installé, redémarrage requis, à configurer, configuré, ou lien seul (non installable par le dashboard). Les états SHALL rester exacts après un redémarrage de Home Assistant sans stockage propre au dashboard.

#### Scenario: Intégration installée par HACS avant redémarrage
- **WHEN** HACS signale un complément installé avec redémarrage en attente
- **THEN** l'état est "redémarrage requis"

#### Scenario: Après redémarrage
- **WHEN** l'intégration est chargée, déclare un config flow et n'a aucune entrée de configuration
- **THEN** l'état est "à configurer"

#### Scenario: Intégration configurée
- **WHEN** l'intégration a au moins une entrée de configuration
- **THEN** l'état est "configuré"

#### Scenario: Installation hors HACS
- **WHEN** le domaine d'une intégration du catalogue est chargé sans dépôt HACS correspondant
- **THEN** l'état est "installé"

### Requirement: Prérequis HACS
L'installation SHALL exiger HACS installé, configuré et actif. Sans HACS, le catalogue SHALL rester consultable et les actions d'installation SHALL être désactivées avec une explication et un lien vers la documentation de HACS.

#### Scenario: HACS absent
- **WHEN** l'intégration HACS n'est pas chargée
- **THEN** le bouton d'installation est désactivé et un message indique que HACS est requis

#### Scenario: HACS désactivé
- **WHEN** HACS signale qu'il est désactivé
- **THEN** le message affiche la raison fournie par HACS

### Requirement: Confirmation avant installation
Avant toute installation, le dashboard SHALL demander une confirmation qui indique le dépôt, la catégorie HACS, le niveau de certification et l'auteur. Pour un complément de niveau "community", la confirmation SHALL ajouter un avertissement indiquant qu'il s'agit de code tiers installé sur Home Assistant.

#### Scenario: Complément officiel
- **WHEN** l'utilisateur lance l'installation d'un complément "official"
- **THEN** la confirmation affiche dépôt, catégorie, certification et auteur

#### Scenario: Complément communautaire
- **WHEN** l'utilisateur lance l'installation d'un complément "community"
- **THEN** la confirmation ajoute l'avertissement sur le code tiers

#### Scenario: Annulation
- **WHEN** l'utilisateur annule la confirmation
- **THEN** aucune modification n'est faite dans HACS

### Requirement: Installation d'une intégration par HACS
Pour un complément de type `integration`, le dashboard SHALL ajouter son dépôt à HACS s'il n'y figure pas déjà (catégorie `integration`, ou `hacs_category` du catalogue), puis télécharger la dernière version. Chaque étape SHALL être affichée, et une erreur de HACS SHALL être montrée avec son message.

#### Scenario: Dépôt absent de HACS
- **WHEN** l'utilisateur confirme l'installation d'un complément absent de HACS
- **THEN** le dépôt est ajouté à HACS, puis téléchargé, avec la progression affichée

#### Scenario: Dépôt déjà présent
- **WHEN** le dépôt figure déjà dans HACS sans être installé
- **THEN** il n'est pas ajouté une seconde fois et le téléchargement est lancé

#### Scenario: Ajout silencieusement refusé
- **WHEN** HACS répond sans erreur mais que le dépôt n'apparaît pas dans sa liste
- **THEN** le dashboard signale l'échec de l'ajout avec la cause connue ou un message générique

#### Scenario: Erreur de téléchargement
- **WHEN** HACS renvoie une erreur de téléchargement
- **THEN** l'erreur est affichée et l'installation peut être relancée

### Requirement: Redémarrage proposé après installation
Après l'installation d'une intégration, le dashboard SHALL proposer le redémarrage de Home Assistant, avec une confirmation explicite, et SHALL refléter l'état "redémarrage requis" tant que le redémarrage n'a pas eu lieu. Le dashboard SHALL ne jamais redémarrer Home Assistant sans confirmation.

#### Scenario: Proposition
- **WHEN** l'installation d'une intégration se termine
- **THEN** le dashboard propose le redémarrage sans l'exécuter

#### Scenario: Redémarrage reporté
- **WHEN** l'utilisateur reporte le redémarrage
- **THEN** le complément reste "redémarrage requis" et l'installation d'autres compléments reste possible

#### Scenario: Reconnexion
- **WHEN** Home Assistant redémarre après la confirmation
- **THEN** le dashboard affiche l'état de reconnexion puis reprend à l'état déduit du complément

### Requirement: Configuration par le config flow
Pour une intégration à l'état "à configurer", le dashboard SHALL proposer une action de configuration qui ouvre le config flow de Home Assistant pour ce domaine. L'action SHALL n'être proposée que si l'intégration déclare un config flow.

#### Scenario: Action de configuration
- **WHEN** l'utilisateur déclenche la configuration d'une intégration "à configurer"
- **THEN** le config flow de Home Assistant s'ouvre pour le domaine du complément

#### Scenario: Intégration sans config flow
- **WHEN** l'intégration installée ne déclare pas de config flow
- **THEN** aucune action de configuration n'est proposée et l'état est "installé"

### Requirement: Compléments d'interface
Pour un complément de type `interface`, le dashboard SHALL l'installer par HACS dans la catégorie `plugin` (ou `hacs_category`) sans redémarrage, et SHALL indiquer qu'un rechargement de la page du navigateur est nécessaire pour l'utiliser.

#### Scenario: Carte installée
- **WHEN** l'installation d'un complément d'interface se termine
- **THEN** l'état est "installé" et un message demande de recharger la page

### Requirement: Compléments non installables par le dashboard
Un complément de type `blueprint`, `addon` ou inconnu SHALL être affiché avec sa description et un lien (`url` ou dépôt) mais SHALL ne pas proposer d'installation automatique.

#### Scenario: Blueprint
- **WHEN** l'utilisateur ouvre le détail d'un blueprint
- **THEN** la page propose le lien vers sa source et aucun bouton d'installation

#### Scenario: Type inconnu
- **WHEN** une entrée a un type absent de la liste connue
- **THEN** elle est affichée comme "lien seul"

### Requirement: Repli quand l'interface de HACS change
Les appels à HACS SHALL être isolés dans un adaptateur unique. Si un appel échoue parce que la commande n'existe plus ou que sa réponse est inattendue, le dashboard SHALL le signaler et SHALL proposer un lien qui ouvre le dépôt directement dans HACS.

#### Scenario: Commande HACS indisponible
- **WHEN** une commande WebSocket de HACS est rejetée comme inconnue
- **THEN** le dashboard affiche un message explicite et un lien d'ouverture du dépôt dans HACS

### Requirement: Accès et sécurité
L'installation SHALL être réservée aux administrateurs. Le dashboard SHALL ne proposer l'installation que de compléments du catalogue, sans saisie libre d'un dépôt.

#### Scenario: Utilisateur non administrateur
- **WHEN** un utilisateur non administrateur ouvre le dashboard
- **THEN** l'onglet VT Compléments n'est pas affiché

#### Scenario: Dépôt libre
- **WHEN** l'utilisateur cherche à installer un dépôt qui ne figure pas dans le catalogue
- **THEN** aucune action du dashboard ne le permet

### Requirement: Mises à jour et suppression hors périmètre
Le dashboard SHALL indiquer l'état installé d'un complément et SHALL renvoyer vers HACS pour sa mise à jour ou sa suppression, sans les implémenter.

#### Scenario: Complément installé
- **WHEN** l'utilisateur ouvre le détail d'un complément installé par HACS
- **THEN** la page propose un lien vers sa fiche dans HACS pour la mise à jour ou la suppression
