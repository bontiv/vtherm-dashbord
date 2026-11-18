# complements-catalog Specification

## Purpose
Permettre de découvrir les compléments de Versatile Thermostat (intégrations, cartes, blueprints, add-ons) listés dans le catalogue du projet et d'installer ceux qui passent par le marketplace de Home Assistant (HACS), sans quitter le dashboard.

## Requirements

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
Chaque complément SHALL être affiché avec son nom, sa description dans la langue de l'utilisateur (repli sur l'anglais), son type, sa famille, son niveau de certification, son auteur et son état. Le catalogue SHALL proposer une recherche textuelle et des filtres par type, famille, certification et état. Chaque filtre SHALL ne proposer, en plus de « Tous », que les valeurs présentes parmi les compléments de la page ouverte.

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

#### Scenario: Filtre d'état des Installés
- **WHEN** l'utilisateur ouvre le filtre d'état de la page "Installés"
- **THEN** il ne propose ni "Non installé" ni "Installation manuelle"

#### Scenario: Valeur absente du catalogue
- **WHEN** aucun complément de la page n'a la famille "Algorithme"
- **THEN** le filtre de famille ne propose pas "Algorithme"

### Requirement: Descriptions sûres
Les descriptions du catalogue contiennent du HTML. Le dashboard SHALL n'en afficher que les balises de mise en forme simples (paragraphes, liens, emphase, listes, code) et SHALL retirer scripts, gestionnaires d'événements et styles. Les liens SHALL s'ouvrir dans un nouvel onglet sans transmettre le référent.

#### Scenario: Script dans une description
- **WHEN** une description contient une balise de script ou un attribut d'événement
- **THEN** ils ne sont pas rendus ni exécutés

#### Scenario: Lien externe
- **WHEN** l'utilisateur clique sur un lien d'une description
- **THEN** la cible s'ouvre dans un nouvel onglet

### Requirement: Détail d'un complément
Le dashboard SHALL afficher une page de détail par complément, avec une route propre et le fil d'ariane "VT Compléments > Catalogue > nom". La page SHALL être composée d'un en-tête (nom, badges, description du catalogue en chapeau), d'une carte d'action (statut, action principale, versions, avertissements, auteur, type, famille, certification, liens) et d'une carte "Documentation". Sur un écran large, la carte d'action SHALL être à côté de la documentation et rester visible pendant son défilement ; sur un écran étroit, les cartes SHALL s'empiler dans l'ordre en-tête, action, documentation. Le lien de source SHALL afficher `owner/name` pour un dépôt GitHub, sinon le nom d'hôte de l'adresse. La page SHALL ne pas répéter le fil d'ariane par un lien de retour, sauf quand le complément est introuvable.

#### Scenario: Ouverture du détail
- **WHEN** l'utilisateur sélectionne un complément
- **THEN** la page de détail s'affiche et le fil d'ariane indique "VT Compléments > Catalogue > nom du complément"

#### Scenario: Lien direct
- **WHEN** l'utilisateur recharge la page de détail
- **THEN** le même complément est affiché

#### Scenario: Écran large
- **WHEN** la page d'un complément est affichée sur un écran large et que l'utilisateur fait défiler sa documentation
- **THEN** la carte d'action reste visible à côté de la documentation

#### Scenario: Écran de téléphone
- **WHEN** la page d'un complément est affichée sur un écran de 375 px de large
- **THEN** l'en-tête puis la carte d'action, avec son action principale, sont affichés avant la documentation

#### Scenario: Lien de source
- **WHEN** la page de détail d'un complément dont le dépôt est `jmcollin78/vtherm_heating_failure_detection` est affichée
- **THEN** le lien de source affiche "jmcollin78/vtherm_heating_failure_detection" et s'ouvre dans un nouvel onglet

#### Scenario: Largeur de lecture
- **WHEN** la page de détail est affichée sur un écran large
- **THEN** les lignes de la documentation ne dépassent pas environ 75 caractères

#### Scenario: Complément introuvable
- **WHEN** l'adresse désigne un complément absent du catalogue
- **THEN** la page le dit et propose un lien vers la liste

### Requirement: États d'installation
L'état de chaque complément SHALL être déduit de Home Assistant et de HACS : non installé, installé, redémarrage requis, à configurer, configuré, ou installation manuelle (non installable par le dashboard). Les états SHALL rester exacts après un redémarrage de Home Assistant sans stockage propre au dashboard.

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

