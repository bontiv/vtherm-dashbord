"""Read the configuration of Versatile Thermostat.

The thermostats and the central configuration are configuration entries of the integration `versatile_thermostat`. This
module turns them into plain data for the dashboard. It does not write anything: the writing goes through the config flow of
Versatile Thermostat, see `config_flow_driver`.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

VTHERM_DOMAIN = "versatile_thermostat"
"""The domain of Versatile Thermostat."""

SUPPORTED_CONFIG_VERSION: tuple[int, int] = (2, 4)
"""The version and the minor version of the configuration entries that the dashboard can edit. A newer entry is read-only.

It is the `CONFIG_VERSION` and `CONFIG_MINOR_VERSION` of Versatile Thermostat that the dashboard was written for. A test compares them
with the Versatile Thermostat of the development environment, so a new version of the configuration is noticed.
"""

CONF_THERMOSTAT_TYPE = "thermostat_type"
CONF_NAME = "name"

CENTRAL_TYPE = "thermostat_central_config"
"""The `thermostat_type` of the central configuration."""

THERMOSTAT_TYPES: dict[str, str] = {
    "thermostat_over_switch": "over_switch",
    "thermostat_over_climate": "over_climate",
    "thermostat_over_valve": "over_valve",
}
"""The `thermostat_type` of a thermostat of Versatile Thermostat, and the name that the dashboard gives to it."""

READ_ONLY_NEWER_VERSION = "config_version_newer"
"""The reason of a configuration that is read-only: its version is newer than the one that the dashboard supports."""


def is_central(entry: ConfigEntry) -> bool:
    """Return whether the entry is the central configuration."""
    return entry.data.get(CONF_THERMOSTAT_TYPE) == CENTRAL_TYPE


def read_only_reason(entry: ConfigEntry) -> str | None:
    """Return why the entry cannot be edited, or None when it can."""
    if (entry.version, entry.minor_version) > SUPPORTED_CONFIG_VERSION:
        return READ_ONLY_NEWER_VERSION
    return None


@dataclass(frozen=True)
class ThermostatSummary:
    """A thermostat, as the list of the thermostats shows it."""

    id: str
    """The identifier of the thermostat: the identifier of its configuration entry."""
    name: str
    type: str
    """`over_switch`, `over_climate` or `over_valve`."""
    read_only: bool
    """True when the configuration is newer than the dashboard supports."""

    def as_dict(self) -> dict[str, Any]:
        """Return the summary as a JSON-serializable dictionary."""
        return {"id": self.id, "name": self.name, "type": self.type, "read_only": self.read_only}


@dataclass(frozen=True)
class ConfigView:
    """The configuration of an entry, with what the dashboard needs to show it."""

    id: str
    name: str
    type: str
    """`central`, `over_switch`, `over_climate` or `over_valve`."""
    values: dict[str, Any] = field(default_factory=dict)
    """The values of the configuration, by key."""
    version: int = 0
    minor_version: int = 0
    read_only_reason: str | None = None
    """Why the configuration cannot be edited, or None."""

    def as_dict(self) -> dict[str, Any]:
        """Return the view as a JSON-serializable dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "values": self.values,
            "version": self.version,
            "minor_version": self.minor_version,
            "read_only": self.read_only_reason is not None,
            "read_only_reason": self.read_only_reason,
        }


class ConfigNotFoundError(LookupError):
    """There is no Versatile Thermostat configuration entry with this identifier."""


def entries(hass: HomeAssistant) -> list[ConfigEntry]:
    """Return the configuration entries of Versatile Thermostat, the central configuration included."""
    return hass.config_entries.async_entries(VTHERM_DOMAIN)


def central_entry(hass: HomeAssistant) -> ConfigEntry | None:
    """Return the central configuration, or None when there is none."""
    return next((entry for entry in entries(hass) if is_central(entry)), None)


def type_name(entry: ConfigEntry) -> str:
    """Return the type of an entry as the dashboard names it."""
    if is_central(entry):
        return "central"
    return THERMOSTAT_TYPES.get(str(entry.data.get(CONF_THERMOSTAT_TYPE)), "unknown")


def list_thermostats(hass: HomeAssistant) -> list[ThermostatSummary]:
    """List the thermostats, without the central configuration, ordered by name."""
    summaries = [
        ThermostatSummary(entry.entry_id, str(entry.data.get(CONF_NAME, entry.title)), type_name(entry), read_only_reason(entry) is not None)
        for entry in entries(hass)
        if not is_central(entry)
    ]
    return sorted(summaries, key=lambda summary: summary.name.casefold())


def view_of(entry: ConfigEntry) -> ConfigView:
    """Build the view of an entry."""
    return ConfigView(
        id=entry.entry_id,
        name=str(entry.data.get(CONF_NAME, entry.title)),
        type=type_name(entry),
        values=dict(entry.data),
        version=entry.version,
        minor_version=entry.minor_version,
        read_only_reason=read_only_reason(entry),
    )


def read_config(hass: HomeAssistant, entry_id: str) -> ConfigView:
    """Read the configuration of an entry.

    Raises:
        ConfigNotFoundError: There is no entry of Versatile Thermostat with this identifier.
    """
    entry = next((candidate for candidate in entries(hass) if candidate.entry_id == entry_id), None)
    if entry is None:
        raise ConfigNotFoundError(entry_id)
    return view_of(entry)


def read_central_config(hass: HomeAssistant) -> ConfigView | None:
    """Read the central configuration, or return None when there is none."""
    entry = central_entry(hass)
    return None if entry is None else view_of(entry)
