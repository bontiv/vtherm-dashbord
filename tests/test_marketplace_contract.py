"""The answers of the real Marketplace of Home Assistant to the commands that the adapter of the dashboard sends (`frontend/src/complements/store-client.ts`).

Since Home Assistant 2026.11, HACS is built into Home Assistant as the Marketplace. It has no public API: the dashboard calls the
WebSocket commands that its panel calls. This test runs the real handlers of the Marketplace (`homeassistant.components.marketplace` of
the installed Home Assistant), in the scenarios of the adapter, and compares their answers with `shared/marketplace-answers.json`. The
test of the adapter (`frontend/test/store-contract.test.ts`) replays that file, so the adapter is checked against what the Marketplace
really answers.

Only GitHub is replaced: registering a repository and installing it need the network, so `async_register_repository` and the install of a
repository do what the Marketplace does when they succeed or fail. Everything else is the code of the Marketplace: the guards (entry
loaded, warning accepted, GitHub connected), the errors and the answers.

When the Marketplace changes its answers, the test fails. Check the adapter, then write the new answers with
`pytest tests/test_marketplace_contract.py --update-marketplace-answers` and commit them.
"""

from __future__ import annotations

import importlib.util
import json
from datetime import UTC, datetime
from pathlib import Path
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock

import pytest
from homeassistant.components.websocket_api.const import DOMAIN as WEBSOCKET_DOMAIN
from homeassistant.config_entries import ConfigEntryState
from homeassistant.const import CONF_TOKEN
from homeassistant.core import HomeAssistant
from homeassistant.helpers import translation
from pytest_homeassistant.common import MockConfigEntry, MockUser

from .store_contract import Recorder, repository_in

ANSWERS = Path(__file__).resolve().parent.parent / "shared" / "marketplace-answers.json"

MARKETPLACE_VERSION = "2026.11.0"
"""The version that the test gives to the Marketplace, which answers the version of Home Assistant: a fixed one keeps the file stable."""

pytestmark = pytest.mark.skipif(importlib.util.find_spec("homeassistant.components.marketplace") is None, reason="Home Assistant has no Marketplace (2026.11 and later)")


@pytest.fixture(name="marketplace")
def marketplace_fixture() -> SimpleNamespace:
    """The modules of the Marketplace of the installed Home Assistant."""
    # pylint: disable=import-outside-toplevel
    from homeassistant.components.lovelace import LOVELACE_DATA
    from homeassistant.components.marketplace import base, const, enums, exceptions, websocket
    from homeassistant.components.marketplace.repositories import REPOSITORY_CLASSES

    return SimpleNamespace(LOVELACE_DATA=LOVELACE_DATA, base=base, const=const, enums=enums, exceptions=exceptions, websocket=websocket, classes=REPOSITORY_CLASSES)


def _accepted(user: MockUser, modules: SimpleNamespace) -> dict[str, Any]:
    """The data of the entry that says that the user accepted the warning of the Marketplace."""
    return {modules.const.CONF_WARNING_ACCEPTED: {user.id: {"version": modules.const.WARNING_VERSION, "accepted_at": "2026-11-01T00:00:00+00:00"}}}


def _marketplace(hass: HomeAssistant, modules: SimpleNamespace, user: MockUser) -> tuple[Any, MockConfigEntry]:
    """Build the Marketplace as it is once started, with the categories integration and plugin, its warning accepted and GitHub connected."""
    hass.data[modules.LOVELACE_DATA] = SimpleNamespace(resource_mode="storage")
    entry = MockConfigEntry(domain=modules.const.DOMAIN, data={CONF_TOKEN: "token", **_accepted(user, modules)})
    entry.add_to_hass(hass)
    manager = modules.base.MarketplaceManager(hass, entry)
    manager.version = MARKETPLACE_VERSION
    manager.stage = modules.enums.MarketplaceStage.RUNNING
    manager.status.startup = False
    manager.common.categories = {modules.enums.RepositoryCategory.INTEGRATION, modules.enums.RepositoryCategory.PLUGIN}
    manager.data = SimpleNamespace(async_write=AsyncMock())
    entry.runtime_data = manager
    entry.mock_state(hass, ConfigEntryState.LOADED)
    return manager, entry


FETCHED = datetime(2026, 1, 1, tzinfo=UTC)
"""When the repositories of the test were fetched from GitHub."""


