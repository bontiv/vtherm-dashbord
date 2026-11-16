"""Keep the instance of `vtherm_api` while the dashboard is loaded.

The UI plugins are registered in the instance of `vtherm_api` that Versatile Thermostat keeps in `hass.data`. When the last
configuration entry of Versatile Thermostat is removed, which also happens when the central configuration is the only entry and is
recreated after a change, Versatile Thermostat drops that instance unless plugins are registered in it. It counts the feature managers
and the proportional algorithms, not the UI plugins: the plugins of the dashboard and of the other integrations would be lost until
Home Assistant restarts.

Workaround: the dashboard registers a feature manager factory that applies to no thermostat. Versatile Thermostat counts it and keeps
the instance, and creates no manager since `supports()` is always false. Remove this module when the minimum version of Versatile
Thermostat counts the UI plugins in `VersatileThermostatAPI.remove_entry`.
"""

from __future__ import annotations

from typing import Any, NoReturn

from homeassistant.core import HomeAssistant
from vtherm_api import VThermAPI

KEEPALIVE_NAME = "vtherm_dashboard_keepalive"
"""The name of the factory in the feature managers of `vtherm_api`."""


class KeepAliveFactory:
    """A feature manager factory that applies to no thermostat."""

    @property
    def name(self) -> str:
        """Return the name of the factory."""
        return KEEPALIVE_NAME

    def supports(self, thermostat: Any) -> bool:  # pylint: disable=unused-argument
        """Return False: the factory creates no manager."""
        return False

    def create(self, thermostat: Any) -> NoReturn:
        """Refuse: Versatile Thermostat only calls it when `supports()` is true."""
        raise RuntimeError(f"{KEEPALIVE_NAME} creates no feature manager (thermostat {thermostat})")


def register_api_keepalive(hass: HomeAssistant) -> None:
    """Register the factory that keeps the instance of `vtherm_api`."""
    VThermAPI.get_vtherm_api(hass).register_feature_manager(KeepAliveFactory())


def unregister_api_keepalive(hass: HomeAssistant) -> None:
    """Withdraw the factory."""
    VThermAPI.get_vtherm_api(hass).unregister_feature_manager(KEEPALIVE_NAME)
