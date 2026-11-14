"""Check that the forms of Versatile Thermostat are the ones that the native tabs of the dashboard were written for.

When this test fails, Versatile Thermostat changed a form: read the difference, update the native tab that shows the form, then
write the new description with `pytest tests/test_schema_drift.py --update-schemas` and commit it.
"""

from __future__ import annotations

import copy
import json
from pathlib import Path

import pytest
import voluptuous as vol

from custom_components.vtherm_dashboard.schema_description import describe_module, describe_schema

from .conftest import requires_vtherm

pytestmark = requires_vtherm

DESCRIPTION = Path(__file__).resolve().parent.parent / "shared" / "vtherm-config-schemas.json"


@pytest.fixture(name="schemas")
def schemas_fixture(real_vtherm):  # pylint: disable=unused-argument
    """The module of the forms of the real Versatile Thermostat."""
    # pylint: disable-next=import-outside-toplevel,import-error,no-name-in-module
    from custom_components.versatile_thermostat import config_schema

    return config_schema


def differences(expected: dict, actual: dict) -> list[str]:
    """Explain what changed between two descriptions, form by form and field by field."""
    lines = []
    for name in sorted(set(expected) | set(actual)):
        if name not in actual:
            lines.append(f"{name}: the form no longer exists")
            continue
        if name not in expected:
            lines.append(f"{name}: new form")
            continue
        old = {field["key"]: field for field in expected[name]}
        new = {field["key"]: field for field in actual[name]}
        lines += [f"{name}.{key}: removed" for key in old if key not in new]
        lines += [f"{name}.{key}: added" for key in new if key not in old]
        lines += [f"{name}.{key}: changed from {old[key]} to {new[key]}" for key in old if key in new and old[key] != new[key]]
    return lines


def test_the_forms_are_those_that_the_native_tabs_were_written_for(schemas, request) -> None:
    """The fields of every form (key, kind, default, limits) are the expected ones."""
    actual = describe_module(schemas)
    if request.config.getoption("--update-schemas"):
        DESCRIPTION.write_text(json.dumps(actual, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    expected = json.loads(DESCRIPTION.read_text(encoding="utf-8"))
    assert not differences(expected, actual), "Versatile Thermostat changed its forms:\n" + "\n".join(differences(expected, actual))


def test_the_check_sees_a_field_that_is_added_removed_or_renamed(schemas) -> None:
    """A copy of a form with a field added, one removed and one renamed gives one difference for each."""
    original = schemas.STEP_CENTRAL_LOCK_DATA_SCHEMA
    expected = {"lock": describe_schema(original)}
    fields = copy.copy(original.schema)
    first, second = list(fields)[:2]
    removed_validator = fields.pop(first)
    fields[vol.Optional("lock_new_field", default=1)] = int
    renamed_validator = fields.pop(second)
    fields[vol.Optional(f"{second}_renamed")] = renamed_validator
    changed = describe_schema(vol.Schema(fields))
    assert removed_validator is not None
    assert sorted(differences(expected, {"lock": changed})) == sorted(
        [f"lock.{first}: removed", f"lock.{second}: removed", "lock.lock_new_field: added", f"lock.{second}_renamed: added"]
    )


def test_the_check_sees_a_default_or_a_kind_that_changes(schemas) -> None:
    """A field whose default value or kind changes is reported."""
    original = schemas.STEP_CENTRAL_TPI_DATA_SCHEMA
    expected = {"tpi": describe_schema(original)}
    fields = {}
    for marker, validator in original.schema.items():
        if str(marker) == "tpi_coef_int":
            fields[vol.Required("tpi_coef_int", default=0.9)] = validator
        elif str(marker) == "minimal_activation_delay":
            fields[vol.Required("minimal_activation_delay", default=10)] = str
        else:
            fields[marker] = validator
    lines = differences(expected, {"tpi": describe_schema(vol.Schema(fields))})
    assert [line.split(":")[0] for line in lines] == ["tpi.tpi_coef_int", "tpi.minimal_activation_delay"]


def test_the_description_names_the_defaults_of_the_specification(schemas) -> None:
    """Some values of the specification of the native tabs, read from the real forms."""
    described = describe_module(schemas)
    by_key = lambda form: {field["key"]: field for field in described[form]}  # noqa: E731  pylint: disable=unnecessary-lambda-assignment
    tpi = by_key("STEP_CENTRAL_TPI_DATA_SCHEMA")
    assert (tpi["tpi_coef_int"]["default"], tpi["tpi_coef_int"]["min"], tpi["tpi_coef_int"]["max"]) == (0.6, 0.0, 10.0)
    assert (tpi["tpi_coef_ext"]["default"], tpi["minimal_activation_delay"]["default"], tpi["minimal_deactivation_delay"]["default"]) == (0.01, 10, 0)
    main = by_key("STEP_MAIN_DATA_SCHEMA")
    assert (main["cycle_min"]["default"], main["use_main_central_config"]["default"], main["used_by_controls_central_boiler"]["default"]) == (5, True, False)
    central_main = by_key("STEP_CENTRAL_MAIN_DATA_SCHEMA")
    assert (central_main["temp_min"]["default"], central_main["temp_max"]["default"], central_main["step_temperature"]["default"]) == (7, 35, 0.1)
    climate = by_key("STEP_THERMOSTAT_CLIMATE")
    assert (climate["auto_regulation_mode"]["default"], climate["auto_regulation_dtemp"]["default"], climate["auto_regulation_periode_min"]["default"]) == (
        "auto_regulation_none",
        0.5,
        5,
    )
