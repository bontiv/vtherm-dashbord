# Spec Delta

## ADDED Requirements

### Requirement: Choix de la boutique
Le dashboard SHALL installer et suivre les compléments par une « boutique » : la Marketplace intégrée à Home Assistant quand elle répond, sinon HACS. La boutique SHALL être choisie à chaque lecture de la page, sans réglage ni stockage. Les messages, boutons et liens des pages des compléments SHALL nommer la boutique choisie.

#### Scenario: Home Assistant 2026.11 avec la Marketplace
- **WHEN** Home Assistant connaît les commandes de la Marketplace
- **THEN** le dashboard installe et lit les compléments par la Marketplace, et ses textes parlent de la Marketplace

#### Scenario: Home Assistant 2026.10 avec HACS
- **WHEN** Home Assistant ne connaît pas les commandes de la Marketplace et que HACS est chargé
- **THEN** le dashboard installe et lit les compléments par HACS, comme avant

#### Scenario: Aucune boutique
- **WHEN** Home Assistant ne connaît ni les commandes de la Marketplace ni celles de HACS
- **THEN** le catalogue reste consultable, les installations sont désactivées, et le message nomme la Marketplace avec un lien vers sa documentation

#### Scenario: Marketplace présente mais pas chargée
- **WHEN** la Marketplace répond qu'elle n'est pas chargée
- **THEN** les installations sont désactivées et le message dit que la Marketplace n'est pas chargée, avec un lien vers la Marketplace

### Requirement: Avertissement de la Marketplace accepté
Avec la Marketplace, le dashboard SHALL désactiver les installations tant que l'utilisateur n'a pas accepté l'avertissement de la Marketplace, et SHALL l'expliquer avec un lien qui ouvre la Marketplace. Le dashboard SHALL ne jamais accepter cet avertissement à la place de l'utilisateur.

#### Scenario: Avertissement non accepté
- **WHEN** la Marketplace indique que l'utilisateur n'a pas accepté son avertissement
- **THEN** les boutons d'installation sont désactivés et un message invite à ouvrir la Marketplace pour l'accepter

#### Scenario: Avertissement accepté depuis la Marketplace
- **WHEN** l'utilisateur accepte l'avertissement dans la Marketplace puis revient sur le dashboard
- **THEN** les installations sont de nouveau possibles sans recharger le navigateur

### Requirement: GitHub connecté pour un dépôt absent de la Marketplace
Avec la Marketplace, l'ajout d'un dépôt qu'elle ne connaît pas demande que GitHub soit connecté. Tant que GitHub n'est pas connecté, le dashboard SHALL désactiver l'installation des seuls compléments dont le dépôt est absent de la Marketplace, et SHALL l'expliquer avec un lien vers la Marketplace. Les compléments déjà connus de la Marketplace SHALL rester installables.

#### Scenario: Dépôt inconnu sans GitHub
- **WHEN** GitHub n'est pas connecté et que le dépôt d'un complément est absent de la Marketplace
- **THEN** son bouton d'installation est désactivé et la page explique qu'il faut connecter GitHub dans la Marketplace

#### Scenario: Dépôt connu sans GitHub
- **WHEN** GitHub n'est pas connecté et que le dépôt d'un complément figure déjà dans la Marketplace
- **THEN** son installation reste possible

### Requirement: Bandeau d'avertissement
Les messages des pages des compléments SHALL être affichés avec un seul cadre. Quand Home Assistant fournit son composant de message, le dashboard SHALL ne lui ajouter ni bordure, ni marge intérieure, ni rayon ; seul le bloc de repli, sans ce composant, SHALL porter la bordure et la marge intérieure.

#### Scenario: Avec le composant de Home Assistant
- **WHEN** un avertissement est affiché sur la page des compléments et que le composant de message de Home Assistant est défini
- **THEN** le message n'a que le cadre et la barre de ce composant, sans trait supplémentaire autour ni à gauche

#### Scenario: Bloc de repli
- **WHEN** le composant de message de Home Assistant n'est pas défini
- **THEN** le message est un bloc avec une bordure de la couleur de son type et une marge intérieure

## MODIFIED Requirements

