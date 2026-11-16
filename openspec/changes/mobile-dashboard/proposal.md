# Proposal

## Why
Le dashboard s'affiche sur un téléphone, mais il n'y est pas utilisable. Un essai à 375 px de large dans l'instance de développement montre :
- **Pas de sortie** : le panneau n'affiche pas le bouton qui ouvre le menu latéral de Home Assistant. Sur un écran étroit, Home Assistant masque son menu et laisse ce bouton à chaque panneau : l'utilisateur ne peut plus quitter le dashboard.
- **Onglets cachés** : le titre « Versatile Thermostat » prend la moitié de la barre. Seul « Tableau de bord » reste visible ; « Thermostats » et « VT Compléments » sont hors de l'écran, sans indice que la barre défile.
- **Cibles trop petites** : de nombreux contrôles mesurent moins de 32 px de haut (26 dans le catalogue des compléments, 9 dans l'assistant de création et la page Développement).
- **Débordement** : la page de détail d'un complément dépasse la largeur de l'écran (lien « Source » de 435 px sur 375 px).
- **Tiroir** : il ne couvre pas la hauteur de l'écran et n'assombrit pas la page. Un toucher à côté ne le ferme qu'à droite du menu.
- **Plugins** : seules certaines contributions reçoivent l'indication « écran étroit », et le SDK ne la documente pas. Un plugin ne peut donc pas adapter sa mise en page de façon fiable.

Le pilotage du chauffage se fait souvent depuis un téléphone, avec l'application Home Assistant ; le dashboard doit y être complet.

## What Changes
- **En-tête mobile** : sur un écran étroit, le titre du dashboard n'est plus affiché (il reste lu par les lecteurs d'écran). L'en-tête tient sur une ligne : le bouton du menu de Home Assistant, les onglets supérieurs qui défilent, avec un indice visuel quand des onglets sont hors de l'écran, puis la roue crantée. L'onglet actif est toujours visible.
- **Tiroir du menu** : pleine hauteur, fond assombri qui le ferme au toucher, fermeture par la touche Échap et après le choix d'une entrée, focus placé dans le tiroir à l'ouverture.
- **Cibles tactiles** : les contrôles interactifs du cadre et des pages natives (boutons, liens de menu, champs, listes, cases) font au moins 44 px de haut sur un écran étroit.
- **Aucun débordement horizontal** de la page sur un écran de 360 px ou plus : les textes longs (adresses, identifiants) passent à la ligne, les tableaux défilent dans leur propre cadre.
- **Barre d'enregistrement** : reste visible en bas de l'écran, ses boutons passent sous le message quand la place manque.
- **Zones sûres** : le cadre respecte les marges des écrans à encoche dans l'application Home Assistant.
- **Contrat des plugins** : chaque contribution reçoit `narrow`, déclaré dans les types du SDK et documenté.
- La documentation utilisateur (« On a phone ») et celle des plugins sont mises à jour.

## Capabilities

### New Capabilities
Aucune.

### Modified Capabilities
- `dashboard-panel` : l'exigence « Affichage sur mobile » est précisée (bouton du menu de Home Assistant, en-tête sans titre, tiroir, cibles tactiles, absence de débordement, barre d'enregistrement, zones sûres) ; l'exigence « Contexte transmis aux contributions » ajoute l'indication `narrow` pour toutes les contributions.
- `ui-plugin-sdk` : les propriétés de base des contributions déclarent `narrow`.

## Impact
- **Frontend** : `frontend/src/panel.ts` (en-tête, tiroir, propriétés transmises, seuil), `frontend/src/components/top-bar.ts`, `side-menu.ts`, `breadcrumb.ts`, styles des pages natives et des compléments (`frontend/src/native/`, `frontend/src/complements/`), barre d'enregistrement.
- **SDK** : `packages/sdk/src/types.ts` (`BaseProps.narrow`), référence générée `docs/reference/sdk/`, harnais de test du SDK si besoin.
- **Tests** : tests du panneau et des composants à largeur étroite (happy-dom), et vérification dans l'instance de développement à 375 px et à 360 px.
- **Documentation** : `docs/user/dashboard.md`, `docs/plugins/hooks-and-placement.md` (propriétés), `docs/plugins/theming.md` si elle traite de la mise en page.
- **Aucun impact** sur le serveur Python, l'API WebSocket ni le format des plugins existants (la nouvelle propriété est facultative pour eux).
