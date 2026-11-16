# Design

## Context
Voir `proposal.md` pour les constats faits à 375 px dans l'instance de développement. État actuel du code :
- `frontend/src/panel.ts` lit sa propre largeur avec `NARROW_QUERY = "(max-width: 700px)"` (propriété `compact`) : en dessous, le menu de gauche devient un tiroir (`.drawer`, positionné en absolu dans `.body`, avec un fond `.scrim` de couleur `--divider-color` à 60 %) ouvert par un bouton texte « Menu ». Le panneau reçoit aussi `narrow` de Home Assistant mais ne s'en sert pas.
- `frontend/src/components/top-bar.ts` met sur une seule ligne le titre (20 px, `nowrap`), les onglets de la zone `start` (qui défilent, barre de défilement masquée) et la roue crantée (zone `end`).
- `propsOf()` passe `narrow: this.compact` aux pages (`tab_page`, `global_page`, widgets), mais pas aux composants de configuration ; `BaseProps` du SDK ne déclare que `hass`.
- Les pages natives (configuration, assistant de création, compléments, Plugins, Développement) utilisent des contrôles HTML natifs stylés par chaque composant, sans taille minimale commune.
- Les tests du frontend tournent dans happy-dom, sans moteur de mise en page : les tailles et débordements ne peuvent être vérifiés que dans un navigateur.

## Goals / Non-Goals

**Goals:**
- Un téléphone de 360 px de large ou plus, en portrait, dans l'application Home Assistant (Android, iOS) ou un navigateur mobile, permet tout ce que permet le bureau : naviguer, configurer et enregistrer, créer un thermostat, gérer les compléments, quitter le dashboard.
- Des règles communes (taille des cibles, retour à la ligne) appliquées par un module de styles partagé, plutôt qu'au cas par cas.

**Non-Goals:**
- Une mise en page propre à la tablette ou au paysage : au-dessus de 700 px, la mise en page de bureau s'applique comme aujourd'hui.
- Des gestes (balayer pour ouvrir le tiroir, tirer pour rafraîchir).
- Adapter les pages des plugins tiers : ils reçoivent `narrow` et restent responsables de leur contenu.
- Un mode hors ligne ou une application installable.

## Decisions

### 1. Bouton du menu de Home Assistant : `ha-menu-button`, avec repli
Quand la propriété `narrow` que Home Assistant donne au panneau est vraie, l'en-tête commence par l'élément `ha-menu-button` de Home Assistant (propriétés `hass` et `narrow`), celui des panneaux intégrés : il ouvre le menu latéral et porte la pastille des notifications. Si l'élément n'est pas défini dans la page, le dashboard affiche son propre bouton icône, qui envoie l'événement `hass-toggle-menu` (composé, qui remonte) comme le fait `ha-menu-button`.
- *Alternative : toujours son propre bouton avec `hass-toggle-menu`.* Ne dépend d'aucun élément interne, mais perd la pastille des notifications. Gardée comme repli.
- *Alternative : se fier au seuil de 700 px.* Home Assistant masque son menu sous 870 px : entre 700 et 870 px, l'utilisateur serait bloqué. C'est donc `narrow` de Home Assistant qui décide du bouton, et `compact` (700 px) de la mise en page.

