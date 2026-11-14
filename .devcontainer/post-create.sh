#!/usr/bin/env bash
# Prepare the development environment: Python dependencies, external repositories
# (Versatile Thermostat, vtherm_api and HACS) and the Home Assistant configuration.
set -euo pipefail

cd "$(dirname "$0")/.."

VTHERM_REPO="${VTHERM_REPO:-https://github.com/jmcollin78/versatile_thermostat.git}"
VTHERM_API_REPO="${VTHERM_API_REPO:-https://github.com/jmcollin78/vtherm_api.git}"
HACS_REPO="${HACS_REPO:-https://github.com/hacs/integration.git}"

# A branch or a tag to clone, empty for the default branch. The dashboard needs the registry of UI plugins of vtherm_api: until it is
# merged upstream, set VTHERM_API_REPO (and VTHERM_API_REF) to the fork or the branch that has it.
VTHERM_REF="${VTHERM_REF:-}"
VTHERM_API_REF="${VTHERM_API_REF:-}"
HACS_REF="${HACS_REF:-}"
clone() {
    local url="$1" ref="$2" target="$3"
    if [ -d "$target" ]; then
        return
    fi
    if [ -n "$ref" ]; then
        git clone --branch "$ref" "$url" "$target"
    else
        git clone "$url" "$target"
    fi
}
# External repositories, cloned once into external/ (ignored by git).
# To use a fork or a branch, change the clone in external/ or set the variables above before the container is created.
mkdir -p external
clone "$VTHERM_REPO" "$VTHERM_REF" external/versatile_thermostat
clone "$VTHERM_API_REPO" "$VTHERM_API_REF" external/vtherm_api
# HACS, to read the commands that the add-ons feature calls (it is not installed in Home Assistant by this script).
clone "$HACS_REPO" "$HACS_REF" external/hacs

python -m pip install --upgrade pip
python -m pip install -r requirements-dev.txt

# vtherm_api in editable mode: changes are picked up when Home Assistant restarts.
python -m pip install -e external/vtherm_api

# Dependencies of the Versatile Thermostat integration, without the published vtherm_api package.
python -m pip install numpy scipy

# Frontend and SDK: npm workspaces installed from the root package.json.
if [ -f package.json ]; then
    npm install
fi

# Home Assistant configuration (config/ is ignored by git).
mkdir -p config
if [ ! -f config/configuration.yaml ]; then
    cp .devcontainer/configuration.yaml config/configuration.yaml
fi

echo "Environment ready. Start Home Assistant with: bash .devcontainer/start-ha.sh"
