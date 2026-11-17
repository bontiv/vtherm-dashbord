# Tasks

## 1. Valeurs soumises par le pilote du config flow

- [x] 1.1 Dans `custom_components/vtherm_dashboard/config_flow_driver.py`, faire lire à `_submit` la valeur suggérée du marqueur (`description["suggested_value"]`) quand le brouillon ne change pas le champ, avant `baseline` (design D1). Appliquer Black (180 colonnes) et pylint, puis vérifier que `pytest tests/test_config_flow_driver.py` passe.
- [x] 1.2 Ajouter dans `tests/test_config_flow_driver.py` un test de création d'un `thermostat_over_switch` sans configuration centrale, avec les onglets `main` (nom, capteur, capteur extérieur, `use_main_central_config: false`), `type`, `tpi` et `advanced` vides. Vérifier que la création réussit, que `use_central_mode` et les `use_*_central_config` valent `False` et que `tpi_coef_int` vaut 0,6.
- [x] 1.3 Ajouter un test de modification d'un thermostat qui utilise la configuration centrale : changer seulement son nom et vérifier que `use_central_mode` et `cycle_min` sont inchangés.
- [x] 1.4 Mettre à jour `docs/contributing/config-flow-driver.md` (section Principle, point 2 : ordre brouillon, valeur suggérée, valeur enregistrée, défaut). Vérifier que `npm test -- docs` passe si la page est couverte.

## 2. Options qui exigent une configuration centrale

- [x] 2.1 Ajouter `CENTRAL_REQUIRED_OPTIONS` dans `frontend/src/native/tab-definitions.ts` (design D2). Ajouter un test Python (`tests/test_central_options.py`) qui compare cette liste aux options vérifiées par `validate_input` dans `external/versatile_thermostat`, en lisant le fichier TypeScript ou une copie partagée, et vérifier qu'il passe.
- [x] 2.2 Dans `frontend/src/native/native-tab.ts`, désactiver, afficher à `false` et annoter avec `config.no_central` tout champ de `CENTRAL_REQUIRED_OPTIONS` sans configuration centrale, dans `renderSelector` et `renderFallbackField`. Vérifier avec un test de `frontend/test/native-tabs.test.ts` que `use_central_mode` et `used_by_controls_central_boiler` sont désactivés et décochés sans configuration centrale et modifiables avec.
- [x] 2.3 Vérifier dans `frontend/test/native-ha-controls.test.ts` que le rendu `ha-selector` de l'onglet principal passe `disabled` et la valeur `false` pour ces options sans configuration centrale.

## 3. Création d'un thermostat sans configuration centrale

- [x] 3.1 Dans `frontend/src/components/create-wizard.ts`, envoyer à la création d'un thermostat l'onglet `advanced` et l'onglet `tpi` quand `applies()` de sa définition est vrai pour les valeurs du brouillon (design D3). Vérifier avec un test du frontend que `api.create` reçoit `tpi` et `advanced` pour `over_switch`, et pas `tpi` pour `over_climate` sans régulation par vanne.
- [x] 3.2 Mettre à jour `docs/user/configuration.md` (section « Create a thermostat » : sans configuration centrale, le thermostat reçoit les paramètres TPI et avancés par défaut de VT, modifiables ensuite) et ajouter une entrée « Fixed » dans `CHANGELOG.md`. Vérifier que `npm test -- docs` passe.

## 4. Vérification d'ensemble

- [x] 4.1 Dans l'environnement de développement sans configuration centrale (`.devcontainer`), créer un thermostat `over_switch` depuis le dashboard et vérifier qu'il est créé sans l'erreur « configuration centrale requise ». Puis créer une configuration centrale, créer un second thermostat et vérifier qu'il l'utilise par défaut.
