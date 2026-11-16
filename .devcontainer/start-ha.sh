#!/usr/bin/env bash
# Start Home Assistant with Versatile Thermostat and the dashboard linked into config/custom_components.
#
# Usage: start-ha.sh [--dev-frontend]
#   --dev-frontend  Load the frontend of the dashboard from the development server (`npm run dev`) instead of the built files, by
#                   setting VTHERM_DASHBOARD_DEV_SERVER to http://localhost:5198. A value that is already set, for example the
#                   forwarded address of a Codespace, is kept.
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$PWD"

DEV_FRONTEND_URL="http://localhost:5198"

for argument in "$@"; do
    case "$argument" in
        --dev-frontend)
            export VTHERM_DASHBOARD_DEV_SERVER="${VTHERM_DASHBOARD_DEV_SERVER:-$DEV_FRONTEND_URL}"
            echo "The dashboard frontend is loaded from $VTHERM_DASHBOARD_DEV_SERVER: run 'npm run dev' in another terminal."
            ;;
        *)
            echo "Unknown option: $argument" >&2
            echo "Usage: $0 [--dev-frontend]" >&2
            exit 2
            ;;
    esac
done

mkdir -p config/custom_components

link() {
    local source="$1" target="$2"
    if [ -d "$source" ]; then
        ln -sfn "$source" "$target"
    else
        echo "Skipped (missing): $source"
    fi
}

link "$ROOT/external/versatile_thermostat/custom_components/versatile_thermostat" config/custom_components/versatile_thermostat
# Our integration, once it exists.
link "$ROOT/custom_components/vtherm_dashboard" config/custom_components/vtherm_dashboard

# Home Assistant exits with the code 100 when it is asked to restart (the service homeassistant.restart, or the restart of the add-ons
# in the dashboard), and leaves the restart to what started it: start it again then, and stop on any other code.
RESTART_EXIT_CODE=100
while true; do
    status=0
    hass --config "$ROOT/config" --debug || status=$?
    if [ "$status" -ne "$RESTART_EXIT_CODE" ]; then
        exit "$status"
    fi
    echo "Home Assistant asked for a restart: starting it again."
done
