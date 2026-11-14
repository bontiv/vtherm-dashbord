#!/usr/bin/env bash
# Check the Python code with the same tools and settings as Versatile Thermostat:
# Black in check mode (180 columns) and pylint (max-line-length=180).
# Usage: scripts/check-python.sh [path ...]   (default: every Python file of the repository)
set -euo pipefail
cd "$(dirname "$0")/.."

if [ "$#" -gt 0 ]; then
    files=("$@")
else
    files=()
    while IFS= read -r file; do
        files+=("$file")
    done < <(find . \( -name .venv -o -name venv -o -name node_modules -o -name external -o -name config -o -name .git -o -name dist \) -prune -o -name '*.py' -print | sort)
fi

if [ "${#files[@]}" -eq 0 ]; then
    echo "No Python file to check."
    exit 0
fi

python -m black --check "${files[@]}"
python -m pylint --rcfile=.pylintrc "${files[@]}"
