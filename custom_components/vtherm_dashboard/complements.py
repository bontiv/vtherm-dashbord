"""The catalog of the add-ons of Versatile Thermostat.

The catalog is a JSON file of the project. It is read by the server of Home Assistant, kept in memory for an hour, and the last valid
copy is kept in the storage of Home Assistant, so that the page works offline. Each entry is normalized, then given what Home Assistant
knows about its integration. What HACS knows is read by the browser.
"""

from __future__ import annotations

import re
import time
from dataclasses import dataclass, field
from typing import Any

from aiohttp import ClientError, ClientTimeout
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.storage import Store
from homeassistant.loader import IntegrationNotFound, async_get_integration
from vtherm_api import get_vtherm_logger

from .const import DOMAIN

_LOGGER = get_vtherm_logger(__name__)

CATALOG_URL = "https://raw.githubusercontent.com/bontiv/vtherm-website/latest/pluginsdb/plugins.json"
"""The address of the catalog, on the branch `latest` of the repository of the web site. It is a constant, not an option."""
CACHE_SECONDS = 3600
"""How long a copy of the catalog is used without asking again."""
REQUEST_TIMEOUT = 15
"""The seconds to wait for the answer of the server of the catalog."""
STORAGE_KEY = f"{DOMAIN}.complements"
"""The key of the persisted copy of the catalog."""
STORAGE_VERSION = 1
"""The version of the persisted copy."""
KNOWN_TYPES = ("integration", "interface", "blueprint", "addon")
"""The types of add-on that the dashboard knows. An entry of another type is shown as a link."""
INSTALLABLE_TYPES = ("integration", "interface")
"""The types that HACS installs for the dashboard."""
DEFAULT_HACS_CATEGORY = {"integration": "integration", "interface": "plugin"}
"""The category of HACS of each installable type, unless the entry gives `hacs_category`."""

ERROR_UNAVAILABLE = "catalog_unavailable"
"""The code of the error when the catalog cannot be read and there is no copy."""
ERROR_INVALID = "catalog_invalid"
"""The warning code when the answer of the server is not a list of add-ons."""
ERROR_NETWORK = "network"
"""The warning code when the server of the catalog did not answer."""

_REPOSITORY = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
_GITHUB = re.compile(r"^https?://github\.com/([A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+?)(?:\.git)?/?$")


class CatalogUnavailableError(Exception):
    """The catalog cannot be read and no earlier copy exists."""


@dataclass(frozen=True)
class Complement:  # pylint: disable=too-many-instance-attributes
    """An add-on of the catalog, normalized."""

    id: str
    name: str
    type: str
    description: str
    description_fr: str
    description_de: str
    certification: str
    family: str
    slug: str | None
    url: str | None
    ha_domain: str | None
    author: str | None
    hacs_category: str | None

    @property
    def repository(self) -> str | None:
        """The `owner/name` of the GitHub repository, from the slug or from a GitHub `url`. It is lower case, as HACS names it."""
        if self.slug is not None and _REPOSITORY.match(self.slug):
            return self.slug.lower()
        match = _GITHUB.match(self.url or "")
        return None if match is None else match.group(1).lower()

    @property
    def link(self) -> str | None:
        """Where the add-on is described: the repository, else the `url`."""
        repository = self.repository
        return f"https://github.com/{repository}" if repository is not None else self.url

    @property
    def category(self) -> str | None:
        """The category of HACS, or None for an add-on that the dashboard does not install."""
        if self.type not in INSTALLABLE_TYPES or self.repository is None:
            return None
        return self.hacs_category or DEFAULT_HACS_CATEGORY[self.type]

    def as_dict(self) -> dict[str, Any]:
        """The add-on as the WebSocket command gives it, without what Home Assistant knows."""
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "known_type": self.type in KNOWN_TYPES,
            "description": self.description,
            "description_fr": self.description_fr,
            "description_de": self.description_de,
            "certification": self.certification,
            "family": self.family,
            "slug": self.slug,
            "url": self.url,
            "ha_domain": self.ha_domain,
            "author": self.author,
            "repository": self.repository,
            "link": self.link,
            "hacs_category": self.category,
        }


def _text(entry: dict[str, Any], key: str) -> str | None:
    value = entry.get(key)
    return value.strip() if isinstance(value, str) and value.strip() else None


def normalize_catalog(raw: Any) -> tuple[list[Complement], list[str]]:
    """Normalize the content of the catalog.

    An entry is identified by its `slug`, else its `url`, else its `name`. An entry without a name or without a type is ignored with a
    warning, and so is a duplicate. The other entries are kept.

    Returns:
        The add-ons, and the warnings.
    """
    if not isinstance(raw, list):
        return [], [ERROR_INVALID]
    complements: list[Complement] = []
    warnings: list[str] = []
    seen: set[str] = set()
    for position, entry in enumerate(raw):
        name = _text(entry, "name") if isinstance(entry, dict) else None
        kind = _text(entry, "type") if isinstance(entry, dict) else None
        if name is None or kind is None:
            warnings.append(f"entry {position} ignored: no name or no type")
            continue
        slug, url = _text(entry, "slug"), _text(entry, "url")
        identifier = slug or url or name
        if identifier in seen:
            warnings.append(f"entry {position} ignored: {identifier} is already in the catalog")
            continue
        seen.add(identifier)
        complements.append(
            Complement(
                id=identifier,
                name=name,
                type=kind,
                description=_text(entry, "description") or "",
                description_fr=_text(entry, "description_fr") or "",
                description_de=_text(entry, "description_de") or "",
                certification=_text(entry, "certification") or "community",
                family=_text(entry, "family") or "other",
                slug=slug,
                url=url,
                ha_domain=_text(entry, "ha_domain"),
                author=_text(entry, "author"),
                hacs_category=_text(entry, "hacs_category"),
            )
        )
    for warning in warnings:
        _LOGGER.warning("The catalog of add-ons: %s", warning)
    return complements, warnings


