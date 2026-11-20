"""Tests for the README of an add-on: the links made absolute, the files tried, the cache, and the WebSocket command."""

from __future__ import annotations

import pytest
from homeassistant.core import HomeAssistant
from pytest_homeassistant.test_util.aiohttp import AiohttpClientMocker

from custom_components.vtherm_dashboard.complements import (
    CATALOG_URL,
    README_MAX_BYTES,
    ReadmeReader,
    ReadmeUnavailableError,
    absolutize_links,
    readme_candidates,
)

RAW = "https://raw.githubusercontent.com/jmcollin78/vtherm_climate_replication/HEAD"
BLOB = "https://github.com/jmcollin78/vtherm_climate_replication/blob/HEAD"
REPOSITORY = "jmcollin78/vtherm_climate_replication"
COMMAND = "vtherm_dashboard/get_complement_readme"

# Excerpts in the shape of the READMEs of vtherm_climate_replication and versatile-thermostat-ui-card.
REPLICATION = """# VTherm climate replication

[![hacs][hacs-badge]][hacs-url]
[![GitHub Release](https://img.shields.io/github/release/jmcollin78/vtherm_climate_replication.svg)](https://github.com/jmcollin78/vtherm_climate_replication/releases)

![Overview](images/overview.png)

See the [installation guide](documentation/en/install.md) and the [top of the page](#installation).
Write to <mailto:someone@example.org> or visit [the forum](https://community.home-assistant.io/t/x/1).

<img src="images/icon.png" width="64">
<a href="documentation/fr/README-fr.md">French</a>

[hacs-badge]: https://img.shields.io/badge/HACS-Custom-orange.svg
[hacs-url]: https://github.com/hacs/integration
[changelog]: CHANGELOG.md
"""

CARD = """# Versatile Thermostat UI Card

[![Preview](https://github.com/jmcollin78/versatile-thermostat-ui-card/blob/main/assets/preview.png)](https://github.com/jmcollin78/versatile-thermostat-ui-card)
![Card](./assets/card.png "The card")
[Configuration](../docs/configuration.md)
[Root file](/LICENSE)
"""


def test_a_relative_link_points_to_the_file_on_github() -> None:
    """A link to a file of the repository opens the file on GitHub."""
    result = absolutize_links(REPLICATION, REPOSITORY)
    assert f"[installation guide]({BLOB}/documentation/en/install.md)" in result


def test_a_relative_image_in_a_folder_is_read_from_the_raw_files() -> None:
    """An image is read from raw.githubusercontent.com, in its folder."""
    result = absolutize_links(REPLICATION, REPOSITORY)
    assert f"![Overview]({RAW}/images/overview.png)" in result


def test_the_folder_of_the_readme_is_the_base_of_its_links() -> None:
    """A README in docs/ resolves its targets against docs/, and `../` goes up."""
    result = absolutize_links(CARD, "jmcollin78/versatile-thermostat-ui-card", "docs")
    assert '![Card](https://raw.githubusercontent.com/jmcollin78/versatile-thermostat-ui-card/HEAD/docs/assets/card.png "The card")' in result
    # `../docs/configuration.md` from docs/ is docs/configuration.md.
    assert "[Configuration](https://github.com/jmcollin78/versatile-thermostat-ui-card/blob/HEAD/docs/configuration.md)" in result
    assert "(../" not in result


def test_a_target_from_the_root_of_the_repository_ignores_the_folder() -> None:
    """A target that starts with a slash is relative to the root of the repository."""
    result = absolutize_links(CARD, "jmcollin78/versatile-thermostat-ui-card", "docs")
    assert "[Root file](https://github.com/jmcollin78/versatile-thermostat-ui-card/blob/HEAD/LICENSE)" in result


def test_a_reference_definition_is_rewritten() -> None:
    """The definitions `[name]: target` follow the same rules as inline targets."""
    result = absolutize_links(REPLICATION, REPOSITORY)
    assert f"[changelog]: {BLOB}/CHANGELOG.md" in result
    assert "[hacs-badge]: https://img.shields.io/badge/HACS-Custom-orange.svg" in result


def test_html_attributes_are_rewritten() -> None:
    """`src` is read from the raw files, `href` shows the file on GitHub."""
    result = absolutize_links(REPLICATION, REPOSITORY)
    assert f'<img src="{RAW}/images/icon.png" width="64">' in result
    assert f'<a href="{BLOB}/documentation/fr/README-fr.md">French</a>' in result


def test_an_image_page_of_github_becomes_the_raw_image() -> None:
    """`github.com/<owner>/<repo>/blob/<ref>/<path>` is the page of an image: the image itself is the raw file."""
    result = absolutize_links(CARD, "jmcollin78/versatile-thermostat-ui-card")
    assert (
        "[![Preview](https://raw.githubusercontent.com/jmcollin78/versatile-thermostat-ui-card/main/assets/preview.png)]"
        "(https://github.com/jmcollin78/versatile-thermostat-ui-card)" in result
    )


