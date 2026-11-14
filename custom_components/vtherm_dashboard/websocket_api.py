"""WebSocket commands of the dashboard."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.loader import async_get_integration
from vtherm_api import VThermAPI

from .const import DOMAIN
from .plugin_list import build_plugin_list

WS_GET_UI_PLUGINS = f"{DOMAIN}/get_ui_plugins"
"""The type of the command that returns the UI plugins to load."""


@callback
def async_register_commands(hass: HomeAssistant) -> None:
    """Register the WebSocket commands of the dashboard."""
    websocket_api.async_register_command(hass, ws_get_ui_plugins)


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_GET_UI_PLUGINS,
        vol.Optional("dev_plugins"): [dict],
    }
)
@websocket_api.async_response
async def ws_get_ui_plugins(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """Return the UI plugins, validated and sorted in load order, with their state.

    Any authenticated user can read the list. Only an administrator can join development entries.
    """
    dev_plugins = msg.get("dev_plugins")
    if dev_plugins and not connection.user.is_admin:
        connection.send_error(msg["id"], websocket_api.ERR_UNAUTHORIZED, "Development plugins are reserved for administrators")
        return
    dashboard_version = (await async_get_integration(hass, DOMAIN)).version
    registered = VThermAPI.get_vtherm_api(hass).get_ui_plugins()
    plugins = build_plugin_list(registered, str(dashboard_version), dev_plugins)
    connection.send_result(msg["id"], {"dashboard_version": str(dashboard_version), "plugins": [plugin.as_dict() for plugin in plugins]})
