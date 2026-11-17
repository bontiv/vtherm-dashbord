# field-help Specification

## Purpose
Aider l'utilisateur à comprendre chaque champ de configuration sur la page même, par une indication courte, une explication détaillée et un schéma explicatif, dans sa langue et avec le thème de Home Assistant.

## Requirements

### Requirement: Trois niveaux d'aide par champ
Un champ SHALL pouvoir avoir une indication courte (clé `hint.<clé>`), une explication détaillée (clé `info.<clé>`) et un schéma explicatif. L'indication SHALL être affichée en permanence sous le contrôle. L'explication et le schéma SHALL être affichés à la demande.

#### Scenario: Champ avec ses trois niveaux
- **WHEN** l'onglet principal d'un thermostat est affiché
- **THEN** le champ de durée de cycle montre son indication sous le contrôle, et un bouton (i) donne accès à son explication et au schéma du cycle de chauffe

#### Scenario: Champ sans aide propre
- **WHEN** un champ n'a ni `hint.<clé>` ni `info.<clé>` ni schéma, mais a `help.<clé>` dans les textes de Versatile Thermostat
- **THEN** le texte `help.<clé>` est affiché sous le contrôle et aucun bouton (i) n'est affiché

### Requirement: Repli sur l'aide de Versatile Thermostat
Quand un champ n'a pas d'indication propre, l'indication affichée SHALL être l'aide `help.<clé>` issue des traductions de Versatile Thermostat. Quand il a une indication propre mais pas d'explication, l'aide de Versatile Thermostat SHALL servir d'explication détaillée si elle diffère de l'indication.

#### Scenario: Indication propre et aide de VT
- **WHEN** un champ a `hint.<clé>` et `help.<clé>` mais pas `info.<clé>`
- **THEN** l'indication est affichée sous le contrôle et le panneau d'aide contient le texte `help.<clé>`

### Requirement: Bouton et panneau d'aide
Un champ qui a une explication ou un schéma SHALL avoir un bouton (i) qui ouvre et ferme un panneau d'aide placé sous le champ, dans le flux de la page. Le panneau SHALL contenir le schéma, s'il existe, puis l'explication. Le bouton SHALL indiquer son état ouvert ou fermé aux technologies d'assistance et désigner le panneau qu'il contrôle.

#### Scenario: Ouverture au toucher
- **WHEN** l'utilisateur touche le bouton (i) d'un champ sur un écran tactile
- **THEN** le panneau d'aide s'ouvre sous le champ, sans dépendre du survol

#### Scenario: Fermeture au clavier
- **WHEN** le panneau d'aide est ouvert et que l'utilisateur appuie sur Échap avec le focus dans le champ ou le panneau
- **THEN** le panneau se ferme et le focus revient sur le bouton (i)

#### Scenario: Plusieurs panneaux
- **WHEN** l'utilisateur ouvre l'aide d'un deuxième champ
- **THEN** le panneau du premier champ reste dans son état, chaque panneau étant indépendant

### Requirement: Bibliothèque de schémas explicatifs
Le dashboard SHALL fournir une bibliothèque de schémas identifiés par un nom stable, chacun illustrant ce que fait un réglage avec les valeurs saisies, complétées par des valeurs d'exemple pour les grandeurs mesurées (températures, temps). Elle SHALL contenir au moins : `tpi_cycle`, `tpi_formula`, `min_on_off`, `tpi_thresholds`, `valve_curve`, `send_threshold`, `window_delay`, `window_slope`, `motion`, `safety`, `override`, `failure`, `correction` et `stagger`.

#### Scenario: Schéma inconnu
- **WHEN** un champ désigne un schéma absent de la bibliothèque
- **THEN** le panneau d'aide affiche l'explication sans schéma et le mode développement signale l'identifiant inconnu

### Requirement: Schémas interactifs
Un schéma SHALL être dessiné avec les valeurs effectives du brouillon des réglages qu'il illustre (valeurs propres, ou valeurs centrales quand la section hérite) et SHALL se redessiner à chaque modification de l'un de ces réglages, sans enregistrement. Quand un réglage n'a pas de valeur utilisable, le schéma SHALL utiliser une valeur d'exemple et l'indiquer.

