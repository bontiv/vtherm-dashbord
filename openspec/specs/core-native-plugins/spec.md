# core-native-plugins Specification

## Purpose
Définir les plugins UI fournis nativement par le dashboard, un par étape du config flow de Versatile Thermostat, avec leurs sections de configuration, leurs champs et leurs conditions d'affichage. Dans ce document, "onglet" désigne une entrée du menu de gauche d'un thermostat ou de la configuration générale (les identifiants contiennent `tab` par convention) ; les onglets de la barre supérieure sont appelés "onglets supérieurs".

## Requirements

### Requirement: Plugins natifs identiques aux plugins tiers
Le dashboard SHALL fournir ses fonctions de configuration sous forme de plugins UI enregistrés par les mêmes mécanismes que les plugins tiers (registre Python, SDK, contributions déclaratives). Aucune contribution native ne SHALL avoir de privilège sur celles des plugins tiers.

#### Scenario: Remplacement par un plugin tiers
- **WHEN** un plugin tiers déclare `replace: core_tpi.tab.main` sur `thermostat_config`
- **THEN** son onglet prend la place de l'onglet TPI natif

#### Scenario: Suppression par un plugin tiers
- **WHEN** un plugin tiers déclare `remove: core_lock.tab.main`
- **THEN** l'onglet de verrouillage natif n'est plus affiché

#### Scenario: Visibilité dans la vue d'état
- **WHEN** l'utilisateur ouvre la vue d'état des plugins
- **THEN** les plugins natifs sont listés avec la source "natif"

### Requirement: Navigation native du plugin `core`
Le plugin `core` SHALL fournir les onglets supérieurs `core.top.dashboard`, `core.top.thermostats` et `core.top.configuration` (zone `end`, roue crantée), la page `core.page.overview` et la vue d'ensemble d'un thermostat `core.page.thermostat_overview`, placée en première position.

#### Scenario: Barre par défaut
- **WHEN** seuls les plugins natifs sont chargés
- **THEN** la barre contient les onglets Dashboard, Thermostats et VT Compléments, puis la roue crantée seule à droite

#### Scenario: Vue d'ensemble d'un thermostat
- **WHEN** un thermostat est sélectionné
- **THEN** la première entrée de son menu est la vue d'ensemble

#### Scenario: Remplacement par un plugin tiers
- **WHEN** un plugin tiers déclare `replace: core.page.overview`
- **THEN** sa page prend la place de la page Overview

### Requirement: Menu de la configuration
Le plugin `core` SHALL fournir dans le menu de Configuration les pages "Plugins" (`core.page.plugins`) et "Développement" (`core.page.dev_plugins`) du groupe "Dashboard". Les sections `general_config` des plugins natifs SHALL déclarer le groupe partagé « Paramètres généraux » ou « Fonctionnalités », selon que la section peut être éteinte, et la page de création de la configuration centrale SHALL déclarer le groupe « Paramètres généraux ».

#### Scenario: Pages du groupe Dashboard
- **WHEN** l'utilisateur ouvre le menu de Configuration
- **THEN** les pages "Plugins" et "Développement" apparaissent sous le groupe "Dashboard", après les sections des groupes « Paramètres généraux » et « Fonctionnalités »

#### Scenario: Configuration centrale à créer
- **WHEN** la configuration centrale n'existe pas encore
- **THEN** la page « Créer la configuration centrale » apparaît seule sous le groupe « Paramètres généraux »

### Requirement: Liste et identifiants des plugins natifs
Le dashboard SHALL fournir les plugins natifs `core`, `core_tpi`, `core_presets`, `core_window`, `core_motion`, `core_power`, `core_presence`, `core_central_boiler`, `core_auto_start_stop`, `core_valve_regulation`, `core_sync_temp`, `core_humidity`, `core_advanced`, `core_lock`, `core_heating_failure` et `core_complements` (voir la spec `complements-catalog`). Les identifiants de plugins commençant par `core` SHALL être réservés aux plugins natifs.

#### Scenario: Identifiant réservé
- **WHEN** un plugin tiers tente de s'enregistrer avec l'identifiant `core_custom`
- **THEN** l'enregistrement est refusé avec une erreur explicite

#### Scenario: Dépendance au plugin de base
- **WHEN** le dashboard charge les plugins natifs autres que `core`
- **THEN** chacun requiert `core` et est chargé après lui

