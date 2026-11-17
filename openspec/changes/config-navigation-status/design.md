# Design

## Context
Voir proposal.md. État actuel :
- Le menu est construit par `frontend/src/navigation.ts` (`NavItem` : titre, icône, chemin, contribution) et dessiné par `frontend/src/components/side-menu.ts` avec `ha-md-list-item`.
- Les onglets natifs sont déclarés par `frontend/src/native/native-plugin.ts` ; leur condition `visible` appelle `definition.applies(values, kind)` de `tab-definitions.ts`, qui masque l'onglet d'une fonctionnalité désactivée.
- Le brouillon (`frontend/src/config/draft.ts`) connaît les valeurs, les erreurs du serveur (`SaveError.tab`, `field`, `code`) et les champs obligatoires via `schemas.ts` (`FieldSpec.required`).
- `vtherm_dashboard/get_thermostats` renvoie `id`, `name`, `type`, `read_only` par thermostat, sans entité climate.
- Référence amont : `renderIndex()` et `missingByCard()` de `editor.ts`, `switcher.ts` (tuiles d'état).

## Goals / Non-Goals

**Goals:**
- Un modèle de statut unique, calculé de façon pure et testable dans `navigation.ts`, affiché par le menu.
- Les mêmes repères pour les sections des plugins tiers, sans leur donner accès aux erreurs ou au brouillon des autres.

**Non-Goals:**
- Pas de page unique qui empile toutes les sections (choix amont) : le dashboard garde une page par section, que l'architecture de plugins, les itinéraires et le tiroir mobile supposent. Les statuts compensent la perte de vue d'ensemble.
- Pas de suppression de l'onglet « fonctionnalités » : il reste la vue d'ensemble des activations.

## Decisions

### 1. Statut = composition de trois sources
`statusOf(entry)` combine, dans l'ordre de priorité de la spec :
1. **refusée** : erreurs du brouillon dont `tab` correspond à l'onglet (dashboard) ;
2. **éteinte** : `feature` déclarée par la contribution et valeur fausse dans les valeurs du brouillon (dashboard) ;
3. **incomplète / héritée / complète** : fonction `status(context)` de la contribution. Pour les onglets natifs, `native-plugin.ts` la fournit : champs `required` de l'onglet applicables (selon type, héritage et fonctionnalités) sans valeur → incomplète ; option d'héritage active → héritée ; sinon complète.
- Alternative écartée : statut calculé par le dashboard pour tous les plugins à partir de leurs champs. Le SDK ne connaît pas les champs d'un plugin tiers (il les dessine lui-même) ; seule une fonction déclarée par le plugin peut le dire.

### 2. Visibilité : `applies` séparé de `enabled`
`tab-definitions.ts` sépare « l'onglet s'applique à ce type et à cette configuration » (`applies`, qui garde la visibilité) de « sa fonctionnalité est active » (nouvelle clé `feature` : `use_window_feature`, `use_motion_feature`, `use_power_feature`, `use_presence_feature`, `use_auto_start_stop_feature`, `use_central_boiler_feature`, `use_heating_failure_detection_feature`). Un onglet dont la fonctionnalité est éteinte reste visible ; le serveur continue de refuser l'enregistrement des champs d'une fonctionnalité éteinte (spec `core-config-management`, « Fonctionnalités désactivées »).

### 3. Interrupteur d'activation fourni par le dashboard
L'hôte de contribution (`contribution-host.ts`) dessine, au-dessus du composant d'une section qui déclare `feature`, une en-tête avec `ha-switch` et l'explication `feature_intro.<clé>` du plugin ; quand la fonctionnalité est éteinte, le composant de la section n'est pas monté. L'interrupteur écrit la valeur dans le brouillon par le même mécanisme que `proposeChanges`.
- Alternative écartée : chaque onglet dessine son interrupteur. Les plugins tiers devraient le refaire, avec des écarts d'apparence.

### 4. Affichage dans le menu
`ha-md-list-item` reçoit le statut dans son emplacement `end` : `ha-icon` `mdi:check` (couleur `--success-color`), ou un texte court (`Off`, `Central`, `N manquants`, `Erreur`) en `--secondary-text-color`, `--warning-color` ou `--error-color`. L'entrée éteinte a son titre en `--secondary-text-color`. Le nom accessible de l'entrée inclut le statut. Le repli HTML suit la même structure.

### 5. Aller à la première erreur
La barre d'enregistrement (`panel.ts`) calcule la première entrée du menu au statut refusée et affiche un `ha-button` « Aller à <titre> » qui navigue vers son chemin ; `native-tab.ts` met déjà le champ refusé en évidence et ouvre son groupe.

### 6. Tuiles des thermostats
Le serveur ajoute `climate_entity_id` à chaque thermostat (registre des entités, plateforme `climate` de l'entrée VT). La liste dessine une grille de `ha-card` cliquables (`grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))`), qui lisent `hass.states[climate_entity_id]` : `current_temperature`, `temperature`, `hvac_action`, `preset_mode`, avec les formats régionaux et les couleurs d'action du thème (`--state-climate-heat-color`, `--state-climate-cool-color`, `--state-climate-idle-color`). Icônes par type : `mdi:toggle-switch-variant` (interrupteur), `mdi:thermostat` (climate), `mdi:valve` (vanne).
- Alternative envisagée : tuiles dans le menu de gauche à la place du sélecteur déroulant. Écartée pour l'instant : le menu étroit (220 px) et le tiroir mobile s'y prêtent mal.

## Risks / Trade-offs
- [Statut « complète » trompeur : VT peut refuser une valeur présente] → « complète » signifie « rien d'obligatoire ne manque » ; le statut refusée prend le dessus après un enregistrement.
- [Menu plus long avec les fonctionnalités éteintes] → entrées en retrait ; leur nombre est borné (sept au plus).
- [Fonction de statut tierce coûteuse ou instable] → fonction pure, appelée au rendu du menu, protégée par un `try/catch` qui la neutralise et le signale en mode développement.
- [Rupture pour un plugin tiers qui comptait sur la disparition de l'onglet] → seuls les onglets natifs changent ; une contribution tierce sans `feature` garde son comportement.
