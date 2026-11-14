"""Tests for the catalog of add-ons: reading, caches, normalization and the state known by Home Assistant."""

from __future__ import annotations

import json
import time
from pathlib import Path

import pytest
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry, MockModule, mock_integration
from pytest_homeassistant_custom_component.test_util.aiohttp import AiohttpClientMocker

from custom_components.vtherm_dashboard import complements
from custom_components.vtherm_dashboard.complements import CATALOG_URL, CatalogUnavailableError, ComplementCatalog, normalize_catalog

CATALOG = json.loads((Path(__file__).parent / "data" / "plugins.json").read_text(encoding="utf-8"))
COMMAND = "vtherm_dashboard/get_complements"


@pytest.fixture(name="catalog")
def catalog_fixture(hass: HomeAssistant) -> ComplementCatalog:
    """A catalog that reads from the mocked network."""
    return ComplementCatalog(hass)


def test_the_real_catalog_is_normalized_without_loss() -> None:
    """Every entry of the real file is kept, identified by its slug, else its url, else its name."""
    entries, warnings = normalize_catalog(CATALOG)
    assert not warnings
    assert len(entries) == len(CATALOG)
    assert {entry.type for entry in entries} == {"integration", "interface", "blueprint", "addon"}
    for entry, raw in zip(entries, CATALOG):
        assert entry.id == (raw.get("slug") or raw.get("url") or raw["name"])


def test_an_entry_without_slug_is_identified_by_its_url() -> None:
    """A blueprint that only has an url is kept."""
    entries, _ = normalize_catalog([{"name": "Blueprint", "type": "blueprint", "url": "https://example.org/a.yaml"}])
    assert [(entry.id, entry.slug, entry.link) for entry in entries] == [("https://example.org/a.yaml", None, "https://example.org/a.yaml")]
    assert entries[0].category is None


def test_an_entry_without_name_or_type_is_ignored_with_a_warning(caplog: pytest.LogCaptureFixture) -> None:
    """The invalid entries and the entries that are not objects are skipped, the others stay."""
    raw = [{"description": "nothing"}, "text", {"name": "No type"}, {"type": "integration"}, {"name": "Good", "type": "integration"}]
    entries, warnings = normalize_catalog(raw)
    assert [entry.name for entry in entries] == ["Good"]
    assert len(warnings) == 4
    assert "ignored" in caplog.text


def test_absent_fields_are_tolerated_and_a_duplicate_is_ignored() -> None:
    """A missing German description, domain or author is not an error. The first of two equal identifiers wins."""
    entries, warnings = normalize_catalog([{"name": "A", "type": "integration", "slug": "o/a"}, {"name": "A2", "type": "integration", "slug": "o/a"}])
    assert len(entries) == 1 and len(warnings) == 1
    assert (entries[0].description_de, entries[0].ha_domain, entries[0].author) == ("", None, None)


def test_a_catalog_that_is_not_a_list_is_invalid() -> None:
    """An object instead of a list gives no entry and a warning."""
    assert normalize_catalog({"a": 1}) == ([], [complements.ERROR_INVALID])


def test_the_repository_and_the_category_follow_the_type() -> None:
    """The repository comes from the slug or a GitHub url, and the category of HACS from the type, unless the entry says."""
    entries, _ = normalize_catalog(
        [
            {"name": "I", "type": "integration", "slug": "Owner/Repo"},
            {"name": "C", "type": "interface", "url": "https://github.com/owner/card.git"},
            {"name": "T", "type": "interface", "slug": "owner/theme", "hacs_category": "theme"},
            {"name": "B", "type": "blueprint", "slug": "owner/bp"},
            {"name": "X", "type": "mystery", "slug": "owner/x"},
        ]
    )
    assert [(entry.repository, entry.category) for entry in entries] == [
        ("owner/repo", "integration"),
        ("owner/card", "plugin"),
        ("owner/theme", "theme"),
        ("owner/bp", None),
        ("owner/x", None),
    ]
    assert entries[4].as_dict()["known_type"] is False


async def test_the_catalog_is_read_once_per_hour(catalog: ComplementCatalog, aioclient_mock: AiohttpClientMocker) -> None:
    """A second call within the hour does not ask the server."""
    aioclient_mock.get(CATALOG_URL, json=CATALOG, headers={"ETag": '"v1"'})
    first = await catalog.async_get()
    await catalog.async_get()
    assert len(first.complements) == len(CATALOG)
    assert aioclient_mock.call_count == 1


async def test_a_refresh_asks_again_with_the_entity_tag(catalog: ComplementCatalog, aioclient_mock: AiohttpClientMocker) -> None:
    """The manual refresh skips the cache, and an answer "not modified" keeps the copy."""
    aioclient_mock.get(CATALOG_URL, json=CATALOG, headers={"ETag": '"v1"'})
    await catalog.async_get()
    aioclient_mock.clear_requests()
    aioclient_mock.get(CATALOG_URL, status=304)
    result = await catalog.async_get(refresh=True)
    assert aioclient_mock.call_count == 1
    assert aioclient_mock.mock_calls[0][3]["If-None-Match"] == '"v1"'
    assert len(result.complements) == len(CATALOG) and not result.stale


