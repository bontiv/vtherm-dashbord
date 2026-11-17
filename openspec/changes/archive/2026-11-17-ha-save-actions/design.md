# Design

## Context
Voir proposal.md. Aujourd'hui, `frontend/src/panel.ts` dessine `renderSaveBar()` après la contribution : un `div.savebar` en `position: sticky; bottom: 0`, visible seulement si le brouillon est modifié, a des erreurs ou après un enregistrement (`savedMessage` = « Saved. »). Ses boutons passent par `renderButton()` de `components/ha.ts` (`ha-button` `accent`/`plain`, repli `button`). `panel.save()` appelle `session.save()` (qui renvoie `{ ok, configSaved, generalErrors }`) sans `catch`. Le brouillon est un par configuration (`ConfigSession`), partagé par toutes ses sections.

Chaque section native est dessinée par `native-tab.ts` dans un seul `ha-card` (repli `.card`), dans le shadow DOM du composant de la contribution, monté par `vtherm-contribution` qui copie `props` sur l'élément. La spec `core-native-plugins` interdit tout privilège aux contributions natives : ce que reçoit un onglet natif passe par le contrat du SDK.

Référence Home Assistant (`src/panels/config/core/ha-config-entity-id-format.ts`, `src/components/buttons/ha-progress-button.ts`) :
- `<div class="card-actions">` en `display: flex; justify-content: space-between; align-items: center`, après `.card-content` dans le `ha-card` ; `haStyle` donne le trait de séparation.
- À gauche, `<ha-button appearance="plain">` avec `<ha-svg-icon slot="start" .path=${mdiRestore}>`. À droite, `<ha-progress-button appearance="filled">` avec le libellé `ui.common.save`.
- Le gestionnaire de clic prend le bouton dans `ev.currentTarget`, sort s'il a déjà `progress`, met `progress = true`, appelle l'API, puis `button.actionSuccess()` ou `button.actionError()` (résultat affiché 2 s : `variant` `success` + `mdiCheckBold`, ou `danger` + `mdiAlertOctagram`, libellé rendu transparent mais gardé comme nom accessible), et `progress = false` dans `finally`. L'erreur est affichée en `ha-alert` dans la carte.

## Goals / Non-Goals

**Goals:**
- Reproduire ce modèle à l'identique quand les composants existent, avec un repli lisible quand ils manquent.
- Garder l'enregistrement et le brouillon dans le panneau ; les composants ne font que dessiner et appeler des commandes.

**Non-Goals:**
- Pas d'enregistrement par section : Enregistrer écrit tout le brouillon de la configuration, comme aujourd'hui.
- Pas de changement de l'assistant de création (son bouton Créer garde son comportement actuel) ni des pages hors configuration.
- Pas de bouton flottant (FAB) comme dans l'éditeur d'automatisations : la référence demandée est la carte de configuration.

## Decisions

### 1. Le contrat transmet l'état du brouillon, le composant dessine les actions
`ConfigProps` gagne une propriété `draft` :

```ts
interface DraftControls {
  readonly dirty: boolean;
  readonly saving: boolean;
  /** Translated messages to show above the actions: unsaved, general errors, partial save. */
  readonly messages: readonly DraftMessage[]; // { type: "info" | "warning" | "error"; text: string }
  save(): Promise<SaveResult>; // "success" | "error" | "partial"
  discard(): void;
}
```

Le panneau construit cet objet dans `propsOf()` à partir de la session ; un nouvel objet à chaque changement du brouillon, pour que Lit redessine. `save()` ne rejette jamais : une exception de l'API devient `"error"` avec un message `draft.save_failed`.
- Alternative écartée : le panneau dessine lui-même la carte de chaque section (en-tête, contenu de la contribution, pied). Uniforme, mais l'en-tête de la carte appartient aujourd'hui à l'onglet, et `config-navigation-status` / `config-page-layout` y placent l'interrupteur d'activation et la grille ; un plugin tiers qui dessine déjà un `ha-card` aurait une carte dans une carte.
- Alternative écartée : passer un `TemplateResult` du panneau au composant. Un plugin tiers peut embarquer sa propre copie de Lit, et le gabarit ne lui permettrait pas de connaître le résultat pour son bouton.

### 2. Déclaration `save_actions` sur les contributions de configuration
`GeneralConfigContribution` et `ThermostatConfigContribution` acceptent `save_actions?: "component" | "dashboard"`, `"dashboard"` par défaut. Avec `"component"`, le panneau ne dessine rien après le composant ; sinon il dessine un `ha-card` qui ne contient que le pied (messages et actions), avec le même code. La validation du SDK (et du faux hôte de test) rejette le champ sur un autre hook et toute autre valeur. Les contributions natives déclarent `"component"` dans `native-plugin.ts`.
- Alternative écartée : détecter à l'exécution si le composant a dessiné des actions (événement, propriété). Fragile au premier rendu et invisible pour l'auteur ; une déclaration est vérifiable par TypeScript.

