# Spec Delta

## ADDED Requirements

### Requirement: Contrat du composant d'aide de champ
Le SDK SHALL exporter le nom de l'élément du composant d'aide de champ fourni par le dashboard, le type de ses propriétés (indication, explication, libellé du champ, identifiant de schéma ou schéma fourni, valeurs des réglages illustrés, réglage mis en évidence) et l'union typée des identifiants des schémas de la bibliothèque. Le SDK SHALL rester sans dépendance de rendu : l'élément est défini par le dashboard.

#### Scenario: Identifiant de schéma typé
- **WHEN** un plugin TypeScript donne au composant d'aide un identifiant de schéma absent de l'union exportée
- **THEN** la compilation TypeScript échoue

#### Scenario: Composant disponible
- **WHEN** un plugin crée l'élément d'aide dont le SDK exporte le nom, une fois chargé par le dashboard
- **THEN** l'élément est défini et affiche l'aide du champ

### Requirement: Composant d'aide dans le harnais de test
Le harnais de test du SDK SHALL fournir une version simplifiée du composant d'aide de champ, qui expose ses propriétés reçues, pour qu'un plugin puisse vérifier l'aide de ses champs sans le dashboard.

#### Scenario: Vérification par un plugin
- **WHEN** un test de plugin monte son onglet dans le harnais
- **THEN** il peut lire l'indication, l'explication et l'identifiant de schéma passés au composant d'aide de chaque champ
