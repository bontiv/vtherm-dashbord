"""Build the list of UI plugins that the frontend must load.

`vtherm_api` only stores the declarations of the plugins. This module validates them, checks their compatibility with
the dashboard version, resolves their dependencies and computes the load order. It runs on each call of the
`vtherm_dashboard/get_ui_plugins` WebSocket command, so the frontend only has to import the modules in the order received.
"""

from __future__ import annotations

import heapq
from collections.abc import Iterable, Mapping
from dataclasses import dataclass, field
from typing import Any
from urllib.parse import urlsplit

from vtherm_api import UiPlugin, get_vtherm_logger

from .const import CORE_PLUGIN_ID, NATIVE_PLUGIN_IDS
from .version_constraints import VersionConstraintError, check, parse_constraint, parse_version

_LOGGER = get_vtherm_logger(__name__)

STATE_READY = "ready"
"""The plugin is valid, compatible and has its dependencies: the frontend loads it at its rank."""
STATE_INVALID = "invalid"
"""The declaration is not valid. The reason tells which part."""
STATE_INCOMPATIBLE = "dashboard_incompatible"
"""The dashboard version does not satisfy the constraint of the plugin."""
STATE_MISSING_DEPENDENCY = "missing_dependency"
"""A plugin of `requires` is absent or not ready."""
STATE_CYCLE = "cycle"
"""The plugin belongs to a loop of load dependencies."""

REASON_RESERVED_ID = "reserved_id"
REASON_INVALID_URL = "invalid_url"
REASON_INVALID_CONSTRAINT = "invalid_constraint"
REASON_MISSING_CONSTRAINT = "missing_constraint"

SOURCE_INSTALLED = "installed"
SOURCE_NATIVE = "native"
SOURCE_DEVELOPMENT = "development"


@dataclass(frozen=True)
class PluginEntry:  # pylint: disable=too-many-instance-attributes
    """A plugin of the list, with its outcome.

    Attributes:
        id: The identifier of the plugin.
        js_url: The URL of the module to import.
        dashboard_version: The constraint declared by the plugin, empty when it has none.
        requires: The identifiers that must be ready.
        load_after: The identifiers to load before this plugin when present.
        load_before: The identifiers to load after this plugin when present.
        source: `installed`, `native` or `development`.
        state: One of the `STATE_*` values.
        reason: A code that refines the state (`REASON_*`, or `too_old` and `too_new`), None when there is none.
        details: Data that explains the state (faulty part, missing identifiers, plugins of the cycle, constraint and version).
        order: The rank in the load order, None when the plugin is not loaded.
    """

    id: str
    js_url: str
    dashboard_version: str
    requires: tuple[str, ...]
    load_after: tuple[str, ...]
    load_before: tuple[str, ...]
    source: str
    state: str
    reason: str | None
    details: dict[str, Any]
    order: int | None

    def as_dict(self) -> dict[str, Any]:
        """Return the entry as a JSON-serializable dictionary."""
        return {
            "id": self.id,
            "js_url": self.js_url,
            "dashboard_version": self.dashboard_version,
            "requires": list(self.requires),
            "load_after": list(self.load_after),
            "load_before": list(self.load_before),
            "source": self.source,
            "state": self.state,
            "reason": self.reason,
            "details": self.details,
            "order": self.order,
        }


@dataclass
class _Item:  # pylint: disable=too-many-instance-attributes
    """The plugin being processed. It is ready until a check fails."""

    id: str
    js_url: str
    dashboard_version: str
    requires: tuple[str, ...]
    load_after: tuple[str, ...]
    load_before: tuple[str, ...]
    source: str
    state: str = STATE_READY
    reason: str | None = None
    details: dict[str, Any] = field(default_factory=dict)
    order: int | None = None

    def fail(self, state: str, reason: str | None = None, **details: Any) -> None:
        """Exclude the plugin from the load list."""
        self.state, self.reason, self.details = state, reason, details


def _is_reserved(plugin_id: str) -> bool:
    """Return whether the identifier is reserved for the native plugins."""
    return plugin_id == CORE_PLUGIN_ID or plugin_id.startswith("core_")


def _is_local_url(url: str) -> bool:
    """Return whether the URL is a path of this Home Assistant instance, and not an address of another host."""
    return url.startswith("/") and not url.startswith("//") and "\\" not in url


def _is_development_url(url: str) -> bool:
    """Return whether the URL is an absolute http or https address."""
    try:
        parts = urlsplit(url)
    except ValueError:
        return False
    return parts.scheme in ("http", "https") and bool(parts.netloc)


