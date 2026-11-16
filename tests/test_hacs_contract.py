"""The answers of the real HACS to the commands that the adapter of the dashboard sends (`frontend/src/complements/hacs-client.ts`).

HACS has no public API: the dashboard calls the WebSocket commands that the interface of HACS calls. This test runs the real handlers of
`external/hacs` in Home Assistant, in the scenarios of the adapter, and compares their answers with `shared/hacs-answers.json`. The test
of the adapter (`frontend/test/hacs-contract.test.ts`) replays that file, so the adapter is checked against what HACS really answers.

Only GitHub is replaced: registering a repository and downloading it need the network, so `async_register_repository` and
`async_download_repository` do what HACS does when they succeed or fail. Everything else is the code of HACS.

When HACS changes its answers, the test fails. Check the adapter, then write the new answers with
`pytest tests/test_hacs_contract.py --update-hacs-answers` and commit them.
"""

from __future__ import annotations

import importlib
import json
from datetime import UTC, datetime
from pathlib import Path
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock

import pytest
from homeassistant.components.websocket_api.const import DOMAIN as WEBSOCKET_DOMAIN
from homeassistant.core import HomeAssistant

import custom_components

EXTERNAL_HACS = Path(__file__).resolve().parent.parent / "external" / "hacs" / "custom_components"
"""The HACS of the development environment, at the reference of `external-refs.txt`."""

ANSWERS = Path(__file__).resolve().parent.parent / "shared" / "hacs-answers.json"

HACS_VERSION = "2.0.5"
"""The version that the test gives to HACS. A clone of its repository says `0.0.0`; a release says its own version."""

pytestmark = pytest.mark.skipif(not EXTERNAL_HACS.is_dir(), reason="external/hacs is not available")


@pytest.fixture(name="hacs_modules")
def hacs_modules_fixture():
    """Import the modules of the real HACS from `external/hacs`."""
    path = str(EXTERNAL_HACS)
    custom_components.__path__.append(path)
    modules = SimpleNamespace(
        base=importlib.import_module("custom_components.hacs.base"),
        enums=importlib.import_module("custom_components.hacs.enums"),
        exceptions=importlib.import_module("custom_components.hacs.exceptions"),
        queue=importlib.import_module("custom_components.hacs.utils.queue_manager"),
        integration=importlib.import_module("custom_components.hacs.repositories.integration"),
        websocket=importlib.import_module("custom_components.hacs.websocket"),
    )
    yield modules
    # The path of a namespace package has no remove(): its list is private.
    custom_components.__path__._path = [entry for entry in custom_components.__path__._path if entry != path]  # pylint: disable=protected-access,no-member


def _hacs(hass: HomeAssistant, modules: SimpleNamespace) -> Any:
    """Build HACS as it is once started, with the categories integration and plugin, and register its commands."""
    hacs = modules.base.HacsBase()
    hacs.hass = hass
    hacs.version = HACS_VERSION
    hacs.stage = modules.enums.HacsStage.RUNNING
    hacs.common.categories = {modules.enums.HacsCategory.INTEGRATION, modules.enums.HacsCategory.PLUGIN}
    hacs.queue = modules.queue.QueueManager(hass=hass)
    hacs.core.config_path = Path("/config")
    hacs.data = SimpleNamespace(async_write=AsyncMock())
    hacs.async_recreate_entities = AsyncMock()
    hass.data["hacs"] = hacs
    modules.websocket.async_register_websocket_commands(hass)
    return hacs


def _repository(hacs: Any, modules: SimpleNamespace, full_name: str, repository_id: int) -> Any:
    """A repository of HACS, as HACS keeps it once it fetched it from GitHub."""
    repository = modules.integration.HacsIntegrationRepository(hacs, full_name)
    # HACS keeps the identifier of GitHub as text, and answers it as text.
    repository.data.id = str(repository_id)
    repository.data.domain = full_name.split("/")[1].replace("-", "_")
    repository.data.last_fetched = datetime(2026, 1, 1, tzinfo=UTC)
    repository.data.new = False
    repository.data.releases = True
    repository.data.last_version = "1.2.0"
    repository.data.config_flow = True
    repository.data.authors = ["@owner"]
    hacs.repositories.register(repository)

    async def download(ref: str | None = None) -> None:  # pylint: disable=unused-argument
        # What HACS does after a download of an integration: installed, and waiting for a restart of Home Assistant.
        repository.data.installed = True
        repository.data.installed_version = repository.data.last_version
        repository.pending_restart = True

    repository.async_download_repository = download
    return repository


class Recorder:  # pylint: disable=too-few-public-methods
    """Send the commands of a scenario and keep the answers."""

    def __init__(self, client) -> None:
        self.client = client
        self.scenarios: dict[str, list[dict[str, Any]]] = {}

    async def call(self, scenario: str, message: dict[str, Any]) -> dict[str, Any]:
        """Send a command and record its answer, or its error."""
        await self.client.send_json_auto_id(dict(message))
        answer = await self.client.receive_json()
        exchange: dict[str, Any] = {"request": message}
        if answer["success"]:
            exchange["result"] = _normalize(answer["result"])
        else:
            exchange["error"] = {"code": answer["error"]["code"], "message": answer["error"]["message"]}
        self.scenarios.setdefault(scenario, []).append(exchange)
        return exchange


