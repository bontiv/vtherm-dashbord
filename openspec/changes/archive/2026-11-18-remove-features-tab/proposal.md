# Proposal

## Why
L'onglet « Fonctions » (`core.tab.features`, `core.general.features`) ne fait que cocher l'activation des fonctionnalités, alors que chaque onglet de fonctionnalité porte déjà un interrupteur qui modifie la même valeur : seul, avec une explication, quand la fonctionnalité est éteinte ; au-dessus de la section quand elle est active (`renderFeature` de `contribution-host.ts`). Depuis `config-menu-groups`, le groupe « Fonctionnalités » du menu montre aussi, d'un coup d'œil, l'état de chaque fonctionnalité (`Off`, coche, `Central`). L'onglet « Fonctions » est donc une deuxième porte vers les mêmes réglages.

Vérification faite sur les formulaires de Versatile Thermostat décrits dans `shared/vtherm-config-schemas.json`, pour chaque type de configuration :

| Configuration | Cases de l'onglet « Fonctions » | Onglet de fonctionnalité correspondant |
|---|---|---|
| `over_switch`, `over_valve` | ouverture, mouvement, puissance, présence, panne de chauffage | tous présents dans le menu |
| `over_climate` sans régulation par vanne | ouverture, mouvement, puissance, présence, démarrage et arrêt automatiques | tous présents dans le menu |
| `over_climate` avec régulation par vanne | ouverture, mouvement, puissance, présence, panne de chauffage | tous présents dans le menu |
| configuration centrale | ouverture, mouvement, puissance, présence, chaudière centrale, panne de chauffage | tous présents dans le menu |

Chaque case a exactement un onglet qui déclare la même clé (`feature`), et cet onglet est dans le menu dès que la case est proposée (`isAvailable`). L'onglet « Fonctions » n'a aucun autre champ.

## What Changes
- **BREAKING** (contrat des plugins) : les contributions `core.tab.features` et `core.general.features` sont supprimées. Un plugin tiers qui se place `after:` ou `before:` l'une d'elles reçoit l'avertissement `target_missing` et son entrée part en fin de menu.
- Le menu d'un thermostat et celui de la Configuration n'ont plus d'onglet « Fonctions » ; les Paramètres généraux deviennent : principal, sous-jacents, presets, TPI, régulation par vanne, sécurité et dérogation.
- On active ou désactive une fonctionnalité uniquement depuis son onglet. La valeur reste enregistrée dans l'étape « features » du config flow de Versatile Thermostat, comme aujourd'hui : rien ne change pour Versatile Thermostat ni pour le serveur.
- Une valeur de l'étape « features » refusée à l'enregistrement est attribuée à l'onglet de la fonctionnalité concernée (statut « Erreur », « Aller à … »), puisqu'il n'y a plus d'onglet « Fonctions » pour la porter.
- Une adresse enregistrée vers l'ancien onglet ouvre la page par défaut du thermostat, avec l'avis d'adresse inconnue qui existe déjà.

## Capabilities

### New Capabilities
<!-- Aucune. -->

### Modified Capabilities
- `core-native-plugins`: le plugin `core` ne fournit plus l'onglet « fonctionnalités » ; l'activation passe par les onglets des fonctionnalités ; nouvel ordre des Paramètres généraux.
- `config-section-status`: l'interrupteur d'une fonctionnalité ne renvoie plus à l'onglet « Fonctions » ; un refus de l'étape « features » est attribué à l'onglet de la fonctionnalité.

## Impact
- Frontend : `frontend/src/native/tab-definitions.ts` (`MENU_ORDER` sans `features` ; la définition de l'onglet reste pour l'enregistrement, `isAvailable` et `featureStepOf`), `frontend/src/native/native-plugin.ts` (pas de contribution ni d'élément pour un onglet hors du menu), `frontend/src/panel.ts` (refus de l'étape « features »).
- Catalogues : les clés `title.features` et `description.features` du plugin `core` deviennent inutiles si rien d'autre ne les lit ; régénération par `npm run catalogs:generate`.
- Tests : `frontend/test/native-plugins.test.ts`, `frontend/test/panel-config.test.ts`, `frontend/test/navigation.test.ts` et les tests qui ouvrent `core.tab.features`.
- Documentation : `docs/plugins/native-plugins.md` (identifiants et table générée, ordre des menus, onglets des fonctionnalités), `docs/plugins/hooks-and-placement.md`, `docs/user/configuration.md`, `docs/user/dashboard.md`, `CHANGELOG.md` (section « For plugin authors », changement cassant).
- Python, SDK et config flow : aucun changement.
