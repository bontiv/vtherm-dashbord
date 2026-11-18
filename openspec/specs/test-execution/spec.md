# test-execution Specification

## Purpose
Décrire comment les tests du dépôt s'exécutent dans le devcontainer et en intégration continue, pour qu'ils restent rapides en local sans perdre les vérifications de contrat avec Versatile Thermostat.

## Requirements

### Requirement: Dépendances JavaScript sur le disque du conteneur
Le devcontainer SHALL placer les dossiers `node_modules` du dépôt sur des volumes du conteneur, hors du montage des sources de l'hôte. Les sources SHALL rester sur le montage de l'hôte, lisibles et modifiables depuis l'hôte.

#### Scenario: Conteneur reconstruit
- **WHEN** le devcontainer est reconstruit puis que `npm test` est lancé
- **THEN** les dépendances sont lues depuis un volume du conteneur et la suite vitest s'exécute en moins de 20 s sur le poste de développement de référence

#### Scenario: Sources visibles depuis l'hôte
- **WHEN** un fichier de `frontend/src` est modifié depuis l'hôte
- **THEN** la modification est vue dans le conteneur sans copie

### Requirement: Mode debug d'asyncio des tests Python
Les tests Python SHALL s'exécuter avec le mode debug d'asyncio en intégration continue, et quand la variable d'environnement `VTHERM_ASYNCIO_DEBUG` vaut `1`. Dans les autres cas, ils SHALL s'exécuter sans ce mode.

#### Scenario: Intégration continue
- **WHEN** pytest s'exécute avec la variable `CI` définie
- **THEN** la boucle d'événements des tests est en mode debug

#### Scenario: Devcontainer
- **WHEN** un développeur lance `pytest` dans le devcontainer sans variable particulière
- **THEN** la boucle d'événements des tests n'est pas en mode debug

#### Scenario: Sur demande
- **WHEN** un développeur lance `VTHERM_ASYNCIO_DEBUG=1 pytest`
- **THEN** la boucle d'événements des tests est en mode debug

### Requirement: Exécution parallèle de pytest
La suite pytest SHALL réussir de la même façon exécutée en série et en parallèle sur plusieurs processus (`-n auto`), et l'intégration continue SHALL l'exécuter en parallèle. Aucun test SHALL dépendre d'un autre ni écrire dans un fichier partagé du dépôt pendant une exécution normale.

#### Scenario: Suite en parallèle
- **WHEN** `pytest -n auto` est lancé
- **THEN** les mêmes tests passent qu'avec `pytest`

### Requirement: Tests de contrat avec Versatile Thermostat
Chaque test qui exécute le code réel de Versatile Thermostat SHALL porter le marqueur pytest `vtherm`. L'intégration continue SHALL exécuter ces tests à chaque fois ; en local, `pytest -m "not vtherm"` SHALL les exclure.

#### Scenario: Exclusion locale
- **WHEN** un développeur lance `pytest -m "not vtherm"`
- **THEN** aucun test ne charge Versatile Thermostat depuis `external/`, et les autres tests s'exécutent

#### Scenario: Marquage
- **WHEN** un test utilise la fixture qui charge le vrai Versatile Thermostat
- **THEN** il porte le marqueur `vtherm` sans que le fichier de test le déclare lui-même

### Requirement: Tests d'orchestration des commandes sans Versatile Thermostat
Les tests de l'enchaînement de la commande `vtherm_dashboard/save_config` (configuration puis pré-réglages, erreur de pré-réglage après une configuration enregistrée, aucun pré-réglage appliqué si la configuration est refusée) SHALL s'exécuter avec un faux `ConfigWriter` et de fausses entités de pré-réglages, sans le marqueur `vtherm`. Les tests de ce que fait Versatile Thermostat (formulaires, entités créées, valeurs effacées) SHALL rester sur le vrai Versatile Thermostat.

#### Scenario: Pré-réglage refusé après un enregistrement
- **WHEN** le faux `ConfigWriter` accepte la configuration et que la fausse entité d'un pré-réglage refuse sa valeur
- **THEN** la commande répond `ok: false`, `config_saved: true`, et l'erreur est sur ce pré-réglage

#### Scenario: Configuration refusée
- **WHEN** le faux `ConfigWriter` refuse la configuration
- **THEN** aucune fausse entité de pré-réglage ne reçoit de valeur

### Requirement: Lectures des tests de la documentation
Un test qui vérifie des fichiers du dépôt dans plusieurs cas SHALL lire chaque fichier au plus une fois par fichier de test.

#### Scenario: Complétude de la documentation
- **WHEN** `scripts/check-doc-completeness.test.ts` s'exécute
- **THEN** chaque page vérifiée est lue une seule fois depuis le disque, quel que soit le nombre de cas
