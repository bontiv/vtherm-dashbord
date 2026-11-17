# Proposal

## Why
Un thermostat Versatile Thermostat règle une pièce, et Home Assistant sait déjà dans quelle pièce (zone) se trouve chaque appareil, et à quel étage. La liste des thermostats du dashboard l'ignore : elle trie les thermostats par nom. Avec une dizaine de thermostats, retrouver ceux de l'étage ou de la salle de bain demande de lire chaque nom. Les noms ne contiennent pas toujours la pièce (« Radiateur fenêtre », « Sèche-serviettes »), et une pièce peut avoir plusieurs thermostats.

## What Changes
- La liste de l'onglet Thermostats regroupe les thermostats **par pièce** (zone de Home Assistant), sous un en-tête qui porte l'icône et le nom de la pièce. Les pièces sont ordonnées par étage, puis par nom ; l'étage apparaît dans l'en-tête quand la maison en a.
- Les thermostats sans pièce sont rassemblés dans un groupe « Sans pièce », en dernier. Chacun propose un lien vers sa fiche d'appareil dans Home Assistant pour lui attribuer une pièce.
- Un choix « Par pièce / Par nom » permet de revenir à la liste alphabétique. Il est mémorisé dans le navigateur.
- Les noms des pièces et des étages suivent ceux de Home Assistant en direct : un renommage ou un changement de pièce apparaît sans recharger la page.
- Le sélecteur de thermostat du menu de gauche ordonne aussi les thermostats par pièce, et préfixe chacun du nom de sa pièce.
- Le serveur indique pour chaque thermostat sa pièce et l'identifiant de son appareil.

## Capabilities

### New Capabilities
<!-- Aucune. -->

### Modified Capabilities
- `core-config-management`: la liste et le sélecteur des thermostats regroupent ou ordonnent les thermostats par pièce de Home Assistant, avec un groupe « Sans pièce » et le choix d'une liste par nom.

## Impact
- Python : `custom_components/vtherm_dashboard/vtherm_config.py` (`ThermostatSummary`, `list_thermostats` : appareil et pièce de chaque thermostat, depuis les registres d'appareils et d'entités), `websocket_api.py` ; tests `pytest`.
- Frontend : `frontend/src/config/api.ts` et `config-session.ts` (liste des thermostats), `frontend/src/navigation.ts` (`ThermostatInfo`), `frontend/src/components/thermostat-list.ts`, `frontend/src/components/side-menu.ts`.
- Pas de changement du SDK : les registres de pièces et d'étages de l'objet `hass` sont lus par un type local du dashboard.
- Textes en en/fr/de ; documentation utilisateur et `CHANGELOG.md`.
- Indépendant de `config-navigation-status` : le regroupement s'applique à la liste actuelle comme aux tuiles que ce change introduit.