### Requirement: Ordre des onglets du config flow
Les menus d'un thermostat et de la Configuration SHALL ranger les onglets natifs, dans cet ordre, sous « Paramètres généraux » : principal, sous-jacents, presets, TPI, régulation par vanne, avancé ; puis sous « Fonctionnalités » : chaudière centrale, ouverture, mouvement, puissance, présence, démarrage et arrêt automatiques, synchronisation de température, verrouillage, humidité, panne de chauffage. L'ordre SHALL venir de positions déclaratives.

#### Scenario: Ordre par défaut
- **WHEN** un thermostat dont toutes les fonctionnalités sont activées est ouvert sans plugin tiers
- **THEN** la vue d'ensemble est en tête sans groupe, puis les onglets suivent l'ordre indiqué sous les intitulés « Paramètres généraux » et « Fonctionnalités », avec la même mise en forme que les groupes du menu de la Configuration

#### Scenario: Configuration centrale
- **WHEN** l'administrateur ouvre le menu de la Configuration d'une configuration centrale existante
- **THEN** il voit sous « Paramètres généraux » : principal, presets, TPI, avancé ; puis sous « Fonctionnalités » les sections de fonctionnalités de la configuration centrale, dont le verrouillage

#### Scenario: Insertion tierce
- **WHEN** un plugin tiers déclare `after: core_tpi.tab.main`
- **THEN** son onglet suit immédiatement l'onglet TPI

#### Scenario: Insertion tierce dans un groupe
- **WHEN** un plugin tiers déclare `after: core_tpi.tab.main` et le groupe partagé « Paramètres généraux »
- **THEN** son onglet suit l'onglet TPI sans couper le groupe en deux intitulés

### Requirement: Onglet type d'un thermostat sur interrupteur
Pour un thermostat `over_switch`, l'onglet "type" SHALL proposer les entités sous-jacentes (obligatoires, une ou plusieurs parmi interrupteur, booléen, sélecteur, climate), la période de maintien d'activité, la fonction proportionnelle, le mode climatisation, l'inversion de commande et les commandes personnalisées d'allumage et d'extinction.

#### Scenario: Fonction proportionnelle
- **WHEN** l'onglet est affiché
- **THEN** la fonction proportionnelle vaut TPI par défaut et propose les algorithmes enregistrés par les plugins thermostat

#### Scenario: Commandes personnalisées
- **WHEN** une commande ne respecte pas le format `commande[/argument[:valeur]]`
- **THEN** l'erreur "configuration de l'interrupteur virtuel incorrecte" est affichée

### Requirement: Onglet type d'un thermostat sur climate
Pour un thermostat `over_climate`, l'onglet "type" SHALL proposer les entités climate sous-jacentes (obligatoires), le mode climatisation, la synchronisation de la température interne de l'équipement, le mode de régulation automatique (aucun, vanne, lent, léger, moyen, fort, expert), le seuil et la période de régulation, le mode de ventilateur automatique et l'utilisation de la température de l'équipement.

#### Scenario: Valeurs par défaut
- **WHEN** l'onglet est affiché pour un nouveau thermostat
- **THEN** le mode de régulation vaut "aucun", le seuil 0,5, la période 5 minutes et le ventilateur "haut"

#### Scenario: Régulation par vanne
- **WHEN** le mode de régulation "vanne" est choisi
- **THEN** les onglets TPI et régulation par vanne deviennent applicables et l'onglet démarrage et arrêt automatiques disparaît

### Requirement: Onglet type d'un thermostat sur vanne
Pour un thermostat `over_valve`, l'onglet "type" SHALL proposer les entités de vanne (nombres, obligatoires), la fonction proportionnelle, le mode climatisation, le seuil, la période de régulation, le seuil d'ouverture (0 à 100), les ouvertures minimales et maximales (listes de valeurs) et la fermeture maximale (0 à 100).

#### Scenario: Ouvertures hors limites
- **WHEN** une ouverture maximale dépasse la valeur maximale de la vanne ou n'est pas supérieure à l'ouverture minimale
- **THEN** l'erreur correspondante est affichée sur le champ

#### Scenario: Trop de valeurs
- **WHEN** la liste des ouvertures contient plus de valeurs que de vannes
- **THEN** l'erreur "nombre de valeurs incorrect" est affichée