#### Scenario: Ouverture minimale modifiée
- **WHEN** le panneau d'aide de l'ouverture minimale d'un thermostat sur vanne est ouvert et que l'administrateur passe l'ouverture minimale de 10 à 30
- **THEN** le palier « ouverture minimale » de la courbe `valve_curve` monte à 30 % et son libellé affiche 30 %

#### Scenario: Plusieurs réglages dans un schéma
- **WHEN** l'administrateur modifie le seuil d'ouverture alors que le schéma `valve_curve` est affiché pour l'ouverture minimale
- **THEN** la limite « fermée en dessous » du schéma se déplace aussi

#### Scenario: Valeur héritée
- **WHEN** l'onglet TPI d'un thermostat qui utilise la configuration TPI centrale affiche le schéma `tpi_formula`
- **THEN** le schéma utilise les coefficients de la configuration centrale

#### Scenario: Valeur vide ou invalide
- **WHEN** un réglage illustré est vide ou hors de ses limites
- **THEN** le schéma garde une valeur d'exemple pour ce réglage, marquée « exemple », et ne provoque pas d'erreur

### Requirement: Mise en évidence du réglage en cours
Dans un schéma qui illustre plusieurs réglages, l'élément qui correspond au champ dont l'aide est ouverte, ou au champ qui a le focus, SHALL être mis en évidence par rapport aux autres.

#### Scenario: Focus sur la durée maximale
- **WHEN** le schéma `window_slope` est affiché et que le focus est dans le champ de durée maximale de détection
- **THEN** la durée maximale est mise en évidence dans le schéma, les seuils restant visibles en retrait

### Requirement: Schéma visible pendant la saisie
Le panneau d'aide SHALL rester ouvert quand l'administrateur modifie un champ, et s'ouvrir dans l'emplacement du champ sans déplacer les autres champs de la section.

#### Scenario: Panneau sans déplacement
- **WHEN** l'administrateur ouvre l'aide d'un champ sur un écran large
- **THEN** les autres champs de la section gardent leur place dans la grille

### Requirement: Schéma d'un groupe de champs
Un groupe de champs liés à un même schéma SHALL afficher ce schéma dans la grille de la section, après les champs du groupe, visible sans ouvrir d'aide : à côté des champs sur un écran large, sous les champs sur un écran étroit. Une section héritée SHALL afficher le schéma de son groupe après les valeurs centrales. Un champ du groupe rangé dans « Paramètres avancés » SHALL montrer le schéma dans son panneau d'aide.

#### Scenario: Groupe de vanne sur écran large
- **WHEN** l'onglet type d'un thermostat sur vanne est affiché sur un écran de 1440 px de large
- **THEN** le schéma `valve_curve` est affiché sur deux colonnes de la grille, à côté des champs d'ouverture, et se redessine pendant leur saisie

#### Scenario: Téléphone
- **WHEN** le même onglet est affiché sur un écran de 375 px de large
- **THEN** le schéma est affiché sous les champs d'ouverture, dans la largeur de la page

#### Scenario: Section TPI héritée
- **WHEN** l'onglet TPI d'un thermostat qui utilise la configuration TPI centrale est affiché
- **THEN** le schéma `tpi_formula` est affiché après les valeurs centrales

#### Scenario: Champ avancé d'un groupe
- **WHEN** l'administrateur ouvre l'aide du seuil TPI haut dans « Paramètres avancés »
- **THEN** le panneau d'aide du champ montre le schéma `tpi_thresholds`

### Requirement: Association des schémas aux champs natifs
Chaque champ natif dont le réglage est illustré par un schéma de la bibliothèque SHALL afficher ce schéma dans son panneau d'aide. Les scénarios ci-dessous fixent l'association de chaque schéma.

#### Scenario: Schémas du TPI
- **WHEN** l'utilisateur ouvre l'aide de la durée de cycle, des coefficients TPI, des délais minimaux d'activation et de désactivation ou des seuils TPI
- **THEN** le panneau montre respectivement `tpi_cycle`, `tpi_formula`, `min_on_off` ou `tpi_thresholds`

#### Scenario: Schémas de la régulation
- **WHEN** l'utilisateur ouvre l'aide des ouvertures minimales et maximales, du seuil d'ouverture ou de la fermeture maximale d'une vanne, du seuil ou de la période de régulation, ou du mode de régulation automatique
- **THEN** le panneau montre `valve_curve` pour les champs de vanne, `send_threshold` pour le seuil et la période, `correction` pour le mode de régulation