async def test_the_cache_expires_after_an_hour(catalog: ComplementCatalog, aioclient_mock: AiohttpClientMocker, monkeypatch: pytest.MonkeyPatch) -> None:
    """After an hour the server is asked again."""
    aioclient_mock.get(CATALOG_URL, json=CATALOG)
    await catalog.async_get()
    later = time.time() + complements.CACHE_SECONDS + 1
    monkeypatch.setattr(complements.time, "time", lambda: later)
    await catalog.async_get()
    assert aioclient_mock.call_count == 2


async def test_without_network_the_last_copy_is_given_as_stale(catalog: ComplementCatalog, aioclient_mock: AiohttpClientMocker) -> None:
    """When the server cannot be reached, the last valid copy is returned with a warning."""
    aioclient_mock.get(CATALOG_URL, json=CATALOG)
    await catalog.async_get()
    aioclient_mock.clear_requests()
    aioclient_mock.get(CATALOG_URL, exc=TimeoutError())
    result = await catalog.async_get(refresh=True)
    assert result.stale and complements.ERROR_NETWORK in result.warnings
    assert len(result.complements) == len(CATALOG)


async def test_the_copy_survives_a_restart(hass: HomeAssistant, aioclient_mock: AiohttpClientMocker, hass_storage: dict) -> None:
    """The copy is persisted: a new catalog without network reads it from the storage."""
    aioclient_mock.get(CATALOG_URL, json=CATALOG)
    await ComplementCatalog(hass).async_get()
    assert hass_storage[complements.STORAGE_KEY]["data"]["entries"] == CATALOG
    aioclient_mock.clear_requests()
    aioclient_mock.get(CATALOG_URL, status=500)
    result = await ComplementCatalog(hass).async_get()
    assert result.stale and len(result.complements) == len(CATALOG)


async def test_without_network_and_without_copy_there_is_an_error(catalog: ComplementCatalog, aioclient_mock: AiohttpClientMocker) -> None:
    """Nothing to show: the error is raised."""
    aioclient_mock.get(CATALOG_URL, exc=TimeoutError())
    with pytest.raises(CatalogUnavailableError):
        await catalog.async_get()


async def test_an_answer_that_is_not_a_catalog_is_an_error(catalog: ComplementCatalog, aioclient_mock: AiohttpClientMocker) -> None:
    """A JSON object instead of a list is refused like a failure."""
    aioclient_mock.get(CATALOG_URL, json={"error": "x"})
    with pytest.raises(CatalogUnavailableError):
        await catalog.async_get()


async def test_the_command_gives_the_state_known_by_home_assistant(hass: HomeAssistant, setup_dashboard, hass_ws_client, aioclient_mock: AiohttpClientMocker) -> None:
    """A loaded integration, an absent one and one without a config flow, with their entries."""
    aioclient_mock.get(
        CATALOG_URL,
        json=[
            {"name": "Loaded", "type": "integration", "slug": "o/loaded", "ha_domain": "loaded_dom"},
            {"name": "Absent", "type": "integration", "slug": "o/absent", "ha_domain": "absent_dom"},
            {"name": "No flow", "type": "integration", "slug": "o/noflow", "ha_domain": "noflow_dom"},
            {"name": "Card", "type": "interface", "slug": "o/card"},
        ],
    )
    mock_integration(hass, MockModule("loaded_dom"), built_in=False)
    mock_integration(hass, MockModule("noflow_dom"), built_in=False)
    loaded = hass.data["integrations"]["loaded_dom"]
    loaded.manifest["config_flow"] = True
    MockConfigEntry(domain="loaded_dom").add_to_hass(hass)
    hass.config.components.update({"loaded_dom", "noflow_dom"})
    await setup_dashboard()
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": COMMAND})
    response = await client.receive_json()
    assert response["success"] is True
    by_name = {entry["name"]: entry for entry in response["result"]["complements"]}
    assert by_name["Loaded"]["ha"] == {"found": True, "loaded": True, "config_entries": 1, "config_flow": True}
    assert by_name["Absent"]["ha"] == {"found": False, "loaded": False, "config_entries": 0, "config_flow": False}
    assert by_name["No flow"]["ha"] == {"found": True, "loaded": True, "config_entries": 0, "config_flow": False}
    assert by_name["Card"]["ha"]["found"] is False
    assert response["result"]["catalog_url"] == CATALOG_URL


async def test_the_command_reports_an_unavailable_catalog(hass: HomeAssistant, setup_dashboard, hass_ws_client, aioclient_mock: AiohttpClientMocker) -> None:
    """With no network and no copy, the command fails with a code the page can show."""
    aioclient_mock.get(CATALOG_URL, exc=TimeoutError())
    await setup_dashboard()
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": COMMAND})
    response = await client.receive_json()
    assert response["success"] is False and response["error"]["code"] == complements.ERROR_UNAVAILABLE


async def test_only_an_administrator_reads_the_catalog(hass: HomeAssistant, setup_dashboard, hass_ws_client, hass_read_only_access_token) -> None:
    """A user who is not an administrator is refused."""
    await setup_dashboard()
    client = await hass_ws_client(hass, hass_read_only_access_token)
    await client.send_json_auto_id({"type": COMMAND})
    response = await client.receive_json()
    assert response["success"] is False and response["error"]["code"] == "unauthorized"
