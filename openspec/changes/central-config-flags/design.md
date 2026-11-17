# Design

## Context
Voir proposal.md (Why). Ce qui compte pour la solution :

- `FlowConfigWriter._submit` remplit chaque clé du schéma avec la valeur du brouillon, sinon avec la valeur de `baseline`. Cette base est `entry.data` en modification et `{}` en création. Une clé absente des deux n'est pas envoyée, et Home Assistant applique alors au formulaire la valeur par défaut du schéma (`data_schema(user_input)` dans `FlowManager`).
- VT montre ses formulaires avec `add_suggested_values_to_schema(schema, self._infos)`. Chaque marqueur porte alors `description = {"suggested_value": ...}`, et `_infos` contient les options centrales déjà normalisées par `_init_central_config_flags` (`False` sans configuration centrale). Le `data_schema` que le pilote reçoit dans le résultat du flow est ce schéma enrichi.
- VT refuse avec `no_central_config` une option à `True` parmi : `use_main_central_config`, `use_tpi_central_config`, `use_window_central_config`, `use_motion_central_config`, `use_power_central_config`, `use_presence_central_config`, `use_presets_central_config`, `use_advanced_central_config`, `use_lock_central_config`, `use_central_mode`, `used_by_controls_central_boiler` (`validate_input`).
- Côté frontend, `native-tab.ts` ne désactive que `layout.inherit`. Les autres champs affichent leur valeur par défaut (`shownValue`) : `use_central_mode` apparaît donc coché.
- `check_config_complete` exige, sans héritage, `tpi_coef_int`/`tpi_coef_ext` (fonction TPI) et `safety_delay_min`, `safety_min_on_percent`, `safety_default_on_percent`.

## Goals / Non-Goals

**Goals:**
- Soumettre au flow exactement ce que l'écran de Home Assistant soumettrait pour un champ que l'utilisateur ne touche pas.
- Ne jamais montrer modifiable une option que VT refusera faute de configuration centrale.
- Rendre possible la création d'un thermostat sans configuration centrale avec l'assistant actuel.

**Non-Goals:**
- Afficher les onglets TPI et avancé dans l'assistant : c'est le rôle de `creation-as-config-page`.
- Changer la disposition ou la présentation de l'héritage : c'est le rôle de `config-page-layout`.

## Decisions

**D1. Ordre des valeurs d'un champ soumis : brouillon, puis valeur suggérée par le formulaire, puis valeur enregistrée, puis rien (défaut du schéma).**
La valeur suggérée est lue sur le marqueur (`marker.description["suggested_value"]`) du `data_schema` du résultat. Une suggestion `None` compte comme absente.
- *Pourquoi avant `baseline`* : c'est la valeur que l'écran de Home Assistant pré-remplit et renvoie. Elle reflète `_infos`, que VT tient à jour d'un formulaire à l'autre dans une même étape (formulaire spécifique, Auto TPI).
- *Alternative écartée* : ne compléter `baseline` qu'à la création avec les options centrales à `False`. Cela recopierait une règle de VT dans le dashboard, ce que le principe du pilote exclut, et le problème resterait pour toute nouvelle option de VT dont la valeur par défaut du schéma diffère de la suggestion.
- *Conséquence en modification* : si la configuration centrale a été supprimée, enregistrer un onglet d'un thermostat qui avait `use_central_mode: true` l'enregistre à `false`. C'est ce que fait l'écran de Home Assistant, et c'est la seule valeur que VT accepte.

**D2. Une liste `CENTRAL_REQUIRED_OPTIONS` dans `tab-definitions.ts`, calquée sur la liste de `validate_input`.**
`native-tab.ts` désactive, affiche à `false` et accompagne de la note `config.no_central` tout champ de cette liste quand il n'y a pas de configuration centrale. Les deux rendus sont concernés (`ha-selector` et repli HTML). Le cas actuel `field.key === layout.inherit` devient un cas particulier de cette règle.
- *Alternative écartée* : demander au serveur la liste des options. Elle ne change qu'avec VT, et `tests/test_schema_drift.py` signale déjà les champs ajoutés. Un test compare la liste à celle de VT dans `external/versatile_thermostat`.

**D3. L'assistant envoie `tpi` (si l'onglet s'applique au type et aux valeurs) et `advanced` à la création d'un thermostat, vides.**
- Grâce à D1, l'onglet `tpi` reçoit `use_tpi_central_config` à la valeur suggérée : `True` avec une configuration centrale, `False` sans. Dans le second cas, le formulaire spécifique reçoit les valeurs par défaut de VT (0,6 / 0,01). Il en va de même pour `advanced`.
- La condition « s'applique » réutilise `applies()` de `TAB_DEFINITIONS`, pour que le menu du flow offre bien l'onglet (sinon `tab_unavailable`).
- *Alternative écartée* : afficher ces onglets dans l'assistant, ce qui est l'objet du changement suivant. D3 n'ajoute qu'une liste d'onglets que `creation-as-config-page` remplacera.

## Risks / Trade-offs
- [Un formulaire de VT sans valeurs suggérées] → Le pilote retombe sur `baseline`, comme aujourd'hui : pas de régression.
- [La liste D2 dérive de celle de VT] → Un test lit `validate_input` de VT (ou ses constantes) dans `external/versatile_thermostat` et compare.
- [D1 change les valeurs soumises en modification] → Les tests d'intégration de `test_config_flow_driver.py` font tourner le vrai flow. On ajoute un cas qui modifie un onglet sans toucher les options centrales et vérifie qu'elles sont inchangées.
