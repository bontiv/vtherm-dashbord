"""Declare the load order of UI plugins."""

from homeassistant.core import HomeAssistant
from vtherm_api import VThermAPI


def register_plugins(hass: HomeAssistant) -> None:
    """Register four plugins that depend on each other."""
    api = VThermAPI.get_vtherm_api(hass)
    # "base" has no dependency.
    api.register_ui_plugin("base", "/base/ui.js", ">=0.1,<1.0")
    # "extra" cannot work without "base": it is not loaded when "base" is absent or fails.
    api.register_ui_plugin("extra", "/extra/ui.js", ">=0.1,<1.0", requires=["base"])
    # "themes" prefers to load after "extra", and works without it.
    api.register_ui_plugin("themes", "/themes/ui.js", ">=0.1,<1.0", load_after=["extra"])
    # "early" asks to load before "base" when "base" is present.
    api.register_ui_plugin("early", "/early/ui.js", ">=0.1,<1.0", load_before=["base"])
