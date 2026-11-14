"""Constraints on the dashboard version, as a plugin declares them."""

SUPPORTS_VERSION_1 = ">=1.0,<2.0"
"""Every 1.x version. The plugin is not loaded by the dashboard 2.0, which it was not tested with."""

SUPPORTS_VERSIONS_1_AND_2 = ">=1.0,<3.0"
"""The constraint of the same plugin once it was tested with the dashboard 2.x."""

SUPPORTS_FROM_A_PRERELEASE = ">=1.0.0-rc.1,<2.0"
"""A pre-release is lower than its release, so a plugin that needs one must say it."""

EXACT_VERSION = "==1.4.0"
"""Only this version."""
