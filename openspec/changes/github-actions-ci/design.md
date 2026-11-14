# Design

## Context
Le dépôt ne contient pas encore de code ni de `.github/`. Ce change est appliqué après `ui-plugin-dashboard` et prévaut sur lui pour les workflows. La disposition cible vient du change `ui-plugin-dashboard` : `custom_components/vtherm_dashboard/` (Python), `frontend/` et `packages/sdk/` (workspaces npm à la racine), `requirements-dev.txt` (Python 3.14, `pytest-homeassistant-custom-component`). Le devcontainer fournit déjà l'environnement local ; l'intégration continue le reproduit. Voir proposal.md pour la motivation.

## Goals / Non-Goals
**Goals:**
- Mêmes commandes en local et en intégration continue (scripts du `package.json` racine et de pytest).
- Un seul endroit où construction et tests sont définis, réutilisé par la release.
- Droits du jeton réduits au strict nécessaire pour chaque job.

**Non-Goals:**
- Codecov et seuil de couverture : possibles plus tard, sans changer ces specs.

## Decisions

### 1. Quatre fichiers, un rôle chacun
`ci.yml` (construction, tests, vérifications, couverture, hassfest, HACS), `codeql.yml` (SAST), `release.yml` (tag, archive, GitHub Release, publication npm), `dependabot.yml`. CodeQL est séparé car son cycle de vie diffère (planification, droit `security-events`).
- *Alternative : un seul workflow* : plus court, mais les droits et les déclencheurs se mélangent. Rejetée.

### 2. Déclencheurs de `ci.yml`
`push` sur `branches: ['**']` (les tags sont exclus), `pull_request`, et `workflow_call`. Un groupe de concurrence par référence annule les exécutions obsolètes, sauf sur la branche par défaut.
- Une pull request issue du même dépôt déclenche deux exécutions (push et pull_request). C'est le prix de l'exigence « tout push ou pull request » ; l'annulation par concurrence limite le coût. Pas de `pull_request_target`, pour ne jamais exécuter du code de fork avec des secrets.
- Les tags sont traités par `release.yml`, qui appelle `ci.yml`. Évite deux exécutions identiques sur un tag.

### 3. Jobs de `ci.yml`
- `python` : Python 3.14, `pip install -r requirements-dev.txt`, `pytest --cov` avec rapports `xml` et `html`.
- `frontend` : Node.js LTS (`.nvmrc` ou `engines`), `npm ci`, `npm run build`, `npm test -- --coverage`.
- `hassfest` : `home-assistant/actions/hassfest`, qui valide `manifest.json`, les traductions et la structure de l'intégration.
- `hacs` : `hacs/action` avec `category: integration`, qui valide `hacs.json` et la structure du dépôt. Ces deux jobs n'ont besoin d'aucune installation de dépendances et s'exécutent en parallèle de `python` et `frontend`.
- `checks` : exécute la commande de vérification locale unique définie par `ui-plugin-dashboard` (conventions Python et TypeScript, documentation). Les tâches 3.1 et 3.2 de ce change définissent la commande, ce change la branche dans la CI.
- Dépendances de test : `vtherm_api` vient de son index de paquets (`requirements`). Les dépôts Versatile Thermostat et HACS sont obtenus dans `external/` à des références fixées dans `external-refs.txt` (fichier versionné, un tag ou un commit par dépôt), lu aussi par `post-create.sh`.
- Cache : `actions/setup-python` (`cache: pip`) et `actions/setup-node` (`cache: npm`).

### 4. Couverture sans service externe
`pytest-cov` (`--cov=custom_components/vtherm_dashboard`) et `@vitest/coverage-v8`. Les rapports (`coverage.xml`, `lcov.info`, HTML) sont des artefacts publiés avec `if: always()`, et un pourcentage par langage est écrit dans `$GITHUB_STEP_SUMMARY`. Aucun seuil : le projet n'a pas de base de départ.
- *Alternative : Codecov* : commentaires de pull request et historique, mais un compte, un jeton et un tiers de plus. Reportée.

