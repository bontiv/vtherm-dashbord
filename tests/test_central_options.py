"""Check that the dashboard knows every option that Versatile Thermostat refuses when there is no central configuration.

The native tabs disable these options without a central configuration (`CENTRAL_REQUIRED_OPTIONS` of
`frontend/src/native/tab-definitions.ts`). The list must follow the one that `validate_input` of the config flow of Versatile
Thermostat checks, otherwise the dashboard shows an option that the flow refuses with `no_central_config`.
"""

from __future__ import annotations

import ast
import re
from pathlib import Path

from .conftest import EXTERNAL_VTHERM, requires_vtherm

pytestmark = requires_vtherm

ROOT = Path(__file__).resolve().parent.parent
TAB_DEFINITIONS = ROOT / "frontend" / "src" / "native" / "tab-definitions.ts"
VTHERM = EXTERNAL_VTHERM / "versatile_thermostat"


def dashboard_options() -> set[str]:
    """The options of `CENTRAL_REQUIRED_OPTIONS`, read from the TypeScript source."""
    match = re.search(r"CENTRAL_REQUIRED_OPTIONS[^=]*=\s*new Set\(\[(.*?)\]\)", TAB_DEFINITIONS.read_text(encoding="utf-8"), re.DOTALL)
    assert match is not None, "CENTRAL_REQUIRED_OPTIONS is not in tab-definitions.ts"
    return set(re.findall(r'"([a-z_]+)"', match.group(1)))


def constants() -> dict[str, str]:
    """The string constants of `const.py` of Versatile Thermostat, by name."""
    tree = ast.parse((VTHERM / "const.py").read_text(encoding="utf-8"))
    values: dict[str, str] = {}
    for node in tree.body:
        if isinstance(node, ast.Assign) and isinstance(node.value, ast.Constant) and isinstance(node.value.value, str):
            values.update({target.id: node.value.value for target in node.targets if isinstance(target, ast.Name)})
    return values


def vtherm_options() -> set[str]:
    """The options of the loop of `validate_input` that raises `NoCentralConfig`, read from the source of the config flow."""
    tree = ast.parse((VTHERM / "config_flow.py").read_text(encoding="utf-8"))
    known = constants()
    for node in ast.walk(tree):
        if not isinstance(node, ast.For) or not isinstance(node.iter, ast.List):
            continue
        raises = [inner for inner in ast.walk(node) if isinstance(inner, ast.Raise) and isinstance(inner.exc, ast.Call) and getattr(inner.exc.func, "id", "") == "NoCentralConfig"]
        if raises:
            return {known[element.id] for element in node.iter.elts if isinstance(element, ast.Name)}
    raise AssertionError("The loop of validate_input that raises NoCentralConfig was not found")


def test_the_central_options_of_the_dashboard_are_the_ones_of_versatile_thermostat() -> None:
    """An option that one side has and the other has not is named."""
    dashboard, vtherm = dashboard_options(), vtherm_options()
    assert dashboard == vtherm, f"only in the dashboard: {sorted(dashboard - vtherm)}, only in Versatile Thermostat: {sorted(vtherm - dashboard)}"
