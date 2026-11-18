# setting-insights Specification

## Purpose
Montrer, pendant la saisie et avant l'enregistrement, ce que Versatile Thermostat ferait avec les réglages modifiés, calculé sur les données enregistrées du thermostat, pour choisir les valeurs en connaissance de cause.

## Requirements

### Requirement: Estimations sur les valeurs du brouillon
Les panneaux d'estimation SHALL utiliser les valeurs effectives du brouillon en cours, y compris les valeurs héritées de la configuration centrale, et SHALL se recalculer à chaque modification sans enregistrer ni attendre un enregistrement.

#### Scenario: Modification d'un coefficient
- **WHEN** l'administrateur change `coef_int` de 0,6 à 0,8 sans enregistrer
- **THEN** la part de chauffe estimée et les courbes rejouées sont recalculées avec 0,8

#### Scenario: Valeur héritée
- **WHEN** le thermostat utilise la configuration TPI centrale
- **THEN** les estimations utilisent les coefficients de la configuration centrale

### Requirement: Estimations étiquetées
Toute valeur ou courbe calculée par le dashboard SHALL être marquée comme estimation, distinctement des valeurs enregistrées par Versatile Thermostat, et chaque panneau SHALL indiquer ses limites connues.

#### Scenario: Distinction des séries
- **WHEN** un graphique montre la part de chauffe estimée et celle enregistrée par VT
- **THEN** la légende les distingue par libellé et par style de trait, et la série calculée porte la mention « estimation »

### Requirement: Fidélité aux règles de Versatile Thermostat
Les calculs SHALL reproduire les règles de Versatile Thermostat de la version de référence du projet : formule et plafonds TPI, seuils d'arrêt et de reprise, temps minimaux d'activation et de désactivation, lissage et pente de la détection d'ouverture, condition de silence du mode sécurité. Chaque règle portée SHALL être couverte par des tests sur des cas tirés du comportement de VT.

#### Scenario: Temps minimal d'activation
- **WHEN** la part estimée donne 20 s de chauffe pour un temps minimal d'activation de 30 s
- **THEN** l'estimation est de 0 s de chauffe et le panneau explique que l'impulsion est trop courte

#### Scenario: Seuil d'arrêt
- **WHEN** la pièce dépasse la consigne de plus que le seuil haut alors que sa température monte
- **THEN** l'estimation est un arrêt de chauffe et le panneau l'explique

### Requirement: Panneau TPI
Dans l'onglet TPI d'un thermostat existant, le dashboard SHALL afficher un panneau qui donne la part de chauffe actuelle estimée, décomposée en partie pièce et partie extérieure avec les plafonds appliqués, et la durée de chauffe par cycle qui en résulte.

#### Scenario: Calcul détaillé
- **WHEN** la pièce est à 19,5° pour une consigne de 20,5°, l'extérieur à 5°, `coef_int` 0,6 et `coef_ext` 0,01
- **THEN** le panneau affiche 60 % pour la partie pièce, 15,5 % pour la partie extérieure, une part de 75,5 % et la durée de chauffe correspondante pour la durée de cycle saisie

#### Scenario: Sans capteur extérieur
- **WHEN** aucun capteur extérieur n'est configuré
- **THEN** la partie extérieure vaut 0 et le panneau l'indique

#### Scenario: Essai d'une autre consigne
- **WHEN** l'administrateur saisit une consigne d'essai dans le panneau
- **THEN** l'estimation utilise cette consigne sans modifier celle du thermostat, et un bouton revient à la consigne actuelle

### Requirement: Rejeu TPI
Le panneau TPI SHALL proposer un rejeu sur 24 h et sur 7 jours qui trace la température de la pièce, la consigne, la part de chauffe estimée avec les réglages saisis et la part enregistrée par Versatile Thermostat, avec leurs moyennes sur la période et des indicateurs de confort : temps moyen de montée, dépassement maximal après atteinte de la consigne, part du temps à ±0,5° de la consigne.

#### Scenario: Écart entre estimation et enregistrement
- **WHEN** les réglages saisis diffèrent de ceux en vigueur pendant la période
- **THEN** le panneau affiche les deux moyennes et explique qu'elles diffèrent quand les réglages ou le mode ont changé

