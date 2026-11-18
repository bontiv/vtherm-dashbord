# Proposal

## Why
Un schéma à valeurs d'exemple (change `field-help-diagrams`) explique ce que fait un réglage, mais pas ce qu'il ferait dans **cette** pièce. Choisir `coef_int`, un seuil de détection d'ouverture ou un délai de sécurité reste un essai à l'aveugle : on enregistre, on attend des jours, on regarde l'historique de Home Assistant. Le projet amont `Liquidmasl/vtherm_dashboard` montre qu'on peut rejouer les règles de Versatile Thermostat sur l'historique enregistré de la pièce et afficher, pendant la saisie, ce que les réglages en cours de modification auraient produit.

## What Changes
- Des **panneaux d'estimation** dans les onglets natifs, sous les champs, recalculés à chaque modification du brouillon, avant tout enregistrement :
  - **TPI** : part de chauffe « maintenant » (décomposition partie pièce + partie extérieure, plafonds, seuils d'arrêt et de reprise, temps minimaux), puis rejeu sur 24 h ou 7 jours de la part de chauffe estimée comparée à celle enregistrée par VT, et indicateurs de confort (temps de montée, dépassement, maintien à ±0,5°).
  - **Ouverture** : rejeu de la détection par chute de température sur 24 h ou 7 jours avec les seuils saisis (pente estimée, périodes où une fenêtre aurait été détectée, chute la plus forte).
  - **Sécurité** (onglet avancé) : silences des capteurs de température intérieure et extérieure plus longs que le délai de sécurité saisi, sur 24 h ou 7 jours.
- Des **graphiques temporels** dessinés avec les couleurs du thème, avec survol ou toucher pour lire une valeur, légende et résumé textuel accessible.
- Les chiffres sont des **estimations**, toujours étiquetées comme telles, calculées par des fonctions pures portées depuis le code de Versatile Thermostat de la version de référence (`external-refs.txt`).
- Un script de développement qui remplit l'historique de l'instance du devcontainer avec une semaine simulée, pour développer et capturer ces panneaux.

## Capabilities

### New Capabilities
- `setting-insights`: estimations de l'effet des réglages en cours de saisie, calculées sur l'historique enregistré du thermostat, et leurs graphiques.

### Modified Capabilities
<!-- Aucune : les panneaux s'ajoutent aux onglets natifs existants sans changer leurs champs, leur validation ni leur enregistrement. -->

## Impact
- Frontend : nouveau module d'estimations (fonctions pures) et nouveaux composants de panneaux et de graphiques sous `frontend/src/`, insertion dans les onglets `core_tpi`, `core_window` et `core_advanced` via `frontend/src/native/native-tab.ts`.
- Home Assistant : lecture de l'historique par la commande WebSocket `history/history_during_period` (recorder) ; aucune écriture, aucun nouvel appel côté Python de l'intégration.
- Textes : nouvelles clés en en/fr/de dans `scripts/native-texts.ts`, catalogues régénérés.
- Développement : script de remplissage de l'historique pour le devcontainer, documentation dans `docs/contributing/development-environment.md`.
- Documentation utilisateur des panneaux et de leurs limites ; `CHANGELOG.md`.
- Dépend de `field-help-diagrams` pour la palette et les conventions de dessin SVG, mais peut être livré séparément.