### Requirement: Plugin `core_tpi`
Le plugin `core_tpi` SHALL fournir l'onglet TPI pour la fonction proportionnelle TPI, la régulation par vanne et la configuration générale. L'onglet SHALL proposer les coefficients intérieur (0,6, de 0 à 10) et extérieur (0,01, de 0 à 1), les délais minimaux d'activation (10) et de désactivation (0) et les seuils bas et haut (de -10 à 10, défaut 0).

#### Scenario: Héritage TPI
- **WHEN** un thermostat utilise la configuration TPI centrale
- **THEN** seules l'option d'héritage et les valeurs centrales en lecture seule sont affichées

#### Scenario: Onglet masqué
- **WHEN** la fonction proportionnelle n'est pas TPI et que la régulation par vanne n'est pas active
- **THEN** l'onglet TPI n'est pas affiché

### Requirement: Auto TPI
L'onglet TPI d'un thermostat SHALL proposer l'apprentissage automatique (Auto TPI) : le type d'apprentissage (découverte ou réglage fin), l'agressivité (0,5 à 1,0), les temps de chauffe et de refroidissement (défaut 5), le taux de chauffe, le Kext continu et les paramètres avancés (méthode de calcul moyenne pondérée ou EMA avec ses paramètres).

#### Scenario: Valeurs selon le type d'apprentissage
- **WHEN** le type d'apprentissage passe à "découverte"
- **THEN** la méthode devient "moyenne pondérée" avec un poids initial de 1

#### Scenario: Réglage fin
- **WHEN** le type d'apprentissage passe à "réglage fin"
- **THEN** la méthode devient EMA avec alpha 0,08 et décroissance 0,12

#### Scenario: Paramètres avancés
- **WHEN** les paramètres avancés sont activés avec la méthode EMA
- **THEN** alpha (0,15), décroissance (0,08) et alpha du Kext continu (0,04, de 0,005 à 0,2) sont proposés

### Requirement: Plugin `core_presets`
Le plugin `core_presets` SHALL fournir l'onglet des presets : l'option "utiliser les presets centraux" et, sans héritage, la modification des températures de preset du thermostat. Dans la configuration générale, il SHALL permettre de modifier les températures de preset centrales. Ces températures sont des entités `number.*` de Versatile Thermostat, hors du config flow. Elles SHALL être présentées dans un tableau à une ligne par preset et une colonne par situation.

#### Scenario: Presets propres
- **WHEN** l'héritage des presets est désactivé
- **THEN** les températures de preset du thermostat sont affichées et modifiables, avec les variantes climatisation si le mode climatisation est actif et absence si la présence est activée

#### Scenario: Modification d'une température
- **WHEN** l'administrateur modifie la température d'un preset
- **THEN** la valeur est appliquée à l'entité de preset correspondante

### Requirement: Tableau des températures de preset
Le tableau SHALL avoir pour lignes, dans l'ordre, hors-gel, éco, confort et boost, et pour colonnes normale, absence, climatisation et climatisation en absence. Une colonne SHALL n'être affichée que si sa situation s'applique : absence avec la présence activée, climatisation avec le mode climatisation, climatisation en absence avec les deux ; toutes pour la configuration générale. Une case sans entité de preset SHALL afficher « — ».

#### Scenario: Thermostat simple
- **WHEN** un thermostat sans présence ni climatisation affiche ses presets propres
- **THEN** le tableau n'a que la colonne normale, avec quatre lignes

#### Scenario: Présence et climatisation
- **WHEN** un thermostat a la présence et le mode climatisation activés
- **THEN** le tableau a les quatre colonnes, et la case hors-gel de la climatisation affiche « — » si VT n'expose pas cette entité

#### Scenario: Colonne activée non encore enregistrée
- **WHEN** l'administrateur active la présence dans le brouillon et ouvre les presets avant d'enregistrer
- **THEN** la colonne absence apparaît avec des cases « — » et une note indique qu'elles seront disponibles après l'enregistrement

### Requirement: Saisie dans le tableau des presets
Chaque case SHALL accepter un nombre dans les limites et au pas de son entité, afficher l'unité de température et avoir un nom accessible qui combine le preset et la situation. Une case modifiée SHALL être signalée comme non enregistrée et une case refusée SHALL être marquée invalide, avec son message sous le tableau.