### 3. Un rendu partagé du pied de carte dans `components/ha.ts`
`renderCardActions(draft, labels)` dessine :
- au-dessus des actions, les `messages` en `renderAlert()` (l'indication « Modifications non enregistrées » en texte secondaire plutôt qu'en `ha-alert`, pour ne pas alourdir) ;
- `<div class="card-actions">` avec `ha-button appearance="plain"` + `ha-svg-icon` `mdiRestore` (`draft.discard`), puis `ha-progress-button appearance="filled"` (`draft.save`).

Le gestionnaire suit HA : lire le bouton dans `currentTarget`, ignorer si `progress`, `progress = true`, `await draft.save()`, `actionSuccess()` pour `"success"`, `actionError()` pour `"error"` et `"partial"`, `progress = false`. `disabled` = `!dirty || saving`. Une région `role="status"` masquée visuellement reçoit « Enregistré » au succès (le bouton seul ne l'annonce pas).

Les onglets natifs l'importent ; il n'est pas exporté par le SDK, qui ne fournit pas d'élément de formulaire partagé (spec `ui-plugin-sdk`). La doc du contrat montre le gabarit HA pour les plugins tiers. Les chemins d'icônes (`mdiRestore`, `mdiCheckBold`) sont copiés en constantes plutôt qu'ajouter `@mdi/js`.

### 4. Résultat partiel affiché comme un échec
`SaveOutcome` `{ ok: false, configSaved: true }` donne `"partial"` : bouton rouge et avertissement `draft.config_saved_presets_failed` au-dessus des actions. Un bouton vert ferait croire que tout est appliqué, alors que des températures restent dans le brouillon.

### 5. Repli
- `ha-progress-button` absent : `ha-button` (ou `button`), libellé « Enregistrement… » pendant l'enregistrement, puis message `success`/`error` visible au-dessus des actions pendant 2 s (`draft.saved` est gardé pour ce cas).
- `ha-card` absent : le `.card` de repli de `native-tab.ts` reçoit le même pied.
- `ha-progress-button` est ajouté à `HA_CONTROLS` ; `ensureHaControls` le signale dans `defined`. Il n'est pas requis pour `loaded`.
- Le harnais de test du SDK fournit un `ha-progress-button` simulé avec `progress`, `actionSuccess()`, `actionError()` et l'état du résultat lisible par les tests.

### 6. Styles
Les styles du pied reprennent ceux de HA : `.card-actions { display: flex; justify-content: space-between; align-items: center; gap: 8px; border-top: 1px solid var(--divider-color); padding: 8px 16px 16px; }`. Les styles `.savebar` et le `padding-bottom` de zone sûre qu'ils portaient sont retirés ; le bas du contenu de la page garde `padding-bottom: max(16px, var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))`, pour que les actions de la dernière carte puissent passer au-dessus de la barre de navigation du système.

## Risks / Trade-offs
- [Sur un téléphone, une longue section oblige à défiler jusqu'au bas pour enregistrer] → c'est le comportement de HA ; la confirmation au départ avec un brouillon modifié reste, et `config-navigation-status` marque les sections modifiées dans le menu.
- [`ha-progress-button` peut ne pas être défini par la page de configuration que charge le chargeur sur certaines versions] → le repli de la décision 5 ; vérifier dans le conteneur de développement et, si besoin, charger la route `core` de `ha-panel-config` en plus de `automation`.
- [L'API `ha-progress-button` a changé (anciennes versions : `raised`, pas d'`appearance`)] → ne fixer que `appearance`, `progress`, `disabled` et les méthodes `actionSuccess`/`actionError`, présentes depuis longtemps ; les propriétés inconnues sont ignorées.
- [Point de contact avec `config-navigation-status`, qui met « Aller à <section> » dans la barre d'enregistrement] → ce bouton devient un message d'erreur avec action dans `messages` ; le second change livré réconcilie.
- [Les tests ciblent `.savebar .save` / `.discard`] → réécrire `panel-config.test.ts` et `ha-screens.test.ts` sur `.card-actions` dans le composant natif.

## Migration Plan
Changement du seul frontend et du SDK, livré dans une version. Ajout compatible pour les plugins : sans `save_actions`, un plugin tiers garde des actions (dans la carte du dashboard). Retour arrière : revenir à la version précédente du dashboard.