### Requirement: États d'installation
L'état de chaque complément SHALL être déduit de Home Assistant et de la boutique : non installé, installé, redémarrage requis, à configurer, configuré, ou installation manuelle (non installable par le dashboard). Les états SHALL rester exacts après un redémarrage de Home Assistant sans stockage propre au dashboard.

#### Scenario: Intégration installée par HACS avant redémarrage
- **WHEN** HACS signale un complément installé avec redémarrage en attente
- **THEN** l'état est "redémarrage requis"

#### Scenario: Intégration installée par la Marketplace avant redémarrage
- **WHEN** la Marketplace signale un complément installé avec redémarrage en attente
- **THEN** l'état est "redémarrage requis"

#### Scenario: Intégration chargée sans redémarrage
- **WHEN** la boutique a installé une intégration qui déclare un config flow, sans redémarrage en attente, et qu'elle n'a aucune entrée de configuration
- **THEN** l'état est "à configurer"

#### Scenario: Après redémarrage
- **WHEN** l'intégration est chargée, déclare un config flow et n'a aucune entrée de configuration
- **THEN** l'état est "à configurer"

#### Scenario: Intégration configurée
- **WHEN** l'intégration a au moins une entrée de configuration
- **THEN** l'état est "configuré"

#### Scenario: Installation hors HACS
- **WHEN** le domaine d'une intégration du catalogue est chargé sans dépôt correspondant dans la boutique
- **THEN** l'état est "installé"

#### Scenario: Complément que le dashboard n'installe pas
- **WHEN** un complément est un blueprint, un add-on de Home Assistant ou d'un type inconnu
- **THEN** l'état est "installation manuelle"

### Requirement: Prérequis de la boutique
L'installation SHALL exiger une boutique disponible et active : la Marketplace chargée, ou HACS installé, configuré et actif. Sans boutique, le catalogue SHALL rester consultable et les actions d'installation SHALL être désactivées avec une explication et un lien vers la documentation de la Marketplace, ou vers la Marketplace quand elle existe mais n'est pas utilisable.

#### Scenario: HACS absent
- **WHEN** ni la Marketplace ni l'intégration HACS ne sont chargées
- **THEN** le bouton d'installation est désactivé et un message indique que la Marketplace de Home Assistant est requise

#### Scenario: HACS désactivé
- **WHEN** HACS signale qu'il est désactivé
- **THEN** le message affiche la raison fournie par HACS

#### Scenario: Marketplace désactivée
- **WHEN** la Marketplace signale qu'elle est désactivée
- **THEN** le message nomme la Marketplace et affiche la raison qu'elle fournit

### Requirement: Confirmation avant installation
Avant toute installation, le dashboard SHALL demander une confirmation qui indique le dépôt, sous forme de lien qui s'ouvre dans un nouvel onglet, la catégorie de la boutique traduite dans la langue de l'utilisateur, le niveau de certification et l'auteur. Pour un complément de niveau "community", la confirmation SHALL ajouter un avertissement indiquant qu'il s'agit de code tiers installé sur Home Assistant.

#### Scenario: Complément officiel
- **WHEN** l'utilisateur lance l'installation d'un complément "official"
- **THEN** la confirmation affiche dépôt, catégorie, certification et auteur

#### Scenario: Catégorie traduite
- **WHEN** la langue de l'utilisateur est le français et que la catégorie du complément dans la boutique est `integration`
- **THEN** la confirmation affiche "Intégration", et non la valeur brute `integration`

#### Scenario: Complément communautaire
- **WHEN** l'utilisateur lance l'installation d'un complément "community"
- **THEN** la confirmation ajoute l'avertissement sur le code tiers

#### Scenario: Annulation
- **WHEN** l'utilisateur annule la confirmation
- **THEN** aucune modification n'est faite dans la boutique

### Requirement: Installation d'une intégration par la boutique
Pour un complément de type `integration`, le dashboard SHALL ajouter son dépôt à la boutique s'il n'y figure pas déjà (catégorie `integration`, ou `hacs_category` du catalogue), puis installer la dernière version. Chaque étape SHALL être affichée, et une erreur de la boutique SHALL être montrée avec son message.

#### Scenario: Dépôt absent de HACS
- **WHEN** l'utilisateur confirme l'installation d'un complément absent de la boutique
- **THEN** le dépôt est ajouté à la boutique, puis installé, avec la progression affichée

