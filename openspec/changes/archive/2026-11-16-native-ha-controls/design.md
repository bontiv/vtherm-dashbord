# Design

## Context
Inventaire du frontend actuel (observé dans le code) :

| Fichier | Contrôle actuel | Champ ou usage | Composant Home Assistant |
|---|---|---|---|
| `frontend/src/native/native-tab.ts` `renderField` | `textarea` (`multiple`) | `underlying_entity_ids`, `vswitch_on_command`, `vswitch_off_command`, `opening_degree_entity_ids`, `closing_degree_entity_ids`, `sync_entity_ids` | `ha-selector` `entity` (`multiple`) ; commandes : voir D3 |
| idem | `input type=text` + `datalist` | champs `entity` simples : `temperature_sensor_entity_id`, `external_temperature_sensor_entity_id`, `humidity_sensor_entity_id`, `last_seen_temperature_sensor_entity_id`, capteurs de puissance, de présence, de mouvement, de fenêtre | `ha-selector` `entity` avec `filter` |
| idem | `input type=text` | `string`/`text` : `name`, `lock_code`, `central_boiler_activation_service`, `central_boiler_deactivation_service`, `min_opening_degrees`, `max_opening_degrees` | `ha-selector` `text` (`ha-textfield`) ; services de chaudière : voir D3 |
| idem | `input type=text` | `template` : `failure_detection_enable_template` | `ha-selector` `template` (éditeur de code), repli `ha-selector` `text` multiligne |
| idem | `input type=number` | `number`, `integer` (`cycle_min`, `temp_min`, `temp_max`, `step_temperature`, TPI, etc.) | `ha-selector` `number` (`mode: box`, unité) |
| idem | `select` | `kind: select` (`window_action`, `proportional_function`, `thermostat_type`...) | `ha-selector` `select` (`mode: dropdown`) |
| idem | `input type=checkbox` | `kind: boolean` | `ha-selector` `boolean` (`ha-switch`) |
| idem `renderPresets` | `input type=number` | températures de preset | `ha-selector` `number` |
| idem `renderField` (suggestion) | `button` | « utiliser la suggestion » d'humidité | `ha-button` |
| `frontend/src/components/create-wizard.ts` | `input type=radio`, `button` | type de thermostat, créer, annuler | `ha-selector` `select` (liste) ou `ha-formfield` + `ha-radio` ; `ha-button` |
| `frontend/src/complements/complements-page.ts` | `select`, `input type=search` | filtres et recherche | `ha-select` / `ha-selector` `select` ; `ha-textfield` |
| `frontend/src/dev/dev-plugins-page.ts` | `input type=checkbox`, `button` | activer, retirer, recharger | `ha-switch`, `ha-button` |
| `frontend/src/native/native-tab.ts` (`.card`, `.error`, `.base-error`, `.note`, `dl`) | `div.card`, `div role=alert`, `p.note`, `dl` | carte de l'onglet, erreur de champ, erreur `base`, valeurs centrales en lecture seule | `ha-card` ; `ha-alert` (`error`, `info`) ; lecture seule : valeur dans un contrôle `disabled` ou liste, entité cliquable (D13) |
| `frontend/src/native/native-tab.ts` (`renderPresets`, `config.loading`) | `p role=status` | « chargement » des presets | `ha-spinner` / `ha-circular-progress` |
| `frontend/src/native/core-pages.ts` | `button` | « créer la configuration centrale » | `ha-button` |
| `frontend/src/panel.ts` (`render`, barre d'enregistrement) | `button` ×5 (`discard`, `save`, menu), `span.error role=alert`, `window.confirm(t("draft.leave"))`, texte `shell.loading` | barre d'enregistrement, quitter avec un brouillon, chargement du panneau | `ha-button` ; `ha-alert` ; `ha-dialog` de confirmation (repli : `window.confirm`) ; `ha-spinner` |
| `frontend/src/complements/complements-page.ts` | `div.banner` + `role=status|alert` (4), `div.overlay > div.dialog` (installation, redémarrage), `ul.cards > li.card`, `button` ×11, `select`, `input type=search`, `a` ×7, `dl` ×2, texte `loading` / `refreshing`, progression `step.*` | bandeaux, confirmations, cartes, filtres, actions | `ha-alert` ; `ha-dialog` ; `ha-card` ; `ha-button` ; `ha-select` ; `ha-textfield` ; `ha-button href` ; `ha-spinner` / `ha-circular-progress` (progression d'installation, barre ou indicateur indéterminé) |
| `frontend/src/components/plugin-status.ts` | `table`, `ul`, `p role=status` | état des plugins | `ha-data-table`, sinon `ha-card` + liste (D10) ; `ha-alert` |
| `frontend/src/dev/dev-plugins-page.ts` | `table`, `input` ×7 (cases à cocher, champs), `label` ×7, `button` ×3, `div.notice role=status` | plugins de développement | `ha-data-table` / `ha-card` + liste ; `ha-switch` + `ha-formfield` ; `ha-textfield` ; `ha-button` ; `ha-alert` (`info`) |
| `frontend/src/components/side-menu.ts` | `nav > ul > li > a`, `select` (sélecteur de thermostat), `h2` | menu de gauche | `ha-list` / `ha-md-list-item` avec `href` ; `ha-select` |
| `frontend/src/components/thermostat-list.ts` | `ul > li > a` ×2, lien « Créer » `a.create`, `div.empty role=status` | liste des thermostats, création | `ha-list` / `ha-md-list-item` avec `href` ; `ha-button href` ; `ha-alert` (`info`) pour le vide |
| `frontend/src/components/breadcrumb.ts` | `nav > ol/li > a` | fil d'Ariane | pas d'équivalent dans Home Assistant : exception commentée (D11) |
| `frontend/src/components/contribution-host.ts` | `div.error role=alert` | échec d'un plugin | `ha-alert` (`error`) |
| `frontend/src/components/top-bar.ts` | `ha-menu-button` si présent, sinon `button` ; `nav role=tablist > a role=tab` | menu, onglets | menu déjà natif, garder le repli ; onglets : pas d'équivalent public, exception commentée (D11) |
| `frontend/src/components/icon.ts` | `ha-icon` | icônes | déjà natif |
| `packages/sdk/src/types.ts`, `testing.ts` | aucun contrat de champs ; les plugins tiers écrivent leurs éléments | | contrat à créer (voir D4) |

Cet inventaire vient d'un comptage de balises dans `frontend/src` (hors catalogues et traductions) : `button`, `select`, `textarea`, `input`, `table`, `dialog`, `ul`/`li`, `a`, `nav`, `dl`, `label`, `role=alert|status`. Les fichiers sans balise de ce genre (`frontend/src/config/*`, `registry.ts`, `router.ts`, `i18n.ts`, `loader.ts`, `state.ts`, `plugin-list.ts` à confirmer) ne sont pas listés. La tâche 3.3 refait ce comptage à l'implémentation et complète le tableau.

Résultat de l'inventaire (tâche 3.3) : le comptage final (`button`, `input`, `select`, `textarea`, `table`, `dialog`, `role="alert|status"`, `window.confirm` dans `frontend/src`) trouve 39 occurrences, toutes dans une branche de repli ou une exception, chacune précédée d'un commentaire. Compléments au tableau :

| Fichier | Contrôle restant | Statut |
|---|---|---|
| `frontend/src/panel.ts` | page vide, chargement, lecture seule, échec des plugins, bandeau de développement, avis de route inconnue | migrés vers `renderAlert` (`ha-alert`) et `renderProgress` (`ha-spinner`), classes conservées (`message`, `readonly`, `devbanner`, `notice`) |
| idem | bouton du menu (écran étroit) | `ha-icon-button`, repli `button.menu-button` commenté |
| idem | voile du tiroir (`button.scrim`) | exception commentée : pas de voile public dans Home Assistant |
| idem | quitter avec un brouillon | `ha-dialog`, repli `window.confirm` commenté |
| `frontend/src/components/top-bar.ts` | bouton du menu de Home Assistant | `ha-menu-button`, repli commenté |
| `frontend/src/native/native-tab.ts` | `textarea`, `input` + `datalist`, `select`, case à cocher | repli de `renderFallbackField`, commenté |
| `frontend/src/dev/dev-plugins-page.ts` | tableau, cases à cocher, formulaire | repli de `renderWithHa`, commenté |
| `frontend/src/components/plugin-status.ts` | tableau | repli ; avec Home Assistant, une `ha-card` par plugin (choix noté en 3.5) |

Composants Home Assistant (source : [documentation des contributeurs de Home Assistant](https://contributors.home-assistant.io/design/components/selector/) et code du frontend ; le dépôt du frontend de Home Assistant n'est pas cloné dans `external/`, à vérifier sur la version minimale prise en charge) :
- `ha-selector` prend `hass`, `selector` (objet à une clé : `entity`, `device`, `number`, `boolean`, `select`, `text`, `duration`, `time`, `template`, `action`...), `value`, `label`, `helper`, `required`, `disabled`, et émet `value-changed` (`detail.value`).
- Le sélecteur `entity` accepte `multiple`, `include_entities`, `exclude_entities` et `filter` : un objet ou une liste d'objets (`domain`, `device_class`, `integration`, `supported_features`), la liste étant un OU. Avec `multiple`, il affiche `ha-entities-picker`.
- `ha-entity-picker` (utilisé en dessous) prend `includeDomains`, `excludeDomains`, `includeDeviceClasses`, `entityFilter`, `allowCustomEntity`.
- `ha-form` prend `schema` (liste de champs avec `selector`), `data`, `computeLabel`, `computeHelper`, `computeError`, `error`, et émet `value-changed`. Il peut remplacer le rendu champ par champ.
- `ha-switch`, `ha-textfield`, `ha-select`, `ha-button`, `ha-icon`, `ha-icon-button`, `ha-card`, `ha-formfield` sont des composants de base.
- Chargement : `ha-selector` et les pickers sont chargés paresseusement par les pages de Home Assistant. Un panneau personnalisé ne les trouve donc pas toujours avec `customElements.get`. La technique répandue (utilisée par des cartes populaires) : attendre `customElements.whenDefined("partial-panel-resolver")`, créer un `partial-panel-resolver`, appeler `getRoutes([{ component_name: "config", url_path: "a" }])`, puis `routes.routes.a.load()`, attendre `ha-panel-config`, puis charger une sous-route de configuration (par exemple `automation`) pour que `ha-selector`, `ha-entity-picker`, `ha-form` et les sélecteurs soient définis. Ce n'est pas une API publique : elle doit être isolée dans un seul module et testée avec repli.

Contraintes : TypeScript strict, pas de nouvelle dépendance, les valeurs enregistrées gardent leur format (`ConfigValues`), le serveur reste seul juge de la validité (codes d'erreur traduits).

### Résultat de la vérification (tâche 1.0)
Vérifié le 2026-11-16 sur Home Assistant 2026.10.4 (frontend `20260930.5`), dans le code compilé du frontend installé (`hass_frontend/frontend_latest`) et dans l'instance de développement, en ouvrant le dashboard directement après un rechargement :

| Composant | Présent | Remarque |
|---|---|---|
| `ha-selector` et `ha-selector-entity`, `-number`, `-select`, `-text`, `-boolean`, `-template`, `-duration`, `-time`, `-action` | oui | `ha-selector` est défini par l'interface après son chargement (moins de 4 s) ; il charge lui-même le sous-sélecteur au premier rendu d'un type |
| `ha-entities-picker` (sélecteur `entity` en liste) | oui | réordonnable : le sélecteur transmet `reorder` (`selector.entity.reorder`), avec une poignée de glisser-déposer |
| `ha-switch`, `ha-button`, `ha-icon`, `ha-card`, `ha-alert`, `ha-dialog`, `ha-expansion-panel`, `ha-data-table`, `ha-md-list-item`, `ha-select`, `ha-service-picker`, `ha-form` | oui | définis sans visite d'une autre page |
| `ha-spinner` | oui | `ha-circular-progress` n'existe plus |
| `ha-textfield` | **non** | remplacé par `ha-input` ; le dashboard passe par le sélecteur `text`, qui choisit le bon élément |
| `ha-radio`, `ha-formfield` + `ha-radio` | **non** | remplacés par `ha-radio-group` / `ha-radio-option` ; le dashboard passe par le sélecteur `select` en mode `list` |
| `ha-md-list` | non défini sans visite | `ha-md-list-item` l'est ; la liste reste un élément HTML qui contient des `ha-md-list-item` |
| événement `hass-more-info` | oui | écouté par l'interface (42 fichiers le citent) |

Conséquences :
- **Chargement (D2)** : sur 2026.10, la technique `partial-panel-resolver` n'est plus utile, et sa méthode `getRoutes` n'existe plus (`_getRoutes` est privée). Le chargeur attend chaque composant avec `customElements.whenDefined` et un délai maximal ; il ne tente la technique qu'en dernier recours, protégée, si un composant manque après le délai. Hors de Home Assistant (tests), il conclut tout de suite au repli.
- **Champs texte et boutons radio** : le dashboard n'emploie ni `ha-textfield` ni `ha-radio` directement, mais `ha-selector` (`text`, `select` en mode `list`), dont l'interface reste stable d'une version à l'autre. Les mentions de `ha-textfield` et `ha-radio` ci-dessus se lisent donc « sélecteur `text` » et « sélecteur `select` en liste ».
- **Version** : les composants sont vérifiés sur Home Assistant 2026.10. Une version plus ancienne n'a pas pu être lue sans installer son frontend ; elle utilise les replis de la spec composant par composant. `hacs.json` ne fixe pas de minimum, pour ne pas bloquer ces versions ; la version vérifiée est écrite dans `docs/contributing/architecture.md`.

## Goals / Non-Goals

**Goals:**
- Un champ de configuration, un contrôle Home Assistant, avec filtres de domaine et de classe d'appareil.
- Un chargeur unique et un repli sûr.
- Un contrat de champs dans le SDK pour les plugins tiers, testable avec le harnais.

**Non-Goals:**
- Changer le format des valeurs ou les règles de validation de Versatile Thermostat.
- Réécrire la navigation ou la mise en page du panneau.
- Embarquer ou copier les composants de Home Assistant.
- Support de versions de Home Assistant sans les composants utilisés.

## Decisions

**D1. `ha-selector` par champ, pas `ha-form` global.** Un `ha-selector` par champ garde le contrôle de l'ordre, de l'héritage de la configuration centrale (champ désactivé, valeur en lecture seule), de la suggestion d'humidité et des champs conditionnels. Alternative : un seul `ha-form` avec un schéma calculé. Plus court et plus fidèle, mais l'héritage et les erreurs par champ (codes du serveur) y sont moins faciles à placer. Le contrat SDK produit un `selector` ; il reste compatible avec `ha-form` si l'on change d'avis.

**D2. Module `ha-controls` avec un chargeur unique (dans le SDK).** Une fonction `ensureHaControls()` retourne une promesse partagée, utilise `customElements.whenDefined` d'abord, puis la technique `partial-panel-resolver` ci-dessus, et un délai maximal. Elle retourne un booléen. Alternative : un chargement dans `panel.ts` seulement. Refusée : les plugins tiers en ont besoin aussi.

**D3. Commandes switch (b) et services de chaudière.** Format actuel : une chaîne `service_name[/attribute:value]` par sous-jacent, dans l'ordre. Le dashboard affiche, sous chaque sous-jacent non-switch, deux lignes (allumage, extinction) avec un contrôle de service et un champ texte `attribute:value`, puis sérialise. Contrôles de service possibles : (1) `ha-service-picker` (liste des services du domaine du sous-jacent), (2) sélecteur `action`, (3) champ texte `ha-textfield`. **Décision (validée) : (1) `ha-service-picker`, avec repli sur (3) un champ texte si le service n'est pas listé ou si le composant est absent.** Les services de chaudière centrale (`entity_id/service_name[/attribute:value]`) suivent le même modèle (validé) : sélecteur `entity` + `ha-service-picker` + champ attribut, repli champ texte.

**D4. Contrat de champs du SDK.** Un type de champ par contrôle :

| Type SDK (`FieldType`) | Sélecteur Home Assistant | Valeur |
|---|---|---|
| `boolean` | `{ boolean: {} }` | `boolean` |
| `number` / `integer` | `{ number: { min, max, step, mode: "box", unit_of_measurement } }` | `number` |
| `text` | `{ text: {} }` | `string` |
| `text_list` | `{ text: { multiple: true } }` | `string[]` |
| `entity` | `{ entity: { filter: [{ domain, device_class }] } }` | `string` |
| `entity_list` | `{ entity: { multiple: true, filter } }` | `string[]` |
| `select` | `{ select: { options, mode: "dropdown" } }` | `string` |
| `duration` | `{ duration: {} }` | objet durée (non utilisé par les champs de Versatile Thermostat, voir D8) |
| `time` | `{ time: {} }` | `HH:MM:SS` |
| `template` | `{ template: {} }` | `string` |

La conversion est une fonction pure `selectorOf(field)` testable sans navigateur. `FieldSpec` du frontend (`schemas.ts`) devient une instance de ce contrat : `kind` + `multiple` sont remplacés ou complétés par `device_classes` (données de filtre). Les champs de délai restent des `number` avec unité (D8). Le contrat se limite aux types et à `selectorOf` : pas d'élément de formulaire partagé (validé) ; chaque plugin rend ses champs lui-même.

**D5. Filtres (cas c).** Température : `[{ domain: "sensor", device_class: "temperature" }, { domain: ["input_number", "number"] }]`. Humidité : même schéma avec `humidity`. Puissance : `sensor` avec `power` plus `input_number`. Les autres champs : domaine seul (`binary_sensor`, `person`, `input_boolean`...). Le filtre `device_class` est strict (validé) ; une valeur déjà enregistrée reste visible et modifiable même hors filtre. Les domaines viennent déjà de `shared/vtherm-config-schemas.json` ; les classes d'appareil y sont ajoutées à la main et contrôlées par le test de dérive seulement pour la présence des clés.

**D6. Sérialisation et repli.** Les valeurs de sélecteurs sont converties par `fields.ts` (`parseInput` devient la conversion de sortie). Un champ vide devient `null` comme avant. Le repli (composant absent) garde le rendu HTML actuel dans une fonction séparée, marquée par le commentaire d'exception de la spec `code-conventions`.

**D7. Tests.** Le harnais du SDK fournit des éléments simulés (`ha-selector`, `ha-switch`, `ha-button`...) enregistrés par un helper ; les tests du frontend les utilisent (pas de Home Assistant, pas de navigateur lourd).

**D8. Délais : `number` avec unité, pas `duration`.** Le sélecteur `duration` stocke un objet (`days`, `hours`, `minutes`, `seconds`), alors que Versatile Thermostat stocke un entier ou un nombre dans une unité fixe par champ. Utiliser `duration` obligerait à convertir dans les deux sens, à arrondir (secondes vers minutes) et à changer l'affichage de valeurs déjà enregistrées, pour un gain faible : la plupart des valeurs sont de petits entiers. Décision : `number` en mode `box` avec `unit_of_measurement`, l'unité venant d'un champ `unit` ajouté dans `shared/vtherm-config-schemas.json`. Champs concernés, en minutes : `cycle_min`, `safety_delay_min`, `manual_override_duration_min`, `auto_regulation_periode_min`, `heating_failure_detection_delay` ; en secondes : `central_boiler_activation_delay_sec`, `keep_alive_boiler_delay_sec`, `auto_relock_sec`, `motion_delay`, `motion_off_delay`, `minimal_activation_delay`, `minimal_deactivation_delay`, `window_delay`, `window_off_delay` ; `window_auto_max_duration`, `heater_heating_time` et `heater_cooling_time` (unités à confirmer dans le code de Versatile Thermostat avant d'écrire l'unité). Le sélecteur `duration` reste dans le contrat SDK pour les plugins tiers dont la valeur est déjà un objet durée. Alternative écartée : `duration` pour les délais en secondes, rejetée à cause de la conversion.

**D9. Messages : `ha-alert`.** Les `div` avec `role="alert"` ou `role="status"` deviennent `ha-alert` avec `alert-type` : `error` (erreurs de champ `base`, échec d'un plugin, délai de redémarrage dépassé), `warning` (catalogue périmé, reconnexion), `info` (notices, listes vides, avertissements du catalogue). `ha-alert` porte déjà le rôle d'accessibilité. Les erreurs de champ avec code du serveur utilisent `error` du sélecteur (propriété `error`), pas un `ha-alert` séparé, quand le composant l'accepte.

**D10. Tableaux : `ha-data-table` d'abord.** L'état des plugins et la page de développement ont peu de colonnes. `ha-data-table` demande des colonnes typées et gère mal les cellules avec contrôles (interrupteur, boutons) et la mise en page étroite du panneau. Règle : essayer `ha-data-table` ; si une cellule doit contenir un contrôle ou si la largeur étroite casse la lecture, utiliser `ha-card` avec une liste (`ha-list`) par plugin. Le choix est fait par écran à l'implémentation et noté dans la tâche.

**D11. Cartes, listes, navigation.** `div.card` et `li.card` deviennent `ha-card` (l'en-tête passe par la propriété `header`). Menu de gauche et liste des thermostats : `ha-list` / `ha-md-list-item` avec `href` (la navigation interne continue par `followLink`). Sélecteur de thermostat : `ha-select`. Lien « Créer » : `ha-button` avec `href`. Les onglets de la barre haute et le fil d'Ariane n'ont pas d'équivalent public stable dans Home Assistant : ils restent des éléments HTML, avec un commentaire d'exception (spec `code-conventions`).

**D12. Dialogues, chargement, groupes.** Confirmations (installation, redémarrage, quitter avec un brouillon) : `ha-dialog` avec boutons `ha-button` ; si le dialogue de confirmation de Home Assistant est accessible sans API privée, l'utiliser, sinon `ha-dialog`. Repli : `window.confirm` pour « quitter avec un brouillon », le dialogue maison pour les autres. Chargement : `ha-spinner` ou `ha-circular-progress` ; l'implémentation vérifie lequel existe dans la version minimale (tâche 1.0) et le chargeur expose les deux noms. La progression d'installation (`step.*`) devient un indicateur indéterminé avec le texte de l'étape. Groupes de champs longs (onglets TPI, Auto TPI, avancé, fenêtre) : `ha-expansion-panel` avec `header`, ouvert par défaut quand un champ du groupe est en erreur.

**D13. Fiche d'entité.** Une entité affichée (valeur centrale en lecture seule, suggestion d'humidité) est un élément cliquable qui émet `hass-more-info` avec `detail: { entityId }` (`bubbles`, `composed`) depuis le panneau ; un identifiant inconnu n'émet rien. Les sélecteurs d'entités de Home Assistant ouvrent déjà leur propre sélection : l'événement ne concerne que les valeurs affichées hors sélecteur.

## Risks / Trade-offs
- [Technique de chargement non publique] → un seul module, un test avec simulation, un repli HTML, un avertissement unique ; à surveiller à chaque version de Home Assistant.
- [Ordre des entités dans `ha-entities-picker`] → vérifier que la version minimale permet de réordonner ; sinon, afficher les listes parallèles (commandes, degrés) par position et documenter la limite.
- [Filtre `device_class` strict : un capteur de température sans classe n'est pas proposé] → choix validé ; l'entité déjà enregistrée reste visible (spec).
- [Composants plus récents (`ha-md-list-item`, `ha-spinner`, `ha-alert`, `ha-dialog`) absents d'une version ancienne de Home Assistant] → la tâche 1.0 fixe la version minimale et le chargeur retient le nom disponible ; repli HTML par composant.
- [`ha-data-table` et `ha-dialog` ont des propriétés qui changent plus que `ha-selector`] → n'employer que des propriétés documentées, un module d'adaptation par composant.
- [Propriétés internes de `ha-selector` qui changent selon les versions de Home Assistant] → n'utiliser que les propriétés documentées (`hass`, `selector`, `value`, `label`, `helper`, `required`, `disabled`).
- [Tests plus lourds] → éléments simulés légers, pas de `npm install` ni de navigateur pour les tests unitaires du contrat.
- [Changement d'apparence visible] → c'est le but ; la documentation utilisateur est mise à jour.

## Migration Plan
Aucune migration de données. Livrer en deux étapes sûres : contrat et chargeur (SDK), puis remplacement des rendus dans `native-tab.ts`, puis les autres écrans. Retour arrière : le repli HTML reste dans le code ; un `git revert` du change suffit.

## Open Questions
- Version minimale de Home Assistant : valeur à fixer par la tâche 1.0 (vérification dans le code du frontend de Home Assistant, non cloné dans `external/` : ordre des listes d'entités, existence de `ha-spinner`, `ha-md-list-item`, `ha-alert`, `ha-service-picker`, `ha-expansion-panel`). La réponse change l'inventaire des repli, pas le plan.
- Unités de `window_auto_max_duration`, `heater_heating_time` et `heater_cooling_time` (D8) : à lire dans Versatile Thermostat.