#### Scenario: Complément que le dashboard n'installe pas
- **WHEN** un complément est un blueprint, un add-on de Home Assistant ou d'un type inconnu
- **THEN** l'état est "installation manuelle"

### Requirement: Prérequis HACS
L'installation SHALL exiger HACS installé, configuré et actif. Sans HACS, le catalogue SHALL rester consultable et les actions d'installation SHALL être désactivées avec une explication et un lien vers la documentation de HACS.

#### Scenario: HACS absent
- **WHEN** l'intégration HACS n'est pas chargée
- **THEN** le bouton d'installation est désactivé et un message indique que HACS est requis

#### Scenario: HACS désactivé
- **WHEN** HACS signale qu'il est désactivé
- **THEN** le message affiche la raison fournie par HACS

### Requirement: Confirmation avant installation
Avant toute installation, le dashboard SHALL demander une confirmation qui indique le dépôt, sous forme de lien qui s'ouvre dans un nouvel onglet, la catégorie HACS traduite dans la langue de l'utilisateur, le niveau de certification et l'auteur. Pour un complément de niveau "community", la confirmation SHALL ajouter un avertissement indiquant qu'il s'agit de code tiers installé sur Home Assistant.

#### Scenario: Complément officiel
- **WHEN** l'utilisateur lance l'installation d'un complément "official"
- **THEN** la confirmation affiche dépôt, catégorie, certification et auteur

#### Scenario: Catégorie traduite
- **WHEN** la langue de l'utilisateur est le français et que la catégorie HACS du complément est `integration`
- **THEN** la confirmation affiche "Intégration", et non la valeur brute `integration`

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
Un complément de type `blueprint`, `addon` ou inconnu SHALL être affiché avec sa description et un lien (`url` ou dépôt), SHALL ne pas être installé par le dashboard, et SHALL proposer dans sa carte d'action ce qu'il faut faire. Un blueprint qui a une `url` SHALL proposer "Importer dans Home Assistant", qui ouvre la fenêtre d'import de blueprints de Home Assistant. Un add-on SHALL proposer "Ajouter le dépôt à Home Assistant", qui ouvre la fenêtre d'ajout de dépôt d'add-ons de Home Assistant, quand le Supervisor est présent, et sinon SHALL indiquer qu'il demande Home Assistant OS ou Supervised. Quand l'intégration `my` de Home Assistant n'est pas chargée, la page SHALL donner l'adresse à copier et un lien vers la page de Home Assistant concernée.

#### Scenario: Blueprint
- **WHEN** l'utilisateur ouvre le détail d'un blueprint qui a une `url`, et que l'intégration `my` est chargée
- **THEN** la carte d'action propose "Importer dans Home Assistant", qui ouvre la fenêtre d'import de Home Assistant avec cette adresse, et aucun bouton d'installation par HACS

#### Scenario: Add-on avec Supervisor
- **WHEN** l'utilisateur ouvre le détail d'un add-on, que le Supervisor est présent et que l'intégration `my` est chargée
- **THEN** la carte d'action propose "Ajouter le dépôt à Home Assistant", qui ouvre la fenêtre d'ajout de dépôt de Home Assistant avec l'adresse du dépôt

#### Scenario: Add-on sans Supervisor
- **WHEN** l'utilisateur ouvre le détail d'un add-on et que le Supervisor est absent
- **THEN** la carte d'action indique que les add-ons demandent Home Assistant OS ou Supervised, et propose le lien vers le dépôt

#### Scenario: Sans l'intégration my
- **WHEN** l'utilisateur ouvre le détail d'un blueprint et que l'intégration `my` n'est pas chargée
- **THEN** la carte d'action affiche l'adresse du blueprint avec un bouton pour la copier, et un lien vers la page des blueprints de Home Assistant

#### Scenario: Type inconnu
- **WHEN** une entrée a un type absent de la liste connue
- **THEN** elle est affichée à l'état "installation manuelle", avec le lien vers sa source

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
Le dashboard SHALL indiquer l'état installé d'un complément, sa version installée et, quand HACS en connaît une plus récente, la version disponible. Il SHALL renvoyer vers HACS pour la mise à jour ou la suppression, sans les implémenter.

#### Scenario: Complément installé
- **WHEN** l'utilisateur ouvre le détail d'un complément installé par HACS
- **THEN** la page affiche la version installée et propose un lien vers sa fiche dans HACS pour la mise à jour ou la suppression

