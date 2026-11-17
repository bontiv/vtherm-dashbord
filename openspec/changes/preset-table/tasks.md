# Tasks

## 1. Modèle du tableau

- [ ] 1.1 Écrire en TypeScript la fonction pure qui construit la grille des presets depuis `PresetData[]` et les valeurs du brouillon (lignes, colonnes applicables, cases « — », presets inconnus en lignes supplémentaires) ; vérifier par des tests Vitest les scénarios « Thermostat simple », « Présence et climatisation » et « Colonne activée non encore enregistrée »
- [ ] 1.2 Écrire `presetOrderWarnings` pour les colonnes de chauffage et de climatisation ; vérifier par des tests le scénario « Éco plus chaud que confort » et l'ordre inverse en climatisation

## 2. Composant du tableau

- [ ] 2.1 Dessiner le tableau dans `frontend/src/native/native-tab.ts` (ou un composant `vtherm-preset-table`) : `<table>` sémantique, cases `input type=number` compactes stylées par le thème avec un commentaire qui justifie l'écart à `ha-selector`, noms accessibles, marque des cases modifiées ; vérifier par des tests de rendu le scénario « Nom accessible » et l'absence de couleur figée
- [ ] 2.2 Brancher la saisie sur le brouillon (conversion décimale tolérante, limites, cases invalides hors brouillon) et rattacher les refus d'enregistrement aux cases ; vérifier par des tests les scénarios « Valeur hors limites » et « Refus à l'enregistrement »
- [ ] 2.3 Dessiner le tableau hérité en lecture seule avec le lien vers les presets de la configuration générale ; vérifier par un test le scénario « Lien vers la configuration centrale »
- [ ] 2.4 Ajouter le repli par bloc sous 520 px de conteneur ; vérifier par le test des styles étroits le scénario « Téléphone » à 360 px
- [ ] 2.5 Ajouter les textes (situations, avertissement, note, lien) en en/fr/de et régénérer les catalogues ; vérifier `npm run check:catalogs`
- [ ] 2.6 Mettre à jour le test existant de `frontend/test/native-ha-controls.test.ts` qui attend un sélecteur `number` par preset, la documentation utilisateur de `docs/` et le `CHANGELOG.md` ; vérifier `npm test` et `npm run check:docs`

## 3. Vérification d'ensemble

- [ ] 3.1 Exécuter `npm run check` et `npm test` sans erreur
- [ ] 3.2 Dans le devcontainer, vérifier le tableau d'un thermostat simple, d'un thermostat avec présence et climatisation, d'un thermostat qui hérite et de la configuration générale, en en/fr/de, thème clair et sombre, bureau et 360 px, puis enregistrer et contrôler les entités `number` dans Home Assistant
