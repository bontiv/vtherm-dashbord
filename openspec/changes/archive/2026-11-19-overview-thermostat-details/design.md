# Design

## Context
- Source : code de Versatile Thermostat (VT), lu, pas exécuté. S = `sensor.py`, BS = `binary_sensor.py`, Mgr = attribut d'un gestionnaire sur l'entité `climate`.
- Le composant `vtherm-time-chart` (SVG, séries pleines et pointillées, curseur au clavier, résumé textuel) et le client d'historique interne du dashboard (`native/history.ts`, cache de 5 minutes, déjà utilisé par les panneaux d'estimation) servent aux courbes. Le SDK n'exporte pas de lecteur d'historique (audit du socle).
- L'historique n'enregistre pas les attributs imbriqués (`specific_states.*`, `*_manager.*`, `vtherm_over_*`). Les courbes ne lisent que : l'état du `climate`, ses attributs `current_temperature`, `temperature`, `power_percent`, et l'état de capteurs.

## Goals / Non-Goals
**Goals:**
- Montrer les 24 dernières heures et le détail d'apprentissage sans surcharger la vue.

**Non-Goals:**
- Commandes d'Auto TPI (`set_auto_tpi_mode`, `auto_tpi_calibrate_capacity`) et de ventilation.
- Période choisissable, comparaison entre thermostats, courbes de 7 jours (les panneaux d'estimation de la configuration le font déjà).

## Décisions

### D1. Sources des éléments (VT)
| Widget | Élément | Source dans VT | Forme |
| --- | --- | --- | --- |
| W2 | CO-01, CO-02 | attributs `current_temperature` et `temperature` de `climate` (historique de l'attribut) | courbe |
| W2 | CO-04 extérieure | état du capteur extérieur de la configuration effective du thermostat (`external_temperature_sensor_entity_id`, propre ou central), pas l'attribut `ext_current_temperature` | courbe |
| W2 | TP-01 puissance | capteur `power_percent` (S:274) ou attribut `power_percent` de `climate` | seconde courbe, si présent |
| W25 | CO-11 | `is_device_active`, `should_device_be_active`, `nb_device_actives` | icône |
| W25 | CO-12 | état dans `hass.states` de chaque entité de `vtherm_over_switch.underlying_entities`, `vtherm_over_valve.underlying_entities` ou `vtherm_over_climate.underlying_entities` | une icône par équipement |
| W25 | CO-19 ventilation | `fan_mode` (`thermostat_climate.py:684`) | icône, seulement si présent |
| W6 | TP-07 état | capteur `auto_tpi_learning` (S:333) : `disabled`, `off`, `bootstrap`, `active` | icône |
| W6 | TP-08 cycles | attributs du capteur `coeff_int_cycles`, `coeff_ext_cycles`, `heating_cycles_count` | texte |
| W6 | TP-09 coefficients | `calculated_coef_int`, `calculated_coef_ext` | texte |
| W6 | TP-10 confiance | `model_confidence` | jauge, ou nombre brut si l'échelle n'est pas confirmée |
| W6 | TP-11, TP-12 | `thermal_time_constant_hours` ; `capacity_heat_status` (`learning` / `learned`), `capacity_heat_count`, `max_capacity_heat` | texte et icône |
| W6 | TP-13, TP-14 | `last_learning_status` ; `learning_start_dt` | texte, âge relatif |
| W15 | HU-01 humidité | attribut standard `current_humidity` de `climate` (`base_thermostat.py:731`) | jauge 0-100 % |
| W17 | ST-01 | `vtherm_over_climate.temp_synchronisation.sync_attributes.<entité>.value` (`thermostat_climate.py:728-745`) | texte |
| W17 | ST-02, ST-03 | `vtherm_over_climate.underlying_temperature_tracking.suspended`, `.reason`, `.attempts`, `.underlyings.<entité>.status`, `.observed_temperature`, `.last_sent_temperature` | icône d'alerte si suspendu, tableau en infobulle |
| W18 | CB-07 demande | dérivé : `is_device_active` filtré par `configuration.is_used_by_central_boiler` | icône de flamme |
| W27 | PW-05 | capteur `mean_power_cycle` (S:211) | courbe 24 h |
| W27 | PW-06 énergie | capteur `energy` (S:151, `total_increasing`) | compteur en texte |

**Vérifié en 1.1** (code de VT, commit `e0b0a2f`, 2026-11-19) ; ce qui précise ou corrige le tableau :
- **TP-10** : `model_confidence` va de 0,0 à 1,0 (`auto_tpi_manager.py:3014` : moyenne de la progression des deux coefficients sur 50 cycles chacun, moins une pénalité d'échecs de démarrage). L'échelle est confirmée : la confiance s'affiche en **pourcentage sur une barre**.
- **W6** : attributs du capteur `auto_tpi_learning` confirmés (`sensor.py:376`) : `coeff_int_cycles`, `coeff_ext_cycles`, `heating_cycles_count`, `thermal_time_constant_hours`, `model_confidence`, `last_learning_status`, `learning_start_dt`, `calculated_coef_int`, `calculated_coef_ext`, et en chauffe `max_capacity_heat`, `capacity_heat_status`, `capacity_heat_count`. Le capteur n'est créé que si l'algorithme est TPI et que `auto_tpi_mode` est vrai (`sensor.py:134`).
- **W17** : `underlying_temperature_tracking` est publié pour **tout** thermostat `over_climate` (`thermostat_climate.py:700`), pas seulement avec la synchronisation : le widget s'affiche donc pour tout `over_climate`. Chaque équipement y a `requested_temperature`, `last_sent_temperature`, `observed_temperature`, `status` ; la raison vaut `tracking_armed`, `command_sent`, `attempt_limit_reached`, `external_command_received` ou `<adoption>_adopted`. ST-01 (température envoyée à chaque équipement) se lit sur `last_sent_temperature` ; `temp_synchronisation.sync_attributes` est indexé par l'entité de synchronisation (un `number`), dont `value` est l'état, une température ou un décalage selon `sync_with_calibration` : il s'affiche avec l'unité de cette entité.
- **W18** : `is_used_by_central_boiler` est dans `configuration` ; `is_device_active`, `should_device_be_active`, `nb_device_actives` sont dans `specific_states`.
- **CO-04** : le capteur extérieur n'est pas publié sur le `climate` (`base_thermostat.py:504` le garde en interne). Le widget le lit dans les valeurs de configuration effectives (`effectiveValues` des panneaux d'estimation) : la grille donne désormais `values` et `centralValues` aux widgets d'un thermostat, en propriétés internes du dashboard, sans changer le contrat du SDK.

### D2. Éléments sans source ou ambigus, et traitement
- Aucun des quatre éléments sans source de VT n'est dans ce change.
- Ambigus, traités ainsi : l'échelle de `model_confidence` (« R² ou pourcentage » dans un commentaire de VT) : la tâche 1.1 lit le calcul ; en attendant la jauge est remplacée par le nombre brut sans unité. L'unité de `max_capacity_heat` n'est pas documentée : le nombre s'affiche sans unité. Le nombre de cycles « cible » de l'Auto TPI n'a pas de borne trouvée : les cycles s'affichent en texte, sans barre de progression.
- Exclus par le plan : TP-02 et TP-06 (doublons de TP-01), TP-15 et TP-16 (diagnostic), ST-04 (réglage).
- L'historique de l'humidité n'est pas dans la liste des attributs enregistrés confirmés : W15 est une jauge seule ; une courbe pourra s'ajouter après vérification d'un historique réel.
- Température extérieure de W2 : lue sur le capteur de la configuration effective du thermostat (par thermostat), puisque `ext_current_temperature` n'est pas enregistré.

### D3. Courbes
W2 contient deux courbes qui partagent l'axe du temps : températures (courante pleine, consigne en pointillé, extérieure fine) puis puissance TPI, seulement si elle existe. Raison : une échelle commune écraserait des % à côté de degrés. Une seule période (24 h), pas de sélecteur. La courbe se charge quand la carte est visible ; une erreur d'historique donne un message à la place de la courbe, sans effacer la valeur courante. W27 a une courbe de puissance moyenne de cycle.
- Alternative écartée : une courbe par widget TPI (W5). Elle chargerait deux fois la même entité ; la puissance vit dans W2.

### D4. Conditions de visibilité
| Widget | Visible si |
| --- | --- |
| W2 | toujours (au moins la température) |
| W25 | le thermostat a au moins une entité sous-jacente publiée |
| W6 | l'algorithme est TPI, l'option Auto TPI est active et le capteur `auto_tpi_learning` n'est pas `disabled` |
| W15 | l'attribut `current_humidity` existe |
| W17 | le thermostat est `over_climate` et `temp_synchronisation` ou `underlying_temperature_tracking` existe |
| W18 | le thermostat est rattaché à la chaudière centrale et la chaudière centrale est active |
| W27 | le capteur `energy` ou `mean_power_cycle` existe (puissance de l'appareil renseignée) |

### D5. Placements
Après les widgets de fonctions : `core.widget.devices` après `core_heating_failure.widget.failure`, puis `core_tpi.widget.auto_tpi`, `core_central_boiler.widget.thermostat`, `core_power.widget.energy`, `core_humidity.widget.humidity`, `core_sync_temp.widget.sync` en chaîne `after`, et `core.widget.history` en `last`. Quand une cible manque, `on_missing: last` s'applique.

**Ajusté à l'implémentation** : `core` se charge en premier, avant `core_heating_failure` ; `core.widget.devices` se place donc en `last` (puis `core.widget.history`, aussi en `last`) : les widgets de base et de fonctions, chargés ensuite, se placent après leur cible, donc avant lui. `core_sync_temp` se charge avant `core_humidity` : `core_sync_temp.widget.sync` se place après l'énergie, et l'humidité, chargée ensuite, s'insère entre les deux. L'ordre obtenu est celui de la spec : Équipements, Auto TPI, Demande à la chaudière, Énergie, Humidité, Suivi de l'équipement, Historique 24 h.

### D6. Taille des widgets (propriété `size` du socle)
| Widget | Taille | Raison |
| --- | --- | --- |
| W2 Historique 24 h | `columns: 2`, `rows: 2` | deux courbes qui partagent l'axe du temps ; une courbe de 280 px est trop courte pour 24 h |
| W25 Équipements | 1 colonne, 1 ligne (défaut) | une icône par équipement, la carte grandit avec leur nombre |
| W6 Apprentissage Auto TPI | `columns: 1`, `rows: 2` | huit lignes de texte, icône et jauge |
| W15 Humidité | 1 × 1 (défaut) | une jauge |
| W17 Suivi de l'équipement | 1 × 1 (défaut) | un texte par équipement |
| W18 Demande à la chaudière | 1 × 1 (défaut) | une flamme |
| W27 Énergie du thermostat | `columns: 1`, `rows: 2` | courbe de puissance et compteur |
À 375 px, toutes les colonnes demandées sont ramenées à une ; les hauteurs minimales restent, donc W2 garde sa hauteur de deux lignes. W2 est le seul widget de ce change qui s'élargit : sa largeur est la raison du retrait de l'hypothèse « grille fixe » pour ce plan.

### Décisions prises par défaut (à confirmer)
| # | Hypothèse | Alternative écartée |
| --- | --- | --- |
| a | Historique lu par le client interne du dashboard ; les plugins tiers utilisent `hass.callWS`. | Un `readHistory` exporté par le SDK : redondant avec `hass.callWS` (audit du socle). |
| b | La température extérieure de W2 est par thermostat. | Température extérieure globale. |
| c | Affichage seul : W6 sans boutons de démarrage, d'arrêt ou de calibration. | Commandes dans le widget. |
| d | Taille déclarable par widget (`size`), grille de ~280 px par colonne ; W2 sur deux colonnes. | Grille fixe : W2 serait coincé dans une cellule de 280 px. |

## Risques / Trade-offs
- W2 à 375 px tient dans une colonne : les courbes sont courtes ; le résumé textuel et le curseur au clavier restent disponibles. À 1 440 px, deux colonnes de 280 px le rendent lisible.
- Les attributs de `auto_tpi_learning` viennent de la lecture de VT ; un nom absent donne « indisponible » pour cette ligne seulement.
- Sept cartes de plus sur un thermostat complet (jusqu'à 20 au total) : la plupart sont masquées par la fonction éteinte ; si le premier rendu est dense, baisser W17 et W18 (priorité 3) avant de fusionner.
- Les capteurs `energy` de plusieurs thermostats peuvent avoir des unités différentes : W27 affiche l'unité de son capteur.
