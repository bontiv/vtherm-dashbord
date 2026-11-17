# Proposal

## Why
Les onglets de configuration affichent sous chaque champ le texte d'aide brut du config flow de Versatile Thermostat : souvent technique (« Coefficient to use for internal temperature delta »), parfois absent, jamais illustré. Un utilisateur ne comprend pas ce que font `coef_int`, la durée de cycle, les ouvertures minimales d'une vanne ou les seuils de détection d'ouverture sans lire la documentation de VT. Le projet amont `Liquidmasl/vtherm_dashboard` a montré qu'une courte indication sous le champ, une explication détaillée derrière un bouton (i) et un petit schéma par réglage clé rendent la configuration compréhensible sur la page même.

## What Changes
- Chaque champ natif peut avoir trois niveaux d'aide : une **indication courte** sous le contrôle (`hint.<clé>`), une **explication détaillée** (`info.<clé>`) et un **schéma explicatif** facultatif. L'aide brute de VT (`help.<clé>`) reste le repli quand le dashboard n'a pas son propre texte.
- Un bouton (i) à côté du champ ouvre et ferme un panneau d'aide en ligne, sous le champ, qui contient le schéma et l'explication. Il fonctionne au toucher, au clavier et avec un lecteur d'écran (pas d'infobulle au survol seulement).
- Une bibliothèque de schémas SVG dessinés avec les couleurs du thème de Home Assistant, aux libellés traduits : cycle de chauffe TPI, formule TPI, temps d'activation et de désactivation minimaux, seuils TPI, courbe d'ouverture de vanne, seuil d'envoi des consignes, délais d'ouverture de fenêtre, détection d'ouverture par chute de température, mouvement, sécurité en cas de perte du capteur, dérogation manuelle, détection de panne de chauffage, correction de consigne (régulation automatique), décalage des démarrages de plusieurs interrupteurs.
- Les schémas sont **interactifs** : ils sont dessinés avec les valeurs effectives du brouillon (propres ou héritées de la configuration centrale) et se redessinent à chaque modification. Par exemple, changer l'ouverture minimale en chauffe déplace le palier de la courbe de vanne. L'élément du schéma qui correspond au champ en cours de saisie est mis en évidence. Un schéma reste visible pendant la saisie : son panneau ne se ferme pas quand on modifie un champ, et le schéma d'un groupe de champs liés est affiché dans la grille de la section, à côté des champs du groupe, sans ouvrir d'aide.
- Textes réécrits en langage simple pour les champs des plugins natifs, en anglais, français et allemand.
- Le SDK et le dashboard exposent le composant d'aide aux plugins tiers : un plugin peut afficher la même aide (indication, explication, schéma de la bibliothèque ou SVG fourni par le plugin) à côté de ses propres champs.

## Capabilities

### New Capabilities
- `field-help`: aide contextuelle des champs de configuration : indication courte, explication détaillée, bouton (i) et panneau d'aide, bibliothèque de schémas explicatifs interactifs, textes natifs et composant d'aide offert aux plugins.

### Modified Capabilities
- `ha-native-controls`: le texte passé en `helper` au composant Home Assistant devient l'indication courte du dashboard, avec repli sur l'aide de Versatile Thermostat ; le bouton (i) suit les règles des contrôles (composant Home Assistant, thème, cible tactile).
- `ui-plugin-sdk`: le SDK exporte le contrat du composant d'aide de champ (nom de l'élément, propriétés, identifiants des schémas de la bibliothèque).

## Impact
- Frontend : `frontend/src/native/native-tab.ts` (rendu des champs et des tuiles de la grille livrée par `config-page-layout`), nouveau composant d'aide et bibliothèque de schémas sous `frontend/src/components/`.
- Textes : `scripts/native-texts.ts` (clés `hint.*`, `info.*`, `diagram.*` en en/fr/de) puis régénération des catalogues `frontend/src/native/catalogs/*.ts` ; `frontend/src/shell-translations.ts` pour le libellé du bouton d'aide.
- SDK : `packages/sdk/src/` (types et constantes du composant d'aide), référence générée `docs/reference/sdk/`.
- Documentation : `docs/plugins/plugin-development.md`, `docs/plugins/internationalization.md`, `docs/plugins/native-plugins.md`, `CHANGELOG.md`.
- Aucun changement côté Python ni de la configuration de Versatile Thermostat.
- Les cartes de choix du type de thermostat, prévues au départ par ce change, ont été livrées par `creation-as-config-page` (scénario « Choix du type par cartes » de `core-config-management`) et n'en font plus partie.
