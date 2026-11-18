# Design

## Context
- Le menu est calculé par `resolveNavigation` (`frontend/src/navigation.ts`) à partir des contributions placées. `groupMenu` du SDK regroupe les suites consécutives d'entrées de même `group`, et l'intitulé est traduit avec le catalogue du plugin de la première entrée de la suite. Les onglets natifs d'un thermostat n'ont pas de groupe ; ceux de la configuration générale ont `group.vtherm`, clé commune à tous les catalogues natifs (`COMMON_TEXTS` de `scripts/native-texts.ts`).
- L'ordre des onglets natifs vient de `TAB_DEFINITIONS` (ordre du flow) : chaque onglet se place `after` l'onglet natif qui le précède (`previous` de `native-plugin.ts`). Le moteur de placement résout une position au chargement du plugin ; une cible pas encore chargée tombe en `target_missing` et l'entrée part en fin de menu. Les plugins natifs se chargent dans l'ordre de `NATIVE_TAB_PLUGINS`, soit celui de `TAB_DEFINITIONS`.
- Le statut `off` est calculé par `statusOf` de `navigation.ts` quand la contribution déclare `feature` et que la valeur n'est pas `true`. Les autres statuts viennent de `nativeStatus` (`complete`, `inherited`, `incomplete`). `statusView` de `side-menu.ts` dessine la coche pour `complete`.
- La page d'une fonctionnalité éteinte (`featureOf` de `panel.ts`) bascule la valeur par `draft.propose("features", …)`, donc toujours dans l'étape « Fonctions ».
- Versatile Thermostat fusionne les valeurs centrales sous celles du thermostat (`clean_central_config_doublon`) : les clés `use_*_feature` restent celles du thermostat, alors que les valeurs de verrouillage (`lock_users`, `lock_automations`) viennent de la configuration centrale quand `use_lock_central_config` est vrai.

## Goals / Non-Goals

**Goals:**
- Deux groupes partagés, identiques pour un thermostat et pour la configuration centrale, dans un ordre stable quel que soit l'ordre de chargement des plugins natifs.
- Des règles d'extinction déclarées à côté de chaque onglet natif, testables sans dessin.
- Un contrat SDK rétrocompatible : les plugins tiers existants gardent leur rendu.

**Non-Goals:**
- Changer l'ordre ou le contenu des étapes enregistrées, ou le config flow côté Python.
- Masquer des champs dans les pages Humidité ou Verrouillage éteintes : seule l'entrée du menu change.
- Grouper la liste des thermostats ou les menus des autres onglets supérieurs.

## Decisions

### 1. Groupes partagés du cœur dans le SDK
Le SDK exporte `CORE_MENU_GROUPS = { settings: "core:settings", features: "core:features" }`. Un `group` qui vaut l'un de ces identifiants est traduit par le dashboard (catalogue du shell, clés `menu.group.settings` et `menu.group.features`) au lieu du catalogue du plugin. Les onglets natifs et la page de création de la configuration centrale les utilisent ; `group.vtherm` disparaît de `COMMON_TEXTS`.
- *Pourquoi* : un plugin tiers placé entre deux onglets natifs peut rejoindre le groupe sans couper l'intitulé ni dupliquer la traduction.
- *Alternative écartée* : une clé `group.settings` dans chaque catalogue natif, comme `group.vtherm`. Un plugin tiers devrait la copier dans ses propres catalogues et les intitulés pourraient diverger.
- Le dashboard reconnaît ces identifiants avant de consulter le catalogue du plugin : une clé `core:…` d'un catalogue tiers serait ignorée pour un groupe. Les catalogues n'imposent pas de forme de clé, mais aucune clé existante n'utilise `:`, et la documentation réserve le préfixe `core:`.

### 2. Ordre du menu séparé de l'ordre du flow
Une liste `MENU_ORDER` (dans `tab-definitions.ts`) donne l'ordre des onglets du menu et leur groupe :
- Paramètres généraux : `main`, `type`, `features`, `presets`, `tpi`, `valve_regulation`, `advanced`.
- Fonctionnalités : `central_boiler`, `window`, `motion`, `power`, `presence`, `auto_start_stop`, `sync_device_internal_temp`, `lock`, `humidity`, `heating_failure_detection`.

`TAB_DEFINITIONS` et `FLOW_TABS` gardent l'ordre du flow, qu'utilisent l'enregistrement et les tests de dérive. `previous` devient : l'onglet le plus proche **avant** dans `MENU_ORDER` dont le plugin est **déjà chargé** (même plugin, ou plugin plus tôt dans `NATIVE_TAB_PLUGINS`). Comme `after` insère juste derrière sa cible, insérer derrière le plus proche prédécesseur déjà présent donne l'ordre voulu quel que soit l'ordre de chargement (ex. : `core_presets`, chargé après `core_tpi`, se place après `features`, donc avant `tpi`). Le premier onglet d'un thermostat reste après la vue d'ensemble, celui de la configuration centrale avant `core.page.plugins`.
- *Ordre des Paramètres généraux* (choix UX) : on décrit ce qu'est le thermostat (attributs, capteurs), puis ce qu'il pilote (sous-jacents), puis ce qu'il fait (fonctions, dont les choix dépendent du type et de la régulation choisis dans les sous-jacents), puis le réglage le plus utilisé (pré-réglages), puis le réglage fin de la régulation (TPI, vanne), et enfin les réglages d'expert (avancés). L'ordre relatif demandé (Fonctions, Pré-réglages, Avancés) est respecté.
- *Alternative écartée* : réordonner le chargement des plugins natifs. L'ordre de chargement sert aussi aux dépendances et aux diagnostics ; le lier au menu serait fragile.

