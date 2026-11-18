## MODIFIED Requirements

### Requirement: Ordre des onglets du config flow
Les menus d'un thermostat et de la Configuration SHALL ranger les onglets natifs, dans cet ordre, sous « Paramètres généraux » : principal, sous-jacents, presets, TPI, régulation par vanne, avancé ; puis sous « Fonctionnalités » : chaudière centrale, ouverture, mouvement, puissance, présence, démarrage et arrêt automatiques, synchronisation de température, verrouillage, humidité, panne de chauffage. L'ordre SHALL venir de positions déclaratives.

#### Scenario: Ordre par défaut
- **WHEN** un thermostat dont toutes les fonctionnalités sont activées est ouvert sans plugin tiers
- **THEN** la vue d'ensemble est en tête sans groupe, puis les onglets suivent l'ordre indiqué sous les intitulés « Paramètres généraux » et « Fonctionnalités », avec la même mise en forme que les groupes du menu de la Configuration

#### Scenario: Configuration centrale
- **WHEN** l'administrateur ouvre le menu de la Configuration d'une configuration centrale existante
- **THEN** il voit sous « Paramètres généraux » : principal, presets, TPI, avancé ; puis sous « Fonctionnalités » les sections de fonctionnalités de la configuration centrale, dont le verrouillage

#### Scenario: Insertion tierce
- **WHEN** un plugin tiers déclare `after: core_tpi.tab.main`
- **THEN** son onglet suit immédiatement l'onglet TPI

#### Scenario: Insertion tierce dans un groupe
- **WHEN** un plugin tiers déclare `after: core_tpi.tab.main` et le groupe partagé « Paramètres généraux »
- **THEN** son onglet suit l'onglet TPI sans couper le groupe en deux intitulés

## REMOVED Requirements

### Requirement: Plugin `core` : principal, type et fonctionnalités
**Reason**: Le plugin `core` ne fournit plus l'onglet « fonctionnalités » ; l'exigence est remplacée par « Plugin `core` : principal et type », aux mêmes scénarios.
**Migration**: Aucune pour l'utilisateur. Un plugin tiers qui visait `core.tab.features` ou `core.general.features` dans une position se place par rapport à un autre onglet, par exemple `after: core.tab.type`.

### Requirement: Onglet fonctionnalités
**Reason**: L'onglet « fonctionnalités » ne faisait que cocher des valeurs que l'interrupteur de chaque onglet de fonctionnalité modifie déjà ; il est retiré. Voir « Activation des fonctionnalités par leur onglet ».
**Migration**: Activer ou désactiver une fonctionnalité depuis son onglet, dans le groupe « Fonctionnalités » du menu. Les valeurs enregistrées ne changent pas.

## ADDED Requirements

### Requirement: Plugin `core` : principal et type
Le plugin `core` SHALL fournir les onglets "principal" et "type". L'onglet "principal" SHALL contenir les paramètres de base du thermostat, ou ceux de la configuration centrale pour la configuration générale. Il SHALL ne fournir aucun onglet « fonctionnalités » : ni `core.tab.features`, ni `core.general.features`.

#### Scenario: Onglet principal d'un thermostat
- **WHEN** l'onglet principal d'un thermostat est affiché
- **THEN** il propose le nom, le capteur de température, le capteur de dernière vue (facultatif), la durée de cycle en minutes (défaut 5), la puissance de l'équipement (défaut 1) et son unité, et les options "utiliser la configuration centrale" (défaut oui), "utiliser le mode central" (défaut oui) et "utilisé par la chaudière centrale" (défaut non)

#### Scenario: Paramètres propres du principal
- **WHEN** l'héritage de la section principale est désactivé
- **THEN** l'onglet propose le capteur de température extérieure (obligatoire), la température minimale, la température maximale et le pas

#### Scenario: Principal de la configuration générale
- **WHEN** l'onglet principal de la configuration générale est affiché
- **THEN** il propose le capteur de température extérieure (obligatoire), la température minimale (défaut 7), la maximale (défaut 35) et le pas (défaut 0,1)

#### Scenario: Ancienne adresse de l'onglet des fonctionnalités
- **WHEN** l'utilisateur ouvre une adresse enregistrée de `core.tab.features`
- **THEN** la page par défaut du thermostat s'ouvre avec l'avis d'adresse inconnue

### Requirement: Activation des fonctionnalités par leur onglet
Chaque fonctionnalité que Versatile Thermostat propose pour le type de la configuration (ouverture, mouvement, puissance et présence pour tous ; panne de chauffage sans climate simple ; démarrage et arrêt automatiques pour `over_climate` sans régulation par vanne ; chaudière centrale pour la configuration générale) SHALL s'activer et se désactiver par l'interrupteur de son onglet. La valeur SHALL être enregistrée dans l'étape « features » du config flow.

#### Scenario: Activation d'une fonctionnalité
- **WHEN** l'administrateur active la fonctionnalité mouvement par l'interrupteur de l'onglet mouvement, puis enregistre
- **THEN** l'onglet mouvement passe du statut éteinte à son statut calculé, affiche ses champs, et Versatile Thermostat reçoit `use_motion_feature` dans l'étape « features »

#### Scenario: Désactivation d'une fonctionnalité
- **WHEN** l'administrateur décoche l'interrupteur affiché au-dessus de l'onglet mouvement actif
- **THEN** l'onglet repasse au statut éteinte, ses champs disparaissent, et les actions « Enregistrer » et « Annuler » sont au pied de la carte de l'interrupteur pour enregistrer la modification sur place

#### Scenario: Fonctionnalité non applicable
- **WHEN** un thermostat `over_switch` est ouvert
- **THEN** aucun onglet ne propose le démarrage et l'arrêt automatiques
