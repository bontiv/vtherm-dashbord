"""Tests for the Python side of the sample plugin of `examples/`."""

from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest

from custom_components.vtherm_dashboard.native_plugins import NATIVE_PLUGIN_ORDER, native_js_url
from custom_components.vtherm_dashboard.plugin_list import build_plugin_list

SAMPLE = Path(__file__).resolve().parent.parent / "examples" / "vtherm_sample_plugin"


def _load_sample():
    """Import the integration of the sample, which is not in the folder that Home Assistant loads."""
    spec = importlib.util.spec_from_file_location("vtherm_sample_plugin_example", SAMPLE / "custom_components" / "vtherm_sample_plugin" / "__init__.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture(name="api")
def api_fixture(api):
    """The VThermAPI of a minimal Home Assistant-like object, with the native plugins registered."""
    vtherm_api, _ = api
    for plugin_id in NATIVE_PLUGIN_ORDER:
        vtherm_api.register_ui_plugin(plugin_id, native_js_url(plugin_id, "0.1.0"), "==0.1.0")
    return api


def test_the_sample_registers_two_plugins_that_the_dashboard_accepts(api) -> None:
    """The plugins are ready, the one that removes a widget loads after the one that offers it, and after the TPI section."""
    vtherm_api, hass = api
    sample = _load_sample()
    sample.register_sample_plugins(hass)
    entries = {entry.id: entry for entry in build_plugin_list(vtherm_api.get_ui_plugins(), "0.1.0")}
    assert entries[sample.SAMPLE_PLUGIN].state == "ready"
    assert entries[sample.EXTRAS_PLUGIN].state == "ready"
    assert entries[sample.EXTRAS_PLUGIN].order < entries[sample.SAMPLE_PLUGIN].order
    assert entries["core_tpi"].order < entries[sample.SAMPLE_PLUGIN].order
    assert entries["core_sync_temp"].order < entries[sample.SAMPLE_PLUGIN].order
    assert entries[sample.SAMPLE_PLUGIN].js_url == "/vtherm_sample_plugin_static/vtherm-sample.js?v=0.1.0"


def test_the_sample_can_be_registered_again_and_withdrawn(api) -> None:
    """A reload registers again without error, and unregistering removes both plugins."""
    vtherm_api, hass = api
    sample = _load_sample()
    sample.register_sample_plugins(hass)
    sample.register_sample_plugins(hass, "0.2.0")
    assert next(plugin for plugin in vtherm_api.get_ui_plugins() if plugin.id == sample.SAMPLE_PLUGIN).js_url.endswith("?v=0.2.0")
    sample.unregister_sample_plugins(hass)
    assert {plugin.id for plugin in vtherm_api.get_ui_plugins()} == set(NATIVE_PLUGIN_ORDER)


def test_the_constraint_of_the_sample_supports_the_current_dashboard(api) -> None:
    """The sample is not refused as incompatible by the dashboard version of this repository."""
    vtherm_api, hass = api
    sample = _load_sample()
    sample.register_sample_plugins(hass)
    entries = {entry.id: entry for entry in build_plugin_list(vtherm_api.get_ui_plugins(), "0.1.0")}
    assert entries[sample.SAMPLE_PLUGIN].dashboard_version == sample.DASHBOARD_VERSION
