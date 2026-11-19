# Proposal

## Why
Les widgets de base et de fonctions disent ce que fait le thermostat maintenant. Il reste ce qui explique le comportement dans la durée ou en détail : la courbe des dernières 24 heures, l'apprentissage Auto TPI, l'humidité, les équipements qui exécutent la consigne, la synchronisation de température, la demande à la chaudière centrale et l'énergie consommée. Ce sont les sept derniers widgets de la vue d'un thermostat du plan `.kiro/plan/overview-runtime-elements.md` (W2, W6, W15, W17, W18, W25, W27, priorités 2 et 3).

## What Changes
- Sept widgets sur `thermostat_widget`, en affichage seul :
  - `core.widget.history` (W2) : courbes sur 24 h de la température, de la consigne, de la température extérieure et de la puissance TPI.
  - `core.widget.devices` (W25) : un état par équipement sous-jacent, équipement actif ou attendu actif, mode de ventilation.
  - `core_tpi.widget.auto_tpi` (W6) : état de l'apprentissage Auto TPI, cycles appris, coefficients calculés, confiance du modèle, constante de temps, capacité de chauffe, statut du dernier apprentissage, début.
  - `core_humidity.widget.humidity` (W15) : humidité de la pièce.
  - `core_sync_temp.widget.sync` (W17) : température envoyée à chaque équipement, suivi de la consigne suspendu, écart par équipement.
  - `core_central_boiler.widget.thermostat` (W18) : ce thermostat demande la chaudière centrale.
  - `core_power.widget.energy` (W27) : puissance moyenne du cycle sur 24 h et énergie consommée.
- Placement après les widgets de fonctions ; W2 en dernier.
- Pas de graphique d'humidité dans cette version (l'historique de l'attribut n'est pas confirmé).

## Capabilities

### New Capabilities
<!-- Aucune : les exigences s'ajoutent à la capacité `overview-widgets` créée par `overview-foundation`. -->

### Modified Capabilities
- `overview-widgets`: exigences des sept widgets de détail et de leur place (capacité créée par `overview-foundation`, à appliquer avant).
- `core-native-plugins`: les plugins `core`, `core_tpi`, `core_humidity`, `core_sync_temp`, `core_central_boiler` et `core_power` déclarent des widgets de détail.

## Impact
- Frontend : widgets sous `frontend/src/native/widgets/`, déclarations `thermostat_widget` des six plugins, placements.
- Historique : deux courbes dans W2 (4 entités au plus) et une dans W27, chargées quand la carte est visible, avec le cache de 5 minutes du socle.
- Textes en en/fr/de dans `scripts/native-texts.ts` ; documentation `docs/user/dashboard.md` et `docs/plugins/native-plugins.md` ; `CHANGELOG.md`.
- Aucune commande (démarrer ou arrêter l'apprentissage, calibrer la capacité) : suite possible, change à part.
- Dépend de `overview-foundation` (historique, composants).
