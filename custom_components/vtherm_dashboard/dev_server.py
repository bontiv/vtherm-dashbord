"""The development server of the frontend, for the contributors of the dashboard.

When the environment variable `VTHERM_DASHBOARD_DEV_SERVER` of Home Assistant holds the URL of the development server of the frontend
(`npm run dev`), the panel and the native plugins load their TypeScript sources from it, and the integration starts without a build.
The URL is the one that the browser uses, since the browser imports the modules. Without the variable, nothing changes.
"""

from __future__ import annotations

import os
from collections.abc import Mapping
from urllib.parse import urlsplit

from vtherm_api import get_vtherm_logger

from .const import DEV_SERVER_ENV

_LOGGER = get_vtherm_logger(__name__)


def read_dev_server_url(environ: Mapping[str, str] | None = None) -> str | None:
    """Return the URL of the development server of the frontend, or None when the integration serves the built files.

    An absent or empty variable means no development server. A value that is not an absolute `http` or `https` URL is refused with an
    error in the log, and the integration serves the built files.

    Args:
        environ: The environment to read. The default is the environment of the process.

    Returns:
        The URL without a final slash, for example `http://localhost:5198`, or None.
    """
    value = (os.environ if environ is None else environ).get(DEV_SERVER_ENV, "").strip()
    if not value:
        return None
    try:
        parts = urlsplit(value)
    except ValueError:
        parts = None
    if parts is None or parts.scheme not in ("http", "https") or not parts.netloc:
        _LOGGER.error("%s=%r is not an absolute http or https URL: the frontend is served from the built files", DEV_SERVER_ENV, value)
        return None
    return value.rstrip("/")
