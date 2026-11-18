# Tasks

## 1. Contrôles à nom au-dessus

- [x] 1.1 Ajouter `labelAbove(field)` et `LABEL_ABOVE_HEIGHT` dans `frontend/src/native/fields.ts` : vrai pour un sélecteur d'entité simple non large (le service de la chaudière centrale est un bloc de commandes, donc large, et n'est pas concerné) ; tests dans `frontend/test/config-form-layout.test.ts`, à côté de ceux de `isWideField`

## 2. Grille à bande de nom

- [x] 2.1 Dans `frontend/src/native/native-tab.ts`, envelopper le contenu de chaque tuile de champ (sélecteur, booléen, commandes, service de la chaudière, repli) dans `.field-body` précédé d'une `.label-band`, et donner la classe `label-above` aux tuiles concernées
- [x] 2.2 Réécrire les styles : `.fields` en `row-gap: 0` avec l'espacement en marge basse, tout enfant direct sur deux lignes, tuile de champ en sous-grille de lignes, bande à `LABEL_ABOVE_HEIGHT` et corps en ligne 2 remonté d'autant (marge négative) pour `label-above`, corps en ligne 2 sinon ; reporter sur `.field-body` les règles `has-help`, `boolean`, `wide` et `missing` qui visent les enfants directs
- [x] 2.3 Tests dans `frontend/test/config-form-layout.test.ts` : structure bande et corps, classe `label-above` sur le capteur de température et pas sur le nom ni la durée de cycle, tuiles de schéma et puces sur deux lignes, repli sans `label-above`

- [x] 2.4 Descendre le bouton (i) d'une tuile `label-above` de `LABEL_ABOVE_HEIGHT` pour qu'il reste à la hauteur de la zone de saisie : `part="toggle"` sur le bouton de `vtherm-field-help` (`frontend/src/components/field-help.ts`) et règle `::part(toggle)` dans `native-tab.ts` ; tests des styles et du `part`, documentation du `part` dans `docs/plugins/plugin-development.md`

## 3. Noms courts des champs

- [x] 3.1 Ajouter `fieldLabelKey` (clé du nom court `label.<clé>` s'il existe, sinon `field.<clé>`) et `LABEL_MAX_LENGTH = 38` ; l'utiliser dans `label` de `native-tab.ts` et dans la liste des valeurs manquantes de `frontend/src/panel.ts`
- [x] 3.2 Écrire en en/fr/de, dans `scripts/native-texts.ts`, les noms courts des champs trop longs (`power_unit`, `central_boiler_activation_delay_sec`, `window_delay`, `window_off_delay`, `window_auto_open_threshold`, `window_auto_close_threshold`, `window_auto_max_duration`, `auto_start_stop_level`, `safety_delay_min`, `safety_min_on_percent`, `safety_default_on_percent`, `manual_override_duration_min`, `power_sensor_entity_id`, `max_power_sensor_entity_id`), en gardant les termes de Versatile Thermostat, et compléter l'indication d'un champ quand le nom court perd une précision ; régénérer les catalogues
- [x] 3.3 Test dans `frontend/test/native-plugins.test.ts` : le nom affiché de chaque champ non large de chaque plugin natif fait au plus `LABEL_MAX_LENGTH` caractères, astérisque compris, en en/fr/de, et l'échec nomme le champ et la langue  ; test de `fieldLabelKey`, que la liste des valeurs manquantes utilise (aucun champ requis d'une création n'a de nom court aujourd'hui)

## 3b. Largeur des tuiles

- [x] 3.4 Passer la largeur minimale d'une tuile de la grille de 240 à 300 px, et le seuil de la tuile de schéma sur deux colonnes de 752 à 932 px ; adapter les tests de styles et `docs/plugins/native-plugins.md`

## 4. Documentation

- [x] 4.1 `docs/plugins/native-plugins.md` (« The layout of the tabs » et « The help of the fields ») : l'alignement des zones de saisie d'une ligne, les contrôles à nom au-dessus, les noms courts `label.<clé>` et leur longueur maximale ; `CHANGELOG.md`

## 5. Vérification

- [x] 5.1 `npm run check` et les tests vitest, chaque commande lancée avec un délai maximal (`timeout`)
- [x] 5.2 Dans le HA de développement, à 1440, 1024 et 360 px, en en, fr et de : mesurer l'écart entre les hauts des zones de saisie de chaque ligne des onglets natifs d'un thermostat de chaque type et de la configuration centrale (au plus 1 px), vérifier qu'aucun nom de champ ne passe sur deux lignes, qu'une ligne sans sélecteur d'entité garde sa hauteur, que les interrupteurs suivent la règle, et que le panneau « Paramètres avancés » et l'aide d'un champ ouverte restent corrects

## Workflow follow-up

- Commit, archivage du change avec synchronisation des specs, push.