def _normalize(result: Any) -> Any:
    """Make an answer the same at each run: HACS keeps its categories and its repositories in sets."""
    if isinstance(result, dict) and isinstance(result.get("categories"), list):
        return {**result, "categories": sorted(result["categories"])}
    if isinstance(result, list) and all(isinstance(item, dict) and "full_name" in item for item in result):
        return sorted(result, key=lambda item: item["full_name"])
    return result


LIST = {"type": "hacs/repositories/list", "categories": ["integration"]}


def _in(exchange: dict[str, Any], full_name: str) -> dict[str, Any] | None:
    return next((item for item in exchange["result"] if item["full_name"] == full_name), None)


async def _record(hass: HomeAssistant, modules: SimpleNamespace, client) -> dict[str, list[dict[str, Any]]]:
    """Run every scenario of the adapter against the real HACS, in the order of the commands that the adapter sends."""
    recorder = Recorder(client)

    # Without HACS, Home Assistant does not know its commands.
    await recorder.call("absent", {"type": "hacs/info"})

    hacs = _hacs(hass, modules)
    await recorder.call("ready", {"type": "hacs/info"})
    hacs.system.disabled_reason = modules.enums.HacsDisabledReason.RATE_LIMIT
    await recorder.call("disabled", {"type": "hacs/info"})
    hacs.system.disabled_reason = None

    # The repository is already in HACS: no add, a download, then the list again.
    present = _repository(hacs, modules, "owner/present-addon", 101)
    await recorder.call("install_present", LIST)
    await recorder.call("install_present", {"type": "hacs/repository/download", "repository": str(present.data.id)})
    await recorder.call("install_present", LIST)

    # The repository is not in HACS: HACS fetches it from GitHub when it is added.
    async def register(repository_full_name: str, category: str, **kwargs) -> None:  # pylint: disable=unused-argument
        if repository_full_name == "owner/absent-addon":
            _repository(hacs, modules, repository_full_name, 102)
            return
        # What GitHub answers for a repository that is not a valid add-on: HACS catches it and answers the command without error.
        raise modules.exceptions.HacsException(f"Repository structure for {repository_full_name} is not compliant")

    hacs.async_register_repository = register
    await recorder.call("install_absent", LIST)
    await recorder.call("install_absent", {"type": "hacs/repositories/add", "repository": "owner/absent-addon", "category": "integration"})
    after_add = await recorder.call("install_absent", LIST)
    added = _in(after_add, "owner/absent-addon")
    assert added is not None
    await recorder.call("install_absent", {"type": "hacs/repository/download", "repository": str(added["id"])})
    await recorder.call("install_absent", LIST)

    # HACS refuses the repository, without an error in the answer.
    await recorder.call("install_refused", LIST)
    await recorder.call("install_refused", {"type": "hacs/repositories/add", "repository": "owner/refused-addon", "category": "integration"})
    await recorder.call("install_refused", LIST)

    # The download fails: HACS answers with an error and its message.
    failing = _repository(hacs, modules, "owner/failing-addon", 103)

    async def download_fails(ref: str | None = None) -> None:  # pylint: disable=unused-argument
        raise modules.exceptions.HacsException("No release found")

    failing.async_download_repository = download_fails
    await recorder.call("install_download_error", LIST)
    await recorder.call("install_download_error", {"type": "hacs/repository/download", "repository": str(failing.data.id)})

    # A HACS that no longer has a command answers as Home Assistant does for any unknown command.
    hass.data[WEBSOCKET_DOMAIN].pop("hacs/repositories/add")
    await recorder.call("install_interface_changed", LIST)
    await recorder.call("install_interface_changed", {"type": "hacs/repositories/add", "repository": "owner/new-addon", "category": "integration"})
    return recorder.scenarios


async def test_hacs_answers_as_the_adapter_expects(hass: HomeAssistant, hass_ws_client, hacs_modules, request) -> None:
    """The answers of the real HACS are those of `shared/hacs-answers.json`, which the test of the adapter replays."""
    scenarios = await _record(hass, hacs_modules, await hass_ws_client(hass))
    actual = {"hacs_version": HACS_VERSION, "scenarios": scenarios}
    if request.config.getoption("--update-hacs-answers"):
        ANSWERS.write_text(json.dumps(actual, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    expected = json.loads(ANSWERS.read_text(encoding="utf-8"))
    assert actual == expected, "HACS changed its answers: check the adapter, then run pytest tests/test_hacs_contract.py --update-hacs-answers"


async def test_the_answers_show_what_the_adapter_relies_on(hass: HomeAssistant, hass_ws_client, hacs_modules) -> None:
    """The particularities of HACS that the adapter handles are really there."""
    scenarios = await _record(hass, hacs_modules, await hass_ws_client(hass))
    assert scenarios["absent"][0]["error"]["code"] == "unknown_command"
    assert scenarios["ready"][0]["result"]["version"] == HACS_VERSION
    assert scenarios["disabled"][0]["result"]["disabled_reason"] == "rate_limit"
    # A refused repository gets the same answer as an accepted one: only the list tells them apart.
    assert scenarios["install_refused"][1]["result"] == scenarios["install_absent"][1]["result"] == {}
    assert _in(scenarios["install_refused"][2], "owner/refused-addon") is None
    assert scenarios["install_download_error"][1]["error"] == {"code": "error", "message": "No release found"}
    assert _in(scenarios["install_absent"][4], "owner/absent-addon")["status"] == "pending-restart"
    assert scenarios["install_interface_changed"][1]["error"]["code"] == "unknown_command"
