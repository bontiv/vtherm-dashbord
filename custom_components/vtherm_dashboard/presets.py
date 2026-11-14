"""Read and change the preset temperatures of Versatile Thermostat.

The temperatures of the presets are not in the configuration entries: Versatile Thermostat exposes each one as a `number`
entity, for each thermostat that does not use the central presets and for the central configuration. They are found in the
entity registry, by their configuration entry and their unique identifier, so a renamed entity is still found.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError, ServiceValidationError
from homeassistant.helpers import entity_registry as er

from .config_flow_driver import FieldError
from .vtherm_config import VTHERM_DOMAIN

PRESET_MARKER = "_preset_"
"""The part of the unique identifier of a preset entity that is followed by the name of the preset, such as `eco_temp`."""

PRESETS_TAB = "presets"
"""The tab of the errors on the presets."""

ERROR_UNKNOWN_PRESET = "unknown_preset"
ERROR_OUT_OF_RANGE = "out_of_range"
ERROR_NOT_APPLIED = "preset_not_applied"
ERROR_REJECTED = "preset_rejected"


@dataclass(frozen=True)
class PresetValue:
    """The temperature of a preset."""

    preset: str
    """The name of the preset, such as `eco_temp`, `comfort_ac_temp` or `frost_away_temp`."""
    entity_id: str
    value: float | None
    """The temperature, or None when the entity has no usable state."""
    min: float | None
    max: float | None
    step: float | None
    unit: str | None

    def as_dict(self) -> dict[str, Any]:
        """Return the preset as a JSON-serializable dictionary."""
        return {"preset": self.preset, "entity_id": self.entity_id, "value": self.value, "min": self.min, "max": self.max, "step": self.step, "unit": self.unit}


def _float(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def preset_entities(hass: HomeAssistant, entry_id: str) -> dict[str, str]:
    """Return the entity of each preset of an entry, by preset name. A thermostat that uses the central presets has none."""
    registry = er.async_get(hass)
    found: dict[str, str] = {}
    for registered in er.async_entries_for_config_entry(registry, entry_id):
        unique_id = registered.unique_id or ""
        if registered.domain == "number" and registered.platform == VTHERM_DOMAIN and PRESET_MARKER in unique_id:
            found[unique_id.split(PRESET_MARKER, 1)[1]] = registered.entity_id
    return found


def read_presets(hass: HomeAssistant, entry_id: str) -> list[PresetValue]:
    """Read the preset temperatures of an entry, ordered by preset name."""
    presets = []
    for preset, entity_id in sorted(preset_entities(hass, entry_id).items()):
        state = hass.states.get(entity_id)
        attributes = state.attributes if state is not None else {}
        presets.append(
            PresetValue(
                preset=preset,
                entity_id=entity_id,
                value=None if state is None else _float(state.state),
                min=_float(attributes.get("min")),
                max=_float(attributes.get("max")),
                step=_float(attributes.get("step")),
                unit=attributes.get("unit_of_measurement"),
            )
        )
    return presets


async def async_set_presets(hass: HomeAssistant, entry_id: str, values: Mapping[str, float]) -> list[FieldError]:
    """Apply preset temperatures, one after the other, with the service `number.set_value`.

    A preset that fails does not stop the others. Each failure is returned on the field of its preset.
    """
    entities = preset_entities(hass, entry_id)
    errors: list[FieldError] = []
    for preset, value in values.items():
        entity_id = entities.get(preset)
        if entity_id is None:
            errors.append(FieldError(PRESETS_TAB, preset, ERROR_UNKNOWN_PRESET))
            continue
        try:
            await hass.services.async_call("number", "set_value", {"entity_id": entity_id, "value": value}, blocking=True)
        except ServiceValidationError as err:
            errors.append(FieldError(PRESETS_TAB, preset, ERROR_OUT_OF_RANGE if err.translation_key == "out_of_range" else ERROR_REJECTED))
            continue
        except (HomeAssistantError, ValueError):
            errors.append(FieldError(PRESETS_TAB, preset, ERROR_REJECTED))
            continue
        # A thermostat that is not ready ignores the value without error, so the state is read back.
        state = hass.states.get(entity_id)
        if state is None or _float(state.state) != _float(value):
            errors.append(FieldError(PRESETS_TAB, preset, ERROR_NOT_APPLIED))
    return errors
