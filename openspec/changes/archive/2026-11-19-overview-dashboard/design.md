# Design

## Context
- `global_widget` : la condition `visible` est synchrone. Le socle lui donne `central` (identifiant et valeurs de la configuration centrale) ; les entités centrales se lisent avec `getEntryEntities(hass, central.entryId)` (socle D1, D2), sans appel réseau.
- Les entités centrales (`select` du mode central, capteur binaire de la chaudière, capteurs de la chaudière) sont sur l'appareil de la configuration centrale, sans clé de traduction partagée avec un thermostat (plan, §6) ; le registre d'affichage de `hass.entities` n'expose pas `unique_id`, donc on les retrouve par leur appareil, leur domaine et leur clé de traduction quand elle existe (`select` du mode central : aucun clé, seul `select` de l'appareil central). Leurs `unique_id` dans VT : `central_mode` (`select.py:68`), `central_boiler_state` (`binary_sensor.py:389`), `nb_device_active_boiler` (`sensor.py:779`), `total_power_active_boiler` (`sensor.py:965`), `presence_state` (`binary_sensor.py:305`).
- Source : code de Versatile Thermostat (VT), lu, pas exécuté.

## Goals / Non-Goals
**Goals:**
- Une vue d'ensemble du foyer lisible à 30 thermostats, sans graphique par thermostat.
- Aucune carte vide quand la configuration centrale ou une fonctionnalité manque.

**Non-Goals:**
- Changer le mode central, simuler la présence : commandes hors périmètre (voir « Décisions prises par défaut »).
- Un widget par thermostat sur la page Overview.

## Décisions

### D1. Sources des éléments (VT)
| Widget | Élément | Source dans VT | Forme |
| --- | --- | --- | --- |
| W19 | CO-24 mode central | entité `select` d'`unique_id` `central_mode` ; options `Auto`, `Stopped`, `Heat only`, `Cool only`, `Frost protection` (`const.py:555-560`) | icône et libellé traduit |
| W20 | CO-25 répartition | dérivé : `hvac_action` et état de chaque entité `climate` de plateforme `versatile_thermostat` dans `hass.entities` (aucune liste serveur) | barre segmentée |
| W20 | CO-26 alertes | dérivé : `messages`, `unavailable_underlying_entities`, `heating_failure_detection_manager.heating_failure_state` et `cooling_failure_state` de chaque `climate` | une icône par thermostat, avec lien vers sa vue |
| W21 | CO-27 extérieure commune | état de l'entité `external_temperature_sensor_entity_id` des valeurs de la configuration centrale | valeur + courbe 24 h |
| W22 | CB-01 chaudière | capteur binaire `central_boiler_state` (classe `running`) | icône |
| W22 | CB-02 demandeurs | capteur `nb_device_active_boiler` ; seuil : entité `number` `nb_active_device_for_boiler_threshold` de l'appareil central | jauge valeur / seuil |
| W22 | CB-03 liste | attribut `active_device_ids` du capteur `nb_device_active_boiler` | liste de liens |
| W22 | CB-05, CB-06 | attributs `activation_scheduled`, `delayed_activation_sec`, `is_central_boiler_ready` du gestionnaire (sur le capteur binaire `central_boiler_state`, à confirmer en 1.1) | icône sablier, icône « pas prête » seulement si faux |
| W26 | CB-04 puissance | capteur `total_power_active_boiler` ; seuil : entité `number` `total_power_active_for_boiler_threshold` | jauge + courbe 24 h |
| W23 | PW-02, PW-03 | attributs `power_manager.current_power` et `power_manager.current_max_power` d'un `climate` (`feature_power_manager.py:101`) | jauge |
| W23 | PW-04 marge | dérivé : maximum − courante | barre utilisé / max |
| W23 | PW-07 énergie | dérivé : somme des capteurs `energy` des thermostats (`sensor.py:151`) | texte (compteur cumulé) |
| W24 | PS-01 présence | capteur binaire `presence_state` (central) | icône |

Les attributs imbriqués ne sont pas enregistrés dans l'historique : seules W21 et W26 (états de capteurs) ont une courbe.