#### Scenario: Consignes abaissées
- **WHEN** la période contient des baisses de consigne
- **THEN** elles sont exclues du calcul du temps de montée et le panneau le mentionne

### Requirement: Rejeu de la détection d'ouverture
Dans l'onglet d'ouverture, quand la détection automatique est utilisée, le dashboard SHALL rejouer sur 24 h ou 7 jours la pente de température calculée selon les règles de VT et montrer, avec les seuils saisis, les périodes où une ouverture aurait été détectée et leur fin, la chute la plus forte et sa date.

#### Scenario: Aucune détection
- **WHEN** aucune pente de la période n'atteint le seuil d'ouverture saisi
- **THEN** le panneau indique qu'aucune ouverture n'aurait été détectée sur la période et donne la chute la plus forte

#### Scenario: Durée maximale
- **WHEN** une détection rejouée dure plus que la durée maximale saisie
- **THEN** elle s'arrête à cette durée et le panneau le signale

#### Scenario: Seuil absent
- **WHEN** aucun seuil de détection n'est saisi
- **THEN** le panneau trace seulement la pente et invite à saisir un seuil

### Requirement: Rejeu des pertes de capteur
Dans l'onglet avancé d'un thermostat, le dashboard SHALL montrer sur 24 h ou 7 jours les silences des capteurs de température intérieure et extérieure, ceux qui dépassent le délai de sécurité saisi et le plus long silence. Pour un thermostat sur climate sans régulation par vanne, le panneau SHALL indiquer que ces réglages n'ont pas d'effet.

#### Scenario: Silence long
- **WHEN** le capteur de la pièce n'a rien envoyé pendant 70 minutes avec un délai de sécurité de 60 minutes
- **THEN** ce silence est marqué comme déclenchant le mode sécurité, sous réserve de la condition de chauffe minimale indiquée par le panneau

#### Scenario: Thermostat sur climate
- **WHEN** l'onglet avancé d'un thermostat `over_climate` sans régulation par vanne est affiché
- **THEN** le panneau explique que VT ne passe pas en mode sécurité pour ce type et ne trace pas de rejeu

### Requirement: Historique lu sans écriture
Le dashboard SHALL lire l'historique par l'API du recorder de Home Assistant, uniquement pour les entités du thermostat affiché et seulement quand un panneau est ouvert, et SHALL garder les résultats en cache quelques minutes par entité et par période. Il SHALL n'écrire aucune donnée.

#### Scenario: Panneau fermé
- **WHEN** un onglet avec un panneau d'estimation est affiché et que le panneau est replié
- **THEN** aucune requête d'historique n'est envoyée

#### Scenario: Changement de période
- **WHEN** l'administrateur passe de 24 h à 7 jours puis revient à 24 h dans les minutes qui suivent
- **THEN** l'historique de 24 h n'est pas redemandé

### Requirement: États sans données
Un panneau SHALL afficher un message explicite au lieu d'un graphique quand le thermostat n'existe pas encore, quand le capteur nécessaire n'est pas choisi, pendant le chargement, en cas d'échec de lecture de l'historique ou quand la période contient trop peu de mesures.

#### Scenario: Création en cours
- **WHEN** l'onglet TPI est affiché dans l'assistant de création
- **THEN** le panneau donne l'estimation actuelle si les capteurs sont choisis, et indique que le rejeu apparaîtra une fois le thermostat créé

#### Scenario: Recorder indisponible
- **WHEN** la lecture de l'historique échoue
- **THEN** le panneau affiche un message d'erreur traduit et le reste de l'onglet fonctionne normalement

### Requirement: Graphiques accessibles et adaptés
Les graphiques SHALL utiliser les couleurs du thème de Home Assistant, les formats régionaux de l'utilisateur pour les heures, dates, nombres et unités de température, tenir sans débordement horizontal sur un écran de 360 px, permettre de lire la valeur d'un instant au survol, au toucher et au clavier, et fournir un résumé textuel annoncé aux technologies d'assistance.

#### Scenario: Lecture au toucher
- **WHEN** l'administrateur touche un point d'un graphique sur un téléphone
- **THEN** l'heure et les valeurs des séries à cet instant sont affichées

#### Scenario: Lecteur d'écran
- **WHEN** un lecteur d'écran atteint un graphique
- **THEN** il lit le résumé du panneau, par exemple la part de chauffe moyenne estimée et enregistrée sur la période
