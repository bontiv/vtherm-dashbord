# frontend-dev-server Specification

## Purpose
Permettre aux contributeurs du dashboard de voir une modification TypeScript du panneau, des plugins natifs ou du SDK dans un Home Assistant de développement, sans build ni redémarrage, en chargeant le frontend depuis un serveur de développement.

## Requirements

### Requirement: Activation par variable d'environnement
L'intégration SHALL activer le mode frontend de développement uniquement quand la variable d'environnement `VTHERM_DASHBOARD_DEV_SERVER` du processus de Home Assistant contient une URL absolue `http` ou `https`. La variable SHALL être lue au chargement de l'intégration ; un changement de sa valeur SHALL demander un redémarrage de Home Assistant.

#### Scenario: Variable absente
- **WHEN** Home Assistant démarre sans `VTHERM_DASHBOARD_DEV_SERVER`, ou avec une valeur vide
- **THEN** l'intégration sert le build de `www/`, exactement comme sans ce change

#### Scenario: Variable valide
- **WHEN** Home Assistant démarre avec `VTHERM_DASHBOARD_DEV_SERVER=http://localhost:5198`
- **THEN** le mode frontend de développement est actif

#### Scenario: Variable invalide
- **WHEN** la variable vaut une valeur qui n'est pas une URL absolue `http` ou `https`, par exemple `localhost:5198` ou `javascript:alert(1)`
- **THEN** le mode n'est pas actif, l'intégration se comporte comme sans la variable et écrit une erreur dans le journal qui cite la valeur refusée

### Requirement: Signalement du mode actif
Quand le mode frontend de développement est actif, l'intégration SHALL écrire dans le journal de Home Assistant, au niveau avertissement, que le frontend est chargé depuis un serveur de développement, avec l'URL utilisée.

#### Scenario: Démarrage en mode développement
- **WHEN** l'intégration est chargée avec le mode actif
- **THEN** le journal contient un avertissement qui nomme l'URL du serveur de développement

### Requirement: Module du panneau servi par le serveur de développement
Quand le mode est actif, le panneau « Versatile Thermostat » SHALL charger son module depuis le point d'entrée TypeScript du frontend sur le serveur de développement, et non depuis le build de `www/`. Le titre, l'icône, l'URL du panneau et la restriction aux administrateurs SHALL rester les mêmes que sans le mode.

#### Scenario: Ouverture du panneau
- **WHEN** un administrateur ouvre le panneau avec le mode actif et le serveur de développement démarré
- **THEN** le navigateur importe le module du panneau depuis l'URL du serveur de développement et le panneau s'affiche

#### Scenario: Restriction inchangée
- **WHEN** un utilisateur qui n'est pas administrateur se connecte avec le mode actif
- **THEN** le panneau n'apparaît pas dans son menu latéral

### Requirement: Démarrage sans build
Quand le mode est actif, l'intégration SHALL démarrer même si le module du build est absent de `www/`. Sans le mode, l'intégration SHALL continuer de refuser de démarrer quand ce module manque.

#### Scenario: Pas de build en mode développement
- **WHEN** `www/` est absent ou vide et que le mode est actif
- **THEN** l'entrée de configuration se charge sans erreur et le panneau est enregistré

#### Scenario: Pas de build sans le mode
- **WHEN** `www/` ne contient pas le module du panneau et que le mode n'est pas actif
- **THEN** le chargement de l'entrée échoue avec le message qui demande de construire le frontend ou d'installer une archive de release

### Requirement: Plugins natifs servis par le serveur de développement
Quand le mode est actif, chaque plugin natif SHALL être enregistré avec l'URL de son module source sur le serveur de développement. Son identifiant, sa contrainte de version, ses dépendances et son ordre de chargement SHALL rester ceux du mode normal.

#### Scenario: Liste des plugins
- **WHEN** le dashboard demande la liste des plugins avec le mode actif
- **THEN** l'URL de module de chaque plugin natif désigne le serveur de développement, et les autres champs sont identiques à ceux du mode normal

#### Scenario: Plugins tiers
- **WHEN** une autre intégration a enregistré un plugin, ou qu'une entrée du mode développement des plugins existe dans le navigateur
- **THEN** l'URL de ce plugin n'est pas modifiée par le mode frontend de développement

#### Scenario: Adresse du serveur réservée aux plugins natifs
- **WHEN** le mode est actif et qu'un plugin enregistré par une autre intégration donne une URL du serveur de développement, ou qu'un plugin natif donne une URL d'un autre hôte
- **THEN** la liste des plugins marque ce plugin `invalid` avec la raison `invalid_url`, comme sans le mode

### Requirement: Modification visible sans build ni redémarrage
Avec le mode actif et le serveur de développement démarré, une modification d'un fichier TypeScript du panneau, d'un plugin natif ou du SDK SHALL être prise en compte au rechargement suivant de la page du panneau, sans build et sans redémarrage de Home Assistant ni rechargement de l'intégration.

#### Scenario: Modification d'un composant
- **WHEN** un contributeur modifie un fichier de `frontend/src/` ou de `packages/sdk/src/` puis recharge la page du panneau
- **THEN** le panneau affiche le comportement modifié

#### Scenario: Rechargement automatique
- **WHEN** un fichier source est enregistré pendant que la page du panneau est ouverte et que le serveur de développement peut joindre la page
- **THEN** la page se recharge d'elle-même ; si ce rechargement n'a pas lieu, un rechargement manuel suffit

### Requirement: Serveur de développement accessible depuis Home Assistant
Le serveur de développement SHALL écouter sur un port fixe, distinct de celui de la prévisualisation et de celui du plugin d'exemple, et SHALL autoriser l'import de ses modules depuis une autre origine (en-têtes CORS), car la page est servie par Home Assistant.

#### Scenario: Import depuis la page de Home Assistant
- **WHEN** la page de Home Assistant, servie sur le port 8123, importe le module du panneau depuis le serveur de développement
- **THEN** le navigateur accepte la réponse et charge aussi les modules importés par celui-ci depuis le même serveur

#### Scenario: Port occupé
- **WHEN** le port du serveur de développement est déjà utilisé
- **THEN** le serveur s'arrête avec une erreur au lieu de choisir un autre port, pour que l'URL configurée dans Home Assistant reste juste

### Requirement: Serveur de développement indisponible
Quand le mode est actif mais que le serveur de développement ne répond pas, le panneau SHALL échouer au chargement de son module sans empêcher Home Assistant ni les autres panneaux de fonctionner, et l'intégration SHALL rester chargée.

#### Scenario: Serveur arrêté
- **WHEN** un administrateur ouvre le panneau alors que le serveur de développement est arrêté
- **THEN** le panneau ne s'affiche pas, les autres pages de Home Assistant restent utilisables, et démarrer le serveur puis recharger la page affiche le panneau sans redémarrer Home Assistant
