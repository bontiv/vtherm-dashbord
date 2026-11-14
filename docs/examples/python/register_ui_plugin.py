"""Register a UI plugin in the Versatile Thermostat dashboard."""

from homeassistant.core import HomeAssistant
from vtherm_api import VThermAPI

PLUGIN_ID = "my_plugin"
JS_URL = "/my_plugin_static/my-plugin.js"


def register_my_ui_plugin(hass: HomeAssistant) -> None:
    """Declare the UI plugin when the integration is set up."""
    api = VThermAPI.get_vtherm_api(hass)
    api.register_ui_plugin(
        PLUGIN_ID,
        JS_URL,
        ">=1.0,<2.0",
        requires=["core"],
        load_after=["core_tpi"],
    )


def unregister_my_ui_plugin(hass: HomeAssistant) -> None:
    """Withdraw the UI plugin when the integration is unloaded."""
    VThermAPI.get_vtherm_api(hass).unregister_ui_plugin(PLUGIN_ID)