#### Scenario: Nom accessible
- **WHEN** un lecteur d'écran atteint la case confort de la colonne absence
- **THEN** il annonce « Confort, absence » et l'unité

#### Scenario: Valeur hors limites
- **WHEN** l'administrateur saisit une température au-delà du maximum de l'entité
- **THEN** la case est marquée invalide avec le message de limite, et le brouillon ne contient pas la valeur

#### Scenario: Refus à l'enregistrement
- **WHEN** Home Assistant refuse la température éco normale lors de l'enregistrement
- **THEN** la case éco normale est marquée en erreur et le message est affiché sous le tableau

### Requirement: Avertissement d'ordre des presets
Quand, dans une colonne de chauffage, une température est inférieure à celle d'un preset qui la précède (hors-gel ≤ éco ≤ confort ≤ boost), ou quand l'ordre est inverse dans une colonne de climatisation, le tableau SHALL afficher un avertissement qui nomme les presets en cause, sans bloquer l'enregistrement.

#### Scenario: Éco plus chaud que confort
- **WHEN** l'administrateur règle éco à 21° et confort à 20° dans la colonne normale
- **THEN** un avertissement indique que éco est plus chaud que confort, et l'enregistrement reste possible

### Requirement: Presets hérités en lecture seule
Quand la section utilise les presets centraux, le tableau SHALL afficher les températures centrales en lecture seule, avec la même structure, et SHALL proposer un lien qui ouvre les presets de la configuration générale.

#### Scenario: Lien vers la configuration centrale
- **WHEN** l'administrateur suit le lien du tableau hérité
- **THEN** l'onglet des presets de la configuration générale s'ouvre, après confirmation s'il reste un brouillon non enregistré

### Requirement: Tableau des presets sur écran étroit
Quand la largeur disponible ne permet pas d'afficher toutes les colonnes, le tableau SHALL se présenter en un bloc par preset, chaque situation ayant son libellé et sa case, sans défilement horizontal.

#### Scenario: Téléphone
- **WHEN** l'onglet des presets d'un thermostat à quatre colonnes est affiché sur un écran de 360 px de large
- **THEN** chaque preset forme un bloc avec ses quatre cases libellées en grille, et la page ne défile pas horizontalement

### Requirement: Plugin `core_window`
Le plugin `core_window` SHALL fournir l'onglet d'ouverture, affiché quand la fonctionnalité est active : capteur d'ouverture, délai d'ouverture (30), délai de fermeture (30), action (arrêt, ventilation seule, hors-gel, éco) et, avec la méthode « chute de température », seuils de détection automatique (ouverture 3, fermeture 0) et durée maximale (30). Avec la méthode « capteur d'ouverture », le capteur SHALL être compté comme valeur manquante tant qu'il est vide.

#### Scenario: Avec capteur
- **WHEN** un capteur d'ouverture est renseigné
- **THEN** les seuils de détection automatique et la durée maximale ne sont pas proposés

#### Scenario: Sans capteur
- **WHEN** aucun capteur d'ouverture n'est renseigné et que la méthode « chute de température » est choisie
- **THEN** les seuils de détection automatique et la durée maximale sont proposés

#### Scenario: Méthode capteur sans capteur
- **WHEN** la méthode « capteur d'ouverture » est choisie et que le capteur est vide
- **THEN** la section est signalée incomplète

### Requirement: Plugin `core_motion`
Le plugin `core_motion` SHALL fournir l'onglet de mouvement, affiché quand la fonctionnalité est active : capteur de mouvement (obligatoire), délai (30), délai d'arrêt (300), preset avec mouvement (confort) et preset sans mouvement (éco).

#### Scenario: Capteur manquant
- **WHEN** la fonctionnalité est active et qu'aucun capteur de mouvement n'est renseigné
- **THEN** la configuration est signalée incomplète

### Requirement: Plugin `core_power`
Le plugin `core_power` SHALL fournir l'onglet de puissance, affiché quand la fonctionnalité est active : pour la configuration générale, capteur de puissance, capteur de puissance maximale (obligatoires) et unité (automatique, W, kW) ; pour tous, la température de délestage (13).

#### Scenario: Configuration générale
- **WHEN** la fonctionnalité est active dans la configuration générale sans capteurs
- **THEN** la configuration est signalée incomplète