### 5. SAST : CodeQL
Matrice `python` et `javascript-typescript`, `build-mode: none` (pas de compilation pour ces langages), `fail-fast: false`. Déclencheurs : push, pull request, `cron` hebdomadaire. Droits : `contents: read`, `security-events: write`. C'est l'outil SAST de GitHub ; la détection de secrets et Dependabot alerts se règlent dans les paramètres du dépôt, pas par workflow.
- *Alternative : Semgrep ou SonarCloud* : hors « outils fournis par GitHub ». Rejetée.

### 6. Validation du tag
GitHub filtre les tags par glob, pas par regex. Le déclencheur est donc large (`tags: ['v*']`) et le premier job valide le tag avec cette expression :

```
^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-((0|[1-9][0-9]*|[0-9]*[a-zA-Z-][0-9a-zA-Z-]*)(\.(0|[1-9][0-9]*|[0-9]*[a-zA-Z-][0-9a-zA-Z-]*))*))?$
```

C'est la regex officielle de semver.org, préfixée par `v`, sans le groupe des métadonnées de build (`+...`). Raison : NPM les ignore, Home Assistant les valide mal, et le même texte doit désigner une seule version dans les deux. Le tag est passé au script par une variable d'environnement, jamais interpolé dans le shell. Un tag invalide fait échouer le job, et tous les suivants en dépendent par `needs`.

**Branche du tag** : le même job vérifie que le commit du tag appartient à `master` (`git merge-base --is-ancestor <sha> origin/master`, avec un checkout complet) quand le tag n'a pas de suffixe de préversion. Un tag de préversion saute ce contrôle, ce qui permet d'éprouver une release depuis une branche de fonctionnalité. Le critère est l'appartenance à l'historique de `master`, pas la branche d'où le tag a été poussé, parce que Git ne retient pas cette information. Un tag stable posé sur un commit déjà fusionné est donc accepté.
- *Alternative : protection de tags GitHub (rulesets)* : empêche de créer le tag, mais elle ne sait pas distinguer stable et préversion par le contenu du commit, et elle est un réglage hors dépôt. Retenue en complément seulement : le contrôle du workflow reste la règle.

### 7. Cohérence tag et manifest, puis archive `zip_release`
Le tag est la décision de publier ; les fichiers du dépôt restent la source des versions. Le job `validate` lit `version` dans `custom_components/vtherm_dashboard/manifest.json` et dans chaque `package.json` du monorepo (racine, `packages/sdk`, `frontend`, `examples/vtherm_sample_plugin/ui`, script TypeScript testé), et la compare à `${tag#v}` par égalité de chaînes. Il échoue avec le fichier et les deux valeurs en cas de différence, de champ absent ou de JSON invalide. Le développeur change donc la version dans un commit, puis pose le tag sur ce commit.
Job `package` : construit le frontend, dont le bundle est écrit dans `custom_components/vtherm_dashboard/www/` (voir `ui-plugin-dashboard`, décision 21), copie `custom_components/vtherm_dashboard/` dans un dossier temporaire en excluant tests et caches, puis zippe le contenu avec le dossier courant comme racine, sans modifier `manifest.json`. `hacs.json` : `{"name": "VTherm Dashboard", "zip_release": true, "filename": "vtherm_dashboard.zip", "render_readme": true}`. HACS extrait l'archive dans `custom_components/<domaine>`, donc `manifest.json` doit être à la racine du zip.
- *Alternative : écrire la version du tag dans le manifest pendant la release* : rien à synchroniser à la main, mais le dépôt et l'archive publiée diffèrent, et une faute de tag passe sans signal. Rejetée sur demande : l'échec est préféré.
- *Alternative : ZIP généré par GitHub (source archive)* : HACS ne l'utilise pas avec `zip_release`, et elle n'inclurait pas le frontend construit. Rejetée.

### 8. GitHub Release
Job `publish` (seul avec `contents: write`) : télécharge l'artefact du job `package`, crée la Release avec `gh release create --generate-notes` (`--prerelease` si le tag contient `-`), ou remplace l'archive avec `gh release upload --clobber` si elle existe. Aucune action tierce de publication : le CLI `gh` préinstallé suffit.

