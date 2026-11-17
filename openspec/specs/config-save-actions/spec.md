# config-save-actions Specification

## Purpose
Présenter l'enregistrement et l'annulation d'une section de configuration comme le font les pages de configuration de Home Assistant : actions en pied de la carte de la section et retour visuel du bouton Enregistrer.

## Requirements

### Requirement: Actions en pied de la carte de la section
Une section de configuration éditable SHALL porter ses actions en pied de sa carte, séparées du contenu comme les actions d'une carte de Home Assistant : « Annuler les modifications » à gauche, en bouton discret avec l'icône de restauration, et « Enregistrer » à droite, en bouton principal rempli. Aucune barre d'enregistrement SHALL n'être affichée hors de la carte.

#### Scenario: Section ouverte
- **WHEN** l'administrateur ouvre une section de configuration d'un thermostat
- **THEN** le pied de la carte de la section affiche « Annuler les modifications » à gauche et « Enregistrer » à droite, sous un trait de séparation

#### Scenario: Pas de barre en bas de page
- **WHEN** l'administrateur modifie un champ puis fait défiler la page
- **THEN** aucune barre d'enregistrement n'est collée en bas de l'écran ; les actions restent dans le pied de la carte

#### Scenario: Configuration en lecture seule
- **WHEN** la configuration ouverte est en lecture seule
- **THEN** la carte n'affiche aucune action d'enregistrement ni d'annulation

### Requirement: Actions selon l'état du brouillon
Les actions SHALL être affichées tant que la configuration est éditable, même sans modification. Elles SHALL être désactivées quand le brouillon n'a aucune modification et pendant un enregistrement. Enregistrer SHALL écrire toutes les modifications du brouillon de la configuration, quelle que soit la section où elles ont été faites.

#### Scenario: Aucune modification
- **WHEN** l'administrateur ouvre une section sans avoir rien modifié
- **THEN** « Annuler les modifications » et « Enregistrer » sont visibles et désactivés

#### Scenario: Modification faite
- **WHEN** l'administrateur modifie un champ
- **THEN** les deux actions deviennent actives et l'indication « Modifications non enregistrées » s'affiche au-dessus d'elles, dans la carte

#### Scenario: Modifications dans deux sections
- **WHEN** l'administrateur modifie un champ de la section TPI puis un champ des attributs principaux et enregistre depuis les attributs principaux
- **THEN** les modifications des deux sections sont enregistrées

### Requirement: Progression de l'enregistrement
Pendant un enregistrement, le bouton Enregistrer SHALL montrer l'indicateur de progression de Home Assistant à la place de son texte, en gardant son nom accessible, et ne SHALL pas accepter un second clic.

#### Scenario: Enregistrement en cours
- **WHEN** l'administrateur clique sur Enregistrer
- **THEN** le bouton montre l'indicateur de progression, les deux actions sont inactives et un second clic n'envoie pas de nouvel enregistrement

### Requirement: Succès signalé par le bouton
Quand l'enregistrement réussit, le bouton Enregistrer SHALL passer en vert (couleur de succès du thème) avec une coche pendant environ deux secondes, puis reprendre son apparence normale. Aucun message texte de succès SHALL n'être affiché ; le succès SHALL être annoncé aux lecteurs d'écran.

#### Scenario: Enregistrement réussi
- **WHEN** l'administrateur enregistre un brouillon valide
- **THEN** le bouton devient vert avec une coche, l'indication « Modifications non enregistrées » disparaît, puis après environ deux secondes le bouton redevient « Enregistrer », désactivé

#### Scenario: Lecteur d'écran
- **WHEN** l'enregistrement réussit et qu'un lecteur d'écran est actif
- **THEN** le lecteur d'écran annonce que la configuration est enregistrée

