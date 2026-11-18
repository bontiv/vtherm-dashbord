# Design

## Context
- Les deux pages (`core-complements-catalog-page`, `core-complements-installed-page`) sont deux sous-classes de `ComplementsPageBase` (`frontend/src/complements/complements-page.ts`). La liste et le détail sont dessinés par le même élément selon `subpath`. Les critères de la liste (`filters`) sont un état de l'élément : ils survivent à l'ouverture d'un complément tant que l'élément reste monté, mais ni à un rechargement ni à un remontage.
- L'état partagé vit dans `complementsModel` (`frontend/src/complements/model.ts`) : catalogue, statut de HACS, dépôts HACS (`HacsRepository`, avec `status`, `installed_version` et `available_version`, déjà lus par `hacs-client.ts` mais jamais affichés), installations en cours, redémarrage. L'état d'un complément est déduit par `deduceState` (`states.ts`).
- Le shell (`panel.ts`) route sur `window.location.pathname` seul : `parseRoute` ignore la query string, `readLocation` ne la lit pas, et le fil d'ariane pointe vers `buildPath(...)`, sans query. La navigation interne passe par l'événement `vtherm-navigate` (`navigate`, `followLink`), qui fait `pushState` du chemin reçu.
- Le menu du dashboard ne sait afficher un statut que pour les contributions de configuration (`ConfigFields.status`). Décision de l'utilisateur : rien ne passe par le SDK ni par le menu ; ce qui est propre au plugin est fait dans le plugin.
- Les composants de Home Assistant sont utilisés quand ils existent (`ha-selector`, `ha-card`, `ha-button`, `ha-alert`, `ha-icon`), avec un repli HTML (`haState`, `isDefined`). Le seuil d'écran étroit est `NARROW_QUERY` (`max-width: 700px`), partagé avec le shell. `ha-markdown` est défini dans le Home Assistant de développement (2026.10).
- `load()` attend ensemble le catalogue et la lecture de HACS (`Promise.allSettled`), qui demande `hacs/repositories/list` pour `integration` et `plugin` : 6 592 dépôts sur le HA de développement. La page reste sur « Chargement du catalogue… » pendant ce temps, et le fil d'ariane n'a pas encore le nom du complément.
- HACS rend le README brut (Markdown, liens relatifs non résolus) dans `additional_info` de `hacs/repository/info`, mais seulement pour les dépôts qu'il connaît : 1 dépôt du catalogue sur le HA de développement.
- Le serveur lit déjà le catalogue (`complements.py`) avec la session HTTP de Home Assistant, un délai maximal et un cache d'une heure ; les commandes du dashboard sont dans `websocket_api.py`, `get_complements` y est réservée aux administrateurs.
- Les liens « My Home Assistant » internes (`/_my_redirect/<redirection>`) n'existent que si l'intégration `my` est chargée : le HA de développement, sans `default_config`, répond 404 ; une installation ordinaire la charge. `hassio` est dans `hass.config.components` seulement avec le Supervisor.

## Goals / Non-Goals

**Goals:**
- Tout faire dans le plugin `core_complements`, plus une commande WebSocket de l'intégration pour le README et une correction de style du fil d'ariane du shell.
- Garder le repli sans composants de Home Assistant fonctionnel pour chaque nouvel élément (statut, carte, filtres repliés, tri, cartes du détail, documentation).
- Ne rien persister : les critères sont dans l'adresse et en mémoire, les README dans un cache en mémoire du serveur.

**Non-Goals:**
- Faire la mise à jour ou la suppression depuis le dashboard : elles restent dans HACS.
- Ajouter une commande WebSocket autre que celle du README : les états et les versions sont déjà chargés par le modèle. Un compteur hors des pages du plugin ferait l'objet d'un autre changement.
- Importer un blueprint ou ajouter un dépôt d'add-ons par le dashboard lui-même : ce sont les fenêtres de Home Assistant qui le font, avec leur confirmation. Savoir si un blueprint est déjà importé reste hors périmètre : l'état reste « installation manuelle ».
- Transformer en liste les lignes d'une description : seuls les retours à la ligne sont gardés.
- Modifier le SDK, le menu du dashboard ou le format du catalogue.
- Installer un complément depuis une carte : l'installation reste sur la page de détail, après confirmation.

## Decisions

