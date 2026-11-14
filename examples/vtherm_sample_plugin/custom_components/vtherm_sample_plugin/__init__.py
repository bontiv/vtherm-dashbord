"""A sample UI plugin for the Versatile Thermostat dashboard.

The integration serves the JavaScript modules that `ui/` builds into `www/`, and declares two UI plugins in `vtherm_api`. Everything the
dashboard needs to know about a plugin is declared here, in Python: the address of its module, the versions of the dashboard that it
supports, and the plugins that it depends on. Add `vtherm_sample_plugin:` to `configuration.yaml` to set it up.
"""

from __future__ import annotations

from pathlib import Path

from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType
from vtherm_api import VThermAPI

DOMAIN = "vtherm_sample_plugin"
"""The domain of the integration."""
STATIC_URL = f"/{DOMAIN}_static"
"""The URL under which the built modules are served."""
WWW_DIR = Path(__file__).parent / "www"
"""The folder where `npm run build` in `ui/` writes the modules."""
DASHBOARD_VERSION = ">=0.1,<1.0"
"""The versions of the dashboard that the plugins support. Change it when you have checked your plugin with a new major version."""

# The widgets that the first plugin offers come first, so that the second plugin can remove one of them.
EXTRAS_PLUGIN = "vtherm_sample_extras"
SAMPLE_PLUGIN = "vtherm_sample"


def _url(module: str, version: str) -> str:
    """Return the URL of a module. The version makes the browser load the new file after an update."""
    return f"{STATIC_URL}/{module}.js?v={version}"


def register_sample_plugins(hass: HomeAssistant, version: str = "0.1.0") -> None:
    """Declare the two UI plugins. Each one is registered again when it already is, so that a reload gives the new version."""
    api = VThermAPI.get_vtherm_api(hass)
    for plugin_id in (EXTRAS_PLUGIN, SAMPLE_PLUGIN):
        api.unregister_ui_plugin(plugin_id)
    api.register_ui_plugin(EXTRAS_PLUGIN, _url("vtherm-sample-extras", version), DASHBOARD_VERSION, requires=["core"])
    api.register_ui_plugin(
        SAMPLE_PLUGIN,
        _url("vtherm-sample", version),
        DASHBOARD_VERSION,
        requires=["core", "core_tpi"],
        # The widget that this plugin removes must be there first.
        load_after=["core_tpi", "core_sync_temp", EXTRAS_PLUGIN],
    )


def unregister_sample_plugins(hass: HomeAssistant) -> None:
    """Withdraw the UI plugins."""
    api = VThermAPI.get_vtherm_api(hass)
    for plugin_id in (SAMPLE_PLUGIN, EXTRAS_PLUGIN):
        api.unregister_ui_plugin(plugin_id)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:  # pylint: disable=unused-argument
    """Serve the modules and declare the plugins."""
    await hass.http.async_register_static_paths([StaticPathConfig(STATIC_URL, str(WWW_DIR), cache_headers=False)])
    register_sample_plugins(hass)
    return True
