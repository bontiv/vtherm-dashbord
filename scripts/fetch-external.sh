#!/usr/bin/env bash
# Get the repositories of external-refs.txt into external/, each at its reference. A folder that exists is left as it is.
# To use another repository or reference for one of them, set NAME_REPO and NAME_REF, in upper case: VERSATILE_THERMOSTAT_REF=main.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p external
while read -r name url ref; do
    case "$name" in "" | "#"*) continue ;; esac
    upper="$(echo "$name" | tr '[:lower:]' '[:upper:]')"
    repo_var="${upper}_REPO"
    ref_var="${upper}_REF"
    url="${!repo_var:-$url}"
    ref="${!ref_var:-$ref}"
    target="external/$name"
    if [ -d "$target" ]; then
        echo "external/$name exists, left as it is"
        continue
    fi
    echo "external/$name: $url at $ref"
    git init -q "$target"
    git -C "$target" remote add origin "$url"
    # A shallow fetch of one commit works for a tag, a branch and a full commit identifier on GitHub.
    git -C "$target" fetch -q --depth 1 origin "$ref"
    git -C "$target" checkout -q FETCH_HEAD
done < external-refs.txt
