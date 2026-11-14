#!/usr/bin/env bash
# Démarre Home Assistant avec Versatile Thermostat et le dashboard liés dans config/custom_components.
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$PWD"

mkdir -p config/custom_components

link() {
    local source="$1" target="$2"
    if [ -d "$source" ]; then
        ln -sfn "$source" "$target"
    else
        echo "Ignoré (absent) : $source"
    fi
}

link "$ROOT/external/versatile_thermostat/custom_components/versatile_thermostat" config/custom_components/versatile_thermostat
# Notre intégration, quand elle existe.
link "$ROOT/custom_components/vtherm_dashboard" config/custom_components/vtherm_dashboard

exec hass --config "$ROOT/config" --debug
