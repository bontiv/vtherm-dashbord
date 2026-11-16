# Spec Delta

## ADDED Requirements

### Requirement: Contrôle Home Assistant en priorité
Tout code d'interface du projet (dashboard, plugins natifs, plugin d'exemple) SHALL utiliser le composant Home Assistant équivalent quand il existe, avant tout contrôle HTML générique ou composant écrit pour le projet. Un contrôle générique SHALL être justifié par un commentaire qui nomme le composant Home Assistant écarté et la raison.

#### Scenario: Contrôle générique sans justification
- **WHEN** une revue trouve un `textarea`, un `select`, un `input` ou un `button` sans équivalent Home Assistant justifié par un commentaire
- **THEN** la revue le refuse, conformément à la case du modèle de demande de fusion

#### Scenario: Exception justifiée
- **WHEN** aucun composant Home Assistant ne convient (par exemple, repli quand le composant est absent)
- **THEN** le contrôle générique est accepté avec un commentaire qui nomme le composant écarté
