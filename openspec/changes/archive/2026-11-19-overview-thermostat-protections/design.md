# Design

## Context
- Source : code de Versatile Thermostat (VT), lu, pas exécuté. Mgr = `add_custom_attributes()` du gestionnaire (attribut de l'entité `climate`, dictionnaire sous la clé du gestionnaire). BS = `binary_sensor.py`.
- Les clés de fonctionnalité qui allument une section (par exemple `use_window_feature`) existent déjà dans les définitions des onglets natifs (`frontend/src/native/tab-definitions.ts`) : les conditions de visibilité les réutilisent au lieu de redéfinir des noms.
- Le socle fournit les composants, `getEntryEntities` (lecture synchrone des entités d'un thermostat dans `hass`), la taille `size` et les conventions de masquage.

## Goals / Non-Goals
**Goals:**
- Dire pourquoi une fonction agit sur le thermostat, sans carte vide quand elle est éteinte.

**Non-Goals:**
- Commandes (contournement de fenêtre, verrou, activation de l'arrêt automatique) : voir « Décisions prises par défaut ».
- Historique et graphiques.

## Décisions

### D1. Sources des éléments (VT)
| Widget | Élément | Source dans VT | Forme |
| --- | --- | --- | --- |
| W9 | WI-01 fenêtre (capteur) | capteur binaire `window_state` (BS:211) ; Mgr `window_manager.window_state` (`feature_window_manager.py:382`) | icône fenêtre ouverte/fermée |
| W9 | WI-02 détection automatique | Mgr `window_manager.window_auto_state` | icône distincte, seulement si `is_window_auto_configured` |
| W9 | WI-03 contournement | capteur binaire `window_bypass_state` (BS:348) ; Mgr `is_window_bypass` | icône |
| W9 | WI-04 effet en cours | dérivé : raison `hvac_off_window_detection` et messages `target_temp_window_eco` et `target_temp_window_frost` | texte (arrêt, éco, hors-gel, aucun) |
| W10 | MO-01 mouvement | capteur binaire `motion_state` (BS:263) ; Mgr `motion_manager.motion_state` | icône |
| W10 | MO-02 preset d'activité | dérivé : message `target_temp_activity_detected` | étiquette |
| W11 | PW-01 délestage | capteur binaire `overpowering_state` (BS:170) ; Mgr `power_manager.overpowering_state` | icône d'alerte |
| W12 | AS-01 arrêt détecté | Mgr `auto_start_stop_manager.is_auto_stop_detected` (`feature_auto_start_stop_manager.py:273`) | icône |
| W12 | AS-02 fonction activée | Mgr `auto_start_stop_enable` (entité `switch` « Enable auto start/stop ») | icône d'état |
| W12 | AS-03 erreur accumulée | Mgr `auto_start_stop_accumulated_error` et `auto_start_stop_accumulated_error_threshold` | jauge valeur / seuil |
| W12 | AS-04 dernier basculement | Mgr `auto_start_stop_last_switch_date` | âge relatif |
| W14 | LK-01 verrouillé | attribut `is_locked` ; Mgr `lock_manager.is_locked` (`feature_lock_manager.py:142`) | icône de cadenas |
| W16 | HF-01, HF-02 pannes | capteurs binaires `heating_failure_state` (BS:130) et `cooling_failure_state` ; Mgr `heating_failure_detection_manager.*` | icônes d'alerte |
| W16 | HF-03 suivi | Mgr `heating_tracking` et `cooling_tracking` (`is_tracking`, `initial_temperature`, `current_temperature`, `elapsed_time_min`, `remaining_time_min`) | barre : écoulé / (écoulé + restant) |
| W16 | HF-04 cause probable | Mgr `root_cause`, `root_cause_entity_id`, seulement en panne | texte + lien « plus d'infos » de Home Assistant |
| W16 | HF-05 détection suspendue | Mgr `is_detection_enabled_by_template` | icône, seulement si un modèle est configuré |

**Vérifié en 1.1** (code de VT, commit `e0b0a2f`, 2026-11-19) ; les gestionnaires publient leurs attributs à la racine du `climate`. Ce qui précise ou corrige le tableau :
- **WI-01, WI-02** : le capteur binaire `window_state` est allumé quand la fenêtre du capteur **ou** la détection automatique l'est (`binary_sensor.py:234`) ; le widget lit donc `window_manager.window_state` pour le capteur (ligne affichée seulement quand `window_manager.window_sensor_entity_id` est défini) et `window_manager.window_auto_state` pour la détection automatique, le capteur binaire servant de repli. `window_manager` n'est publié que si la fenêtre ou la détection automatique est configurée. `is_window_bypass` est dans `window_manager`.
- **WI-04** : la raison du mode `hvac_off_window_detection` est posée pour **toute** action de la fenêtre, y compris éco et hors-gel (`state_manager.py:142` et `:194`) ; seule l'action « arrêt » pose aussi la raison d'arrêt `hvac_off_window_detection`. L'effet se lit donc ainsi : message `target_temp_window_frost` → hors-gel ; `target_temp_window_eco` → éco ; raison d'arrêt `hvac_off_window_detection` → arrêt ; raison du mode `hvac_off_window_detection` avec le mode `fan_only` → **ventilation** (action `window_fan_only` de VT, quatrième effet, ajouté) ; sinon aucun. Contournement actif → aucun.
- **W10** : `motion_manager.motion_state` (`on`, `off`, sinon inconnu) ; publié seulement quand le mouvement est configuré.
- **W11** : `power_manager.overpowering_state` (`on`, `off`, `unknown`) ; capteur binaire `overpowering_state` en repli.
- **W12** : `auto_start_stop_manager` publié seulement quand la fonction est configurée ; `auto_start_stop_accumulated_error` est borné à ± `auto_start_stop_accumulated_error_threshold` (`auto_start_stop_algorithm.py:141`) : la jauge va de −seuil à +seuil, avec le seuil comme repère. `auto_start_stop_last_switch_date` est une date ISO, ou nulle.
- **W14** : `is_locked` est dans `specific_states` et dans `lock_manager` ; `is_lock_configured` (racine) est vrai quand le verrou bloque les utilisateurs ou les automatisations (`feature_lock_manager.py:50`).
- **W16** : `heating_failure_detection_manager` donne `heating_failure_state`, `cooling_failure_state` (`on`, `off`, `unknown`, `unavailable`), `heating_tracking` et `cooling_tracking` (clés confirmées), `root_cause` (`not_identified`, `valve_stuck_closed`, `valve_stuck_open`), `root_cause_entity_id`, `failure_detection_enable_template` (le modèle, nul sans modèle) et `is_detection_enabled_by_template`.
- **D3, clés** : `use_window_feature`, `use_motion_feature`, `use_power_feature`, `use_auto_start_stop_feature`, `use_heating_failure_detection_feature` (`tab-definitions.ts`) ; les conditions réutilisent la règle `applies` de la section (pour l'arrêt automatique : `over_climate` sans régulation par vanne). Le verrou n'a pas de clé de fonctionnalité : sa condition est `is_lock_configured`.

### D2. Éléments sans source, et traitement
Trois des quatre éléments sans source de VT sont ici et sont **exclus**, sans calcul côté dashboard :
- WI-05, délai restant avant l'effet de la fenêtre : seuls `window_delay_sec` et `window_off_delay_sec` (configuration) sont publiés ; l'instant de début n'est pas publié.
- AS-05, prochaine action de l'arrêt automatique : aucun attribut.
- LK-02, échéance du reverrouillage : `auto_relock_sec` est de la configuration, l'heure du verrouillage n'est pas publiée.
Les éléments dérivés WI-04 et MO-02 sont des lectures de codes que VT publie déjà (raison, messages), pas des estimations.

### D3. Conditions de visibilité
| Widget | Visible si |
| --- | --- |
| W9 | la fonctionnalité fenêtre est active (propre ou centrale) et le capteur binaire `window_state` existe |
| W10 | la fonctionnalité mouvement est active et le capteur binaire `motion_state` existe |
| W11 | la gestion de puissance est active et le capteur binaire `overpowering_state` existe |
| W12 | le thermostat est `over_climate`, la fonction est configurée et l'attribut `auto_start_stop_manager` existe |
| W14 | le verrouillage est configuré (`is_lock_configured`) |
| W16 | la détection est active et le capteur binaire `heating_failure_state` existe (pas pour `over_climate` sans vanne) |

W16 reste affiché tant que la fonction est active, y compris sans panne ni suivi (« Aucune panne »). Alternative écartée : le masquer hors panne, car la carte apparaîtrait et disparaîtrait en décalant les autres.

### D4. Placements
Après les widgets de base : `core_window.widget.window` après `core_presets.widget.preset`, puis chaînage `after` : mouvement après fenêtre, délestage après mouvement, arrêt automatique après délestage, verrouillage après arrêt automatique, panne de chauffage après verrouillage. Si la cible est absente, `on_missing: last` s'applique (comportement par défaut).

**Constaté à l'implémentation** : `core_advanced`, chargé après `core_window`, place la carte Sécurité après le Preset (`overview-thermostat-core`) ; elle s'insère donc entre le Preset et la Fenêtre. L'ordre complet est : base (…, Preset, Sécurité), puis Fenêtre, Mouvement, Délestage, Arrêt automatique, Verrouillage, Panne de chauffage. Les cartes de fonctions gardent leur ordre relatif et suivent toutes les cartes de base. Un plugin retiré laisse les suivantes dans leur ordre : la carte qui le visait se place en dernier au moment de son chargement, c'est-à-dire à la même place.

### D5. Taille des widgets (propriété `size` du socle)
| Widget | Taille | Raison |
| --- | --- | --- |
| W9 Fenêtre | 1 colonne, 1 ligne (défaut) | deux icônes et un texte d'effet |
| W10 Mouvement | 1 × 1 (défaut) | une icône et une étiquette |
| W11 Délestage | 1 × 1 (défaut) | une icône |
| W12 Arrêt et démarrage automatiques | 1 × 1 (défaut) | icônes, une jauge, un âge |
| W14 Verrouillage | 1 × 1 (défaut) | un cadenas |
| W16 Panne de chauffage | 1 × 1 (défaut) | alertes et une barre de suivi ; la carte grandit avec la cause probable |
Aucun widget de ce change ne déclare `size`. Les cartes d'une icône (W10, W11, W14) restent des cartes d'une colonne : c'est la limite que le plan signale, à juger après le premier rendu.

### Décisions prises par défaut (à confirmer)
| # | Hypothèse | Alternative écartée |
| --- | --- | --- |
| a | Les widgets lisent les entités par `getEntryEntities` du SDK. | Aides internes seulement. |
| b | Aucun widget de ce change n'est global ou extérieur : le délestage est lu par thermostat (PW-01), la présence est globale (hors de ce change). | Délestage global. |
| c | Affichage seul : pas de bouton de contournement (W9), de verrou (W14) ni d'interrupteur de l'arrêt automatique (W12). Le contournement est une suite possible, change à part. | Commandes dans les widgets. |
| d | Taille déclarable par widget (`size`), grille de ~280 px par colonne. | Grille fixe. |

## Risques / Trade-offs
- Six petites cartes (surtout W10, W11, W14, une icône) d'une colonne : la grille peut sembler dense. Le plan prévoit de baisser la priorité de W10 plutôt que de fusionner ; à trancher après le premier rendu.
- Les noms de gestionnaires et d'attributs viennent de la lecture de VT : une version différente peut les changer ; un attribut absent donne « indisponible ».
- WI-04 dépend des codes de raison et de message de VT. Un code inconnu laisse l'effet à « aucun » : à vérifier en 1.1.
- La clé exacte de fonctionnalité de chaque section (mouvement, puissance, arrêt automatique, verrou, panne) vient de `tab-definitions.ts` : tâche 1.1.
