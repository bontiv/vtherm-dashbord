"""Constants of the Versatile Thermostat dashboard integration."""

from pathlib import Path

DOMAIN = "vtherm_dashboard"
"""The domain of the integration."""

TITLE = "Home confort"
"""The title of the configuration entry."""

PANEL_URL_PATH = "home-confort"
"""The path of the panel in the Home Assistant URL."""

PANEL_TITLE = "Home confort"
"""The title of the panel in the side menu."""

PANEL_ICON = "mdi:home-thermometer"
"""The icon of the panel in the side menu."""

PANEL_ELEMENT = "vtherm-dashboard-panel"
"""The custom element that the frontend module defines."""

STATIC_URL = "/vtherm_dashboard_static"
"""The URL under which the frontend files of the integration are served."""

FRONTEND_MODULE = "vtherm-dashboard.js"
"""The frontend module, built into the www folder of the integration."""

WWW_DIR = Path(__file__).parent / "www"
"""The folder of the built frontend files."""

CORE_PLUGIN_ID = "core"
"""The identifier of the base native plugin, always loaded first."""

NATIVE_PLUGIN_IDS = frozenset(
    {
        "core",
        "core_tpi",
        "core_presets",
        "core_window",
        "core_motion",
        "core_power",
        "core_presence",
        "core_central_boiler",
        "core_auto_start_stop",
        "core_valve_regulation",
        "core_sync_temp",
        "core_humidity",
        "core_advanced",
        "core_lock",
        "core_heating_failure",
        "core_complements",
    }
)
"""The identifiers of the native plugins of the dashboard. The identifiers `core` and `core_*` are reserved for them."""
