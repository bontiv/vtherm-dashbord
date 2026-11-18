# Proposal

## Why
Deux défauts rendent les tuiles de champs des onglets natifs difficiles à lire :

- **Zones de saisie décalées.** Le sélecteur d'entité de Home Assistant affiche son nom au-dessus de sa zone de saisie (« Capteur de température »), alors que les champs texte, nombre et liste l'affichent à l'intérieur. Sur une même ligne de la grille, la zone de saisie du sélecteur d'entité est 25 px plus bas que celle de ses voisins (mesuré dans le HA de développement sur « Principaux attributs » : nom, capteur de température, durée de cycle).
- **Nom qui recouvre la valeur.** Le nom intérieur d'un champ texte ou nombre (`wa-input` de Home Assistant) passe à la ligne quand il est plus large que la tuile, et sa deuxième ligne recouvre la valeur : « Délai maximal entre 2 mesures de températures » et « Pourcentage de puissance a utiliser en mode securité » dans les Paramètres avancés de la configuration centrale. Le style de ce nom est dans le shadow DOM de Home Assistant, hors de portée du dashboard. Les noms viennent des traductions de Versatile Thermostat, souvent longs : 13 champs dépassent 38 caractères dans au moins une langue (4 en anglais, 9 en français, 10 en allemand ; jusqu'à 86 caractères).

## What Changes
- Sur une ligne de la grille des champs, les zones de saisie SHALL commencer à la même hauteur, que le nom du champ soit affiché au-dessus ou à l'intérieur. L'espace ajouté au-dessus des champs à nom intérieur, et des interrupteurs, n'existe que sur les lignes qui contiennent un champ à nom au-dessus.
- Le nom d'un champ natif non large SHALL tenir sur une ligne à la largeur minimale d'une tuile, en anglais, en français et en allemand. Les noms trop longs reçoivent un nom court du dashboard (par exemple « Délai max. sans mesure (min) »), utilisé partout où le dashboard nomme le champ ; la phrase complète reste dans l'indication et l'explication du champ.
- La largeur minimale d'une tuile passe de 240 à 300 px : le bouton (i) et le suffixe d'unité laissent trop peu de place au nom sur une tuile de 240 px. La page d'un thermostat garde trois colonnes à 1440 px.
- Un test vérifie la longueur des noms de tous les champs natifs non larges, dans les trois langues.
- Ces règles s'appliquent aussi au panneau « Paramètres avancés », à la configuration centrale et à la création d'un thermostat.

## Capabilities

### New Capabilities
<!-- Aucune. -->

### Modified Capabilities
- `config-form-layout`: la grille de champs aligne les zones de saisie d'une même ligne, et le nom d'un champ tient sur une ligne.

## Impact
- Frontend : structure et styles des tuiles de `frontend/src/native/native-tab.ts` ; classement des contrôles à nom au-dessus et longueur maximale d'un nom dans `frontend/src/native/fields.ts` ; nom affiché des champs dans `native-tab.ts` et dans la liste des valeurs manquantes d'une création (`frontend/src/panel.ts`).
- Textes : noms courts `label.<clé>` en en/fr/de dans `scripts/native-texts.ts`, catalogues régénérés.
- Tests : `frontend/test/config-form-layout.test.ts`, `frontend/test/native-plugins.test.ts` (longueur des noms).
- Documentation : `docs/plugins/native-plugins.md` (mise en page et textes des onglets), `CHANGELOG.md`.
- Aucun changement de valeurs, d'enregistrement ni du SDK.
