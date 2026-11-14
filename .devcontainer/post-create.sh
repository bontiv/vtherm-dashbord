#!/usr/bin/env bash
# Prépare l'environnement de développement : dépendances Python, dépôts externes
# (Versatile Thermostat et vtherm_api) et configuration de Home Assistant.
set -euo pipefail

cd "$(dirname "$0")/.."

VTHERM_REPO="${VTHERM_REPO:-https://github.com/jmcollin78/versatile_thermostat.git}"
VTHERM_API_REPO="${VTHERM_API_REPO:-https://github.com/jmcollin78/vtherm_api.git}"

# Dépôts externes, clonés une seule fois dans external/ (ignoré par git).
# Pour utiliser un fork ou une branche, modifier le clone dans external/
# ou définir VTHERM_REPO / VTHERM_API_REPO avant la création du conteneur.
mkdir -p external
[ -d external/versatile_thermostat ] || git clone "$VTHERM_REPO" external/versatile_thermostat
[ -d external/vtherm_api ] || git clone "$VTHERM_API_REPO" external/vtherm_api

python -m pip install --upgrade pip
python -m pip install -r requirements-dev.txt

# vtherm_api en mode éditable : les modifications sont prises en compte au redémarrage de HA.
python -m pip install -e external/vtherm_api

# Dépendances de l'intégration Versatile Thermostat, sans le paquet vtherm_api publié.
python -m pip install numpy scipy

# Frontend, uniquement quand le projet a été initialisé.
if [ -f frontend/package.json ]; then
    (cd frontend && npm install)
fi

# Configuration de Home Assistant (config/ est ignoré par git).
mkdir -p config
if [ ! -f config/configuration.yaml ]; then
    cp .devcontainer/configuration.yaml config/configuration.yaml
fi

echo "Environnement prêt. Démarrer Home Assistant avec : bash .devcontainer/start-ha.sh"
