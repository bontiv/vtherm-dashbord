# Spec Delta

## ADDED Requirements

### Requirement: Contrat des types de champs
Le SDK SHALL exporter un contrat de champs de configuration où chaque type de champ correspond à un contrôle Home Assistant : booléen, nombre, entier, texte, texte long, entité (une ou plusieurs, avec domaines et classes d'appareil), choix, durée et gabarit. Le SDK SHALL fournir la fonction pure qui transforme une définition de champ en description de sélecteur de Home Assistant.

#### Scenario: Champ entité à plusieurs valeurs
- **WHEN** un plugin déclare un champ entité avec plusieurs valeurs et le domaine `climate`
- **THEN** la description de sélecteur obtenue est un sélecteur `entity` en mode liste avec le filtre de domaine `climate`

#### Scenario: Type de champ inconnu
- **WHEN** un plugin déclare un type de champ absent du contrat
- **THEN** la compilation TypeScript échoue

### Requirement: Chargeur des composants de Home Assistant
Le SDK SHALL exporter une fonction qui rend disponibles les composants de Home Assistant utilisés par le contrat de champs et qui indique, sans lever d'erreur, si le chargement a réussi et quels composants sont définis (par exemple `ha-spinner` ou `ha-circular-progress`). Le SDK ne fournit pas d'élément de formulaire partagé : chaque plugin rend ses champs avec le contrat. Plusieurs appels SHALL partager un seul chargement.

#### Scenario: Appels répétés
- **WHEN** deux plugins appellent le chargeur en même temps
- **THEN** un seul chargement a lieu et les deux appels reçoivent le même résultat

### Requirement: Composants Home Assistant dans le harnais de test
Le harnais de test SHALL permettre de tester un composant de plugin qui utilise les composants de Home Assistant, sans Home Assistant : il fournit des éléments simulés des composants du contrat qui reçoivent les propriétés et émettent `value-changed` comme les vrais.

#### Scenario: Test d'un champ entité
- **WHEN** un test change la valeur d'un sélecteur d'entités simulé
- **THEN** le composant du plugin propose le changement correspondant au brouillon

#### Scenario: Propriétés transmises
- **WHEN** un test lit un sélecteur simulé
- **THEN** il peut vérifier le sélecteur, la valeur, le libellé, l'aide et l'erreur transmis
