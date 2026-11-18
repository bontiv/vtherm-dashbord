"""Tests for the setup of the tests: the debug mode of the event loop and the marker of the tests of the real Versatile Thermostat."""

import asyncio
import os

import pytest

from .conftest import asyncio_debug_wanted


@pytest.mark.parametrize(
    ("environ", "wanted"),
    [({}, False), ({"CI": "true"}, True), ({"VTHERM_ASYNCIO_DEBUG": "1"}, True), ({"VTHERM_ASYNCIO_DEBUG": "0"}, False), ({"CI": ""}, False)],
)
def test_the_debug_mode_follows_the_environment(environ: dict[str, str], wanted: bool) -> None:
    """The debug mode is on in the continuous integration and on demand, off otherwise."""
    assert asyncio_debug_wanted(environ) is wanted


async def test_the_event_loop_of_a_test_follows_the_environment() -> None:
    """The fixture of the conftest replaces the one of pytest-homeassistant-custom-component."""
    assert asyncio.get_running_loop().get_debug() is asyncio_debug_wanted(os.environ)


def test_the_tests_of_the_real_versatile_thermostat_are_marked(request: pytest.FixtureRequest) -> None:
    """The marker vtherm is declared, and this test, which does not load Versatile Thermostat, does not have it."""
    assert any(line.startswith("vtherm:") for line in request.config.getini("markers"))
    assert request.node.get_closest_marker("vtherm") is None