**Vérifié en 1.1** (code de VT, commit `e0b0a2f`, 2026-11-19) ; ce qui diffère du tableau ci-dessus :
- **W19** : le `select` du mode central n'a pas de clé de traduction (`_attr_name = "Central Mode"`) ; c'est le seul `select` de l'appareil central (vérifié dans le devcontainer avec `overview-foundation` 1.1). Il se retrouve par son domaine.
- **W22, W26** : les entités centrales de la chaudière ont une clé de traduction égale à leur `unique_id` : `central_boiler_state` (capteur binaire), `nb_device_active_boiler` et `total_power_active_boiler` (capteurs). Les deux entités `number` des seuils (`unique_id` `boiler_activation_threshold` et `boiler_power_activation_threshold`) **n'ont pas de clé de traduction** (les `number` des presets centraux en ont une) : le seuil se lit dans l'attribut `central_boiler_manager` du capteur binaire (`nb_active_device_for_boiler_threshold`, `total_power_active_for_boiler_threshold`, publié en entier par VT), et à défaut sur le `number` sans clé de l'appareil central, celui qui a une unité de puissance pour la puissance, l'autre pour le nombre.
- **CB-05, CB-06** : sur le capteur binaire `central_boiler_state`, `is_central_boiler_ready` est à la racine et `activation_scheduled`, `delayed_activation_sec` sont dans `central_boiler_manager`, publié seulement quand la chaudière est prête (`feature_central_boiler_manager.py:419`).
- **CB-03** : `active_device_ids` donne les **équipements** actifs (interrupteurs, vannes, `climate` sous-jacents), pas les thermostats. Chaque `climate` de VT publie les siens dans `specific_states.device_actives` : le widget retrouve ainsi le thermostat de chaque équipement, et affiche sans lien un équipement qu'aucun thermostat ne revendique.
- **W23** : `power_manager` est à la racine des attributs du `climate`. `current_power` et `current_max_power` sont dans l'unité centrale, qui n'est pas publiée (`power_manager.power_unit` est l'unité de l'équipement du thermostat) ; le widget la calcule comme VT (`feature_central_power_manager.py:361`) : `power_unit` de la configuration centrale (`w`, `kw`), sinon l'unité du capteur `power_manager.power_sensor_entity_id`, sinon W.
- **W20** : `heating_failure_detection_manager` est à la racine ; `messages` et `unavailable_underlying_entities` sont dans `specific_states`.
- **W24** : **VT n'a pas de capteur binaire `presence_state` central** : il en crée un par thermostat qui utilise la présence (`binary_sensor.py:305`, `unique_id` `<thermostat>_presence_state`). La présence globale est le capteur `presence_sensor_entity_id` des valeurs de la configuration centrale ; le widget le lit comme VT (`feature_presence_manager.py:113`) : `on` ou `home` présent, `off` ou `not_home` absent, toute autre valeur inconnu.

