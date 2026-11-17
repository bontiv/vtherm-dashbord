# Design

## Context
Voir proposal.md. `frontend/src/native/native-tab.ts` charge les presets par `vtherm_dashboard/get_presets` (`PresetData` : `preset` comme `eco_ac_away_temp`, `entity_id`, `value`, `min`, `max`, `step`, `unit`), les place dans le brouillon sous `PRESET_PREFIX + preset`, et dessine un `ha-selector` `number` par preset (`renderPresetControl`), ou une liste `dl` en lecture seule quand la section hérite. Référence amont : `presetTable()` de `editor.ts` (grille CSS, `input type=number`, application immédiate par `number.set_value`).

## Goals / Non-Goals

**Goals:**
- Un tableau lisible, rapide au clavier, cohérent avec le thème, qui garde le comportement de brouillon existant.

**Non-Goals:**
- Pas d'application immédiate des températures (choix amont) : le dashboard garde l'enregistrement explicite du brouillon (spec `core-config-management`).
- Pas de nouveau preset ni de modification de la liste des presets que VT expose.

## Decisions

### 1. Grille déduite des noms d'entité
Le nom du preset est découpé en `<preset>[_ac][_away]_temp` : la ligne vient de `<preset>` (`frost`, `eco`, `comfort`, `boost`), la colonne de la combinaison des suffixes (`""`, `_away`, `_ac`, `_ac_away`). Les colonnes affichées suivent les valeurs du brouillon (`use_presence_feature`, `ac_mode`) et, pour la configuration générale, sont toutes affichées. Un preset au nom inconnu est ajouté en ligne supplémentaire avec son libellé brut, pour ne rien perdre si VT en ajoute.

### 2. `<table>` sémantique et `<input type="number">` stylé par le thème
Un vrai `<table>` (`th scope="col"`/`scope="row"`) donne la navigation des lecteurs d'écran par ligne et colonne. Chaque case est un `<input type="number" inputmode="decimal">` de 6 à 7 caractères de large, `min`/`max`/`step` de l'entité, suffixe d'unité, `aria-label` « <preset>, <situation> ». Styles : `--input-fill-color`, `--primary-text-color`, `--divider-color`, focus `--primary-color`, erreur `--error-color`. Un point `--primary-color` signale une case modifiée.
- Alternative écartée : `ha-selector` `number` en mode boîte par case. Libellé flottant, marges et largeur minimale pensés pour un formulaire : quatre colonnes ne tiennent pas sur une largeur de carte, et les libellés répètent l'en-tête du tableau.
- Alternative écartée : `ha-data-table`. Pensé pour des listes triables et filtrables ; ses cellules éditables ne sont pas une API publique.

### 3. Validation locale et refus du serveur
La saisie est convertie au format numérique de l'utilisateur, bornée par `min`/`max` ; hors limites, la case est invalide et la valeur n'entre pas dans le brouillon. Les erreurs renvoyées par l'enregistrement (`SaveError.field` = nom du preset) sont rattachées à la case et listées sous le tableau en `ha-alert`.

### 4. Avertissement d'ordre
Fonction pure `presetOrderWarnings(grid)` : pour chaque colonne de chauffage, chaque paire consécutive de valeurs connues dont l'ordre est inversé ; pour la climatisation, l'ordre attendu est inverse (boost le plus frais). Affiché en `ha-alert` `warning` sous le tableau.

### 5. Repli étroit par requête de conteneur
`@container (max-width: 520px)` : chaque ligne devient un bloc (titre du preset, puis une grille 2×2 de cases libellées par leur situation). La structure du tableau reste dans le DOM (`display: block`/`grid` sur `tr`/`td`) pour garder les noms accessibles.

## Risks / Trade-offs
- [Écart à la règle « contrôle Home Assistant en priorité »] → exception limitée au tableau, inscrite dans la spec `ha-native-controls` et justifiée en commentaire dans le code.
- [Séparateur décimal : `input type=number` dépend de la langue du navigateur, pas de celle de Home Assistant] → `inputmode="decimal"`, lecture tolérante de la virgule et du point, affichage formaté selon la langue de Home Assistant.
- [Colonnes activées avant l'enregistrement, sans entités] → cases « — » et note, comme le décrit la spec.
