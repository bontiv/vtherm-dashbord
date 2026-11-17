# Design

## Context
Voir proposal.md (Why). État actuel utile pour la solution :

- **L'assistant** `vtherm-create-wizard` (`frontend/src/components/create-wizard.ts`) :
  - possède son brouillon `ConfigDraft("new", …)`, qu'il recrée entièrement à chaque changement de type ;
  - instancie lui-même les éléments des onglets natifs ;
  - appelle `api.create(type, changes)`.

  Le panel l'affiche à la place de la page quand `route.thermostat === NEW_THERMOSTAT`, sans menu. La configuration centrale passe par `/thermostats/new/central`, depuis le bouton de la page « Configuration centrale » (`core-pages.ts`).
- **La page de configuration** :
  - `resolveNavigation` construit le menu à partir des contributions `thermostat_config` / `general_config` visibles ;
  - `contextOf` lit les valeurs du brouillon de l'entrée dans `ConfigSession` ;
  - `propsOf` donne `values`, `errors` et `proposeChanges` à chaque section ;
  - `entryOf(route)` désigne le brouillon ;
  - `confirmLeave` protège les brouillons modifiés.
- **La visibilité des sections centrales** dépend déjà de `values.thermostat_type === CENTRAL_TYPE`. Un brouillon nouveau de type central les rend donc visibles sans autre condition.
- **Le serveur** (`vtherm_dashboard/create`) accepte n'importe quels onglets de `TAB_ORDER`. Depuis `central-config-flags`, il soumet les champs non modifiés avec les valeurs proposées par VT.
- **Les changements prérequis** :
  - `ha-save-actions` met Enregistrer et Annuler dans le pied de la carte de chaque section, avec l'état du brouillon et ses commandes ;
  - `config-navigation-status` calcule le statut de chaque section (manquants, erreur, central) et l'affiche dans le menu.

## Goals / Non-Goals

**Goals:**
- Un seul modèle de page pour créer et modifier : même menu, même brouillon, mêmes actions, mêmes statuts.
- Une liste de sections de création qui vient des définitions des onglets natifs, sans nouvelle règle de visibilité dans le SDK.

**Non-Goals:**
- Permettre aux plugins tiers de contribuer à la création, ce qui demanderait une déclaration dans le SDK.
- Configurer les fonctionnalités ou les températures de preset avant la création. Les températures ne s'appliquent qu'à une entité `number` existante.
- Garder le brouillon de création après un rechargement du navigateur : les brouillons vivent avec le panel, comme aujourd'hui.

## Decisions

**D1. Sections de création déclarées dans `tab-definitions.ts`.**
- `CREATION_TABS = { thermostat: ["main", "type", "tpi", "advanced"], central: ["main", "tpi", "advanced"] }`, filtré par `applies(values, kind)`. L'ordre de la liste fait foi : Principal vient en premier, puis les sections qui dépendent du type (Sous-jacents, TPI). Le type lui-même se choisit avant, sur l'écran de D2.
- Les contributions natives correspondantes sont retrouvées par leur identifiant (`thermostatContributionId` / `centralContributionId`).
- *Alternative écartée* : un drapeau `creation` dans le contexte de visibilité du SDK. Il aurait fallu un champ de contribution pour les plugins tiers, et on en sort justement.

**D2. Navigation : un thermostat « nouveau » et un filtre de création.**
- `NavigationInput` reçoit une option `creation?: { kind; entries: readonly string[] }`. Quand elle est présente, `resolveNavigation` ne garde que ces entrées, dans cet ordre.
- Pour l'onglet Thermostats, la route `/thermostats/new/<entrée>` produit `thermostat = { id: "new", name: t("creation.title") }` sans sélecteur de thermostat dans le menu. Le fil d'ariane devient `Thermostats > Nouveau thermostat > <section>`, et une entrée inconnue retombe sur la première section avec `route_unknown`.
- La route `/thermostats/new`, sans entrée, est l'écran de choix du type : `NavigationModel.mode` vaut `type`, sans menu ni section courante, et le fil d'ariane est `Thermostats > Nouveau thermostat`. Le segment « Nouveau thermostat » des sections pointe vers cette route, ce qui est le retour au choix du type. Le brouillon n'est pas touché par ce passage : changer de type garde les valeurs compatibles (D4).
- L'écran est un élément `vtherm-type-choice` (`components/type-choice.ts`) : un titre, puis trois cartes `ha-card` (repli : `div`) en grille `repeat(auto-fit, minmax(240px, 1fr))`, une par type, et un bouton Annuler. Chaque carte a une icône (`ha-icon`), un titre, un texte et des exemples d'appareils (`creation.type.<type>.*`), `role="button"`, `tabindex="0"`, `aria-pressed` pour le type que l'utilisateur a déjà choisi pour ce brouillon (bordure `--primary-color`), jamais pour le type par défaut du brouillon : le panel garde le brouillon pour lequel un type a été choisi, et un nouveau brouillon, après Annuler, repart sans carte sélectionnée, `aria-labelledby` et `aria-describedby`. Cliquer ou Entrée/Espace choisit le type (`changeType` s'il change) et ouvre directement la première section : il n'y a plus de bouton Continuer. Seules les variables CSS du thème donnent les couleurs.
- Pour l'onglet de configuration, l'option est donnée tant qu'un brouillon de création centrale existe. La page « Configuration centrale » qui propose la création est alors masquée.
- *Alternative écartée* : une route propre `/create/...` hors des onglets. Le fil d'ariane et le menu de l'onglet seraient perdus.

