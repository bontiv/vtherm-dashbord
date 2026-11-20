#!/usr/bin/env bash
# Reports whether each external project folder exists. Creates and modifies nothing.
# One line per project, in a fixed order: <VARIABLE> <absolute path> exists|missing
# Exit code: 1 if any folder is missing, otherwise 0.

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=external-paths.sh
source "$here/external-paths.sh"

status=0
for name in versatile_thermostat vtherm_api hacs; do
    variable="$(external_variable "$name")"
    path="$(external_locate "$name")"
    if [[ -d "$path" ]]; then
        echo "$variable $path exists"
    else
        echo "$variable $path missing"
        status=1
    fi
done
exit "$status"
