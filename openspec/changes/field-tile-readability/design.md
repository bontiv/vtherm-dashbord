# Design

## Context
- La grille `.fields` de `frontend/src/native/native-tab.ts` place les tuiles avec `grid-template-columns: repeat(auto-fill, minmax(min(240px, 100%), 1fr))` et `align-items: start`. Chaque tuile `.field` est elle-même une grille : le `ha-selector`, le bouton (i) en colonne à droite quand le champ a une aide, puis la note, l'erreur et le panneau d'aide sur toute la largeur. L'indication (`hint`) est passée au `helper` du `ha-selector` : elle est dessinée par Home Assistant, sous la zone de saisie.
- Mesures dans le HA de développement (1440 px, « Principaux attributs ») : la zone de saisie (56 px de haut) commence à 0 px du haut de la tuile pour `ha-selector-text`, `ha-selector-number` et `ha-selector-select`, et à 25 px pour `ha-selector-entity`, dont le nom est au-dessus. Les champs larges (entités multiples, modèles, commandes) occupent toute une ligne et ne sont pas concernés.
- La grille ne connaît pas ses lignes : `auto-fill` décide du nombre de colonnes selon la largeur, donc la composition d'une ligne n'est pas connue au rendu.

## Goals / Non-Goals

**Goals:**
- Aligner le haut des zones de saisie d'une ligne, sans JavaScript de mesure, à toutes les largeurs.
- N'ajouter de l'espace que sur les lignes qui en ont besoin.

**Non-Goals:**
- Changer la présentation des contrôles de Home Assistant (nom intérieur ou au-dessus) ou dessiner les noms nous-mêmes.
- Aligner les indications et les messages sous les zones de saisie : ils suivent la hauteur de leur contrôle.

## Decisions

