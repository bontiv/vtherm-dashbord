"""Tests for the get_ui_plugins WebSocket command."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from homeassistant.core import HomeAssistant
from vtherm_api import VThermAPI

from custom_components.vtherm_dashboard.native_plugins import unregister_native_plugins

MANIFEST = json.loads((Path(__file__).resolve().parent.parent / "custom_components" / "vtherm_dashboard" / "manifest.json").read_text(encoding="utf-8"))
COMMAND = "vtherm_dashboard/get_ui_plugins"
DEV_ENTRY = {"id": "mine", "js_url": "http://localhost:5173/ui.js", "dashboard_version": ">=0.1,<1.0"}


@pytest.fixture(name="api")
async def api_fixture(hass: HomeAssistant, setup_dashboard):
    """Set up the dashboard and return the VTherm API of the instance."""
    await setup_dashboard()
    # These tests check the list with their own plugins only.
    unregister_native_plugins(hass)
    yield VThermAPI.get_vtherm_api(hass)
    VThermAPI.reset_vtherm_api()


async def _call(client, **fields) -> dict:
    """Send the command and return the full response."""
    await client.send_json_auto_id({"type": COMMAND, **fields})
    return await client.receive_json()


async def test_authenticated_user_gets_the_ordered_list(hass: HomeAssistant, api, hass_ws_client, hass_read_only_access_token) -> None:
    """Any authenticated user receives the plugins in load order, with their state and the dashboard version."""
    api.register_ui_plugin("b", "/b/ui.js", ">=0.1,<1.0", requires=["a"])
    api.register_ui_plugin("a", "/a/ui.js", ">=0.1,<1.0")
    api.register_ui_plugin("too_new", "/t/ui.js", ">=5.0")

    for client in (await hass_ws_client(hass), await hass_ws_client(hass, hass_read_only_access_token)):
        response = await _call(client)
        assert response["success"] is True
        result = response["result"]
        assert result["dashboard_version"] == MANIFEST["version"]
        assert [(plugin["id"], plugin["state"], plugin["order"]) for plugin in result["plugins"]] == [
            ("a", "ready", 0),
            ("b", "ready", 1),
            ("too_new", "dashboard_incompatible", None),
        ]


async def test_empty_list_still_gives_the_dashboard_version(hass: HomeAssistant, api, hass_ws_client) -> None:  # pylint: disable=unused-argument
    """Without any plugin, the list is empty and the dashboard version is present."""
    result = (await _call(await hass_ws_client(hass)))["result"]
    assert result == {"dashboard_version": MANIFEST["version"], "plugins": []}


async def test_plugin_registered_later_appears_in_next_calls(hass: HomeAssistant, api, hass_ws_client) -> None:
    """The list is rebuilt on each call."""
    client = await hass_ws_client(hass)
    assert (await _call(client))["result"]["plugins"] == []

    api.register_ui_plugin("late", "/late/ui.js", ">=0.1,<1.0")
    assert [plugin["id"] for plugin in (await _call(client))["result"]["plugins"]] == ["late"]


async def test_administrator_can_join_development_entries(hass: HomeAssistant, api, hass_ws_client) -> None:  # pylint: disable=unused-argument
    """The development entries of an administrator are merged into the list."""
    result = (await _call(await hass_ws_client(hass), dev_plugins=[DEV_ENTRY]))["result"]
    assert [(plugin["id"], plugin["source"], plugin["state"]) for plugin in result["plugins"]] == [("mine", "development", "ready")]


async def test_other_users_cannot_join_development_entries(hass: HomeAssistant, api, hass_ws_client, hass_read_only_access_token) -> None:  # pylint: disable=unused-argument
    """A user who is not an administrator is refused when the request carries development entries."""
    response = await _call(await hass_ws_client(hass, hass_read_only_access_token), dev_plugins=[DEV_ENTRY])
    assert response["success"] is False
    assert response["error"]["code"] == "unauthorized"


async def test_development_entries_are_not_kept(hass: HomeAssistant, api, hass_ws_client) -> None:  # pylint: disable=unused-argument
    """The server does not keep the development entries between calls."""
    client = await hass_ws_client(hass)
    await _call(client, dev_plugins=[DEV_ENTRY])
    assert (await _call(client))["result"]["plugins"] == []


async def test_malformed_request_is_refused(hass: HomeAssistant, api, hass_ws_client) -> None:  # pylint: disable=unused-argument
    """A request whose dev_plugins is not a list of objects is refused."""
    response = await _call(await hass_ws_client(hass), dev_plugins="mine")
    assert response["success"] is False
    assert response["error"]["code"] == "invalid_format"
