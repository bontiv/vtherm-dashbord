## MODIFIED Requirements

### Requirement: Menu de la configuration
Le plugin `core` SHALL fournir dans le menu de Configuration les pages "Plugins" (`core.page.plugins`) et "Développement" (`core.page.dev_plugins`) du groupe "Dashboard". Les sections `general_config` des plugins natifs SHALL déclarer le groupe partagé « Paramètres généraux » ou « Fonctionnalités », selon que la section peut être éteinte, et la page de création de la configuration centrale SHALL déclarer le groupe « Paramètres généraux ».

#### Scenario: Pages du groupe Dashboard
- **WHEN** l'utilisateur ouvre le menu de Configuration
- **THEN** les pages "Plugins" et "Développement" apparaissent sous le groupe "Dashboard", après les sections des groupes « Paramètres généraux » et « Fonctionnalités »

#### Scenario: Configuration centrale à créer
- **WHEN** la configuration centrale n'existe pas encore
- **THEN** la page « Créer la configuration centrale » apparaît seule sous le groupe « Paramètres généraux »

### Requirement: Ordre des onglets du config flow
Les menus d'un thermostat et de la Configuration SHALL ranger les onglets natifs, dans cet ordre, sous « Paramètres généraux » : principal, sous-jacents, fonctions, presets, TPI, régulation par vanne, avancé ; puis sous « Fonctionnalités » : chaudière centrale, ouverture, mouvement, puissance, présence, démarrage et arrêt automatiques, synchronisation de température, verrouillage, humidité, panne de chauffage. L'ordre SHALL venir de positions déclaratives.

#### Scenario: Ordre par défaut
- **WHEN** un thermostat dont toutes les fonctionnalités sont activées est ouvert sans plugin tiers
- **THEN** la vue d'ensemble est en tête sans groupe, puis les onglets suivent l'ordre indiqué sous les intitulés « Paramètres généraux » et « Fonctionnalités », avec la même mise en forme que les groupes du menu de la Configuration

#### Scenario: Configuration centrale
- **WHEN** l'administrateur ouvre le menu de la Configuration d'une configuration centrale existante
- **THEN** il voit sous « Paramètres généraux » : principal, fonctions, presets, TPI, avancé ; puis sous « Fonctionnalités » les sections de fonctionnalités de la configuration centrale, dont le verrouillage

#### Scenario: Insertion tierce
- **WHEN** un plugin tiers déclare `after: core_tpi.tab.main`
- **THEN** son onglet suit immédiatement l'onglet TPI

#### Scenario: Insertion tierce dans un groupe
- **WHEN** un plugin tiers déclare `after: core_tpi.tab.main` et le groupe partagé « Paramètres généraux »
- **THEN** son onglet suit l'onglet TPI sans couper le groupe en deux intitulés
