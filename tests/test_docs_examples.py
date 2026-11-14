"""Run the Python examples of the documentation."""

from __future__ import annotations

import importlib.util
from pathlib import Path
from types import SimpleNamespace

import pytest
from vtherm_api import VThermAPI
from vtherm_api.const import DOMAIN

EXAMPLES = Path(__file__).resolve().parent.parent / "docs" / "examples" / "python"


def _load_example(name: str):
    """Import an example of the documentation by its file name."""
    spec = importlib.util.spec_from_file_location(f"docs_example_{name}", EXAMPLES / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture(name="api")
def api_fixture():
    """Return a VThermAPI on a minimal Home Assistant-like object."""
    VThermAPI.reset_vtherm_api()
    hass = SimpleNamespace(data={DOMAIN: {}}, config=SimpleNamespace(time_zone="UTC"))
    yield VThermAPI.get_vtherm_api(hass), hass
    VThermAPI.reset_vtherm_api()


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
