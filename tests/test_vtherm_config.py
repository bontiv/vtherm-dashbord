"""Tests for the reading of the configuration of Versatile Thermostat."""

from __future__ import annotations

import json

import pytest
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.vtherm_dashboard import vtherm_config
from custom_components.vtherm_dashboard.vtherm_config import (
    CENTRAL_TYPE,
    READ_ONLY_NEWER_VERSION,
    SUPPORTED_CONFIG_VERSION,
    VTHERM_DOMAIN,
    ConfigNotFoundError,
    central_entry,
    list_thermostats,
    read_central_config,
    read_config,
)

from .conftest import requires_vtherm


def add_entry(hass: HomeAssistant, thermostat_type: str, name: str, version: int = 2, minor_version: int = 4, **data) -> MockConfigEntry:
    """Add a configuration entry of Versatile Thermostat."""
    entry = MockConfigEntry(domain=VTHERM_DOMAIN, title=name, data={"thermostat_type": thermostat_type, "name": name, **data}, version=version, minor_version=minor_version)
    entry.add_to_hass(hass)
    return entry


def test_no_entry(hass: HomeAssistant) -> None:
    """Without Versatile Thermostat entry, there is no thermostat and no central configuration."""
    assert list_thermostats(hass) == []
    assert central_entry(hass) is None
    assert read_central_config(hass) is None


def test_thermostats_are_listed_by_name_with_their_type_and_without_the_central_configuration(hass: HomeAssistant) -> None:
    """The list has the thermostats only, in alphabetical order, with the type that the dashboard names."""
    add_entry(hass, "thermostat_over_valve", "Bureau")
    add_entry(hass, "thermostat_over_switch", "chambre")
    add_entry(hass, "thermostat_over_climate", "Salon")
    add_entry(hass, CENTRAL_TYPE, "Central configuration")
    add_entry(hass, "thermostat_over_switch", "Cuisine")
    assert [(summary.name, summary.type) for summary in list_thermostats(hass)] == [
        ("Bureau", "over_valve"),
        ("chambre", "over_switch"),
        ("Cuisine", "over_switch"),
        ("Salon", "over_climate"),
    ]


def test_entries_of_other_integrations_are_ignored(hass: HomeAssistant) -> None:
    """Only the entries of Versatile Thermostat are read."""
    MockConfigEntry(domain="other", data={"thermostat_type": "thermostat_over_switch", "name": "Other"}).add_to_hass(hass)
    assert list_thermostats(hass) == []


def test_central_configuration(hass: HomeAssistant) -> None:
    """The central configuration is found, and read like a thermostat."""
    entry = add_entry(hass, CENTRAL_TYPE, "Central configuration", temp_min=7.0)
    assert central_entry(hass) is entry
    central = read_central_config(hass)
    assert central is not None
    assert (central.id, central.type, central.values["temp_min"], central.read_only_reason) == (entry.entry_id, "central", 7.0, None)


def test_read_the_configuration_of_an_entry(hass: HomeAssistant) -> None:
    """The view of an entry has its values, and changing them does not change the entry."""
    entry = add_entry(hass, "thermostat_over_switch", "Salon", cycle_min=5)
    view = read_config(hass, entry.entry_id)
    assert (view.id, view.name, view.type, view.values["cycle_min"], view.version, view.minor_version) == (entry.entry_id, "Salon", "over_switch", 5, 2, 4)
    view.values["cycle_min"] = 99
    assert entry.data["cycle_min"] == 5


def test_unknown_entry(hass: HomeAssistant) -> None:
    """An identifier that is not an entry of Versatile Thermostat is refused."""
    MockConfigEntry(domain="other").add_to_hass(hass)
    with pytest.raises(ConfigNotFoundError):
        read_config(hass, "no-such-entry")


@pytest.mark.parametrize(
    ("version", "minor_version", "read_only"),
    [(2, 4, False), (2, 3, False), (2, 0, False), (1, 9, False), (2, 5, True), (3, 0, True), (3, 9, True)],
)
def test_a_configuration_newer_than_the_supported_one_is_read_only(hass: HomeAssistant, version, minor_version, read_only) -> None:
    """An entry with a newer version of configuration can be shown but not edited."""
    entry = add_entry(hass, "thermostat_over_switch", "Salon", version=version, minor_version=minor_version)
    view = read_config(hass, entry.entry_id)
    assert view.read_only_reason == (READ_ONLY_NEWER_VERSION if read_only else None)
    assert view.as_dict()["read_only"] is read_only
    assert list_thermostats(hass)[0].read_only is read_only


def test_views_are_json_serializable(hass: HomeAssistant) -> None:
    """The views are sent through the WebSocket."""
    entry = add_entry(hass, "thermostat_over_switch", "Salon", underlying_entity_ids=["switch.a"], cycle_min=5)
    assert json.loads(json.dumps(read_config(hass, entry.entry_id).as_dict()))["values"]["underlying_entity_ids"] == ["switch.a"]
    assert json.dumps(list_thermostats(hass)[0].as_dict())


def test_the_supported_version_is_declared() -> None:
    """The dashboard declares the version of configuration that it supports."""
    assert SUPPORTED_CONFIG_VERSION == (2, 4)
    assert vtherm_config.READ_ONLY_NEWER_VERSION == "config_version_newer"


@requires_vtherm
def test_the_constants_are_those_of_the_versatile_thermostat_of_the_environment(real_vtherm) -> None:  # pylint: disable=unused-argument
    """When Versatile Thermostat changes its version of configuration or its types, this test fails so that the dashboard is reviewed."""
    # The real Versatile Thermostat is only importable once the fixture made it visible.
    from custom_components.versatile_thermostat import const  # pylint: disable=import-outside-toplevel,import-error,no-name-in-module

    assert (const.CONFIG_VERSION, const.CONFIG_MINOR_VERSION) == SUPPORTED_CONFIG_VERSION
    assert const.DOMAIN == VTHERM_DOMAIN
    assert const.CONF_THERMOSTAT_CENTRAL_CONFIG == CENTRAL_TYPE
    assert set(vtherm_config.THERMOSTAT_TYPES) == {const.CONF_THERMOSTAT_SWITCH, const.CONF_THERMOSTAT_CLIMATE, const.CONF_THERMOSTAT_VALVE}
    assert const.CONF_THERMOSTAT_TYPE == vtherm_config.CONF_THERMOSTAT_TYPE
    assert const.CONF_NAME == vtherm_config.CONF_NAME
