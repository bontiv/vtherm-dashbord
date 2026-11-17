# Proposal

## Why
L'onglet des presets aligne jusqu'à quinze champs `number` de Home Assistant les uns sous les autres (« Eco », « Eco abs », « Eco clim », « Eco clim abs »…). Il est long, on compare mal les valeurs, et la structure réelle des réglages, un preset décliné selon la situation, n'apparaît pas. Le projet amont `Liquidmasl/vtherm_dashboard` présente ces températures en tableau : une ligne par preset (hors-gel, éco, confort, boost), une colonne par situation (normale, absence, climatisation, climatisation en absence). C'est la forme naturelle de ces données, et la plus rapide à remplir.

## What Changes
- L'onglet des presets affiche les températures dans un **tableau** : lignes hors-gel, éco, confort, boost ; colonnes normale, absence, climatisation, climatisation en absence. Les colonnes suivent la configuration : absence si la présence est activée, climatisation si le mode climatisation est actif, les deux pour la dernière ; toutes pour la configuration générale. Une case sans entité de preset affiche « — ».
- Les cases sont des **champs numériques compacts**, avec l'unité de température, les limites et le pas de l'entité. Ce ne sont pas des sélecteurs de Home Assistant : un sélecteur `number` par case rend le tableau illisible. C'est une exception explicite à la règle « contrôle Home Assistant en priorité ».
- Les modifications restent dans le **brouillon** et s'enregistrent avec la barre d'enregistrement, comme aujourd'hui. Les cases modifiées et les cases refusées sont signalées.
- Un **avertissement non bloquant** apparaît quand l'ordre attendu n'est pas respecté dans une colonne de chauffage (hors-gel ≤ éco ≤ confort ≤ boost), ou dans l'ordre inverse pour la climatisation.
- Quand la section hérite des presets centraux, le tableau est en lecture seule et propose un lien vers les presets de la configuration générale.
- Sur un écran étroit, le tableau se replie en un bloc par preset, avec ses situations en grille, sans défilement horizontal.

## Capabilities

### New Capabilities
<!-- Aucune. -->

### Modified Capabilities
- `core-native-plugins`: l'exigence du plugin `core_presets` décrit la présentation en tableau, les colonnes selon la configuration, l'avertissement d'ordre et le lien vers les presets centraux.
- `ha-native-controls`: les températures du tableau des presets sont saisies avec des champs numériques compacts du dashboard, et non avec le sélecteur `number`.

## Impact
- Frontend : `frontend/src/native/native-tab.ts` (`renderPresets`, `renderPresetControl`), éventuellement un composant `vtherm-preset-table` sous `frontend/src/native/`.
- Aucun changement du serveur : `get_presets` et l'enregistrement des presets dans le brouillon restent identiques.
- Textes en en/fr/de (en-têtes de lignes et de colonnes, avertissement, lien) ; documentation utilisateur et `CHANGELOG.md`.
