"""Python resolver of the External_Projects (Versatile Thermostat, vtherm_api, HACS).

The folder of a project is the value of its Location_Variable, or its Default_Location when the variable is blank
(unset, empty or only whitespace). A non-blank value is used exactly as given (no trimming), a relative one is
joined to the root of the project, and the result is normalized lexically (symbolic links are not resolved).

This is the only Python place where the default ``external/`` path is defined.
"""

import os
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
"""Root of the Dashboard_Project, the parent of tests/."""


@dataclass(frozen=True)
class Location:
    """Where one External_Project is looked for."""

    name: str
    variable: str
    default: str


LOCATIONS: Mapping[str, Location] = {
    location.name: location
    for location in (
        Location("versatile_thermostat", "VTHERM_VERSATILE_THERMOSTAT_DIR", "external/versatile_thermostat"),
        Location("vtherm_api", "VTHERM_API_DIR", "external/vtherm_api"),
        Location("hacs", "VTHERM_HACS_DIR", "external/hacs"),
    )
}


class ExternalProjectError(Exception):
    """The folder of an External_Project is not available. The message names the variable and the path."""


def locate(name: str, environ: Mapping[str, str] = os.environ, root: Path = PROJECT_ROOT) -> Path:
    """The absolute normalized folder of an External_Project, without checking that it exists."""
    location = LOCATIONS[name]
    value = environ.get(location.variable, "")
    if value.strip() == "":
        value = location.default
    return Path(os.path.normpath(os.path.join(root, value)))


def resolve(name: str, environ: Mapping[str, str] = os.environ, root: Path = PROJECT_ROOT) -> Path:
    """The folder of an External_Project, which must be an existing folder.

    Raises ExternalProjectError when it is not. A variable that is set never falls back to the Default_Location.
    """
    location = LOCATIONS[name]
    path = locate(name, environ, root)
    if not path.is_dir():
        is_set = environ.get(location.variable, "").strip() != ""
        origin = "set to" if is_set else "default of"
        raise ExternalProjectError(
            f"{location.variable}: {origin} {name}, {path} does not exist or is not a folder"
            if is_set
            else f"{location.variable}: {origin} {name} (default location), {path} does not exist or is not a folder"
        )
    return path


def skip_reason(name: str, environ: Mapping[str, str] = os.environ, root: Path = PROJECT_ROOT) -> str | None:
    """None when the folder exists, otherwise the reason to skip the tests that need it."""
    path = locate(name, environ, root)
    if path.is_dir():
        return None
    return f"{LOCATIONS[name].variable}: {path} is not available"
