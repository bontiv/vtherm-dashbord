# Proposal

## Why
Une section de configuration est aujourd'hui une seule carte de 760 px au plus, où chaque champ occupe une ligne entière, dans l'ordre du formulaire de Versatile Thermostat. Sur un écran large, la page est longue et à moitié vide. Les réglages rares (`heater_keep_alive`, commandes personnalisées, temps minimaux TPI…) sont mêlés aux essentiels. L'héritage s'affiche par la case de VT « Utiliser la configuration TPI centrale », puis par une liste brute des valeurs centrales. Pour la détection d'ouverture, il faut deviner que laisser le capteur vide active la détection par chute de température. Le projet amont `Liquidmasl/vtherm_dashboard` règle ces quatre points : champs en tuiles sur une grille, « Paramètres avancés » repliés avec un compteur, interrupteur « Personnaliser » et valeurs héritées en pastilles avec un lien vers la configuration centrale, choix explicite de la méthode de détection.

## What Changes
- **Grille de champs** : sur un écran large, les champs d'une section sont disposés en tuiles sur plusieurs colonnes. Les listes et les commandes prennent toute la largeur. Sur un écran étroit, une seule colonne. La carte de la section utilise la largeur disponible, et non plus 760 px au plus.
- **Paramètres avancés** : les champs rarement modifiés de chaque section sont regroupés dans un panneau replié « Paramètres avancés », avec le nombre de champs. Il s'ouvre de lui-même quand l'un d'eux est refusé ou manquant.
- **Héritage plus lisible** : l'option d'héritage est présentée comme un interrupteur « Personnaliser pour ce thermostat », éteint quand la section utilise la configuration centrale. Les valeurs héritées apparaissent en pastilles compactes « libellé : valeur » (avec le nom des entités), suivies d'un lien « Modifier la configuration centrale ».
- **Méthode de détection d'ouverture** : quand la fonctionnalité est active, un choix explicite « Capteur d'ouverture » ou « Chute de température » affiche les champs de la méthode retenue. Passer d'une méthode à l'autre vide les valeurs de l'autre méthode dans le brouillon.

## Capabilities

### New Capabilities
- `config-form-layout`: disposition des formulaires de configuration natifs : grille de champs, champs essentiels et paramètres avancés.

### Modified Capabilities
- `core-config-management`: l'héritage est présenté par un interrupteur « Personnaliser » et des pastilles de valeurs centrales avec un lien vers la configuration centrale.
- `core-native-plugins`: l'onglet d'ouverture propose le choix explicite de la méthode de détection.

## Impact
- Frontend : `frontend/src/native/native-tab.ts` (styles, `renderGroup`, `renderInherited`, rendu de l'option d'héritage), `frontend/src/native/tab-definitions.ts` (classement des champs avancés, méthode d'ouverture).
- Aucun changement du serveur ni des valeurs enregistrées : l'interrupteur « Personnaliser » écrit la même option `use_*_central_config` inversée, et le choix de méthode n'écrit que les champs de VT.
- Textes en en/fr/de ; documentation utilisateur, `docs/plugins/native-plugins.md`, `CHANGELOG.md`.
- À coordonner avec `field-help-diagrams`, qui ajoute les schémas épinglés à côté de certains groupes, et `config-navigation-status`, qui ajoute l'interrupteur d'activation en tête des sections de fonctionnalité.