### 2. En-tête sans titre en mode compact
En mode `compact`, `vtherm-top-bar` reçoit un attribut `compact` : le titre est masqué visuellement (classe `visually-hidden` : position absolue, taille d'un pixel, découpé), mais reste dans le document pour les lecteurs d'écran. L'en-tête garde une seule ligne : [bouton du menu de Home Assistant] [onglets de la zone `start`, défilants, sur toute la place restante] [roue crantée]. Au-dessus du seuil, le titre reste affiché à gauche des onglets. Le nom du dashboard reste visible ailleurs : dans le menu latéral de Home Assistant et dans le titre de l'onglet du navigateur. Le bouton « Menu » du tiroir reste dans la ligne du fil d'ariane, mais devient un bouton icône avec libellé accessible.
- *Alternative : en-tête sur deux lignes (titre et roue crantée, puis onglets).* Garde le titre visible mais coûte environ 48 px de hauteur sur un petit écran. Rejetée : le titre n'apporte rien de plus que le menu de Home Assistant.
- *Alternative : supprimer le titre du document.* Plus simple, mais la page n'aurait plus de nom pour un lecteur d'écran. Rejetée.
- *Alternative : onglets en icônes seules.* Gagne de la place mais un onglet de plugin sans icône n'aurait rien à montrer. Rejetée.
- *Alternative : barre de navigation en bas de l'écran.* Habituelle sur mobile, mais elle concurrence la barre d'enregistrement et les barres système. Rejetée.

### 3. Indices de défilement et onglet actif
La zone `start` écoute son événement `scroll` (passif) et un `ResizeObserver` ; elle pose les classes `more-start` / `more-end` qui affichent un dégradé de la couleur de fond de l'en-tête (`--app-header-background-color`) vers la transparence au bord concerné. Après chaque rendu où l'onglet actif change, l'onglet actif est amené dans la partie visible avec `scrollIntoView({ inline: "nearest", block: "nearest" })`.

### 4. Tiroir
Le tiroir reste positionné dans `.body` (sous l'en-tête) mais prend toute sa hauteur ; `vtherm-side-menu` y défile seul (`overflow-y: auto`, `overscroll-behavior: contain`). La zone assombrie utilise une couleur dérivée du thème (`color-mix(in srgb, var(--primary-text-color) 40%, transparent)`), pas une couleur figée. Échap ferme le tiroir ; à l'ouverture le focus va sur l'entrée active du menu, à la fermeture il revient sur le bouton « Menu ». Le reste de la page reçoit `inert` pendant que le tiroir est ouvert.

### 5. Module de styles partagé pour le mode étroit
Un module `frontend/src/components/narrow-styles.ts` exporte un `css` construit sur `NARROW_QUERY` (déplacé dans ce module et réexporté par `panel.ts`) : dans la requête média, `min-height: 44px` pour `button`, `select`, `input` (hors cases et radios), les liens de menu et d'onglet ; les cases et radios sont enveloppées par leur `label`, qui reçoit la hauteur minimale ; `overflow-wrap: anywhere` sur les textes longs marqués d'une classe `breakable` (adresses, identifiants, noms de dépôt). Chaque composant natif ajoute ce module à ses `styles`.
- *Alternative : requête `(pointer: coarse)`.* Viserait aussi les tablettes tactiles, mais la spec parle d'écran étroit et le bureau tactile garde sa densité. Peut s'ajouter plus tard.
- *Alternative : une variable CSS posée par le panneau.* Les composants des plugins tiers la recevraient aussi, ce qui changerait leur rendu sans qu'ils l'aient demandé. Rejetée.

### 6. `narrow` pour toutes les contributions
`propsOf()` ajoute `narrow: this.compact` aux composants `general_config` et `thermostat_config`. `BaseProps` du SDK déclare `narrow: boolean`, et le faux hôte de `@vtherm/dashboard-sdk/testing` le passe (faux par défaut, réglable). C'est un ajout compatible : un plugin qui ignore la propriété n'est pas touché ; la version mineure du SDK augmente.

### 7. Barre d'enregistrement et zones sûres
La barre d'enregistrement passe en `flex-wrap: wrap` et ajoute `padding-bottom: max(8px, var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))`. L'en-tête ajoute les marges gauche et droite de zone sûre de la même façon. Home Assistant gère la marge du haut pour la zone de ses panneaux ; si l'essai sur téléphone montre le contraire, l'en-tête l'ajoute aussi.

### 8. Vérification
happy-dom ne calcule pas la mise en page : les tests unitaires vérifient la structure (titre masqué visuellement en mode compact, bouton présent selon `narrow`, attributs `inert`, gestion d'Échap et du focus, propriété `narrow` transmise, présence du module de styles dans les composants natifs). Les tailles et débordements sont vérifiés dans le navigateur, dans l'instance de développement à 360 et 375 px, avec un script de mesure gardé dans `frontend/preview/` (débordement horizontal et cibles de moins de 44 px sur chaque page native) et, sur un vrai téléphone, dans l'application Home Assistant.

## Risks / Trade-offs
- [`ha-menu-button` est un élément interne de Home Assistant] → Repli sur un bouton qui envoie `hass-toggle-menu` ; un test couvre les deux cas.
- [Sans titre visible, l'utilisateur peut ne plus savoir dans quel dashboard il est] → Le nom reste surligné dans le menu latéral de Home Assistant et dans le titre de l'onglet du navigateur ; les onglets Dashboard, Thermostats et VT Compléments identifient la page.
- [`color-mix` n'existe pas dans les navigateurs anciens] → Les versions de l'application Home Assistant ciblées par Home Assistant 2026.x l'ont ; une couleur de repli (`--divider-color`) est déclarée avant.
- [Les règles de 44 px peuvent agrandir des pages denses (configuration avancée)] → Seulement sous 700 px, où le toucher l'emporte sur la densité.
- [Vérification des tailles manuelle] → Script de mesure réutilisable et étape de vérification explicite dans les tâches ; la CI ne la couvre pas.

## Migration Plan
Aucune migration de données. Les plugins existants continuent de fonctionner ; la documentation des plugins annonce `narrow`.