### 1. « Mise à jour disponible » est une indication, pas un état
`ComplementState` reste inchangé (les tests de la documentation lisent `COMPLEMENT_STATES`). Une fonction pure `updateOf(repository)` dans `states.ts` rend `{ installed, available }` quand le dépôt est installé et que `status === "pending-upgrade"` ou que `available_version` diffère de `installed_version` ; sinon `undefined`. Le modèle l'expose (`updateOf(complement)`), et `needsAction(complement)` est vrai pour `to_configure`, `restart_required` ou une mise à jour disponible.
- *Alternative écartée* : un état `update_available`. Un complément « Configuré » avec une mise à jour perdrait son état réel, et l'ordre de priorité entre états deviendrait arbitraire.

### 2. Carte : un seul lien étiré, des actions au-dessus
Le nom reste le seul `<a>` de la carte ; un pseudo-élément `::after` du lien couvre toute la carte (`position: relative` sur la carte), et les boutons d'action sont placés au-dessus (`position: relative; z-index: 1`). Le focus du lien dessine un contour sur la carte (`:focus-within` / `:has(a:focus-visible)`), le survol élève la carte. Le titre n'a plus besoin de `touch-target` (la carte entière est la cible), ce qui supprime le décalage vertical des titres d'une ligne. L'auteur est poussé en bas par une colonne flex (`margin-top: auto`).
- *Alternative écartée* : envelopper la carte dans un `<a>`. Un bouton ne peut pas être dans un lien, et un lecteur d'écran lirait toute la carte comme nom du lien.
- Les actions directes réutilisent celles du détail : `openHomeAssistantPage(configFlowPath(...))`, le dialogue de redémarrage existant (`this.dialog = { kind: "restart" }`, dessiné aussi en mode liste), `openHacs` pour la mise à jour.

### 3. Statut contrasté
`.status` remplace `.badge.state-*` : fond teinté (`color-mix(in srgb, var(--warning-color) 18%, transparent)` pour les états à traiter, `--success-color` pour installé et configuré, `--divider-color` pour les autres), texte `--primary-text-color` et une icône `ha-icon` par état (par exemple `mdi:cog-outline`, `mdi:restart`, `mdi:check-circle-outline`, `mdi:link-variant`, `mdi:arrow-up-circle-outline` pour la mise à jour). Le texte reste toujours en couleur de texte principale : le contraste ne dépend plus de la teinte du thème. Sans `ha-icon`, le texte seul suffit. Type, famille et certification passent en texte secondaire séparé par des points médians, sans bordure.
- *Alternative écartée* : assombrir l'orange du texte. Le résultat dépendrait de chaque thème personnalisé.

### 4. Critères dans l'adresse et en mémoire
Les critères (`q`, `type`, `family`, `certification`, `state`, `sort`) sont écrits dans la query string par `history.replaceState`, sans événement de navigation, à chaque changement de la liste. Le modèle garde aussi les derniers critères de chaque page (`criteria: Map<pageId, Filters>`). À l'affichage de la liste, une query non vide l'emporte ; sinon les critères en mémoire sont repris et réécrits dans l'adresse. Ainsi le retour par le fil d'ariane, dont le lien n'a pas de query, retrouve la liste filtrée, et un rechargement aussi. Une valeur inconnue dans la query est ignorée.
- Le lien du résumé « à traiter » a un `href` avec `?state=to_handle` (ouverture dans un nouvel onglet), mais son clic pose les critères en mémoire puis navigue vers le chemin sans query : le shell ne reçoit jamais de query dans `vtherm-navigate`, ce qui évite que `parseRoute` la prenne pour une partie d'un segment.
- *Alternative écartée* : faire gérer la query par le shell (`Route.query`). Changement du routeur partagé pour un seul plugin, contraire à la décision de l'utilisateur.

