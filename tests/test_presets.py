"""Tests for the preset temperatures, which Versatile Thermostat exposes as number entities outside the config flow."""

from __future__ import annotations

import pytest
from homeassistant.core import HomeAssistant

from custom_components.vtherm_dashboard.config_flow_driver import ConfigWriter
from custom_components.vtherm_dashboard.presets import async_set_presets, read_presets

from .conftest import requires_vtherm
from .test_config_flow_driver import create_central, create_thermostat, writer_fixture  # noqa: F401  pylint: disable=unused-import

pytestmark = requires_vtherm


async def own_presets(hass: HomeAssistant, writer: ConfigWriter, presence: bool = False, ac_mode: bool = False):
    """A thermostat that does not use the central presets."""
    await create_central(hass, writer)
    entry = await create_thermostat(hass, writer, "thermostat_over_switch", "Salon", ["switch.heater"], ac_mode=ac_mode)
    changes: dict = {"presets": {"use_presets_central_config": False}}
    if not presence:
        changes["features"] = {"use_presence_feature": False}
    result = await writer.async_update(entry.entry_id, changes)
    assert result.ok, result.errors
    await hass.async_block_till_done()
    return entry


def names(presets) -> list[str]:
    """The names of the presets."""
    return [preset.preset for preset in presets]


async def test_a_thermostat_that_uses_the_central_presets_has_no_preset_of_its_own(hass: HomeAssistant, writer: ConfigWriter) -> None:
    """The temperatures are those of the central configuration."""
    await create_central(hass, writer)
    entry = await create_thermostat(hass, writer, "thermostat_over_switch", "Salon", ["switch.heater"])
    assert not read_presets(hass, entry.entry_id)


async def test_own_presets_without_air_conditioning_and_without_presence(hass: HomeAssistant, writer: ConfigWriter) -> None:
    """The four presets of heating, with their limits and their unit."""
    entry = await own_presets(hass, writer)
    presets = read_presets(hass, entry.entry_id)
    assert names(presets) == ["boost_temp", "comfort_temp", "eco_temp", "frost_temp"]
    assert (presets[0].min, presets[0].max, presets[0].unit) == (7.0, 35.0, "°C")


async def test_own_presets_with_presence_add_the_away_temperatures(hass: HomeAssistant, writer: ConfigWriter) -> None:
    """With the presence feature, each preset has a temperature for when nobody is there."""
    entry = await own_presets(hass, writer, presence=True)
    assert names(read_presets(hass, entry.entry_id)) == sorted(
        ["frost_temp", "eco_temp", "comfort_temp", "boost_temp", "frost_away_temp", "eco_away_temp", "comfort_away_temp", "boost_away_temp"]
    )


async def test_own_presets_with_air_conditioning_add_the_cooling_temperatures(hass: HomeAssistant, writer: ConfigWriter) -> None:
    """With the air conditioning mode, each preset has a temperature for cooling."""
    entry = await own_presets(hass, writer, ac_mode=True)
    assert {"eco_ac_temp", "comfort_ac_temp", "boost_ac_temp"} <= set(names(read_presets(hass, entry.entry_id)))


async def test_the_central_configuration_has_all_the_presets(hass: HomeAssistant, writer: ConfigWriter) -> None:
    """The central presets cover heating, cooling and away."""
    central = await create_central(hass, writer)
    presets = names(read_presets(hass, central.entry_id))
    assert {"eco_temp", "eco_ac_temp", "eco_away_temp", "eco_ac_away_temp"} <= set(presets)


async def test_change_a_preset_of_a_thermostat_and_of_the_central_configuration(hass: HomeAssistant, writer: ConfigWriter) -> None:
    """The value is applied to the number entity of the preset."""
    entry = await own_presets(hass, writer)
    assert await async_set_presets(hass, entry.entry_id, {"eco_temp": 17.5}) == []
    assert {preset.preset: preset.value for preset in read_presets(hass, entry.entry_id)}["eco_temp"] == 17.5

    central = next(e for e in hass.config_entries.async_entries("versatile_thermostat") if e.data["thermostat_type"] == "thermostat_central_config")
    assert await async_set_presets(hass, central.entry_id, {"comfort_temp": 20}) == []
    assert {preset.preset: preset.value for preset in read_presets(hass, central.entry_id)}["comfort_temp"] == 20


async def test_a_temperature_out_of_range_and_an_unknown_preset_fail_and_the_others_are_applied(hass: HomeAssistant, writer: ConfigWriter) -> None:
    """Each failure is on its preset, and the valid presets are applied."""
    entry = await own_presets(hass, writer)
    errors = await async_set_presets(hass, entry.entry_id, {"eco_temp": 99, "nothing_temp": 18, "comfort_temp": 19})
    assert [(error.tab, error.field, error.code) for error in errors] == [("presets", "eco_temp", "out_of_range"), ("presets", "nothing_temp", "unknown_preset")]
    values = {preset.preset: preset.value for preset in read_presets(hass, entry.entry_id)}
    assert (values["comfort_temp"], values["eco_temp"]) == (19, 7.0)


@pytest.fixture(name="client")
async def client_fixture(hass: HomeAssistant, writer, setup_dashboard, hass_ws_client):  # pylint: disable=unused-argument
    """An administrator, with the real Versatile Thermostat and the dashboard set up."""
    await setup_dashboard()
    return await hass_ws_client(hass)