### D2. Éléments dérivés et sans source
- Aucun des quatre éléments sans source de VT n'appartient à ce change.
- W20 et W23 (marge, énergie totale) sont des calculs côté dashboard à partir de valeurs que VT publie ; ils sont étiquetés comme calculés dans l'infobulle.
- **Puissance du logement (W23)** : lue sur le premier `climate` qui publie `power_manager.current_power` (VT publie déjà la valeur convertie dans l'unité centrale). Alternative écartée : lire les capteurs de puissance de la configuration centrale, avec leurs unités à convertir. L'unité affichée vient de l'attribut qui la donne (tâche 1.1) ; sans unité connue, la valeur s'affiche seule.
- **Énergie totale (W23)** : la somme est faite seulement quand tous les capteurs `energy` ont la même `unit_of_measurement` ; sinon la ligne est omise.
- Un thermostat `unavailable` compte dans « indisponible », pas dans « éteint ».

### D3. Conditions de visibilité
| Widget | Visible si |
| --- | --- |
| W19 | l'entité `select` du mode central existe |
| W20 | au moins un thermostat existe |
| W21 | la configuration centrale a un capteur extérieur et son entité existe |
| W22 | la chaudière centrale est active dans la configuration centrale et le capteur binaire `central_boiler_state` existe |
| W26 | la chaudière centrale est active dans la configuration centrale et le capteur `total_power_active_boiler` existe |
| W23 | un `climate` publie `power_manager.current_power` numérique |
| W24 | la configuration centrale a un capteur de présence (`presence_sensor_entity_id`) et son entité existe (corrigé en 1.1 : pas de `presence_state` central) |

**Constaté en 5.2** : quand la chaudière centrale est éteinte, VT laisse ses entités dans le registre, indisponibles. Leur existence ne suffit donc pas : W22 et W26 lisent aussi `use_central_boiler_feature` dans les valeurs de la configuration centrale.

### D4. Mise en page
`core.widget.central_mode` : `first` ; `core.widget.summary` après le mode central ; `core_central_boiler.widget.boiler` après le résumé ; `core_central_boiler.widget.boiler_power` après la chaudière ; `core_power.widget.house_power` après la puissance de la chaudière ; `core.widget.outdoor` après la puissance du logement ; `core_presence.widget.presence` après l'extérieure.

**Changé à la demande de l'utilisateur (2026-11-19)** : `core_presence.widget.presence` se place après le mode central. À 3 colonnes, la première rangée est Mode central, Présence, Résumé. L'ordre devient : mode central, présence, résumé, chaudière, puissance de la chaudière, puissance du logement, extérieure.

**Ajusté à l'implémentation** : les plugins natifs se chargent dans l'ordre `core`, …, `core_central_boiler`, …, `core_power`, `core_presence`. Quand `core` place `core.widget.outdoor`, la puissance du logement n'existe pas encore : `after` donnerait `target_missing`. `core.widget.outdoor` se place donc après le résumé ; la chaudière, puis sa puissance, puis la puissance du logement, chargées ensuite, s'insèrent entre les deux, ce qui donne le même ordre : mode central, résumé, chaudière, puissance de la chaudière, puissance du logement, extérieure, présence.

### D5. Taille des widgets (propriété `size` du socle)
| Widget | Taille | Raison |
| --- | --- | --- |
| W19 Mode central | 1 colonne, 1 ligne (défaut) | une icône et un libellé |
| W20 Résumé des thermostats | 1 × 1 (défaut) | la barre et sa légende passent à la ligne ; en pleine largeur, la carte était trop large pour quatre nombres (retour de l'utilisateur, 2026-11-19) |
| W22 Chaudière centrale | `columns: 1`, `rows: 2` | icône, jauge et liste des demandeurs |
| W26 Puissance demandée à la chaudière | `columns: 2`, `rows: 2` | jauge et courbe de 24 h |
| W23 Puissance du logement | 1 × 1 (défaut) | jauge, marge, énergie |
| W21 Température extérieure | `columns: 2`, `rows: 2` | valeur et courbe de 24 h |
| W24 Présence | 1 × 1 (défaut) | une icône |
À 375 px, toutes les colonnes demandées sont ramenées à une ; les hauteurs minimales restent.

### D6. Coût avec N thermostats
Le résumé lit un `climate` par thermostat et ne se redessine que si l'état de l'un d'eux change. Il n'a aucune courbe. Les deux courbes (W21, W26) se chargent quand leur carte est visible, avec le cache de 5 minutes du socle.

### Décisions prises par défaut (à confirmer)
| # | Hypothèse | Alternative écartée |
| --- | --- | --- |
| a | Entités centrales lues par `getEntryEntities` et `central` du SDK ; l'historique de W21 et W26 par le client interne du dashboard. | Un lecteur d'historique exporté par le SDK : redondant avec `hass.callWS`. |
| b | La présence est globale (W24) ; la température extérieure de la page Overview est celle du capteur de la configuration centrale (W21). La température par thermostat est dans W1. | Présence par thermostat ; extérieure globale unique. |
| c | Affichage seul : W19 montre le mode central sans sélecteur, W24 sans bouton de simulation. | Commandes (changement du mode central, `set_presence`). |
| d | Taille déclarable par widget (`size`), grille de ~280 px par colonne. | Grille fixe. |

## Risques / Trade-offs
- Les `unique_id` et clés de traduction des entités centrales ne sont pas partagés avec un thermostat : la tâche 1.1 les retrouve dans VT (`select.py`, `binary_sensor.py`, `sensor.py`, `number.py`) et vérifie dans le devcontainer qu'on les distingue par appareil, domaine et clé de traduction.
- `power_manager.current_power` n'existe que si la gestion de puissance est activée ; sinon W23 est masqué. L'unité exacte de l'attribut n'a pas été lue.
- Les entités `number` des seuils sont de la configuration : elles servent de repère, jamais de valeur éditable.
- Le lien vers un thermostat (W20, W22) est une navigation, pas une commande ; il utilise le routeur du dashboard.
- Sans configuration centrale, seuls W20 (liste des thermostats) et W23 (si un `climate` publie la puissance) peuvent apparaître ; la page peut être presque vide, ce que l'état « vide » explique.
