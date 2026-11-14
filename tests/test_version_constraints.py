"""Tests for the dashboard version constraints, driven by the shared table of cases."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from custom_components.vtherm_dashboard.version_constraints import (
    REASON_TOO_NEW,
    REASON_TOO_OLD,
    VersionConstraintError,
    check,
    parse_constraint,
    parse_version,
    satisfies,
)

CASES = json.loads((Path(__file__).resolve().parent.parent / "shared" / "version-constraints.json").read_text(encoding="utf-8"))


@pytest.mark.parametrize("case", CASES["evaluations"], ids=lambda case: f"{case['constraint']}|{case['version']}")
def test_evaluation(case) -> None:
    """Each case of the table gives the expected result and reason."""
    assert check(case["version"], case["constraint"]) == case["result"]
    assert satisfies(case["version"], case["constraint"]) is (case["result"] is None)


@pytest.mark.parametrize("case", CASES["invalid_constraints"], ids=lambda case: repr(case["constraint"]))
def test_invalid_constraint_names_the_faulty_part(case) -> None:
    """An invalid constraint raises an error that cites the faulty comparator."""
    with pytest.raises(VersionConstraintError) as error:
        parse_constraint(case["constraint"])
    assert error.value.fault == case["fault"]
    assert f"'{case['fault']}'" in str(error.value)


@pytest.mark.parametrize("version", CASES["invalid_versions"], ids=repr)
def test_invalid_version(version) -> None:
    """A text that is not a semantic version with an optional patch number is refused."""
    with pytest.raises(VersionConstraintError):
        parse_version(version)


def test_non_string_input_is_refused() -> None:
    """A value that is not a string is refused instead of crashing."""
    with pytest.raises(VersionConstraintError):
        parse_version(1.0)
    with pytest.raises(VersionConstraintError):
        parse_constraint(None)


def test_missing_patch_is_zero() -> None:
    """The version 1.0 is the version 1.0.0."""
    assert parse_version("1.0") == parse_version("1.0.0")
    assert str(parse_version("1.4")) == "1.4.0"


def test_reasons_are_the_documented_constants() -> None:
    """The reasons used by the dashboard are stable values."""
    assert (REASON_TOO_OLD, REASON_TOO_NEW) == ("too_old", "too_new")


def test_precedence_follows_semver() -> None:
    """The ordering example of semver.org is respected from the lowest to the highest version."""
    ordered = ["1.0.0-alpha", "1.0.0-alpha.1", "1.0.0-alpha.beta", "1.0.0-beta", "1.0.0-beta.2", "1.0.0-beta.11", "1.0.0-rc.1", "1.0.0"]
    keys = [parse_version(version).sort_key for version in ordered]
    assert keys == sorted(keys)
    assert len(set(keys)) == len(keys)
