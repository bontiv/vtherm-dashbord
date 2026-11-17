# Design

## Context
Voir proposal.md pour la motivation. État actuel :
- `frontend/src/native/native-tab.ts` dessine chaque champ avec `ha-selector` et passe `help.<clé>` (texte de Versatile Thermostat) en `helper` (`helpText()`), avec un repli HTML (`help()`).
- Depuis `config-page-layout`, les champs d'une section sont des tuiles sur une grille (`repeat(auto-fill, minmax(min(240px, 100%), 1fr))`, `align-items: start`) ; les champs de `ADVANCED_FIELDS` sont dans le panneau replié « Paramètres avancés » ; une section héritée remplace ses champs propres par des pastilles des valeurs centrales.
- Les textes natifs viennent de deux sources fusionnées par `scripts/generate-native-catalogs.ts` : les traductions de Versatile Thermostat et `scripts/native-texts.ts` (`PLUGIN_TEXTS`, en/fr/de, prioritaire). Les catalogues générés `frontend/src/native/catalogs/*.ts` ne se modifient pas à la main.
- Le SDK (`packages/sdk`) ne fournit aucun élément de rendu : chaque plugin dessine ses champs lui-même avec `selectorOf()`.
- Le choix du type par cartes de la création est déjà livré (`creation-as-config-page`) et sort du périmètre de ce change.
- Référence visuelle : `frontend/src/diagrams.ts` et `field.ts` du dépôt amont `Liquidmasl/vtherm_dashboard` (schémas SVG 240×96, couleurs du thème, infobulle au survol, libellés en anglais codés en dur).

## Goals / Non-Goals

**Goals:**
- Un seul composant d'aide, utilisé par les onglets natifs et offert aux plugins tiers.
- Des schémas statiques, légers, traduits, accessibles et lisibles sur téléphone.
- Des textes natifs réécrits en langage simple dans les trois langues, sans modifier les catalogues générés à la main.

**Non-Goals:**
- Pas de données mesurées dans les schémas : ils utilisent les valeurs **saisies** des réglages, et des valeurs d'exemple pour les températures et les durées observées. Les graphiques calculés sur l'historique de la pièce relèvent du change `live-setting-insights`.
- Pas de réécriture des textes de Versatile Thermostat en amont.
- Pas de nouveau champ ni de changement de validation ou d'enregistrement.

## Decisions

### 1. Composant `vtherm-field-help` défini par le dashboard, contrat dans le SDK
Le dashboard définit l'élément personnalisé `vtherm-field-help` (Lit), au même titre que ses autres composants. Le SDK exporte seulement `FIELD_HELP_ELEMENT` (nom), `FieldHelpProps` et `DiagramId` (union des identifiants). Propriétés : `label` (nom du champ, pour le libellé accessible), `hint`, `info`, `diagram` (identifiant) ; un emplacement `slot="diagram"` reçoit un SVG fourni par un plugin.
- Alternative écartée : exporter le rendu depuis le SDK. Le SDK resterait lié à Lit et à une version de rendu ; or il est publié sur npm et doit rester un contrat sans effet de bord (`sideEffects: false`).
- Alternative écartée : ajouter `hint`/`info`/`diagram` à `FieldBase`. Les textes sont des clés de traduction, pas des propriétés du champ ; et le SDK ne dessine pas les champs, donc la donnée ne servirait qu'au dashboard.

### 2. L'indication reste dans le `helper` de `ha-selector` ; le (i) est un bouton à côté
`ha-selector` garde son `helper` (indication courte), pour conserver le rendu, l'espacement et l'accessibilité natifs. Le composant d'aide ajoute, dans le coin supérieur droit de la zone du champ, un `ha-icon-button` (`mdi:information-outline`) et, sous le champ, le panneau. Le libellé de `ha-selector` est interne au composant : y insérer l'icône demanderait de toucher à son DOM.
- Alternative écartée : infobulle au survol (choix amont). Inutilisable au toucher et peu fiable avec un lecteur d'écran ; la spec `dashboard-panel` exige des cibles tactiles.
- Alternative écartée : `ha-dialog`. Trop lourd pour un texte de quelques lignes, et masque le champ que l'on est en train de régler.

### 3. Panneau en ligne, état local, `aria-expanded`/`aria-controls`
Le panneau est une région insérée sous le champ, dans sa tuile de la grille, ouverte/fermée par le bouton, fermée par Échap avec retour du focus sur le bouton. La tuile s'allonge sans réorganiser la grille (`align-items: start`) ; le schéma prend la largeur de la tuile, 240 px au moins. Chaque panneau est indépendant ; l'état n'est pas persistant.
- Alternative écartée : passer la tuile ouverte en pleine largeur. La grille se réorganiserait à chaque ouverture et le champ en cours de saisie changerait de place.