#### Scenario: Dépôt déjà présent
- **WHEN** le dépôt figure déjà dans la boutique sans être installé
- **THEN** il n'est pas ajouté une seconde fois et l'installation est lancée

#### Scenario: Ajout silencieusement refusé
- **WHEN** HACS répond sans erreur mais que le dépôt n'apparaît pas dans sa liste
- **THEN** le dashboard signale l'échec de l'ajout avec la cause connue ou un message générique

#### Scenario: Ajout refusé par la Marketplace
- **WHEN** la Marketplace répond à l'ajout par une erreur
- **THEN** le dashboard signale l'échec de l'ajout avec le message de la Marketplace

#### Scenario: Erreur de téléchargement
- **WHEN** la boutique renvoie une erreur d'installation
- **THEN** l'erreur est affichée et l'installation peut être relancée

### Requirement: Redémarrage proposé après installation
Après l'installation d'une intégration que la boutique signale en attente de redémarrage, le dashboard SHALL proposer le redémarrage de Home Assistant, avec une confirmation explicite, et SHALL refléter l'état "redémarrage requis" tant que le redémarrage n'a pas eu lieu. Quand la boutique a chargé l'intégration sans redémarrage, le dashboard SHALL ne pas proposer de redémarrage. Le dashboard SHALL ne jamais redémarrer Home Assistant sans confirmation.

#### Scenario: Proposition
- **WHEN** l'installation d'une intégration se termine et que la boutique signale un redémarrage en attente
- **THEN** le dashboard propose le redémarrage sans l'exécuter

#### Scenario: Pas de redémarrage nécessaire
- **WHEN** l'installation d'une intégration se termine et que la boutique ne signale pas de redémarrage en attente
- **THEN** aucun redémarrage n'est proposé et le complément passe à l'état déduit, par exemple "à configurer"

#### Scenario: Redémarrage reporté
- **WHEN** l'utilisateur reporte le redémarrage
- **THEN** le complément reste "redémarrage requis" et l'installation d'autres compléments reste possible

#### Scenario: Reconnexion
- **WHEN** Home Assistant redémarre après la confirmation
- **THEN** le dashboard affiche l'état de reconnexion puis reprend à l'état déduit du complément

### Requirement: Compléments d'interface
Pour un complément de type `interface`, le dashboard SHALL l'installer par la boutique dans la catégorie `plugin` (ou `hacs_category`) sans redémarrage, et SHALL indiquer qu'un rechargement de la page du navigateur est nécessaire pour l'utiliser.

#### Scenario: Carte installée
- **WHEN** l'installation d'un complément d'interface se termine
- **THEN** l'état est "installé" et un message demande de recharger la page

### Requirement: Compléments non installables par le dashboard
Un complément de type `blueprint`, `addon` ou inconnu SHALL être affiché avec sa description et un lien (`url` ou dépôt), SHALL ne pas être installé par le dashboard, et SHALL proposer dans sa carte d'action ce qu'il faut faire. Un blueprint qui a une `url` SHALL proposer "Importer dans Home Assistant", qui ouvre la fenêtre d'import de blueprints de Home Assistant. Un add-on SHALL proposer "Ajouter le dépôt à Home Assistant", qui ouvre la fenêtre d'ajout de dépôt d'add-ons de Home Assistant, quand le Supervisor est présent, et sinon SHALL indiquer qu'il demande Home Assistant OS ou Supervised. Quand l'intégration `my` de Home Assistant n'est pas chargée, la page SHALL donner l'adresse à copier et un lien vers la page de Home Assistant concernée.

#### Scenario: Blueprint
- **WHEN** l'utilisateur ouvre le détail d'un blueprint qui a une `url`, et que l'intégration `my` est chargée
- **THEN** la carte d'action propose "Importer dans Home Assistant", qui ouvre la fenêtre d'import de Home Assistant avec cette adresse, et aucun bouton d'installation par la boutique

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

### Requirement: Repli quand l'interface de la boutique change
Les appels à la boutique SHALL être isolés dans un adaptateur unique. Si un appel échoue parce que la commande n'existe plus ou que sa réponse est inattendue, le dashboard SHALL le signaler et SHALL proposer un lien qui ouvre le dépôt directement dans la boutique utilisée.

