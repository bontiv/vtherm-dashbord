"""The Versatile Thermostat dashboard integration."""

from __future__ import annotations

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from vtherm_api import get_vtherm_logger

from .const import DOMAIN
from .panel import async_register_panel, remove_panel
from .websocket_api import async_register_commands

_LOGGER = get_vtherm_logger(__name__)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:  # pylint: disable=unused-argument
    """Set up the dashboard from its configuration entry."""
    async_register_commands(hass)
    await async_register_panel(hass)
    _LOGGER.info("The %s integration is set up", DOMAIN)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:  # pylint: disable=unused-argument
    """Unload the dashboard."""
    remove_panel(hass)
    return True
