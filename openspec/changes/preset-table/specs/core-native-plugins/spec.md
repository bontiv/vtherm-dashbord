# Spec Delta

## MODIFIED Requirements

### Requirement: Plugin `core_presets`
Le plugin `core_presets` SHALL fournir l'onglet des presets : l'option "utiliser les presets centraux" et, sans héritage, la modification des températures de preset du thermostat. Dans la configuration générale, il SHALL permettre de modifier les températures de preset centrales. Ces températures sont des entités `number.*` de Versatile Thermostat, hors du config flow. Elles SHALL être présentées dans un tableau à une ligne par preset et une colonne par situation.

#### Scenario: Presets propres
- **WHEN** l'héritage des presets est désactivé
- **THEN** les températures de preset du thermostat sont affichées et modifiables, avec les variantes climatisation si le mode climatisation est actif et absence si la présence est activée

#### Scenario: Modification d'une température
- **WHEN** l'administrateur modifie la température d'un preset
- **THEN** la valeur est appliquée à l'entité de preset correspondante

## ADDED Requirements

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