def test_anchors_and_absolute_links_are_kept() -> None:
    """Nothing changes for an anchor, a mail address or an absolute link, including a badge inside a link."""
    result = absolutize_links(REPLICATION, REPOSITORY)
    assert "[top of the page](#installation)" in result
    assert "<mailto:someone@example.org>" in result
    assert "(https://community.home-assistant.io/t/x/1)" in result
    assert (
        "[![GitHub Release](https://img.shields.io/github/release/jmcollin78/vtherm_climate_replication.svg)](https://github.com/jmcollin78/vtherm_climate_replication/releases)"
        in result
    )


def test_the_files_to_try_follow_the_language() -> None:
    """The base language is tried in three spellings, then the main README. English only tries the main README."""
    assert readme_candidates("fr-CA") == ["README-fr.md", "README.fr.md", "README_fr.md", "README.md"]
    assert readme_candidates("de") == ["README-de.md", "README.de.md", "README_de.md", "README.md"]
    assert readme_candidates("en") == ["README.md"]
    assert readme_candidates("en-GB") == ["README.md"]
    assert readme_candidates("") == ["README.md"]
    assert readme_candidates("../etc") == ["README.md"]


@pytest.fixture(name="reader")
def reader_fixture(hass: HomeAssistant) -> ReadmeReader:
    """A reader on the mocked network."""
    return ReadmeReader(hass)


async def test_the_french_readme_is_kept_for_a_canadian_user(reader: ReadmeReader, aioclient_mock: AiohttpClientMocker) -> None:
    """`fr-CA` finds `README-fr.md`, and the answer says the language of the file."""
    aioclient_mock.get(f"{RAW}/README-fr.md", text="# Bonjour\n![i](a.png)")
    answer = await reader.async_get(REPOSITORY, "fr-CA")
    assert answer["language"] == "fr"
    assert answer["markdown"] == f"# Bonjour\n![i]({RAW}/a.png)"
    assert answer["source_url"] == f"{BLOB}/README-fr.md"
    assert isinstance(answer["fetched_at"], float)


async def test_the_main_readme_is_the_english_fallback(reader: ReadmeReader, aioclient_mock: AiohttpClientMocker) -> None:
    """When no file exists in the language, README.md is read and marked English."""
    aioclient_mock.get(f"{RAW}/README-fr.md", status=404)
    aioclient_mock.get(f"{RAW}/README.fr.md", status=404)
    aioclient_mock.get(f"{RAW}/README_fr.md", status=404)
    aioclient_mock.get(f"{RAW}/README.md", text="# Hello")
    answer = await reader.async_get(REPOSITORY, "fr")
    assert (answer["language"], answer["markdown"]) == ("en", "# Hello")
    assert aioclient_mock.call_count == 4


async def test_the_api_gives_the_readme_when_the_main_file_is_missing(reader: ReadmeReader, aioclient_mock: AiohttpClientMocker) -> None:
    """A repository whose README is in `docs/` is found by the API, and its links are relative to `docs/`."""
    aioclient_mock.get(f"{RAW}/README.md", status=404)
    aioclient_mock.get(f"https://api.github.com/repos/{REPOSITORY}/readme", json={"name": "readme.md", "path": "docs/readme.md"})
    aioclient_mock.get(f"{RAW}/docs/readme.md", text="![x](pic.png)")
    answer = await reader.async_get(REPOSITORY, "en")
    assert answer["markdown"] == f"![x]({RAW}/docs/pic.png)"
    assert answer["source_url"] == f"{BLOB}/docs/readme.md"
    assert answer["language"] == "en"


async def test_a_repository_without_readme_is_unavailable(reader: ReadmeReader, aioclient_mock: AiohttpClientMocker) -> None:
    """No README anywhere is an error, and so is a server error."""
    aioclient_mock.get(f"{RAW}/README.md", status=404)
    aioclient_mock.get(f"https://api.github.com/repos/{REPOSITORY}/readme", status=404)
    with pytest.raises(ReadmeUnavailableError):
        await reader.async_get(REPOSITORY, "en")


async def test_two_requests_in_an_hour_read_once(reader: ReadmeReader, aioclient_mock: AiohttpClientMocker) -> None:
    """The second request of the same repository and language comes from memory."""
    aioclient_mock.get(f"{RAW}/README.md", text="# Hello")
    first = await reader.async_get(REPOSITORY, "en")
    second = await reader.async_get(REPOSITORY, "en")
    assert first == second
    assert aioclient_mock.call_count == 1