def _text_list(value: Any) -> tuple[str, ...] | None:
    """Return a tuple of non-empty strings, or None when the value is not a list of such strings."""
    if value is None:
        return ()
    if isinstance(value, (list, tuple)) and all(isinstance(item, str) and item.strip() for item in value):
        return tuple(item.strip() for item in value)
    return None


def _collect(registered: Iterable[UiPlugin], dev_entries: Iterable[Mapping[str, Any]] | None) -> dict[str, _Item]:
    """Merge the registered plugins and the development entries."""
    items: dict[str, _Item] = {}
    for plugin in registered:
        source = SOURCE_NATIVE if plugin.id in NATIVE_PLUGIN_IDS else SOURCE_INSTALLED
        items[plugin.id] = _Item(plugin.id, plugin.js_url, plugin.dashboard_version, plugin.requires, plugin.load_after, plugin.load_before, source)

    seen: set[str] = set()
    for entry in dev_entries or []:
        plugin_id = entry.get("id") if isinstance(entry, Mapping) else None
        js_url = entry.get("js_url") if isinstance(entry, Mapping) else None
        if not isinstance(plugin_id, str) or not plugin_id.strip() or not isinstance(js_url, str) or plugin_id.strip() in seen:
            _LOGGER.warning("A development entry is ignored: it has no usable id and js_url, or its id is repeated: %r", entry)
            continue
        plugin_id = plugin_id.strip()
        seen.add(plugin_id)
        if plugin_id in items:
            # The URL of an installed plugin is replaced and its metadata stay those of the Python declaration.
            items[plugin_id].js_url = js_url
            items[plugin_id].source = SOURCE_DEVELOPMENT
            continue
        lists = [_text_list(entry.get(name)) for name in ("requires", "load_after", "load_before")]
        constraint = entry.get("dashboard_version")
        item = _Item(
            plugin_id,
            js_url,
            constraint.strip() if isinstance(constraint, str) else "",
            *[value if value is not None else () for value in lists],
            SOURCE_DEVELOPMENT,
        )
        items[plugin_id] = item
        if any(value is None for value in lists):
            _LOGGER.warning("The development entry %s has an invalid dependency list, it is ignored", plugin_id)
            item.requires = item.load_after = item.load_before = ()
    return items


def _is_url_valid(item: _Item, dev_server: str | None) -> bool:
    """Return whether the URL of a plugin is allowed for its source.

    A development entry gives an absolute address. A registered plugin is served by this Home Assistant instance. A native plugin may
    also be served by the development server of the frontend that the integration was started with, and by no other host.
    """
    if item.source == SOURCE_DEVELOPMENT:
        return _is_development_url(item.js_url)
    if item.source == SOURCE_NATIVE and dev_server is not None and item.js_url.startswith(f"{dev_server}/"):
        return True
    return _is_local_url(item.js_url)


def _validate(item: _Item, dashboard_version: str, dev_server: str | None = None) -> None:
    """Check the identifier, the URL and the compatibility of a plugin with the dashboard version."""
    if _is_reserved(item.id) and item.id not in NATIVE_PLUGIN_IDS:
        item.fail(STATE_INVALID, REASON_RESERVED_ID)
        return
    url_is_valid = _is_url_valid(item, dev_server)
    if not url_is_valid:
        item.fail(STATE_INVALID, REASON_INVALID_URL, url=item.js_url)
        return
    if not item.dashboard_version:
        item.fail(STATE_INVALID, REASON_MISSING_CONSTRAINT)
        return
    try:
        parse_constraint(item.dashboard_version)
    except VersionConstraintError as err:
        item.fail(STATE_INVALID, REASON_INVALID_CONSTRAINT, fault=err.fault)
        return
    reason = check(dashboard_version, item.dashboard_version)
    if reason is not None:
        item.fail(STATE_INCOMPATIBLE, reason, constraint=item.dashboard_version, dashboard_version=dashboard_version)


def _propagate_missing_dependencies(items: dict[str, _Item]) -> None:
    """Exclude the plugins whose `requires` is absent or not ready, until nothing changes."""
    changed = True
    while changed:
        changed = False
        for item in items.values():
            if item.state != STATE_READY:
                continue
            missing = sorted(dep for dep in item.requires if dep not in items or items[dep].state != STATE_READY)
            if missing:
                item.fail(STATE_MISSING_DEPENDENCY, missing=missing)
                changed = True


