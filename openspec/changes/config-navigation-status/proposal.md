# Proposal

## Why
Le menu de gauche d'un thermostat liste ses sections sans dire où elles en sont : on ne voit pas qu'une section manque d'une valeur obligatoire, qu'elle a été refusée à l'enregistrement, qu'elle reprend la configuration centrale ou que sa fonctionnalité est éteinte. Et une section de fonctionnalité désactivée disparaît du menu : pour découvrir que la détection d'ouverture existe, il faut passer par l'onglet « fonctionnalités ». Le projet amont `Liquidmasl/vtherm_dashboard` affiche pour chaque section une coche verte, « Off », « Central », « N vide(s) » ou « Erreur », et garde les fonctionnalités éteintes dans l'index, avec leur interrupteur dans la section même. Sa liste de thermostats montre aussi l'état en direct de chacun (température, consigne, action, preset), là où la nôtre n'affiche que le nom et le type.

## What Changes
- Chaque entrée de configuration du menu (thermostat et configuration générale) porte un **statut** : complète (coche verte), éteinte (« Off »), héritée (« Central »), incomplète (« N manquant(s) ») ou refusée (« Erreur »). Le statut est visible aussi dans le tiroir sur mobile.
- Les sections des **fonctionnalités désactivées restent dans le menu**, en retrait et marquées « Off ». Ouvertes, elles montrent l'explication de la fonctionnalité et un **interrupteur d'activation** dans l'en-tête ; l'activer revient à cocher la fonctionnalité dans l'onglet « fonctionnalités », dans le même brouillon.
- Après un enregistrement refusé, la barre d'enregistrement propose d'**aller à la première section en erreur**, et les sections en erreur sont marquées dans le menu.
- Le SDK permet à une contribution de configuration de déclarer son statut et la fonctionnalité qu'elle représente, pour que les sections des plugins tiers aient les mêmes repères.
- La liste des thermostats devient une grille de **tuiles avec l'état en direct** : icône du type, température de la pièce → consigne, action en cours (chauffe, repos, arrêt), preset, et une tuile « Nouveau thermostat ». Le serveur fournit pour cela l'entité climate de chaque thermostat.

## Capabilities

### New Capabilities
- `config-section-status`: calcul et affichage du statut de chaque section de configuration, sections de fonctionnalités éteintes et accès à la première erreur.

### Modified Capabilities
- `core-native-plugins`: une fonctionnalité désactivée n'efface plus son onglet du menu ; l'onglet reste listé, éteint, avec son interrupteur d'activation.
- `ui-plugin-sdk`: les contributions `thermostat_config` et `general_config` acceptent un statut et une fonctionnalité facultatifs.
- `dashboard-panel`: le menu de gauche affiche les statuts ; la liste des thermostats montre leur état en direct sous forme de tuiles.

## Impact
- Frontend : `frontend/src/components/side-menu.ts`, `frontend/src/navigation.ts`, `frontend/src/components/thermostat-list.ts`, `frontend/src/native/native-plugin.ts` et `native-tab.ts` (interrupteur d'activation, calcul des champs obligatoires manquants), barre d'enregistrement de `frontend/src/panel.ts`, `frontend/src/config/draft.ts` (erreurs par onglet).
- SDK : `packages/sdk/src/types.ts` (statut, fonctionnalité), validation, harnais de test, référence générée.
- Python : `custom_components/vtherm_dashboard/vtherm_config.py` et `websocket_api.py` (identifiant de l'entité climate dans `get_thermostats`), tests `pytest`.
- Textes en en/fr/de (statuts, interrupteur, tuiles), documentation `docs/plugins/hooks-and-placement.md`, `docs/plugins/native-plugins.md`, `CHANGELOG.md`.
