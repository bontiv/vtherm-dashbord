"""Config flow of the Versatile Thermostat dashboard integration."""

from __future__ import annotations

from typing import Any

from homeassistant.config_entries import ConfigFlow, ConfigFlowResult

from .const import DOMAIN, TITLE


class VThermDashboardConfigFlow(ConfigFlow, domain=DOMAIN):  # pylint: disable=abstract-method  # is_matching only concerns discovery flows
    """Add the dashboard to Home Assistant. The manifest allows a single entry, so the flow has no option."""

    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Ask for a confirmation, then create the entry."""
        if user_input is not None:
            return self.async_create_entry(title=TITLE, data={})
        return self.async_show_form(step_id="user")