### 3. Règles d'extinction déclarées par onglet
`TabDefinition` gagne `off?: (values, centralValues, kind) => "off" | "inherited_off" | undefined`, calculée sur les valeurs avec les défauts de Versatile Thermostat :
- `humidity` : `use_humidity_feature` n'est pas vrai → `off`.
- `lock` : si la section hérite (configuration centrale présente et `use_lock_central_config` ≠ `false`), seules les valeurs centrales comptent, comme dans Versatile Thermostat qui retire alors les valeurs propres : `lock_users` et `lock_automations` tous deux faux → `inherited_off`. Sinon, les deux faux sur les valeurs propres → `off`. Pour la configuration centrale, seules ses propres valeurs comptent.

`nativeStatus` appelle cette règle avant le calcul des valeurs manquantes. Les onglets avec `feature` restent éteints par `statusOf` (valeur propre du thermostat), ce qui donne naturellement « Central » et non « Central (off) » pour l'ouverture héritée d'une centrale sans ouverture, comme le fait Versatile Thermostat.
- *Alternative écartée* : une règle générique « la section centrale a le statut éteinte ». Elle serait fausse pour les fonctionnalités, dont l'activation reste propre au thermostat.

### 4. Statuts du SDK
`SectionStatus` gagne `{ kind: "off" }` et le drapeau `{ kind: "inherited", off: true }` ; `isSectionStatus` les accepte. `MenuStatus` les reprend. Priorité appliquée par `statusOf` : refusée, éteinte (fonctionnalité ou statut `off`), héritée éteinte, incomplète, héritée, complète. Le statut `off` renvoyé par une fonction de statut ne donne pas la page d'activation : celle-ci reste liée à `feature`.
- `statusView` : « Central (off) » en ton secondaire, annoncé « configuration centrale, éteinte » ; l'entrée est en retrait comme une entrée éteinte.
- *Alternative écartée* : un nouveau `kind: "inherited_off"` dans le SDK. Le drapeau garde `kind === "inherited"` vrai pour un plugin qui teste l'héritage.

### 5. Pas de coche dans les Paramètres généraux
`resolveNavigation` remplace un statut `complete` par aucun statut pour une entrée dont le groupe est `CORE_MENU_GROUPS.settings`. Les plugins tiers hors de ce groupe gardent leur coche.
- *Alternative écartée* : décider d'après la capacité d'extinction (présence de `feature` ou d'une règle `off`). Elle retirerait la coche des sections tierces sans fonctionnalité, ce qui changerait leur rendu.

### 6. Synchronisation de la température comme fonctionnalité
L'onglet `sync_device_internal_temp` déclare `feature: "sync_device_internal_temp"`. `isAvailable` cherche l'offre de la fonctionnalité dans les formulaires de l'onglet `features` **et** de l'onglet `type` (où se trouve cette option pour `over_climate`). Une fonction `featureStepOf(key, values)` donne l'étape qui porte la valeur (`features` ou `type`) ; `featureOf` de `panel.ts` l'utilise au lieu de `"features"` en dur pour les onglets natifs, et garde `"features"` pour les plugins tiers. Nouveau texte `feature_intro.sync_device_internal_temp` en en/fr/de.

### 7. Libellés
- `menu.group.settings` : « General settings » / « Paramètres généraux » / « Allgemeine Einstellungen ».
- `menu.group.features` : « Optional features » / « Fonctionnalités » / « Zusatzfunktionen ». En anglais et en allemand, « Features » et « Funktionen » sont déjà le titre de l'onglet « Fonctions » ; un intitulé distinct évite un groupe qui porte le nom d'un onglet d'un autre groupe.
- `status.inherited_off` : « Central (off) » / « Central (off) » / « Zentral (aus) » ; `status.spoken.inherited_off` : « uses the central configuration, off » / « configuration centrale, éteinte » / « zentrale Konfiguration, aus ».

## Risks / Trade-offs
- [Un plugin tiers qui se plaçait `after` un onglet natif déplacé (ex. `core_presets.tab.main`) change de voisin] → Les identifiants ne changent pas, seule la position relative bouge ; le CHANGELOG et `docs/plugins/native-plugins.md` donnent le nouvel ordre.
- [Un plugin tiers sans groupe inséré au milieu d'un groupe coupe l'intitulé en deux] → Documenter `CORE_MENU_GROUPS` dans `docs/plugins/hooks-and-placement.md` avec un exemple.
- [Les défauts de `lock_users`/`lock_automations` changent dans Versatile Thermostat] → La règle lit les défauts depuis `shared/vtherm-config-schemas.json`, que `tests/test_schema_drift.py` vérifie.
- [« Central (off) » ne concerne aujourd'hui que le verrouillage] → C'est voulu : c'est la seule section dont l'extinction vient de valeurs héritées ; une future section du même genre déclarera sa règle.

## Migration Plan
Changement du frontend et du SDK seuls, sans migration de données. Le SDK prend une version mineure (ajouts rétrocompatibles). Retour arrière : revenir au commit précédent ; aucune donnée enregistrée ne dépend des groupes.
