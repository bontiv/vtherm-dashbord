# Proposal

## Why
Sans configuration centrale, il est impossible de créer un thermostat depuis le dashboard. L'enregistrement est refusé avec « Vous ne pouvez pas cocher 'Utiliser la configuration centrale'… », alors que la case d'héritage est bien grisée. La cause : le pilote du config flow remplit les champs que le brouillon ne change pas avec les valeurs par défaut du schéma de Versatile Thermostat (`use_central_mode` vaut `True`). L'écran de Home Assistant, lui, les remplit avec les valeurs que VT propose, et VT met à `False` toutes les options centrales quand il n'y a pas de configuration centrale. Le dashboard affiche d'ailleurs « Autoriser le contrôle par une entité centrale » cochée et modifiable. Enfin, même sans cette erreur, la création échoue (`configuration_not_complete`) : sans configuration centrale, VT exige les coefficients TPI et les paramètres de sécurité de l'onglet avancé, que l'assistant n'envoie pas.

## What Changes
- **Valeurs non modifiées** : quand le dashboard soumet un formulaire du config flow, un champ que le brouillon ne change pas reçoit la valeur que le formulaire de VT propose (comme l'écran de Home Assistant). À défaut, il reçoit la valeur enregistrée, puis la valeur par défaut du formulaire. Cela vaut pour la création comme pour la modification.
- **Options qui exigent une configuration centrale** : sans configuration centrale, toutes les options que VT refuse dans ce cas sont désactivées, affichées décochées et accompagnées de l'explication. Sont concernées les options d'héritage `use_*_central_config`, mais aussi `use_central_mode` (contrôle par l'entité centrale) et `used_by_controls_central_boiler` (chaudière centrale).
- **Création complète sans configuration centrale** : l'assistant de création d'un thermostat envoie aussi l'onglet avancé, ainsi que l'onglet TPI quand le type l'utilise, avec les valeurs proposées par VT. C'est déjà ce qu'il fait pour la configuration centrale. Ces onglets restent invisibles dans l'assistant ; le changement `creation-as-config-page` les affichera.

## Capabilities

### New Capabilities
<!-- aucune -->

### Modified Capabilities
- `core-config-management`:
  - sans configuration centrale, l'exigence d'héritage couvre toutes les options qui en dépendent, et pas seulement l'option d'héritage de chaque section ;
  - les champs non modifiés sont soumis avec les valeurs proposées par VT ;
  - la création d'un thermostat aboutit sans configuration centrale.

## Impact
- Python : `custom_components/vtherm_dashboard/config_flow_driver.py` (`_submit` lit la valeur suggérée du marqueur du schéma), tests `tests/test_config_flow_driver.py` (création sans configuration centrale, modification qui ne touche pas `use_central_mode`).
- Frontend : `frontend/src/native/native-tab.ts` (désactivation des options centrales), une liste des options centrales dans `frontend/src/native/tab-definitions.ts`, `frontend/src/components/create-wizard.ts` (onglets envoyés à la création), tests `native-tabs.test.ts` et `ha-screens.test.ts`.
- Documentation : `docs/contributing/config-flow-driver.md` (valeurs soumises), `docs/user/configuration.md` (création sans configuration centrale), `CHANGELOG.md` (section Fixed).
- Pas de changement du SDK ni de l'API WebSocket.
