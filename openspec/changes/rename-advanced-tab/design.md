# Design

## Context
- Le titre d'un onglet natif est la clé `title.<onglet>` du catalogue du plugin, lue par `native-plugin.ts` (menu) et `native-tab.ts` (titre de la section). Le générateur `scripts/generate-native-catalogs.ts` remplit `title.<onglet>` depuis `config.step.menu.menu_options.<onglet>` de Versatile Thermostat, et `description.<onglet>` depuis `config.step.<onglet>.description`, dans les trois langues. Les catalogues générés ne s'éditent pas à la main.
- Pour `advanced`, VT donne « Advanced parameters », « Paramètres avancés » et « Erweiterte Einstellungen ». Les autres onglets reprennent le nom de VT.
- Le panneau replié « Paramètres avancés (N) » (clé `config.advanced_settings` de `shell-translations.ts`, spec archivée `config-form-layout`) existe dans chaque section. La spec archivée `config-menu-groups` range l'onglet sous « Paramètres généraux » ; ces deux changes sont archivés, il n'y a pas de conflit de delta.
- La documentation de VT (`documentation/en/feature-advanced.md`, intitulée « Advanced Configuration ») traite dans cette page la sécurité des capteurs, la durée de dérogation manuelle et la réparation d'état.

## Goals / Non-Goals
**Goals:**
- Un nom d'onglet qui dit l'essentiel du contenu, sans collision avec le panneau « Paramètres avancés (N) ».
- Aucun changement du contrat des plugins tiers.
- Un utilisateur de la doc VT retrouve l'onglet.

**Non-Goals:**
- Déplacer des champs vers un autre onglet : le schéma est celui de VT, et l'héritage central est par section.
- Renommer le panneau « Paramètres avancés (N) » ou les autres onglets.
- Changer l'ordre ou le groupe du menu.

## Decisions

### Le nom : « Sécurité et dérogation »
Choix de l'utilisateur. Le nom couvre les trois réglages du mode sécurité (`safety_delay_min`, `safety_min_on_percent`, `safety_default_on_percent`) et la dérogation manuelle (`manual_override_duration_min` : l'utilisateur reprend la main sur le thermostat). `repair_incorrect_state` (réparer l'état incorrect) est traité comme un filet de sécurité de l'onglet : il renvoie la commande quand un équipement n'est pas dans l'état voulu. **Compromis assumé : le nom ne cite pas ce réglage.** Il est retrouvé par la description de l'onglet, qui nomme les cinq réglages, et par son aide de champ.

| Candidat | Exactitude | Reconnu avec la doc VT | Verdict |
|---|---|---|---|
| Paramètres avancés (actuel) | exact mais vague | oui (nom de VT) | collision avec le panneau replié |
| Mode sécurité | 3 champs sur 5 ; c'est aussi un état en cours, pas une page | partiel | écarté |
| Détection panne capteur | 1 champ sur 5 (le délai) ; ni dérogation ni réparation | non | écarté : proche de « Détection de panne de chauffage » (autre onglet) |
| Sécurité | 3 champs sur 5 | partiel | écarté, trop étroit |
| Sécurité et fiabilité | la dérogation manuelle n'est pas de la fiabilité | oui | écarté |
| Sécurité et avancé | « avancé » décrit un niveau, pas un contenu, et double le panneau « Paramètres avancés » | oui | écarté |
| Capteurs et sécurité | « capteurs » ne couvre ni la dérogation ni la réparation | non | écarté |
| **Sécurité et dérogation** | 4 champs sur 5 par le nom, le 5e par la description | partiel (la description garde « Paramètres avancés ») | **retenu** |

Traductions retenues : « Safety and manual override » (25 car.) et « Sicherheit und manuelle Übersteuerung » (36 car.). Le nom allemand est plus long que l'ancien (« Erweiterte Einstellungen », 23 car.) et à peine plus court que « Synchronisierung der Gerätetemperatur » de VT (37 car.). Si le nom long ne tient pas dans le menu ou le fil d'Ariane à 360 px, la variante courte est « Sicherheit und Übersteuerung » (30 car.), à fixer au moment de la vérification. Alternatives allemandes écartées : « Sicherheit » (étroit), « Sicherheitsmodus » (même défaut que « Mode sécurité »).

### Où mettre le titre et la description
Le générateur lit d'abord `PLUGIN_TEXTS[plugin]["title.<onglet>"]` et `PLUGIN_TEXTS[plugin]["description.<onglet>"]`, puis seulement `menu_options` et la description de VT, comme il le fait déjà pour `field.<clé>` (`own[labelKey]`). Les textes se règlent dans `scripts/native-texts.ts`, les catalogues sont régénérés, et `npm run check:catalogs` reste le garde-fou. Autre voie écartée : éditer le catalogue généré (écrasé à la prochaine génération) ou surcharger dans `native-plugin.ts` (deux sources de vérité).

La clé `title.advanced`, la clé `description.advanced` et l'identifiant `core_advanced` restent : ce sont des identifiants, pas des libellés (contrat des plugins tiers, positions `after:`/`before:`, liens enregistrés).

### Description de l'onglet et reconnaissance par les utilisateurs de VT
La description garde l'avertissement de VT (laisser les valeurs par défaut) et gagne une phrase qui nomme les cinq réglages et l'ancien nom. Texte à écrire dans `scripts/native-texts.ts` :
- fr : « Réglages de sécurité (délai maximal entre deux mesures, puissance minimale et puissance en mode sécurité), durée de la dérogation manuelle et réparation de l'état incorrect. Versatile Thermostat appelle cet onglet « Paramètres avancés ». Laissez les valeurs par défaut si vous ne savez pas ce que vous faites. Ces paramètres peuvent induire des mauvais comportements du thermostat »
- en : « Safety settings (maximum delay between two measurements, minimum power and power in safety mode), manual override duration and repair of an incorrect state. Versatile Thermostat calls this tab "Advanced parameters". Leave the default values if you don't know what you are doing. These parameters can lead to very poor temperature control or bad power regulation »
- de : « Sicherheitseinstellungen (maximale Zeitspanne zwischen zwei Messungen, Mindestleistung und Leistung im Sicherheitsmodus), Dauer der manuellen Übersteuerung und Reparatur des fehlerhaften Zustands. Versatile Thermostat nennt diesen Tab „Erweiterte Einstellungen". Belassen Sie die Standardwerte, wenn Sie nicht wissen, was Sie tun. Diese Einstellungen können zu Fehlfunktionen des Thermostats führen. »

La doc dit la même chose : « Safety and manual override (called Advanced parameters in Versatile Thermostat) » dans `docs/user/configuration.md` et `docs/plugins/native-plugins.md`.

## Risks / Trade-offs
- Un utilisateur qui cherche « Paramètres avancés » dans le dashboard ne le trouve plus au menu ; la description et la doc le relient à l'ancien nom. Le panneau « Paramètres avancés (N) » garde son nom.
- Le nom allemand est le plus long du menu : vérifier le menu et le fil d'Ariane sur 360 px, prévoir la variante courte.
- Le nom ne cite pas la réparation de l'état incorrect (compromis assumé ci-dessus).
- Aucune capture d'écran de `docs/user/configuration.md` ne montre l'ancien titre à la date de ce plan.