def _edges(items: dict[str, _Item]) -> dict[str, set[str]]:
    """Return the load constraints between the ready plugins: `a` -> `b` means `a` loads before `b`.

    Soft links to a plugin that is not ready are ignored. Nothing can be loaded before the core plugin.
    """
    ready = {item.id for item in items.values() if item.state == STATE_READY}
    edges: dict[str, set[str]] = {plugin_id: set() for plugin_id in ready}
    for item in items.values():
        if item.id not in ready:
            continue
        for before in (*item.requires, *item.load_after):
            if before in ready and item.id != CORE_PLUGIN_ID:
                edges[before].add(item.id)
        for after in item.load_before:
            if after in ready and after != CORE_PLUGIN_ID:
                edges[item.id].add(after)
    return edges


def _cycles(edges: dict[str, set[str]]) -> list[list[str]]:  # pylint: disable=too-many-locals  # the state of the iterative Tarjan algorithm
    """Return the loops of the graph: its strongly connected components with several plugins, or a plugin that loads before itself."""
    index: dict[str, int] = {}
    low: dict[str, int] = {}
    stack: list[str] = []
    on_stack: set[str] = set()
    components: list[list[str]] = []
    counter = 0
    for root in sorted(edges):
        if root in index:
            continue
        index[root] = low[root] = counter
        counter += 1
        stack.append(root)
        on_stack.add(root)
        work = [(root, iter(sorted(edges[root])))]
        while work:
            node, children = work[-1]
            descended = False
            for child in children:
                if child not in index:
                    index[child] = low[child] = counter
                    counter += 1
                    stack.append(child)
                    on_stack.add(child)
                    work.append((child, iter(sorted(edges[child]))))
                    descended = True
                    break
                if child in on_stack:
                    low[node] = min(low[node], index[child])
            if descended:
                continue
            work.pop()
            if work:
                parent = work[-1][0]
                low[parent] = min(low[parent], low[node])
            if low[node] == index[node]:
                component = []
                while True:
                    member = stack.pop()
                    on_stack.discard(member)
                    component.append(member)
                    if member == node:
                        break
                if len(component) > 1 or node in edges[node]:
                    components.append(sorted(component))
    return components


def _exclude_cycles(items: dict[str, _Item]) -> None:
    """Exclude the plugins that are part of a loop and the plugins that require them."""
    for component in _cycles(_edges(items)):
        for plugin_id in component:
            items[plugin_id].fail(STATE_CYCLE, plugins=component)
    _propagate_missing_dependencies(items)


def _assign_order(items: dict[str, _Item]) -> None:
    """Give a rank to the ready plugins: topological order, the core plugin first, then by identifier."""
    edges = _edges(items)
    in_degree = {plugin_id: 0 for plugin_id in edges}
    for targets in edges.values():
        for target in targets:
            in_degree[target] += 1
    heap = [(plugin_id != CORE_PLUGIN_ID, plugin_id) for plugin_id, degree in in_degree.items() if degree == 0]
    heapq.heapify(heap)
    rank = 0
    while heap:
        _, plugin_id = heapq.heappop(heap)
        items[plugin_id].order = rank
        rank += 1
        for target in edges[plugin_id]:
            in_degree[target] -= 1
            if in_degree[target] == 0:
                heapq.heappush(heap, (target != CORE_PLUGIN_ID, target))


def build_plugin_list(
    registered: Iterable[UiPlugin],
    dashboard_version: str,
    dev_entries: Iterable[Mapping[str, Any]] | None = None,
    dev_server: str | None = None,
) -> list[PluginEntry]:
    """Build the list of plugins for the frontend.

    Args:
        registered: The plugins registered in `vtherm_api`, in any order.
        dashboard_version: The version of the dashboard, for example "1.4.0".
        dev_entries: The development entries sent by an administrator. An entry whose id is registered replaces the
            URL of that plugin. Otherwise it is a full declaration with `js_url`, `dashboard_version` and optional
            `requires`, `load_after` and `load_before`.
        dev_server: The URL of the development server of the frontend, when the integration was started with one. The native
            plugins may then have their module on that server.

    Returns:
        The plugins to load, in load order, followed by the other plugins ordered by identifier.

    Raises:
        VersionConstraintError: `dashboard_version` is not a valid version.
    """
    parse_version(dashboard_version)
    items = _collect(registered, dev_entries)
    for item in items.values():
        _validate(item, dashboard_version, dev_server)
    _propagate_missing_dependencies(items)
    _exclude_cycles(items)
    _assign_order(items)
    ordered = sorted(items.values(), key=lambda item: (item.order is None, item.order if item.order is not None else 0, item.id))
    return [
        PluginEntry(
            item.id,
            item.js_url,
            item.dashboard_version,
            item.requires,
            item.load_after,
            item.load_before,
            item.source,
            item.state,
            item.reason,
            item.details,
            item.order,
        )
        for item in ordered
    ]