### Requirement: Échec signalé par le bouton et dans la carte
Quand l'enregistrement est refusé ou n'aboutit pas, le bouton Enregistrer SHALL passer en rouge (couleur d'erreur du thème) avec une icône d'alerte pendant environ deux secondes. Les erreurs des champs SHALL rester affichées sur les champs ; les erreurs générales SHALL être affichées dans la carte, au-dessus des actions, avec un message d'erreur de Home Assistant.

#### Scenario: Valeur refusée
- **WHEN** l'enregistrement est refusé à cause d'une valeur d'un champ
- **THEN** le bouton passe en rouge avec l'icône d'alerte, l'erreur est affichée sur le champ et le brouillon est conservé

#### Scenario: Erreur générale
- **WHEN** l'enregistrement est refusé avec une erreur qui ne concerne aucun champ
- **THEN** le message traduit de l'erreur est affiché dans la carte, au-dessus des actions

#### Scenario: Échec de la connexion
- **WHEN** l'enregistrement échoue parce que Home Assistant ne répond pas
- **THEN** le bouton passe en rouge, un message d'erreur est affiché au-dessus des actions et le brouillon est conservé

### Requirement: Enregistrement partiel
Quand la configuration est enregistrée mais que des températures de preset n'ont pas pu être appliquées, le bouton SHALL signaler l'échec et un avertissement SHALL être affiché au-dessus des actions pour dire que la configuration est enregistrée et que certaines températures ne l'ont pas été.

#### Scenario: Températures non appliquées
- **WHEN** l'enregistrement écrit la configuration mais qu'une température de preset est refusée
- **THEN** le bouton passe en rouge avec l'icône d'alerte, et un avertissement indique que la configuration est enregistrée mais que certaines températures n'ont pas pu être appliquées

### Requirement: Annulation depuis la carte
« Annuler les modifications » SHALL remettre tous les champs du brouillon de la configuration aux valeurs enregistrées, sans confirmation, dans toutes les sections.

#### Scenario: Annulation
- **WHEN** l'administrateur a modifié deux sections et clique sur « Annuler les modifications » dans l'une d'elles
- **THEN** les champs des deux sections reprennent les valeurs enregistrées et les actions redeviennent inactives

### Requirement: Actions pour un composant de configuration tiers
Un composant de configuration qui déclare dessiner lui-même les actions SHALL les recevoir du dashboard et les placer en pied de sa carte. Pour un composant qui ne le déclare pas, le dashboard SHALL afficher sous lui une carte qui ne contient que les messages et les actions, avec le même comportement.

#### Scenario: Plugin tiers sans déclaration
- **WHEN** l'administrateur ouvre une section de configuration fournie par un plugin tiers qui ne dessine pas les actions
- **THEN** une carte d'actions du dashboard est affichée sous le composant, avec « Annuler les modifications » et « Enregistrer »

#### Scenario: Onglet natif
- **WHEN** l'administrateur ouvre une section native
- **THEN** les actions sont dans le pied de la carte de la section et aucune carte d'actions supplémentaire n'est affichée

### Requirement: Actions sur un écran étroit
Sur un écran étroit, les actions SHALL rester dans le pied de la carte, « Annuler les modifications » à gauche et « Enregistrer » à droite, avec des cibles tactiles suffisantes et sans débordement horizontal ; les messages au-dessus des actions SHALL passer à la ligne.

#### Scenario: Téléphone
- **WHEN** l'administrateur modifie un champ sur un écran de 375 px de large et fait défiler jusqu'au bas de la carte
- **THEN** les deux actions sont visibles et utilisables dans le pied de la carte, sans défilement horizontal

### Requirement: Repli des actions
Si le bouton à progression de Home Assistant est indisponible, le dashboard SHALL dessiner un bouton de Home Assistant, ou un bouton HTML si celui-ci manque aussi, qui affiche « Enregistrement… » pendant l'enregistrement et un message de succès ou d'échec visible ; l'enregistrement et l'annulation SHALL fonctionner de la même façon.

#### Scenario: Composant absent
- **WHEN** le bouton à progression de Home Assistant n'est pas défini après le chargement des composants
- **THEN** la carte affiche un bouton Enregistrer de repli, l'enregistrement fonctionne et son résultat est affiché en texte au-dessus des actions
