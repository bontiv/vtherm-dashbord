# Spec Delta

## Purpose
Montrer, dans les vues d'ensemble du dashboard et d'un thermostat, les éléments de fonctionnement de Versatile Thermostat (valeurs mesurées, états, alertes), en lecture seule, par des widgets contribués par les plugins.

## ADDED Requirements

### Requirement: Carte de widget commune
Chaque widget natif SHALL montrer un titre traduit (clé `widget.<nom>.title` de son plugin) et un corps, et gérer trois états : chargement, vide (message qui dit pourquoi) et indisponible. Le conteneur SHALL dessiner chaque widget dans un `ha-card`, ou dans un élément de même apparence quand ce composant n'est pas défini.

#### Scenario: Titre traduit
- **WHEN** la langue de l'utilisateur est le français et qu'un widget natif est affiché
- **THEN** son titre est celui du catalogue français de son plugin

#### Scenario: Chargement
- **WHEN** un widget attend l'historique de son graphique
- **THEN** sa carte montre l'indicateur de progression et le titre, sans valeur

#### Scenario: Carte absente de Home Assistant
- **WHEN** le composant `ha-card` n'est pas défini
- **THEN** le widget est dessiné dans un élément qui a la même bordure, le même arrondi et le même fond, sans erreur

#### Scenario: Widget tiers existant
- **WHEN** un plugin tiers publié avant ce changement déclare un widget
- **THEN** son rendu garde la même bordure, le même arrondi et le même fond