### 1. Chaque élément de la grille occupe deux lignes : une bande de nom et un corps
`.fields` garde ses colonnes, passe à `row-gap: 0` (l'espacement vertical devient une marge basse du corps), et chaque enfant direct occupe deux lignes de la grille (`grid-row: span 2`). Une tuile de champ devient une sous-grille de lignes (`display: grid; grid-template-rows: subgrid`) avec deux enfants :
- `.label-band` en ligne 1 ;
- `.field-body` qui porte le contenu actuel de la tuile (sélecteur, bouton (i), note, erreur, aide) et reprend les styles de grille de `.field` (`has-help`, `boolean`, `wide`).

Pour une tuile dont le contrôle affiche son nom au-dessus (classe `label-above`), la bande a la hauteur de ce nom et le corps, en ligne 2, remonte de cette hauteur (marge haute négative) : le nom du contrôle remplit la bande. Le corps ne couvre pas les deux lignes : un élément sur deux lignes répartit sa hauteur en trop sur la bande, qui grandissait alors de 7 px quand l'indication du sélecteur d'entité était plus longue que celle de ses voisins (mesuré sur la ligne du capteur de température extérieure). Pour les autres tuiles, la bande est vide (0 px) et le corps est en ligne 2. La hauteur de la ligne 1 de la grille est donc celle du nom au-dessus quand la ligne contient au moins une tuile `label-above`, et 0 sinon : les zones de saisie de la ligne commencent toutes en haut de la ligne 2.
- Les tuiles de schéma, les puces des valeurs centrales et les autres enfants de `.fields` occupent aussi deux lignes, sans bande : ils commencent en haut de la ligne 1, comme aujourd'hui.
- *Alternative écartée* : une mesure JavaScript des positions (`ResizeObserver`, regroupement des tuiles par `offsetTop`). Plus fragile (lecture dans le shadow DOM des contrôles de Home Assistant, rendus successifs) et plus coûteuse qu'une règle de grille.
- *Alternative écartée* : sortir l'indication du `helper` et aligner le bas des contrôles (`align-self: end`). Un interrupteur au texte long ferait descendre toutes les zones de saisie de sa ligne, et l'indication perdrait le style de Home Assistant.
- *Alternative écartée* : dessiner nous-mêmes le nom au-dessus de chaque champ. Les champs texte et nombre de Home Assistant perdraient leur nom accessible et leur astérisque d'obligation.

Le bouton (i) d'une tuile est placé en haut de la première ligne de son corps : dans une tuile `label-above`, c'est la hauteur du nom, 25 px au-dessus de la zone de saisie. Le bouton de `vtherm-field-help` devient la `part` `toggle`, et l'onglet natif le descend de `LABEL_ABOVE_HEIGHT` dans ces tuiles (`.field.label-above vtherm-field-help::part(toggle)`). La `part` est un ajout au contrat de l'élément d'aide, offert aussi aux plugins ; le composant d'aide ne connaît pas la hauteur du nom.

### 2. Les contrôles à nom au-dessus sont déclarés, pas mesurés
Une fonction `labelAbove(field)` de `fields.ts` dit si le contrôle d'un champ non large affiche son nom au-dessus : un sélecteur d'entité simple. Le service de la chaudière centrale est un bloc de commandes, donc un champ large, seul sur sa ligne. La hauteur de la bande est une constante (`LABEL_ABOVE_HEIGHT = 25`, en px) mesurée sur la version de Home Assistant du devcontainer, écrite dans le style sans variable CSS personnalisée (le test de thème les refuse).
- *Pourquoi* : la règle reste du CSS statique ; une nouvelle version de Home Assistant qui changerait cette hauteur ne fait qu'un écart de quelques pixels, que la vérification dans le HA de développement détecte.

### 3. Les interrupteurs descendent avec les champs à nom intérieur
Une tuile booléenne n'a pas de nom au-dessus : son corps est en ligne 2. Sur une ligne qui contient un sélecteur d'entité, son texte et son interrupteur commencent donc à la hauteur des zones de saisie.

### 4. Le repli sans composants de Home Assistant
Les champs du repli (`renderFallbackField`) ont tous leur `<label>` au-dessus : ils n'ont pas la classe `label-above`, leur bande est vide, et leur rendu ne change pas.

### 5. Des noms courts du dashboard pour les noms trop longs
Le nom intérieur d'un champ texte ou nombre est le `label` de `wa-input`, en position absolue avec `white-space: normal` : trop long, il passe à la ligne et recouvre la valeur. Mesures dans le HA de développement (1440 px, français) : le nom dispose d'au plus 230 px dans la petite police du nom flottant ; « Durée de la dérogation manuelle (min) » (37 caractères) tient en 201 px, « Délai maximal entre 2 mesures de températures* » (46) passe sur deux lignes. Le sélecteur d'entité a le même problème au-dessus de sa zone de saisie, et une deuxième ligne y fausserait la bande de nom de la décision 1.

- Une clé de catalogue `label.<clé>` donne un nom court au champ ; `fieldLabelKey(key, english)` la préfère au nom de Versatile Thermostat (`field.<clé>`). L'onglet natif et la liste des valeurs manquantes d'une création (`panel.ts`) l'utilisent tous deux, pour qu'un champ porte le même nom partout. Les noms courts sont écrits dans `scripts/native-texts.ts`, comme les indications.
- **La largeur minimale d'une tuile passe de 240 à 300 px.** Mesure faite à l'application : sur une tuile de 240 px, le bouton (i) (44 px) et le suffixe d'unité (« min », « s ») ne laissent au nom flottant (10 px) que 136 à 166 px, et au nom au-dessus d'un sélecteur d'entité (14 px) que 196 px ; 16 champs de plus restaient en défaut (29 noms, surtout en français et en allemand). Avec 300 px, aucun nom n'est en défaut une fois les 14 noms courts écrits, et la page d'un thermostat garde trois colonnes à 1440 px (la carte fait au plus 1240 px, donc trois colonnes au plus). La tuile de schéma passe sur deux colonnes à partir de 932 px (trois colonnes de 300 px et leurs espaces) au lieu de 752 px. Choix fait avec l'utilisateur, plutôt que 29 noms courts de plus.
- Un champ vide affiche son nom à l'intérieur, en 14 px, avant qu'il ne remonte : ce nom peut passer sur deux lignes dans la zone de saisie vide, sans rien recouvrir ; il remonte en une ligne dès qu'il y a une valeur ou le focus.
- `LABEL_MAX_LENGTH = 38` caractères, astérisque compris, pour tout champ non large dont le nom est à l'intérieur ou au-dessus (texte, nombre, liste, entité). C'est une approximation des pixels disponibles sur une tuile de 300 px (environ 194 px pour un nom flottant avec unité, 256 px pour un nom au-dessus) ; la vérification dans le HA de développement mesure les vraies largeurs. Un test parcourt les champs de tous les plugins natifs dans les trois langues ; il échoue en nommant le champ et la langue. Inventaire actuel : 13 champs non larges à texte, nombre ou liste, et 2 sélecteurs d'entité.
- La phrase complète de Versatile Thermostat ne disparaît pas : l'indication et l'explication du champ la reprennent déjà ; quand un nom court enlève une précision (une unité, « pour la détection automatique »), l'indication du champ la donne.
- Les interrupteurs ne sont pas concernés : leur texte est dans le flux de la tuile, à côté de l'interrupteur, et passe à la ligne sans rien recouvrir.
- *Alternative écartée* : élargir sur deux colonnes les champs au nom long. Le nom recouvrirait encore la valeur sur un téléphone ou une grille à une colonne étroite, et la grille aurait des trous.
- *Alternative écartée* : injecter un style dans le shadow DOM de `wa-input` pour couper le nom par des points de suspension. Cela dépend de la structure interne de Home Assistant, et le nom deviendrait illisible au lieu d'être court.

## Risks / Trade-offs
- [Home Assistant change la hauteur du nom au-dessus des sélecteurs d'entité] → Écart de quelques pixels, sans casse ; la tâche de vérification mesure l'écart, et la constante est au même endroit que la fonction `labelAbove`.
- [Un contrôle à nom au-dessus non déclaré] → Il reste décalé comme aujourd'hui ; la vérification parcourt les onglets natifs pour repérer les zones de saisie qui ne sont pas à 0 px du haut du corps.
- [Sous-grille non prise en charge] → `grid-template-rows: subgrid` est disponible dans les navigateurs que Home Assistant prend en charge ; sans elle, la tuile garde une seule ligne et le décalage actuel revient, sans autre effet.
- [Une nouvelle version de Versatile Thermostat ajoute un champ au nom long] → Le test de longueur échoue en le nommant ; on ajoute son nom court.
- [Un nom court s'éloigne du vocabulaire de Versatile Thermostat] → Les noms courts gardent les termes de Versatile Thermostat et de sa documentation, et l'explication du champ garde la phrase d'origine.
- [Les sélecteurs CSS et les tests visent `.field > …`] → Les règles qui visent les enfants directs passent sur `.field-body` ; les tests qui cherchent des descendants de `.field[data-key]` restent valides.
