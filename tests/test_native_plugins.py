"""Tests for the registration of the native UI plugins."""

from __future__ import annotations

import json
from pathlib import Path

from homeassistant.core import HomeAssistant
from vtherm_api import VThermAPI

from custom_components.vtherm_dashboard.const import NATIVE_PLUGIN_IDS
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


def test_every_native_plugin_of_the_configuration_is_a_reserved_identifier() -> None:
    """The native plugins use the identifiers that are reserved for them."""
    assert set(NATIVE_PLUGIN_ORDER) <= NATIVE_PLUGIN_IDS
    assert NATIVE_PLUGIN_IDS - set(NATIVE_PLUGIN_ORDER) == {"core_complements"}


def test_the_order_is_the_one_of_the_frontend() -> None:
    """The load order of the server is the order that the native tabs of the frontend expect."""
    source = (Path(__file__).resolve().parent.parent / "frontend" / "test" / "support" / "native-host.ts").read_text(encoding="utf-8")
    block = source.split("NATIVE_LOAD_ORDER = [", 1)[1].split("]", 1)[0]
    assert [item.strip().strip('"') for item in block.split(",") if item.strip()] == list(NATIVE_PLUGIN_ORDER)
