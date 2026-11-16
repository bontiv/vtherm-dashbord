"""Pytest configuration: custom integrations of the repository are enabled in every test."""

from pathlib import Path
from types import SimpleNamespace

import pytest
from homeassistant import loader
from homeassistant.core import HomeAssistant
from vtherm_api import VThermAPI
from vtherm_api.const import DOMAIN as VTHERM_API_DOMAIN
from pytest_homeassistant_custom_component.common import MockConfigEntry, MockModule, mock_integration

import custom_components
from custom_components.vtherm_dashboard import panel
from custom_components.vtherm_dashboard.const import DOMAIN

EXTERNAL_VTHERM = Path(__file__).resolve().parent.parent / "external" / "versatile_thermostat" / "custom_components"
"""The Versatile Thermostat of the development environment. Tests that run its real code need it, see requires_vtherm."""

requires_vtherm = pytest.mark.skipif(not EXTERNAL_VTHERM.is_dir(), reason="external/versatile_thermostat is not available")


@pytest.fixture(name="real_vtherm")
def real_vtherm_fixture(hass: HomeAssistant):
    """Let Home Assistant load the real Versatile Thermostat of external/, for the tests that run its code.

    The other tests must not see it: they check what happens when Versatile Thermostat is absent, or replace it by a fake.
    """
    path = str(EXTERNAL_VTHERM)
    custom_components.__path__.append(path)
    hass.data.pop(loader.DATA_CUSTOM_COMPONENTS, None)
    yield
    # The path of a namespace package has no remove(): its list is private.
    custom_components.__path__._path = [entry for entry in custom_components.__path__._path if entry != path]  # pylint: disable=protected-access,no-member
    hass.data.pop(loader.DATA_CUSTOM_COMPONENTS, None)


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
        if "versatile_thermostat" not in hass.config.components:
            # A fake dependency, unless the test set up the real Versatile Thermostat.
            mock_integration(hass, MockModule("versatile_thermostat"))
        entry = MockConfigEntry(domain=DOMAIN, data={})
        entry.add_to_hass(hass)
        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()
        return entry

    return _setup


def pytest_addoption(parser) -> None:
    """Options of the tests of the dashboard."""
    parser.addoption("--update-schemas", action="store_true", default=False, help="Write the description of the forms of Versatile Thermostat in shared/.")
    parser.addoption("--update-hacs-answers", action="store_true", default=False, help="Write the answers of the real HACS in shared/hacs-answers.json.")


@pytest.fixture(name="api")
def api_fixture():
    """Return a VThermAPI on a minimal Home Assistant-like object, and that object."""
    VThermAPI.reset_vtherm_api()
    hass = SimpleNamespace(data={VTHERM_API_DOMAIN: {}}, config=SimpleNamespace(time_zone="UTC"))
    yield VThermAPI.get_vtherm_api(hass), hass
    VThermAPI.reset_vtherm_api()
