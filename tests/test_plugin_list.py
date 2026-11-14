"""Tests for the construction of the plugin load list."""

from __future__ import annotations

import json

import pytest
from vtherm_api import UiPlugin

from custom_components.vtherm_dashboard.plugin_list import (
    SOURCE_DEVELOPMENT,
    SOURCE_INSTALLED,
    SOURCE_NATIVE,
    STATE_CYCLE,
    STATE_INCOMPATIBLE,
    STATE_INVALID,
    STATE_MISSING_DEPENDENCY,
    STATE_READY,
    build_plugin_list,
)
from custom_components.vtherm_dashboard.version_constraints import VersionConstraintError

DASHBOARD = "1.4.0"


def plugin(plugin_id: str, constraint: str = ">=1.0,<2.0", js_url: str | None = None, **kwargs) -> UiPlugin:
    """Build a registered plugin."""
    return UiPlugin(
        id=plugin_id,
        js_url=js_url or f"/{plugin_id}/ui.js",
        dashboard_version=constraint,
        requires=tuple(kwargs.get("requires", ())),
        load_after=tuple(kwargs.get("load_after", ())),
        load_before=tuple(kwargs.get("load_before", ())),
    )


def build(plugins, dev=None, version: str = DASHBOARD) -> dict:
    """Build the list and index it by identifier."""
    return {entry.id: entry for entry in build_plugin_list(plugins, version, dev)}


def ready_order(plugins, dev=None) -> list[str]:
    """Return the identifiers to load, in load order."""
    return [entry.id for entry in build_plugin_list(plugins, DASHBOARD, dev) if entry.state == STATE_READY]


def test_empty() -> None:
    """Without plugin, the list is empty."""
    assert not build_plugin_list([], DASHBOARD)


def test_valid_plugin_is_ready_and_installed() -> None:
    """A valid plugin is ready at rank 0 and comes from an installed integration."""
    entry = build([plugin("smartpi")])["smartpi"]
    assert (entry.state, entry.reason, entry.order, entry.source) == (STATE_READY, None, 0, SOURCE_INSTALLED)


def test_core_is_loaded_first() -> None:
    """The core plugin comes first, even when other plugins are registered first and sort before it."""
    assert ready_order([plugin("a"), plugin("core"), plugin("b")]) == ["core", "a", "b"]


def test_nothing_can_be_loaded_before_core() -> None:
    """A plugin that asks to load before the core plugin is loaded after it."""
    assert ready_order([plugin("a", load_before=["core"]), plugin("core")]) == ["core", "a"]


def test_dependency_on_core_is_satisfied() -> None:
    """A plugin that requires core is ready and loaded after it."""
    assert ready_order([plugin("tpi", requires=["core"]), plugin("core")]) == ["core", "tpi"]


def test_load_after_and_load_before() -> None:
    """The declared order is respected whatever the registration order."""
    assert ready_order([plugin("b", load_after=["a"]), plugin("a")]) == ["a", "b"]
    assert ready_order([plugin("b", load_before=["a"]), plugin("a")]) == ["b", "a"]


def test_soft_dependency_on_absent_plugin_is_ignored() -> None:
    """A load_after or load_before on an absent plugin does not prevent the load."""
    result = build([plugin("b", load_after=["absent"], load_before=["other"])])
    assert result["b"].state == STATE_READY


def test_order_is_deterministic() -> None:
    """Plugins without constraint are ordered by identifier, whatever the registration order."""
    assert ready_order([plugin("c"), plugin("a"), plugin("b")]) == ["a", "b", "c"]
    assert ready_order([plugin("b"), plugin("c"), plugin("a")]) == ["a", "b", "c"]


def test_requires_missing_plugin() -> None:
    """A required plugin that is absent makes the plugin 'missing dependency' and names it."""
    entry = build([plugin("b", requires=["a"])])["b"]
    assert (entry.state, entry.details, entry.order) == (STATE_MISSING_DEPENDENCY, {"missing": ["a"]}, None)


def test_missing_dependency_propagates() -> None:
    """A plugin that requires a plugin in 'missing dependency' is in that state too."""
    result = build([plugin("b", requires=["a"]), plugin("c", requires=["b"])])
    assert result["c"].state == STATE_MISSING_DEPENDENCY
    assert result["c"].details == {"missing": ["b"]}


