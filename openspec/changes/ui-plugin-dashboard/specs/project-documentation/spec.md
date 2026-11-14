# Spec Delta

## Purpose

Garantir que le dashboard, ses API et la manière de développer un plugin UI soient documentés dans le dossier `docs/`, et que cette documentation reste synchronisée avec le code.

## ADDED Requirements

### Requirement: Dossier de documentation indexé
Le dépôt SHALL contenir un dossier `docs/` avec une page d'accueil `docs/README.md` qui liste toutes les pages de documentation et indique, pour chacune, son public (utilisateur, auteur de plugin, contributeur). Aucune page de `docs/` ne SHALL être absente de cet index.

#### Scenario: Page non référencée
- **WHEN** une page est ajoutée dans `docs/` sans être listée dans `docs/README.md`
- **THEN** la vérification de la documentation échoue en nommant la page

### Requirement: Documentation de toutes les API publiques
La documentation SHALL décrire chaque API publique : l'API Python d'enregistrement des plugins UI (`register_ui_plugin`, `unregister_ui_plugin`, `get_ui_plugins` et leurs paramètres), la commande WebSocket `vtherm_dashboard/get_ui_plugins`, le SDK `@vtherm/dashboard-sdk` (types, `registerUiPlugin`, version du dashboard, harnais `testing`), la grammaire des contraintes `dashboard_version`, les hooks et les formes de position.

#### Scenario: Paramètre documenté
- **WHEN** un paramètre de `register_ui_plugin` est lu dans la documentation
- **THEN** la page indique son type, son caractère obligatoire ou optionnel, sa valeur par défaut et un exemple

#### Scenario: Erreurs documentées
- **WHEN** une API refuse un appel (identifiant dupliqué, contrainte invalide, hook inconnu, position invalide)
- **THEN** la documentation décrit cette erreur et sa cause

### Requirement: Référence d'API générée depuis le code
La référence du SDK SHALL être générée depuis les types et les commentaires de documentation du code source, et la référence Python depuis les docstrings. La vérification SHALL échouer si la référence générée et enregistrée dans `docs/` diffère de celle que produirait le code courant.

#### Scenario: Type modifié sans régénération
- **WHEN** un type exporté du SDK est modifié et que la référence n'est pas régénérée
- **THEN** la vérification de la documentation échoue en indiquant de régénérer la référence

#### Scenario: API publique sans description
- **WHEN** un élément exporté du SDK n'a pas de commentaire de documentation
- **THEN** la vérification de la documentation échoue en nommant l'élément

### Requirement: Procédure pour développer un plugin UI
La documentation SHALL contenir une procédure complète pour développer un plugin UI, de la création du projet à la publication : prérequis, installation du SDK, déclaration Python avec `dashboard_version`, écriture des contributions et de leurs positions, développement avec le mode développement et un serveur en mode `--watch` (y compris la configuration CORS), tests avec le harnais, installation dans Home Assistant et publication.

#### Scenario: Premier plugin
- **WHEN** un développeur suit la procédure à partir d'un projet vide
- **THEN** il obtient un plugin dont l'onglet apparaît dans le dashboard sans étape non documentée

#### Scenario: Boucle de développement
- **WHEN** un développeur cherche comment voir ses modifications en direct
- **THEN** la procédure décrit le démarrage du serveur local, l'ajout de l'URL dans le dashboard et le rafraîchissement de la page

#### Scenario: Montée de version du dashboard
- **WHEN** un développeur doit rendre son plugin compatible avec une nouvelle version majeure du dashboard
- **THEN** la documentation décrit comment élargir `dashboard_version` et où trouver les changements incompatibles

### Requirement: Documentation de la configuration native et de son évolution
La documentation du contributeur SHALL décrire le mécanisme par lequel le dashboard valide et enregistre la configuration de Versatile Thermostat, ses limites, et l'évolution prévue vers une validation et une normalisation partagées dans `vtherm_api`.

#### Scenario: Mécanisme décrit
- **WHEN** un contributeur ouvre la page consacrée au pilotage de la configuration
- **THEN** elle décrit le mécanisme actuel, la correspondance entre onglets et étapes, et la gestion des versions de Versatile Thermostat

