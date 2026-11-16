# Spec Delta

## Purpose
Faire utiliser au dashboard les composants natifs de Home Assistant pour tous ses champs, afin que l'interface soit celle que l'utilisateur connaît déjà, avec les mêmes sélecteurs, filtres, accessibilité et thèmes.

## ADDED Requirements

### Requirement: Contrôle Home Assistant en priorité
Chaque champ du dashboard SHALL être dessiné avec le composant Home Assistant qui correspond à son type, quand ce composant existe. Un contrôle HTML générique (`input`, `select`, `textarea`, `datalist`, `button`) SHALL n'être utilisé que pour un champ sans équivalent Home Assistant ou en repli.

#### Scenario: Champ booléen
- **WHEN** un onglet affiche un champ booléen
- **THEN** il est dessiné avec un interrupteur Home Assistant (`ha-switch` via le sélecteur `boolean`), pas avec une case à cocher HTML

#### Scenario: Champ numérique
- **WHEN** un onglet affiche un champ numérique avec minimum, maximum et pas
- **THEN** il est dessiné avec le sélecteur `number` de Home Assistant, avec les mêmes bornes et le même pas

#### Scenario: Liste de choix fixes
- **WHEN** un onglet affiche un champ à choix fixes
- **THEN** il est dessiné avec le sélecteur `select` de Home Assistant, avec les libellés traduits des options

