#!/usr/bin/env bash
# Get the repositories of external-refs.txt, each at its reference, into the Default_Location (external/<name>).
# Usage: scripts/fetch-external.sh [name ...]   Without a name, every project of external-refs.txt is handled.
# A project whose location variable (VTHERM_*_DIR, see scripts/external-paths.sh) is not blank is skipped, and its path is printed.
# A default folder that exists is left as it is. Otherwise the clone goes into external/.<name>.tmp.<pid>, renamed on success,
# so a failure leaves no partial folder. The other projects are still tried, and the exit code is 1 if any failed.
# To use another repository or reference for one of them, set NAME_REPO and NAME_REF, in upper case: VERSATILE_THERMOSTAT_REF=main.
set -uo pipefail
cd "$(dirname "$0")/.."
# shellcheck source=external-paths.sh
source scripts/external-paths.sh

failed=0
tmp=""
trap '[ -n "$tmp" ] && rm -rf -- "$tmp"' EXIT

# fail NAME STEP URL REF: report to stderr and remember the failure.
fail() {
    echo "$1: $2 failed ($3 at $4)" >&2
    failed=1
}

# clone_one NAME URL REF TARGET: returns 0 on success, 1 on failure (message printed, temporary folder removed).
clone_one() {
    local name="$1" url="$2" ref="$3" target="$4"
    tmp="$(dirname "$target")/.$name.tmp.$$"
    rm -rf -- "$tmp"
    local step
    # A shallow fetch of one commit works for a tag, a branch and a full commit identifier on GitHub.
    for step in "mkdir" "init" "remote" "fetch" "checkout" "rename"; do
        case "$step" in
            mkdir) mkdir -p -- "$(dirname "$target")" ;;
            init) git init -q "$tmp" ;;
            remote) git -C "$tmp" remote add origin "$url" ;;
            fetch) git -C "$tmp" fetch -q --depth 1 origin "$ref" ;;
            checkout) git -C "$tmp" checkout -q FETCH_HEAD ;;
            rename) mv -- "$tmp" "$target" ;;
        esac >/dev/null 2>&1 || {
            rm -rf -- "$tmp"
            tmp=""
            fail "$name" "$step" "$url" "$ref"
            return 1
        }
    done
    tmp=""
    return 0
}

wanted=("$@")
seen=()
while read -r name url ref; do
    case "$name" in "" | "#"*) continue ;; esac
    if [ ${#wanted[@]} -gt 0 ]; then
        match=0
        for w in "${wanted[@]}"; do [ "$w" = "$name" ] && match=1; done
        [ "$match" = 1 ] || continue
    fi
    seen+=("$name")
    variable="$(external_variable "$name")" || { failed=1; continue; }
    target="$(external_locate "$name")"
    value="${!variable-}"
    if [[ -n "${value//[[:space:]]/}" ]]; then
        echo "$name: using $target ($variable)"
        continue
    fi
    if [ -d "$target" ]; then
        echo "$target exists, left as it is"
        continue
    fi
    upper="$(echo "$name" | tr '[:lower:]' '[:upper:]')"
    repo_var="${upper}_REPO"
    ref_var="${upper}_REF"
    url="${!repo_var:-$url}"
    ref="${!ref_var:-$ref}"
    echo "$name: $url at $ref -> $target"
    clone_one "$name" "$url" "$ref" "$target" || true
done < external-refs.txt

for w in "${wanted[@]}"; do
    found=0
    for s in "${seen[@]}"; do [ "$s" = "$w" ] && found=1; done
    if [ "$found" = 0 ]; then
        echo "$w: not listed in external-refs.txt" >&2
        failed=1
    fi
done
exit "$failed"
