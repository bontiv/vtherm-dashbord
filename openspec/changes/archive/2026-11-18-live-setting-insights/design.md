# Design

## Context
Voir proposal.md pour la motivation et specs/setting-insights pour les exigences. Points d'appui :
- Les onglets natifs sont dessinés par `frontend/src/native/native-tab.ts`, qui connaît les valeurs du brouillon et les valeurs centrales héritées (`frontend/src/config/draft.ts`, `config-session.ts`).
- Le code de Versatile Thermostat de référence est dans `external/versatile_thermostat` (commit fixé par `external-refs.txt`) : `prop_algo_tpi.py`, `cycle_scheduler.py`, `ema.py`, `open_window_algorithm.py`, `feature_window_manager.py`, `feature_safety_manager.py`. L'entité climate expose la consigne (attribut `temperature`) et la pente (`specific_states.temperature_slope`) ; la part de chauffe enregistrée est l'état du capteur `power_percent` de l'appareil du thermostat, et la pente a aussi son capteur `temperature_slope`. Le dashboard les trouve par l'appareil du thermostat (`device_id` de `vtherm_dashboard/get_thermostats`) et leur `translation_key` dans `hass.entities`.
- Référence amont : `frontend/src/insights.ts` (fonctions pures) et `live.ts` (panneaux `vt-live-tpi`, `vt-live-window`, `vt-live-safety`) de `Liquidmasl/vtherm_dashboard`, et `dev/seed_history.py`.

## Goals / Non-Goals

**Goals:**
- Fonctions de calcul pures, testables sans Home Assistant, qui suivent les règles de VT ligne à ligne avec la référence du fichier source.
- Panneaux légers : rien n'est chargé tant que l'utilisateur ne les ouvre pas.
- Graphiques cohérents avec les schémas de `field-help-diagrams` (palette, accessibilité).

**Non-Goals:**
- Pas de simulation thermique de la pièce : le rejeu applique les règles de VT aux températures **enregistrées** ; il ne prédit pas comment la pièce aurait réagi à d'autres réglages.
- Pas d'estimation pour l'apprentissage Auto TPI, la régulation automatique `over_climate`, la puissance ou le mouvement dans cette version.
- Pas de nouveau point d'API côté Python ; pas d'écriture dans le recorder.

## Decisions

### 1. Module `insights` de fonctions pures, une section par fichier de VT
`frontend/src/insights/` regroupe `tpiDecision`, `tpiHistory`, `slopeHistory`, `windowDetections`, `sensorGaps`, `temperatureHistory`, `comfortStats`. Chaque fonction cite le fichier et la fonction de VT qu'elle porte. Les tests utilisent des cas construits à partir du code de VT ; quand c'est possible, des valeurs calculées en exécutant le code Python de `external/` dans les tests Python (`pytest`) sont figées en fixtures JSON lues par Vitest, pour détecter une divergence lors d'une montée de version de VT.
- Alternative écartée : calcul côté serveur en important le code de VT. Plus fidèle, mais couple l'intégration aux classes internes de VT (instables), ajoute une commande WebSocket et un aller-retour à chaque frappe.

### 2. Historique par `history/history_during_period`, cache de 5 minutes
Appel WebSocket direct du recorder avec `minimal_response`/`no_attributes` sauf pour l'entité climate (attribut `temperature`) ; la part enregistrée est lue sur le capteur `power_percent`. Cache en mémoire par `(entité, période, attributs)`, invalidé après 5 minutes ou en cas d'erreur. Chargement déclenché à l'ouverture du panneau (`ha-expansion-panel` replié par défaut) et au changement de période.
- Alternative écartée : statistiques à long terme (`recorder/statistics_during_period`). Moyennes horaires, trop grossières pour une pente ou un silence de capteur.

### 3. Graphiques SVG maison plutôt que `ha-chart-base`
Un composant `vtherm-time-chart` dessine des séries temporelles en SVG : axes, bandes (périodes détectées, silences), lignes pleines (enregistré) et pointillées (estimation), curseur au survol/toucher/clavier, résumé textuel. Il réutilise la palette et le conteneur accessible de la bibliothèque de schémas.
- Alternative écartée : `ha-chart-base` (ECharts) de Home Assistant. Composant interne chargé à la demande, dont l'API a changé plusieurs fois (Chart.js puis ECharts) ; la spec `ha-native-controls` vise les contrôles de saisie, et un repli serait de toute façon nécessaire. Le choix sera justifié par un commentaire dans le composant, comme l'exige la règle « contrôle Home Assistant en priorité ».

### 4. Emplacement : sous les champs de l'onglet, dans un `ha-expansion-panel`
Les panneaux sont rendus par `native-tab.ts` après les champs des onglets `tpi`, `window` et `advanced`, dans un `ha-expansion-panel` intitulé « Ce que ferait VT avec ces réglages ». Ils reçoivent les valeurs effectives (propres ou centrales), les identifiants des entités du thermostat et `narrow`.
- Alternative écartée : contribution `thermostat_widget` dans la vue d'ensemble. Les panneaux n'ont de sens qu'à côté des champs que l'on modifie.
- Alternative envisagée pour plus tard : exposer ces panneaux comme contributions de plugins, pour qu'un plugin d'algorithme tiers fournisse le sien.

### 5. Onglets « maintenant », « 24 h », « 7 jours »
Le panneau TPI ouvre sur « maintenant » (pas d'historique requis) ; les rejeux se choisissent par onglets. Les panneaux d'ouverture et de sécurité ouvrent sur 24 h. Sur 7 jours, les séries sont rééchantillonnées (environ 300 points) pour rester fluides sur téléphone.

### 6. Script de remplissage de l'historique en Python, dans le devcontainer
Le devcontainer exécute Home Assistant directement (`.devcontainer/start-ha.sh`). Un script Python (Black 180, pylint) arrête l'écriture, insère dans la base SQLite du recorder une semaine simulée (capteur de pièce, extérieur, consigne, `power_percent`, deux aérations, un silence de 70 minutes) et documente que les valeurs « enregistrées » sont produites par la même formule que l'estimation : il sert au développement et aux captures, pas à valider les calculs.

## Risks / Trade-offs
- [Divergence avec VT après une montée de version] → fixtures générées depuis le code Python de `external/` (décision 1) et rappel dans `docs/contributing/` de relire les fonctions portées à chaque changement d'`external-refs.txt`.
- [Charge du recorder sur 7 jours] → une seule requête par entité et par période, cache, chargement à l'ouverture seulement, entités du thermostat affiché uniquement.
- [Utilisateur qui prend l'estimation pour une prédiction] → mention « estimation » sur chaque valeur calculée et texte de limites par panneau (exigence « Estimations étiquetées »).
- [Historique trop court ou recorder qui exclut les entités] → états sans données explicites (exigence « États sans données »).
- [Performance du recalcul à chaque frappe sur 7 jours] → calculs en O(n) sur les séries rééchantillonnées ; recalcul limité à une image d'animation (`requestAnimationFrame`).
