"""Tests for the factory that keeps the instance of vtherm_api while the dashboard is loaded."""

from __future__ import annotations

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component
from vtherm_api import VThermAPI

from custom_components.vtherm_dashboard.api_keepalive import KEEPALIVE_NAME, KeepAliveFactory, unregister_api_keepalive
from custom_components.vtherm_dashboard.config_flow_driver import FlowConfigWriter
from custom_components.vtherm_dashboard.native_plugins import NATIVE_PLUGIN_ORDER
from custom_components.vtherm_dashboard.vtherm_config import CENTRAL_TYPE, VTHERM_DOMAIN, central_entry

from .conftest import requires_vtherm


def test_the_factory_applies_to_no_thermostat() -> None:
    """Versatile Thermostat asks `supports()` before `create()`: the factory never makes a manager."""
    factory = KeepAliveFactory()
    assert factory.name == KEEPALIVE_NAME
    assert factory.supports(object()) is False
    with pytest.raises(RuntimeError):
        factory.create(object())


async def test_it_is_registered_with_the_dashboard_and_withdrawn_on_unload(hass: HomeAssistant, setup_dashboard) -> None:
    """The factory exists while the dashboard is loaded."""
    entry = await setup_dashboard()
    assert KEEPALIVE_NAME in VThermAPI.get_vtherm_api(hass).list_feature_managers()
    assert await hass.config_entries.async_unload(entry.entry_id)
    assert KEEPALIVE_NAME not in VThermAPI.get_vtherm_api(hass).list_feature_managers()


async def _setup_central_only(hass: HomeAssistant, setup_dashboard):
    """Set up the real Versatile Thermostat with only its central configuration, then the dashboard."""
    hass.states.async_set("sensor.outdoor", "10")
    assert await async_setup_component(hass, VTHERM_DOMAIN, {})
    await hass.async_block_till_done()
    result = await FlowConfigWriter(hass).async_create(CENTRAL_TYPE, {"main": {"external_temperature_sensor_entity_id": "sensor.outdoor"}, "tpi": {}, "advanced": {}})
    assert result.ok, result.errors
    await hass.async_block_till_done()
    await setup_dashboard()
    return central_entry(hass)


def _ui_plugin_ids(hass: HomeAssistant) -> list[str]:
    return [plugin.id for plugin in VThermAPI.get_vtherm_api(hass).get_ui_plugins()]


@requires_vtherm
async def test_the_plugins_survive_a_reload_of_the_only_entry_of_versatile_thermostat(hass: HomeAssistant, real_vtherm, setup_dashboard) -> None:  # pylint: disable=unused-argument
    """Saving the central configuration when it is the only entry recreates it: the UI plugins stay registered."""
    central = await _setup_central_only(hass, setup_dashboard)
    assert await hass.config_entries.async_reload(central.entry_id)
    await hass.async_block_till_done()
    assert _ui_plugin_ids(hass) == list(NATIVE_PLUGIN_ORDER)


@requires_vtherm
async def test_without_the_factory_versatile_thermostat_drops_the_plugins(hass: HomeAssistant, real_vtherm, setup_dashboard) -> None:  # pylint: disable=unused-argument
    """The case that the factory works around. When it no longer happens, the workaround can be removed."""
    central = await _setup_central_only(hass, setup_dashboard)
    unregister_api_keepalive(hass)
    assert await hass.config_entries.async_reload(central.entry_id)
    await hass.async_block_till_done()
    if _ui_plugin_ids(hass):
        pytest.skip("Versatile Thermostat keeps the API for the UI plugins: api_keepalive.py can be removed")
    assert _ui_plugin_ids(hass) == []
