"""Describe the forms of a config flow as plain data.

The native tabs of the dashboard show the fields of the forms of Versatile Thermostat. To notice when Versatile Thermostat adds,
removes or changes a field, the forms are described (key, kind, default value, limits) and the description is compared with the
one that the dashboard was written for, in `shared/vtherm-config-schemas.json`.
"""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import selector

_VALIDATORS: dict[Any, str] = {cv.boolean: "boolean", cv.string: "string", str: "string", cv.positive_int: "integer", int: "integer", float: "number", bool: "boolean"}


def _jsonable(value: Any) -> Any:
    """Return a value that JSON can hold: the enumerations become their value."""
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    if isinstance(value, (list, tuple)):
        return [_jsonable(item) for item in value]
    if isinstance(value, dict):
        return {str(key): _jsonable(item) for key, item in value.items()}
    return str(getattr(value, "value", value))


def _is_hashable(value: Any) -> bool:
    try:
        hash(value)
    except TypeError:
        return False
    return True


# One exit for each kind of validator.
# pylint: disable-next=too-many-return-statements
def describe_validator(validator: Any) -> dict[str, Any]:
    """Describe what a field accepts: its kind and, when it has some, its limits, its options or its domains."""
    # The selectors cannot be hashed, so they are not looked up in the table of the plain validators.
    if not isinstance(validator, selector.Selector) and _is_hashable(validator) and validator in _VALIDATORS:
        return {"kind": _VALIDATORS[validator]}
    if isinstance(validator, vol.Coerce):
        return {"kind": "number" if validator.type is float else _VALIDATORS.get(validator.type, "unknown")}
    if isinstance(validator, vol.In):
        return {"kind": "select", "options": _jsonable(list(validator.container))}
    if isinstance(validator, vol.All):
        description: dict[str, Any] = {}
        for part in validator.validators:
            if isinstance(part, vol.Range):
                description.update({"min": _jsonable(part.min), "max": _jsonable(part.max)})
            else:
                description = {**describe_validator(part), **description}
        return description
    if isinstance(validator, selector.Selector):
        config = {key: value for key, value in validator.config.items() if key not in ("translation_key", "mode", "sort", "custom_value")}
        kind = {"entity": "entity", "number": "number", "select": "select", "text": "text", "boolean": "boolean", "template": "template"}.get(
            validator.selector_type, validator.selector_type
        )
        return {"kind": kind, **_jsonable(config)}
    if callable(validator):
        return {"kind": getattr(validator, "__name__", "custom")}
    return {"kind": "unknown"}


def describe_schema(schema: vol.Schema) -> list[dict[str, Any]]:
    """Describe the fields of a form, in the order of the form."""
    fields = []
    for marker, validator in schema.schema.items():
        default = marker.default() if isinstance(marker, vol.Marker) and marker.default is not vol.UNDEFINED else None
        fields.append({"key": str(marker), "required": isinstance(marker, vol.Required), "default": _jsonable(default), **describe_validator(validator)})
    return fields


def describe_module(module: Any) -> dict[str, list[dict[str, Any]]]:
    """Describe every form of a module of schemas: the constants `STEP_*` and the functions `build_step_*_schema`, ordered by name."""
    schemas: dict[str, vol.Schema] = {name: value for name, value in vars(module).items() if name.startswith("STEP_") and isinstance(value, vol.Schema)}
    for name, value in vars(module).items():
        if name.startswith("build_step_") and name.endswith("_schema") and callable(value):
            schemas[name] = value()
    return {name: describe_schema(schemas[name]) for name in sorted(schemas)}