#### Scenario: Thermostat
- **WHEN** un thermostat n'utilise pas la configuration centrale de puissance
- **THEN** seule la température de délestage est proposée

### Requirement: Plugin `core_presence`
Le plugin `core_presence` SHALL fournir l'onglet de présence, affiché quand la fonctionnalité est active : capteur de présence (obligatoire, entité personne, capteur binaire ou booléen).

#### Scenario: Capteur manquant
- **WHEN** la fonctionnalité est active sans capteur de présence et sans héritage
- **THEN** la configuration est signalée incomplète

### Requirement: Plugin `core_central_boiler`
Le plugin `core_central_boiler` SHALL fournir, dans la configuration générale uniquement, l'onglet de la chaudière centrale, affiché quand la fonctionnalité est active : délai d'activation (0 à 600 s), service d'activation, service de désactivation et délai de maintien d'activité (0 à 3600 s).

#### Scenario: Format de service
- **WHEN** un service ne respecte pas le format attendu ou contient un modèle invalide
- **THEN** l'erreur "format du service incorrect" est affichée sur le champ

#### Scenario: Services manquants
- **WHEN** la fonctionnalité est active sans service d'activation ou de désactivation
- **THEN** la configuration générale est signalée incomplète

### Requirement: Plugin `core_auto_start_stop`
Le plugin `core_auto_start_stop` SHALL fournir l'onglet de démarrage et d'arrêt automatiques pour un thermostat `over_climate` sans régulation par vanne, quand la fonctionnalité est active : le niveau de détection, parmi ceux de Versatile Thermostat (défaut "aucun").

#### Scenario: Thermostat non applicable
- **WHEN** le thermostat est de type `over_switch`
- **THEN** l'onglet n'est pas affiché

### Requirement: Plugin `core_valve_regulation`
Le plugin `core_valve_regulation` SHALL fournir l'onglet de régulation par vanne d'un thermostat `over_climate` en régulation "vanne" : entités d'ouverture (obligatoires), entités de fermeture (facultatives), fonction proportionnelle, seuil d'ouverture, ouvertures minimales et maximales, fermeture maximale.

#### Scenario: Cardinalité
- **WHEN** le nombre d'entités d'ouverture diffère du nombre d'entités sous-jacentes
- **THEN** l'erreur "nombre d'entités incorrect" est affichée

#### Scenario: Entités de fermeture
- **WHEN** des entités de fermeture sont renseignées en nombre différent des entités sous-jacentes
- **THEN** la même erreur est affichée

### Requirement: Plugin `core_sync_temp`
Le plugin `core_sync_temp` SHALL fournir l'onglet de synchronisation de la température interne de l'équipement, affiché quand l'option est active : la synchronisation par calibration (défaut oui) et les entités de synchronisation (obligatoires, une par entité sous-jacente).

#### Scenario: Cardinalité
- **WHEN** le nombre d'entités de synchronisation diffère du nombre d'entités sous-jacentes
- **THEN** l'erreur "nombre d'entités incorrect" est affichée

### Requirement: Plugin `core_humidity`
Le plugin `core_humidity` SHALL fournir, pour les thermostats uniquement, l'onglet d'humidité : l'activation et le capteur d'humidité. Quand le capteur n'est pas renseigné, le dashboard SHALL proposer le capteur d'humidité détecté par Versatile Thermostat à partir du capteur de température.

#### Scenario: Détection
- **WHEN** l'onglet est ouvert sans capteur configuré et qu'un capteur candidat est détecté
- **THEN** ce capteur est proposé comme valeur suggérée

#### Scenario: Fonctionnalité désactivée
- **WHEN** l'administrateur désactive l'humidité et enregistre
- **THEN** le capteur d'humidité est retiré de la configuration

### Requirement: Plugin `core_advanced`
Le plugin `core_advanced` SHALL fournir l'onglet « Sécurité et dérogation » (en : « Safety and manual override », de : « Sicherheit und Übersteuerung ») : délai de sécurité en minutes (60), pourcentage d'activation minimal et par défaut de sécurité (valeurs par défaut de Versatile Thermostat), réparation des états incorrects (non) et durée de dérogation manuelle en minutes (0). Ce titre du dashboard SHALL s'afficher à l'identique dans le menu, le titre de la section et le fil d'Ariane.

