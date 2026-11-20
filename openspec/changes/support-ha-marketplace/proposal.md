# Proposal

## Why
Depuis Home Assistant 2026.11, HACS est intégré au cœur sous le nom de **Marketplace** (Paramètres > Marketplace) : l'intégration personnalisée HACS est retirée à la migration et ne peut plus être installée, et les commandes WebSocket `hacs/*` sont rejetées comme inconnues. L'adaptateur du dashboard (`frontend/src/complements/hacs-client.ts`) ne parle qu'à HACS : sur 2026.11, `hacs/info` échoue, la page conclut que HACS est absent, affiche « HACS is required… » avec un lien vers l'installation de HACS (devenue impossible) et désactive toute installation. Les pages des compléments sont donc inutilisables sur la version courante de Home Assistant (issue #1). La même issue relève que le bandeau d'avertissement de ces pages a une bordure doublée et décalée.

## What Changes
- **Marketplace prise en charge** : sur Home Assistant 2026.11 et après, le dashboard détecte la Marketplace et installe, liste et suit les compléments par ses commandes `marketplace/*` (`marketplace/info`, `marketplace/repositories/list`, `marketplace/repositories/add`, `marketplace/repository/install`), comme il le fait avec HACS. Les commandes et leurs réponses ont été relevées dans les sources de `homeassistant/components/marketplace` de Home Assistant 2026.11.0.
- **HACS conservé** : sur Home Assistant 2026.10 et avant, le dashboard continue d'utiliser HACS sans changement de comportement. La détection essaie la Marketplace, puis HACS.
- **Nouveaux prérequis de la Marketplace** : la Marketplace refuse d'installer tant que l'administrateur n'a pas accepté son avertissement, et refuse d'ajouter un dépôt personnalisé tant que GitHub n'est pas connecté. Le dashboard lit ces deux conditions dans `marketplace/info`, explique ce qu'il faut faire avec un lien vers la Marketplace, et désactive seulement les actions concernées. Le cas « Marketplace présente mais pas chargée » (`not_loaded`) est aussi expliqué.
- **Textes et liens selon la boutique** : les messages, les boutons (« Ouvrir dans la Marketplace » / « Ouvrir dans HACS ») et les liens (`/marketplace/repository/<id>` ou `/hacs/repository/<id>`) nomment la boutique réellement utilisée. Sans aucune des deux, le message nomme la Marketplace et renvoie vers sa documentation, et plus vers l'installation de HACS.
- **Installation sans redémarrage** : avec la Marketplace, une intégration neuve qui déclare un config flow est chargée sans redémarrage. Le dashboard s'appuie sur le statut de la Marketplace (`pending-restart` ou non) et, sans redémarrage, passe directement à l'état « à configurer ».
- **Erreurs explicites** : la Marketplace renvoie une erreur quand un ajout échoue, au lieu d'une réponse vide. Le dashboard affiche son message ; la vérification de la liste après l'ajout reste en place.
- **Bandeau** : la bordure, la marge intérieure et le rayon du bandeau ne s'appliquent plus qu'au bloc de repli ; `ha-alert` garde son propre cadre, avec seulement la marge du bas, comme le font déjà les messages du panneau principal.
- **Contrat vérifié** : comme pour HACS, les réponses de la vraie Marketplace sont enregistrées par un test Python et rejouées par le test de l'adaptateur.

## Capabilities

### New Capabilities
(aucune)

### Modified Capabilities
- `complements-catalog` : le dashboard s'appuie sur une « boutique » qui est la Marketplace de Home Assistant ou HACS ; les prérequis, les états d'installation, l'installation d'une intégration et d'une interface, le repli quand l'interface change, les mises à jour, l'action « Ouvrir dans… » et les liens nomment la boutique utilisée ; nouveaux prérequis de la Marketplace (avertissement accepté, GitHub connecté) ; rendu du bandeau d'avertissement.

## Impact
- **Frontend** : `frontend/src/complements/hacs-client.ts` (adaptateur unique, généralisé à deux boutiques), `model.ts`, `states.ts`, `types.ts`, `complements-page.ts` (bandeau, liens, textes), `catalogs.ts` (textes en, fr, de), `frontend/src/components/events.ts` si l'ouverture de la boutique change.
- **Tests** : `frontend/test/hacs-contract.test.ts`, `frontend/test/support/fake-hacs.ts`, les tests des pages des compléments ; nouveau test Python de contrat contre `homeassistant.components.marketplace` et nouveau fichier de réponses enregistrées dans `shared/`. Le test de contrat HACS existant reste.
- **Backend** : `custom_components/vtherm_dashboard/complements.py` ne change pas de comportement. Le champ `hacs_category` du catalogue et de `vtherm_dashboard/get_complements` garde son nom : les catégories de la Marketplace sont les mêmes que celles de HACS. Seuls les commentaires sont mis à jour.
- **Documentation** : `docs/user/complements.md`, `docs/contributing/complements.md`, `docs/reference/websocket-api.md` (description de `hacs_category`), `CHANGELOG.md`.
- **Compatibilité** : aucune rupture. Home Assistant 2026.10 et avant gardent HACS. Aucune nouvelle dépendance.