### 4. Bibliothèque de schémas : SVG Lit, viewBox fixe, largeur fluide
Un module `frontend/src/components/diagrams/` contient une fonction par schéma, qui reçoit une fonction de traduction et un formateur de nombres et renvoie le contenu SVG. Le conteneur fixe `viewBox="0 0 240 96"` et `width: 100%`, ce qui règle l'adaptation aux écrans étroits. Couleurs : `--primary-color` (ce que pilote le réglage), `--warning-color` (seuil, délai, événement), `--secondary-text-color` (axes, contexte), `--divider-color` (grille). Libellés : clés `diagram.<id>.<libellé>`, plus `diagram.<id>.title` et `diagram.<id>.caption` ; la légende sert d'`aria-label` (`role="img"`).
- Les schémas amont servent de point de départ ; leurs textes sont déplacés dans les catalogues et leurs nombres passés par le formateur régional.
- Alternative écartée : graphiques de Home Assistant (`ha-chart-base`, ECharts). Pensés pour des séries de données, chargés à la demande, API interne instable ; disproportionnés pour des croquis fixes.

### 4 bis. Schémas paramétrés par les valeurs du brouillon
Chaque schéma est une fonction `(values, focus, t, format) => svg` accompagnée de la liste des clés VT qu'il lit et de leurs valeurs d'exemple (par exemple `valve_curve` lit `min_opening_degrees`, `max_opening_degrees`, `opening_threshold_degree`, `max_closing_degree` ; `tpi_formula` lit `tpi_coef_int`, `tpi_coef_ext` avec une pièce à 1° sous la consigne et un extérieur 15° plus froid). Le composant d'aide reçoit les valeurs effectives (`native-tab.ts` fournit déjà valeurs propres et centrales) et la clé du champ en focus ; Lit redessine à chaque changement de propriété. Les échelles sont bornées (par exemple 0–100 % pour une vanne) pour qu'une valeur extrême reste lisible ; une valeur absente, invalide ou hors limites retombe sur l'exemple, marqué « exemple ». Les listes par vanne (`min_opening_degrees` = « 10,15 ») sont illustrées avec leur première valeur, et la légende signale qu'il y a plusieurs vannes.
- Alternative écartée : schémas figés à valeurs d'exemple (choix amont). Le lien entre le chiffre saisi et son effet est justement ce qui manque à l'utilisateur.

### 4 ter. Tuile de schéma d'un groupe
Une table `GROUP_DIAGRAMS` désigne les groupes de champs qui partagent un schéma (ouvertures de vanne, TPI, seuils de détection d'ouverture). Le schéma d'un groupe est une tuile de la grille de la section (`.diagram-tile`), placée après le dernier champ courant du groupe : elle s'étend sur deux colonnes (`grid-column: span 2`) quand la grille en a au moins trois (requête de conteneur), et occupe une colonne, donc passe sous les champs, sinon. Les champs courants du groupe gardent leur (i) pour l'explication, sans répéter le schéma ; un champ du groupe rangé dans « Paramètres avancés » (délais et seuils TPI) montre le schéma dans son propre panneau, la tuile étant hors de vue quand le panneau avancé est ouvert. Une section héritée, qui n'a plus que des pastilles, affiche la tuile de schéma après ses pastilles, dessinée avec les valeurs centrales.
- Alternative écartée : deux colonnes avec un schéma `position: sticky` à partir de 1024 px de conteneur (décision d'origine). Elle sortait le groupe de la grille, et la carte n'atteint 1024 px que sur un écran large sans volet.

### 5. Textes : nouvelles clés dans `scripts/native-texts.ts`
Ajout des clés `hint.<clé>`, `info.<clé>` et `diagram.*` dans `PLUGIN_TEXTS` pour chaque plugin natif concerné, puis `npm run catalogs:generate`. Les clés de schémas partagées par plusieurs plugins (par exemple `valve_curve` dans `core` et `core_valve_regulation`) sont placées dans `COMMON_TEXTS` ou dupliquées par plugin, selon ce que permet le générateur. La règle de repli est implémentée une seule fois, dans le composant d'aide de `native-tab.ts` :
- `helper` = `hint` ?? `help` ;
- panneau = `info` ?? (`help` si `hint` existe et diffère de `help`) ;
- bouton (i) seulement si panneau ou schéma.

### 6. Association champ → schéma : table déclarative côté natif
Une table `FIELD_DIAGRAMS: Record<string, DiagramId>` (clé de champ VT → schéma), dans `frontend/src/native/`, suit les scénarios de la spec `field-help`. `stagger` ne s'applique qu'à `underlying_entity_ids` d'un thermostat `over_switch`.

## Risks / Trade-offs
- [Textes nombreux à écrire en trois langues] → limiter l'explication détaillée aux champs avec schéma ou à aide insuffisante ; la vérification des catalogues (`internationalization`) bloque les clés manquantes.
- [Libellés de schéma trop longs en allemand] → test de rendu à 360 px dans les trois langues ; libellés courts et `text-anchor` adapté ; les détails vont dans la légende, pas dans le SVG.
- [Tuile de schéma et panneau avancé] → un champ avancé du groupe montre le schéma dans son panneau (décision 4 ter), pour qu'il reste visible sans remonter à la tuile.
- [Schéma qui contredit le comportement de VT après une évolution amont] → chaque schéma cite en commentaire le fichier de VT qu'il illustre ; la montée de version de `external-refs.txt` impose de les relire.
- [Doublon indication / texte VT] → règle de repli de la décision 5 : jamais le même texte deux fois.