async def test_save_the_configuration_then_the_presets_in_one_command(hass: HomeAssistant, writer: ConfigWriter, client) -> None:
    """The tabs are saved through the flow, then the presets are applied."""
    entry = await own_presets(hass, writer)
    await client.send_json_auto_id({"type": "vtherm_dashboard/save_config", "entry_id": entry.entry_id, "changes": {"main": {"cycle_min": 9}}, "presets": {"eco_temp": 18}})
    result = (await client.receive_json())["result"]
    await hass.async_block_till_done()
    assert (result["ok"], result["config_saved"], result["errors"], result["preset_errors"]) == (True, True, [], [])
    assert entry.data["cycle_min"] == 9
    assert {preset.preset: preset.value for preset in read_presets(hass, entry.entry_id)}["eco_temp"] == 18


async def test_a_preset_that_fails_keeps_the_saved_configuration(hass: HomeAssistant, writer: ConfigWriter, client) -> None:
    """The configuration of the flow stays saved, and the error is on the preset."""
    entry = await own_presets(hass, writer)
    await client.send_json_auto_id({"type": "vtherm_dashboard/save_config", "entry_id": entry.entry_id, "changes": {"main": {"cycle_min": 11}}, "presets": {"eco_temp": 99}})
    result = (await client.receive_json())["result"]
    await hass.async_block_till_done()
    assert (result["ok"], result["config_saved"]) == (False, True)
    assert result["preset_errors"] == [{"tab": "presets", "field": "eco_temp", "code": "out_of_range"}]
    assert entry.data["cycle_min"] == 11


async def test_the_presets_are_not_applied_when_the_configuration_is_refused(hass: HomeAssistant, writer: ConfigWriter, client) -> None:
    """When the flow refuses the tabs, nothing is written: not the tabs, not the presets."""
    entry = await own_presets(hass, writer)
    await client.send_json_auto_id(
        {"type": "vtherm_dashboard/save_config", "entry_id": entry.entry_id, "changes": {"main": {"temperature_sensor_entity_id": "sensor.nothing"}}, "presets": {"eco_temp": 18}}
    )
    result = (await client.receive_json())["result"]
    assert (result["ok"], result["config_saved"], result["preset_errors"]) == (False, False, [])
    assert result["errors"] == [{"tab": "main", "field": "temperature_sensor_entity_id", "code": "unknown_entity"}]
    assert {preset.preset: preset.value for preset in read_presets(hass, entry.entry_id)}["eco_temp"] == 7.0


async def test_create_and_read_through_the_commands(hass: HomeAssistant, writer: ConfigWriter, client) -> None:  # pylint: disable=unused-argument
    """The commands create the central configuration and a thermostat, and read the presets."""
    await client.send_json_auto_id(
        {
            "type": "vtherm_dashboard/create_config",
            "thermostat_type": "thermostat_central_config",
            "changes": {"main": {"external_temperature_sensor_entity_id": "sensor.outdoor"}, "tpi": {}, "advanced": {}},
        }
    )
    central = (await client.receive_json())["result"]
    assert central["ok"] is True
    await hass.async_block_till_done()
    await client.send_json_auto_id({"type": "vtherm_dashboard/get_presets", "entry_id": central["entry_id"]})
    assert len((await client.receive_json())["result"]["presets"]) > 4
    await client.send_json_auto_id(
        {
            "type": "vtherm_dashboard/create_config",
            "thermostat_type": "thermostat_over_switch",
            "changes": {"main": {"name": "Bureau", "temperature_sensor_entity_id": "sensor.indoor"}},
        }
    )
    incomplete = (await client.receive_json())["result"]
    assert incomplete == {"ok": False, "entry_id": None, "errors": [{"tab": None, "field": "base", "code": "configuration_not_complete"}]}


@pytest.mark.parametrize(
    "command",
    [
        {"type": "vtherm_dashboard/get_presets", "entry_id": "x"},
        {"type": "vtherm_dashboard/save_config", "entry_id": "x"},
        {"type": "vtherm_dashboard/create_config", "thermostat_type": "thermostat_over_switch"},
    ],
)
async def test_the_write_commands_are_reserved_for_administrators(hass: HomeAssistant, setup_dashboard, hass_ws_client, hass_read_only_access_token, command) -> None:
    """A user who is not an administrator is refused."""
    await setup_dashboard()
    user = await hass_ws_client(hass, hass_read_only_access_token)
    await user.send_json_auto_id(command)
    assert (await user.receive_json())["error"]["code"] == "unauthorized"


async def test_unknown_entry_for_the_presets(client) -> None:
    """An identifier that does not exist is an error."""
    await client.send_json_auto_id({"type": "vtherm_dashboard/get_presets", "entry_id": "nope"})
    assert (await client.receive_json())["error"]["code"] == "not_found"


async def test_suggest_the_humidity_sensor_of_the_device_of_the_temperature_sensor(hass: HomeAssistant, writer: ConfigWriter, client) -> None:  # pylint: disable=unused-argument
    """The suggestion is the one of Versatile Thermostat: nothing for a sensor without a humidity sensor next to it."""
    await client.send_json_auto_id({"type": "vtherm_dashboard/get_humidity_suggestion", "temperature_sensor": "sensor.indoor"})
    assert (await client.receive_json())["result"] == {"entity_id": None}