def _repository(manager: Any, modules: SimpleNamespace, full_name: str, repository_id: int, **state: bool) -> Any:
    """A repository of the Marketplace, as the Marketplace keeps it once it fetched it from GitHub.

    `restart=False` makes its installation load it at once, `fetched=False` keeps it out of the list until it is fetched.
    """
    repository = modules.classes[modules.enums.RepositoryCategory.INTEGRATION](manager, full_name)
    fields = {
        "id": str(repository_id),
        "domain": full_name.split("/")[1].replace("-", "_"),
        "last_fetched": FETCHED if state.get("fetched", True) else None,
        "new": False,
        "releases": True,
        "last_version": "1.2.0",
        "config_flow": True,
        "authors": ["@owner"],
    }
    for name, value in fields.items():
        setattr(repository.data, name, value)
    manager.repositories.register(repository)
    restart = state.get("restart", True)

    async def install(ref: str | None) -> None:  # pylint: disable=unused-argument
        # What the Marketplace does after it installed an integration: installed, and waiting for a restart of Home Assistant unless it
        # could load the integration at once (a new one with a config flow).
        repository.data.installed = True
        repository.data.installed_version = repository.data.last_version
        repository.pending_restart = restart

    repository._async_install_repository = install  # pylint: disable=protected-access
    return repository


def _normalize(result: Any) -> Any:
    """Make an answer the same at each run: the Marketplace keeps its categories and its repositories in sets, under the configuration folder."""
    if isinstance(result, dict) and isinstance(result.get("categories"), list):
        return {**result, "categories": sorted(result["categories"])}
    if isinstance(result, list) and all(isinstance(item, dict) and "full_name" in item for item in result):
        return [{**item, "local_path": Path(item["local_path"]).name} for item in sorted(result, key=lambda item: item["full_name"])]
    return result


LIST = {"type": "marketplace/repositories/list", "categories": ["integration"]}


_in = repository_in


async def _record(hass: HomeAssistant, modules: SimpleNamespace, client, user: MockUser) -> dict[str, list[dict[str, Any]]]:  # pylint: disable=too-many-statements,too-many-locals
    """Run every scenario of the adapter against the real Marketplace, in the order of the commands that the adapter sends."""
    recorder = Recorder(client, _normalize)
    # The messages of the errors are the English texts of the Marketplace, which Home Assistant reads for the loaded components.
    hass.config.components.add(modules.const.DOMAIN)
    await translation.async_load_integrations(hass, {modules.const.DOMAIN})

    # Without the Marketplace, Home Assistant does not know its commands.
    await recorder.call("absent", {"type": "marketplace/info"})

    # The commands are registered when Home Assistant starts, the entry can be loaded later or not at all.
    modules.websocket.async_register_websocket_commands(hass)
    await recorder.call("not_loaded", {"type": "marketplace/info"})

    manager, entry = _marketplace(hass, modules, user)
    await recorder.call("ready", {"type": "marketplace/info"})
    manager.system.disabled_reason = modules.enums.DisabledReason.RATE_LIMIT
    await recorder.call("disabled", {"type": "marketplace/info"})
    manager.system.disabled_reason = None

    # The repository is already in the Marketplace: no add, an install, then the list again.
    present = _repository(manager, modules, "owner/present-addon", 101)
    await recorder.call("install_present", LIST)
    await recorder.call("install_present", {"type": "marketplace/repository/install", "repository": str(present.data.id)})
    await recorder.call("install_present", LIST)

    # A new integration with a config flow: the Marketplace loads it at once, without a restart.
    fresh = _repository(manager, modules, "owner/fresh-addon", 104, restart=False)
    await recorder.call("install_without_restart", LIST)
    await recorder.call("install_without_restart", {"type": "marketplace/repository/install", "repository": str(fresh.data.id)})
    await recorder.call("install_without_restart", LIST)

    # The repository is not in the Marketplace: the Marketplace fetches it from GitHub when it is added.
    async def register(repository_full_name: str, category: str, **kwargs) -> list | None:  # pylint: disable=unused-argument
        if repository_full_name == "owner/absent-addon":
            _repository(manager, modules, repository_full_name, 102)
            return None
        # What GitHub answers for a repository that is not a valid add-on.
        raise modules.exceptions.MarketplaceError(f"Repository structure for {repository_full_name} is not compliant")

    manager.async_register_repository = register
    await recorder.call("install_absent", LIST)
    await recorder.call("install_absent", {"type": "marketplace/repositories/add", "repository": "owner/absent-addon", "category": "integration"})
    after_add = await recorder.call("install_absent", LIST)
    added = _in(after_add, "owner/absent-addon")
    assert added is not None
    await recorder.call("install_absent", {"type": "marketplace/repository/install", "repository": str(added["id"])})
    await recorder.call("install_absent", LIST)

    # The Marketplace refuses the repository, with an error and its message.
    await recorder.call("add_failed", LIST)
    await recorder.call("add_failed", {"type": "marketplace/repositories/add", "repository": "owner/refused-addon", "category": "integration"})

    # The Marketplace knows the repository but has not fetched it yet, so its list does not show it; it is listed once fetched.
    pending = _repository(manager, modules, "owner/pending-addon", 105, fetched=False)
    await recorder.call("repository_exists", LIST)
    await recorder.call("repository_exists", {"type": "marketplace/repositories/add", "repository": "owner/pending-addon", "category": "integration"})
    pending.data.last_fetched = FETCHED
    await recorder.call("repository_exists", LIST)
    await recorder.call("repository_exists", {"type": "marketplace/repository/install", "repository": str(pending.data.id)})
    await recorder.call("repository_exists", LIST)

    # The install fails: the Marketplace answers with an error and its message.
    failing = _repository(manager, modules, "owner/failing-addon", 103)

    async def install_fails(ref: str | None) -> None:  # pylint: disable=unused-argument
        raise modules.exceptions.MarketplaceError("No release found")

    failing._async_install_repository = install_fails  # pylint: disable=protected-access
    await recorder.call("install_failed", LIST)
    await recorder.call("install_failed", {"type": "marketplace/repository/install", "repository": str(failing.data.id)})

    # GitHub is not connected: adding a repository is refused, installing one that the Marketplace has is not.
    manager.configuration.token = None
    await recorder.call("github_not_connected", {"type": "marketplace/info"})
    await recorder.call("github_not_connected", LIST)
    await recorder.call("github_not_connected", {"type": "marketplace/repositories/add", "repository": "owner/new-addon", "category": "integration"})
    manager.configuration.token = "token"

    # The warning is not accepted: the Marketplace refuses to install.
    hass.config_entries.async_update_entry(entry, data={CONF_TOKEN: "token"})
    waiting = _repository(manager, modules, "owner/waiting-addon", 106)
    await recorder.call("warning_not_accepted", {"type": "marketplace/info"})
    await recorder.call("warning_not_accepted", LIST)
    await recorder.call("warning_not_accepted", {"type": "marketplace/repository/install", "repository": str(waiting.data.id)})
    hass.config_entries.async_update_entry(entry, data={CONF_TOKEN: "token", **_accepted(user, modules)})

    # A Marketplace that no longer has a command answers as Home Assistant does for any unknown command.
    hass.data[WEBSOCKET_DOMAIN].pop("marketplace/repositories/add")
    await recorder.call("install_interface_changed", LIST)
    await recorder.call("install_interface_changed", {"type": "marketplace/repositories/add", "repository": "owner/new-addon", "category": "integration"})
    return recorder.scenarios