#### Scenario: Schémas des fonctionnalités
- **WHEN** l'utilisateur ouvre l'aide des délais d'ouverture, des seuils ou de la durée maximale de détection automatique d'ouverture, des délais de mouvement, du délai ou des pourcentages de sécurité, de la durée de dérogation manuelle, ou des seuils, du délai et de la tolérance de panne de chauffage
- **THEN** le panneau montre respectivement `window_delay`, `window_slope`, `motion`, `safety`, `override` ou `failure`

#### Scenario: Plusieurs interrupteurs
- **WHEN** l'utilisateur ouvre l'aide des entités sous-jacentes d'un thermostat sur interrupteur
- **THEN** le panneau montre `stagger`, qui illustre le décalage des démarrages entre interrupteurs

#### Scenario: Schéma d'une vanne
- **WHEN** l'utilisateur ouvre l'aide du seuil d'ouverture d'un thermostat sur vanne
- **THEN** le panneau montre la courbe de l'ouverture envoyée en fonction de l'ouverture demandée, avec l'ouverture minimale, l'ouverture maximale et la zone fermée

### Requirement: Schémas lisibles dans tous les thèmes et langues
Les schémas SHALL utiliser les variables de couleur du thème de Home Assistant, sans couleur figée, et leurs libellés SHALL provenir du catalogue de traductions. Chaque schéma SHALL avoir un titre et une légende textuelle annoncés aux technologies d'assistance. Les nombres d'exemple SHALL suivre les formats régionaux de l'utilisateur.

#### Scenario: Thème clair
- **WHEN** l'utilisateur passe du thème sombre au thème clair
- **THEN** les tracés, axes et libellés des schémas prennent les couleurs du nouveau thème sans rechargement

#### Scenario: Libellés en allemand
- **WHEN** la langue de l'utilisateur est l'allemand
- **THEN** le titre, la légende et les libellés du schéma `tpi_formula` sont en allemand et ses nombres utilisent la virgule décimale

#### Scenario: Lecteur d'écran
- **WHEN** un lecteur d'écran atteint un schéma
- **THEN** il lit son titre et sa légende textuelle, qui reprend les valeurs des réglages illustrés

### Requirement: Schémas adaptés aux écrans étroits
Un schéma SHALL s'adapter à la largeur disponible sans débordement horizontal, sur un écran de 360 px de large ou plus, et ses libellés SHALL rester lisibles.

#### Scenario: Téléphone
- **WHEN** l'aide d'un champ est ouverte sur un écran de 360 px de large
- **THEN** le schéma tient dans la largeur du panneau et la page ne défile pas horizontalement

### Requirement: Textes d'aide des plugins natifs
Les plugins natifs SHALL fournir, en anglais, en français et en allemand, une indication courte en langage simple pour chacun de leurs champs, et une explication détaillée pour chaque champ associé à un schéma ou dont l'aide de Versatile Thermostat ne suffit pas à choisir une valeur. Une indication SHALL tenir en une phrase.

#### Scenario: Catalogues complets
- **WHEN** la vérification des traductions s'exécute
- **THEN** chaque clé `hint.*`, `info.*` et `diagram.*` d'un plugin natif existe dans ses trois catalogues

### Requirement: Composant d'aide pour les plugins
Le dashboard SHALL mettre à la disposition des plugins, natifs et tiers, un composant d'aide de champ qui affiche l'indication, le bouton (i) et le panneau d'aide. Un plugin SHALL pouvoir lui donner un schéma de la bibliothèque par son identifiant avec les valeurs de ses réglages, ou son propre schéma.

#### Scenario: Plugin tiers avec un schéma de la bibliothèque
- **WHEN** un plugin tiers affiche le composant d'aide à côté de son champ avec le schéma `tpi_cycle` et ses propres textes traduits
- **THEN** l'aide de son champ a la même apparence et le même comportement que celle d'un champ natif

#### Scenario: Plugin tiers avec son propre schéma
- **WHEN** un plugin tiers fournit son propre schéma au composant d'aide
- **THEN** ce schéma est affiché dans le panneau d'aide à la place d'un schéma de la bibliothèque