### 5. Filtres
- Chaque liste d'options est calculée sur les compléments de la page (tous pour le Catalogue, les installés pour les Installés), avant les autres filtres. Le filtre d'état ajoute « À traiter » (valeur `to_handle`) en tête s'il y a au moins un complément à traiter dans la page.
- `ha-selector` de type `select` reçoit `required: true` : l'option « Tous » (`__all__`) existe toujours, le bouton d'effacement disparaît. À vérifier sur la version de Home Assistant de développement ; le repli `<select>` n'en a pas.
- Écran étroit : la page suit `matchMedia(NARROW_QUERY)`. La recherche reste dans la barre ; un `ha-button` « Filtres (n) » (`aria-expanded`) ouvre un panneau qui contient les quatre listes et le tri. Sur écran large, tout est sur une ligne et la recherche a la hauteur des listes (son texte d'aide passe en `placeholder`).

### 6. Compteur, tri et regroupement
La barre de la liste affiche « N compléments » (texte pluriel du catalogue, `PluralMessage`) et « Effacer les filtres » quand un critère autre que le tri est actif. Tri : `certification` (défaut ; ordre `official`, `recommended`, `community`, puis les valeurs inconnues par ordre alphabétique, avec un intitulé par groupe), `name` (`localeCompare` dans la langue de l'utilisateur, sur le nom affiché), `state` (à traiter, configuré, installé, non installé, lien seul). Le rafraîchissement devient un `ha-icon-button` `mdi:refresh` avec `label` « Rafraîchir le catalogue », désactivé pendant la lecture ; la date reste en texte secondaire.

### 7. Résumé « à traiter »
Un `ha-alert` d'information en haut des deux listes (pas sur le détail) : « N compléments demandent une action », avec le lien du point 4. Il n'apparaît que si `N > 0`.

### 8. Détail en cartes
- **En-tête** (sans carte) : nom (`h2`), badge « Expérimental », description du catalogue en chapeau (texte, marque « (EN) » s'il y a lieu).
- **Carte d'action** (`ha-card`) : statut, versions (« 1.2.0 → 1.3.0 » ou la seule version installée), action principale (Installer, Configurer, Redémarrer, Ouvrir dans HACS, Importer dans Home Assistant, Ajouter le dépôt à Home Assistant), encadrés (installation manuelle, Supervisor requis, expérimental, HACS absent, progression et résultat d'une installation), puis une liste de définitions : auteur, type, famille, certification, source, et le lien vers HACS d'un complément installé.
- **Carte « Documentation »** (`ha-card` avec en-tête) : le README (point 12) ou la description du catalogue.
- **Disposition** : `:host` est un conteneur (`container-type: inline-size`) ; au-delà de 900 px de large, une grille `minmax(0, 1fr) 320px` met la documentation à gauche et la carte d'action à droite, en `position: sticky; top: 16px` ; en dessous, une colonne : en-tête, action, documentation. Une requête de conteneur plutôt que de média, car la largeur utile dépend du menu de gauche.
- La documentation a `max-width: 70ch`. Le lien « Retour à la liste » ne reste que dans le cas « complément introuvable ». Le lien de source affiche `complement.repository` s'il existe et que `link` est sur `github.com`, sinon `new URL(link).host`.
- *Alternative écartée* : une fenêtre par-dessus la liste, comme le site officiel. Le dashboard a une adresse par complément : favori, rechargement, fil d'ariane et bouton précédent fonctionnent déjà.

### 9. Textes et finitions
- Nouvelles clés en anglais, français et allemand dans `catalogs.ts` (le type `CompleteCatalog` impose leur présence) : statut et action de mise à jour, versions, résumé (pluriel), compteur (pluriel), « Effacer les filtres », « Filtres » et « Filtres ({count}) », tri et ses valeurs, intitulés de groupe, « À traiter », « Expérimental », « (EN) », `detail.author_value` (« Author: {author} », « Auteur : {author} », « Autor: {author} »), catégories HACS (`hacs_category.integration`, `hacs_category.plugin`, avec repli sur la valeur brute pour une catégorie inconnue, comme `known`) ; page de détail : « Documentation », « Voir sur GitHub », erreur de lecture du README, « Lecture de HACS… », avertissement expérimental, actions et encadrés de l'installation manuelle (import de blueprint, ajout de dépôt, Supervisor requis, « Copier », « Copié », type inconnu).
- Repli anglais : `resolveLocalizedField` (`i18n.ts`) rend la valeur sans dire quelle langue il a retenue. Une variante qui rend la valeur et l'étiquette de langue (même chaîne `languageChain`, `resolveLocalizedField` devient son enveloppe) permet de poser `lang="en"` et la marque « (EN) » quand l'étiquette n'est pas la langue de l'utilisateur.
- Préfixe expérimental : une fonction pure `displayName(name)` retire `^\s*\[experimental\]\s*` (insensible à la casse) et dit si le préfixe était là. La recherche continue de comparer au nom complet.
- Liens : règle `a { color: var(--primary-color); }` dans les styles de la page (le HTML des descriptions est dans le même shadow root, il en profite).
- Fil d'ariane du shell : `ol { align-items: center; }` dans `breadcrumb.ts`, pour que le segment courant soit centré sur la hauteur de 44 px des liens sur écran étroit ; sur écran étroit, le dernier segment tient sur une ligne (`min-width: 0`, `white-space: nowrap`, `overflow: hidden`, `text-overflow: ellipsis`), le nom complet restant dans le titre de la page. La vérification à 375 px a montré deux compléments nécessaires : `:host { min-width: 0; }`, sans quoi le fil d'ariane, élément flex de la barre, s'élargit au nom long et fait défiler la page en largeur ; et, sur écran étroit, les segments sur une seule rangée (`flex-wrap: nowrap`), un lien gardant au plus la moitié de la rangée avec ses propres points de suspension (segment en flex, lien en bloc de 44 px de haut), le dernier segment prenant le reste.
- Retrait des règles `.overlay` et `.dialog`, mortes depuis `renderDialog`.
- Libellé de l'état `link_only` : « Manual install », « Installation manuelle », « Manuelle Installation ». L'identifiant ne change pas ; le tableau des états de `docs/user/complements.md` suit, puisque `complements-docs.test.ts` y cherche le libellé anglais.

### 10. La commande `vtherm_dashboard/get_complement_readme`
- Entrée : `id` (identifiant du catalogue) et `language` (étiquette de langue de l'utilisateur). Réservée aux administrateurs (`require_admin`), comme `get_complements`.
- Le complément est cherché dans le catalogue courant (`async_complements`) ; un identifiant absent, ou un complément sans `repository`, donne l'erreur `not_found` sans aucun appel réseau.
- Lecture, avec la session HTTP de Home Assistant et le délai maximal du catalogue, sur `https://raw.githubusercontent.com/<owner>/<repo>/HEAD/`, dans l'ordre : `README-<lang>.md`, `README.<lang>.md`, `README_<lang>.md` (langue de base, par exemple `fr` pour `fr-CA`, sautés pour `en`), puis `README.md`. Si `README.md` manque, `https://api.github.com/repos/<owner>/<repo>/readme` donne le nom et l'adresse réels (casse, dossier `docs/` ou `.github/`).
- Réponse : `markdown` (liens rendus absolus, point 11), `language` (la langue du fichier retenu, `en` pour le README principal), `source_url` (sa page sur GitHub), `fetched_at`.
- Cache en mémoire par dépôt et par langue demandée, une heure, comme le catalogue ; un échec n'est pas mis en cache. Taille limitée à 512 Kio : au-delà, `readme_unavailable`. Toute autre erreur de lecture donne aussi `readme_unavailable`, avec le message en anglais dans le journal.
- *Alternative écartée* : `hacs/repository/info`. HACS ne connaît qu'une partie des dépôts du catalogue, et ne résout pas les liens relatifs.
- *Alternative écartée* : lecture par le navigateur. Le catalogue est déjà lu par le serveur ; le cache y est partagé et la règle « seulement le catalogue » y est vérifiable.

### 11. Liens rendus absolus, côté serveur
Base des images : `https://raw.githubusercontent.com/<owner>/<repo>/HEAD/<dossier du fichier>/` ; base des liens : `https://github.com/<owner>/<repo>/blob/HEAD/<dossier du fichier>/`. Sont réécrits : les cibles Markdown `[texte](cible)` et `![texte](cible)`, les définitions de références `[nom]: cible`, et les attributs HTML `src` et `href`. Une cible absolue (`http:`, `https:`, `mailto:`) ou une ancre `#…` est gardée. Une image `https://github.com/<o>/<r>/blob/<ref>/<chemin>` devient `https://raw.githubusercontent.com/<o>/<r>/<ref>/<chemin>`, qui est l'image elle-même. Fonction pure en Python, testée sur des extraits réels (README de `vtherm_climate_replication` et de `versatile-thermostat-ui-card`).

### 12. Affichage du README
`ha-markdown` reçoit le Markdown (`lazy-images`, `breaks` à faux) : Home Assistant le convertit et le nettoie. Les liens doivent s'ouvrir dans un nouvel onglet sans référent : à vérifier sur `ha-markdown` ; sinon, une fois le contenu rendu, le plugin pose `target="_blank"` et `rel="noopener noreferrer"` sur les liens absolus. En-tête de la carte : « Documentation », la marque « (EN) » si `language` est `en` et que l'utilisateur n'est pas anglophone, et un lien « Voir sur GitHub » vers `source_url`. Pendant la lecture : un indicateur de progression dans la carte. Sans `ha-markdown`, sans dépôt ou sur erreur : la description du catalogue (comme aujourd'hui, par `sanitizeDescription`) et le lien vers la source. Le modèle garde les README lus pour la session de la page, pour ne pas redemander en revenant sur un complément.

### 13. Compléments à installation manuelle
La page lit `hass.config.components` : `my` dit si les liens internes de Home Assistant existent, `hassio` si le Supervisor est là.
- Blueprint avec `url` et `my` : bouton « Importer dans Home Assistant » qui ouvre `/_my_redirect/blueprint_import?blueprint_url=<url encodée>` (`openHomeAssistantPage`), donc la fenêtre d'import et de confirmation de Home Assistant.
- Add-on, `hassio` et `my` : bouton « Ajouter le dépôt à Home Assistant » qui ouvre `/_my_redirect/supervisor_add_addon_repository?repository_url=<https://github.com/owner/name encodée>`.
- Add-on sans `hassio` : encadré d'avertissement « Les add-ons demandent Home Assistant OS ou Supervised » et lien vers le dépôt.
- Sans `my` : l'adresse (du blueprint ou du dépôt) dans un champ en lecture seule avec un bouton « Copier » (`navigator.clipboard`, avec un message « Copié »), et un lien vers `/config/blueprint/dashboard` ou `/hassio/store`.
- Type inconnu : encadré « Le dashboard n'installe pas ce type de complément » et bouton « Ouvrir la source ».
- *Alternative écartée* : appeler `blueprint/import` et `blueprint/save`, ou l'API du Supervisor, depuis le plugin. Ce serait refaire, sans pouvoir le tester sans Supervisor, ce que les fenêtres de Home Assistant font déjà avec leur propre confirmation.

### 14. Retours à la ligne des descriptions
`white-space: pre-line` sur `.description p` et `.description li`, pas sur le bloc entier : les retours à la ligne entre deux balises de bloc ajouteraient sinon des lignes vides. L'extrait des cartes reste en texte simple.

### 15. Catalogue avant HACS
`load()` publie le catalogue (`notify()`) dès sa réponse, puis la lecture de HACS (`hacsLoading` à vrai jusqu'à sa fin). Tant que `hacsLoading` est vrai, le statut d'un complément installable affiche « Lecture de HACS… », et aucune action d'installation, de configuration ou de mise à jour n'est proposée ; les compléments à installation manuelle ne dépendent pas de HACS. La page de détail envoie son titre au fil d'ariane dès que le catalogue est là.

### 16. Titre de l'onglet du navigateur
À l'affichage d'un complément, la page garde `document.title` puis le remplace par « <nom> – <titre gardé> » ; elle le rétablit quand elle revient à la liste ou est retirée (`disconnectedCallback`). Si Home Assistant réécrit le titre entre-temps (changement de panneau), la valeur gardée n'est pas réappliquée par-dessus : la page ne rétablit que si le titre est encore le sien.

## Risks / Trade-offs
- [`required: true` sur `ha-selector` pourrait changer d'aspect ou de comportement selon la version de Home Assistant] → Vérification dans le HA de développement ; à défaut, garder `required: false` et masquer le bouton par une option du sélecteur si elle existe, sinon accepter le bouton.
- [`history.replaceState` sur l'adresse du panneau pourrait gêner Home Assistant, qui observe l'adresse] → `replaceState` ne déclenche ni `popstate` ni `location-changed` ; vérification d'un rechargement et des boutons précédent et suivant dans le HA de développement.
- [Le lien étiré couvre la sélection du texte de la description] → Accepté : la description complète est sur la page de détail, où rien ne la recouvre.
- [`color-mix` n'existe pas dans un navigateur ancien] → Repli : fond `--secondary-background-color` déclaré avant ; le texte garde son contraste dans les deux cas.
- [Une valeur `available_version` sans `installed_version` (dépôt non installé)] → Pas d'indication : `updateOf` exige un dépôt installé.
- [Les liens `/_my_redirect/…` ne sont pas testables sur le HA de développement, qui ne charge pas `my`] → `.devcontainer/configuration.yaml` charge `my:` ; la vérification se fait avec et sans (en le retirant de `config/configuration.yaml` le temps du test).
- [L'ajout d'un dépôt d'add-ons n'est pas testable sans Supervisor] → Le cas avec Supervisor est couvert par un test de la page (adresse ouverte) ; la fenêtre de Home Assistant elle-même est notée « non vérifiée » à la vérification.
- [L'API de GitHub limite les appels anonymes à 60 par heure et par adresse] → Elle ne sert qu'en dernier recours, quand `README.md` manque ; les lectures passent par `raw.githubusercontent.com` et le cache d'une heure.
- [Les images d'un README (badges, captures) sont chargées par le navigateur de l'utilisateur depuis des sites tiers] → Comme dans HACS ; chargement différé, et la documentation utilisateur le dit.
- [Un README très long repousse la fin de la page] → Accepté : la carte d'action reste visible sur écran large, et en tête sur écran étroit.
- [`ha-markdown` change d'interface dans une version de Home Assistant] → Repli sur la description du catalogue, comme sans le composant.
