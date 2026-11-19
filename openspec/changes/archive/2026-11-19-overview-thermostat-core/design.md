# Design

## Context
- Source : code de Versatile Thermostat (VT) sous `external/versatile_thermostat/custom_components/versatile_thermostat/` à la date du plan. BT = `base_thermostat.py` `update_custom_attributes()` (attributs de l'entité `climate`). Les noms ci-dessous sont lus, pas exécutés.
- Les widgets lisent l'entité `climate` (`getEntryEntities(hass, thermostatId).climate`) et les capteurs de l'appareil par clé de traduction (socle, sans appel réseau).
- `core-pages.ts` instancie `vtherm-widgets-page` avec `values` mais sans `centralValues` : les conditions de visibilité ne voient pas la configuration centrale.

## Goals / Non-Goals
**Goals:**
- Les sept widgets de priorité 1, lisibles à 280 px, avec les unités et les états du socle.
- Une mise en page qui regroupe les cartes liées sans notion de ligne.

**Non-Goals:**
- Les commandes (mode, consigne, preset) : voir « Décisions prises par défaut ».
- Les widgets de priorité 2 et 3 (changes `overview-thermostat-protections` et `overview-thermostat-details`).
- Un graphique : W2 vient dans `overview-thermostat-details`, avec la ligne 24 h de la puissance TPI.

## Décisions

### D1. Sources des éléments (VT)
| Widget | Élément | Source dans VT | Forme |
| --- | --- | --- | --- |
| W1 | CO-01 température, CO-02 consigne | attributs standard `current_temperature` et `temperature` de `climate` ; bornes de la jauge : attributs `min_temp` et `max_temp` de `climate` | jauge avec repère |
| W1 | CO-04 extérieure | attribut BT `specific_states.ext_current_temperature` | ligne de valeur |
| W1 | CO-03 demandée → appliquée | attributs racine `requested_state.target_temperature` et `current_state.target_temperature` (`state_manager.py:331`) | texte, seulement si les deux diffèrent |
| W1 | CO-17 consigne régulée | capteur `regulated_temperature` | ligne de valeur, seulement s'il existe |
| W3 | CO-05, CO-06 | état de `climate` (`hvac_mode`), `hvac_action` | icônes |
| W3 | CO-07 raison | `specific_states.hvac_off_reason`, `specific_states.hvac_mode_reason` (`const.py:276-298`) | libellé traduit |
| W3 | CO-18 veille, CO-23 mode central appliqué | `specific_states.is_sleeping`, `specific_states.last_central_mode` | icônes, seulement si utilisés |
| W4 | CO-08 messages | `specific_states.messages` (liste de codes `const.py:571-582`, plus `hvac_off_reason` et `temperature_reason` quand ils existent) | une icône et un texte par code |
| W4 | CO-09, CO-10 | `is_ready` (racine), `specific_states.not_initialized_entities`, `specific_states.unavailable_underlying_entities` | icône, infobulle avec la liste |
| W4 | CO-13, CO-14 | `specific_states.last_temperature_datetime`, `specific_states.last_ext_temperature_datetime` | âge relatif coloré |
| W4 | CO-20 inhibition | `specific_states.inhibition` (`inhibited`, `command_gate`, `last_error_code`), publié seulement quand l'inhibition est utilisée | icône, seulement si présent |
| W5 | TP-01 puissance | attribut racine `power_percent` (0-100 ; over_switch, over_valve, over_climate avec vanne) ou capteur `power_percent` | barre |
| W5 | TP-03, TP-04 | `vtherm_over_switch.on_time_sec` et `off_time_sec` (over_switch seulement), ou capteurs `on_time` et `off_time` | barre segmentée |
| W7 | VR-01 ouverture | attribut racine `valve_open_percent` (over_valve, over_climate avec vanne) ou capteur `valve_open_percent` | jauge |
| W7 | VR-02 par vanne | `vtherm_over_valve.underlying_valves[]` (`entity_id`, `command_percent`), publié seulement avec le contrôle d'ouverture (`have_valve_control`) ; `vtherm_over_climate_valve.underlying_valves.<entité>.percent_open` | une barre par vanne, seulement avec plusieurs vannes |
| W8 | PR-01 preset | attribut standard `preset_mode` | icône mdi par preset (comme `number.py:34-48`) |
| W8 | PR-02 à PR-04 | attribut racine `timed_preset_manager.is_active`, `.preset`, `.original_preset`, `.remaining_time_min`, `.end_time`, `.is_manual_override`, `.resume_preset`, `.resume_end_time` (`feature_timed_preset_manager.py:442`) | icône et texte |
| W13 | SA-01 sécurité | capteur binaire `safety_state` ; attributs racine `is_safety_configured` et, quand elle est configurée, `safety_manager.safety_state` et `safety_manager.safety_delay_min` (`feature_safety_manager.py:253`) | icône d'alerte |
| W13 | SA-03 part imposée | TP-01 pendant SA-01 (VT remplace `on_percent`) | barre colorée |

Vérifié en 1.1 (2026-11-19) dans `external/versatile_thermostat` au commit `e0b0a2f` : `base_thermostat.py` `update_custom_attributes()` (l. 2211-2330), `state_manager.py:331`, `feature_safety_manager.py:253`, `feature_timed_preset_manager.py:442`, `inhibition_manager.py:132`, `thermostat_switch.py:122`, `thermostat_valve.py:280`, `thermostat_climate_valve.py:180`. Le capteur de la consigne régulée a la clé de traduction `regulated_temperature`, les durées `on_time` et `off_time`, le capteur binaire de sécurité `safety_state`.

Les attributs imbriqués (`specific_states.*`, `*_manager.*`, `vtherm_over_*`) ne sont pas enregistrés par Home Assistant : ils ne servent qu'à l'affichage courant, jamais à un graphique.

### D2. Éléments sans source, ou à traiter à part
- TP-05 (position dans le cycle TPI) : exclu (décision D6 du socle). W5 montre les durées du cycle sans curseur de position.
- PR-03 : la durée totale du preset temporisé n'est pas publiée. W8 montre le temps restant en texte et l'heure de fin, sans barre.
- La ligne 24 h de la puissance (plan : W5) n'est pas dans W5 : elle vit dans W2 (`overview-thermostat-details`) pour ne charger l'historique qu'une fois.
- Seuil de couleur de l'âge d'une mesure (W4) : orange au-delà du délai de sécurité effectif du thermostat (`safety_delay_min`, propre ou central) quand il est connu ; sans délai connu, l'âge reste neutre. Le délai sert de repère, il n'est pas affiché comme un réglage.
- Échelle de la jauge de la température : `min_temp` et `max_temp` sont des attributs standard de `climate` (lus, pas réglés).

### D3. Conditions de visibilité
| Widget | Visible si |
| --- | --- |
| W1, W3, W4, W8 | toujours (attributs standard de `climate`) ; le widget montre « indisponible » si l'entité `climate` manque |
| W5 | l'algorithme est TPI et une source de `power_percent` existe (over_switch, over_valve, over_climate avec vanne) |
| W7 | une source de `valve_open_percent` existe (over_valve, ou over_climate avec régulation par vanne) |
| W13 | le capteur binaire `safety_state` existe et la sécurité est configurée (`safety_manager.is_safety_configured`) |

### D4. Mise en page
`core.widget.temperature` : `first`. Puis chaînage `after` : `core.widget.mode` après la température, `core.widget.alerts` après le mode, `core_tpi.widget.heating` après les alertes, `core_valve_regulation.widget.valve` après la chauffe, `core_presets.widget.preset` après la vanne, `core_advanced.widget.safety` après le preset. **Ajusté à l'implémentation** : les plugins natifs se chargent dans l'ordre `core`, `core_tpi`, `core_presets`, …, `core_valve_regulation`, …, `core_advanced` ; `core_presets` se charge donc avant la vanne et un `after: core_valve_regulation.widget.valve` donnerait l'avertissement `target_missing`. Le preset se place `after: core_tpi.widget.heating`, et la vanne, chargée ensuite, `after: core_tpi.widget.heating` aussi : elle s'insère juste après la chauffe, donc avant le preset. L'ordre affiché est le même (chauffe, vanne, preset), sans avertissement. Les identifiants et l'ordre sont dans `frontend/src/native/widgets/ids.ts`. Un widget masqué garde sa place, donc la chaîne ne se casse pas. Un plugin tiers peut s'insérer entre deux cartes par `after`.
- Alternative écartée : une seule carte « Fonctionnement » qui regroupe tout : va contre la règle de découpage tranchée (un widget par sujet utile, masquable seul).
- `core-pages.ts` transmet `centralValues` à `vtherm-widgets-page`. Alternative écartée : lire la configuration centrale dans chaque widget (appel asynchrone, déjà couvert par le socle).

### D5. Taille des widgets (propriété `size` du socle)
| Widget | Taille | Raison |
| --- | --- | --- |
| W1 Température | 1 colonne, 1 ligne (défaut) | une jauge et trois lignes de valeur |
| W3 Mode et action | 1 × 1 (défaut) | deux icônes et un texte |
| W4 Alertes | 1 × 1 (défaut) | la liste grandit avec son contenu, sans hauteur minimale |
| W5 Chauffe TPI | 1 × 1 (défaut) | deux barres |
| W7 Vanne | 1 × 1 (défaut) | une jauge, des barres par vanne qui allongent la carte |
| W8 Preset et dérogation | 1 × 1 (défaut) | icône et deux textes |
| W13 Sécurité | 1 × 1 (défaut) | icône et barre |
Aucun widget de base ne déclare `size` : tous gardent une colonne. La déclaration est facultative et laisse la place à un `rows: 2` après le premier rendu.

### Décisions prises par défaut (à confirmer)
| # | Hypothèse | Alternative écartée |
| --- | --- | --- |
| a | Les widgets lisent les entités par `getEntryEntities` du SDK et ne lisent pas d'historique (aucune courbe dans ce change). | Aides internes au dashboard seulement. |
| b | La température extérieure est lue par thermostat (W1), comme classé dans le plan. | Température commune sur la vue d'ensemble d'un thermostat : fausse si le thermostat a son capteur. |
| c | Affichage seul : W3 ne montre pas de bouton de mode ni de consigne, W8 pas de sélecteur de preset. | Commandes dans les widgets. |
| d | Taille déclarable par widget (`size`), grille de ~280 px par colonne. | Grille fixe. |

## Risques / Trade-offs
- Les noms d'attributs viennent de la lecture de VT. Une version différente peut les changer : un attribut absent donne « indisponible », jamais une erreur.
- `ext_current_temperature` : vérifié en 1.1, il est dans `specific_states`.
- Sept cartes dans la vue d'un thermostat complet, une colonne chacune : acceptable ; si le premier rendu semble dense, on abaisse W4 ou W13 plutôt que de fusionner.
- Les raisons et messages de VT sont des codes : un code inconnu (version de VT plus récente) s'affiche tel quel, avec une icône générique.
