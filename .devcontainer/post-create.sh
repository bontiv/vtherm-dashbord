#!/usr/bin/env bash
# Prepare the development environment: Python dependencies, external repositories
# (Versatile Thermostat and vtherm_api) and the Home Assistant configuration.
set -euo pipefail

cd "$(dirname "$0")/.."

VTHERM_REPO="${VTHERM_REPO:-https://github.com/jmcollin78/versatile_thermostat.git}"
VTHERM_API_REPO="${VTHERM_API_REPO:-https://github.com/jmcollin78/vtherm_api.git}"

# External repositories, cloned once into external/ (ignored by git).
# To use a fork or a branch, change the clone in external/
# or set VTHERM_REPO / VTHERM_API_REPO before the container is created.
mkdir -p external
[ -d external/versatile_thermostat ] || git clone "$VTHERM_REPO" external/versatile_thermostat
[ -d external/vtherm_api ] || git clone "$VTHERM_API_REPO" external/vtherm_api

python -m pip install --upgrade pip
python -m pip install -r requirements-dev.txt

# vtherm_api in editable mode: changes are picked up when Home Assistant restarts.
python -m pip install -e external/vtherm_api

# Dependencies of the Versatile Thermostat integration, without the published vtherm_api package.
python -m pip install numpy scipy

# Frontend, only once the project has been initialized.
if [ -f frontend/package.json ]; then
    (cd frontend && npm install)
fi

# Home Assistant configuration (config/ is ignored by git).
mkdir -p config
if [ ! -f config/configuration.yaml ]; then
    cp .devcontainer/configuration.yaml config/configuration.yaml
fi

echo "Environment ready. Start Home Assistant with: bash .devcontainer/start-ha.sh"
