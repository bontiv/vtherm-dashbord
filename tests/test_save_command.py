"""Tests for the command save_config: the tabs through the writer, then the presets, without Versatile Thermostat.

The writer is a fake, and the preset temperatures are fake number entities of Versatile Thermostat in the entity registry. What the
real config flow and the real entities do is tested in test_config_flow_driver.py and test_presets.py, which run Versatile Thermostat.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

import pytest
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant.common import MockConfigEntry

from custom_components.vtherm_dashboard import websocket_api
from custom_components.vtherm_dashboard.config_flow_driver import ConfigWriter, FieldError, SaveResult
from custom_components.vtherm_dashboard.presets import PRESET_MARKER, read_presets
from custom_components.vtherm_dashboard.vtherm_config import VTHERM_DOMAIN

PRESETS = {"eco_temp": 17.0, "comfort_temp": 19.0}
"""The preset temperatures of the fake thermostat."""


class FakeConfigWriter(ConfigWriter):
    """A writer whose result the test sets, and which records the changes that it receives."""

    result = SaveResult(True, None, [])
    calls: list[tuple[str, Mapping[str, Mapping[str, Any]]]] = []

    def __init__(self, hass: HomeAssistant) -> None:  # pylint: disable=unused-argument
        """Take the arguments of the real writer."""

    async def async_update(self, entry_id: str, changes: Mapping[str, Mapping[str, Any]]) -> SaveResult:
        """Record the changes and return the result of the test."""
        FakeConfigWriter.calls.append((entry_id, changes))
        return FakeConfigWriter.result

    async def async_create(self, thermostat_type: str, changes: Mapping[str, Mapping[str, Any]]) -> SaveResult:
        """Not used by save_config."""
        raise NotImplementedError


@pytest.fixture(name="writer")
def writer_fixture(monkeypatch: pytest.MonkeyPatch) -> type[FakeConfigWriter]:
    """The fake writer in place of the writer that drives the flow of Versatile Thermostat."""
    FakeConfigWriter.result = SaveResult(True, None, [])
    FakeConfigWriter.calls = []
    monkeypatch.setattr(websocket_api, "FlowConfigWriter", FakeConfigWriter)
    return FakeConfigWriter


@pytest.fixture(name="thermostat")
def thermostat_fixture(hass: HomeAssistant) -> tuple[MockConfigEntry, list[ServiceCall]]:
    """A thermostat with its preset entities, between 7 and 30 °C, and the calls of the fake service number.set_value."""
    entry = MockConfigEntry(domain=VTHERM_DOMAIN, title="Salon", data={"thermostat_type": "thermostat_over_switch", "name": "Salon"})
    entry.add_to_hass(hass)
    registry = er.async_get(hass)
    for preset, value in PRESETS.items():
        registered = registry.async_get_or_create("number", VTHERM_DOMAIN, f"salon{PRESET_MARKER}{preset}", config_entry=entry, suggested_object_id=f"salon_{preset}")
        hass.states.async_set(registered.entity_id, str(value), {"min": 7, "max": 30, "step": 0.5, "unit_of_measurement": "°C"})
    calls: list[ServiceCall] = []

    async def set_value(call: ServiceCall) -> None:
        """Refuse a value out of the bounds, as the number entities of Home Assistant do, otherwise apply it."""
        calls.append(call)
        state = hass.states.get(call.data["entity_id"])
        assert state is not None
        if not float(state.attributes["min"]) <= float(call.data["value"]) <= float(state.attributes["max"]):
            raise ServiceValidationError(translation_domain="number", translation_key="out_of_range")
        hass.states.async_set(call.data["entity_id"], str(call.data["value"]), state.attributes)

    hass.services.async_register("number", "set_value", set_value)
    return entry, calls


@pytest.fixture(name="client")
async def client_fixture(hass: HomeAssistant, writer, setup_dashboard, hass_ws_client):  # pylint: disable=unused-argument
    """An administrator connected to a dashboard that is set up, with the fake writer."""
    await setup_dashboard()
    return await hass_ws_client(hass)


def preset_values(hass: HomeAssistant, entry: MockConfigEntry) -> dict[str, float | None]:
    """The preset temperatures as the dashboard reads them."""
    return {preset.preset: preset.value for preset in read_presets(hass, entry.entry_id)}


async def save(client, entry: MockConfigEntry, changes: dict, presets: dict) -> dict:
    """Send save_config and return its result."""
    await client.send_json_auto_id({"type": "vtherm_dashboard/save_config", "entry_id": entry.entry_id, "changes": changes, "presets": presets})
    return (await client.receive_json())["result"]


async def test_save_the_configuration_then_the_presets_in_one_command(hass: HomeAssistant, writer, thermostat, client) -> None:
    """The tabs go to the writer, then the presets are applied."""
    entry, calls = thermostat
    result = await save(client, entry, {"main": {"cycle_min": 9}}, {"eco_temp": 18})
    await hass.async_block_till_done()
    assert (result["ok"], result["config_saved"], result["errors"], result["preset_errors"]) == (True, True, [], [])
    assert writer.calls == [(entry.entry_id, {"main": {"cycle_min": 9}})]
    assert [call.data["value"] for call in calls] == [18]
    assert preset_values(hass, entry)["eco_temp"] == 18


async def test_a_preset_that_fails_keeps_the_saved_configuration(hass: HomeAssistant, writer, thermostat, client) -> None:
    """The configuration stays saved, and the error is on the preset; the other presets are applied."""
    entry, _calls = thermostat
    result = await save(client, entry, {"main": {"cycle_min": 11}}, {"eco_temp": 99, "comfort_temp": 20})
    await hass.async_block_till_done()
    assert (result["ok"], result["config_saved"]) == (False, True)
    assert result["preset_errors"] == [{"tab": "presets", "field": "eco_temp", "code": "out_of_range"}]
    assert len(writer.calls) == 1
    assert preset_values(hass, entry) == {"comfort_temp": 20, "eco_temp": 17.0}


async def test_the_presets_are_not_applied_when_the_configuration_is_refused(hass: HomeAssistant, writer, thermostat, client) -> None:
    """When the writer refuses the tabs, no preset is touched."""
    entry, calls = thermostat
    writer.result = SaveResult(False, None, [FieldError("main", "temperature_sensor_entity_id", "unknown_entity")])
    result = await save(client, entry, {"main": {"temperature_sensor_entity_id": "sensor.nothing"}}, {"eco_temp": 18})
    assert (result["ok"], result["config_saved"], result["preset_errors"]) == (False, False, [])
    assert result["errors"] == [{"tab": "main", "field": "temperature_sensor_entity_id", "code": "unknown_entity"}]
    assert calls == []
    assert preset_values(hass, entry)["eco_temp"] == 17.0


async def test_save_without_presets_does_not_touch_them(hass: HomeAssistant, writer, thermostat, client) -> None:  # pylint: disable=unused-argument
    """A save of the tabs alone does not call the service of the presets."""
    entry, calls = thermostat
    result = await save(client, entry, {"main": {"cycle_min": 7}}, {})
    assert (result["ok"], result["config_saved"], result["preset_errors"]) == (True, True, [])
    assert calls == []