async def test_the_cache_is_per_language(reader: ReadmeReader, aioclient_mock: AiohttpClientMocker) -> None:
    """Another language is another request."""
    aioclient_mock.get(f"{RAW}/README.md", text="# Hello")
    aioclient_mock.get(f"{RAW}/README-de.md", text="# Hallo")
    assert (await reader.async_get(REPOSITORY, "en"))["markdown"] == "# Hello"
    assert (await reader.async_get(REPOSITORY, "de"))["markdown"] == "# Hallo"


async def test_a_failure_is_not_cached(reader: ReadmeReader, aioclient_mock: AiohttpClientMocker) -> None:
    """After an error, the next request reads again."""
    aioclient_mock.get(f"{RAW}/README.md", status=500)
    with pytest.raises(ReadmeUnavailableError):
        await reader.async_get(REPOSITORY, "en")
    aioclient_mock.clear_requests()
    aioclient_mock.get(f"{RAW}/README.md", text="# Back")
    assert (await reader.async_get(REPOSITORY, "en"))["markdown"] == "# Back"
    assert aioclient_mock.call_count == 1


async def test_a_readme_over_512_kib_is_refused(reader: ReadmeReader, aioclient_mock: AiohttpClientMocker) -> None:
    """A file larger than the limit is not read."""
    aioclient_mock.get(f"{RAW}/README.md", text="a" * (README_MAX_BYTES + 1))
    with pytest.raises(ReadmeUnavailableError):
        await reader.async_get(REPOSITORY, "en")


async def test_a_timeout_is_unavailable(reader: ReadmeReader, aioclient_mock: AiohttpClientMocker) -> None:
    """A network failure becomes the same error."""
    aioclient_mock.get(f"{RAW}/README.md", exc=TimeoutError())
    with pytest.raises(ReadmeUnavailableError):
        await reader.async_get(REPOSITORY, "en")


def _catalog(aioclient_mock: AiohttpClientMocker) -> None:
    aioclient_mock.get(
        CATALOG_URL,
        json=[
            {"name": "Replication", "type": "integration", "slug": REPOSITORY},
            {"name": "Blueprint", "type": "blueprint", "url": "https://example.org/a.yaml"},
        ],
    )


async def test_the_command_gives_the_readme(hass: HomeAssistant, setup_dashboard, hass_ws_client, aioclient_mock: AiohttpClientMocker) -> None:
    """The answer holds the Markdown with absolute links, the language, the source and the date."""
    _catalog(aioclient_mock)
    aioclient_mock.get(f"{RAW}/README.md", text="![i](a.png)")
    await setup_dashboard()
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": COMMAND, "complement_id": REPOSITORY, "language": "en"})
    response = await client.receive_json()
    assert response["success"] is True
    assert response["result"]["markdown"] == f"![i]({RAW}/a.png)"
    assert set(response["result"]) == {"markdown", "language", "source_url", "fetched_at"}


async def test_the_command_refuses_a_user_who_is_not_an_administrator(
    hass: HomeAssistant, setup_dashboard, hass_ws_client, hass_read_only_access_token, aioclient_mock: AiohttpClientMocker
) -> None:
    """Only an administrator reads a README, and nothing is requested."""
    _catalog(aioclient_mock)
    await setup_dashboard()
    client = await hass_ws_client(hass, hass_read_only_access_token)
    await client.send_json_auto_id({"type": COMMAND, "complement_id": REPOSITORY, "language": "en"})
    response = await client.receive_json()
    assert response["success"] is False and response["error"]["code"] == "unauthorized"
    assert aioclient_mock.call_count == 0


@pytest.mark.parametrize("complement_id", ["someone/else", "https://example.org/a.yaml", "https://raw.githubusercontent.com/evil/repo/HEAD/README.md"])
async def test_the_command_does_not_contact_github_for_what_the_catalog_does_not_know(
    hass: HomeAssistant, setup_dashboard, hass_ws_client, aioclient_mock: AiohttpClientMocker, complement_id: str
) -> None:
    """An identifier outside the catalog, and an add-on without a repository, are `not_found` without a request to GitHub."""
    _catalog(aioclient_mock)
    await setup_dashboard()
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": COMMAND, "complement_id": complement_id, "language": "en"})
    response = await client.receive_json()
    assert response["success"] is False and response["error"]["code"] == "not_found"
    assert [str(call[1]) for call in aioclient_mock.mock_calls if str(call[1]) != CATALOG_URL] == []


async def test_the_command_reports_an_unreadable_readme(hass: HomeAssistant, setup_dashboard, hass_ws_client, aioclient_mock: AiohttpClientMocker) -> None:
    """A failure of GitHub becomes `readme_unavailable`."""
    _catalog(aioclient_mock)
    aioclient_mock.get(f"{RAW}/README.md", status=500)
    await setup_dashboard()
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": COMMAND, "complement_id": REPOSITORY, "language": "en"})
    response = await client.receive_json()
    assert response["success"] is False and response["error"]["code"] == "readme_unavailable"
