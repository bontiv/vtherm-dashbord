"""Repair flows of the dashboard."""

from __future__ import annotations

from homeassistant.components.repairs import ConfirmRepairFlow, RepairsFlow
from homeassistant.core import HomeAssistant

from .const import ISSUE_RESTART_REQUIRED


class RestartRepairFlow(ConfirmRepairFlow):
    """Confirm, then restart Home Assistant so that the required `vtherm_api` is loaded."""

    async def async_step_confirm(self, user_input: dict[str, str] | None = None):
        """Restart Home Assistant once the user has confirmed."""
        if user_input is not None:
            await self.hass.services.async_call("homeassistant", "restart")
        return await super().async_step_confirm(user_input)


async def async_create_fix_flow(hass: HomeAssistant, issue_id: str, data: dict[str, str | int | float | None] | None) -> RepairsFlow:  # pylint: disable=unused-argument
    """Create the flow that fixes an issue of the dashboard."""
    if issue_id == ISSUE_RESTART_REQUIRED:
        return RestartRepairFlow()
    raise ValueError(f"Unknown issue: {issue_id}")
