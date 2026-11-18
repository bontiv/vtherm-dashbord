# Proposal

## Why
Le menu d'un thermostat aligne dix-sept onglets à plat, dans l'ordre du config flow de Versatile Thermostat, alors que le menu de la Configuration est déjà découpé en groupes titrés. On n'y distingue pas les réglages que tout thermostat a (attributs, sous-jacents, pré-réglages…) des fonctionnalités qu'on active ou non (ouverture, présence…), et la coche verte affichée sur un onglet toujours actif comme « Fonctions » n'apprend rien. Certains onglets qui ne font rien (humidité sans capteur, verrouillage qui ne bloque personne) apparaissent aussi « complets » au lieu d'« Off ».

## What Changes
- Le menu d'un thermostat et le menu de la Configuration rangent leurs onglets en deux groupes titrés, avec la même mise en forme que les groupes actuels de la Configuration :
  - **Paramètres généraux** : les onglets qui ne peuvent pas être éteints, dans cet ordre : Principaux attributs, Sous-jacents, Fonctions, Pré-réglages, Paramètres TPI, Régulation par vanne, Paramètres avancés (ceux qui existent pour la configuration affichée).
  - **Fonctionnalités** : les onglets qui peuvent être éteints, dans l'ordre du config flow : Chauffage central, Détection d'ouverture, Détection de mouvement, Gestion de la puissance, Détection de présence, Allumage/extinction automatique, Synchronisation de la température, Gestion du verrouillage, Humidité, Détection de panne de chauffage.
  - La vue d'ensemble d'un thermostat reste en tête, sans groupe ; le groupe « Dashboard » de la Configuration reste après ces deux groupes. Le groupe « Versatile Thermostat » disparaît.
- Les onglets des Paramètres généraux n'affichent plus de coche verte quand ils sont complets ; ils gardent « N manquants », « Erreur » et « Central ».
- **Humidité** a le statut Off quand « Utiliser un capteur d'humidité » est décoché.
- **Gestion du verrouillage** a le statut Off quand « Le verrouillage empêchera les commandes des utilisateurs » et « … des automatisations » sont tous deux décochés.
- Un onglet qui reprend la configuration centrale affiche **« Central (off) »** quand les valeurs centrales qu'il reprend éteignent la section (par exemple un verrouillage central qui ne bloque rien).
- **Synchronisation de la température** reste dans le menu d'un thermostat `over_climate` quand elle n'est pas activée, avec le statut Off, et sa page propose de l'activer sur place, comme les autres fonctionnalités.
- SDK : une section peut renvoyer le statut éteinte et le statut « héritée, éteinte » ; le SDK expose les deux groupes du cœur pour qu'un plugin tiers puisse y ranger son onglet.

## Capabilities

### New Capabilities
<!-- Aucune. -->

### Modified Capabilities
- `config-section-status`: statuts sans coche pour les sections qui ne peuvent pas être éteintes, statut éteinte de l'humidité et du verrouillage, statut « Central (off) », synchronisation de la température découvrable quand elle est éteinte.
- `core-native-plugins`: groupes « Paramètres généraux » et « Fonctionnalités » des onglets natifs dans les deux menus, et nouvel ordre des onglets.
- `dashboard-panel`: le menu de la Configuration présente les groupes « Paramètres généraux », « Fonctionnalités » puis « Dashboard ».
- `ui-contribution-placement`: une entrée peut déclarer un groupe partagé du cœur, dont l'intitulé est traduit par le dashboard.
- `ui-plugin-sdk`: la fonction de statut peut renvoyer « éteinte » et « héritée, éteinte » ; constantes des groupes du cœur.

## Impact
- Frontend : `frontend/src/native/native-plugin.ts` (groupes, ordre des positions, statuts), `frontend/src/native/tab-definitions.ts` (ordre du menu, fonctionnalité de la synchronisation, règles d'extinction), `frontend/src/navigation.ts` (coche masquée, intitulés des groupes du cœur), `frontend/src/components/side-menu.ts` (affichage de « Central (off) »), `frontend/src/native/plugins/core.ts` (groupe de la page de création de la configuration centrale), `frontend/src/shell-translations.ts`.
- SDK `@vtherm/dashboard-sdk` : types `SectionStatus`, `isSectionStatus`, nouvelle constante `CORE_MENU_GROUPS` ; version mineure.
- Textes : intitulés des groupes en en/fr/de ; `scripts/native-texts.ts` perd `group.vtherm`, catalogues régénérés.
- Aucun changement côté Python ni du config flow : seuls le menu et ses statuts changent ; l'enregistrement reste par onglet.
- Documentation : `docs/user/configuration.md`, `docs/plugins/hooks-and-placement.md`, `docs/plugins/native-plugins.md`, référence du SDK, `CHANGELOG.md`.