### Requirement: Sélection d'entités
Un champ qui désigne une ou plusieurs entités SHALL utiliser le sélecteur `entity` de Home Assistant, filtré par les domaines (et la classe d'appareil quand elle est connue) que Versatile Thermostat accepte pour ce champ. Une valeur absente de la liste proposée mais déjà enregistrée SHALL rester visible et modifiable.

#### Scenario: Capteur de température
- **WHEN** l'utilisateur ouvre le champ du capteur de température d'un thermostat
- **THEN** le sélecteur d'entités de Home Assistant propose les entités `sensor` de classe `temperature` et les entités `input_number` et `number`, avec recherche, nom, appareil et zone

#### Scenario: Valeur enregistrée hors filtre
- **WHEN** la configuration contient une entité que le filtre n'aurait pas proposée
- **THEN** l'entité est affichée dans le champ, sans être supprimée, et le serveur reste seul juge de sa validité

#### Scenario: Entité inconnue refusée par le serveur
- **WHEN** le serveur refuse une entité avec le code `unknown_entity`
- **THEN** l'erreur est affichée sous le champ, dans le contrôle Home Assistant, avec le texte traduit

### Requirement: Configuration des sous-jacents
La liste des sous-jacents d'un thermostat SHALL être saisie avec le sélecteur `entity` en mode liste, filtré par domaine selon le type de thermostat : `climate` pour un thermostat sur climate ; `switch`, `input_boolean`, `select`, `input_select` et `climate` pour un thermostat sur interrupteur ; `number` et `input_number` pour un thermostat sur vanne. L'ordre des entités SHALL être conservé et modifiable, car les listes parallèles (commandes, degrés d'ouverture) s'y alignent par position.

#### Scenario: Ajout d'un sous-jacent
- **WHEN** l'utilisateur ajoute une entité `climate` à un thermostat sur climate
- **THEN** la valeur proposée au brouillon est la liste des identifiants dans l'ordre affiché, sans zone de texte à une entité par ligne

#### Scenario: Réordonner
- **WHEN** l'utilisateur change l'ordre des sous-jacents
- **THEN** la liste proposée au brouillon suit le nouvel ordre

#### Scenario: Domaine non accepté
- **WHEN** le thermostat est sur vanne
- **THEN** le sélecteur ne propose que des entités `number` et `input_number`

### Requirement: Commandes d'allumage et d'extinction d'un thermostat sur interrupteur
Pour un thermostat sur interrupteur, les commandes d'allumage et d'extinction optionnelles SHALL être saisies avec des contrôles Home Assistant, une commande par sous-jacent, affichée en face de l'entité à laquelle elle s'applique. Les valeurs proposées au brouillon SHALL garder le format de Versatile Thermostat (`service_name[/attribute:value]`, une chaîne par sous-jacent, dans l'ordre des sous-jacents).

#### Scenario: Sous-jacent qui n'est pas un switch
- **WHEN** le thermostat a un sous-jacent `select` ou `climate`
- **THEN** les commandes d'allumage et d'extinction de ce sous-jacent sont affichées et signalées comme requises, avec le sélecteur de service de Home Assistant (`ha-service-picker`) et un champ pour l'attribut et sa valeur

#### Scenario: Sous-jacent de type switch
- **WHEN** le sous-jacent est un `switch` ou un `input_boolean`
- **THEN** les commandes sont optionnelles et peuvent rester vides

#### Scenario: Valeur enregistrée
- **WHEN** l'utilisateur renseigne un service et un attribut pour un sous-jacent
- **THEN** le brouillon contient la chaîne `service_name/attribute:value` à la position de ce sous-jacent

#### Scenario: Valeur existante illisible
- **WHEN** une commande enregistrée n'a pas le format attendu
- **THEN** elle est affichée telle quelle dans un champ texte Home Assistant, sans être perdue ni réécrite

#### Scenario: Service absent de la liste
- **WHEN** le service enregistré n'est pas proposé par le sélecteur de service ou que le composant est absent
- **THEN** la commande est affichée et modifiable dans un champ texte, sans perte

#### Scenario: Services de la chaudière centrale
- **WHEN** l'onglet de la chaudière centrale affiche les services d'activation et de désactivation
- **THEN** chacun est saisi avec un sélecteur d'entités, un sélecteur de service et un champ d'attribut, et la valeur enregistrée garde le format `entity_id/service_name[/attribute:value]`

### Requirement: Chargement des composants de Home Assistant
Le dashboard SHALL rendre disponibles les composants de Home Assistant qu'il utilise avant de dessiner un champ qui en dépend, même si aucune page de Home Assistant ne les a encore chargés. Pendant le chargement, le champ SHALL afficher un état d'attente.

#### Scenario: Premier affichage direct sur le dashboard
- **WHEN** l'utilisateur ouvre le dashboard sans avoir visité une autre page de Home Assistant
- **THEN** les champs apparaissent avec les composants de Home Assistant, sans écran vide ni erreur dans la console

#### Scenario: Composants déjà enregistrés
- **WHEN** les composants sont déjà enregistrés
- **THEN** le chargeur ne déclenche aucun chargement supplémentaire

### Requirement: Repli si les composants sont indisponibles
Si un composant de Home Assistant reste indisponible après le chargement (version trop ancienne, composant renommé), le champ SHALL se replier sur un contrôle HTML équivalent et le dashboard SHALL continuer à fonctionner, sans perte de valeur.

#### Scenario: Sélecteur absent
- **WHEN** le composant `ha-selector` n'est pas défini après le chargement
- **THEN** le champ utilise le contrôle HTML actuel, la valeur reste modifiable et un avertissement unique est écrit dans la console

### Requirement: Accessibilité, thème et traductions des contrôles
Chaque contrôle SHALL avoir un libellé, un texte d'aide et un message d'erreur traduits par le catalogue du plugin, passés au composant Home Assistant (`label`, `helper`, `error`). Les contrôles SHALL suivre le thème de Home Assistant, sans styles qui en contournent l'apparence.

#### Scenario: Libellé et aide
- **WHEN** un champ a une clé `field.<clé>` et `help.<clé>` dans le catalogue
- **THEN** le composant affiche ce libellé et cette aide dans la langue de l'utilisateur

#### Scenario: Thème sombre
- **WHEN** l'utilisateur utilise un thème sombre ou personnalisé
- **THEN** les contrôles prennent les couleurs du thème sans règle CSS propre au dashboard

### Requirement: Délais saisis comme nombres avec unité
Les champs de délai (minutes ou secondes) SHALL être saisis avec le sélecteur de nombre de Home Assistant et l'unité du champ, et enregistrés comme nombre dans cette unité, sans conversion.

#### Scenario: Délai en secondes
- **WHEN** l'onglet de la chaudière centrale affiche le délai d'activation
- **THEN** il est saisi comme un nombre avec l'unité « s » et la valeur enregistrée est ce nombre

#### Scenario: Délai en minutes
- **WHEN** l'onglet principal affiche la durée d'un cycle
- **THEN** il est saisi comme un nombre avec l'unité « min » et les bornes du serveur

### Requirement: Messages, bandeaux et erreurs
Tout message affiché à l'utilisateur (erreur, avertissement, information, liste vide) SHALL utiliser `ha-alert` avec le type `error`, `warning` ou `info` correspondant, et rester annoncé aux technologies d'assistance.

#### Scenario: Catalogue périmé
- **WHEN** le catalogue des compléments n'a pas pu être rafraîchi
- **THEN** un message de type `warning` indique la date de la copie utilisée

#### Scenario: Échec d'un plugin
- **WHEN** le composant d'un plugin échoue à s'afficher
- **THEN** un message de type `error` donne l'identifiant de la contribution et la cause

#### Scenario: Erreur du serveur sur un champ
- **WHEN** le serveur refuse une valeur avec un code d'erreur
- **THEN** le texte traduit est affiché sur le champ, dans le contrôle ou juste sous lui

### Requirement: Confirmations par dialogue Home Assistant
Les confirmations (installation d'un complément, redémarrage de Home Assistant, abandon d'un brouillon non enregistré) SHALL utiliser un dialogue de Home Assistant (`ha-dialog` ou son dialogue de confirmation), avec un repli si le composant est absent. Le repli SHALL demander la confirmation avant de continuer.

#### Scenario: Redémarrage
- **WHEN** l'utilisateur demande le redémarrage de Home Assistant
- **THEN** un dialogue de Home Assistant demande la confirmation avant l'appel

#### Scenario: Quitter avec un brouillon
- **WHEN** l'utilisateur quitte une page avec des modifications non enregistrées
- **THEN** un dialogue de confirmation s'affiche, et l'annulation garde l'utilisateur sur la page

#### Scenario: Dialogue indisponible
- **WHEN** le composant de dialogue est absent
- **THEN** la confirmation passe par le repli et l'action n'a jamais lieu sans confirmation

### Requirement: Tableaux, cartes et listes
Les tableaux de données SHALL utiliser `ha-data-table`, ou `ha-card` avec une liste quand le tableau ne peut pas contenir les contrôles voulus. Les cartes et sections SHALL utiliser `ha-card`. Le menu de gauche, la liste des thermostats et le sélecteur de thermostat SHALL utiliser les listes, sélecteurs et boutons de Home Assistant, avec les liens (`href`) conservés.

#### Scenario: État des plugins
- **WHEN** la page d'état des plugins s'affiche
- **THEN** chaque plugin apparaît dans un tableau ou une carte de Home Assistant avec son état

#### Scenario: Carte de complément
- **WHEN** la page des compléments affiche un complément
- **THEN** il est dans un `ha-card`

#### Scenario: Navigation au clavier et lien
- **WHEN** l'utilisateur ouvre un thermostat de la liste avec le clavier ou un clic du milieu
- **THEN** le lien s'ouvre comme un lien normal et la navigation interne reste active pour un clic simple

#### Scenario: Éléments sans équivalent
- **WHEN** un élément n'a pas d'équivalent public dans Home Assistant (onglets de la barre haute, fil d'Ariane)
- **THEN** il reste en HTML avec un commentaire d'exception qui nomme le composant écarté

### Requirement: États de chargement et progression
Les états de chargement et la progression d'une installation SHALL utiliser un indicateur de progression de Home Assistant (`ha-spinner` ou `ha-circular-progress`, selon la version) avec un texte accessible.

#### Scenario: Catalogue en chargement
- **WHEN** le catalogue est en cours de lecture
- **THEN** un indicateur de progression et le texte de chargement s'affichent

#### Scenario: Installation en cours
- **WHEN** un complément s'installe
- **THEN** l'indicateur est visible avec le texte de l'étape en cours

### Requirement: Groupes de champs repliables
Un groupe de champs long SHALL être regroupé dans `ha-expansion-panel`. Un groupe qui contient un champ en erreur SHALL être ouvert.

#### Scenario: Erreur dans un groupe fermé
- **WHEN** le serveur refuse un champ d'un groupe replié
- **THEN** le groupe s'ouvre et l'erreur est visible

### Requirement: Fiche d'une entité affichée
Une entité affichée hors d'un sélecteur (valeur centrale en lecture seule, suggestion) SHALL ouvrir la fiche de l'entité dans Home Assistant par l'événement `hass-more-info` avec son identifiant.

#### Scenario: Clic sur une entité
- **WHEN** l'utilisateur clique sur une entité affichée
- **THEN** un événement `hass-more-info` avec `entityId` de cette entité est émis, et la fiche de Home Assistant s'ouvre

#### Scenario: Identifiant inconnu
- **WHEN** l'identifiant ne correspond à aucune entité
- **THEN** aucun événement n'est émis

### Requirement: Version minimale de Home Assistant
Le dashboard SHALL déclarer la version minimale de Home Assistant dont il utilise les composants et SHALL fonctionner, avec les replis de la spec, sur toute version qui ne les a pas tous.

#### Scenario: Composant récent absent
- **WHEN** un composant récent est absent de la version de Home Assistant
- **THEN** l'écran concerné utilise son repli et le reste du dashboard fonctionne

### Requirement: Contrôles hors configuration
Les contrôles de l'assistant de création, des filtres de la page Compléments, de la page de développement, des boutons d'action et des températures de preset SHALL utiliser les composants de Home Assistant équivalents (`ha-selector`, `ha-textfield`, `ha-select`, `ha-switch`, `ha-button`, `ha-icon`).

#### Scenario: Bouton d'action
- **WHEN** le dashboard affiche un bouton (créer, annuler, utiliser la suggestion)
- **THEN** il est dessiné avec `ha-button`

#### Scenario: Température de preset
- **WHEN** l'onglet des presets affiche une température
- **THEN** elle est saisie avec le sélecteur `number` avec l'unité de la température
