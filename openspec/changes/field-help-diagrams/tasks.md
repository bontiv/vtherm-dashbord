# Tasks

## 1. Contrat du SDK

- [ ] 1.1 Ajouter dans `packages/sdk/src/` (TypeScript) `FIELD_HELP_ELEMENT`, `FieldHelpProps` et l'union `DiagramId` des quatorze schémas, exportés par `index.ts` ; vérifier par un test de types qu'un identifiant inconnu ne compile pas (`npm run typecheck`)
- [ ] 1.2 Ajouter au harnais `packages/sdk/src/testing.ts` la version simplifiée de `vtherm-field-help` qui expose ses propriétés ; vérifier par un test Vitest qu'un onglet monté dans le harnais permet de lire `hint`, `info` et `diagram`
- [ ] 1.3 Régénérer la référence (`npm run docs:reference`), documenter le composant d'aide dans `docs/plugins/plugin-development.md` et `docs/plugins/testing.md` avec un exemple vérifié sous `docs/examples/typescript/`, en anglais ; vérifier `npm run check:reference` et `npm run check:docs`

## 2. Bibliothèque de schémas

- [ ] 2.1 Créer `frontend/src/components/diagrams/` (TypeScript, Lit `svg`) avec les quatorze schémas, viewBox 240×96, couleurs par variables du thème, libellés par clés `diagram.<id>.*` et nombres par le formateur régional ; chaque schéma déclare les clés VT qu'il lit, leurs valeurs d'exemple et leurs bornes, et cite en commentaire le fichier de Versatile Thermostat qu'il illustre ; vérifier par un test qu'aucun schéma ne contient de couleur figée ni de texte littéral
- [ ] 2.2 Paramétrer chaque schéma par `(values, focus)` : tracé recalculé depuis les valeurs, repli sur l'exemple marqué « exemple » pour une valeur vide, invalide ou hors bornes, mise en évidence de l'élément du réglage en focus, légende qui reprend les valeurs ; vérifier par des tests les scénarios « Ouverture minimale modifiée », « Plusieurs réglages dans un schéma », « Valeur vide ou invalide » et « Focus sur la durée maximale »
- [ ] 2.3 Ajouter le conteneur de schéma (`role="img"`, `aria-label` = légende, titre visible, `width: 100%`) et le signalement en mode développement d'un identifiant inconnu ; vérifier par un test de rendu le titre, la légende et le repli sans schéma
- [ ] 2.4 Ajouter les textes `diagram.<id>.title|caption|<libellés>` en en/fr/de dans `scripts/native-texts.ts`, régénérer (`npm run catalogs:generate`) ; vérifier `npm run check:catalogs` et le test de complétude des catalogues

## 3. Composant d'aide de champ

- [ ] 3.1 Créer l'élément `vtherm-field-help` (TypeScript, Lit) : indication, `ha-icon-button` (i) avec libellé accessible « Aide : <champ> » traduit, panneau en ligne avec `aria-expanded`/`aria-controls`, fermeture par Échap et retour du focus, emplacement `diagram` pour un SVG fourni, repli sur un bouton HTML si `ha-icon-button` manque ; vérifier par des tests Vitest l'ouverture, la fermeture au clavier, l'indépendance de deux panneaux et le repli
- [ ] 3.2 Vérifier la cible tactile et l'absence de débordement à 360 px en ajoutant les cas au test des styles étroits (`frontend/test/narrow-styles.test.ts`)
- [ ] 3.3 Ajouter les textes du composant (libellé du bouton) aux traductions du shell en en/fr/de ; vérifier `frontend/test/shell-translations.test.ts`

## 4. Aide des onglets natifs

- [ ] 4.1 Dans `frontend/src/native/native-tab.ts`, appliquer la règle de repli (`helper` = `hint` ?? `help` ; panneau = `info` ?? `help` s'il diffère ; (i) seulement si panneau ou schéma) et afficher `vtherm-field-help` pour chaque champ, dans sa tuile de la grille, en mode Home Assistant et en repli HTML ; vérifier par un test que l'ouverture d'un panneau ne déplace pas les autres tuiles (scénario « Panneau sans déplacement ») ; vérifier par des tests dans `frontend/test/native-tabs.test.ts` les trois cas de la spec `field-help` et le scénario « Indication courte prioritaire » de `ha-native-controls`
- [ ] 4.2 Ajouter la table `FIELD_DIAGRAMS` (clé VT → schéma), avec `stagger` limité aux sous-jacents `over_switch` ; vérifier par un test chaque scénario d'association de la spec `field-help`
- [ ] 4.3 Passer au composant d'aide les valeurs effectives du brouillon (propres ou centrales) et la clé du champ en focus, et garder le panneau ouvert pendant la saisie ; vérifier par des tests dans `frontend/test/native-tabs.test.ts` le redessin à la modification d'un champ et le scénario « Valeur héritée »
- [ ] 4.4 Ajouter la table `GROUP_DIAGRAMS` et la tuile de schéma d'un groupe dans la grille : après le dernier champ courant du groupe, sur deux colonnes quand la grille en a au moins trois, après les pastilles d'une section héritée, et le schéma dans le panneau d'un champ du groupe rangé dans « Paramètres avancés » ; vérifier par des tests les scénarios « Groupe de vanne sur écran large », « Téléphone », « Section TPI héritée » et « Champ avancé d'un groupe »
- [ ] 4.5 Écrire en en/fr/de dans `scripts/native-texts.ts` les `hint.<clé>` de tous les champs natifs et les `info.<clé>` des champs à schéma ou à aide insuffisante, en langage simple (une phrase par indication) ; régénérer les catalogues ; vérifier `npm run check:catalogs` et relire le rendu des onglets TPI, vanne, ouverture et avancé dans le devcontainer
- [ ] 4.6 Mettre à jour `docs/plugins/native-plugins.md` et `docs/plugins/internationalization.md` (clés `hint.*`, `info.*`, `diagram.*`, règle de repli), en anglais ; vérifier `npm run check:docs`

## 5. Vérification d'ensemble

- [ ] 5.1 Mettre à jour la documentation utilisateur de l'aide des champs dans `docs/user/` et le `CHANGELOG.md` ; vérifier `npm run check:docs`
- [ ] 5.2 Exécuter `npm run check` et `npm test` sans erreur
- [ ] 5.3 Dans le devcontainer, ouvrir un thermostat de chaque type en anglais, français et allemand, en thème clair et sombre, sur largeur bureau et 360 px, et vérifier l'indication, le (i), le panneau, les schémas et les tuiles de schéma ; consigner les captures d'écran utiles dans la description de la demande de fusion