#### Scenario: Pas de mise à jour faite par le dashboard
- **WHEN** une mise à jour est disponible pour un complément
- **THEN** le dashboard propose d'ouvrir le complément dans HACS et n'appelle aucune commande de téléchargement de HACS

### Requirement: Statut d'un complément
L'état d'un complément SHALL être affiché comme un statut distinct de son type, de sa famille et de sa certification, avec une icône et un texte, pas seulement une couleur. Le texte d'un statut SHALL avoir un contraste d'au moins 4,5:1 avec son fond, dans le thème clair comme dans le thème sombre de Home Assistant.

#### Scenario: Complément à configurer
- **WHEN** un complément est à l'état "À configurer" dans le thème clair
- **THEN** son statut "À configurer" est affiché avec une icône, séparé des métadonnées, et son texte a un contraste d'au moins 4,5:1

#### Scenario: Thème sombre
- **WHEN** le thème sombre est actif
- **THEN** chaque statut garde un contraste d'au moins 4,5:1

### Requirement: Mise à jour disponible
Un complément installé par HACS SHALL être signalé "Mise à jour disponible" quand HACS indique une mise à jour en attente ou une version disponible différente de la version installée. Cette indication SHALL s'ajouter à son état sans le remplacer.

#### Scenario: Version plus récente
- **WHEN** HACS indique la version installée 1.2.0 et la version disponible 1.3.0 pour un complément configuré
- **THEN** le complément garde l'état "Configuré", porte l'indication "Mise à jour disponible", et sa carte comme sa page affichent "1.2.0 → 1.3.0"

#### Scenario: À jour
- **WHEN** la version installée et la version disponible sont identiques
- **THEN** aucune indication de mise à jour n'est affichée

### Requirement: Carte d'un complément
Dans les listes, toute la surface de la carte d'un complément SHALL ouvrir sa page de détail, avec un retour visuel au survol et au focus clavier. La carte d'un complément qui demande une action SHALL proposer directement cette action : "Configurer" pour "À configurer", "Redémarrer Home Assistant" pour "Redémarrage requis", "Ouvrir dans HACS" pour une mise à jour disponible.

#### Scenario: Ouverture par la carte
- **WHEN** l'utilisateur clique dans la description d'une carte
- **THEN** la page de détail du complément s'ouvre

#### Scenario: Action directe
- **WHEN** l'utilisateur clique sur "Configurer" dans la carte d'un complément à configurer
- **THEN** le config flow de Home Assistant s'ouvre pour son domaine, sans passer par la page de détail

#### Scenario: Redémarrage depuis une carte
- **WHEN** l'utilisateur clique sur "Redémarrer Home Assistant" dans une carte
- **THEN** la même confirmation que sur la page de détail est demandée avant tout redémarrage

#### Scenario: Navigation au clavier
- **WHEN** l'utilisateur parcourt la liste avec la touche Tab
- **THEN** chaque carte reçoit le focus avec un indicateur visible, puis son action directe s'il y en a une

### Requirement: Compléments à traiter
Le plugin SHALL considérer comme à traiter un complément à l'état "À configurer" ou "Redémarrage requis", ou signalé "Mise à jour disponible". Le filtre d'état SHALL proposer l'option "À traiter". Quand au moins un complément est à traiter, les pages "Catalogue" et "Installés" SHALL afficher un résumé de leur nombre avec un lien vers "Installés" filtrés sur "À traiter".

#### Scenario: Résumé
- **WHEN** un complément est à configurer et un autre a une mise à jour disponible
- **THEN** les pages "Catalogue" et "Installés" affichent "2 compléments demandent une action"

#### Scenario: Lien du résumé
- **WHEN** l'utilisateur suit le lien du résumé
- **THEN** la page "Installés" s'ouvre avec le filtre d'état "À traiter"

#### Scenario: Rien à traiter
- **WHEN** aucun complément n'est à traiter
- **THEN** aucun résumé n'est affiché

### Requirement: Filtres sur un écran étroit
Sur un écran étroit, la recherche SHALL rester visible et les filtres de type, de famille, de certification et d'état SHALL être repliés derrière un bouton "Filtres" qui indique le nombre de filtres actifs. Sur tout écran, un filtre à "Tous" SHALL ne pas afficher de bouton d'effacement.

