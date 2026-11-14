"""Pytest configuration: custom integrations of the repository are enabled in every test."""

import pytest
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry, MockModule, mock_integration

from custom_components.vtherm_dashboard import panel
from custom_components.vtherm_dashboard.const import DOMAIN


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations):  # pylint: disable=unused-argument
    """Let Home Assistant load the integration from custom_components/."""
    yield


@pytest.fixture(name="frontend_module")
def frontend_module_fixture(tmp_path, monkeypatch):
    """Provide a built frontend module in a temporary www folder."""
    (tmp_path / panel.FRONTEND_MODULE).write_text("customElements.define('vtherm-dashboard-panel', class extends HTMLElement {});\n", encoding="utf-8")
    monkeypatch.setattr(panel, "WWW_DIR", tmp_path)
    return tmp_path


@pytest.fixture(name="setup_dashboard")
def setup_dashboard_fixture(hass: HomeAssistant, frontend_module):  # pylint: disable=unused-argument
    """Return a coroutine function that sets up the dashboard with a fake Versatile Thermostat dependency."""

    async def _setup() -> MockConfigEntry:
        mock_integration(hass, MockModule("versatile_thermostat"))
        entry = MockConfigEntry(domain=DOMAIN, data={})
        entry.add_to_hass(hass)
        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()
        return entry

    return _setup
