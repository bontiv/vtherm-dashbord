# Proposal

## Why
La page Overview de l'onglet Dashboard est vide. Quand un foyer a plusieurs thermostats, la question n'est pas « que fait le salon » mais « que fait la maison » : combien chauffent, lesquels sont en alerte, quel est le mode central, la chaudière centrale est-elle appelée, quelle puissance le logement tire-t-il. Le plan `.kiro/plan/overview-runtime-elements.md` propose sept widgets globaux (W19 à W24 et W26). Ce change les livre en s'appuyant sur le socle `overview-foundation`.

## What Changes
- Sept widgets sur `global_widget`, en affichage seul :
  - `core.widget.central_mode` (W19) : mode central actuel.
  - `core.widget.summary` (W20) : répartition des thermostats par état (chauffe, repos, éteint, indisponible) et liste de ceux qui sont en alerte.
  - `core.widget.outdoor` (W21) : température extérieure commune et sa courbe sur 24 h.
  - `core_central_boiler.widget.boiler` (W22) : chaudière appelée ou non, nombre de thermostats demandeurs et seuil, liste des demandeurs, activation différée, chaudière non prête.
  - `core_central_boiler.widget.boiler_power` (W26) : puissance demandée à la chaudière, seuil et courbe sur 24 h.
  - `core_power.widget.house_power` (W23) : puissance du logement, maximum, marge, énergie totale.
  - `core_presence.widget.presence` (W24) : présence globale.
- Mise en page de la page Overview par placements déclaratifs.
- Chaque widget se masque seul quand la configuration centrale n'existe pas, que sa fonctionnalité est éteinte ou que sa source manque.

## Capabilities

### New Capabilities
<!-- Aucune : les exigences s'ajoutent à la capacité `overview-widgets` créée par `overview-foundation`. -->

### Modified Capabilities
- `overview-widgets`: exigences des sept widgets globaux et de la mise en page de la page Overview (capacité créée par `overview-foundation`, à appliquer avant).
- `core-native-plugins`: les plugins `core`, `core_central_boiler`, `core_power` et `core_presence` déclarent des widgets globaux.
- `dashboard-panel`: nouvelle exigence pour la page Overview quand aucun widget n'est visible (message au lieu d'une page blanche).

## Impact
- Frontend : widgets sous `frontend/src/native/widgets/`, déclarations `global_widget` des quatre plugins, `frontend/src/native/core-pages.ts` (page Overview).
- Textes en en/fr/de dans `scripts/native-texts.ts` ; documentation `docs/user/dashboard.md` et `docs/plugins/native-plugins.md` ; `CHANGELOG.md`.
- Lecture seule de `hass.states` pour N thermostats et les entités centrales ; l'historique ne sert qu'à deux courbes (W21, W26).
- Dépend de `overview-foundation` (`getEntryEntities`, contexte `central`, taille `size`, client d'historique, composants). Indépendant des changes thermostat.
