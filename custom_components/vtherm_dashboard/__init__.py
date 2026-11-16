"""The Versatile Thermostat dashboard integration."""

from __future__ import annotations

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.loader import async_get_integration
from vtherm_api import get_vtherm_logger

from .api_keepalive import register_api_keepalive, unregister_api_keepalive
from .complements import ComplementCatalog
from .const import DATA_DEV_SERVER, DOMAIN
from .dev_server import read_dev_server_url
from .native_plugins import register_native_plugins, unregister_native_plugins
from .panel import async_register_panel, remove_panel
from .websocket_api import async_register_commands

_LOGGER = get_vtherm_logger(__name__)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:  # pylint: disable=unused-argument
    """Set up the dashboard from its configuration entry."""
    hass.data.setdefault(DOMAIN, {})["catalog"] = ComplementCatalog(hass)
    async_register_commands(hass)
    dev_server = read_dev_server_url()
    hass.data[DOMAIN][DATA_DEV_SERVER] = dev_server
    if dev_server is not None:
        _LOGGER.warning("The frontend of the dashboard is loaded from the development server %s, not from the built files", dev_server)
    await async_register_panel(hass, dev_server)
    integration = await async_get_integration(hass, DOMAIN)
    register_native_plugins(hass, str(integration.version), dev_server)
    register_api_keepalive(hass)
    _LOGGER.info("The %s integration is set up", DOMAIN)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:  # pylint: disable=unused-argument
    """Unload the dashboard."""
    hass.data.get(DOMAIN, {}).pop("catalog", None)
    hass.data.get(DOMAIN, {}).pop(DATA_DEV_SERVER, None)
    remove_panel(hass)
    unregister_native_plugins(hass)
    unregister_api_keepalive(hass)
    return True
