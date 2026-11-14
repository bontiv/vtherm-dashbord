"""Run the Python examples of the documentation."""

from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest

EXAMPLES = Path(__file__).resolve().parent.parent / "docs" / "examples" / "python"


def _load_example(name: str):
    """Import an example of the documentation by its file name."""
    spec = importlib.util.spec_from_file_location(f"docs_example_{name}", EXAMPLES / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_register_ui_plugin_example(api) -> None:
    """The registration example declares the plugin and withdraws it."""
    vtherm_api, hass = api
    example = _load_example("register_ui_plugin")

    example.register_my_ui_plugin(hass)
    plugins = vtherm_api.get_ui_plugins()
    assert [plugin.id for plugin in plugins] == [example.PLUGIN_ID]
    assert plugins[0].js_url == example.JS_URL
    assert plugins[0].dashboard_version == ">=1.0,<2.0"
    assert plugins[0].requires == ("core",)
    assert plugins[0].load_after == ("core_tpi",)

    with pytest.raises(ValueError, match="already registered"):
        example.register_my_ui_plugin(hass)

    example.unregister_my_ui_plugin(hass)
    assert vtherm_api.get_ui_plugins() == []


def test_load_order_example(api) -> None:
    """The plugins of the load order example are sorted as the page says."""
    # pylint: disable=import-outside-toplevel
    from custom_components.vtherm_dashboard.plugin_list import build_plugin_list

    vtherm_api, hass = api
    _load_example("load_order").register_plugins(hass)

    plugins = build_plugin_list(vtherm_api.get_ui_plugins(), "0.1.0")
    assert [(plugin.id, plugin.state) for plugin in plugins] == [("early", "ready"), ("base", "ready"), ("extra", "ready"), ("themes", "ready")]


def test_version_constraints_example() -> None:
    """The constraints of the example behave as the page says."""
    # pylint: disable=import-outside-toplevel
    from custom_components.vtherm_dashboard.version_constraints import check

    example = _load_example("version_constraints")
    assert check("1.9.0", example.SUPPORTS_VERSION_1) is None
    assert check("2.0.0", example.SUPPORTS_VERSION_1) == "too_new"
    assert check("2.4.0", example.SUPPORTS_VERSIONS_1_AND_2) is None
    assert check("1.0.0-rc.2", example.SUPPORTS_VERSION_1) == "too_old"
    assert check("1.0.0-rc.2", example.SUPPORTS_FROM_A_PRERELEASE) is None
    assert check("1.4.0", example.EXACT_VERSION) is None
    assert check("1.4.1", example.EXACT_VERSION) == "too_new"