**D3. Brouillons de création dans `ConfigSession`.**
- Le panel crée un brouillon à la demande :
  - `startCreation(kind, type)` crée une `ConfigDraft` sous la clé `new:thermostat` ou `new:central` ;
  - `creation(kind)` la renvoie ;
  - `create(kind)` l'envoie.
- `entryOf(route)` renvoie cette clé pour une route de création. `valuesOf`, `propsOf`, `contextOf` et `confirmLeave` fonctionnent alors sans changement de forme.
- `create(kind)` envoie à `api.create` les changements du brouillon, plus un onglet vide pour chaque section de création qui s'applique (cela remplace la liste de `central-config-flags`, design D3). Le premier enregistrement doit en effet passer par ces étapes pour que VT les complète.
- En cas de succès : le brouillon est retiré, la liste des thermostats est relue, puis le panel navigue vers `/thermostats/<id>` (vue d'ensemble) ou vers la configuration générale. En cas d'échec : `draft.setErrors(errors)`, comme pour un enregistrement.

**D4. Changement de type par le brouillon.**
- `thermostat_type` reste la valeur de départ du brouillon. Le choix du type s'affiche sur l'écran de choix du type (D2), et non plus en tête de l'onglet natif `type`, qui ne garde que ses champs.
- Changer de type recrée le brouillon avec le nouveau type, puis repropose les changements déjà saisis, filtrés :
  - une clé est gardée si un formulaire des sections de création du nouveau type la contient (`fieldsOf` des layouts de `CREATION_TABS`) ;
  - une entité n'est gardée que si son domaine est accepté (`domainsOf`) ;
  - pour une liste d'entités, seules les entités acceptées restent.
- Les cartes de type de `field-help-diagrams` se placent sur l'écran de choix du type et non plus dans l'assistant.

**D5. Actions et statuts empruntés aux changements prérequis.**
- Pour une section de création, le panel donne aux actions de carte de `ha-save-actions` :
  - le libellé « Créer » ;
  - la commande `create(kind)` ;
  - une action secondaire « Annuler » qui abandonne la création, retire le brouillon sans confirmation et revient à la liste, ou à la page « Configuration centrale ».
- Créer est actif dès qu'aucun champ obligatoire ne manque, même sans modification : un brouillon nouveau n'a pas d'« état modifié » qui aurait du sens.
- Les statuts de `config-navigation-status` (manquants, erreur, central) s'appliquent sans changement. La liste des champs manquants de toutes les sections s'affiche, avec le texte `creation.missing`, dans une alerte `ha-alert` de type `warning` (repli : le `div` d'alerte de `renderAlert`) en haut de la page de configuration, avant la carte de la section, et disparaît quand plus rien ne manque. Elle n'est plus dans les messages des actions de la carte. Elle ne s'affiche pas sur l'écran de choix du type.
- Les champs obligatoires vides de la section courante, les mêmes que ceux de l'alerte (`creationMissing`), sont donnés à l'onglet natif par la propriété `missing` (clés des champs), pour une création seulement. L'onglet les affiche en rouge avec `var(--error-color)` : variables `--mdc-text-field-*` et `--mdc-select-*` sur le `ha-selector` (il n'a pas d'état invalide à lui), `aria-invalid="true"`, et la ligne `creation.required` (« Obligatoire ») liée par `aria-describedby`, pour que la couleur ne soit pas le seul signe. Le repli HTML met `aria-invalid="true"` (bordure d'erreur existante), le libellé en `--error-color` et la même ligne. Le menu ne reçoit pas de marque : le statut des sections vient de `config-navigation-status`.

**D6. Suppression de l'assistant.**
`create-wizard.ts`, son élément et `CREATED_EVENT` / `CANCELLED_EVENT` disparaissent. Les textes utiles sont repris sous `creation.*` : titre, Créer, en cours, manquants, refusé. Le bouton de la page « Configuration centrale » appelle `startCreation("central")` au lieu de naviguer vers `/thermostats/new/central`, qui devient un itinéraire inconnu.

## Risks / Trade-offs
- [Ordre des changements : `ha-save-actions` et `config-navigation-status` ne sont pas encore appliqués] → Les deux sont prérequis (voir tasks.md). Si l'un d'eux est abandonné, D5 se rabat sur la barre d'enregistrement actuelle (`renderSaveBar`) avec le libellé Créer, et sur un compteur de manquants calculé comme `missing()` dans l'assistant.
- [`field-help-diagrams` vise `create-wizard.ts`] → Ses tâches 5.x sont à réécrire pour la section Type. Si ce changement est appliqué avant, ses cartes sont déplacées par la tâche 6.3 ci-dessous.
- [Deux changements modifient l'exigence « Création d'un thermostat »] → Le bloc MODIFIED de ce changement reprend le scénario ajouté par `central-config-flags`. Il faut archiver `central-config-flags` d'abord.
- [Un plugin tiers lit `thermostatId` vide ou `"new"`] → Aucune contribution tierce n'est rendue pendant la création (D1, D2).
- [Rechargement pendant la création centrale] → Le brouillon est perdu et la page « Configuration centrale » revient, conformément au scénario « Configuration centrale absente ».
