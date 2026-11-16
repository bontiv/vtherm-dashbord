"""The panel of the dashboard, "Versatile Thermostat" in the side menu."""

from __future__ import annotations

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryError
from homeassistant.loader import async_get_integration
from vtherm_api import get_vtherm_logger

from .const import DEV_PANEL_MODULE, DOMAIN, FRONTEND_MODULE, PANEL_ELEMENT, PANEL_ICON, PANEL_TITLE, PANEL_URL_PATH, STATIC_URL, WWW_DIR

_LOGGER = get_vtherm_logger(__name__)

_STATIC_REGISTERED = f"{DOMAIN}_static_registered"


async def async_register_panel(hass: HomeAssistant, dev_server: str | None = None) -> None:
    """Serve the frontend files and add the panel to the side menu, for administrators only.

    Args:
        hass: Home Assistant.
        dev_server: The URL of the development server of the frontend. When it is given, the panel loads its module from that server,
            and the built files are neither required nor served.

    Raises:
        ConfigEntryError: The frontend has not been built, and no development server is given.
    """
    if dev_server is not None:
        module_url = f"{dev_server}/{DEV_PANEL_MODULE}"
    else:
        if not (WWW_DIR / FRONTEND_MODULE).is_file():
            raise ConfigEntryError(f"The frontend module {WWW_DIR / FRONTEND_MODULE} is missing. Build the frontend, or install a release archive")

        # A static path cannot be removed, so it is registered once per Home Assistant run.
        if not hass.data.get(_STATIC_REGISTERED):
            await hass.http.async_register_static_paths([StaticPathConfig(STATIC_URL, str(WWW_DIR), cache_headers=False)])
            hass.data[_STATIC_REGISTERED] = True

        integration = await async_get_integration(hass, DOMAIN)
        module_url = f"{STATIC_URL}/{FRONTEND_MODULE}?v={integration.version}"

    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL_URL_PATH,
        webcomponent_name=PANEL_ELEMENT,
        sidebar_title=PANEL_TITLE,
        sidebar_icon=PANEL_ICON,
        module_url=module_url,
        require_admin=True,
    )


def remove_panel(hass: HomeAssistant) -> None:
    """Remove the panel from the side menu."""
    frontend.async_remove_panel(hass, PANEL_URL_PATH)