### 8bis. Publication npm par trusted publishing
Job `publish-npm` dans `release.yml` (le fichier déclaré sur npmjs.com est celui qui contient `npm publish`, donc pas dans `ci.yml` appelé par `workflow_call`). Il dépend de `publish` : l'action la moins réversible vient en dernier. Droits : `contents: read` et `id-token: write`, sans jeton. Il utilise Node.js récent avec `registry-url`, `npm ci`, `npm run build`, puis `npm publish --workspace packages/sdk`, avec `--tag next` pour une préversion (sinon `latest`). La provenance est générée automatiquement par npm depuis un dépôt public.
- **Dry-run hors `master`** : un tag de préversion posé sur un commit hors de `master` est un tag d'essai (décision 6). Dans ce cas le job exécute `npm publish --dry-run` au lieu de publier, car une version npm publiée ne peut pas être republiée. Un tag stable est toujours sur `master` et publie réellement, et une préversion sur `master` aussi.
- Prérequis hors dépôt : trusted publisher déclaré sur npmjs.com pour `@vtherm/dashboard-sdk` (organisation `bontiv`, dépôt `vtherm_dashboard`, workflow `release.yml`, action `npm publish` autorisée), et `repository.url` du `package.json` du SDK identique à l'URL du dépôt.
- Une configuration non validée par une première publication expire au bout de 2 jours, et npm ne contrôle pas la configuration à l'enregistrement : la première erreur apparaît à la première publication. Le dry-run ne la valide pas : le trusted publisher se déclare juste avant le premier tag réel.
- Relance : la publication est idempotente seulement si la version n'existe pas déjà ; une relance après succès échoue sur `npm publish` sans conséquence, ce que la tâche 3.7 documente.
- *Alternative : jeton d'automatisation `NPM_TOKEN`* : fonctionne partout, mais c'est un secret de longue durée à stocker et à renouveler. Rejetée.

### 9. Sécurité de la chaîne
- `permissions: contents: read` par défaut au niveau du workflow, élargi par job.
- Actions tierces et GitHub épinglées par SHA de commit avec la version en commentaire. Dependabot (`github-actions`, hebdomadaire) propose les mises à jour.
- `actions/checkout` avec `persist-credentials: false`.

## Risks / Trade-offs
- [Les workflows échouent tant que le code et les manifestes (`package.json`, `custom_components/`) n'existent pas] → Ce change est appliqué après `ui-plugin-dashboard`.
- [Les tests ne peuvent pas s'exécuter avant la publication de `vtherm_api` avec le registre des plugins UI] → Décision du projet : les tests ne sont lancés qu'après cette publication.
- [Deux exécutions par push sur une branche de pull request] → Concurrence et coût négligeable pour un dépôt de cette taille.
- [CodeQL en `build-mode: none` pour TypeScript : couverture un peu moins précise qu'avec build] → Acceptable, supporté par GitHub pour ces langages.
- [Un tag posé avant le commit de version échoue à la validation] → Supprimer le tag, corriger le manifest, recréer le tag.
- [La HACS Action contrôle aussi des réglages du dépôt (description, topics, issues), maintenant renseignés] → Un contrôle exclu doit être justifié dans le workflow. Seul le contrôle du dépôt `home-assistant/brands` est exclu, décision du projet : ce dépôt refuse les intégrations personnalisées et l'icône est dans `brand/`.
- [`hacs/action` et `hassfest` n'ont pas de tags de version stables (`main`, `master`)] → Épinglage par SHA et mise à jour par Dependabot.
- [Un tag mal formé n'est détecté qu'après son push] → Le job échoue sans rien publier ; supprimer et recréer le tag.
- [Réglages hors dépôt (code scanning, protection de branche) non vérifiables par le code] → Les lister dans la documentation contributeur.
- [`hassfest` sur une intégration personnalisée qui dépend de `versatile_thermostat` : il ignore l'existence des dépendances quand il est lancé sur un dossier d'intégration, ce que le code source actuel de `hassfest` confirme] → À vérifier au premier passage du job.
- [Nom du domaine `vtherm_dashboard` supposé pour `custom_components/` et `filename`] → À confirmer avec le `manifest.json` créé par `ui-plugin-dashboard` tâche 2.1.
