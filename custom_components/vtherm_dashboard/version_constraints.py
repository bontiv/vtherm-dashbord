"""Version constraints of the UI plugins on the dashboard version.

A constraint is a list of comparators separated by commas, all of which must be satisfied. The operators
are ``>=``, ``>``, ``<=``, ``<`` and ``==``, applied to a semantic version whose patch number is optional
(``1.0`` is ``1.0.0``). Versions follow the precedence rules of semver.org: a pre-release is lower than its release,
so ``>=1.0`` is not satisfied by ``1.0.0-rc.1``. Build metadata is not supported.

The behavior of this module is fixed by the cases of ``shared/version-constraints.json``.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

REASON_TOO_OLD = "too_old"
"""The dashboard version is lower than what the constraint accepts."""

REASON_TOO_NEW = "too_new"
"""The dashboard version is higher than what the constraint accepts."""

_NUMBER = r"(0|[1-9][0-9]*)"
_PRERELEASE_ID = r"(?:0|[1-9][0-9]*|[0-9]*[a-zA-Z-][0-9a-zA-Z-]*)"
_VERSION_RE = re.compile(rf"^{_NUMBER}\.{_NUMBER}(?:\.{_NUMBER})?(?:-({_PRERELEASE_ID}(?:\.{_PRERELEASE_ID})*))?$")
_COMPARATOR_RE = re.compile(r"^(>=|<=|==|>|<)\s*(\S.*)$")


class VersionConstraintError(ValueError):
    """A version or a constraint is not valid.

    Attributes:
        fault: The faulty part of the text, which is also part of the message.
    """

    def __init__(self, message: str, fault: str) -> None:
        """Store the faulty part and build the message."""
        super().__init__(f"{message}: '{fault}'")
        self.fault = fault


@dataclass(frozen=True)
class Version:
    """A semantic version without build metadata."""

    major: int
    minor: int
    patch: int
    prerelease: tuple[str, ...] = ()

    @property
    def sort_key(self) -> tuple:
        """Return a key that orders versions by semver precedence."""
        identifiers = tuple((0, int(item), "") if item.isdigit() else (1, 0, item) for item in self.prerelease)
        # A release (no pre-release) is higher than any of its pre-releases.
        return (self.major, self.minor, self.patch, 0 if self.prerelease else 1, identifiers)

    def __str__(self) -> str:
        """Return the canonical text of the version."""
        text = f"{self.major}.{self.minor}.{self.patch}"
        return f"{text}-{'.'.join(self.prerelease)}" if self.prerelease else text


@dataclass(frozen=True)
class Comparator:
    """One comparator of a constraint, such as ``>=1.0``."""

    operator: str
    version: Version


Constraint = tuple[Comparator, ...]


def parse_version(text: str) -> Version:
    """Parse a version.

    Args:
        text: A version such as ``1.4``, ``1.4.2`` or ``2.0.0-rc.1``.

    Raises:
        VersionConstraintError: The text is not a semantic version with an optional patch number.
    """
    match = _VERSION_RE.match(text) if isinstance(text, str) else None
    if match is None:
        raise VersionConstraintError("Not a valid version", str(text))
    major, minor, patch, prerelease = match.groups()
    return Version(int(major), int(minor), int(patch or 0), tuple(prerelease.split(".")) if prerelease else ())


def parse_constraint(text: str) -> Constraint:
    """Parse a constraint such as ``>=1.0,<2.0``.

    Raises:
        VersionConstraintError: A comparator is empty, uses an unsupported operator or has an invalid version.
            The error names the faulty comparator.
    """
    if not isinstance(text, str):
        raise VersionConstraintError("The constraint must be a string", str(text))
    comparators = []
    for part in text.split(","):
        part = part.strip()
        if not part:
            raise VersionConstraintError("Empty comparator in the constraint", part)
        match = _COMPARATOR_RE.match(part)
        if match is None:
            raise VersionConstraintError("Unsupported operator, expected one of >=, >, <=, <, ==", part)
        try:
            version = parse_version(match.group(2).strip())
        except VersionConstraintError as err:
            raise VersionConstraintError("Invalid version in the comparator", part) from err
        comparators.append(Comparator(match.group(1), version))
    return tuple(comparators)


def check(version: str | Version, constraint: str | Constraint) -> str | None:
    """Evaluate a constraint on a version.

    Returns:
        None when the constraint is satisfied, otherwise ``REASON_TOO_OLD`` or ``REASON_TOO_NEW``
        for the first comparator that fails.

    Raises:
        VersionConstraintError: The version or the constraint is not valid.
    """
    current = parse_version(version) if isinstance(version, str) else version
    comparators = parse_constraint(constraint) if isinstance(constraint, str) else constraint
    for comparator in comparators:
        current_key, target_key = current.sort_key, comparator.version.sort_key
        if comparator.operator == ">=" and current_key < target_key:
            return REASON_TOO_OLD
        if comparator.operator == ">" and current_key <= target_key:
            return REASON_TOO_OLD
        if comparator.operator == "<=" and current_key > target_key:
            return REASON_TOO_NEW
        if comparator.operator == "<" and current_key >= target_key:
            return REASON_TOO_NEW
        if comparator.operator == "==" and current_key != target_key:
            return REASON_TOO_OLD if current_key < target_key else REASON_TOO_NEW
    return None


def satisfies(version: str | Version, constraint: str | Constraint) -> bool:
    """Return whether a version satisfies a constraint."""
    return check(version, constraint) is None
