"""Register the native UI plugins of the dashboard.

The dashboard provides its own screens as UI plugins, registered in `vtherm_api` like the plugins of other integrations. Each one
has its module in `www/plugins/`. They are loaded after `core`, one after the other in the order of the menu of the config flow of
Versatile Thermostat, so that each tab can be placed after the tab that comes before it.
"""

from __future__ import annotations

from homeassistant.core import HomeAssistant
from vtherm_api import VThermAPI, get_vtherm_logger

from .const import CORE_PLUGIN_ID, STATIC_URL

_LOGGER = get_vtherm_logger(__name__)

NATIVE_PLUGIN_ORDER: tuple[str, ...] = (
    "core",
    "core_tpi",
    "core_presets",
    "core_central_boiler",
    "core_window",
    "core_motion",
    "core_power",
    "core_presence",
    "core_auto_start_stop",
    "core_valve_regulation",
    "core_sync_temp",
    "core_advanced",
    "core_lock",
    "core_humidity",
    "core_heating_failure",
)
"""The native plugins of the configuration, in their load order. `core_complements` comes with the catalog of add-ons."""


def native_js_url(plugin_id: str, version: str) -> str:
    """Return the URL of the module of a native plugin. The version makes the browser load a new module after an update."""
    return f"{STATIC_URL}/plugins/{plugin_id}.js?v={version}"


def register_native_plugins(hass: HomeAssistant, version: str) -> list[str]:
    """Register the native plugins in `vtherm_api`.

    A native plugin that is already registered is registered again, so that a reload of the integration gives the new version.
    An identifier that another integration took first cannot be registered: the error is logged and the other plugins are registered.

    Returns:
        The identifiers that were registered.
    """
    api = VThermAPI.get_vtherm_api(hass)
    registered = []
    for index, plugin_id in enumerate(NATIVE_PLUGIN_ORDER):
        api.unregister_ui_plugin(plugin_id)
        requires = [] if plugin_id == CORE_PLUGIN_ID else [CORE_PLUGIN_ID]
        load_after = [] if index == 0 else [NATIVE_PLUGIN_ORDER[index - 1]]
        try:
            api.register_ui_plugin(plugin_id, native_js_url(plugin_id, version), f"=={version}", requires=requires, load_after=load_after)
        except ValueError as err:
            _LOGGER.error("The native UI plugin %s could not be registered: %s", plugin_id, err)
            continue
        registered.append(plugin_id)
    return registered


def unregister_native_plugins(hass: HomeAssistant) -> None:
    """Withdraw the native plugins from `vtherm_api`."""
    api = VThermAPI.get_vtherm_api(hass)
    for plugin_id in NATIVE_PLUGIN_ORDER:
        api.unregister_ui_plugin(plugin_id)
