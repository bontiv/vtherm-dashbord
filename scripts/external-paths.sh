#!/usr/bin/env bash
# Shell Path_Resolver for the external projects. Meant to be sourced, not run.
#
#   source scripts/external-paths.sh
#   external_variable NAME   # VTHERM_HACS_DIR
#   external_default NAME    # external/hacs
#   external_locate NAME     # absolute normalized path, nothing is checked
#   external_resolve NAME    # same, but returns 1 with an error on stderr when it is not a folder
#
# NAME is one of: versatile_thermostat, vtherm_api, hacs.
# A blank variable (unset, empty or only whitespace) selects the default. Any other value is used as given.
# A relative value is resolved against the project root: $VTHERM_PROJECT_ROOT, or the parent of scripts/.

_EXTERNAL_PATHS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

external_variable() {
    case "$1" in
        versatile_thermostat) echo "VTHERM_VERSATILE_THERMOSTAT_DIR" ;;
        vtherm_api) echo "VTHERM_API_DIR" ;;
        hacs) echo "VTHERM_HACS_DIR" ;;
        *) echo "external-paths: unknown external project '$1'" >&2; return 2 ;;
    esac
}

external_default() {
    case "$1" in
        versatile_thermostat | vtherm_api | hacs) echo "external/$1" ;;
        *) echo "external-paths: unknown external project '$1'" >&2; return 2 ;;
    esac
}

# Prints "<origin><TAB><path>" where origin is "set" or "default". Internal helper.
_external_locate_with_origin() {
    local name="$1" variable default value origin root
    variable="$(external_variable "$name")" || return 2
    default="$(external_default "$name")" || return 2
    root="${VTHERM_PROJECT_ROOT:-$(dirname "$_EXTERNAL_PATHS_DIR")}"
    value="${!variable-}"
    if [[ -z "${value//[[:space:]]/}" ]]; then
        value="$default"
        origin="default"
    else
        origin="set"
    fi
    if [[ "$value" == /* ]]; then
        printf '%s\t%s\n' "$origin" "$(realpath -m -s -- "$value")"
    else
        printf '%s\t%s\n' "$origin" "$(realpath -m -s -- "$root/$value")"
    fi
}

external_locate() {
    local located
    located="$(_external_locate_with_origin "$1")" || return $?
    printf '%s\n' "${located#*$'\t'}"
}

external_resolve() {
    local name="$1" variable located origin path
    variable="$(external_variable "$name")" || return 2
    located="$(_external_locate_with_origin "$name")" || return $?
    origin="${located%%$'\t'*}"
    path="${located#*$'\t'}"
    if [[ ! -d "$path" ]]; then
        if [[ "$origin" == "set" ]]; then
            echo "$variable is set to $path, which is not an existing folder" >&2
        else
            echo "$variable is not set and its default $path is not an existing folder" >&2
        fi
        return 1
    fi
    printf '%s\n' "$path"
}
