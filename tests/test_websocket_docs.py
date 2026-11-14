"""Check that the WebSocket reference documents every field of the response."""

from __future__ import annotations

from pathlib import Path

from custom_components.vtherm_dashboard import plugin_list
from custom_components.vtherm_dashboard.plugin_list import PluginEntry

PAGE = (Path(__file__).resolve().parent.parent / "docs" / "reference" / "websocket-api.md").read_text(encoding="utf-8")


def test_every_field_of_the_response_is_documented() -> None:
    """The top-level fields and the fields of each plugin appear in the page."""
    entry = PluginEntry("a", "/a.js", "", (), (), (), "installed", "ready", None, {}, 0).as_dict()
    for field in ("dashboard_version", "plugins", *entry):
        assert f"`{field}`" in PAGE, field


def test_every_state_and_reason_is_documented() -> None:
    """Each state and reason code of the list builder appears in the page."""
    codes = [getattr(plugin_list, name) for name in dir(plugin_list) if name.startswith(("STATE_", "REASON_", "SOURCE_"))]
    assert codes
    for code in codes:
        assert f"`{code}`" in PAGE, code
    assert "`too_old`" in PAGE and "`too_new`" in PAGE


def test_every_error_code_is_documented() -> None:
    """The error codes returned by the command appear in the page."""
    for code in ("unauthorized", "invalid_format"):
        assert f"`{code}`" in PAGE


def test_every_command_is_documented() -> None:
    """Each command of the dashboard has a section."""
    from custom_components.vtherm_dashboard import websocket_api  # pylint: disable=import-outside-toplevel

    commands = [getattr(websocket_api, name) for name in dir(websocket_api) if name.startswith("WS_")]
    assert len(commands) == 9
    for command in commands:
        assert f"## `{command}`" in PAGE, command


def test_every_error_code_of_the_configuration_is_documented() -> None:
    """The codes of the dashboard and the codes that the flow of Versatile Thermostat can return are in the page."""
    from custom_components.vtherm_dashboard import config_flow_driver, presets  # pylint: disable=import-outside-toplevel

    ours = [getattr(module, name) for module in (config_flow_driver, presets) for name in dir(module) if name.startswith("ERROR_")]
    theirs = [
        "unknown_entity",
        "window_open_detection_method",
        "no_central_config",
        "service_configuration_format",
        "configuration_not_complete",
        "valve_regulation_nb_entities_incorrect",
        "sync_device_internal_temp_nb_entities_incorrect",
        "min_opening_degrees_format",
        "max_opening_degrees_format",
        "min_max_opening_degrees_inconsistent",
        "valve_control_parameters_cardinality_incorrect",
        "vswitch_configuration_incorrect",
        "lock_code_incorrect",
        "unknown",
    ]
    for code in ours + theirs:
        assert f"`{code}`" in PAGE, code


def test_the_driver_page_has_the_evolution_planned() -> None:
    """The contributor page explains the mechanism and the target."""
    driver = (Path(__file__).resolve().parent.parent / "docs" / "contributing" / "config-flow-driver.md").read_text(encoding="utf-8")
    for heading in ("## Principle", "## Tabs and steps", "## Versions of Versatile Thermostat", "## Add a step", "## Evolution planned"):
        assert heading in driver
    for text in ("**Target.**", "**Path.**", "**What depends on the upstream repositories.**", "ConfigWriter", "vtherm_api"):
        assert text in driver
    from custom_components.vtherm_dashboard.config_flow_driver import TAB_ORDER  # pylint: disable=import-outside-toplevel

    for tab in TAB_ORDER:
        assert f"`{tab}`" in driver, tab