### Requirement: Conventions d'identifiant et de masquage
Un widget natif SHALL avoir l'identifiant `<plugin>.widget.<nom>`. Un widget dont la fonctionnalité est éteinte, ou dont aucune entité source n'existe pour le thermostat, SHALL être masqué par sa condition `visible` et ne SHALL laisser aucune carte vide. La condition SHALL utiliser les valeurs effectives du thermostat (valeurs propres, et valeurs de la configuration centrale pour les sections qui l'héritent).

#### Scenario: Fonctionnalité éteinte
- **WHEN** la fonctionnalité d'un widget est éteinte pour le thermostat
- **THEN** aucune carte n'est dessinée et les autres widgets gardent leur place

#### Scenario: Fonctionnalité héritée de la configuration centrale
- **WHEN** le thermostat utilise la configuration centrale d'une fonctionnalité et que la configuration centrale l'active
- **THEN** le widget de cette fonctionnalité est affiché

#### Scenario: Entité source absente
- **WHEN** la fonctionnalité est active mais que l'entité source du widget n'existe pas dans Home Assistant
- **THEN** le widget est masqué

#### Scenario: Condition en erreur
- **WHEN** la condition de visibilité d'un widget lève une erreur
- **THEN** le widget est masqué et l'erreur est signalée dans l'état du plugin

### Requirement: Valeurs indisponibles
Un widget SHALL afficher « — » pour une valeur absente, `unavailable` ou `unknown`, avec la mention « indisponible » pour les lecteurs d'écran, et ne SHALL pas afficher « 0 » à la place d'une valeur inconnue.

#### Scenario: Capteur indisponible
- **WHEN** l'état d'une entité source est `unavailable`
- **THEN** la valeur correspondante affiche « — » et son nom accessible indique qu'elle est indisponible

#### Scenario: Attribut absent
- **WHEN** un attribut que le widget lit n'existe pas dans l'état de l'entité
- **THEN** la valeur affiche « — » et les autres valeurs du widget restent affichées

### Requirement: Unités et formats régionaux
Les valeurs SHALL être formatées par `hass.formatEntityState` ou `hass.formatEntityAttributeValue` quand ils existent, et sinon avec la langue de `hass.locale` et l'unité de l'entité ou de la température de Home Assistant. Un âge SHALL s'afficher en durée relative (« il y a 3 min »), avec la date complète dans l'infobulle.

#### Scenario: Formateur de Home Assistant
- **WHEN** `hass.formatEntityAttributeValue` est défini
- **THEN** la température affichée est celle qu'il renvoie, sans second formatage

#### Scenario: Repli sans formateur
- **WHEN** `hass.formatEntityAttributeValue` est absent, comme dans le harnais de test
- **THEN** la température est formatée avec `hass.locale` et l'unité de Home Assistant

#### Scenario: Séparateur décimal
- **WHEN** la langue est le français et qu'une température vaut 19,5
- **THEN** la valeur affichée est « 19,5 °C »

#### Scenario: Unité Fahrenheit
- **WHEN** Home Assistant est réglé en °F
- **THEN** les températures affichées portent l'unité « °F » et aucune conversion n'est faite par le widget

#### Scenario: Âge d'une mesure
- **WHEN** une date vieille de trois minutes est affichée
- **THEN** le texte est « il y a 3 minutes » en français et « 3 minutes ago » en anglais (format long de `Intl.RelativeTimeFormat`), et la date complète est dans l'infobulle

### Requirement: Composants de présentation
Le dashboard SHALL fournir aux widgets natifs une jauge (valeur, bornes, repère facultatif, unité), une barre simple, une barre segmentée, une icône d'état (icône, libellé, infobulle), une ligne de valeur (libellé, valeur, unité) et l'âge relatif. Chacun SHALL utiliser le composant de Home Assistant correspondant quand il est défini, et un dessin de repli sinon. Chaque composant SHALL exposer un nom accessible et une valeur textuelle.

#### Scenario: Jauge avec repère
- **WHEN** une jauge reçoit la valeur 19,5, les bornes 7 et 35 et le repère 21
- **THEN** la jauge indique la position de 19,5 et marque 21, et son nom accessible dit « 19,5 sur une plage de 7 à 35, consigne 21 »

#### Scenario: Barre segmentée
- **WHEN** une barre segmentée reçoit 186 s « actif » et 114 s « arrêt »
- **THEN** deux segments proportionnels sont dessinés avec leur libellé et leur valeur en texte

#### Scenario: Composant de Home Assistant absent
- **WHEN** `ha-gauge` n'est pas défini
- **THEN** la jauge est dessinée par le dessin de repli, avec le même nom accessible

### Requirement: Accessibilité
Un état SHALL toujours être donné par une icône et un texte, jamais par la seule couleur. Les infobulles SHALL être atteignables au clavier, et chaque icône qui porte un sens SHALL avoir un nom accessible traduit.

#### Scenario: État en alerte
- **WHEN** un widget montre une alerte
- **THEN** l'alerte a une icône, un texte et une couleur d'avertissement, et elle est annoncée par un lecteur d'écran

#### Scenario: Infobulle au clavier
- **WHEN** l'utilisateur atteint une icône avec la touche de tabulation
- **THEN** son infobulle s'affiche

### Requirement: Thème et écran étroit
Les widgets SHALL utiliser les variables de thème de Home Assistant et aucune couleur figée, et SHALL rester lisibles sans défilement horizontal jusqu'à 360 px de large.

#### Scenario: Thème sombre
- **WHEN** le thème de Home Assistant est sombre
- **THEN** les textes, les jauges et les barres utilisent les couleurs du thème et gardent un contraste lisible

#### Scenario: Écran étroit
- **WHEN** le dashboard est affiché à 375 px
- **THEN** les widgets occupent une colonne sans débordement horizontal

### Requirement: Coût de rendu
Un widget SHALL ne se redessiner que lorsque l'état de l'une de ses entités change. L'historique d'un widget SHALL ne se charger que lorsque sa carte est visible, et SHALL réutiliser le cache de 5 minutes du client d'historique.

#### Scenario: Changement d'une entité étrangère
- **WHEN** l'état d'une entité qu'un widget ne lit pas change
- **THEN** ce widget n'est pas redessiné

#### Scenario: Carte hors de l'écran
- **WHEN** la carte d'un graphique est sous la zone visible
- **THEN** aucune requête d'historique n'est envoyée avant qu'elle devienne visible

### Requirement: Éléments sans source dans Versatile Thermostat
Un widget ne SHALL pas afficher un élément que Versatile Thermostat ne publie pas : position dans le cycle TPI, délai restant de la détection de fenêtre, prochaine action de l'arrêt automatique, échéance du reverrouillage. Aucune estimation côté dashboard ne SHALL les remplacer.

#### Scenario: Élément exclu
- **WHEN** un thermostat a la détection de fenêtre active
- **THEN** le widget de fenêtre n'affiche aucun délai restant

### Requirement: Affichage seul
Les widgets SHALL afficher l'état de fonctionnement sans le modifier : aucun widget ne SHALL appeler de service de Home Assistant, et aucun bouton de commande (mode, preset, verrou, contournement de fenêtre, mode central, apprentissage) ne SHALL être dessiné.

#### Scenario: Aucun appel de service
- **WHEN** un widget est affiché et que l'utilisateur interagit avec lui
- **THEN** aucun appel `callService` n'est émis

### Requirement: Grille et taille des widgets
Le conteneur des widgets SHALL calculer le nombre de colonnes de la grille (colonnes de 280 px minimum), appliquer à chaque widget la largeur de sa `size` limitée à ce nombre (`"full"` pour toute la rangée) et une hauteur minimale de `rows` fois 140 px plus les écarts quand `rows` est déclaré. Sans `size`, un widget SHALL occuper une colonne sans hauteur minimale. Le conteneur SHALL ne pas réordonner les cartes pour combler les trous.

#### Scenario: Widget sur deux colonnes
- **WHEN** un widget déclare `columns: 2` et que la grille a quatre colonnes
- **THEN** sa carte occupe deux colonnes

#### Scenario: Largeur limitée à la grille
- **WHEN** un widget déclare `columns: 3` et que la grille n'a que deux colonnes
- **THEN** sa carte occupe deux colonnes et la grille ne déborde pas

#### Scenario: Toute la rangée
- **WHEN** un widget déclare `columns: "full"`
- **THEN** sa carte occupe toute la largeur de la grille, quel que soit le nombre de colonnes

#### Scenario: Hauteur minimale
- **WHEN** un widget déclare `rows: 2`
- **THEN** sa carte a une hauteur minimale de 280 px plus un écart, et elle grandit si son contenu est plus haut

#### Scenario: Widget sans taille
- **WHEN** un widget n'a pas de `size`
- **THEN** sa carte occupe une colonne et sa hauteur suit son contenu

#### Scenario: Écran étroit
- **WHEN** le dashboard est affiché à 375 px
- **THEN** toute largeur demandée est ramenée à une colonne et la hauteur minimale de `rows` reste appliquée

#### Scenario: Calcul du nombre de colonnes
- **WHEN** le conteneur mesure 1 440 px de large avec 16 px d'écart
- **THEN** la grille a quatre colonnes (partie entière de (1 440 + 16) / (280 + 16))

### Requirement: Ordre de lecture des widgets
Le conteneur des widgets SHALL garder l'ordre résolu des placements comme ordre du DOM, de lecture et de tabulation, quelle que soit la taille des widgets.

#### Scenario: Tabulation
- **WHEN** l'utilisateur parcourt les widgets avec la touche de tabulation
- **THEN** le focus suit l'ordre des placements, même si un widget large est suivi d'un widget étroit

#### Scenario: Pas de remplissage dense
- **WHEN** un widget de deux colonnes ne tient pas à la fin d'une rangée
- **THEN** il passe à la rangée suivante et les widgets suivants ne le dépassent pas