def test_requires_a_plugin_that_is_not_ready() -> None:
    """A plugin whose required plugin is incompatible or invalid is in 'missing dependency'."""
    result = build([plugin("a", ">=2.0"), plugin("b", requires=["a"]), plugin("bad", "^1.0"), plugin("c", requires=["bad"])])
    assert result["a"].state == STATE_INCOMPATIBLE
    assert result["b"].state == STATE_MISSING_DEPENDENCY
    assert result["c"].state == STATE_MISSING_DEPENDENCY


def test_cycle_excludes_its_plugins_and_keeps_the_others() -> None:
    """Two plugins that load after each other are excluded with the list of the cycle, and the others are loaded."""
    result = build([plugin("a", load_after=["b"]), plugin("b", load_after=["a"]), plugin("other")])
    for plugin_id in ("a", "b"):
        assert result[plugin_id].state == STATE_CYCLE
        assert result[plugin_id].details == {"plugins": ["a", "b"]}
    assert result["other"].state == STATE_READY


def test_cycle_through_requires_and_load_before() -> None:
    """Hard and soft links form cycles together."""
    result = build([plugin("a", requires=["b"]), plugin("b", load_before=["a"], load_after=["c"]), plugin("c", load_after=["a"])])
    assert {result[plugin_id].state for plugin_id in "abc"} == {STATE_CYCLE}


def test_plugin_that_requires_itself_is_a_cycle() -> None:
    """A plugin that requires itself can never be loaded."""
    assert build([plugin("a", requires=["a"])])["a"].state == STATE_CYCLE


def test_dependents_of_a_cycle() -> None:
    """A plugin that requires a member of a cycle is in 'missing dependency', one that only loads after it is ready."""
    result = build([plugin("a", load_after=["b"]), plugin("b", load_after=["a"]), plugin("hard", requires=["a"]), plugin("soft", load_after=["a"])])
    assert result["hard"].state == STATE_MISSING_DEPENDENCY
    assert result["soft"].state == STATE_READY


def test_dashboard_too_old() -> None:
    """A plugin that needs a newer dashboard is excluded, with the constraint, the version and the reason."""
    entry = build([plugin("a", ">=2.0")])["a"]
    assert (entry.state, entry.reason) == (STATE_INCOMPATIBLE, "too_old")
    assert entry.details == {"constraint": ">=2.0", "dashboard_version": DASHBOARD}


def test_dashboard_too_new() -> None:
    """A plugin that does not support the new major version is excluded as 'too new'."""
    entry = build([plugin("a", ">=1.0,<2.0")], version="2.1.0")["a"]
    assert (entry.state, entry.reason) == (STATE_INCOMPATIBLE, "too_new")


def test_dashboard_compatible() -> None:
    """A satisfied constraint gives a ready plugin."""
    assert build([plugin("a", ">=1.2,<2.0")])["a"].state == STATE_READY


def test_invalid_constraint_cites_the_faulty_part() -> None:
    """An unsupported operator makes the plugin invalid, and the faulty comparator is reported."""
    entry = build([plugin("a", ">=1.0,^2.0")])["a"]
    assert (entry.state, entry.reason, entry.details) == (STATE_INVALID, "invalid_constraint", {"fault": "^2.0"})


def test_reserved_identifier_is_refused_for_a_third_party() -> None:
    """A plugin that is not native cannot use an identifier `core` or `core_*`."""
    for plugin_id in ("core_custom", "core_"):
        entry = build([plugin(plugin_id)])[plugin_id]
        assert (entry.state, entry.reason) == (STATE_INVALID, "reserved_id")


def test_native_plugin_is_accepted() -> None:
    """The native plugins are ready and their source is 'native'."""
    entry = build([plugin("core"), plugin("core_tpi", requires=["core"])])["core_tpi"]
    assert (entry.state, entry.source) == (STATE_READY, SOURCE_NATIVE)


def test_identifier_that_only_looks_reserved_is_allowed() -> None:
    """An identifier such as `corex` or `coreplugin` is not reserved."""
    assert build([plugin("corex")])["corex"].state == STATE_READY


@pytest.mark.parametrize("url", ["https://other-host/ui.js", "http://other-host/ui.js", "//other-host/ui.js", "ui.js", "javascript:alert(1)", "/\\other-host/ui.js"])
def test_installed_plugin_url_must_be_local(url) -> None:
    """An installed plugin must give a path of this instance, never another host."""
    entry = build([plugin("a", js_url=url)])["a"]
    assert (entry.state, entry.reason, entry.details) == (STATE_INVALID, "invalid_url", {"url": url})