#### Scenario: Écran de téléphone
- **WHEN** le catalogue est ouvert sur un écran de 375 px de large
- **THEN** la première carte est visible sans défilement, et le bouton "Filtres" ouvre les quatre filtres

#### Scenario: Filtre actif replié
- **WHEN** le filtre de type vaut "Intégration" sur un écran étroit
- **THEN** le bouton indique "Filtres (1)"

#### Scenario: Filtre à Tous
- **WHEN** un filtre vaut "Tous"
- **THEN** il n'affiche pas de bouton d'effacement

### Requirement: Compteur, réinitialisation et tri
Une liste SHALL indiquer le nombre de compléments affichés et SHALL proposer "Effacer les filtres" dès qu'une recherche ou un filtre est actif, y compris dans le message de liste vide. Elle SHALL proposer un tri par certification (par défaut), par nom ou par état. Le tri par certification SHALL regrouper les cartes sous les intitulés Officiel, Recommandé et Communautaire.

#### Scenario: Compteur
- **WHEN** le filtre de type vaut "Intégration" et que 13 compléments correspondent
- **THEN** la liste indique "13 compléments"

#### Scenario: Liste vide
- **WHEN** la recherche ne correspond à aucun complément
- **THEN** le message de liste vide propose "Effacer les filtres", qui vide la recherche et remet les filtres à "Tous"

#### Scenario: Tri par certification
- **WHEN** la liste est ouverte sans choix de tri
- **THEN** les cartes sont groupées sous "Officiel", "Recommandé" puis "Communautaire"

#### Scenario: Tri par état
- **WHEN** l'utilisateur choisit le tri par état
- **THEN** les compléments à traiter viennent en premier

### Requirement: Filtres dans l'adresse
La recherche, les filtres et le tri d'une liste SHALL être gardés dans l'adresse de la page, de sorte qu'un rechargement ou un lien partagé rouvre la même liste. Ouvrir un complément puis revenir à la liste SHALL retrouver les mêmes critères.

#### Scenario: Rechargement
- **WHEN** l'utilisateur filtre le catalogue sur le type "Intégration" puis recharge la page
- **THEN** le catalogue s'affiche filtré sur "Intégration"

#### Scenario: Retour depuis un complément
- **WHEN** l'utilisateur ouvre un complément depuis une liste filtrée puis revient par le fil d'ariane
- **THEN** la liste garde sa recherche, ses filtres et son tri

### Requirement: Liens aux couleurs du thème
Les liens des pages des compléments SHALL utiliser la couleur primaire du thème de Home Assistant, et non la couleur par défaut du navigateur.

#### Scenario: Liens de la page de détail
- **WHEN** la page de détail d'un complément installé est affichée, en clair ou en sombre
- **THEN** le lien de source et le lien vers HACS ont la couleur primaire du thème

### Requirement: Repli anglais signalé
Une description ou une documentation affichée en anglais parce qu'il n'en existe pas dans la langue de l'utilisateur SHALL être marquée "(EN)" et déclarée en anglais pour les lecteurs d'écran.

#### Scenario: Description sans traduction
- **WHEN** la langue de l'utilisateur est le français et que l'entrée n'a pas de `description_fr`
- **THEN** la description anglaise est affichée avec la marque "(EN)" et l'attribut de langue `en`

#### Scenario: Description traduite
- **WHEN** l'entrée a une description dans la langue de l'utilisateur
- **THEN** aucune marque de langue n'est affichée

### Requirement: Compléments expérimentaux
Un nom de complément qui commence par `[EXPERIMENTAL]`, quelle que soit la casse, SHALL être affiché sans ce préfixe et avec un badge "Expérimental". La recherche SHALL continuer de trouver ce complément par son nom complet. La page de détail d'un complément expérimental SHALL afficher dans sa carte d'action un avertissement indiquant qu'il peut changer ou cesser de fonctionner.

#### Scenario: Préfixe dans le catalogue
- **WHEN** le catalogue contient le nom "[EXPERIMENTAL] An AI assistant to help with your VTherm"
- **THEN** la carte affiche "An AI assistant to help with your VTherm" et un badge "Expérimental"

#### Scenario: Page d'un complément expérimental
- **WHEN** l'utilisateur ouvre la page de "[EXPERIMENTAL] An AI assistant to help with your VTherm"
- **THEN** la carte d'action affiche l'avertissement sur le caractère expérimental

### Requirement: Libellés des métadonnées traduits
Les libellés et séparateurs des métadonnées d'un complément, comme l'auteur, SHALL venir du catalogue de traductions, pour respecter la typographie de chaque langue.

