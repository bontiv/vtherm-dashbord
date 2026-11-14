"""The Versatile Thermostat dashboard integration."""

from __future__ import annotations

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.loader import async_get_integration
from vtherm_api import get_vtherm_logger

from .complements import ComplementCatalog
from .const import DOMAIN
from .native_plugins import register_native_plugins, unregister_native_plugins
from .panel import async_register_panel, remove_panel
from .websocket_api import async_register_commands

_LOGGER = get_vtherm_logger(__name__)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:  # pylint: disable=unused-argument
    """Set up the dashboard from its configuration entry."""
    hass.data.setdefault(DOMAIN, {})["catalog"] = ComplementCatalog(hass)
    async_register_commands(hass)
    await async_register_panel(hass)
    integration = await async_get_integration(hass, DOMAIN)
    register_native_plugins(hass, str(integration.version))
    _LOGGER.info("The %s integration is set up", DOMAIN)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:  # pylint: disable=unused-argument
    """Unload the dashboard."""
    hass.data.get(DOMAIN, {}).pop("catalog", None)
    remove_panel(hass)
    unregister_native_plugins(hass)
    return True
