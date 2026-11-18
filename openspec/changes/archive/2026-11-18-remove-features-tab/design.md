# Design

## Context
- `TAB_DEFINITIONS` (`frontend/src/native/tab-definitions.ts`) décrit les étapes du config flow : il sert à l'enregistrement (une étape par onglet), à `isAvailable` (une fonctionnalité existe pour un type quand le formulaire de l'étape « features » la propose) et à `featureStepOf` (l'étape qui porte la valeur d'une fonctionnalité). `MENU_ORDER` décide de l'ordre et du groupe des onglets du menu ; `nativeTabContributions` (`native-plugin.ts`) crée une contribution et un élément pour chaque définition qui a une mise en page `thermostat` ou `central`.
- L'interrupteur d'une fonctionnalité est dessiné par le dashboard (`featureOf` de `panel.ts`, `renderFeature` de `contribution-host.ts`) pour toute contribution qui déclare `feature` : seul avec l'explication quand la fonctionnalité est éteinte, au-dessus de la section quand elle est active. Il propose la valeur dans l'étape `featureStepOf` du brouillon (« features », ou « type » pour la synchronisation).
- Le serveur (`config_flow_driver.py`) enregistre les changements par étape du menu du flow ; il ne dépend pas des onglets du dashboard.
- Un refus d'enregistrement est rattaché à une étape (`draft.refusedTabs()`), et `isRefused` de `panel.ts` marque l'entrée du menu dont l'onglet est cette étape.

## Goals / Non-Goals

**Goals:**
- Retirer l'onglet du menu des thermostats et de la configuration centrale, et ses contributions.
- Garder l'enregistrement des fonctionnalités dans l'étape « features », sans changement côté serveur ni Versatile Thermostat.
- Ne perdre aucune information d'erreur : un refus de l'étape « features » reste visible.

**Non-Goals:**
- Changer les interrupteurs des fonctionnalités, leur texte ou leur place.
- Retirer de l'étape « features » une valeur du flow : la création d'un thermostat et le pilote du flow restent identiques.

## Decisions

### 1. L'étape reste, l'onglet part
`TAB_DEFINITIONS` garde l'entrée `features` : `FLOW_TABS`, `isAvailable`, `featureStepOf`, les tests de dérive des schémas et l'ordre du pilote du flow en dépendent. Seuls `MENU_ORDER` et la création des contributions changent : `nativeTabContributions` ne crée de contribution, ni d'élément `vtherm-native-features-*`, que pour une définition présente dans `MENU_ORDER`. Une étape absente du menu reste ainsi une étape du flow sans onglet.
- *Alternative écartée* : retirer `features` de `TAB_DEFINITIONS`. Il faudrait réécrire `isAvailable` et `featureStepOf` sur les schémas directement, et l'étape ne serait plus connue du dashboard pour l'enregistrement.
- *Alternative écartée* : garder les contributions en ancre cachée (`visible` toujours faux) pour les plugins qui s'y placent. Choix de l'utilisateur : les supprimer ; le changement cassant est noté dans le CHANGELOG.

### 2. Un refus de l'étape « features » va à l'onglet de la fonctionnalité
`isRefused(entry)` devient vrai aussi quand le dernier enregistrement a refusé, dans l'étape « features », le champ déclaré comme `feature` par la contribution. Le brouillon expose pour cela les champs refusés d'une étape (à côté de `refusedTabs()`), et la même règle choisit la cible de « Aller à … ». Le champ refusé est nommé par son libellé `field.use_*_feature`, qui reste dans le catalogue de `core`.
- *Alternative écartée* : afficher le refus seulement au-dessus des actions, sans entrée de menu. Le statut « Erreur » et le lien « Aller à » disparaîtraient pour ce cas.

### 2b. Les actions d'enregistrement d'une section éteinte
Les onglets natifs dessinent leurs actions « Enregistrer » et « Annuler » au pied de leur propre carte (`save_actions: "component"`). Quand leur fonctionnalité est éteinte, le composant n'est pas affiché (`contribution-host.ts`), donc ses actions non plus : éteindre une fonctionnalité depuis son onglet laissait une page sans moyen d'enregistrer (constaté dans le HA de développement à l'application). Avec l'onglet « Fonctions », on éteignait plutôt depuis une page qui avait ses actions. Tant que la fonctionnalité est éteinte, `featureOf` de `panel.ts` passe les actions (`renderCardActions`) à `FeatureControl.actions`, et `renderFeature` de `contribution-host.ts` les place au pied de la carte de l'interrupteur, comme une section native place les siennes au pied de sa carte ; `renderActionsCard` ne dessine alors pas de carte séparée, quel que soit `save_actions`. Ajout validé par l'utilisateur pendant l'application ; une première version les mettait dans une carte séparée, sous celle de l'interrupteur, et l'utilisateur a demandé une seule carte.

### 3. Les catalogues et l'ancienne adresse
Les clés `title.features` et `description.features` restent générées depuis Versatile Thermostat, sans lecteur : les retirer demanderait une exception au générateur pour une clé sans effet. L'adresse `…/core.tab.features` ne désigne plus rien : `resolveNavigation` ouvre déjà la page par défaut avec l'avis `route_unknown`.

### 4. Ordre des Paramètres généraux
Principal, sous-jacents, presets, TPI, régulation par vanne, sécurité et dérogation, pour un thermostat ; principal, presets, TPI, sécurité et dérogation, pour la configuration centrale. Les positions restent déclaratives : `previous` saute naturellement un onglet absent de `MENU_ORDER` (les presets se placent après les sous-jacents pour un thermostat, après le principal pour la configuration centrale).

## Risks / Trade-offs
- [Un plugin tiers se place par rapport à `core.tab.features` ou `core.general.features`] → `target_missing` et entrée en fin de menu ; le CHANGELOG (« For plugin authors ») et `docs/plugins/native-plugins.md` disent de viser `core.tab.type` ou `core.tab.main` à la place.
- [Un utilisateur cherche la liste des fonctionnalités à cocher] → Le groupe « Fonctionnalités » du menu les liste toutes, avec leur état ; la documentation utilisateur le dit.
- [Un refus de l'étape « features » qui ne correspond à aucune fonctionnalité du type] → Le message d'erreur reste au-dessus des actions de la section enregistrée, comme pour toute erreur sans section ; cas non observé avec les règles actuelles de Versatile Thermostat.