def test_development_entry_replaces_the_url_and_keeps_the_metadata() -> None:
    """An entry for an installed plugin changes its module URL only."""
    dev = [{"id": "smartpi", "js_url": "http://localhost:5173/ui.js", "dashboard_version": ">=9.0", "requires": ["unknown"]}]
    entry = build([plugin("smartpi", requires=["core"]), plugin("core")], dev)["smartpi"]
    assert entry.js_url == "http://localhost:5173/ui.js"
    assert entry.source == SOURCE_DEVELOPMENT
    assert entry.dashboard_version == ">=1.0,<2.0"
    assert entry.requires == ("core",)
    assert entry.state == STATE_READY


def test_development_entry_can_replace_a_native_plugin() -> None:
    """A native plugin can be developed from a local server."""
    entry = build([plugin("core")], [{"id": "core", "js_url": "http://localhost:5173/core.js"}])["core"]
    assert (entry.state, entry.source) == (STATE_READY, SOURCE_DEVELOPMENT)


def test_development_entry_for_an_unknown_plugin_is_a_full_declaration() -> None:
    """An entry whose id is unknown declares the plugin itself, and follows the normal load rules."""
    dev = [{"id": "mine", "js_url": "https://dev.local/ui.js", "dashboard_version": ">=1.0,<2.0", "requires": ["core"], "load_after": ["core_tpi"]}]
    assert ready_order([plugin("core"), plugin("core_tpi", requires=["core"])], dev) == ["core", "core_tpi", "mine"]


def test_development_entry_without_constraint_is_invalid() -> None:
    """An unknown plugin in development must give its dashboard_version."""
    entry = build([], [{"id": "mine", "js_url": "http://localhost/ui.js"}])["mine"]
    assert (entry.state, entry.reason) == (STATE_INVALID, "missing_constraint")


@pytest.mark.parametrize("url", ["javascript:alert(1)", "data:text/javascript,1", "/local.js", "ftp://host/ui.js", "http://"])
def test_development_url_must_be_http_or_https(url) -> None:
    """A development URL with another scheme, or without host, is refused."""
    entry = build([], [{"id": "mine", "js_url": url, "dashboard_version": ">=1.0"}])["mine"]
    assert (entry.state, entry.reason) == (STATE_INVALID, "invalid_url")


def test_development_entry_with_a_reserved_identifier_is_refused() -> None:
    """A development entry cannot take an identifier reserved for the native plugins."""
    entry = build([], [{"id": "core_mine", "js_url": "http://localhost/ui.js", "dashboard_version": ">=1.0"}])["core_mine"]
    assert (entry.state, entry.reason) == (STATE_INVALID, "reserved_id")


def test_development_plugin_follows_the_compatibility_rule() -> None:
    """A development plugin that does not support the dashboard version is not loaded."""
    entry = build([], [{"id": "mine", "js_url": "http://localhost/ui.js", "dashboard_version": ">=2.0"}])["mine"]
    assert (entry.state, entry.reason) == (STATE_INCOMPATIBLE, "too_old")


def test_malformed_development_entries_are_ignored() -> None:
    """Entries that cannot be used are skipped, and a repeated identifier keeps the first entry."""
    dev = [
        None,
        "text",
        {"js_url": "http://localhost/ui.js"},
        {"id": 5, "js_url": "http://localhost/ui.js"},
        {"id": "mine", "js_url": 5},
        {"id": "ok", "js_url": "http://first/ui.js", "dashboard_version": ">=1.0"},
        {"id": "ok", "js_url": "http://second/ui.js", "dashboard_version": ">=1.0"},
    ]
    result = build([], dev)
    assert list(result) == ["ok"]
    assert result["ok"].js_url == "http://first/ui.js"


def test_ranks_and_listing_order() -> None:
    """Ready plugins come first in load order with ranks 0..n-1, then the others by identifier without rank."""
    entries = build_plugin_list([plugin("z_bad", "^1"), plugin("b"), plugin("a", ">=3"), plugin("c", load_before=["b"])], DASHBOARD)
    assert [(entry.id, entry.order) for entry in entries] == [("c", 0), ("b", 1), ("a", None), ("z_bad", None)]


def test_invalid_dashboard_version_is_an_error() -> None:
    """The dashboard version comes from the manifest and must be valid."""
    with pytest.raises(VersionConstraintError):
        build_plugin_list([], "not-a-version")


def test_entries_are_json_serializable() -> None:
    """The list is sent through the WebSocket."""
    entries = build_plugin_list([plugin("a", load_after=["b"]), plugin("b", load_after=["a"]), plugin("c", ">=2.0"), plugin("d")], DASHBOARD)
    assert json.loads(json.dumps([entry.as_dict() for entry in entries]))[0]["id"] == "d"