#### Scenario: Auteur en français
- **WHEN** la langue de l'utilisateur est le français
- **THEN** une carte affiche "Auteur : jmcollin78", avec une espace avant les deux-points

### Requirement: Retours à la ligne des descriptions
Un retour à la ligne à l'intérieur d'un paragraphe ou d'un élément de liste d'une description du catalogue SHALL être affiché comme un retour à la ligne, sans ajouter de ligne vide entre les paragraphes.

#### Scenario: Liste écrite ligne par ligne
- **WHEN** un paragraphe de la description contient cinq lignes séparées par des retours à la ligne
- **THEN** la page de détail affiche ces cinq lignes l'une sous l'autre

### Requirement: README d'un complément
La carte "Documentation" d'un complément qui a un dépôt GitHub SHALL afficher le README mis en forme, dans la langue de l'utilisateur si le dépôt en a une version, sinon le README principal (marqué "(EN)"). Liens et images relatifs SHALL pointer vers le dépôt ; les liens SHALL s'ouvrir dans un nouvel onglet. Sans README lisible, la carte SHALL afficher la description du catalogue et un lien vers la source.

#### Scenario: README affiché
- **WHEN** l'utilisateur ouvre la page de "Versatile Card UI"
- **THEN** la carte "Documentation" affiche le README du dépôt `jmcollin78/versatile-thermostat-ui-card`, avec ses images

#### Scenario: Image relative
- **WHEN** le README contient l'image `images/icon.png`
- **THEN** l'image est chargée depuis le dépôt du complément

#### Scenario: README dans la langue de l'utilisateur
- **WHEN** la langue de l'utilisateur est le français et que le dépôt contient un README en français
- **THEN** ce README est affiché sans la marque "(EN)"

#### Scenario: README indisponible
- **WHEN** le README ne peut pas être lu
- **THEN** la carte "Documentation" affiche la description du catalogue et un lien vers la source, et le reste de la page reste utilisable

#### Scenario: Complément sans dépôt
- **WHEN** l'utilisateur ouvre la page d'un blueprint publié hors d'un dépôt GitHub
- **THEN** la carte "Documentation" affiche la description du catalogue

### Requirement: Lecture du README réservée au catalogue
Le README SHALL être lu par le serveur de Home Assistant, pour un administrateur seulement, à partir de l'identifiant d'un complément du catalogue, et SHALL être gardé en cache une heure. Aucune commande SHALL permettre de lire le README d'un dépôt absent du catalogue.

#### Scenario: Identifiant hors catalogue
- **WHEN** la commande de lecture du README reçoit un identifiant qui n'est pas dans le catalogue
- **THEN** elle répond par une erreur et ne contacte pas GitHub

#### Scenario: Utilisateur non administrateur
- **WHEN** un utilisateur non administrateur demande un README
- **THEN** la commande est refusée

#### Scenario: Cache
- **WHEN** le même README est demandé deux fois dans l'heure
- **THEN** GitHub n'est contacté qu'une fois

### Requirement: Titre de l'onglet du navigateur
Quand la page d'un complément est affichée, le titre de l'onglet du navigateur SHALL commencer par le nom du complément. En quittant cette page, le titre précédent SHALL être rétabli.

#### Scenario: Ouverture d'un complément
- **WHEN** l'utilisateur ouvre la page de "Versatile Card UI"
- **THEN** le titre de l'onglet du navigateur commence par "Versatile Card UI"

#### Scenario: Retour à la liste
- **WHEN** l'utilisateur revient à la liste
- **THEN** le titre de l'onglet est celui qu'il avait avant l'ouverture du complément

### Requirement: Affichage sans attendre HACS
Les pages des compléments SHALL s'afficher dès que le catalogue est lu, sans attendre la liste des dépôts de HACS. Tant que HACS n'a pas répondu, les états qui en dépendent SHALL être indiqués comme en cours de lecture, et aucune action qui en dépend SHALL être proposée.

#### Scenario: HACS lent
- **WHEN** le catalogue est lu et que HACS n'a pas encore répondu
- **THEN** la page d'un complément affiche son nom, sa documentation et le fil d'ariane complet, et son statut indique la lecture en cours

#### Scenario: Réponse de HACS
- **WHEN** HACS répond ensuite
- **THEN** les états et les actions s'affichent sans recharger la page