#### Scenario: Évolution prévue
- **WHEN** un contributeur cherche la direction technique à long terme
- **THEN** la page contient une section "Évolution prévue" qui indique la cible, le chemin de transition et ce qui dépend du dépôt amont

### Requirement: Documentation par public
La documentation SHALL couvrir trois publics : l'utilisateur du dashboard (installation, utilisation, thèmes, vue d'état des plugins), l'auteur de plugin (API, procédure, thème, tests) et le contributeur au dépôt (architecture, environnement de développement, tests, publication).

#### Scenario: Contributeur
- **WHEN** un nouveau contributeur ouvre la documentation du contributeur
- **THEN** il y trouve la démarche pour démarrer l'environnement de développement, lancer les tests et publier

### Requirement: Exemples de code vérifiés
Les exemples de code de la documentation SHALL être compilés ou exécutés par les tests du projet. Un exemple qui ne compile pas ou qui échoue SHALL faire échouer la vérification.

#### Scenario: Exemple obsolète
- **WHEN** un type du SDK change et qu'un exemple de la documentation ne compile plus
- **THEN** la vérification de la documentation échoue en désignant l'exemple

### Requirement: Liens et références valides
La vérification de la documentation SHALL échouer si un lien relatif ou une ancre d'une page de `docs/` ne mène à aucune cible.

#### Scenario: Lien cassé
- **WHEN** une page contient un lien vers un fichier qui n'existe pas
- **THEN** la vérification échoue en indiquant la page et le lien

### Requirement: Mise à jour de la documentation avec le code
Tout changement qui modifie un comportement public documenté (API, contrat de plugin, procédure, comportement du dashboard) SHALL mettre à jour la documentation concernée dans le même changement. Les vérifications automatiques SHALL s'exécuter dans l'intégration continue, et le modèle de demande de fusion SHALL contenir une case pour confirmer la mise à jour de la documentation.

#### Scenario: Demande de fusion
- **WHEN** une demande de fusion est ouverte
- **THEN** son modèle demande de confirmer que la documentation a été mise à jour ou qu'aucun comportement public ne change

#### Scenario: Vérifications dans l'intégration continue
- **WHEN** l'intégration continue s'exécute sur une demande de fusion
- **THEN** elle exécute la vérification de la documentation (référence à jour, exemples, liens, index) et échoue si l'une d'elles échoue

### Requirement: Journal des changements pour les auteurs de plugins
Le projet SHALL tenir un journal des changements dont chaque version indique les évolutions du contrat de plugin (API, hooks, positions) et, pour toute rupture, la procédure de migration.

#### Scenario: Version avec rupture
- **WHEN** une version majeure modifie le contrat de plugin
- **THEN** son entrée du journal liste les ruptures et la migration à effectuer par les auteurs de plugins

### Requirement: Langue de la documentation
La documentation SHALL être rédigée exclusivement en anglais (pages de `docs/`, README, journal des changements, commentaires de documentation de l'API). Les identifiants de code, noms d'API, chemins et commandes SHALL rester non traduits.

#### Scenario: Page de référence
- **WHEN** une page de référence d'API est publiée
- **THEN** sa prose est en anglais et les noms d'API sont ceux du code

#### Scenario: Page en une autre langue
- **WHEN** une page de `docs/` est rédigée dans une autre langue que l'anglais
- **THEN** la revue la refuse, conformément à la case du modèle de demande de fusion

### Requirement: Documentation de l'internationalisation
La documentation SHALL décrire comment un plugin fournit ses traductions : catalogue anglais obligatoire, déclaration typée des clés, résolution de la langue et repli, titres par clés, paramètres et pluriels, chargement différé, et vérification des traductions manquantes. La procédure de développement d'un plugin SHALL inclure l'ajout de traductions.

#### Scenario: Ajout d'une langue
- **WHEN** un auteur de plugin veut ajouter l'allemand à son plugin
- **THEN** la documentation décrit le fichier à créer, le typage du catalogue et la vérification à exécuter

#### Scenario: Procédure de plugin
- **WHEN** un auteur suit la procédure complète de développement
- **THEN** elle contient une étape qui crée le catalogue anglais du plugin
