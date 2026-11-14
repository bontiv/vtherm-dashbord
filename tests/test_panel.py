"""Tests for the Home confort panel."""

from __future__ import annotations

from homeassistant.components import frontend
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant

from custom_components.vtherm_dashboard.const import FRONTEND_MODULE, PANEL_URL_PATH, STATIC_URL


async def test_panel_is_registered_for_administrators(hass: HomeAssistant, setup_dashboard) -> None:
    """The panel is added to the menu, requires an administrator and loads the frontend module."""
    await setup_dashboard()

    panel = hass.data[frontend.DATA_PANELS][PANEL_URL_PATH]
    assert panel.require_admin is True
    assert panel.sidebar_title == "Home confort"
    assert panel.config["_panel_custom"]["name"] == "vtherm-dashboard-panel"
    assert panel.config["_panel_custom"]["module_url"].startswith(f"{STATIC_URL}/{FRONTEND_MODULE}?v=")


async def test_admin_sees_the_panel_and_a_regular_user_does_not(hass: HomeAssistant, setup_dashboard, hass_ws_client, hass_read_only_access_token) -> None:
    """The panel list sent to the browser contains the panel for an administrator only."""
    await setup_dashboard()

    admin_client = await hass_ws_client(hass)
    await admin_client.send_json({"id": 1, "type": "get_panels"})
    assert PANEL_URL_PATH in (await admin_client.receive_json())["result"]

    user_client = await hass_ws_client(hass, hass_read_only_access_token)
    await user_client.send_json({"id": 1, "type": "get_panels"})
    assert PANEL_URL_PATH not in (await user_client.receive_json())["result"]


async def test_frontend_module_is_served(setup_dashboard, hass_client) -> None:
    """The frontend module is served from the static path."""
    await setup_dashboard()

    client = await hass_client()
    response = await client.get(f"{STATIC_URL}/{FRONTEND_MODULE}")
    assert response.status == 200
    assert "vtherm-dashboard-panel" in await response.text()


async def test_unload_removes_the_panel_and_reload_works(hass: HomeAssistant, setup_dashboard) -> None:
    """Unloading removes the panel, and the entry can be loaded again."""
    entry = await setup_dashboard()

    assert await hass.config_entries.async_unload(entry.entry_id)
    assert PANEL_URL_PATH not in hass.data[frontend.DATA_PANELS]

    assert await hass.config_entries.async_setup(entry.entry_id)
    assert entry.state is ConfigEntryState.LOADED
    assert PANEL_URL_PATH in hass.data[frontend.DATA_PANELS]
