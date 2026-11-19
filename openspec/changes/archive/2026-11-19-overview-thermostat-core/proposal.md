# Proposal

## Why
La vue d'ensemble d'un thermostat est vide. Les sept widgets de priorité 1 du plan `.kiro/plan/overview-runtime-elements.md` répondent aux questions de base de l'utilisateur : quelle température et quelle consigne, que fait le thermostat et pourquoi, y a-t-il un problème, quelle puissance de chauffe, quelle ouverture de vanne, quel preset, la sécurité est-elle déclenchée. Ce change les livre avec la mise en page de la vue, en s'appuyant sur le socle `overview-foundation`.

## What Changes
- Sept widgets sur `thermostat_widget`, en affichage seul :
  - `core.widget.temperature` (W1) : température courante et consigne sur une jauge, température extérieure, consigne demandée et appliquée, consigne régulée.
  - `core.widget.mode` (W3) : mode HVAC, action HVAC, raison du mode ou de l'arrêt, veille, mode central appliqué.
  - `core.widget.alerts` (W4) : messages actifs, thermostat non prêt, équipements indisponibles, âge des mesures intérieure et extérieure, inhibition.
  - `core_tpi.widget.heating` (W5) : puissance demandée, durées ON et OFF du cycle.
  - `core_valve_regulation.widget.valve` (W7) : ouverture de la vanne, une barre par vanne.
  - `core_presets.widget.preset` (W8) : preset courant, preset temporisé et temps restant, dérogation manuelle.
  - `core_advanced.widget.safety` (W13) : mode sécurité et part de chauffe imposée.
- Mise en page de la vue d'ensemble dans `frontend/src/native/core-pages.ts` : ordre par placements déclaratifs, `centralValues` transmis aux conditions de visibilité.
- Chaque widget se masque seul quand sa fonctionnalité est éteinte ou que sa source n'existe pas.

## Capabilities

### New Capabilities
<!-- Aucune : les exigences s'ajoutent à la capacité `overview-widgets` créée par `overview-foundation`. -->

### Modified Capabilities
- `overview-widgets`: exigences des sept widgets de base et de la mise en page de la vue d'un thermostat (capacité créée par `overview-foundation`, à appliquer avant).
- `core-native-plugins`: les plugins `core`, `core_tpi`, `core_valve_regulation`, `core_presets` et `core_advanced` déclarent des widgets.

## Impact
- Frontend : un module de widgets par plugin sous `frontend/src/native/widgets/`, déclarations `thermostat_widget` dans `frontend/src/native/native-plugin.ts` (ou le fichier de chaque plugin), `frontend/src/native/core-pages.ts`.
- Textes : titres et libellés en en/fr/de dans `scripts/native-texts.ts`, catalogues régénérés.
- Documentation : `docs/user/dashboard.md` (vue d'ensemble d'un thermostat), `docs/plugins/native-plugins.md`, `CHANGELOG.md`.
- Pas d'appel réseau nouveau : tout vient de `hass.states`. Aucune commande.
- Dépend de `overview-foundation`.
