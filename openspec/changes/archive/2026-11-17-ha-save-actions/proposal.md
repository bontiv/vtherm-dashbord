# Proposal

## Why
Dans les pages de configuration, **Enregistrer** et **Annuler les modifications** sont aujourd'hui dans une barre collée en bas de la page, hors de la carte de la section, avec des boutons dessinés à la main et un message texte « Enregistré. » après l'enregistrement. Home Assistant fait autrement dans ses propres pages de configuration (par exemple `/config/entity-id-format`) : les actions sont en pied de la carte qu'elles concernent (`card-actions` d'un `ha-card`), l'action secondaire à gauche en bouton discret, **Enregistrer** à droite en `ha-progress-button`, qui montre un indicateur pendant l'enregistrement puis devient vert avec une coche quand il réussit (rouge avec une icône d'alerte quand il échoue). Le dashboard doit suivre ce modèle pour paraître natif.

## What Changes
- **Actions dans la carte** : chaque section de configuration éditable porte ses actions en pied de sa carte, séparées du contenu par le trait de Home Assistant : à gauche « Annuler les modifications » (bouton `plain` avec l'icône de restauration), à droite « Enregistrer » (`ha-progress-button`, apparence `filled`). Les actions sont toujours affichées sur une configuration éditable ; elles sont désactivées tant que le brouillon n'a pas de modification.
- **Retour visuel de Home Assistant** : pendant l'enregistrement, le bouton montre l'indicateur de progression ; s'il réussit, il passe en vert avec la coche pendant deux secondes ; s'il est refusé, en rouge avec l'icône d'alerte. Le message texte « Enregistré. » disparaît ; une annonce discrète reste pour les lecteurs d'écran.
- **Messages près des actions** : l'indication « Modifications non enregistrées », les erreurs générales d'un enregistrement refusé et l'avertissement d'un enregistrement partiel (températures de preset non appliquées) s'affichent dans la carte, juste au-dessus des actions.
- **BREAKING (comportement)** : la barre d'enregistrement collée en bas de l'écran est supprimée, y compris sur mobile. Sur un téléphone, les actions sont en bas de la carte, comme dans Home Assistant.
- **Contrat des plugins** : les composants `general_config` et `thermostat_config` reçoivent l'état et les commandes du brouillon (modifié, en cours d'enregistrement, enregistrer, annuler) pour dessiner ces actions dans leur propre carte. Un composant qui déclare les dessiner lui-même les reçoit ; pour les autres, le dashboard dessine une carte d'actions sous le composant. Les onglets natifs utilisent le même mécanisme, sans privilège. Ajout compatible : un plugin tiers existant garde des actions.

## Capabilities

### New Capabilities
- `config-save-actions`: actions d'enregistrement et d'annulation d'une section de configuration : placement dans la carte, états du bouton Enregistrer (progression, succès, échec), messages associés, repli et accessibilité.

### Modified Capabilities
- `dashboard-panel`: la barre d'enregistrement fixe sur mobile est retirée ; l'exigence sur les zones sûres ne parle plus de cette barre mais du bas de la page.
- `ui-plugin-sdk`: le contexte des composants de configuration comprend l'état et les commandes du brouillon, et une contribution de configuration peut déclarer qu'elle dessine elle-même les actions d'enregistrement.

## Impact
- Frontend : `frontend/src/panel.ts` (suppression de `renderSaveBar` et des styles `.savebar`, état du brouillon transmis aux contributions, carte d'actions de repli, enregistrement qui renvoie un résultat), `frontend/src/components/ha.ts` (rendu des actions de carte avec `ha-progress-button` et ses replis), `frontend/src/native/native-tab.ts` (actions en pied de `ha-card`), `frontend/src/native/native-plugin.ts` (déclaration des contributions natives), `frontend/src/shell-translations.ts` (textes en/fr/de).
- SDK `@vtherm/dashboard-sdk` : `ConfigProps` (état du brouillon), champ de déclaration des contributions de configuration, validation, `HA_CONTROLS` (`ha-progress-button`), élément simulé dans le harnais de test.
- Python : aucun changement (les contributions sont déclarées et validées côté SDK).
- Tests : `frontend/test/panel-config.test.ts`, `ha-screens.test.ts`, tests du SDK.
- Documentation : `docs/user/configuration.md`, `docs/contributing/architecture.md`, `docs/plugins/theming.md`, pages du contrat des plugins, `CHANGELOG.md`.
- À coordonner avec `config-navigation-status`, dont le bouton « Aller à <section> » était prévu dans la barre d'enregistrement et va désormais près des actions de la carte, et avec `config-page-layout` et `field-help-diagrams`, qui modifient aussi la carte d'onglet de `native-tab.ts`.
