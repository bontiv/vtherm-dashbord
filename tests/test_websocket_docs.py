"""Check that the WebSocket reference documents every field of the response."""

from __future__ import annotations

from pathlib import Path

from custom_components.vtherm_dashboard import plugin_list
from custom_components.vtherm_dashboard.plugin_list import PluginEntry

PAGE = (Path(__file__).resolve().parent.parent / "docs" / "reference" / "websocket-api.md").read_text(encoding="utf-8")


def test_every_field_of_the_response_is_documented() -> None:
    """The top-level fields and the fields of each plugin appear in the page."""
    entry = PluginEntry("a", "/a.js", "", (), (), (), "installed", "ready", None, {}, 0).as_dict()
    for field in ("dashboard_version", "plugins", *entry):
        assert f"`{field}`" in PAGE, field


def test_every_state_and_reason_is_documented() -> None:
    """Each state and reason code of the list builder appears in the page."""
    codes = [getattr(plugin_list, name) for name in dir(plugin_list) if name.startswith(("STATE_", "REASON_", "SOURCE_"))]
    assert codes
    for code in codes:
        assert f"`{code}`" in PAGE, code
    assert "`too_old`" in PAGE and "`too_new`" in PAGE


def test_every_error_code_is_documented() -> None:
    """The error codes returned by the command appear in the page."""
    for code in ("unauthorized", "invalid_format"):
        assert f"`{code}`" in PAGE