#### Scenario: Avancé hérité
- **WHEN** un thermostat utilise la configuration avancée centrale
- **THEN** les valeurs centrales sont affichées en lecture seule

#### Scenario: Valeurs de sécurité manquantes
- **WHEN** un thermostat n'hérite pas de la configuration avancée et qu'une valeur de sécurité manque
- **THEN** la configuration est signalée incomplète

#### Scenario: Titre de l'onglet
- **WHEN** l'administrateur ouvre la configuration d'un thermostat en français, en anglais ou en allemand
- **THEN** le menu, le titre de la section et le fil d'Ariane affichent « Sécurité et dérogation », « Safety and manual override » ou « Sicherheit und Übersteuerung », et non « Paramètres avancés », « Advanced parameters » ou « Erweiterte Einstellungen »

#### Scenario: Panneau des champs rares
- **WHEN** la section « Sécurité et dérogation » affiche ses champs rarement modifiés
- **THEN** ils restent dans le panneau replié « Paramètres avancés (N) » de la section, dont le libellé ne change pas

### Requirement: Plugin `core_lock`
Le plugin `core_lock` SHALL fournir l'onglet de verrouillage : code (quatre chiffres, facultatif), verrouillage des utilisateurs (oui), des automatisations (oui) et délai de reverrouillage automatique en secondes (30).

#### Scenario: Code invalide
- **WHEN** le code saisi ne contient pas exactement quatre chiffres
- **THEN** l'erreur "code de verrouillage incorrect" est affichée

### Requirement: Plugin `core_heating_failure`
Le plugin `core_heating_failure` SHALL fournir l'onglet de détection de panne de chauffage, affiché quand la fonctionnalité est active : seuils de panne de chauffage et de refroidissement (de 0 à 1), délai de détection, tolérance de variation de température (de 0 à 5) et modèle d'activation (facultatif).

#### Scenario: Héritage
- **WHEN** un thermostat utilise la configuration centrale de détection de panne
- **THEN** les valeurs centrales sont affichées en lecture seule

#### Scenario: Fonctionnalité masquée
- **WHEN** le thermostat est un `over_climate` sans régulation par vanne
- **THEN** l'onglet n'est pas affiché

### Requirement: Onglets des fonctionnalités éteintes
Les onglets natifs liés à une fonctionnalité (ouverture, mouvement, puissance, présence, démarrage et arrêt automatiques, chaudière centrale, détection de panne de chauffage) SHALL, quand la fonctionnalité s'applique au type mais est désactivée, rester listés avec le statut éteinte au lieu d'être masqués, et SHALL déclarer la valeur d'activation de leur fonctionnalité.

#### Scenario: Onglet ouverture éteint
- **WHEN** un thermostat dont la fonctionnalité d'ouverture est désactivée est ouvert
- **THEN** l'onglet ouverture figure dans le menu avec le statut éteinte

#### Scenario: Chaudière centrale
- **WHEN** la configuration générale est ouverte avec la chaudière centrale désactivée
- **THEN** l'onglet de la chaudière centrale figure dans son menu avec le statut éteinte

### Requirement: Choix de la méthode de détection d'ouverture
Quand la fonctionnalité d'ouverture est active, l'onglet d'ouverture SHALL proposer un choix exclusif entre « Capteur d'ouverture » et « Chute de température », présenté comme un groupe de boutons, et n'afficher que les champs de la méthode choisie. La méthode initiale SHALL être déduite des valeurs : capteur si un capteur est renseigné, chute de température si un seuil de détection l'est sans capteur, capteur sinon.

#### Scenario: Thermostat avec capteur
- **WHEN** l'onglet ouverture d'un thermostat qui a un capteur d'ouverture est affiché
- **THEN** « Capteur d'ouverture » est choisi et les seuils de détection automatique ne sont pas affichés

#### Scenario: Passage à la chute de température
- **WHEN** l'administrateur choisit « Chute de température »
- **THEN** le capteur d'ouverture est retiré du brouillon, et les seuils d'ouverture et de fermeture et la durée maximale sont affichés

#### Scenario: Retour au capteur
- **WHEN** l'administrateur revient à « Capteur d'ouverture »
- **THEN** les seuils de détection automatique propres au thermostat sont retirés du brouillon et le capteur est demandé

