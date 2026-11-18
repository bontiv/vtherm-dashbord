#!/usr/bin/env bash
# Prepare the development environment: Python dependencies, external repositories
# (Versatile Thermostat, vtherm_api and HACS) and the Home Assistant configuration.
set -euo pipefail

cd "$(dirname "$0")/.."

VTHERM_API_REPO="${VTHERM_API_REPO:-https://github.com/jmcollin78/vtherm_api.git}"
# A branch or a tag of vtherm_api, empty for the default branch. The dashboard needs the registry of UI plugins of vtherm_api: until it
# is published, set VTHERM_API_REPO (and VTHERM_API_REF) to the fork or the branch that has it.
VTHERM_API_REF="${VTHERM_API_REF:-}"

# Versatile Thermostat and HACS, at the references of external-refs.txt (a folder of external/ that exists is never changed).
# To use another repository or reference: VERSATILE_THERMOSTAT_REPO, VERSATILE_THERMOSTAT_REF, HACS_REPO and HACS_REF.
bash scripts/fetch-external.sh
if [ ! -d external/vtherm_api ]; then
    if [ -n "$VTHERM_API_REF" ]; then
        git clone --branch "$VTHERM_API_REF" "$VTHERM_API_REPO" external/vtherm_api
    else
        git clone "$VTHERM_API_REPO" external/vtherm_api
    fi
fi

python -m pip install --upgrade pip
python -m pip install -r requirements-dev.txt

# vtherm_api in editable mode: changes are picked up when Home Assistant restarts.
python -m pip install -e external/vtherm_api

# Dependencies of the Versatile Thermostat integration, without the published vtherm_api package.
python -m pip install numpy scipy

# The browser of Home Assistant asks for the voice assistants and the cameras when it starts, and stays on "Loading data" without their
# packages. Install the ones that the installed Home Assistant requires, at the versions that it asks for.
python - <<'PYTHON' | xargs -r python -m pip install
import json
import pathlib
import sys

root = pathlib.Path(sys.prefix) / "lib" / f"python{sys.version_info.major}.{sys.version_info.minor}" / "site-packages" / "homeassistant" / "components"
seen, todo, requirements = set(), ["conversation", "ai_task", "assist_pipeline", "camera", "tts", "assist_satellite", "stt"], set()
while todo:
    name = todo.pop()
    manifest = root / name / "manifest.json"
    if name in seen or not manifest.exists():
        continue
    seen.add(name)
    data = json.loads(manifest.read_text(encoding="utf-8"))
    requirements.update(data.get("requirements", []))
    todo.extend(data.get("dependencies", []))
print("\n".join(sorted(requirements)))
PYTHON

# Frontend and SDK: npm workspaces installed from the root package.json, into the volumes of devcontainer.json. A new volume belongs to
# root: give it to the user of the container first.
if [ -f package.json ]; then
    sudo chown -R "$(id -u):$(id -g)" node_modules frontend/node_modules 2>/dev/null || true
    npm ci
fi

# The sample plugin is not a workspace. It gets the SDK of this repository from a tarball, like a plugin of an author. This is best effort:
# the sample is not needed to work on the dashboard, and the build of the SDK may fail while it is changing.
if [ -d examples/vtherm_sample_plugin/ui ]; then
    if npm run build -w packages/sdk && npm pack -w packages/sdk --ignore-scripts --pack-destination /tmp; then
        (cd examples/vtherm_sample_plugin/ui && npm install --no-save --ignore-scripts /tmp/vtherm-dashboard-sdk-*.tgz) \
            || echo "The sample plugin is not installed: see docs/contributing/development-environment.md."
    fi
fi

# Home Assistant configuration (config/ is ignored by git).
mkdir -p config
if [ ! -f config/configuration.yaml ]; then
    cp .devcontainer/configuration.yaml config/configuration.yaml
fi

echo "Environment ready. Start Home Assistant with: bash .devcontainer/start-ha.sh"
