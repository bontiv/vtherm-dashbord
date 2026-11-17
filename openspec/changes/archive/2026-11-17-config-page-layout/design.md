# Design

## Context
Voir proposal.md. `frontend/src/native/native-tab.ts` dessine un onglet comme un `ha-card` (repli : `.card` à `max-width: 760px`), dont les champs `.field` s'empilent (`display: grid` sur une colonne). Les champs viennent des schémas de VT par `fieldsOf()` : `base`, `specific` (masqués et remplacés par `renderInherited()`, une `dl` titrée « Valeurs de la configuration centrale », quand la section hérite) et `extra` (dans un `ha-expansion-panel` « Plus de paramètres »). L'option d'héritage est un champ booléen de VT dessiné comme les autres. Référence amont : `layout.py` (niveaux essential/common/advanced par champ) et `renderGroup`, `inheritedBlock`, `overrideToggle`, `methodChoice` de `editor.ts`.

## Goals / Non-Goals

**Goals:**
- Une mise en page plus dense et plus claire sans changer les valeurs enregistrées.
- Des règles déclaratives (niveau d'un champ, méthode d'ouverture) dans `tab-definitions.ts`, testables sans rendu.

**Non-Goals:**
- Pas de regroupement des champs par concept au-delà des onglets existants (cartes « Pièce », « Équipements »… de l'amont) : les onglets suivent les étapes du config flow, ce que supposent l'enregistrement par étape et les plugins tiers qui s'insèrent entre elles.
- Pas de changement pour les sections des plugins tiers, qui dessinent leurs champs elles-mêmes.

## Decisions

### 1. Grille CSS par requête de conteneur
`.fields { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 8px 16px; }` dans l'onglet ; la carte perd sa largeur maximale, la largeur de lecture étant bornée au niveau de la page (1240 px). Une classe `wide` (`grid-column: 1 / -1`) s'applique aux types `entity_list`, `text_list`, `template`, texte multiligne et aux blocs de commandes. Les booléens gardent la présentation de `ha-selector` boolean (interrupteur et libellé), qui tient dans une tuile.

### 2. Niveau des champs déclaré dans `tab-definitions.ts`
Une table `ADVANCED_FIELDS: ReadonlySet<string>` liste les clés de la spec « Classement des champs natifs ». Le rendu partitionne chaque liste de champs en courants puis avancés ; les `extra` actuels (Auto TPI avancé) rejoignent les avancés. Le panneau `ha-expansion-panel` porte « Paramètres avancés (N) » et `expanded` si l'un de ses champs est en erreur ou obligatoire sans valeur. Un champ inconnu de la table (ajouté par une nouvelle version de VT) est courant par défaut, pour rester visible.
- Alternative écartée : niveau calculé depuis `required`/`default` des schémas de VT. Trop grossier : des champs facultatifs sont essentiels (capteur d'humidité) et des champs à défaut sont courants (durée de cycle).

### 3. Interrupteur « Personnaliser » à la place de l'option de VT
Pour la clé `layout.inherit`, le rendu dessine un `ha-switch` avec le libellé `config.customize` et écrit `!checked` dans l'option VT. L'état « pas de configuration centrale » (option forcée et désactivée) est conservé. Les valeurs centrales sont rendues en pastilles (`.chip` : libellé en `--secondary-text-color` sur `--secondary-background-color`, valeur en `--primary-text-color`), les entités par `friendly_name` avec ouverture de la fiche par `hass-more-info` (spec `ha-native-controls`), suivies d'un lien vers `buildPath` de la section équivalente de la configuration générale. Le lien passe par la navigation existante, qui demande déjà confirmation quand un brouillon est en cours.

### 4. Méthode d'ouverture dérivée, choix en `ha-button-toggle-group`
`windowMethod(values, picked)` (fonction pure) renvoie `sensor` ou `drop` selon la spec. Le choix est dessiné avec le sélecteur `select` de Home Assistant en mode boutons quand il existe (repli : `ha-button-toggle-group`, puis groupe de `button role="radio"`). Le changement de méthode propose au brouillon la suppression des clés de l'autre méthode, en ne touchant pas aux clés héritées de la configuration centrale.

## Risks / Trade-offs
- [Tuiles de hauteurs inégales (aides de longueur variable)] → `align-items: start` et indication courte d'une phrase (change `field-help-diagrams`).
- [Champ avancé obligatoire caché] → ouverture automatique du panneau quand il manque, et statut « incomplète » dans le menu (change `config-navigation-status`).
- [Interrupteur inversé mal compris par ceux qui connaissent VT] → l'aide (i) de l'interrupteur rappelle l'option de VT correspondante.
- [Ordre de livraison avec les autres changes] → chacun peut être livré seul ; les points de contact (en-tête de section, colonne de schéma) sont des emplacements de la carte d'onglet, à réconcilier à l'implémentation du second.
