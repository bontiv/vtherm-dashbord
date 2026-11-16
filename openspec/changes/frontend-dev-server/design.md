# Design

## Context
- `panel.py` vérifie que `www/vtherm-dashboard.js` existe (sinon `ConfigEntryError`), sert `www/` sous `/vtherm_dashboard_static` et enregistre le panneau avec `module_url=/vtherm_dashboard_static/vtherm-dashboard.js?v=<version>`.
- `native_plugins.py` enregistre chaque plugin natif dans `vtherm_api` avec `native_js_url()` = `/vtherm_dashboard_static/plugins/<id>.js?v=<version>`, contrainte `==<version>`, `requires` et `load_after`.
- `frontend/vite.config.ts` construit en mode bibliothèque une entrée par module (panneau + un par plugin natif, sources dans `frontend/src/native/plugins/<id>.ts`), avec l'alias `@vtherm/dashboard-sdk` vers `packages/sdk/src/index.ts` et la constante `__DASHBOARD_VERSION__` lue dans le manifest.
- Le registre des plugins n'est pas dans le SDK : le panneau le place dans `window.VThermUiPluginRegistry` avant d'importer les plugins. Des modules venant d'origines différentes partagent donc le même registre ; c'est ce qui permet déjà au mode développement des plugins tiers de charger `http://localhost:5173/src/main.ts` depuis Vite.
- Ports déjà pris : 5173 (plugin d'exemple et documentation des plugins), 5199 (prévisualisation `npm run preview -w frontend`).
- Home Assistant tourne dans le dev container ; le navigateur est sur la machine hôte et passe par les ports redirigés par VS Code.

## Goals / Non-Goals

**Goals:**
- Développer le panneau, les plugins natifs et le SDK en TypeScript contre un vrai Home Assistant avec seulement un rechargement de page.
- Aucun changement de comportement quand la variable n'est pas définie (production, CI, archive de release).
- Réutiliser la configuration Vite existante (alias, `define`) pour que le code servi soit le même que le code construit.

**Non-Goals:**
- Rechargement à chaud des composants Lit en conservant leur état (HMR fin) : un rechargement complet de la page suffit.
- Rechargement du code Python sans redémarrage de Home Assistant.
- Modifier le mode développement des plugins tiers (`ui-plugin-dev-mode`) ou servir les plugins tiers.
- Un réglage dans l'interface de Home Assistant : le mode est réservé aux contributeurs.

## Decisions

### 1. Serveur de développement Vite plutôt que `vite build --watch`
`npm run dev` lance `vite` (mode serveur) avec `frontend/vite.config.ts`. Vite compile chaque fichier TypeScript à la demande, en quelques millisecondes, et sert `lit`, `dompurify` et le SDK par l'alias existant.
- *Alternative : `vite build --watch` dans `www/`.* Aucun changement Python, mais chaque sauvegarde reconstruit tous les bundles (une entrée par plugin natif), écrit dans le composant, et le navigateur peut garder un module en cache (l'URL `?v=<version>` ne change pas). Rejetée comme mode principal ; elle reste possible à la main (`npx vite build --watch -w frontend`) et peut être documentée comme variante.
- *Alternative : proxy de Vite derrière Home Assistant (même origine).* Évite CORS et la redirection d'un port, mais ajoute une vue HTTP dans l'intégration et un client HTTP vers Vite. Rejetée : plus de code dans l'intégration pour un usage de développement.

### 2. Activation par la variable d'environnement `VTHERM_DASHBOARD_DEV_SERVER`
L'intégration lit `os.environ` au moment de `async_setup_entry` (une fonction dans `panel.py` ou `const.py`, utilisée par le panneau et par les plugins natifs). La valeur est l'URL **telle que le navigateur la voit** (par exemple `http://localhost:5198`), sans `/` final ; elle est validée comme URL absolue `http`/`https`, sinon ignorée avec une erreur dans le journal.
- *Alternative : clé YAML `vtherm_dashboard: dev_server:`.* Demande un `CONFIG_SCHEMA` et un `async_setup` pour une intégration qui n'a qu'une entrée de configuration ; le fichier `config/configuration.yaml` est partagé entre plusieurs sessions de travail. Rejetée.
- *Alternative : option dans le config flow.* Visible par tous les utilisateurs, risque d'être activée en production. Rejetée.
- *Alternative : détection automatique (pas de `www/` ⇒ mode développement).* Cacherait l'erreur utile d'une installation incomplète en production. Rejetée.

### 3. URLs servies en mode développement
- Panneau : `<dev>/src/index.ts`.
- Plugin natif `<id>` : `<dev>/src/native/plugins/<id>.ts`.
- Pas de paramètre `?v=` : Vite gère lui-même l'invalidation (`?t=` sur les modules modifiés, en-têtes `no-cache`).
- Contrainte de version, `requires`, `load_after` : inchangés (seule `native_js_url()` change de forme).
Le panneau importe ensuite les plugins natifs par leur URL complète sur le même serveur : Vite ne voit qu'un graphe de modules, donc `lit` et le SDK n'existent qu'une fois dans la page, comme les blocs communs du build.

### 4. Pas de chemin statique ni de contrôle du build en mode développement
En mode actif, `async_register_panel` ne vérifie pas `www/` et n'enregistre pas `/vtherm_dashboard_static` (le dossier peut ne pas exister). Changer de mode demande de redémarrer Home Assistant, ce qui est déjà le cas pour une variable d'environnement ; le drapeau « chemin statique enregistré une fois par exécution » n'est donc pas touché par un changement de mode.

### 5. Configuration du serveur Vite
Ajouter une section `server` à `frontend/vite.config.ts` : `port: 5198`, `strictPort: true`, `cors: true` (ou l'en-tête `Access-Control-Allow-Origin`), `origin: "http://localhost:5198"` (pour les URLs absolues des ressources), `host` permettant l'accès depuis le port redirigé. La configuration `build.lib` est ignorée par le serveur ; l'alias et `define` s'appliquent aux deux.

### 6. Rechargement automatique
Le serveur Vite n'injecte son client (`/@vite/client`) que dans le HTML qu'il sert ; ici la page est celle de Home Assistant. Le point d'entrée servi en mode développement importe donc le client Vite seulement en développement (`import.meta.hot` / `import.meta.env.DEV`, code éliminé du build), avec `server.hmr` configuré sur le port du serveur Vite pour que le client ne tente pas de joindre Home Assistant. Une modification sans frontière HMR déclenche un rechargement complet de la page. Si le WebSocket ne passe pas (redirection de port, proxy), le rechargement manuel reste le comportement garanti par la spec.

### 7. Environnement de développement
- `start-ha.sh --dev-frontend` exporte `VTHERM_DASHBOARD_DEV_SERVER=http://localhost:5198` si la variable n'est pas déjà définie (une valeur explicite, par exemple pour Codespaces, est conservée). Sans l'option, le script ne touche pas à la variable.
- `devcontainer.json` ajoute `5198` à `forwardPorts` avec un libellé. Le fichier a des modifications locales non commitées : l'ajout doit les préserver.
- Scripts npm : `dev` dans `frontend/package.json` (`vite`) et `dev` à la racine (`npm run dev -w frontend`).

## Risks / Trade-offs
- [Le navigateur n'atteint pas `localhost:5198` (Codespaces, accès distant)] → La variable contient l'URL vue par le navigateur et peut être définie à la main ; la documentation le précise.
- [Contenu mixte : Home Assistant en HTTPS, Vite en HTTP] → Le navigateur bloque l'import ; documenter d'utiliser Home Assistant en HTTP en local ou l'URL HTTPS redirigée.
- [Écart entre le code servi et le code construit (découpage en blocs, élimination de code)] → La CI et `npm run build` restent la référence ; la documentation demande un essai du build avant une pull request.
- [Variable oubliée dans un environnement partagé] → Avertissement dans le journal à chaque démarrage ; aucune valeur par défaut hors de `start-ha.sh --dev-frontend`.
- [Client HMR qui vise la mauvaise origine (déjà observé pour le plugin d'exemple, d'où `hmr: false`)] → Configurer explicitement `server.hmr` (hôte, port, protocole) et vérifier en vrai ; à défaut, désactiver le rechargement automatique sans affecter le reste.

## Migration Plan
Aucune migration : le mode est désactivé par défaut. Retour arrière : supprimer la variable (ou lancer `start-ha.sh` sans l'option) et redémarrer Home Assistant après `npm run build`.

## Open Questions
- Le numéro de port 5198 peut changer sans effet sur la spec, tant qu'il reste distinct de 5173 et 5199.
