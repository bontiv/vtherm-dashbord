# Tasks

## 1. Grille de champs

- [ ] 1.1 Remplacer l'empilement de `frontend/src/native/native-tab.ts` par la grille `auto-fill, minmax(240px, 1fr)`, retirer la largeur maximale de la carte et marquer `wide` les listes, gabarits, textes multilignes et commandes ; vérifier par des tests de rendu les scénarios « Écran large » et « Champ de liste », et par le test des styles étroits le scénario « Téléphone »

## 2. Paramètres avancés

- [ ] 2.1 Ajouter `ADVANCED_FIELDS` dans `frontend/src/native/tab-definitions.ts` selon la spec « Classement des champs natifs », y verser les `extra` actuels, et partitionner le rendu en courants puis « Paramètres avancés (N) » ouvert en cas d'erreur ou de valeur obligatoire manquante ; vérifier par des tests les scénarios « Champs avancés du TPI », « Champ avancé refusé » et « Champ courant »
- [ ] 2.2 Ajouter le texte « Paramètres avancés ({count}) » au pluriel en en/fr/de ; vérifier `frontend/test/shell-translations.test.ts`

## 3. Présentation de l'héritage

- [ ] 3.1 Dessiner l'option d'héritage comme l'interrupteur « Personnaliser pour ce thermostat » qui écrit l'inverse de l'option de VT, en gardant l'état forcé sans configuration centrale ; vérifier par des tests les scénarios « Section héritée » et « Personnalisation » et le scénario existant « Pas de configuration centrale »
- [ ] 3.2 Remplacer `renderInherited()` par les pastilles (noms d'entité, fiche par `hass-more-info`, mention des valeurs par défaut de VT) et le lien vers la section centrale ; vérifier par des tests les scénarios « Valeur centrale vide » et « Lien avec brouillon »
- [ ] 3.3 Ajouter les textes (interrupteur, lien, mention) en en/fr/de et mettre à jour la documentation utilisateur de l'héritage dans `docs/` ; vérifier `npm run check:docs`

## 4. Méthode de détection d'ouverture

- [ ] 4.1 Écrire `windowMethod` et la liste des clés de chaque méthode ; vérifier par des tests unitaires la méthode déduite des valeurs
- [ ] 4.2 Dessiner le choix de méthode (sélecteur en boutons de Home Assistant, replis), n'afficher que les champs de la méthode et retirer du brouillon les clés propres de l'autre méthode ; vérifier par des tests les scénarios de « Choix de la méthode de détection d'ouverture » et de `core_window`, dont « Méthode capteur sans capteur »
- [ ] 4.3 Ajouter les textes en en/fr/de, régénérer les catalogues et mettre à jour `docs/plugins/native-plugins.md` et le `CHANGELOG.md` ; vérifier `npm run check:catalogs` et `npm run check:docs`

## 5. Vérification d'ensemble

- [ ] 5.1 Exécuter `npm run check` et `npm test` sans erreur
- [ ] 5.2 Dans le devcontainer, parcourir toutes les sections d'un thermostat de chaque type et de la configuration générale à 1440 px, 1024 px et 360 px, thème clair et sombre, puis enregistrer une section personnalisée et une section héritée et contrôler la configuration de VT