#### Scenario: Accessibilité du choix
- **WHEN** un lecteur d'écran atteint le choix de méthode
- **THEN** il annonce un groupe de boutons radio intitulé « Comment détecter une fenêtre ouverte ? » et l'option choisie

### Requirement: Description de l'onglet de sécurité
La description de l'onglet « Sécurité et dérogation » SHALL nommer ses cinq réglages et indiquer que Versatile Thermostat appelle cet onglet « Paramètres avancés » (« Advanced parameters », « Erweiterte Einstellungen »), pour qu'un utilisateur de la documentation de Versatile Thermostat le retrouve.

#### Scenario: Description et ancien nom
- **WHEN** l'administrateur lit la description de la section « Sécurité et dérogation »
- **THEN** elle nomme les réglages de sécurité, la dérogation manuelle et la réparation de l'état incorrect, et cite l'ancien nom « Paramètres avancés » de Versatile Thermostat

### Requirement: Identifiants de l'onglet de sécurité
L'identifiant du plugin de l'onglet « Sécurité et dérogation », ceux de ses contributions, la clé de son titre et les clés de ses champs SHALL rester `core_advanced`, `core_advanced.tab.main`, `core_advanced.general.main`, `title.advanced` et celles de Versatile Thermostat.

#### Scenario: Contrat des plugins tiers
- **WHEN** un plugin tiers se place `after:core_advanced.tab.main` ou ouvre l'adresse de la section avancée enregistrée avant le changement
- **THEN** la contribution est placée au même endroit et l'adresse ouvre la même section, sous son nouveau titre

### Requirement: Plugin `core` : principal et type
Le plugin `core` SHALL fournir les onglets "principal" et "type". L'onglet "principal" SHALL contenir les paramètres de base du thermostat, ou ceux de la configuration centrale pour la configuration générale. Il SHALL ne fournir aucun onglet « fonctionnalités » : ni `core.tab.features`, ni `core.general.features`.

#### Scenario: Onglet principal d'un thermostat
- **WHEN** l'onglet principal d'un thermostat est affiché
- **THEN** il propose le nom, le capteur de température, le capteur de dernière vue (facultatif), la durée de cycle en minutes (défaut 5), la puissance de l'équipement (défaut 1) et son unité, et les options "utiliser la configuration centrale" (défaut oui), "utiliser le mode central" (défaut oui) et "utilisé par la chaudière centrale" (défaut non)

#### Scenario: Paramètres propres du principal
- **WHEN** l'héritage de la section principale est désactivé
- **THEN** l'onglet propose le capteur de température extérieure (obligatoire), la température minimale, la température maximale et le pas

#### Scenario: Principal de la configuration générale
- **WHEN** l'onglet principal de la configuration générale est affiché
- **THEN** il propose le capteur de température extérieure (obligatoire), la température minimale (défaut 7), la maximale (défaut 35) et le pas (défaut 0,1)

#### Scenario: Ancienne adresse de l'onglet des fonctionnalités
- **WHEN** l'utilisateur ouvre une adresse enregistrée de `core.tab.features`
- **THEN** la page par défaut du thermostat s'ouvre avec l'avis d'adresse inconnue

### Requirement: Activation des fonctionnalités par leur onglet
Chaque fonctionnalité que Versatile Thermostat propose pour le type de la configuration (ouverture, mouvement, puissance et présence pour tous ; panne de chauffage sans climate simple ; démarrage et arrêt automatiques pour `over_climate` sans régulation par vanne ; chaudière centrale pour la configuration générale) SHALL s'activer et se désactiver par l'interrupteur de son onglet. La valeur SHALL être enregistrée dans l'étape « features » du config flow.

#### Scenario: Activation d'une fonctionnalité
- **WHEN** l'administrateur active la fonctionnalité mouvement par l'interrupteur de l'onglet mouvement, puis enregistre
- **THEN** l'onglet mouvement passe du statut éteinte à son statut calculé, affiche ses champs, et Versatile Thermostat reçoit `use_motion_feature` dans l'étape « features »

#### Scenario: Désactivation d'une fonctionnalité
- **WHEN** l'administrateur décoche l'interrupteur affiché au-dessus de l'onglet mouvement actif
- **THEN** l'onglet repasse au statut éteinte, ses champs disparaissent, et les actions « Enregistrer » et « Annuler » sont au pied de la carte de l'interrupteur pour enregistrer la modification sur place

