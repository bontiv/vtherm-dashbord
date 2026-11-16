# Proposal

## Why
Pour voir une modification du frontend dans Home Assistant, il faut aujourd'hui lancer `npm run build`, puis recharger l'intégration ou redémarrer Home Assistant. Sans build, l'intégration refuse même de démarrer (« The frontend module … is missing »). Cette boucle est lente pour le développement en TypeScript du panneau, du SDK et des plugins natifs. Le mode développement existant (`ui-plugin-dev-mode`) ne couvre que les plugins : il ne peut pas remplacer le module du panneau lui-même.

## What Changes
- Un serveur de développement Vite pour le frontend (`npm run dev`) sert directement les sources TypeScript du panneau, des plugins natifs et du SDK, compilées à la volée, sans écrire dans `custom_components/vtherm_dashboard/www/`.
- Une variable d'environnement de Home Assistant, `VTHERM_DASHBOARD_DEV_SERVER`, active le mode « frontend de développement » de l'intégration : le panneau charge son module depuis ce serveur, les plugins natifs sont enregistrés avec l'URL de leur source sur ce serveur, et l'absence du build n'empêche plus le démarrage.
- Sans la variable, rien ne change : l'intégration sert le build de `www/` et refuse de démarrer s'il manque.
- Quand le mode est actif, l'intégration l'écrit dans le journal en avertissement, avec l'URL utilisée.
- Une modification d'un fichier TypeScript est visible après un rechargement de la page (automatique quand le serveur Vite le déclenche), sans build ni redémarrage. Une modification Python demande toujours un redémarrage (hors périmètre).
- L'environnement de développement : `start-ha.sh` accepte une option qui exporte la variable vers l'URL par défaut du serveur Vite, et le dev container redirige le port de ce serveur.
- La documentation pour les contributeurs décrit les deux façons de lancer le dashboard (build ou serveur de développement).

## Capabilities

### New Capabilities
- `frontend-dev-server` : le chargement du frontend du dashboard depuis un serveur de développement pendant le développement de l'intégration elle-même — activation, URLs du panneau et des plugins natifs, démarrage sans build, rechargement et retour au comportement normal sans la variable.

### Modified Capabilities
Aucune. `openspec/specs/` est vide pour l'instant : le comportement du panneau (`dashboard-panel`) et le mode développement des plugins (`ui-plugin-dev-mode`) sont encore dans le change `ui-plugin-dashboard`, non archivé. Ce change ne modifie pas leurs exigences : il ajoute un mode qui ne s'applique que lorsque la variable est définie.

## Impact
- **Python** : `custom_components/vtherm_dashboard/panel.py` (URL du module, contrôle du build, chemin statique), `native_plugins.py` (URL des plugins natifs), `const.py` (nom de la variable), tests Python correspondants.
- **Frontend** : `frontend/package.json` (script `dev`), `frontend/vite.config.ts` (section `server` : port, CORS, `origin`), éventuellement un petit point d'entrée de développement pour le rechargement automatique ; script `dev` à la racine.
- **Environnement** : `.devcontainer/start-ha.sh` (option), `.devcontainer/devcontainer.json` (port redirigé).
- **Documentation** : `docs/contributing/development-environment.md`, `docs/contributing/architecture.md` si elle décrit le chargement du panneau.
- **Aucun impact** sur l'archive de release, l'API WebSocket, le SDK publié ni le mode développement des plugins tiers.