async def test_the_marketplace_answers_as_the_adapter_expects(hass: HomeAssistant, hass_ws_client, hass_admin_user: MockUser, marketplace, request) -> None:
    """The answers of the real Marketplace are those of `shared/marketplace-answers.json`, which the test of the adapter replays."""
    scenarios = await _record(hass, marketplace, await hass_ws_client(hass), hass_admin_user)
    actual = {"marketplace_version": MARKETPLACE_VERSION, "scenarios": scenarios}
    if request.config.getoption("--update-marketplace-answers"):
        ANSWERS.write_text(json.dumps(actual, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    expected = json.loads(ANSWERS.read_text(encoding="utf-8"))
    assert actual == expected, "The Marketplace changed its answers: check the adapter, then run pytest tests/test_marketplace_contract.py --update-marketplace-answers"


async def test_the_answers_show_what_the_adapter_relies_on(hass: HomeAssistant, hass_ws_client, hass_admin_user: MockUser, marketplace) -> None:
    """The particularities of the Marketplace that the adapter handles are really there."""
    scenarios = await _record(hass, marketplace, await hass_ws_client(hass), hass_admin_user)
    assert scenarios["absent"][0]["error"]["code"] == "unknown_command"
    assert scenarios["not_loaded"][0]["error"]["code"] == "not_loaded"
    ready = scenarios["ready"][0]["result"]
    assert (ready["version"], ready["warning_accepted"], ready["github_connected"]) == (MARKETPLACE_VERSION, True, True)
    assert scenarios["disabled"][0]["result"]["disabled_reason"] == "rate_limit"
    # The answers of the list have the fields of HACS that the adapter reads.
    listed = _in(scenarios["install_present"][0], "owner/present-addon")
    assert {"id", "full_name", "category", "installed", "status", "installed_version", "available_version", "config_flow"} <= set(listed)
    assert _in(scenarios["install_present"][2], "owner/present-addon")["status"] == "pending-restart"
    assert _in(scenarios["install_without_restart"][2], "owner/fresh-addon")["status"] == "installed"
    # Unlike HACS, a refused repository is an error, with a message.
    assert scenarios["add_failed"][1]["error"]["code"] == "add_failed"
    assert "owner/refused-addon" in scenarios["add_failed"][1]["error"]["message"]
    assert _in(scenarios["repository_exists"][0], "owner/pending-addon") is None
    assert scenarios["repository_exists"][1]["error"]["code"] == "repository_exists"
    assert scenarios["install_failed"][1]["error"]["code"] == "error"
    assert scenarios["github_not_connected"][0]["result"]["github_connected"] is False
    assert scenarios["github_not_connected"][2]["error"]["code"] == "github_not_connected"
    assert scenarios["warning_not_accepted"][0]["result"]["warning_accepted"] is False
    assert scenarios["warning_not_accepted"][2]["error"]["code"] == "warning_not_accepted"
    assert scenarios["install_interface_changed"][1]["error"]["code"] == "unknown_command"
