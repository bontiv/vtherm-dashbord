# Spec Delta

## ADDED Requirements

### Requirement: Registres et formateurs dans le type de l'état
Le type `Hass` du SDK SHALL décrire, en lecture seule et comme facultatifs, les registres `entities` (identifiant d'entité, identifiant d'appareil, plateforme, clé de traduction) et `devices` (identifiant, identifiants `identifiers`, entrées de configuration), et les formateurs `formatEntityState` et `formatEntityAttributeValue`. Un plugin qui ne les lit pas SHALL rester valide sans changement.

#### Scenario: Plugin existant
- **WHEN** un plugin publié avant ce changement est compilé avec le nouveau SDK
- **THEN** la compilation réussit sans modification

#### Scenario: Registre absent
- **WHEN** un plugin lit `hass.entities` dans une version de Home Assistant qui ne le fournit pas
- **THEN** la valeur est `undefined` et le type l'a annoncé

### Requirement: Entités d'une entrée de configuration
Le SDK SHALL exporter `getEntryEntities(hass, entryId)`, fonction pure et synchrone qui trouve l'appareil d'une entrée de configuration de Versatile Thermostat par ses `identifiers` dans `hass.devices`, puis renvoie ses entités (identifiant, domaine, clé de traduction), sa première entité `climate` et un dictionnaire clé de traduction vers identifiant d'entité. Elle SHALL ne faire aucun appel réseau et SHALL renvoyer des valeurs vides, sans erreur, pour une entrée inconnue ou un registre absent.

#### Scenario: Thermostat connu
- **WHEN** un widget appelle la fonction avec l'identifiant de l'entrée de configuration d'un thermostat
- **THEN** il obtient l'entité `climate` du thermostat et, par clé de traduction (par exemple `power_percent`), le capteur de son appareil

#### Scenario: Configuration centrale
- **WHEN** un widget appelle la fonction avec l'identifiant de l'entrée de la configuration centrale
- **THEN** il obtient les entités de l'appareil central, dont le `select` du mode central par son domaine

#### Scenario: Identifiant qui n'est pas une entrée
- **WHEN** un plugin passe `climate.salon` au lieu de l'identifiant de l'entrée de configuration
- **THEN** la fonction renvoie des valeurs vides

#### Scenario: Registre absent
- **WHEN** `hass.devices` ou `hass.entities` est absent
- **THEN** la fonction renvoie des valeurs vides sans lever d'erreur

#### Scenario: Aucun appel réseau
- **WHEN** la fonction est appelée dans une condition de visibilité
- **THEN** aucun `callWS` n'est émis et le résultat est disponible au même instant

### Requirement: Configuration centrale pour les widgets globaux
Un composant `global_widget` et sa condition de visibilité SHALL recevoir `central`, l'identifiant de l'entrée de la configuration centrale et ses valeurs, absent quand il n'y a pas de configuration centrale. Les plugins existants SHALL rester valides.

#### Scenario: Configuration centrale présente
- **WHEN** une configuration centrale existe et qu'un widget global est affiché
- **THEN** le widget reçoit l'identifiant de l'entrée et ses valeurs, et sa condition de visibilité les reçoit aussi

#### Scenario: Sans configuration centrale
- **WHEN** aucune configuration centrale n'existe
- **THEN** `central` est absent

#### Scenario: Plugin existant
- **WHEN** un plugin tiers publié avant ce changement déclare un widget global
- **THEN** il reste valide et ne reçoit qu'une propriété de plus

### Requirement: Taille d'un widget
Les contributions `global_widget` et `thermostat_widget` SHALL pouvoir déclarer `size`, objet facultatif `{ columns?, rows? }` où `columns` vaut 1, 2, 3 ou `"full"` et `rows` vaut 1, 2 ou 3. Sans `size`, la taille SHALL être une colonne sans hauteur minimale. Une valeur hors de ces ensembles, une clé inconnue, ou `size` sur un autre hook SHALL être refusée à l'enregistrement avec le chemin de l'élément fautif, et la compilation TypeScript SHALL échouer pour ces cas.

#### Scenario: Plugin existant
- **WHEN** un plugin publié avant ce changement déclare un widget sans `size`
- **THEN** il reste valide et son widget occupe une colonne comme avant

#### Scenario: Taille valide
- **WHEN** un plugin déclare `size: { columns: 2, rows: 2 }` sur un `thermostat_widget`
- **THEN** la contribution est acceptée avec cette taille

#### Scenario: Colonnes invalides
- **WHEN** un plugin déclare `size: { columns: 4 }`
- **THEN** la compilation TypeScript échoue et `registerUiPlugin` refuse la contribution avec une erreur dont le chemin se termine par `size.columns`

#### Scenario: Clé inconnue
- **WHEN** un plugin déclare `size: { width: 2 }`
- **THEN** la contribution est refusée avec une erreur qui désigne `size`

#### Scenario: Autre hook
- **WHEN** un plugin déclare `size` sur une contribution `thermostat_config`
- **THEN** la compilation TypeScript échoue et la validation rejette la contribution

#### Scenario: Taille partielle
- **WHEN** un plugin déclare `size: { columns: "full" }`
- **THEN** `rows` prend la valeur 1

### Requirement: Harnais de test des widgets
Le faux `hass` du harnais de test SHALL accepter les registres `entities` et `devices`, pour tester un widget qui utilise `getEntryEntities` sans Home Assistant, et les contributions résolues d'un hook de widget SHALL porter leur taille normalisée (valeurs par défaut comprises).

#### Scenario: Test d'un widget
- **WHEN** un test déclare un appareil et un capteur `power_percent` dans le faux `hass` et affiche un widget
- **THEN** le widget lit ce capteur et le test peut vérifier la valeur affichée

#### Scenario: Entrée non déclarée
- **WHEN** un test affiche un widget pour une entrée absente des registres du faux `hass`
- **THEN** `getEntryEntities` renvoie des valeurs vides, comme dans le dashboard

#### Scenario: Taille résolue
- **WHEN** un test enregistre un widget sans `size`
- **THEN** la liste résolue du hook indique `columns: 1` et `rows: 1` pour lui

#### Scenario: Mêmes règles de validation
- **WHEN** un test enregistre un widget avec `size: { rows: 5 }` dans le faux hôte
- **THEN** il retourne la même erreur que `registerUiPlugin` dans le dashboard
