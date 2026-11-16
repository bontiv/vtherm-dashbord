"""Tests for the registration of the native UI plugins."""

from __future__ import annotations

import json
from pathlib import Path

from homeassistant.core import HomeAssistant
from vtherm_api import VThermAPI

from custom_components.vtherm_dashboard.const import DEV_SERVER_ENV, NATIVE_PLUGIN_IDS
from custom_components.vtherm_dashboard.native_plugins import NATIVE_PLUGIN_ORDER, register_native_plugins
from custom_components.vtherm_dashboard.plugin_list import build_plugin_list

VERSION = json.loads((Path(__file__).resolve().parent.parent / "custom_components" / "vtherm_dashboard" / "manifest.json").read_text(encoding="utf-8"))["version"]


async def test_the_native_plugins_are_registered_when_the_dashboard_is_set_up(hass: HomeAssistant, setup_dashboard) -> None:
    """Every native plugin of the configuration is in vtherm_api, with its module and the exact version of the dashboard."""
    await setup_dashboard()
    plugins = {plugin.id: plugin for plugin in VThermAPI.get_vtherm_api(hass).get_ui_plugins()}
    assert list(plugins) == list(NATIVE_PLUGIN_ORDER)
    assert plugins["core"].js_url == f"/vtherm_dashboard_static/plugins/core.js?v={VERSION}"
    assert {plugin.dashboard_version for plugin in plugins.values()} == {f"=={VERSION}"}
    assert plugins["core"].requires == ()
    assert all(plugin.requires == ("core",) for plugin_id, plugin in plugins.items() if plugin_id != "core")


async def test_they_load_core_first_then_in_the_order_of_the_menu(hass: HomeAssistant, setup_dashboard) -> None:
    """The load list of the server gives them ready, in the order of the menu of the flow."""
    await setup_dashboard()
    entries = build_plugin_list(VThermAPI.get_vtherm_api(hass).get_ui_plugins(), VERSION)
    assert [(entry.id, entry.state, entry.source) for entry in entries] == [(plugin_id, "ready", "native") for plugin_id in NATIVE_PLUGIN_ORDER]


async def test_they_are_withdrawn_when_the_dashboard_is_unloaded_and_registered_again_on_reload(hass: HomeAssistant, setup_dashboard) -> None:
    """Unloading the dashboard withdraws its plugins, a new setup gives them back."""
    entry = await setup_dashboard()
    assert await hass.config_entries.async_unload(entry.entry_id)
    assert VThermAPI.get_vtherm_api(hass).get_ui_plugins() == []
    assert await hass.config_entries.async_setup(entry.entry_id)
    assert len(VThermAPI.get_vtherm_api(hass).get_ui_plugins()) == len(NATIVE_PLUGIN_ORDER)


async def test_a_third_party_that_took_a_native_identifier_first_does_not_prevent_the_others(hass: HomeAssistant, caplog) -> None:
    """The identifier taken by another integration is logged, the other native plugins are registered, and the impostor is excluded."""
    api = VThermAPI.get_vtherm_api(hass)
    api.register_ui_plugin("core_lock", "/other/lock.js", ">=0.1")
    registered = register_native_plugins(hass, VERSION)
    # register_native_plugins unregisters first, so it takes the identifier back from the other integration.
    assert registered == list(NATIVE_PLUGIN_ORDER)
    assert next(plugin for plugin in api.get_ui_plugins() if plugin.id == "core_lock").js_url.startswith("/vtherm_dashboard_static/")
    assert "could not be registered" not in caplog.text


async def test_the_development_server_changes_only_the_urls(hass: HomeAssistant) -> None:
    """With a development server, each native plugin loads its TypeScript source from it, and keeps its constraint and dependencies."""
    api = VThermAPI.get_vtherm_api(hass)
    register_native_plugins(hass, VERSION)
    built = {plugin.id: plugin for plugin in api.get_ui_plugins()}
    register_native_plugins(hass, VERSION, "http://localhost:5198")
    served = {plugin.id: plugin for plugin in api.get_ui_plugins()}

    assert list(served) == list(built)
    for plugin_id, plugin in served.items():
        assert plugin.js_url == f"http://localhost:5198/src/native/plugins/{plugin_id}.ts"
        assert (plugin.dashboard_version, plugin.requires, plugin.load_after) == (built[plugin_id].dashboard_version, built[plugin_id].requires, built[plugin_id].load_after)


async def test_the_native_plugins_from_the_development_server_are_ready(hass: HomeAssistant, setup_dashboard, monkeypatch, hass_ws_client) -> None:
    """Started with the development server of the frontend, the dashboard gets its native plugins ready to load from that server."""
    monkeypatch.setenv(DEV_SERVER_ENV, "http://localhost:5198")
    await setup_dashboard()
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "vtherm_dashboard/get_ui_plugins"})
    plugins = (await client.receive_json())["result"]["plugins"]
    assert [(entry["id"], entry["state"]) for entry in plugins] == [(plugin_id, "ready") for plugin_id in NATIVE_PLUGIN_ORDER]
    assert all(entry["js_url"].startswith("http://localhost:5198/src/native/plugins/") for entry in plugins)


def test_every_native_plugin_has_a_source_for_the_development_server() -> None:
    """The development server serves `frontend/src/native/plugins/<id>.ts`: each native plugin must have that file."""
    sources = Path(__file__).resolve().parent.parent / "frontend" / "src" / "native" / "plugins"
    assert [plugin_id for plugin_id in NATIVE_PLUGIN_ORDER if not (sources / f"{plugin_id}.ts").is_file()] == []


def test_every_native_plugin_of_the_configuration_is_a_reserved_identifier() -> None:
    """The native plugins use the identifiers that are reserved for them."""
    assert set(NATIVE_PLUGIN_ORDER) <= NATIVE_PLUGIN_IDS
    assert NATIVE_PLUGIN_IDS == set(NATIVE_PLUGIN_ORDER)
    assert NATIVE_PLUGIN_ORDER[-1] == "core_complements"


def test_the_order_is_the_one_of_the_frontend() -> None:
    """The load order of the server is the order that the native tabs of the frontend expect."""
    source = (Path(__file__).resolve().parent.parent / "frontend" / "test" / "support" / "native-host.ts").read_text(encoding="utf-8")
    block = source.split("NATIVE_LOAD_ORDER = [", 1)[1].split("]", 1)[0]
    assert [item.strip().strip('"') for item in block.split(",") if item.strip()] == list(NATIVE_PLUGIN_ORDER)