#### Scenario: Fonctionnalité non applicable
- **WHEN** un thermostat `over_switch` est ouvert
- **THEN** aucun onglet ne propose le démarrage et l'arrêt automatiques

### Requirement: Widgets de base des plugins natifs
Les plugins natifs SHALL déclarer chacun leurs widgets de la vue d'ensemble d'un thermostat dans une liste `thermostat_widget` : `core` les widgets `core.widget.temperature`, `core.widget.mode` et `core.widget.alerts`, `core_tpi` `core_tpi.widget.heating`, `core_valve_regulation` `core_valve_regulation.widget.valve`, `core_presets` `core_presets.widget.preset` et `core_advanced` `core_advanced.widget.safety`. Ils SHALL utiliser les mêmes mécanismes que les plugins tiers.

#### Scenario: Plugin à plusieurs widgets
- **WHEN** le dashboard charge le plugin `core`
- **THEN** il enregistre trois contributions `thermostat_widget`, chacune avec son placement et sa condition de visibilité

#### Scenario: Retrait par un plugin tiers
- **WHEN** un plugin tiers déclare `remove: core.widget.alerts` sur `thermostat_widget`
- **THEN** le widget Alertes n'apparaît plus et les autres gardent leur place

#### Scenario: Plugin sans widget
- **WHEN** le plugin `core_complements` est chargé
- **THEN** il ne déclare aucun widget

### Requirement: Widgets globaux des plugins natifs
Les plugins natifs SHALL déclarer chacun leurs widgets de la page Overview dans une liste `global_widget` : `core` les widgets `core.widget.central_mode`, `core.widget.summary` et `core.widget.outdoor`, `core_central_boiler` les widgets `core_central_boiler.widget.boiler` et `core_central_boiler.widget.boiler_power`, `core_power` le widget `core_power.widget.house_power` et `core_presence` le widget `core_presence.widget.presence`.

#### Scenario: Plugin à deux widgets globaux
- **WHEN** le dashboard charge le plugin `core_central_boiler`
- **THEN** il enregistre deux contributions `global_widget`, chacune avec son placement et sa condition de visibilité

#### Scenario: Remplacement par un plugin tiers
- **WHEN** un plugin tiers déclare `replace: core_central_boiler.widget.boiler`
- **THEN** son widget prend la place de la carte de la chaudière et `core_central_boiler.widget.boiler_power` garde son ordre

### Requirement: Widgets de fonctions des plugins natifs
Les plugins `core_window`, `core_motion`, `core_power`, `core_auto_start_stop`, `core_lock` et `core_heating_failure` SHALL déclarer chacun un widget de la vue d'ensemble d'un thermostat dans leur liste `thermostat_widget`, d'identifiant `<plugin>.widget.window`, `.motion`, `.overpowering`, `.auto_start_stop`, `.lock` et `.failure`.

#### Scenario: Plugin à plusieurs widgets
- **WHEN** le dashboard charge le plugin `core_power`
- **THEN** il enregistre le widget `core_power.widget.overpowering` du thermostat, sans retirer ses widgets globaux ou d'énergie déclarés par d'autres changes

#### Scenario: Plugin retiré
- **WHEN** le plugin `core_motion` est désactivé
- **THEN** le widget Mouvement n'apparaît plus et les autres gardent leur place

### Requirement: Widgets de détail des plugins natifs
Les plugins natifs SHALL déclarer chacun leurs widgets de détail de la vue d'ensemble d'un thermostat dans une liste `thermostat_widget` : `core` les widgets `core.widget.history` et `core.widget.devices`, `core_tpi` le widget `core_tpi.widget.auto_tpi`, `core_humidity` le widget `core_humidity.widget.humidity`, `core_sync_temp` le widget `core_sync_temp.widget.sync`, `core_central_boiler` le widget `core_central_boiler.widget.thermostat` et `core_power` le widget `core_power.widget.energy`.

#### Scenario: Plugin à deux widgets
- **WHEN** le dashboard charge le plugin `core`
- **THEN** il enregistre aussi `core.widget.history` et `core.widget.devices`, chacun avec son placement et sa condition de visibilité

#### Scenario: Remplacement de l'historique
- **WHEN** un plugin tiers déclare `replace: core.widget.history`
- **THEN** son widget prend la place de la carte d'historique, en dernière position