@dataclass
class CatalogResult:  # pylint: disable=too-few-public-methods
    """What a read of the catalog gives."""

    complements: list[Complement]
    fetched_at: float
    """When the copy was read from the server, in seconds since the epoch."""
    stale: bool = False
    """Whether the server could not be asked, so that the copy may be old."""
    warnings: list[str] = field(default_factory=list)


class ComplementCatalog:  # pylint: disable=too-many-instance-attributes
    """The catalog of the add-ons, with its caches."""

    def __init__(self, hass: HomeAssistant, url: str = CATALOG_URL) -> None:
        self._hass = hass
        self._url = url
        self._store: Store[dict[str, Any]] = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        self._raw: Any = None
        self._etag: str | None = None
        self._fetched_at = 0.0
        self._checked_at = 0.0
        self._loaded = False

    async def _load_copy(self) -> None:
        """Read the persisted copy, once."""
        if self._loaded:
            return
        self._loaded = True
        saved = await self._store.async_load()
        if isinstance(saved, dict) and isinstance(saved.get("entries"), list):
            self._raw = saved["entries"]
            self._etag = saved.get("etag")
            self._fetched_at = float(saved.get("fetched_at", 0))

    async def _fetch(self) -> bool:
        """Ask the server. Returns True when the copy was renewed. The errors are the caller's."""
        headers = {"If-None-Match": self._etag} if self._etag is not None and self._raw is not None else {}
        session = async_get_clientsession(self._hass)
        async with session.get(self._url, headers=headers, timeout=ClientTimeout(total=REQUEST_TIMEOUT)) as response:
            if response.status == 304 and self._raw is not None:
                # "Not modified" proves that the copy is current.
                self._fetched_at = time.time()
                return True
            response.raise_for_status()
            content = await response.json(content_type=None)
            if not isinstance(content, list):
                raise ValueError("the catalog is not a list")
            self._raw = content
            self._etag = response.headers.get("ETag")
            self._fetched_at = time.time()
        await self._store.async_save({"entries": self._raw, "etag": self._etag, "fetched_at": self._fetched_at})
        return True

    async def async_get(self, refresh: bool = False) -> CatalogResult:
        """Return the catalog.

        A copy younger than an hour is used as it is. Otherwise the server is asked with the entity tag of the copy. When it cannot
        answer, the last valid copy is returned as stale.

        Args:
            refresh: Ask the server even if the copy is young.

        Raises:
            CatalogUnavailableError: The server cannot be reached and there is no copy.
        """
        await self._load_copy()
        now = time.time()
        stale = False
        warnings: list[str] = []
        if refresh or self._raw is None or now - self._checked_at >= CACHE_SECONDS:
            try:
                await self._fetch()
                self._checked_at = now
            except (ClientError, TimeoutError, ValueError) as err:
                _LOGGER.warning("The catalog of add-ons could not be read: %s", err)
                if self._raw is None:
                    raise CatalogUnavailableError(str(err)) from err
                stale = True
                warnings.append(ERROR_NETWORK)
        complements, problems = normalize_catalog(self._raw)
        return CatalogResult(complements, self._fetched_at, stale, [*warnings, *problems])


async def async_describe(hass: HomeAssistant, complement: Complement) -> dict[str, Any]:
    """What Home Assistant knows about the integration of an add-on: whether it is loaded, its entries, and its config flow."""
    domain = complement.ha_domain
    if complement.type != "integration" or domain is None:
        return {"found": False, "loaded": False, "config_entries": 0, "config_flow": False}
    try:
        integration = await async_get_integration(hass, domain)
    except IntegrationNotFound:
        return {"found": False, "loaded": domain in hass.config.components, "config_entries": 0, "config_flow": False}
    return {
        "found": True,
        "loaded": domain in hass.config.components,
        "config_entries": len(hass.config_entries.async_entries(domain)),
        "config_flow": bool(integration.config_flow),
    }


async def async_complements(hass: HomeAssistant, refresh: bool = False) -> dict[str, Any]:
    """The answer of `vtherm_dashboard/get_complements`: the add-ons of the catalog, each with what Home Assistant knows of it."""
    catalog: ComplementCatalog = hass.data[DOMAIN]["catalog"]
    result = await catalog.async_get(refresh)
    entries = []
    for complement in result.complements:
        entries.append({**complement.as_dict(), "ha": await async_describe(hass, complement)})
    return {"complements": entries, "fetched_at": result.fetched_at, "stale": result.stale, "warnings": result.warnings, "catalog_url": CATALOG_URL}
