# Proposal

## Why
Quand un thermostat chauffe moins que prévu, la cause est presque toujours une fonction qui agit : une fenêtre ouverte, un mouvement détecté, un délestage, un arrêt automatique, un verrou, une panne de chauffage. Les widgets de base (`overview-thermostat-core`) montrent déjà la raison du mode et les messages actifs, mais pas l'état propre de chaque fonction. Ce change ajoute les six widgets de priorité 2 et 3 qui détaillent ces fonctions (W9, W10, W11, W12, W14, W16 du plan `.kiro/plan/overview-runtime-elements.md`), chacun masqué quand sa fonction est éteinte.

## What Changes
- Six widgets sur `thermostat_widget`, en affichage seul :
  - `core_window.widget.window` (W9) : fenêtre ouverte (capteur), détection automatique, contournement actif, effet en cours (arrêt, éco, hors-gel, aucun).
  - `core_motion.widget.motion` (W10) : mouvement détecté et preset d'activité en vigueur.
  - `core_power.widget.overpowering` (W11) : délestage actif.
  - `core_auto_start_stop.widget.auto_start_stop` (W12) : arrêt automatique détecté, fonction activée, erreur accumulée sur une jauge, dernier basculement.
  - `core_lock.widget.lock` (W14) : thermostat verrouillé ou libre.
  - `core_heating_failure.widget.failure` (W16) : panne de chauffage, panne de refroidissement, suivi en cours avec progression, cause probable, détection suspendue par le modèle.
- Placements après les widgets de base de `overview-thermostat-core`.
- Les éléments que VT ne publie pas (délai restant de la fenêtre, prochaine action de l'arrêt automatique, échéance du reverrouillage) ne sont pas affichés.

## Capabilities

### New Capabilities
<!-- Aucune : les exigences s'ajoutent à la capacité `overview-widgets` créée par `overview-foundation`. -->

### Modified Capabilities
- `overview-widgets`: exigences des six widgets de fonctions et de leur place dans la vue d'un thermostat (capacité créée par `overview-foundation`, à appliquer avant).
- `core-native-plugins`: les plugins `core_window`, `core_motion`, `core_power`, `core_auto_start_stop`, `core_lock` et `core_heating_failure` déclarent des widgets.

## Impact
- Frontend : widgets sous `frontend/src/native/widgets/`, déclarations `thermostat_widget` des six plugins, placements.
- Textes en en/fr/de dans `scripts/native-texts.ts` ; documentation `docs/user/dashboard.md` et `docs/plugins/native-plugins.md` ; `CHANGELOG.md`.
- Lecture seule de `hass.states`, aucun historique, aucune commande (contournement de fenêtre, verrouillage et activation de l'arrêt automatique restent à part).
- Dépend de `overview-foundation`; les placements visent des widgets de `overview-thermostat-core` mais retombent en dernier si ce change n'est pas appliqué.