#### Scenario: Commande HACS indisponible
- **WHEN** une commande WebSocket de la boutique est rejetée comme inconnue après que la boutique a été détectée
- **THEN** le dashboard affiche un message explicite et un lien d'ouverture du dépôt dans la boutique

#### Scenario: Lien vers la Marketplace
- **WHEN** la boutique est la Marketplace et qu'une installation échoue
- **THEN** le lien ouvre la fiche du dépôt dans la Marketplace de Home Assistant

### Requirement: Mises à jour et suppression hors périmètre
Le dashboard SHALL indiquer l'état installé d'un complément, sa version installée et, quand la boutique en connaît une plus récente, la version disponible. Il SHALL renvoyer vers la boutique pour la mise à jour ou la suppression, sans les implémenter.

#### Scenario: Complément installé
- **WHEN** l'utilisateur ouvre le détail d'un complément installé par la boutique
- **THEN** la page affiche la version installée et propose un lien vers sa fiche dans la boutique pour la mise à jour ou la suppression

#### Scenario: Pas de mise à jour faite par le dashboard
- **WHEN** une mise à jour est disponible pour un complément
- **THEN** le dashboard propose d'ouvrir le complément dans la boutique et n'appelle aucune commande d'installation de la boutique

### Requirement: Mise à jour disponible
Un complément installé par la boutique SHALL être signalé "Mise à jour disponible" quand la boutique indique une mise à jour en attente ou une version disponible différente de la version installée. Cette indication SHALL s'ajouter à son état sans le remplacer.

#### Scenario: Version plus récente
- **WHEN** la boutique indique la version installée 1.2.0 et la version disponible 1.3.0 pour un complément configuré
- **THEN** le complément garde l'état "Configuré", porte l'indication "Mise à jour disponible", et sa carte comme sa page affichent "1.2.0 → 1.3.0"

#### Scenario: À jour
- **WHEN** la version installée et la version disponible sont identiques
- **THEN** aucune indication de mise à jour n'est affichée

### Requirement: Carte d'un complément
Dans les listes, toute la surface de la carte d'un complément SHALL ouvrir sa page de détail, avec un retour visuel au survol et au focus clavier. La carte d'un complément qui demande une action SHALL proposer directement cette action : "Configurer" pour "À configurer", "Redémarrer Home Assistant" pour "Redémarrage requis", "Ouvrir dans la Marketplace" ou "Ouvrir dans HACS", selon la boutique, pour une mise à jour disponible.

#### Scenario: Ouverture par la carte
- **WHEN** l'utilisateur clique dans la description d'une carte
- **THEN** la page de détail du complément s'ouvre

#### Scenario: Action directe
- **WHEN** l'utilisateur clique sur "Configurer" dans la carte d'un complément à configurer
- **THEN** le config flow de Home Assistant s'ouvre pour son domaine, sans passer par la page de détail

#### Scenario: Redémarrage depuis une carte
- **WHEN** l'utilisateur clique sur "Redémarrer Home Assistant" dans une carte
- **THEN** la même confirmation que sur la page de détail est demandée avant tout redémarrage

#### Scenario: Mise à jour avec la Marketplace
- **WHEN** la boutique est la Marketplace et qu'une mise à jour est disponible pour un complément
- **THEN** sa carte propose "Ouvrir dans la Marketplace"

#### Scenario: Navigation au clavier
- **WHEN** l'utilisateur parcourt la liste avec la touche Tab
- **THEN** chaque carte reçoit le focus avec un indicateur visible, puis son action directe s'il y en a une

### Requirement: Liens aux couleurs du thème
Les liens des pages des compléments SHALL utiliser la couleur primaire du thème de Home Assistant, et non la couleur par défaut du navigateur.

#### Scenario: Liens de la page de détail
- **WHEN** la page de détail d'un complément installé est affichée, en clair ou en sombre
- **THEN** le lien de source et le lien vers la boutique ont la couleur primaire du thème

## RENAMED Requirements

- FROM: `### Requirement: Prérequis HACS`
- TO: `### Requirement: Prérequis de la boutique`

- FROM: `### Requirement: Installation d'une intégration par HACS`
- TO: `### Requirement: Installation d'une intégration par la boutique`

- FROM: `### Requirement: Repli quand l'interface de HACS change`
- TO: `### Requirement: Repli quand l'interface de la boutique change`
